"""
Dataset information and health endpoints.
GET /api/health
GET /api/datasets/info
"""

from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from config import DATASET_INSTRUCTIONS, MODEL_IDS, MODELS_DIR

router = APIRouter(tags=["Data"])

_state: Dict[str, Any] = {}


def set_state(state: Dict):
    _state.update(state)


@router.get("/api/health")
def health_check():
    loaded_models = [
        mid for mid in MODEL_IDS
        if (MODELS_DIR / f"{mid}_nhai_model.joblib").exists()
    ]
    return JSONResponse(content={
        "status": "healthy",
        "models_loaded": bool(loaded_models),
        "loaded_model_ids": loaded_models,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    })


@router.get("/api/datasets/info")
def get_datasets_info():
    datasets = []

    nhai_bundle = _state.get("primary_bundle")
    datasets.append({
        "key": "nhai",
        "name": "NHAI Multi-Corridor",
        "records": len(nhai_bundle.df) if nhai_bundle else 0,
        "features": (len(nhai_bundle.df.columns) - 1) if nhai_bundle else 0,
        "severity_classes": len(nhai_bundle.severity_map) if nhai_bundle else 4,
        "period": "2013-2023",
        "source": "Zenodo",
        "doi": "https://doi.org/10.5281/zenodo.16946653",
        "status": "loaded" if nhai_bundle else "not_found",
        "instructions": None if nhai_bundle else DATASET_INSTRUCTIONS["NHAI"]["instructions"],
    })

    kaggle_bundle = _state.get("kaggle_bundle")
    datasets.append({
        "key": "kaggle",
        "name": "Kaggle India Severity",
        "records": len(kaggle_bundle.df) if kaggle_bundle else 0,
        "features": (len(kaggle_bundle.df.columns) - 1) if kaggle_bundle else 0,
        "severity_classes": len(kaggle_bundle.severity_map) if kaggle_bundle else 3,
        "period": "2017-2022",
        "source": "Kaggle",
        "url": "https://www.kaggle.com/datasets/s3programmer/road-accident-severity-in-india",
        "status": "loaded" if kaggle_bundle else "not_found",
        "instructions": None if kaggle_bundle else DATASET_INSTRUCTIONS["Kaggle"]["instructions"],
    })

    return JSONResponse(content={"datasets": datasets})