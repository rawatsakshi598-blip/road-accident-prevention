// API Response Types
export interface HealthResponse {
  status: string
  model_loaded: boolean
  preprocessor_loaded: boolean
  available_models: string[]
  model_details: Record<string, ModelDetail>
}

export interface ModelDetail {
  loaded: boolean
  path: string
}

export interface EDAResponse {
  dataset_info: DatasetInfo
  numerical_stats: Record<string, NumericalStats>
  categorical_stats: Record<string, CategoricalStats>
  missing_values: Record<string, number>
  correlation_matrix: Record<string, Record<string, number>>
  target_distribution: Record<string, number>
}

export interface DatasetInfo {
  total_rows: number
  total_columns: number
  memory_usage: string
  columns: string[]
  dtypes: Record<string, string>
}

export interface NumericalStats {
  count: number
  mean: number
  std: number
  min: number
  "25%": number
  "50%": number
  "75%": number
  max: number
}

export interface CategoricalStats {
  unique_count: number
  most_common: string
  most_common_count: number
  distribution: Record<string, number>
}

export interface ModelComparisonResponse {
  models: Record<string, ModelMetrics>
  best_model: string
  comparison_plot: string
}

export interface ModelMetrics {
  accuracy: number
  precision_weighted: number
  recall_weighted: number
  f1_weighted: number
  confusion_matrix: number[][]
  classification_report: Record<string, ClassReport>
  confusion_matrix_plot: string
  confusion_matrix_normalized_plot: string
  feature_importance_plot?: string
  feature_importance?: Record<string, number>
}

export interface ClassReport {
  precision: number
  recall: number
  "f1-score": number
  support: number
}

export interface SHAPResponse {
  shap_feature_importance: Record<string, number>
  shap_plot: string
  top_features: string[]
  interpretation: string
}

export interface PredictionFiltersResponse {
  road_type: string[]
  weather: string[]
  light_conditions: string[]
  road_surface: string[]
  vehicle_type: string[]
  junction_type: string[]
  time_of_day: string[]
  day_of_week: string[]
  month: string[]
  area_type: string[]
  speed_limit: number[]
  number_of_vehicles: number[]
  number_of_casualties: number[]
  driver_age_group: string[]
  driver_experience: string[]
  road_condition: string[]
  traffic_density: string[]
}

export interface PredictionInput {
  road_type: string
  weather: string
  light_conditions: string
  road_surface: string
  vehicle_type: string
  junction_type: string
  time_of_day: string
  day_of_week: string
  month: string
  area_type: string
  speed_limit: number
  number_of_vehicles: number
  number_of_casualties: number
  driver_age_group: string
  driver_experience: string
  road_condition: string
  traffic_density: string
  model?: string
}

export interface PredictionResponse {
  prediction: string
  prediction_label: string
  confidence: number
  probabilities: Record<string, number>
  model_used: string
  input_features: Record<string, any>
}

// UI Types
export type TabType = 'dashboard' | 'datasets' | 'prediction' | 'eda' | 'models' | 'shap'

export interface NavItem {
  id: TabType
  label: string
  icon: string
}

export const MODEL_OPTIONS = [
  { value: 'GBM', label: 'Gradient Boosting (GBM)', description: 'Best accuracy, recommended' },
  { value: 'RF', label: 'Random Forest', description: 'Good for feature analysis' },
  { value: 'XGB', label: 'XGBoost', description: 'Fast and efficient' },
  { value: 'LGBM', label: 'LightGBM', description: 'Handles large data well' },
  { value: 'LR', label: 'Logistic Regression', description: 'Simple and interpretable' },
  { value: 'KNN', label: 'K-Nearest Neighbors', description: 'Instance-based learning' },
  { value: 'SVM', label: 'Support Vector Machine', description: 'Good for complex boundaries' },
] as const

export const SEVERITY_COLORS: Record<string, string> = {
  'Fatal': '#ef4444',
  'Serious': '#f59e0b', 
  'Slight': '#22c55e',
  'Minor': '#3b82f6',
}

export const SEVERITY_BG_COLORS: Record<string, string> = {
  'Fatal': 'bg-red-500',
  'Serious': 'bg-amber-500',
  'Slight': 'bg-emerald-500', 
  'Minor': 'bg-blue-500',
}