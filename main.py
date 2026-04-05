"""
FastAPI application entry point.

Startup sequence:
  1. Load datasets from ./data/
  2. If trained models exist -> load them, else run full training pipeline
  3. Run evaluation (or load cached results)
  4. Run SHAP analysis on best model
  5. Register all API routes
"""

import json
import traceback
from pathlib import Path
from typing import Dict, Any

import numpy as np
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sklearn.model_selection import train_test_split

from config import (
    API_HOST,
    API_PORT,
    CORS_ORIGINS,
    MODEL_COMPARISON_PATH,
    PREPROCESSOR_PATH,
    RANDOM_STATE,
    TEST_SIZE,
    SHAP_IMPORTANCE_PATH,
)

from api.routes_eda import router as eda_router, set_state as eda_set_state
from api.route_model import router as models_router, set_state as models_set_state
from api.route_shap import router as shap_router, set_state as shap_set_state
from api.route_predict import router as predict_router, set_state as predict_set_state
from api.route_data import router as data_router, set_state as data_set_state

from ml.data_loader import load_all_datasets, build_eda_summary
from ml.preprocessor import AccidentPreprocessor
from ml.trainer import train_all_models, load_trained_models, models_exist
from ml.evaluator import evaluate_all_models
from ml.shap_analyzer import run_shap_analysis
from ml.predictor import AccidentPredictor
from ml.cross_validator import run_cross_dataset_validation


# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="Indian Road Accident Severity Prediction API",
    description="ML-powered REST API for road accident severity classification.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all API routers
app.include_router(eda_router)
app.include_router(models_router)
# Add compatibility route for frontend (singular /api/model)
app.include_router(models_router, prefix="/api/model", include_in_schema=False)
app.include_router(shap_router)
app.include_router(predict_router)
app.include_router(data_router)

APP_STATE: Dict[str, Any] = {}


def _broadcast_state():
    """Broadcast APP_STATE to all routers."""
    eda_set_state(APP_STATE)
    models_set_state(APP_STATE)
    shap_set_state(APP_STATE)
    predict_set_state(APP_STATE)
    data_set_state(APP_STATE)


