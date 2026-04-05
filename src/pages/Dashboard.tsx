// src/pages/Dashboard.tsx

// src/pages/Dashboard.tsx
import { useHealth, useEDA, useModels } from '../hooks/useApi'
import { Card, CardHeader, Badge, Loading } from '../components/ui'
import { MetricCard, PieChart, BarChart } from '../components/charts'
import {
  Activity,
  Database,
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Server,
  Cpu,
  RefreshCw,
} from 'lucide-react'
import { formatPercent } from '../utils/helpers'

/*
  API RESPONSE SHAPES (for reference):

  /health -> {
    status: "healthy",
    model_loaded: true,
    preprocessor_loaded: true,
    available_models: ["GBM","KNN","LGBM","LR","RF","SVM","XGB"],
    model_details: { GBM: { loaded: true, path: "..." }, ... }
  }

  /api/eda/summary -> {
    dataset_name: "NHAI Multi-Corridor",
    total_records: 8116,
    total_features: 12,
    class_distribution: { "Minor Injury": 3088, "Grievous Injury": 2904, ... },
    missing_values: { "Vehicle...": 123, ... }
  }

  /api/models/compare -> {
    models: { GBM: { accuracy: 0.8645, ... }, RF: { ... }, ... },
    best_model: "GBM",
    comparison_plot: "..."
  }
*/

function extractEDA(eda: any) {
  if (!eda) {
    return {
      datasetName: 'N/A',
      totalRows: 0,
      totalColumns: 0,
      memoryUsage: '—',
      missingTotal: 0,
      targetDistribution: [] as { name: string; value: number }[],
    }
  }

  // Dataset name — API returns "dataset_name"
  var datasetName =
    eda?.dataset_name ??
    eda?.dataset_info?.name ??
    eda?.name ??
    'Unknown Dataset'

  // Total rows — API returns "total_records" (NOT total_rows)
  var totalRows =
    eda?.total_records ??
    eda?.total_rows ??
    eda?.dataset_info?.total_rows ??
    eda?.records ??
    eda?.num_rows ??
    eda?.shape?.[0] ??
    0

  // Total columns — API returns "total_features" (NOT total_columns)
  var totalColumns =
    eda?.total_features ??
    eda?.total_columns ??
    eda?.dataset_info?.total_columns ??
    eda?.features ??
    eda?.num_columns ??
    eda?.shape?.[1] ??
    0

  // Memory usage
  var memoryUsage =
    eda?.memory_usage ??
    eda?.dataset_info?.memory_usage ??
    '—'

  // Missing values — API returns "missing_values" as { col: count }
  var missingObj = eda?.missing_values ?? eda?.missing ?? {}
  var missingTotal = 0
  if (typeof missingObj === 'object' && missingObj !== null) {
    var vals = Object.values(missingObj)
    for (var i = 0; i < vals.length; i++) {
      missingTotal = missingTotal + Number(vals[i] || 0)
    }
  } else if (typeof missingObj === 'number') {
    missingTotal = missingObj
  }

  // Target distribution — API returns "class_distribution" (NOT target_distribution)
  var distObj =
    eda?.class_distribution ??
    eda?.target_distribution ??
    eda?.severity_distribution ??
    {}

  var targetDistribution: { name: string; value: number }[] = []

  if (Array.isArray(distObj)) {
    for (var j = 0; j < distObj.length; j++) {
      var item = distObj[j]
      targetDistribution.push({
        name: String(item.name ?? item.label ?? item.class ?? ''),
        value: Number(item.value ?? item.count ?? 0),
      })
    }
  } else if (typeof distObj === 'object' && distObj !== null) {
    var entries = Object.entries(distObj)
    for (var k = 0; k < entries.length; k++) {
      targetDistribution.push({
        name: entries[k][0],
        value: Number(entries[k][1]),
      })
    }
  }

  return { datasetName, totalRows, totalColumns, memoryUsage, missingTotal, targetDistribution }
}

