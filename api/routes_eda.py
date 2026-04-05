"""
EDA and chart data endpoints.
GET /api/eda/summary
GET /api/eda/charts/{chart_name}
"""

import json
from typing import Any, Dict

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from config import EDA_SUMMARY_PATH, NHAI_SEVERITY_COLORS

router = APIRouter(prefix="/api/eda", tags=["EDA"])

_state: Dict[str, Any] = {}


def set_state(state: Dict):
    _state.update(state)


def _bundle():
    b = _state.get("primary_bundle")
    if b is None:
        raise HTTPException(status_code=503, detail="Dataset not loaded yet")
    return b


def _build_full_eda(b) -> dict:
    """Build comprehensive EDA summary from the dataset bundle."""
    df = b.df.copy()
    target_col = b.target_col

    # Basic info
    total_rows = len(df)
    total_columns = len(df.columns)
    memory_bytes = df.memory_usage(deep=True).sum()
    if memory_bytes > 1_000_000:
        memory_str = f"{memory_bytes / 1_000_000:.1f} MB"
    else:
        memory_str = f"{memory_bytes / 1_000:.1f} KB"

    # Column lists
    all_columns = df.columns.tolist()
    dtypes_dict = {col: str(dtype) for col, dtype in df.dtypes.items()}

    # Numerical columns (exclude target)
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    numeric_cols = [c for c in numeric_cols if c != target_col]

    # Categorical columns (exclude target)
    cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()
    cat_cols = [c for c in cat_cols if c != target_col]

    # Also treat integer columns with few unique values as categorical
    for col in numeric_cols[:]:
        if df[col].nunique() <= 15:
            cat_cols.append(col)

    # Numerical stats
    numerical_stats = {}
    pure_numeric = [c for c in numeric_cols if c not in cat_cols]
    for col in pure_numeric:
        desc = df[col].describe()
        numerical_stats[col] = {
            "count": int(desc.get("count", 0)),
            "mean": round(float(desc.get("mean", 0)), 4),
            "std": round(float(desc.get("std", 0)), 4),
            "min": round(float(desc.get("min", 0)), 4),
            "25%": round(float(desc.get("25%", 0)), 4),
            "50%": round(float(desc.get("50%", 0)), 4),
            "75%": round(float(desc.get("75%", 0)), 4),
            "max": round(float(desc.get("max", 0)), 4),
        }

    # Categorical stats
    categorical_stats = {}
    for col in cat_cols:
        val_counts = df[col].value_counts()
        top_val = val_counts.index[0] if len(val_counts) > 0 else "N/A"
        top_count = int(val_counts.iloc[0]) if len(val_counts) > 0 else 0

        # Distribution (top 10)
        dist = {}
        for v, c in val_counts.head(10).items():
            dist[str(v)] = int(c)

        categorical_stats[col] = {
            "unique_count": int(df[col].nunique()),
            "most_common": str(top_val),
            "most_common_count": top_count,
            "distribution": dist,
        }

    # Missing values
    missing = {}
    for col in df.columns:
        miss_count = int(df[col].isnull().sum())
        if miss_count > 0:
            missing[col] = miss_count

    # Target/class distribution
    class_dist = {}
    severity_map = b.severity_map
    target_counts = df[target_col].value_counts().sort_index()
    for code, count in target_counts.items():
        label = severity_map.get(int(code), str(code))
        class_dist[label] = int(count)

    # Correlation matrix
    corr_df = df.select_dtypes(include=[np.number]).drop(columns=[target_col], errors="ignore")
    correlation_matrix = {}
    if corr_df.shape[1] >= 2:
        corr = corr_df.corr().round(4)
        for col in corr.columns:
            correlation_matrix[col] = {c: float(v) for c, v in corr[col].items()}

    return {
        "dataset_name": b.name,
        "total_records": total_rows,
        "total_features": total_columns,
        "dataset_info": {
            "total_rows": total_rows,
            "total_columns": total_columns,
            "memory_usage": memory_str,
            "columns": all_columns,
            "dtypes": dtypes_dict,
        },
        "numerical_stats": numerical_stats,
        "categorical_stats": categorical_stats,
        "missing_values": missing,
        "class_distribution": class_dist,
        "target_distribution": class_dist,
        "correlation_matrix": correlation_matrix,
    }


