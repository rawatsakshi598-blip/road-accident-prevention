import React, { useState } from 'react'
import { useModels } from '../hooks/useApi'
import { Card, CardHeader, Badge, Button, Loading } from '../components/ui'
import { BarChart, LineChart, ConfusionMatrix, ProgressBar } from '../components/charts'
import { Layers, Trophy, Target, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react'
import { formatPercent, cn } from '../utils/helpers'

export const Models: React.FC = () => {
  const { data: models, isLoading, error } = useModels()
  const [expandedModel, setExpandedModel] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loading size="lg" text="Loading model comparison..." />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="bg-red-50 border-red-200">
        <p className="text-red-600">Failed to load models. Please ensure the backend is running.</p>
      </Card>
    )
  }

  const modelEntries = models?.models ? Object.entries(models.models) : []
  const bestModel = models?.best_model

  const comparisonData = modelEntries.map(([name, metrics]) => ({
    name,
    accuracy: metrics.accuracy,
    precision: metrics.precision_weighted,
    recall: metrics.recall_weighted,
    f1: metrics.f1_weighted,
  }))

  const metricsLineData = comparisonData.map((m) => ({
    name: m.name,
    Accuracy: m.accuracy,
    Precision: m.precision,
    Recall: m.recall,
    F1: m.f1,
  }))

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Model Comparison</h1>
          <p className="text-slate-500 mt-1">Compare performance across all ML models</p>
        </div>
        {bestModel && (
          <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 rounded-xl border border-amber-200">
            <Trophy className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-xs text-amber-600">Best Model</p>
              <p className="font-bold text-amber-900">{bestModel}</p>
            </div>
          </div>
        )}
      </div>

      {/* Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accuracy Comparison */}
        <Card>
          <CardHeader
            title="Model Accuracy Comparison"
            subtitle="Accuracy scores across models"
            icon={<Target className="w-5 h-5" />}
          />
          <BarChart
            data={comparisonData.map((m) => ({ name: m.name, value: m.accuracy }))}
            height={300}
          />
        </Card>

        {/* Metrics Line Chart */}
        <Card>
          <CardHeader
            title="Metrics Overview"
            subtitle="All metrics per model"
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <LineChart
            data={metricsLineData}
            lines={[
              { dataKey: 'Accuracy', color: '#6366f1', name: 'Accuracy' },
              { dataKey: 'Precision', color: '#8b5cf6', name: 'Precision' },
              { dataKey: 'Recall', color: '#ec4899', name: 'Recall' },
              { dataKey: 'F1', color: '#14b8a6', name: 'F1 Score' },
            ]}
            xAxisKey="name"
            height={300}
          />
        </Card>
      </div>

      {/* Individual Model Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modelEntries.map(([name, metrics]) => {
          const isBest = name === bestModel
          const isExpanded = expandedModel === name

          return (
            <Card
              key={name}
              className={cn(
                'transition-all duration-300',
                isBest && 'ring-2 ring-amber-400 ring-offset-2'
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'p-2.5 rounded-xl',
                      isBest ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'
                    )}
                  >
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{name}</h3>
                    {isBest && <Badge variant="warning" size="sm">Best</Badge>}
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-3">
                <ProgressBar
                  label="Accuracy"
                  value={metrics.accuracy * 100}
                  color={metrics.accuracy > 0.8 ? 'success' : metrics.accuracy > 0.6 ? 'warning' : 'danger'}
                />
                <ProgressBar
                  label="Precision"
                  value={metrics.precision_weighted * 100}
                  color="primary"
                />
                <ProgressBar
                  label="Recall"
                  value={metrics.recall_weighted * 100}
                  color="info"
                />
                <ProgressBar
                  label="F1 Score"
                  value={metrics.f1_weighted * 100}
                  color="success"
                />
              </div>

              {/* Expand Button */}
              <button
                onClick={() => setExpandedModel(isExpanded ? null : name)}
                className="w-full mt-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                {isExpanded ? (
                  <>
                    Hide Details <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Show Details <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                  {/* Confusion Matrix */}
                  {metrics.confusion_matrix && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 mb-3">Confusion Matrix</h4>
                      <ConfusionMatrix matrix={metrics.confusion_matrix} />
                    </div>
                  )}

                  {/* Classification Report */}
                  {metrics.classification_report && (
                    <div className="overflow-x-auto">
                      <h4 className="text-sm font-medium text-slate-700 mb-3">Classification Report</h4>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-slate-500">
                            <th className="text-left py-2">Class</th>
                            <th className="text-right py-2">Precision</th>
                            <th className="text-right py-2">Recall</th>
                            <th className="text-right py-2">F1</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(metrics.classification_report)
                            .filter(([key]) => !['accuracy', 'macro avg', 'weighted avg'].includes(key))
                            .map(([label, report]) => (
                              <tr key={label} className="border-t border-slate-100">
                                <td className="py-2 font-medium">{label}</td>
                                <td className="py-2 text-right">{formatPercent(report.precision)}</td>
                                <td className="py-2 text-right">{formatPercent(report.recall)}</td>
                                <td className="py-2 text-right">{formatPercent(report['f1-score'])}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}