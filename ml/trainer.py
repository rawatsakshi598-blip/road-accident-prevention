"""
Model training pipeline.

Trains all 7 classifiers:
  RF   - Random Forest
  XGB  - XGBoost
  GBM  - Gradient Boosting (sklearn)
  LGBM - LightGBM
  LR   - Logistic Regression (baseline)
  SVM  - Support Vector Machine
  KNN  - K-Nearest Neighbors
"""

import time
import warnings
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import joblib
import numpy as np
from imblearn.combine import SMOTETomek
from imblearn.over_sampling import SMOTE
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC

import lightgbm as lgb
import xgboost as xgb

from config import (
    CV_FOLDS,
    MODELS_DIR,
    MODEL_IDS,
    MODEL_NAMES,
    RANDOM_STATE,
    SMOTE_K_NEIGHBORS,
    TEST_SIZE,
)

warnings.filterwarnings("ignore")


# ── Model factory ──────────────────────────────────────────────────────────────

def _build_models() -> Dict:
    """Return a fresh dict of all 7 un-fitted estimators."""
    return {
        "RF": RandomForestClassifier(
            n_estimators=300,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            max_features="sqrt",
            class_weight="balanced",
            random_state=RANDOM_STATE,
            n_jobs=-1,
        ),
        "XGB": xgb.XGBClassifier(
            n_estimators=300,
            max_depth=8,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            reg_alpha=0.1,
            reg_lambda=1.0,
            eval_metric="mlogloss",
            random_state=RANDOM_STATE,
            n_jobs=-1,
            verbosity=0,
        ),
        "GBM": GradientBoostingClassifier(
            n_estimators=300,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=RANDOM_STATE,
        ),
        "LGBM": lgb.LGBMClassifier(
            n_estimators=300,
            max_depth=10,
            learning_rate=0.1,
            num_leaves=31,
            subsample=0.8,
            colsample_bytree=0.8,
            class_weight="balanced",
            random_state=RANDOM_STATE,
            n_jobs=-1,
            verbose=-1,
        ),
        "LR": LogisticRegression(
            max_iter=1000,
            class_weight="balanced",
            
            solver="lbfgs",
            random_state=RANDOM_STATE,
        ),
        "SVM": SVC(
            kernel="rbf",
            C=1.0,
            gamma="scale",
            class_weight="balanced",
            probability=True,
            random_state=RANDOM_STATE,
        ),
        "KNN": KNeighborsClassifier(
            n_neighbors=7,
            weights="distance",
            metric="minkowski",
            n_jobs=-1,
        ),
    }


# ── SMOTE helper ───────────────────────────────────────────────────────────────

def _apply_smote(
    X_train: np.ndarray, y_train: np.ndarray, use_tomek: bool = False
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Apply SMOTE (or SMOTETomek) to the training set.
    Automatically reduces k_neighbors if the smallest class is too small.
    """
    min_class_count = np.bincount(y_train).min()
    k = min(SMOTE_K_NEIGHBORS, min_class_count - 1)
    k = max(k, 1)

    print(f"\n[TRAINER] Applying {'SMOTETomek' if use_tomek else 'SMOTE'} "
          f"(k_neighbors={k}) ...")

    try:
        if use_tomek:
            sampler = SMOTETomek(
                smote=SMOTE(k_neighbors=k, random_state=RANDOM_STATE),
                random_state=RANDOM_STATE,
            )
        else:
            sampler = SMOTE(k_neighbors=k, random_state=RANDOM_STATE)

        X_res, y_res = sampler.fit_resample(X_train, y_train)
    except Exception as exc:
        print(f"[TRAINER] WARNING: SMOTE failed ({exc}) — using original training data.")
        return X_train, y_train

    counts_before = dict(zip(*np.unique(y_train, return_counts=True)))
    counts_after = dict(zip(*np.unique(y_res, return_counts=True)))
    print(f"[TRAINER] Class counts before SMOTE: {counts_before}")
    print(f"[TRAINER] Class counts after  SMOTE: {counts_after}")
    return X_res, y_res


# ── Training loop ──────────────────────────────────────────────────────────────

def train_all_models(
    X_train: np.ndarray,
    y_train: np.ndarray,
    dataset_tag: str = "nhai",
) -> Dict:
    """
    Train all 7 models on X_train / y_train.
    Returns a dict: model_id -> {
        "model": fitted estimator,
        "cv_scores": np.ndarray,
        "cv_mean": float,
        "cv_std": float,
        "training_time_seconds": float,
    }
    """
    print("\n" + "=" * 60)
    print(f"  TRAINING MODELS  (dataset: {dataset_tag.upper()})")
    print("=" * 60)

    X_sm, y_sm = _apply_smote(X_train, y_train, use_tomek=False)

    skf = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    models_dict = _build_models()
    results: Dict[str, Dict] = {}

    for model_id, estimator in models_dict.items():
        name = MODEL_NAMES[model_id]
        print(f"\n[TRAINER] -- {name} ({model_id}) --")

        print(f"[TRAINER]  Cross-validating ({CV_FOLDS} folds, f1_weighted) ...")
        t0 = time.time()
        try:
            cv_scores = cross_val_score(
                estimator, X_sm, y_sm,
                cv=skf, scoring="f1_weighted", n_jobs=-1,
            )
        except Exception as exc:
            print(f"[TRAINER]  WARNING: CV failed: {exc} — using zeros")
            cv_scores = np.zeros(CV_FOLDS)
        cv_time = time.time() - t0
        print(f"[TRAINER]  CV F1 = {cv_scores.mean():.4f} +/- {cv_scores.std():.4f}  "
              f"(took {cv_time:.1f}s)")

        print(f"[TRAINER]  Training on full SMOTE set ...")
        t0 = time.time()
        try:
            estimator.fit(X_sm, y_sm)
        except Exception as exc:
            print(f"[TRAINER]  ERROR: Training failed: {exc}")
            continue
        train_time = time.time() - t0
        print(f"[TRAINER]  Done in {train_time:.1f}s")

        model_path = _model_path(model_id, dataset_tag)
        joblib.dump(estimator, model_path)
        print(f"[TRAINER]  Saved -> {model_path}")

        results[model_id] = {
            "model": estimator,
            "cv_scores": cv_scores,
            "cv_mean": float(cv_scores.mean()),
            "cv_std": float(cv_scores.std()),
            "training_time_seconds": float(train_time),
        }

    print(f"\n[TRAINER] Training complete. {len(results)}/{len(models_dict)} models succeeded.")
    return results


# ── Helpers ────────────────────────────────────────────────────────────────────

def _model_path(model_id: str, dataset_tag: str) -> Path:
    return MODELS_DIR / f"{model_id}_{dataset_tag}_model.joblib"


def load_trained_models(dataset_tag: str = "nhai") -> Dict:
    """Load all previously saved models from disk."""
    loaded = {}
    for model_id in MODEL_IDS:
        path = _model_path(model_id, dataset_tag)
        if path.exists():
            try:
                loaded[model_id] = joblib.load(path)
                print(f"[TRAINER] Loaded {MODEL_NAMES[model_id]} from {path}")
            except Exception as exc:
                print(f"[TRAINER] WARNING: Could not load {path}: {exc}")
    return loaded


def models_exist(dataset_tag: str = "nhai") -> bool:
    """Return True only if ALL 7 model files are present."""
    return all(_model_path(mid, dataset_tag).exists() for mid in MODEL_IDS)