function extractModels(models: any) {
  if (!models) {
    return {
      bestModelId: 'N/A',
      bestAccuracy: 0,
      modelsDict: {} as Record<string, any>,
      modelBarData: [] as { name: string; value: number }[],
    }
  }

  var bestModelId =
    models?.best_model ??
    models?.best_model_id ??
    'N/A'

  var modelsDict: Record<string, any> = models?.models ?? {}
  var bestAccuracy = modelsDict[bestModelId]?.accuracy ?? 0

  var modelBarData: { name: string; value: number }[] = []
  var modelEntries = Object.entries(modelsDict)
  for (var i = 0; i < modelEntries.length; i++) {
    var name = modelEntries[i][0]
    var metrics = modelEntries[i][1] as any
    modelBarData.push({
      name: name,
      value: metrics?.accuracy ?? metrics?.f1_weighted ?? 0,
    })
  }

  return { bestModelId, bestAccuracy, modelsDict, modelBarData }
}

export function Dashboard() {
  var healthResult = useHealth()
  var health = healthResult.data as any
  var healthLoading = healthResult.isLoading
  var healthError = healthResult.error
  var refetchHealth = healthResult.refetch

  var edaResult = useEDA()
  var eda = edaResult.data as any
  var edaLoading = edaResult.isLoading
  var edaError = edaResult.error
  var refetchEDA = edaResult.refetch

  var modelsResult = useModels()
  var models = modelsResult.data as any
  var modelsLoading = modelsResult.isLoading
  var modelsError = modelsResult.error
  var refetchModels = modelsResult.refetch

  var isLoading = healthLoading || edaLoading || modelsLoading
  var hasError = healthError || edaError || modelsError

  function handleRetry() {
    refetchHealth()
    refetchEDA()
    refetchModels()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loading size="lg" text="Loading dashboard..." />
      </div>
    )
  }

  // Extract data
  var apiOnline = health?.status === 'healthy'
  var edaInfo = extractEDA(eda)
  var modelInfo = extractModels(models)

  // Available models from health endpoint
  var availableModels: string[] = health?.available_models ?? health?.loaded_model_ids ?? []

  // Model loaded status
  var modelLoaded = health?.model_loaded ?? health?.models_loaded ?? false
  var preprocessorLoaded = health?.preprocessor_loaded ?? false

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">
            Overview of accident severity prediction system
          </p>
        </div>
        <button
          onClick={handleRetry}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Error Banner */}
      {hasError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-red-800">Connection Issue</p>
              <p className="text-sm text-red-600 mt-1">
                {healthError || edaError || modelsError}
                {' — Make sure the backend is running on http://localhost:8000'}
              </p>
            </div>
            <button
              onClick={handleRetry}
              className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="API Status"
          value={apiOnline ? 'Online' : 'Offline'}
          subtitle={edaInfo.datasetName}
          icon={<Server className="w-6 h-6" />}
          color={apiOnline ? 'success' : 'danger'}
        />
        <MetricCard
          title="Total Records"
          value={edaInfo.totalRows.toLocaleString()}
          subtitle={edaInfo.totalColumns + ' features'}
          icon={<Database className="w-6 h-6" />}
          color="info"
        />
        <MetricCard
          title="Best Model"
          value={modelInfo.bestModelId}
          subtitle={
            modelInfo.bestAccuracy > 0
              ? formatPercent(modelInfo.bestAccuracy) + ' accuracy'
              : 'Loading...'
          }
          icon={<Brain className="w-6 h-6" />}
          color="primary"
        />
        <MetricCard
          title="Models Loaded"
          value={String(availableModels.length)}
          subtitle="ML algorithms ready"
          icon={<Cpu className="w-6 h-6" />}
          color="warning"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Distribution */}
        <Card>
          <CardHeader
            title="Accident Severity Distribution"
            subtitle="Target variable breakdown"
            icon={<AlertTriangle className="w-5 h-5" />}
          />
          {edaInfo.targetDistribution.length > 0 ? (
            <PieChart
              data={edaInfo.targetDistribution}
              height={280}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              No data available
            </div>
          )}
        </Card>

        {/* Model Performance */}
        <Card>
          <CardHeader
            title="Model Performance Comparison"
            subtitle="Accuracy across all models"
            icon={<TrendingUp className="w-5 h-5" />}
          />
          {modelInfo.modelBarData.length > 0 ? (
            <BarChart
              data={modelInfo.modelBarData}
              height={280}
              color="#6366f1"
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              No model data available
            </div>
          )}
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Available Models */}
        <Card>
          <CardHeader
            title="Available Models"
            subtitle="Loaded ML algorithms"
            icon={<Brain className="w-5 h-5" />}
          />
          <div className="space-y-3">
            {availableModels.length > 0 ? (
              availableModels.map(function (model: string) {
                return (
                  <div
                    key={model}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                  >
                    <span className="font-medium text-slate-700">{model}</span>
                    <Badge variant="success" dot>
                      Ready
                    </Badge>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-6 text-slate-400">
                No models loaded
              </div>
            )}
          </div>
        </Card>

        {/* Dataset Info */}
        <Card>
          <CardHeader
            title="Dataset Information"
            subtitle={edaInfo.datasetName}
            icon={<Database className="w-5 h-5" />}
          />
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500">Dataset</span>
              <span className="font-semibold text-slate-900">
                {edaInfo.datasetName}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500">Total Records</span>
              <span className="font-semibold text-slate-900">
                {edaInfo.totalRows.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500">Total Features</span>
              <span className="font-semibold text-slate-900">
                {edaInfo.totalColumns}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500">Severity Classes</span>
              <span className="font-semibold text-slate-900">
                {edaInfo.targetDistribution.length}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-500">Missing Values</span>
              <span className="font-semibold text-slate-900">
                {edaInfo.missingTotal.toLocaleString()}
              </span>
            </div>
          </div>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader
            title="System Health"
            subtitle="Component status"
            icon={<Activity className="w-5 h-5" />}
          />
          <div className="space-y-4">
            {/* API Status */}
            <div className={'flex items-center gap-3 p-3 rounded-xl ' + (apiOnline ? 'bg-emerald-50' : 'bg-red-50')}>
              {apiOnline ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <div>
                <p className={'font-medium ' + (apiOnline ? 'text-emerald-900' : 'text-red-900')}>
                  API Server
                </p>
                <p className={'text-sm ' + (apiOnline ? 'text-emerald-600' : 'text-red-600')}>
                  {apiOnline ? 'Backend responsive' : 'Backend unreachable'}
                </p>
              </div>
            </div>

            {/* Model Status */}
            <div className={'flex items-center gap-3 p-3 rounded-xl ' + (modelLoaded ? 'bg-emerald-50' : 'bg-amber-50')}>
              {modelLoaded ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              )}
              <div>
                <p className={'font-medium ' + (modelLoaded ? 'text-emerald-900' : 'text-amber-900')}>
                  ML Models
                </p>
                <p className={'text-sm ' + (modelLoaded ? 'text-emerald-600' : 'text-amber-600')}>
                  {modelLoaded ? availableModels.length + ' models ready' : 'No models loaded'}
                </p>
              </div>
            </div>

            {/* Preprocessor Status */}
            <div className={'flex items-center gap-3 p-3 rounded-xl ' + (preprocessorLoaded ? 'bg-emerald-50' : 'bg-amber-50')}>
              {preprocessorLoaded ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              )}
              <div>
                <p className={'font-medium ' + (preprocessorLoaded ? 'text-emerald-900' : 'text-amber-900')}>
                  Preprocessor
                </p>
                <p className={'text-sm ' + (preprocessorLoaded ? 'text-emerald-600' : 'text-amber-600')}>
                  {preprocessorLoaded ? 'Data pipeline ready' : 'Not loaded'}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard