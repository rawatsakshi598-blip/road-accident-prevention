"""
Feature engineering and preprocessing pipeline.
"""

import re
import warnings
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder, StandardScaler

from config import LABEL_ENCODER_PATH, PREPROCESSOR_PATH
from ml.data_loader import DatasetBundle

warnings.filterwarnings("ignore")


def _parse_hour(time_val) -> Optional[int]:
    if pd.isna(time_val):
        return None
    s = str(time_val).strip()
    m = re.match(r"^(\d{1,2})[:.](\d{2})", s)
    if m:
        return int(m.group(1)) % 24
    try:
        return int(float(s)) % 24
    except (ValueError, TypeError):
        return None


def _hour_to_period(hour: Optional[int]) -> str:
    if hour is None:
        return "Unknown"
    if 6 <= hour < 12:
        return "Morning"
    if 12 <= hour < 17:
        return "Afternoon"
    if 17 <= hour < 21:
        return "Evening"
    return "Night"


def _is_night(hour: Optional[int]) -> int:
    if hour is None:
        return 0
    return int(hour >= 21 or hour < 6)


HIGH_CARD_THRESHOLD = 15


def _frequency_encode(series, freq_map=None):
    if freq_map is None:
        freq_map = (series.value_counts() / len(series)).to_dict()
    encoded = series.map(freq_map).fillna(0.0)
    return encoded, freq_map


