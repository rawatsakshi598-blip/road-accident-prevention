# API Quick Reference Guide

## Endpoints at a Glance

### Health & Info
```
GET  /api/health
GET  /api/datasets/info
```

### EDA Charts
```
GET  /api/eda/summary
GET  /api/eda/charts/{chart_name}
```
Available charts: `class_distribution`, `accidents_by_hour`, `accidents_by_day`, `accidents_by_weather`, `accidents_by_vehicle`, `severity_by_cause`, `monthly_trend`, `correlation_matrix`

### Model Comparison
```
GET  /api/models/comparison
GET  /api/models/{model_name}/confusion-matrix
GET  /api/models/{model_name}/roc-data
```
Model names: `RF`, `XGB`, `GBM`, `LGBM`, `LR`, `SVM`, `KNN`

### SHAP Explainability
```
GET  /api/shap/feature-importance
GET  /api/shap/summary-plot
GET  /api/shap/bar-plot
```

### Prediction
```
POST /api/predict
POST /api/predict/batch
GET  /api/filters/options
```

---

## Example Requests

### Single Prediction
```bash
curl -X POST "http://localhost:8000/api/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "Day_of_Week": "Monday",
    "Time_of_Accident": "18:30",
    "Weather_Conditions": "Rainy",
    "Road_Condition": "Dry",
    "Vehicle_Type_V1": "Car",
    "Number_of_Vehicles": 2
  }'
```

### Batch Prediction
```bash
curl -X POST "http://localhost:8000/api/predict/batch" \
  -F "file=@accidents.csv" \
  -F "model_name=XGB"
```

### Get Best Model Info
```bash
curl "http://localhost:8000/api/models/comparison"
```

### Get SHAP Features
```bash
curl "http://localhost:8000/api/shap/feature-importance"
```

---

## Model Performance Summary

| Rank | Model | F1-Weighted | Accuracy |
|------|-------|-------------|----------|
| 1 | GBM | 86.41% | 86.45% |
| 2 | XGB | 85.70% | 85.71% |
| 3 | KNN | 86.09% | 85.96% |
| 4 | LGBM | 81.19% | 81.22% |
| 5 | RF | 81.90% | 81.96% |
| 6 | SVM | 44.51% | 43.84% |
| 7 | LR | 33.83% | 33.37% |

---

## Server URLs

- **Main**: http://localhost:8000
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
