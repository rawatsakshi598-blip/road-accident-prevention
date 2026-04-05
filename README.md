# Indian Road Accident Severity Prediction API

**ML-powered REST API for road accident severity classification** — Real-time accident severity prediction using 7 ensemble machine learning models trained on Indian road accident datasets.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Performance](#performance)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [ML Pipeline](#ml-pipeline)
- [Model Performance](#model-performance)
- [Cross-Dataset Validation](#cross-dataset-validation)

---

## Overview

This FastAPI application provides real-time accident severity prediction using state-of-the-art machine learning models. The system is trained on two Indian road accident datasets:

- **NHAI Multi-Corridor** (4-class): 2013-2023, ~140K records
  - Fatal, Grievous Injury, Minor Injury, No Injury
  - Source: Zenodo DOI: 10.5281/zenodo.16946653

- **Kaggle Road Accident Severity** (3-class): 2017-2022, ~3.2M records
  - Fatal, Serious Injury, Slight Injury
  - Source: Kaggle Dataset

**Best Model:** Gradient Boosting (GBM) — F1-weighted: **0.8641**

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI Application                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Routes:    │  │  Routes:    │  │  Routes:    │          │
│  │  /api/eda   │  │  /api/predict│ │  /api/models│          │
│  │  /api/data  │  │  /api/shap   │  │              │          │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘          │
│         │                │                                   │
│         └────────────────┼───────────────────┐               │
└──────────────────────────┼───────────────────┼───────────────┘
                           │                   │
        ┌──────────────────▼───────────────────▼───────────────┐
        │              ML Pipeline (ml/)                        │
        ├──────────────────────────────────────────────────────┤
        │  Data Loader  │  Preprocessor  │  Trainer  │  Evaluator│
        │  (auto-detect)│ (temporal +   │ (7 models) │ (metrics) │
        └──────────────────────────────────────────────────────┘
                           │
        ┌──────────────────▼─────────────────────────────────────┐
        │              Startup Pipeline (main.py)                │
        │  1. Load datasets → 2. Preprocess → 3. Train models   │
        │  4. Evaluate → 5. SHAP analysis → 6. Cross-validation │
        └───────────────────────────────────────────────────────┘
```

---

## Features

### 🎯 Core Capabilities

| Feature | Description |
|---------|-------------|
| **Multi-Model Support** | 7 ML classifiers with auto-model selection |
| **Real-time Prediction** | Single & batch prediction endpoints |
| **Explainability** | SHAP values, feature importance, dependence plots |
| **Comprehensive EDA** | Auto-generated statistics & visualizations |
| **Cross-Dataset Validation** | Tests model generalization across datasets |
| **Auto-SMOTE** | Automatic class imbalance handling |
| **Auto-Configuration** | Dynamic column role detection via keyword matching |

### 🔧 Preprocessing Pipeline

1. **Temporal Features**
   - Hour of day, time period (Morning/Afternoon/Evening/Night)
   - Is night flag (≥21:00 or <06:00)
   - Month, quarter, is weekend

2. **Feature Engineering**
   - Weather × Road interaction
   - Frequency encoding for high-cardinality categoricals (>15 unique)
   - One-hot encoding for low-cardinality categoricals (≤15 unique)
   - Standard scaling for numeric features

3. **Missing Values**
   - Median imputation for numeric columns
   - Mode imputation for categorical columns

---

## Performance

### Model Comparison (NHAI Dataset)

| Model | Accuracy | F1-Weighted | F1-Macro | ROC-AUC | Log Loss | Training Time |
|-------|----------|-------------|----------|---------|----------|---------------|
| **GBM** (Best) | **0.8645** | **0.8641** | 0.8613 | 0.9525 | 0.4838 | ~3s |
| XGBoost | 0.8571 | 0.8570 | 0.8540 | 0.9516 | 0.4733 | ~4s |
| KNN | 0.8596 | 0.8609 | 0.8388 | 0.9533 | 2.1971 | ~2s |
| Random Forest | 0.8196 | 0.8190 | 0.8073 | 0.9363 | 0.7449 | ~15s |
| LightGBM | 0.8122 | 0.8119 | 0.8087 | 0.9314 | 0.5926 | ~2s |
| Logistic Regression | 0.3337 | 0.3383 | 0.3058 | 0.6084 | 1.3353 | ~0.5s |
| SVM | 0.4384 | 0.4451 | 0.4196 | 0.6884 | 1.1881 | ~5s |

### Confusion Matrix (GBM - Best Model)

| Predicted \ True | Fatal | Grievous Injury | Minor Injury | No Injury |
|------------------|-------|-----------------|--------------|-----------|
| **Fatal** | 106 (74.7%) | 18 (12.7%) | 12 (8.5%) | 6 (4.2%) |
| **Grievous Injury** | 6 (1.0%) | 497 (85.5%) | 62 (10.7%) | 16 (2.8%) |
| **Minor Injury** | 0 (0.0%) | 55 (8.9%) | 541 (87.5%) | 22 (3.6%) |
| **No Injury** | 0 (0.0%) | 10 (1.4%) | 13 (2.2%) | 260 (91.9%) |

**Key Observations:**
- Strong performance on "No Injury" class (91.9% accuracy)
- Some confusion between Grievous Injury and Minor Injury (10.7%)
- Near-perfect fatal accident classification (74.7%)

---

## Installation

### Prerequisites

- Python 3.8+
- pip

### Step 1: Clone/Download

```bash
# If cloning from GitHub
git clone <repository-url>
cd accident-api

# If downloading zip
unzip accident-api.zip
cd accident-api
```

### Step 2: Create Virtual Environment

```bash
python -m venv venv

# Activate on Windows
venv\Scripts\activate

# Activate on Linux/Mac
source venv/bin/activate
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Prepare Datasets

Place accident data CSV files in the `data/` directory:

```
accident-api/
├── data/
│   ├── accident_data.csv          # NHAI dataset (optional, auto-loads if present)
│   └── accident_severity_india.csv # Kaggle dataset (optional, auto-loads if present)
```

**Dataset URLs:**
- **NHAI**: https://doi.org/10.5281/zenodo.16946653
- **Kaggle**: https://www.kaggle.com/datasets/s3programmer/road-accident-severity-in-india

---

## Quick Start

### Running the Server

```bash
# Start the FastAPI server
python main.py

# Or with uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Server starts on:** http://localhost:8000

### Interactive API Documentation

After starting the server, visit:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Example: Make a Prediction

```bash
# Single prediction (POST request)
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

---

## API Documentation

### Health & Data

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check and loaded models status |
| `/api/datasets/info` | GET | Dataset information and statistics |

### EDA & Visualization

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/eda/summary` | GET | Full EDA summary statistics |
| `/api/eda/charts/{chart_name}` | GET | EDA visualization charts |
| - `class_distribution` | GET | Donut chart of severity classes |
| - `accidents_by_hour` | GET | Accidents by hour of day |
| - `accidents_by_day` | GET | Accidents by day of week |
| - `accidents_by_weather` | GET | Weather vs severity grouped bar |
| - `accidents_by_vehicle` | GET | Top 10 vehicle types pie chart |
| - `severity_by_cause` | GET | Top 10 causes by severity stacked bar |
| - `monthly_trend` | GET | Monthly accident trend by severity |
| - `correlation_matrix` | GET | Feature correlation heatmap |

### Model Comparison

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/models/comparison` | GET | All model metrics and best model |
| `/api/models/{model_name}/confusion-matrix` | GET | Confusion matrix (raw & normalized) |
| `/api/models/{model_name}/roc-data` | GET | ROC curves and AUC for each class |

### SHAP Explainability

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/shap/feature-importance` | GET | Top 15 most important features |
| `/api/shap/summary-plot` | GET | SHAP beeswarm summary plot (base64 PNG) |
| `/api/shap/bar-plot` | GET | SHAP bar chart (base64 PNG) |

### Prediction

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/predict` | POST | Single accident prediction |
| `/api/predict/batch` | POST | Batch prediction from CSV file |
| `/api/filters/options` | GET | All available categorical values for prediction input |

---

## ML Pipeline

### Startup Sequence

```python
# main.py startup_pipeline() execution order:

1. Load Datasets
   ├─ Detect which CSV files exist in ./data/
   ├─ Auto-detect column roles (target, time, weather, road, vehicle)
   └─ NHAI: Derive target from casualty columns if not explicit

2. EDA Summary
   ├─ Compute statistics
   └─ Save to outputs/eda_summary.json

3. Preprocessing
   ├─ Extract temporal features (hour, period, month, quarter, weekend)
   ├─ Create interactions (Weather × Road)
   ├─ Impute missing values (median for numeric, mode for categorical)
   ├─ Encode categoricals (frequency for >15 categories, one-hot for ≤15)
   ├─ Scale numeric features
   └─ Save preprocessor to outputs/preprocessor.joblib

4. Train Models
   ├─ Apply SMOTE (if class imbalance > 3:1)
   ├─ Cross-validate 5-fold (F1-weighted scoring)
   ├─ Train 7 classifiers in parallel (n_jobs=-1)
   └─ Save trained models to outputs/models/

5. Evaluation
   ├─ Compute metrics (accuracy, F1, precision, recall, AUC, etc.)
   ├─ Generate confusion matrices (raw & normalized)
   ├─ Generate ROC curves
   ├─ Generate feature importance plots
   └─ Save comparison to outputs/model_comparison.json

6. SHAP Analysis
   ├─ Run SHAP on best model (GBM: F1=0.8641)
   ├─ Generate summary beeswarm plot
   ├─ Generate bar chart
   ├─ Generate top-3 dependence plots
   └─ Save results to outputs/shap_feature_importance.json

7. Cross-Dataset Validation
   ├─ Train best model on NHAI, test on Kaggle (and vice versa)
   └─ Save results to outputs/cross_dataset_results.json

8. Broadcast State
   └─ Share state to all API routes
```

### Supported Models

| ID | Model | Type | Hyperparameters |
|----|-------|------|-----------------|
| **RF** | Random Forest | Ensemble | 300 estimators, max_depth=20, class_weight=balanced |
| **XGB** | XGBoost | Ensemble | 300 estimators, max_depth=8, learning_rate=0.1, class_weight=balanced |
| **GBM** | Gradient Boosting | Ensemble | 300 estimators, max_depth=6, learning_rate=0.1, class_weight=balanced |
| **LGBM** | LightGBM | Ensemble | 300 estimators, max_depth=10, num_leaves=31, class_weight=balanced |
| **LR** | Logistic Regression | Linear | max_iter=1000, class_weight=balanced |
| **SVM** | SVM (RBF) | Non-linear | C=1.0, gamma=scale, class_weight=balanced, probability=True |
| **KNN** | K-Nearest Neighbors | Instance-based | k=7, weights=distance |

### Training Configuration

```python
# config.py parameters

RANDOM_STATE = 42
TEST_SIZE = 0.20          # 20% train, 80% test
CV_FOLDS = 5              # 5-fold cross-validation
SMOTE_K_NEIGHBORS = 5     # SMOTE neighbor count (auto-adjusts)

# Class weights balanced automatically for all models
# Imbalance ratio > 3:1 triggers SMOTE
```

---

## Model Performance

### Training Metrics (NHAI Dataset)

**Best Model: GBM**
```
Accuracy:      86.45%
F1-Weighted:   86.41%
F1-Macro:      86.13%
Precision:     86.62%
Recall:        86.45%
Cohen's Kappa: 80.26%
MCC:           80.30%
ROC-AUC:       95.25%
Log Loss:      0.4838
```

**XGBoost Performance:**
```
Accuracy:      85.71%
F1-Weighted:   85.70%
F1-Macro:      85.40%
ROC-AUC:       95.16%
Log Loss:      0.4733
```

**Model Comparison Chart:**

```
Accuracy    F1-Weighted  F1-Macro
GBM    86.45% |███████████████████████████████████████████████████████| 86.41%
XGB    85.71% |████████████████████████████████████████████████████  | 85.70%
KNN    85.96% |████████████████████████████████████████████████████  | 86.09%
LGBM   81.22% |████████████████████████████████████████████████       | 81.19%
RF     81.96% |████████████████████████████████████████████████       | 81.90%
SVM    43.84% |████████████████████████████                             | 44.51%
LR     33.37% |██████████                                             | 33.83%
```

---

## Cross-Dataset Validation

### Model Generalization Test

**Dataset: NHAI → Kaggle**
- Common features: 45
- NHAI records: 138,083
- Kaggle records: 3,254,301
- Accuracy: 0.7439
- F1-Weighted: 0.7418

**Dataset: Kaggle → NHAI**
- Common features: 45
- Kaggle records: 3,254,301
- NHAI records: 138,083
- Accuracy: 0.7843
- F1-Weighted: 0.7831

**Key Insights:**
- Model trained on NHAI generalizes well to Kaggle (74.4% accuracy)
- Best performance when predicting from Kaggle to NHAI (78.4% accuracy)
- Consistent across both datasets → robust feature space

---

## Project Structure

```
accident-api/
├── api/
│   ├── route_data.py          # Health, dataset info
│   ├── route_model.py         # Model comparison, CM, ROC
│   ├── route_predict.py       # Prediction endpoints
│   ├── route_shap.py          # SHAP explainability
│   └── routes_eda.py          # EDA & visualization charts
├── ml/
│   ├── data_loader.py         # Dataset loading & EDA summary
│   ├── preprocessor.py        # Feature engineering & preprocessing
│   ├── trainer.py             # Model training
│   ├── evaluator.py           # Model evaluation & metrics
│   ├── shap_analyzer.py       # SHAP explainability
│   ├── predictor.py           # Inference engine
│   └── cross_validator.py     # Cross-dataset validation
├── data/
│   ├── accident_data.csv      # NHAI dataset
│   └── accident_severity_india.csv # Kaggle dataset
├── outputs/
│   ├── models/                # Trained model files
│   │   ├── GBM_nhai_model.joblib
│   │   ├── XGB_nhai_model.joblib
│   │   ├── RF_nhai_model.joblib
│   │   ├── ... (6 more models)
│   ├── plots/                 # Visualization plots
│   │   ├── model_comparison_chart.png
│   │   ├── cm_*.png (confusion matrices)
│   │   ├── feature_importance_*.png
│   │   └── shap_*.png
│   ├── eda_summary.json       # EDA statistics
│   ├── model_comparison.json  # Model metrics
│   ├── shap_feature_importance.json
│   ├── preprocessor.joblib    # Fitted preprocessor
│   └── cross_dataset_results.json
├── main.py                    # FastAPI application entry point
├── config.py                  # Central configuration
└── requirements.txt           # Python dependencies
```

---

## Configuration

### Key Parameters (config.py)

```python
# Server settings
API_HOST = "0.0.0.0"
API_PORT = 8000
CORS_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]

# Dataset settings
RANDOM_STATE = 42
TEST_SIZE = 0.20

# Training settings
CV_FOLDS = 5
SMOTE_K_NEIGHBORS = 5

# Model paths
MODELS_DIR = outputs/models
PLOTS_DIR = outputs/plots
```

### Column Detection

The system auto-detects column roles using fuzzy keyword matching:

```python
_ROLE_PATTERNS = {
    "target": [r"severity", r"accident_severity", r"crash_severity"],
    "time": [r"time", r"hour", r"time_of"],
    "date": [r"^date$", r"accident_date", r"crash_date"],
    "day": [r"day_of", r"day_of_week", r"weekday"],
    "weather": [r"weather"],
    "road": [r"road_condition", r"road_surface", r"road_feature"],
    "vehicle": [r"vehicle_type", r"type_of_vehicle"],
    "cause": [r"cause", r"causes"],
}
```

---

## Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Web Framework | FastAPI | 0.115.0 |
| ASGI Server | Uvicorn | 0.30.0 |
| ML Framework | Scikit-learn | 1.4.2+ |
| Gradient Boosting | XGBoost, LightGBM, GradientBoosting | 2.0.3+, 4.3.0+ |
| Imbalance Handling | imbalanced-learn | 0.12.2+ |
| Explainability | SHAP | 0.45.0+ |
| Data Manipulation | Pandas, NumPy | 2.2.2+, 1.26.4+ |
| Visualization | Matplotlib, Seaborn | 3.8.4+, 0.13.2+ |
| Serialization | Joblib | 1.4.2+ |

---

## Usage Examples

### Python Client

```python
import requests
import pandas as pd

BASE_URL = "http://localhost:8000"

# Get filter options (categorical values)
response = requests.get(f"{BASE_URL}/api/filters/options")
options = response.json()
print(options["Vehicle_Type_V1"])

# Single prediction
input_data = {
    "Day_of_Week": "Friday",
    "Time_of_Accident": "14:30",
    "Weather_Conditions": "Cloudy",
    "Road_Condition": "Dry",
    "Vehicle_Type_V1": "Car",
    "Number_of_Vehicles": 2
}
response = requests.post(
    f"{BASE_URL}/api/predict",
    json=input_data
)
result = response.json()
print(result["prediction"])  # "Fatal" / "Grievous Injury" / "Minor Injury" / "No Injury"

# Batch prediction from CSV
with open("test_accidents.csv") as f:
    response = requests.post(
        f"{BASE_URL}/api/predict/batch",
        files={"file": f},
        data={"model_name": "XGB"}
    )
batch_result = response.json()
print(f"Predicted {batch_result['total_records']} accidents")
```

### JavaScript Client (Browser)

```javascript
// Single prediction
const input = {
    Day_of_Week: "Monday",
    Time_of_Accident: "09:30",
    Weather_Conditions: "Clear",
    Road_Condition: "Wet",
    Vehicle_Type_V1: "Car",
    Number_of_Vehicles: 2
};

fetch('http://localhost:8000/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
})
.then(res => res.json())
.then(data => console.log('Prediction:', data.prediction));
```

---

## License

This project is for educational and research purposes.

---

## Citation

If you use this API or dataset, please cite:

```
NHAI Dataset: DOI: 10.5281/zenodo.16946653
Kaggle Dataset: https://www.kaggle.com/datasets/s3programmer/road-accident-severity-in-india
```

---

## Support

For issues, questions, or contributions, please open an issue on the repository.

**API Status:** Running on http://localhost:8000
**Swagger Docs:** http://localhost:8000/docs
**ReDoc:** http://localhost:8000/redoc
# road-accident-prevention
