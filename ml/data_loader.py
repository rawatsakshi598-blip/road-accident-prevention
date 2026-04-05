"""
Adaptive dataset loader.

Responsibilities:
- Detect which CSV files are present in ./data/
- Auto-detect column roles (target, time, weather, road, vehicle)
  using keyword matching — never hardcode column names.
- Return a unified DatasetBundle object consumed by the rest of the pipeline.
"""

import json
import re
import warnings
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from config import (
    DATA_DIR,
    DATASET_INSTRUCTIONS,
    EDA_SUMMARY_PATH,
    KAGGLE_PATH,
    KAGGLE_SEVERITY_MAP,
    NHAI_PATH,
    NHAI_SEVERITY_MAP,
)

warnings.filterwarnings("ignore")


# ── Data container ─────────────────────────────────────────────────────────────

@dataclass
class DatasetBundle:
    """Holds a loaded + lightly cleaned dataset with detected column roles."""

    name: str
    df: pd.DataFrame
    target_col: str
    severity_map: Dict[int, str]
    feature_cols: List[str] = field(default_factory=list)

    # Detected column roles (None if not found)
    time_col: Optional[str] = None
    date_col: Optional[str] = None
    weather_col: Optional[str] = None
    road_col: Optional[str] = None
    vehicle_col: Optional[str] = None
    cause_col: Optional[str] = None
    day_col: Optional[str] = None

    source_path: Optional[Path] = None


# ── Keyword patterns for fuzzy column detection ────────────────────────────────

_ROLE_PATTERNS: Dict[str, List[str]] = {
    "target": [r"severity", r"accident_severity", r"crash_severity"],
    "time": [r"time", r"hour", r"time_of"],
    "date": [r"^date$", r"accident_date", r"crash_date"],
    "day": [r"day_of", r"day_of_week", r"weekday"],
    "weather": [r"weather"],
    "road": [r"road_condition", r"road_surface", r"road_feature"],
    "vehicle": [r"vehicle_type", r"type_of_vehicle"],
    "cause": [r"cause", r"causes"],
}


def _find_column(columns: List[str], role: str) -> Optional[str]:
    """Return the first column whose name (lower) matches any pattern for role."""
    patterns = _ROLE_PATTERNS.get(role, [])
    col_lower = {c: c.lower() for c in columns}
    for pat in patterns:
        for orig, low in col_lower.items():
            if re.search(pat, low):
                return orig
    return None


def _detect_all_roles(columns: List[str]) -> Dict[str, Optional[str]]:
    return {role: _find_column(columns, role) for role in _ROLE_PATTERNS}


# ── NHAI target derivation ─────────────────────────────────────────────────────

def _find_col_fuzzy(df: pd.DataFrame, keyword: str) -> Optional[str]:
    for col in df.columns:
        if keyword.lower() in col.lower():
            return col
    return None


def _derive_nhai_target(df: pd.DataFrame) -> pd.Series:
    """
    If no explicit Severity column exists, derive it from casualty columns:
      Killed > 0          → 1 (Fatal)
      Grievous_Injury > 0 → 2 (Grievous Injury)
      Minor_Injury > 0    → 3 (Minor Injury)
      else                → 4 (No Injury)
    """
    killed_col = _find_col_fuzzy(df, "killed")
    grievous_col = _find_col_fuzzy(df, "grievous")
    minor_col = _find_col_fuzzy(df, "minor")

    def _row_to_severity(row):
        if killed_col and pd.notna(row.get(killed_col)) and row.get(killed_col, 0) > 0:
            return 1
        if grievous_col and pd.notna(row.get(grievous_col)) and row.get(grievous_col, 0) > 0:
            return 2
        if minor_col and pd.notna(row.get(minor_col)) and row.get(minor_col, 0) > 0:
            return 3
        return 4

    return df.apply(_row_to_severity, axis=1)


# ── Kaggle target encoding ─────────────────────────────────────────────────────

def _encode_kaggle_target(series: pd.Series) -> pd.Series:
    """Map string labels to int codes used internally."""
    mapping = {
        "fatal": 2,
        "serious injury": 1,
        "slight injury": 0,
        "serious": 1,
        "slight": 0,
    }
    return series.str.strip().str.lower().map(mapping).fillna(0).astype(int)


# ── Core loader ────────────────────────────────────────────────────────────────

def _load_csv_safe(path: Path, name: str) -> Optional[pd.DataFrame]:
    """Load CSV, print shape / dtypes, return None if file missing."""
    if not path.exists():
        instructions = DATASET_INSTRUCTIONS.get(name, {}).get("instructions", "")
        print(f"\n[DATA LOADER] WARNING: {name} dataset NOT FOUND at: {path}")
        if instructions:
            print(f"              -> {instructions}\n")
        return None

    df = pd.read_csv(path, low_memory=False)
    print(f"\n[DATA LOADER] Loaded {name}: {df.shape[0]:,} rows x {df.shape[1]} cols")
    print(f"              Path: {path}")
    print(f"              Dtypes:\n{df.dtypes.value_counts().to_string()}")
    return df


