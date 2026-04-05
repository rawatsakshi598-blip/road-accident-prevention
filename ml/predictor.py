"""
Inference engine for single and batch predictions.
"""

import warnings
from typing import Dict, List, Optional

import numpy as np
import pandas as pd

from config import MODEL_NAMES, SHAP_IMPORTANCE_PATH
from ml.data_loader import DatasetBundle
from ml.preprocessor import AccidentPreprocessor

warnings.filterwarnings("ignore")


class AccidentPredictor:
    """
    Wraps a fitted estimator + preprocessor to serve predictions.
    Load once at startup; call predict() / batch_predict() per request.
    """

    def __init__(
        self,
        estimators: Dict,
        preprocessor: AccidentPreprocessor,
        bundle: DatasetBundle,
        evaluation_results: Dict,
    ):
        self.estimators = estimators
        self.preprocessor = preprocessor
        self.bundle = bundle
        self.eval_results = evaluation_results
        self._severity_map = bundle.severity_map
        self._shap_features = self._load_shap_features()

    # -- Public API --------------------------------------------------------

    def _fill_missing_columns(self, input_data: Dict) -> Dict:
        """
        Add missing columns that the preprocessor expects.
        This ensures temporal features can be created even when
        Date or other columns are not provided.
        """
        data = dict(input_data)

        # Add Date if missing (needed for _Month, _Quarter, _Year)
        if self.bundle.date_col and self.bundle.date_col not in data:
            data[self.bundle.date_col] = "01/01/2023"

        # Add Time if missing (needed for _Hour, _Time_Period, _Is_Night)
        if self.bundle.time_col and self.bundle.time_col not in data:
            data[self.bundle.time_col] = "12:00"

        # Add Day_of_Week if missing (needed for _Is_Weekend)
        if self.bundle.day_col and self.bundle.day_col not in data:
            data[self.bundle.day_col] = 1

        return data

    def predict(self, input_data: Dict, model_id: str = "GBM") -> Dict:
        """Make a single prediction."""
        estimator = self._get_estimator(model_id)
        if estimator is None:
            return {"error": f"Model '{model_id}' not available"}

        # Fill missing columns so preprocessor can create all features
        input_data = self._fill_missing_columns(input_data)

        df_input = pd.DataFrame([input_data])
        try:
            X = self.preprocessor.transform(df_input)
        except Exception as exc:
            return {"error": f"Preprocessing failed: {exc}"}

        y_pred_enc = estimator.predict(X)
        y_pred_orig = self.preprocessor.inverse_transform_target(y_pred_enc)
        predicted_code = int(y_pred_orig[0])
        predicted_label = self._severity_map.get(predicted_code, str(predicted_code))

        proba_dict = {}
        confidence = 1.0
        if hasattr(estimator, "predict_proba"):
            proba = estimator.predict_proba(X)[0]
            classes_orig = self.preprocessor.inverse_transform_target(
                estimator.classes_
            )
            for code, p in zip(classes_orig, proba):
                label = self._severity_map.get(int(code), str(code))
                proba_dict[label] = round(float(p), 4)
            confidence = round(float(proba.max()), 4)

        top_risk = self._get_risk_factors(input_data)
        model_acc = self._model_accuracy(model_id)

        return {
            "prediction": predicted_label,
            "prediction_code": predicted_code,
            "confidence": confidence,
            "probabilities": proba_dict,
            "top_risk_factors": top_risk,
            "model_used": MODEL_NAMES.get(model_id, model_id),
            "model_accuracy": model_acc,
            "dataset": self.bundle.name,
            "dataset_records": len(self.bundle.df),
        }

    def batch_predict(self, df: pd.DataFrame, model_id: str = "GBM") -> Dict:
        """Predict for every row in df."""
        estimator = self._get_estimator(model_id)
        if estimator is None:
            return {"error": f"Model '{model_id}' not available"}

        # Fill missing columns for batch too
        if self.bundle.date_col and self.bundle.date_col not in df.columns:
            df[self.bundle.date_col] = "01/01/2023"
        if self.bundle.time_col and self.bundle.time_col not in df.columns:
            df[self.bundle.time_col] = "12:00"
        if self.bundle.day_col and self.bundle.day_col not in df.columns:
            df[self.bundle.day_col] = 1

        try:
            X = self.preprocessor.transform(df)
        except Exception as exc:
            return {"error": f"Preprocessing failed: {exc}"}

        y_pred_enc = estimator.predict(X)
        y_pred_orig = self.preprocessor.inverse_transform_target(y_pred_enc)

        probabilities = None
        if hasattr(estimator, "predict_proba"):
            probabilities = estimator.predict_proba(X)

        predictions = []
        label_counts: Dict[str, int] = {}
        for i, code in enumerate(y_pred_orig):
            code = int(code)
            label = self._severity_map.get(code, str(code))
            conf = (
                round(float(probabilities[i].max()), 4)
                if probabilities is not None else 1.0
            )
            predictions.append({"row": i + 1, "prediction": label, "confidence": conf})
            label_counts[label] = label_counts.get(label, 0) + 1

        return {
            "total_records": len(predictions),
            "predictions": predictions,
            "summary": label_counts,
            "model_used": MODEL_NAMES.get(model_id, model_id),
        }

    def get_filter_options(self) -> Dict[str, List]:
        """Return unique values for every categorical column."""
        df = self.bundle.df
        options: Dict[str, List] = {}

        for col in df.columns:
            if col == self.bundle.target_col:
                continue
            unique_vals = sorted([
                v if not isinstance(v, (np.integer, np.floating)) else int(v) if isinstance(v, np.integer) else float(v)
                for v in df[col].dropna().unique()
            ])
            if len(unique_vals) <= 100:
                options[col] = unique_vals

        options["Time_Periods"] = ["Morning", "Afternoon", "Evening", "Night"]
        options["Severity_Map"] = {str(k): v for k, v in self._severity_map.items()}
        return options

    # -- Private helpers ---------------------------------------------------

    def _get_estimator(self, model_id: str):
        est = self.estimators.get(model_id)
        if est is None:
            for k, v in self.estimators.items():
                if k.lower() == model_id.lower():
                    return v
        return est

    def _get_risk_factors(self, input_data: Dict) -> List[Dict]:
        if not self._shap_features:
            return []
        risk = []
        for feat in self._shap_features[:10]:
            feat_name = feat["name"].lower()
            for key, val in input_data.items():
                if key.lower() in feat_name or feat_name.startswith(key.lower()):
                    risk.append({
                        "feature": feat["name"],
                        "value": str(val),
                        "contribution": feat["importance"],
                    })
                    break
        return risk[:3]

    def _model_accuracy(self, model_id: str) -> Optional[float]:
        if not self.eval_results or "models" not in self.eval_results:
            return None
        for m in self.eval_results["models"]:
            if m["id"] == model_id:
                return m.get("accuracy")
        return None

    def _load_shap_features(self) -> List[Dict]:
        if SHAP_IMPORTANCE_PATH.exists():
            import json
            try:
                with open(SHAP_IMPORTANCE_PATH) as f:
                    data = json.load(f)
                return data.get("features", [])
            except Exception:
                pass
        return []