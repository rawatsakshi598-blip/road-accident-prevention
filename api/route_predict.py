"""
Prediction endpoints.
POST /api/predict
POST /api/predict/batch
GET  /api/filters/options
"""

import io
from typing import Any, Dict, List, Optional

import pandas as pd
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

router = APIRouter(tags=["Prediction"])

_state: Dict[str, Any] = {}


def set_state(state: Dict):
    _state.update(state)


def _predictor():
    p = _state.get("predictor")
    if p is None:
        raise HTTPException(status_code=503, detail="Predictor not initialised yet")
    return p


class PredictRequest(BaseModel):
    """
    Request schema — field names match the NHAI dataset columns exactly.
    All fields optional with sensible defaults so partial input works.
    """
    model_config = {"protected_namespaces": ()}

    Day_of_Week: Optional[int] = Field(default=1, ge=1, le=7, description="1=Mon .. 7=Sun")
    Time_of_Accident: Optional[str] = Field(default="12:00", description="HH:MM format")
    Accident_Location_A: Optional[int] = Field(default=1, description="1 or 2")
    Accident_Location_A_Chainage_km: Optional[float] = Field(default=150.0, description="Chainage in km")
    Accident_Location_A_Chainage_km_RoadSide: Optional[int] = Field(default=1, description="1 or 2")
    Causes_D: Optional[int] = Field(default=1, ge=1, le=8, description="Cause code 1-8")
    Road_Feature_E: Optional[int] = Field(default=1, ge=1, le=4, description="Road feature 1-4")
    Road_Condition_F: Optional[int] = Field(default=1, ge=1, le=8, description="Road condition 1-8")
    Weather_Conditions_H: Optional[int] = Field(default=1, ge=1, le=12, description="Weather 1-12")
    Vehicle_Type_Involved_J_V1: Optional[int] = Field(default=1, ge=1, le=14, description="Vehicle-1 type 1-14")
    Vehicle_Type_Involved_J_V2: Optional[float] = Field(default=None, description="Vehicle-2 type (optional)")
    model_name: Optional[str] = Field(default="GBM", description="Model ID: GBM, RF, XGB, LGBM, LR, SVM, KNN")


@router.post("/api/predict")
def predict_single(request: PredictRequest):
    predictor = _predictor()

    # Extract model_name separately
    model_id = request.model_name or "GBM"

    # Build input dict with EXACT column names the preprocessor expects
    # Exclude model_name — it's not a feature
    input_dict = {}
    request_data = request.model_dump()
    for key, value in request_data.items():
        if key == "model_name":
            continue
        if value is not None:
            input_dict[key] = value

    try:
        result = predictor.predict(input_dict, model_id=model_id)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Prediction failed: {exc}")

    if isinstance(result, dict) and "error" in result:
        raise HTTPException(status_code=422, detail=result["error"])

    return JSONResponse(content=result)


@router.post("/api/predict/batch")
async def predict_batch(
    file: UploadFile = File(...),
    model_name: str = "GBM",
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")
    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {exc}")
    predictor = _predictor()
    result = predictor.batch_predict(df, model_id=model_name)
    if isinstance(result, dict) and "error" in result:
        raise HTTPException(status_code=422, detail=result["error"])
    return JSONResponse(content=result)


@router.get("/api/filters/options")
def get_filter_options():
    """Return valid values for each input field."""
    predictor = _predictor()
    options = predictor.get_filter_options()

    if isinstance(options, dict):
        return JSONResponse(content=options)

    return JSONResponse(content={
        "Day_of_Week": [1, 2, 3, 4, 5, 6, 7],
        "Accident_Location_A": [1, 2],
        "Accident_Location_A_Chainage_km_RoadSide": [1, 2],
        "Causes_D": [1, 2, 3, 4, 5, 6, 7, 8],
        "Road_Feature_E": [1, 2, 3, 4],
        "Road_Condition_F": [1, 2, 3, 4, 5, 6, 7, 8],
        "Weather_Conditions_H": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        "Vehicle_Type_Involved_J_V1": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    })