# ── Startup pipeline ──────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_pipeline():
    print("\n" + "=" * 60)
    print("  ACCIDENT SEVERITY PREDICTION — API STARTUP")
    print("=" * 60)

    try:
        # Step 1: Load datasets
        bundles = load_all_datasets()
        primary_bundle = bundles.get("nhai") or bundles.get("kaggle")

        if primary_bundle is None:
            print("\n[STARTUP] No dataset available. API starting in degraded mode.")
            print("[STARTUP] Place dataset CSV files in ./data/ and restart.")
            _broadcast_state()
            return

        APP_STATE["primary_bundle"] = primary_bundle
        APP_STATE["kaggle_bundle"] = bundles.get("kaggle")
        dataset_tag = "nhai" if bundles.get("nhai") else "kaggle"

        # Step 2: EDA summary
        eda_summary = build_eda_summary(primary_bundle)
        APP_STATE["eda_summary"] = eda_summary

        # Step 3: Preprocessing
        preprocessor = AccidentPreprocessor(primary_bundle)
        X_all, y_all = preprocessor.fit_transform(primary_bundle.df)
        X_train, X_test, y_train, y_test = train_test_split(
            X_all, y_all,
            test_size=TEST_SIZE,
            stratify=y_all,
            random_state=RANDOM_STATE,
        )
        APP_STATE["preprocessor"] = preprocessor
        APP_STATE["X_test"] = X_test
        APP_STATE["y_test"] = y_test

        # Step 4: Train or load models
        if models_exist(dataset_tag):
            print("\n[STARTUP] Trained models found — loading from disk ...")
            trained_estimators = load_trained_models(dataset_tag)
            trained_results = {
                mid: {
                    "model": est,
                    "cv_mean": 0.0,
                    "cv_std": 0.0,
                    "training_time_seconds": 0.0,
                }
                for mid, est in trained_estimators.items()
            }
        else:
            print("\n[STARTUP] No saved models — running training pipeline ...")
            trained_results = train_all_models(X_train, y_train, dataset_tag)
            trained_estimators = {mid: r["model"] for mid, r in trained_results.items()}

        APP_STATE["trained_estimators"] = trained_estimators
        APP_STATE["trained_results"] = trained_results

        # Step 5: Evaluation
        if MODEL_COMPARISON_PATH.exists() and models_exist(dataset_tag):
            print("\n[STARTUP] Cached evaluation results found — loading ...")
            with open(MODEL_COMPARISON_PATH) as f:
                eval_results = json.load(f)
        else:
            print("\n[STARTUP] Running evaluation ...")
            orig_codes = preprocessor.inverse_transform_target(np.unique(y_test))
            class_labels = [
                primary_bundle.severity_map.get(int(c), str(c))
                for c in sorted(orig_codes)
            ]
            eval_results = evaluate_all_models(
                trained_results=trained_results,
                X_test=X_test,
                y_test=y_test,
                class_labels=class_labels,
                feature_names=preprocessor.feature_cols,
            )

        APP_STATE["eval_results"] = eval_results

        # Step 6: SHAP analysis
        best_model_id = eval_results.get("best_model_id", "XGB")
        best_estimator = trained_estimators.get(best_model_id)
        if best_estimator is not None:
            if not SHAP_IMPORTANCE_PATH.exists():
                shap_results = run_shap_analysis(
                    model_id=best_model_id,
                    estimator=best_estimator,
                    X_test=X_test,
                    feature_names=preprocessor.feature_cols,
                )
                APP_STATE["shap_results"] = shap_results
            else:
                with open(SHAP_IMPORTANCE_PATH) as f:
                    APP_STATE["shap_results"] = json.load(f)

        # Step 7: Build predictor
        predictor = AccidentPredictor(
            estimators=trained_estimators,
            preprocessor=preprocessor,
            bundle=primary_bundle,
            evaluation_results=eval_results,
        )
        APP_STATE["predictor"] = predictor

        # Step 8: Cross-dataset validation
        if bundles.get("nhai") and bundles.get("kaggle"):
            try:
                cross_results = run_cross_dataset_validation(
                    bundles["nhai"], bundles["kaggle"], best_model_id
                )
                APP_STATE["cross_results"] = cross_results
            except Exception as exc:
                print(f"[STARTUP] WARNING: Cross-dataset validation failed: {exc}")

        _broadcast_state()

        print("\n" + "=" * 60)
        print("  API READY")
        print(f"  Dataset   : {primary_bundle.name} ({len(primary_bundle.df):,} records)")
        print(f"  Models    : {list(trained_estimators.keys())}")
        print(f"  Best model: {eval_results.get('best_model')} "
              f"(F1={eval_results.get('best_value', 0):.4f})")
        print(f"  Docs      : http://localhost:{API_PORT}/docs")
        print("=" * 60 + "\n")

    except Exception as exc:
        print(f"\n[STARTUP] FATAL ERROR: {exc}")
        traceback.print_exc()
        _broadcast_state()


# ── Health Check Endpoint ─────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """
    Health check endpoint for frontend monitoring.
    Returns system status including models, preprocessor, and API health.
    """
    model_path = Path("outputs/models")
    available_models = []
    model_details = {}

    if model_path.exists():
        model_files = list(model_path.glob("*_nhai_model.joblib"))
        available_models = sorted([f.stem.replace('_nhai_model', '') for f in model_files])

        for model in available_models:
            model_file = model_path / f"{model}_nhai_model.joblib"
            model_details[model] = {
                "loaded": model_file.exists(),
                "path": str(model_file),
            }

    preprocessor_loaded = PREPROCESSOR_PATH.exists()
    primary_model_loaded = (model_path / "GBM_nhai_model.joblib").exists()

    return {
        "status": "healthy",
        "model_loaded": primary_model_loaded,
        "preprocessor_loaded": preprocessor_loaded,
        "available_models": available_models,
        "model_details": model_details,
    }


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Indian Road Accident Severity Prediction API",
        "version": "2.0.0",
        "status": "online",
        "documentation": "/docs",
        "health_check": "/health",
    }


# ── Application Entry Point ───────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=API_HOST,
        port=API_PORT,
        reload=False,
        log_level="info",
    )