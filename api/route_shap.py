"""
SHAP explainability endpoints.
GET /api/shap/feature-importance
GET /api/shap/summary-plot
GET /api/shap/bar-plot
"""

import base64
import json
from typing import Any, Dict

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from config import PLOTS_DIR, SHAP_IMPORTANCE_PATH

router = APIRouter(prefix="/api/shap", tags=["SHAP"])

_state: Dict[str, Any] = {}


def set_state(state: Dict):
    _state.update(state)


@router.get("/feature-importance")
def get_shap_feature_importance():
    shap_data = _state.get("shap_results")
    if shap_data is None and SHAP_IMPORTANCE_PATH.exists():
        with open(SHAP_IMPORTANCE_PATH) as f:
            shap_data = json.load(f)
    if shap_data is None:
        raise HTTPException(status_code=503, detail="SHAP analysis not complete yet")
    return JSONResponse(content={
        "model": shap_data.get("model"),
        "features": shap_data.get("features", []),
    })


@router.get("/summary-plot")
def get_shap_summary_plot():
    plot_path = PLOTS_DIR / "shap_summary_plot.png"
    if not plot_path.exists():
        raise HTTPException(status_code=404, detail="SHAP summary plot not generated yet")
    with open(plot_path, "rb") as f:
        img_bytes = f.read()
    b64 = base64.b64encode(img_bytes).decode("utf-8")
    return JSONResponse(content={"image_base64": f"data:image/png;base64,{b64}"})


@router.get("/bar-plot")
def get_shap_bar_plot():
    plot_path = PLOTS_DIR / "shap_bar_plot.png"
    if not plot_path.exists():
        raise HTTPException(status_code=404, detail="SHAP bar plot not generated yet")
    with open(plot_path, "rb") as f:
        img_bytes = f.read()
    b64 = base64.b64encode(img_bytes).decode("utf-8")
    return JSONResponse(content={"image_base64": f"data:image/png;base64,{b64}"})