def load_nhai_dataset() -> Optional[DatasetBundle]:
    """Load and prepare the NHAI 4-class dataset."""
    df = _load_csv_safe(NHAI_PATH, "NHAI")
    if df is None:
        return None

    roles = _detect_all_roles(df.columns.tolist())

    # Determine target column
    target_col = roles["target"]
    derived = False
    if target_col is None:
        print("[DATA LOADER] No Severity column found — deriving from casualty columns ...")
        df["Severity"] = _derive_nhai_target(df)
        target_col = "Severity"
        derived = True

    # Drop casualty columns that would leak the target
    if derived:
        leak_patterns = ["killed", "grievous", "minor", "non_injury", "noninjury"]
        to_drop = [c for c in df.columns if any(p in c.lower() for p in leak_patterns)]
        df.drop(columns=to_drop, inplace=True, errors="ignore")
        print(f"[DATA LOADER] Dropped leakage columns: {to_drop}")

    # Convert target to int
    df[target_col] = pd.to_numeric(df[target_col], errors="coerce")
    df.dropna(subset=[target_col], inplace=True)
    df[target_col] = df[target_col].astype(int)

    _print_class_dist(df, target_col, NHAI_SEVERITY_MAP)

    bundle = DatasetBundle(
        name="NHAI Multi-Corridor",
        df=df,
        target_col=target_col,
        severity_map=NHAI_SEVERITY_MAP,
        time_col=roles["time"],
        date_col=roles["date"],
        day_col=roles["day"],
        weather_col=roles["weather"],
        road_col=roles["road"],
        vehicle_col=roles["vehicle"],
        cause_col=roles["cause"],
        source_path=NHAI_PATH,
    )
    return bundle


def load_kaggle_dataset() -> Optional[DatasetBundle]:
    """Load and prepare the Kaggle 3-class dataset."""
    df = _load_csv_safe(KAGGLE_PATH, "Kaggle")
    if df is None:
        return None

    roles = _detect_all_roles(df.columns.tolist())
    target_col = roles["target"]

    if target_col is None:
        for candidate in ["Accident_Severity", "accident_severity", "severity"]:
            if candidate in df.columns:
                target_col = candidate
                break

    if target_col is None:
        print("[DATA LOADER] Cannot determine target column for Kaggle dataset — skipping")
        return None

    # Encode string labels to int
    if df[target_col].dtype == object:
        df[target_col] = _encode_kaggle_target(df[target_col])
    else:
        df[target_col] = pd.to_numeric(df[target_col], errors="coerce")
        df.dropna(subset=[target_col], inplace=True)
        df[target_col] = df[target_col].astype(int)

    _print_class_dist(df, target_col, KAGGLE_SEVERITY_MAP)

    bundle = DatasetBundle(
        name="Kaggle India Severity",
        df=df,
        target_col=target_col,
        severity_map=KAGGLE_SEVERITY_MAP,
        time_col=roles["time"],
        date_col=roles["date"],
        day_col=roles["day"],
        weather_col=roles["weather"],
        road_col=roles["road"],
        vehicle_col=roles["vehicle"],
        cause_col=roles["cause"],
        source_path=KAGGLE_PATH,
    )
    return bundle


def load_all_datasets() -> Dict[str, Optional[DatasetBundle]]:
    """
    Load both datasets. Returns a dict with keys 'nhai' and 'kaggle'.
    Values are DatasetBundle or None if the file was missing.
    """
    print("\n" + "=" * 60)
    print("  LOADING DATASETS")
    print("=" * 60)

    bundles = {
        "nhai": load_nhai_dataset(),
        "kaggle": load_kaggle_dataset(),
    }

    loaded = [k for k, v in bundles.items() if v is not None]
    missing = [k for k, v in bundles.items() if v is None]

    print(f"\n[DATA LOADER] Loaded: {loaded}")
    if missing:
        print(f"[DATA LOADER] Missing (will be skipped): {missing}")

    return bundles


# ── EDA helpers ────────────────────────────────────────────────────────────────

def build_eda_summary(bundle: DatasetBundle) -> Dict:
    """
    Compute and return a dict of EDA statistics for one dataset.
    Also persists to EDA_SUMMARY_PATH (JSON).
    """
    df = bundle.df
    target_col = bundle.target_col

    class_dist_raw = df[target_col].value_counts().to_dict()
    class_dist = {
        bundle.severity_map.get(int(k), str(k)): int(v)
        for k, v in class_dist_raw.items()
    }

    missing = {
        col: int(df[col].isna().sum())
        for col in df.columns
        if df[col].isna().sum() > 0
    }

    date_range = {"start": None, "end": None}
    if bundle.date_col and bundle.date_col in df.columns:
        try:
            dates = pd.to_datetime(df[bundle.date_col], errors="coerce").dropna()
            if len(dates):
                date_range = {
                    "start": str(dates.min().date()),
                    "end": str(dates.max().date()),
                }
        except Exception:
            pass

    summary = {
        "dataset_name": bundle.name,
        "total_records": len(df),
        "total_features": len(df.columns) - 1,
        "class_distribution": class_dist,
        "missing_values": missing,
        "missing_pct": {
            col: round(cnt / len(df) * 100, 2) for col, cnt in missing.items()
        },
        "date_range": date_range,
        "num_classes": len(class_dist),
        "severity_map": bundle.severity_map,
    }

    EDA_SUMMARY_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(EDA_SUMMARY_PATH, "w") as f:
        json.dump(summary, f, indent=2)

    print(f"[DATA LOADER] EDA summary saved -> {EDA_SUMMARY_PATH}")
    return summary


# ── Utility ────────────────────────────────────────────────────────────────────

def _print_class_dist(df: pd.DataFrame, target_col: str, severity_map: Dict):
    counts = df[target_col].value_counts().sort_index()
    total = len(df)
    print(f"\n[DATA LOADER] Class distribution ({target_col}):")
    for code, cnt in counts.items():
        label = severity_map.get(int(code), str(code))
        pct = cnt / total * 100
        print(f"              {code} ({label:20s}): {cnt:5d}  ({pct:.1f}%)")

    if len(counts) > 1:
        ratio = counts.max() / counts.min()
        print(f"              Imbalance ratio (max/min): {ratio:.2f}")
        if ratio > 3:
            print("              WARNING: Significant imbalance detected — SMOTE will be applied.")