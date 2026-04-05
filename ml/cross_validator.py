"""
Cross-dataset validation.
Trains best model on Dataset A, tests on Dataset B and vice versa.
"""

import json
import warnings
from typing import Dict, Optional

import numpy as np
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split

from config import CROSS_DATASET_PATH, RANDOM_STATE, TEST_SIZE
from ml.data_loader import DatasetBundle
from ml.preprocessor import AccidentPreprocessor
from ml.trainer import _build_models, _apply_smote

warnings.filterwarnings("ignore")


def _align_features(X_source, X_target, feat_src, feat_tgt):
    """Keep only common features between source and target."""
    common = [f for f in feat_src if f in feat_tgt]
    if not common:
        return None, None, []

    src_idx = [feat_src.index(f) for f in common]
    tgt_idx = [feat_tgt.index(f) for f in common]
    return X_source[:, src_idx], X_target[:, tgt_idx], common


def run_cross_dataset_validation(
    bundle_a: DatasetBundle,
    bundle_b: DatasetBundle,
    best_model_id: str = "XGB",
) -> Dict:
    """Run cross-dataset validation between two bundles."""
    print("\n[CROSS-VAL] Running cross-dataset validation ...")

    results = {}

    for (src, tgt) in [(bundle_a, bundle_b), (bundle_b, bundle_a)]:
        tag = f"{src.name} -> {tgt.name}"
        print(f"[CROSS-VAL] {tag}")

        try:
            prep_src = AccidentPreprocessor(src)
            X_src, y_src = prep_src.fit_transform(src.df)

            prep_tgt = AccidentPreprocessor(tgt)
            X_tgt, y_tgt = prep_tgt.fit_transform(tgt.df)

            feat_src = prep_src.feature_cols
            feat_tgt = prep_tgt.feature_cols

            X_src_al, X_tgt_al, common = _align_features(
                X_src, X_tgt, feat_src, feat_tgt
            )
            if not common:
                print(f"[CROSS-VAL] WARNING: No common features — skipping {tag}")
                results[tag] = {"error": "No common features"}
                continue

            print(f"[CROSS-VAL] Common features: {len(common)}")

            X_sm, y_sm = _apply_smote(X_src_al, y_src)

            model = _build_models()[best_model_id]
            model.fit(X_sm, y_sm)

            y_pred = model.predict(X_tgt_al)
            acc = accuracy_score(y_tgt, y_pred)
            f1w = f1_score(y_tgt, y_pred, average="weighted", zero_division=0)

            results[tag] = {
                "accuracy": round(acc, 4),
                "f1_weighted": round(f1w, 4),
                "common_features": len(common),
                "source_records": len(X_src),
                "target_records": len(X_tgt),
            }
            print(f"[CROSS-VAL] Acc={acc:.4f}  F1w={f1w:.4f}")

        except Exception as exc:
            print(f"[CROSS-VAL] ERROR: Failed: {exc}")
            results[tag] = {"error": str(exc)}

    CROSS_DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CROSS_DATASET_PATH, "w") as f:
        json.dump(results, f, indent=2)
    print(f"[CROSS-VAL] Saved -> {CROSS_DATASET_PATH}")

    return results