class AccidentPreprocessor:
    def __init__(self, bundle: DatasetBundle):
        self.bundle = bundle
        self.target_col = bundle.target_col
        self.feature_cols: List[str] = []

        self._scaler: Optional[StandardScaler] = None
        self._freq_maps: Dict[str, Dict] = {}
        self._ohe_cols: List[str] = []
        self._ohe_dummies: Optional[pd.Index] = None
        self._numeric_cols: List[str] = []
        self._label_encoder: Optional[LabelEncoder] = None
        self._is_fitted: bool = False

    def fit_transform(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        df = df.copy()
        df = self._extract_temporal(df)
        df = self._create_interactions(df)
        df = self._impute(df)

        y_raw = df[self.target_col].values
        df = df.drop(columns=[self.target_col])

        self._label_encoder = LabelEncoder()
        y = self._label_encoder.fit_transform(y_raw)

        df = self._drop_useless(df)
        df = self._encode_categoricals_fit(df)
        df = self._scale_fit(df)

        self.feature_cols = df.columns.tolist()
        self._is_fitted = True

        print(f"\n[PREPROCESSOR] Final feature matrix: {df.shape}")
        print(f"[PREPROCESSOR] Sample features: {self.feature_cols[:8]} ...")

        self._save()
        return df.values, y

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        if not self._is_fitted:
            raise RuntimeError("Preprocessor not fitted. Call fit_transform() first.")

        df = df.copy()
        df = self._extract_temporal(df)
        df = self._create_interactions(df)
        df = self._impute(df)

        if self.target_col in df.columns:
            df = df.drop(columns=[self.target_col])

        df = self._drop_useless(df)
        df = self._encode_categoricals_transform(df)

        # ADD missing columns BEFORE scaling
        for col in self.feature_cols:
            if col not in df.columns:
                df[col] = 0.0

        # REMOVE extra columns not in training
        extra_cols = [c for c in df.columns if c not in self.feature_cols]
        if extra_cols:
            df = df.drop(columns=extra_cols)

        # Reorder to match training
        df = df[self.feature_cols]

        # Now scale only columns that scaler knows about
        df = self._scale_transform(df)

        return df.values

    def inverse_transform_target(self, y: np.ndarray) -> np.ndarray:
        return self._label_encoder.inverse_transform(y)

    def _extract_temporal(self, df: pd.DataFrame) -> pd.DataFrame:
        b = self.bundle

        if b.time_col and b.time_col in df.columns:
            df["_Hour"] = df[b.time_col].apply(_parse_hour)
            df["_Time_Period"] = df["_Hour"].apply(_hour_to_period)
            df["_Is_Night"] = df["_Hour"].apply(_is_night)
            df["_Hour"] = df["_Hour"].fillna(-1).astype(int)

        if b.date_col and b.date_col in df.columns:
            dates = pd.to_datetime(df[b.date_col], errors="coerce")
            df["_Month"] = dates.dt.month.fillna(-1).astype(int)
            df["_Year"] = dates.dt.year.fillna(-1).astype(int)
            df["_Quarter"] = dates.dt.quarter.fillna(-1).astype(int)

        if b.day_col and b.day_col in df.columns:
            weekend_vals = {"saturday", "sunday", "sat", "sun", "6", "7", "5", "6.0", "7.0"}
            df["_Is_Weekend"] = (
                df[b.day_col]
                .astype(str)
                .str.strip()
                .str.lower()
                .isin(weekend_vals)
                .astype(int)
            )

        return df

    def _create_interactions(self, df: pd.DataFrame) -> pd.DataFrame:
        b = self.bundle
        if (
            b.weather_col and b.weather_col in df.columns
            and b.road_col and b.road_col in df.columns
        ):
            df["_Weather_Road"] = (
                df[b.weather_col].astype(str).str.strip()
                + "_"
                + df[b.road_col].astype(str).str.strip()
            )
        return df

    def _impute(self, df: pd.DataFrame) -> pd.DataFrame:
        for col in df.columns:
            if col == self.target_col:
                continue
            if df[col].dtype in [np.float64, np.int64, np.float32, np.int32]:
                median_val = df[col].median()
                df[col] = df[col].fillna(median_val if pd.notna(median_val) else 0)
            else:
                mode_vals = df[col].mode()
                fill = mode_vals.iloc[0] if len(mode_vals) else "Unknown"
                df[col] = df[col].fillna(fill).replace("", "Unknown")
        return df

    def _drop_useless(self, df: pd.DataFrame) -> pd.DataFrame:
        drop_patterns = [
            r"^id$", r"_id$", r"^sno$", r"^sl\.?no", r"^index$",
            r"^unnamed", r"^chainage",
        ]
        to_drop = []
        for col in df.columns:
            cl = col.lower()
            for pat in drop_patterns:
                if re.search(pat, cl):
                    to_drop.append(col)
                    break

        b = self.bundle
        for raw_col in [b.date_col, b.time_col]:
            if raw_col and raw_col in df.columns:
                to_drop.append(raw_col)

        to_drop = list(set(to_drop))
        df = df.drop(columns=to_drop, errors="ignore")
        return df

    def _encode_categoricals_fit(self, df: pd.DataFrame) -> pd.DataFrame:
        cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()

        low_card, high_card = [], []
        for col in cat_cols:
            n_unique = df[col].nunique()
            if n_unique <= HIGH_CARD_THRESHOLD:
                low_card.append(col)
            else:
                high_card.append(col)

        for col in high_card:
            df[col], freq_map = _frequency_encode(df[col])
            self._freq_maps[col] = freq_map

        if low_card:
            df = pd.get_dummies(df, columns=low_card, drop_first=False, dtype=float)
            self._ohe_dummies = df.columns

        self._ohe_cols = low_card
        return df

    def _encode_categoricals_transform(self, df: pd.DataFrame) -> pd.DataFrame:
        cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()

        for col in cat_cols:
            if col in self._freq_maps:
                df[col], _ = _frequency_encode(df[col], self._freq_maps[col])
            elif col not in self._ohe_cols:
                df[col], freq_map = _frequency_encode(df[col])
                self._freq_maps[col] = freq_map

        ohe_present = [c for c in self._ohe_cols if c in df.columns]
        if ohe_present:
            df = pd.get_dummies(df, columns=ohe_present, drop_first=False, dtype=float)

        return df

    def _scale_fit(self, df: pd.DataFrame) -> pd.DataFrame:
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        self._numeric_cols = numeric_cols
        self._scaler = StandardScaler()
        df[numeric_cols] = self._scaler.fit_transform(df[numeric_cols])
        return df

    def _scale_transform(self, df: pd.DataFrame) -> pd.DataFrame:
        cols_to_scale = [c for c in self._numeric_cols if c in df.columns]
        if cols_to_scale and self._scaler is not None:
            # Only scale columns that scaler was fitted on
            # Create array with all numeric cols (some may be new/missing)
            scale_data = df[cols_to_scale].values
            scaled = self._scaler.transform(
                pd.DataFrame(
                    np.zeros((len(df), len(self._numeric_cols))),
                    columns=self._numeric_cols
                ).assign(**{c: df[c].values for c in cols_to_scale}).values
            )
            for i, col in enumerate(self._numeric_cols):
                if col in df.columns:
                    df[col] = scaled[:, i]
        return df

    def _save(self):
        joblib.dump(self, PREPROCESSOR_PATH)
        joblib.dump(self._label_encoder, LABEL_ENCODER_PATH)
        print(f"[PREPROCESSOR] Saved preprocessor -> {PREPROCESSOR_PATH}")
        print(f"[PREPROCESSOR] Saved label encoder -> {LABEL_ENCODER_PATH}")


def load_preprocessor():
    return joblib.load(PREPROCESSOR_PATH)