@router.get("/summary")
def get_eda_summary():
    # Try to build fresh from bundle first
    b = _state.get("primary_bundle")
    if b is not None:
        try:
            summary = _build_full_eda(b)
            return JSONResponse(content=summary)
        except Exception:
            pass

    # Fallback to cached summary
    summary = _state.get("eda_summary")
    if summary:
        return JSONResponse(content=summary)

    if EDA_SUMMARY_PATH.exists():
        with open(EDA_SUMMARY_PATH) as f:
            return JSONResponse(content=json.load(f))

    raise HTTPException(status_code=503, detail="EDA summary not computed yet")


@router.get("/charts/{chart_name}")
def get_chart_data(chart_name: str):
    b = _bundle()
    df = b.df.copy()

    handler = _CHART_HANDLERS.get(chart_name)
    if handler is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown chart '{chart_name}'. Valid: {list(_CHART_HANDLERS.keys())}",
        )

    try:
        data = handler(df, b)
        return JSONResponse(content=data)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ── Chart handlers ─────────────────────────────────────────────────────────────

def _class_distribution(df, b):
    counts = df[b.target_col].value_counts().sort_index()
    labels, values, colors = [], [], []
    severity_colors = list(NHAI_SEVERITY_COLORS.values())
    for i, (code, cnt) in enumerate(counts.items()):
        label = b.severity_map.get(int(code), str(code))
        labels.append(label)
        values.append(int(cnt))
        colors.append(severity_colors[i % len(severity_colors)])
    return {
        "chart_type": "donut",
        "title": "Accident Severity Distribution",
        "labels": labels,
        "values": values,
        "colors": colors,
    }


def _accidents_by_hour(df, b):
    if b.time_col is None or b.time_col not in df.columns:
        return {"chart_type": "area", "title": "Accidents by Hour", "labels": [], "values": []}

    from ml.data_loader import _parse_hour
    hours = df[b.time_col].apply(_parse_hour)
    hour_counts = hours.value_counts().sort_index()
    all_hours = list(range(24))
    counts = [int(hour_counts.get(h, 0)) for h in all_hours]
    return {
        "chart_type": "area",
        "title": "Accidents by Hour of Day",
        "labels": [str(h) for h in all_hours],
        "values": counts,
    }


def _accidents_by_day(df, b):
    if b.day_col is None or b.day_col not in df.columns:
        return {"chart_type": "bar", "title": "Accidents by Day", "labels": [], "values": []}
    day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    counts = df[b.day_col].value_counts()
    labels = [d for d in day_order if d in counts.index]
    if not labels:
        labels = counts.index.tolist()
    values = [int(counts.get(d, 0)) for d in labels]
    return {
        "chart_type": "bar",
        "title": "Accidents by Day of Week",
        "labels": labels,
        "values": values,
    }


def _accidents_by_weather(df, b):
    if b.weather_col is None or b.weather_col not in df.columns:
        return {"chart_type": "bar", "title": "Accidents by Weather", "labels": [], "datasets": []}

    weather_col = b.weather_col
    target_col = b.target_col
    severity_map = b.severity_map

    top_weather = df[weather_col].value_counts().head(8).index.tolist()
    filtered = df[df[weather_col].isin(top_weather)]
    pivot = (
        filtered.groupby([weather_col, target_col])
        .size()
        .unstack(fill_value=0)
    )

    severity_colors = list(NHAI_SEVERITY_COLORS.values())
    datasets = []
    for i, code in enumerate(pivot.columns):
        label = severity_map.get(int(code), str(code))
        datasets.append({
            "label": label,
            "data": [int(pivot.loc[w, code]) if w in pivot.index else 0 for w in top_weather],
            "color": severity_colors[i % len(severity_colors)],
        })

    return {
        "chart_type": "grouped_bar",
        "title": "Weather Conditions vs Accident Severity",
        "labels": top_weather,
        "datasets": datasets,
    }


