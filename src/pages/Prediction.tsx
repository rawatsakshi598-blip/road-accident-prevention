// src/pages/Prediction.tsx
import { useState } from 'react'
import { usePredictionFilters, usePrediction } from '../hooks/useApi'
import { Card, Button, Select, Badge, Loading } from '../components/ui'
import { ProgressBar } from '../components/charts'
import { Brain, Send, RotateCcw, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { cn, formatPercent } from '../utils/helpers'

const SEVERITY_COLORS: Record<string, string> = {
  'Fatal': '#ef4444', 'Grievous Injury': '#f97316',
  'Minor Injury': '#3b82f6', 'No Injury': '#22c55e'
}

const MODEL_OPTIONS = [
  { value: 'GBM', label: 'Gradient Boosting', description: 'Best accuracy (86.4%)' },
  { value: 'XGB', label: 'XGBoost', description: 'Fast and efficient' },
  { value: 'RF', label: 'Random Forest', description: 'Good for feature analysis' },
  { value: 'LGBM', label: 'LightGBM', description: 'Handles large data' },
  { value: 'KNN', label: 'K-Nearest Neighbors', description: 'Instance-based' },
  { value: 'LR', label: 'Logistic Regression', description: 'Simple baseline' },
  { value: 'SVM', label: 'Support Vector Machine', description: 'Complex boundaries' },
]

const DEFAULT_FORM = {
  Day_of_Week: 1, Time_of_Accident: '12:00', Accident_Location_A: 1,
  Accident_Location_A_Chainage_km: 150.0, Accident_Location_A_Chainage_km_RoadSide: 1,
  Causes_D: 1, Road_Feature_E: 1, Road_Condition_F: 1, Weather_Conditions_H: 1,
  Vehicle_Type_Involved_J_V1: 1, Vehicle_Type_Involved_J_V2: 0, model_name: 'GBM',
}

const DAY_NAMES: Record<number, string> = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday' }
const CAUSE_NAMES: Record<number, string> = { 1: 'Driver Fault', 2: 'Vehicle Defect', 3: 'Road Defect', 4: 'Weather', 5: 'Pedestrian Fault', 6: 'Obstruction', 7: 'Other', 8: 'Unknown' }
const WEATHER_NAMES: Record<number, string> = { 1: 'Clear', 2: 'Cloudy', 3: 'Rainy', 4: 'Foggy', 5: 'Hail', 6: 'Snow', 7: 'Dust Storm', 8: 'Strong Wind', 9: 'Very Hot', 10: 'Very Cold', 11: 'Humid', 12: 'Other' }
const ROAD_CONDITION_NAMES: Record<number, string> = { 1: 'Dry', 2: 'Wet', 3: 'Muddy', 4: 'Snow/Ice', 5: 'Oily', 6: 'Under Construction', 7: 'Damaged', 8: 'Other' }
const ROAD_FEATURE_NAMES: Record<number, string> = { 1: 'Straight Road', 2: 'Curved Road', 3: 'Bridge', 4: 'Intersection' }
const LOCATION_NAMES: Record<number, string> = { 1: 'Location Type 1', 2: 'Location Type 2' }
const ROADSIDE_NAMES: Record<number, string> = { 1: 'Left Side', 2: 'Right Side' }

function getSeverityIcon(severity: string) {
  return (severity === 'Fatal' || severity === 'Grievous Injury')
    ? <AlertTriangle className="w-8 h-8" />
    : <CheckCircle className="w-8 h-8" />
}

function getSeverityBg(severity: string): string {
  const map: Record<string, string> = {
    'Fatal': 'from-red-500 to-rose-600', 'Grievous Injury': 'from-orange-500 to-red-600',
    'Minor Injury': 'from-blue-500 to-cyan-600', 'No Injury': 'from-green-500 to-emerald-600'
  }
  return map[severity] || 'from-slate-500 to-slate-600'
}

function makeOptions(values: number[], labelMap?: Record<number, string>) {
  return values.map(v => ({
    value: String(v),
    label: labelMap ? (labelMap[v] || String(v)) : String(v)
  }))
}

export function Prediction() {
  const { data: filters, isLoading: filtersLoading } = usePredictionFilters()
  const { mutate: predict, isPending, data: rawResult, reset: resetPrediction } = usePrediction()
  const [formData, setFormData] = useState(DEFAULT_FORM)

  const result = rawResult ? {
    label: rawResult.prediction_label || rawResult.prediction || 'Unknown',
    confidence: rawResult.confidence || 0,
    probabilities: rawResult.probabilities || {},
    model_used: rawResult.model_used || 'Unknown',
    model_accuracy: rawResult.model_accuracy || null,
    dataset: rawResult.dataset || '',
  } : null

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: field !== 'Time_of_Accident' && field !== 'model_name' ? Number(value) : value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    predict({
      Day_of_Week: formData.Day_of_Week,
      Time_of_Accident: formData.Time_of_Accident,
      Accident_Location_A: formData.Accident_Location_A,
      Accident_Location_A_Chainage_km: formData.Accident_Location_A_Chainage_km,
      Accident_Location_A_Chainage_km_RoadSide: formData.Accident_Location_A_Chainage_km_RoadSide,
      Causes_D: formData.Causes_D,
      Road_Feature_E: formData.Road_Feature_E,
      Road_Condition_F: formData.Road_Condition_F,
      Weather_Conditions_H: formData.Weather_Conditions_H,
      Vehicle_Type_Involved_J_V1: formData.Vehicle_Type_Involved_J_V1,
      Vehicle_Type_Involved_J_V2: formData.Vehicle_Type_Involved_J_V2 || null,
      model_name: formData.model_name,
    })
  }

  const handleReset = () => {
    setFormData(DEFAULT_FORM)
    resetPrediction()
  }

  if (filtersLoading) {
    return <div className="flex items-center justify-center h-96"><Loading size="lg" text="Loading form..." /></div>
  }

  const dayOpts = makeOptions(filters?.Day_of_Week || [1,2,3,4,5,6,7], DAY_NAMES)
  const locOpts = makeOptions(filters?.Accident_Location_A || [1,2], LOCATION_NAMES)
  const sideOpts = makeOptions(filters?.Accident_Location_A_Chainage_km_RoadSide || [1,2], ROADSIDE_NAMES)
  const causeOpts = makeOptions(filters?.Causes_D || [1,2,3,4,5,6,7,8], CAUSE_NAMES)
  const featOpts = makeOptions(filters?.Road_Feature_E || [1,2,3,4], ROAD_FEATURE_NAMES)
  const condOpts = makeOptions(filters?.Road_Condition_F || [1,2,3,4,5,6,7,8], ROAD_CONDITION_NAMES)
  const weathOpts = makeOptions(filters?.Weather_Conditions_H || [1,2,3,4,5,6,7,8,9,10,11,12], WEATHER_NAMES)
  const vehOpts = makeOptions(filters?.Vehicle_Type_Involved_J_V1 || [1,2,3,4,5,6,7,8,9,10,11,12,13,14])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Accident Severity Prediction</h1>
        <p className="text-slate-500 mt-1">Predict accident severity using machine learning models</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><Brain className="w-5 h-5" /></div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Prediction Parameters</h2>
                  <p className="text-sm text-slate-500">Enter accident details</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset} leftIcon={<RotateCcw className="w-4 h-4" />}>Reset</Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <Select
                  label="Select ML Model"
                  options={MODEL_OPTIONS.map(m => ({ value: m.value, label: `${m.label} — ${m.description}` }))}
                  value={formData.model_name}
                  onChange={(v) => handleChange('model_name', v)}
                />
                {result && (
                  <p className="mt-2 text-xs text-indigo-600">
                    Using: {result.model_used}
                    {result.model_accuracy ? ` (Accuracy: ${formatPercent(result.model_accuracy)})` : ''}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Select label="Day of Week" options={dayOpts} value={String(formData.Day_of_Week)} onChange={(v) => handleChange('Day_of_Week', v)} />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Time of Accident</label>
                  <input type="time" value={formData.Time_of_Accident} onChange={(e) => handleChange('Time_of_Accident', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <Select label="Accident Location" options={locOpts} value={String(formData.Accident_Location_A)} onChange={(v) => handleChange('Accident_Location_A', v)} />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Chainage (km)</label>
                  <input type="number" value={formData.Accident_Location_A_Chainage_km} onChange={(e) => handleChange('Accident_Location_A_Chainage_km', parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" min={0} max={1000} step={0.1} />
                </div>
                <Select label="Road Side" options={sideOpts} value={String(formData.Accident_Location_A_Chainage_km_RoadSide)} onChange={(v) => handleChange('Accident_Location_A_Chainage_km_RoadSide', v)} />
                <Select label="Cause of Accident" options={causeOpts} value={String(formData.Causes_D)} onChange={(v) => handleChange('Causes_D', v)} />
                <Select label="Road Feature" options={featOpts} value={String(formData.Road_Feature_E)} onChange={(v) => handleChange('Road_Feature_E', v)} />
                <Select label="Road Condition" options={condOpts} value={String(formData.Road_Condition_F)} onChange={(v) => handleChange('Road_Condition_F', v)} />
                <Select label="Weather Conditions" options={weathOpts} value={String(formData.Weather_Conditions_H)} onChange={(v) => handleChange('Weather_Conditions_H', v)} />
                <Select label="Primary Vehicle Type" options={vehOpts} value={String(formData.Vehicle_Type_Involved_J_V1)} onChange={(v) => handleChange('Vehicle_Type_Involved_J_V1', v)} />
                <Select label="Secondary Vehicle" options={[{ value: '0', label: 'None' }, ...vehOpts]} value={String(formData.Vehicle_Type_Involved_J_V2)} onChange={(v) => handleChange('Vehicle_Type_Involved_J_V2', v)} />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <Button type="submit" variant="primary" size="lg" isLoading={isPending} leftIcon={<Send className="w-5 h-5" />} className="flex-1">Predict Severity</Button>
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          {result && (
            <Card padding="none" className="overflow-hidden">
              <div className={cn('p-6 text-white bg-gradient-to-br', getSeverityBg(result.label))}>
                <div className="flex items-center gap-4">
                  {getSeverityIcon(result.label)}
                  <div>
                    <p className="text-sm opacity-90">Predicted Severity</p>
                    <h3 className="text-2xl font-bold">{result.label}</h3>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Confidence</span>
                  <span className="font-bold text-slate-900">{formatPercent(result.confidence)}</span>
                </div>
                <ProgressBar value={result.confidence * 100} color={result.confidence > 0.7 ? 'success' : result.confidence > 0.4 ? 'warning' : 'danger'} />
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="text-slate-500">Model</span>
                  <Badge variant="primary">{result.model_used}</Badge>
                </div>
                {result.model_accuracy != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Model Accuracy</span>
                    <span className="font-semibold text-slate-900">{formatPercent(result.model_accuracy)}</span>
                  </div>
                )}
                {result.dataset && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Dataset</span>
                    <span className="text-sm text-slate-700">{result.dataset}</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {result && result.probabilities && Object.keys(result.probabilities).length > 0 && (
            <Card>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Probability Distribution</h3>
                <p className="text-sm text-slate-500">Confidence for each class</p>
              </div>
              <div className="space-y-4">
                {Object.entries(result.probabilities)
                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                  .map(([label, prob]) => (
                    <div key={label}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-slate-700">{label}</span>
                        <span className="text-sm font-semibold text-slate-900">{formatPercent(prob as number)}</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(prob as number) * 100}%`, backgroundColor: SEVERITY_COLORS[label] || '#6366f1' }} />
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}

          {!result && (
            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100">
              <div className="flex gap-4">
                <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600 h-fit"><Info className="w-6 h-6" /></div>
                <div>
                  <h3 className="font-semibold text-indigo-900">How to Use</h3>
                  <ul className="mt-2 space-y-1 text-sm text-indigo-700">
                    <li>1. Select an ML model (GBM recommended)</li>
                    <li>2. Fill in accident parameters</li>
                    <li>3. Click Predict Severity</li>
                    <li>4. Compare results across models</li>
                  </ul>
                  <div className="mt-3 p-2 bg-indigo-100 rounded-lg">
                    <p className="text-xs text-indigo-800 font-medium">Tip: Try different models to compare predictions!</p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default Prediction