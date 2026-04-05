"""
Central configuration — paths, constants, severity mappings.
All other modules import from here so paths are never scattered.
"""

import os
from pathlib import Path

# ── Base directories ──────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
OUTPUTS_DIR = BASE_DIR / "outputs"
MODELS_DIR = OUTPUTS_DIR / "models"
PLOTS_DIR = OUTPUTS_DIR / "plots"

# Ensure output dirs always exist
MODELS_DIR.mkdir(parents=True, exist_ok=True)
PLOTS_DIR.mkdir(parents=True, exist_ok=True)

# ── Dataset filenames ─────────────────────────────────────────────────────────
NHAI_FILENAME = "accident_data.csv"
KAGGLE_FILENAME = "accident_severity_india.csv"

NHAI_PATH = DATA_DIR / NHAI_FILENAME
KAGGLE_PATH = DATA_DIR / KAGGLE_FILENAME

# Dataset download instructions shown when files are missing
DATASET_INSTRUCTIONS = {
    "NHAI": {
        "name": "NHAI Multi-Corridor Indian Highway Dataset",
        "url": "https://doi.org/10.5281/zenodo.16946653",
        "filename": NHAI_FILENAME,
        "instructions": (
            "Download 'accident_data.csv' from https://doi.org/10.5281/zenodo.16946653 "
            f"and place it in: {DATA_DIR}"
        ),
    },
    "Kaggle": {
        "name": "Kaggle Road Accident Severity in India",
        "url": "https://www.kaggle.com/datasets/s3programmer/road-accident-severity-in-india",
        "filename": KAGGLE_FILENAME,
        "instructions": (
            "Download 'accident_severity_india.csv' from "
            "https://www.kaggle.com/datasets/s3programmer/road-accident-severity-in-india "
            f"and place it in: {DATA_DIR}"
        ),
    },
}

# ── Severity label maps ────────────────────────────────────────────────────────
# NHAI dataset (4-class)
NHAI_SEVERITY_MAP = {1: "Fatal", 2: "Grievous Injury", 3: "Minor Injury", 4: "No Injury"}
NHAI_SEVERITY_COLORS = {
    "Fatal": "#EF4444",
    "Grievous Injury": "#F97316",
    "Minor Injury": "#F59E0B",
    "No Injury": "#10B981",
}

# Kaggle dataset (3-class)
KAGGLE_SEVERITY_MAP = {2: "Fatal", 1: "Serious Injury", 0: "Slight Injury"}
KAGGLE_SEVERITY_COLORS = {
    "Fatal": "#EF4444",
    "Serious Injury": "#F97316",
    "Slight Injury": "#F59E0B",
}

# ── Model identifiers ──────────────────────────────────────────────────────────
MODEL_IDS = ["RF", "XGB", "GBM", "LGBM", "LR", "SVM", "KNN"]
MODEL_NAMES = {
    "RF": "Random Forest",
    "XGB": "XGBoost",
    "GBM": "Gradient Boosting",
    "LGBM": "LightGBM",
    "LR": "Logistic Regression",
    "SVM": "Support Vector Machine",
    "KNN": "K-Nearest Neighbors",
}

# ── Saved artefact paths ──────────────────────────────────────────────────────
EDA_SUMMARY_PATH = OUTPUTS_DIR / "eda_summary.json"
MODEL_COMPARISON_PATH = OUTPUTS_DIR / "model_comparison.json"
SHAP_IMPORTANCE_PATH = OUTPUTS_DIR / "shap_feature_importance.json"
CROSS_DATASET_PATH = OUTPUTS_DIR / "cross_dataset_results.json"
PREPROCESSOR_PATH = OUTPUTS_DIR / "preprocessor.joblib"
LABEL_ENCODER_PATH = OUTPUTS_DIR / "label_encoder.joblib"

# ── ML hyper-params ────────────────────────────────────────────────────────────
RANDOM_STATE = 42
TEST_SIZE = 0.20
CV_FOLDS = 5
SMOTE_K_NEIGHBORS = 5

# ── FastAPI / CORS ────────────────────────────────────────────────────────────
API_HOST = "0.0.0.0"
API_PORT = 8000
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "*",
]