def _accidents_by_vehicle(df, b):
    if b.vehicle_col is None or b.vehicle_col not in df.columns:
        return {"chart_type": "pie", "title": "Accidents by Vehicle Type", "labels": [], "values": []}
    counts = df[b.vehicle_col].value_counts().head(10)
    return {
        "chart_type": "pie",
        "title": "Accidents by Vehicle Type (Top 10)",
        "labels": counts.index.tolist(),
        "values": counts.values.tolist(),
    }


def _severity_by_cause(df, b):
    if b.cause_col is None or b.cause_col not in df.columns:
        return {"chart_type": "stacked_bar", "title": "Top 10 Causes", "labels": [], "datasets": []}

    cause_col = b.cause_col
    target_col = b.target_col
    severity_map = b.severity_map

    top_causes = df[cause_col].value_counts().head(10).index.tolist()
    filtered = df[df[cause_col].isin(top_causes)]
    pivot = (
        filtered.groupby([cause_col, target_col])
        .size()
        .unstack(fill_value=0)
    )

    totals = pivot.sum(axis=1)
    pivot = pivot.loc[totals.sort_values(ascending=False).index]
    labels = pivot.index.tolist()

    severity_colors = list(NHAI_SEVERITY_COLORS.values())
    datasets = []
    for i, code in enumerate(pivot.columns):
        label = severity_map.get(int(code), str(code))
        datasets.append({
            "label": label,
            "data": [int(pivot.loc[c, code]) if c in pivot.index else 0 for c in labels],
            "color": severity_colors[i % len(severity_colors)],
        })

    return {
        "chart_type": "stacked_bar",
        "title": "Top 10 Accident Causes by Severity",
        "labels": labels,
        "datasets": datasets,
    }


def _monthly_trend(df, b):
    if b.date_col is None or b.date_col not in df.columns:
        return {"chart_type": "line", "title": "Monthly Trend", "labels": [], "datasets": []}

    dates = pd.to_datetime(df[b.date_col], errors="coerce")
    df = df.copy()
    df["_YearMonth"] = dates.dt.to_period("M").astype(str)
    df = df.dropna(subset=["_YearMonth"])

    severity_map = b.severity_map
    target_col = b.target_col

    pivot = (
        df.groupby(["_YearMonth", target_col])
        .size()
        .unstack(fill_value=0)
        .sort_index()
    )

    labels = pivot.index.tolist()
    if len(labels) > 60:
        pivot = pivot.iloc[-60:]
        labels = pivot.index.tolist()

    severity_colors = list(NHAI_SEVERITY_COLORS.values())
    datasets = []
    for i, code in enumerate(pivot.columns):
        label = severity_map.get(int(code), str(code))
        datasets.append({
            "label": label,
            "data": [int(v) for v in pivot[code]],
            "color": severity_colors[i % len(severity_colors)],
        })

    return {
        "chart_type": "line",
        "title": "Monthly Accident Trend by Severity",
        "labels": labels,
        "datasets": datasets,
    }


def _correlation_matrix(df, b):
    numeric_df = df.select_dtypes(include=[np.number]).drop(
        columns=[b.target_col], errors="ignore"
    )
    if numeric_df.empty or numeric_df.shape[1] < 2:
        return {"chart_type": "heatmap", "title": "Correlation Matrix", "labels": [], "matrix": []}

    numeric_df = numeric_df.iloc[:, :20]
    corr = numeric_df.corr().round(3)
    return {
        "chart_type": "heatmap",
        "title": "Feature Correlation Matrix",
        "labels": corr.columns.tolist(),
        "matrix": corr.values.tolist(),
    }


_CHART_HANDLERS = {
    "class_distribution": _class_distribution,
    "accidents_by_hour": _accidents_by_hour,
    "accidents_by_day": _accidents_by_day,
    "accidents_by_weather": _accidents_by_weather,
    "accidents_by_vehicle": _accidents_by_vehicle,
    "severity_by_cause": _severity_by_cause,
    "monthly_trend": _monthly_trend,
    "correlation_matrix": _correlation_matrix,
}