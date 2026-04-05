"""
Model performance endpoints.
GET /api/models/comparison
GET /api/models/compare
GET /api/models/{model_name}/confusion-matrix
GET /api/models/{model_name}/metrics
GET /api/models/{model_name}/roc-data
"""

import json
from typing import Any, Dict

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from config import MODEL_COMPARISON_PATH, MODEL_NAMES

router = APIRouter(prefix="/api/models", tags=["Models"])

_state: Dict[str, Any] = {}


def set_state(state: Dict):
    _state.update(state)


def _eval_results() -> Dict:
    """Get evaluation results from state or file."""
    results = _state.get("eval_results")
    if results:
        return results
    if MODEL_COMPARISON_PATH.exists():
        with open(MODEL_COMPARISON_PATH) as f:
            return json.load(f)
    raise HTTPException(status_code=503, detail="Model evaluation not complete yet")


@router.get("/comparison")
def get_model_comparison():
    """Original endpoint - returns models as array."""
    results = _eval_results()
    return JSONResponse(content={
        "models": results.get("models", []),
        "best_model": results.get("best_model"),
        "best_model_id": results.get("best_model_id"),
        "best_metric": results.get("best_metric"),
        "best_value": results.get("best_value"),
    })


@router.get("/compare")
def get_model_compare():
    """
    Frontend-compatible endpoint.
    Returns models as dictionary with model IDs as keys.
    """
    results = _eval_results()
    models_list = results.get("models", [])
    
    # Transform models array into dictionary
    models_dict = {}
    for model in models_list:
        # Get model identifier
        model_id = model.get("model_id") or model.get("name") or "Unknown"
        
        # Build model metrics object matching frontend interface
        models_dict[model_id] = {
            "accuracy": model.get("accuracy", 0.0),
            "precision_weighted": model.get("precision_weighted", 0.0),
            "recall_weighted": model.get("recall_weighted", 0.0),
            "f1_weighted": model.get("f1_weighted", 0.0),
            "confusion_matrix": model.get("confusion_matrix", []),
            "classification_report": model.get("classification_report", {}),
            "confusion_matrix_plot": model.get("confusion_matrix_plot", ""),
            "confusion_matrix_normalized_plot": model.get("confusion_matrix_normalized_plot", ""),
            "feature_importance_plot": model.get("feature_importance_plot"),
            "feature_importance": model.get("feature_importance"),
        }
    
    return JSONResponse(content={
        "models": models_dict,
        "best_model": results.get("best_model_id") or results.get("best_model", "GBM"),
        "comparison_plot": results.get("comparison_plot", ""),
    })


@router.get("/{model_name}/confusion-matrix")
def get_confusion_matrix(model_name: str):
    """Get confusion matrix for specific model."""
    results = _eval_results()
    cm_data = results.get("confusion_matrices", {})

    model_id = _resolve_model_id(model_name)
    data = cm_data.get(model_id) or cm_data.get(model_name)

    if data is None:
        available = list(cm_data.keys())
        raise HTTPException(
            status_code=404,
            detail=f"Confusion matrix for '{model_name}' not found. Available: {available}",
        )

    return JSONResponse(content={
        "model": model_name,
        "model_id": model_id,
        "matrix": data["matrix"],
        "normalized_matrix": data["normalized_matrix"],
        "labels": data["labels"],
    })


@router.get("/{model_name}/metrics")
def get_model_metrics(model_name: str):
    """Get detailed metrics for a specific model."""
    results = _eval_results()
    models_list = results.get("models", [])
    
    model_id = _resolve_model_id(model_name)
    
    # Find the model in the list
    model_data = None
    for model in models_list:
        if model.get("model_id") == model_id or model.get("name") == model_id:
            model_data = model
            break
    
    if model_data is None:
        available = [m.get("model_id") or m.get("name") for m in models_list]
        raise HTTPException(
            status_code=404,
            detail=f"Model '{model_name}' not found. Available: {available}",
        )
    
    return JSONResponse(content={
        "model_id": model_id,
        "accuracy": model_data.get("accuracy", 0.0),
        "precision_weighted": model_data.get("precision_weighted", 0.0),
        "recall_weighted": model_data.get("recall_weighted", 0.0),
        "f1_weighted": model_data.get("f1_weighted", 0.0),
        "confusion_matrix": model_data.get("confusion_matrix", []),
        "classification_report": model_data.get("classification_report", {}),
    })


@router.get("/{model_name}/roc-data")
def get_roc_data(model_name: str):
    """Get ROC curve data for specific model."""
    results = _eval_results()
    roc_all = results.get("roc_data", {})

    model_id = _resolve_model_id(model_name)
    data = roc_all.get(model_id) or roc_all.get(model_name)

    if data is None:
        available = list(roc_all.keys())
        raise HTTPException(
            status_code=404,
            detail=f"ROC data for '{model_name}' not found. Available: {available}",
        )

    return JSONResponse(content={
        "model": model_name,
        "model_id": model_id,
        "classes": data,
    })


def _resolve_model_id(name: str) -> str:
    """Resolve model name to standard model ID."""
    name_lower = name.lower().strip()
    for mid, mname in MODEL_NAMES.items():
        if mname.lower() == name_lower or mid.lower() == name_lower:
            return mid
    return name