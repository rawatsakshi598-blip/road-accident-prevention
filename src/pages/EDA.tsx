// src/pages/EDA.tsx

import { useEDA } from '../hooks/useApi'
import { Card, CardHeader, Badge, Loading } from '../components/ui'
import { BarChart, PieChart, ProgressBar } from '../components/charts'
import { Database, BarChart3, PieChart as PieChartIcon, Hash, Table } from 'lucide-react'

function formatNum(val: any): string {
  if (val === null || val === undefined) return '—'
  var n = Number(val)
  if (isNaN(n)) return String(val)
  if (Number.isInteger(n)) return n.toLocaleString()
  return n.toFixed(4)
}

function sortByValue(obj: Record<string, number>): [string, number][] {
  var entries = Object.entries(obj)
  entries.sort(function (a, b) { return b[1] - a[1] })
  return entries
}

export function EDA() {
  var result = useEDA()
  var eda = result.data as any
  var isLoading = result.isLoading
  var error = result.error

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loading size="lg" text="Loading EDA analysis..." />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="bg-red-50 border-red-200">
        <p className="text-red-600">Failed to load EDA data: {error}</p>
        <p className="text-red-500 text-sm mt-1">Make sure the backend is running on http://localhost:8000</p>
      </Card>
    )
  }

  // ── Extract data with multiple fallbacks ────────────────────────────────────

  // Total records
  var totalRecords =
    eda?.total_records ??
    eda?.dataset_info?.total_rows ??
    eda?.total_rows ??
    0

  // Total features
  var totalFeatures =
    eda?.total_features ??
    eda?.dataset_info?.total_columns ??
    eda?.total_columns ??
    0

  // Dataset name
  var datasetName =
    eda?.dataset_name ??
    eda?.dataset_info?.name ??
    'Unknown'

  // Memory usage
  var memoryUsage =
    eda?.dataset_info?.memory_usage ??
    eda?.memory_usage ??
    '—'

  // Target / class distribution
  var distObj =
    eda?.class_distribution ??
    eda?.target_distribution ??
    {}

  var targetDistData: { name: string; value: number }[] = []
  if (typeof distObj === 'object' && distObj !== null) {
    var distEntries = Object.entries(distObj)
    for (var i = 0; i < distEntries.length; i++) {
      targetDistData.push({
        name: distEntries[i][0],
        value: Number(distEntries[i][1]),
      })
    }
  }

  // Numerical stats
  var numericalStats = eda?.numerical_stats ?? {}
  var numericalEntries = Object.entries(numericalStats)

  // Categorical stats
  var categoricalStats = eda?.categorical_stats ?? {}
  var categoricalEntries = Object.entries(categoricalStats).slice(0, 6)

  // Missing values
  var missingObj = eda?.missing_values ?? {}
  var missingData: { name: string; value: number }[] = []
  if (typeof missingObj === 'object' && missingObj !== null) {
    var sorted = sortByValue(missingObj as Record<string, number>)
    for (var j = 0; j < sorted.length && j < 10; j++) {
      if (sorted[j][1] > 0) {
        missingData.push({ name: sorted[j][0], value: sorted[j][1] })
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Exploratory Data Analysis</h1>
        <p className="text-slate-500 mt-1">Deep dive into {datasetName} dataset</p>
      </div>

      {/* Dataset Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="text-center">
          <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600 w-fit mx-auto mb-3">
            <Database className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-bold text-slate-900">
            {totalRecords.toLocaleString()}
          </h3>
          <p className="text-slate-500 text-sm">Total Records</p>
        </Card>

        <Card className="text-center">
          <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600 w-fit mx-auto mb-3">
            <Table className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-bold text-slate-900">
            {totalFeatures}
          </h3>
          <p className="text-slate-500 text-sm">Features</p>
        </Card>

        <Card className="text-center">
          <div className="p-3 bg-amber-100 rounded-xl text-amber-600 w-fit mx-auto mb-3">
            <Hash className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-bold text-slate-900">
            {numericalEntries.length}
          </h3>
          <p className="text-slate-500 text-sm">Numerical Features</p>
        </Card>

        <Card className="text-center">
          <div className="p-3 bg-purple-100 rounded-xl text-purple-600 w-fit mx-auto mb-3">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-bold text-slate-900">
            {categoricalEntries.length}
          </h3>
          <p className="text-slate-500 text-sm">Categorical Features</p>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Target Distribution */}
        <Card>
          <CardHeader
            title="Target Variable Distribution"
            subtitle="Accident severity classes"
            icon={<PieChartIcon className="w-5 h-5" />}
          />
          {targetDistData.length > 0 ? (
            <PieChart data={targetDistData} height={300} />
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              No distribution data available
            </div>
          )}
        </Card>

        {/* Missing Values */}
        <Card>
          <CardHeader
            title="Missing Values"
            subtitle="Features with missing data"
            icon={<BarChart3 className="w-5 h-5" />}
          />
          {missingData.length > 0 ? (
            <BarChart data={missingData} height={300} color="#f59e0b" />
          ) : (
            <div className="h-64 flex items-center justify-center text-emerald-600">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">✓</span>
                </div>
                <p className="font-medium">No Missing Values!</p>
                <p className="text-sm text-slate-500">Dataset is complete</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Numerical Statistics Table */}
      <Card>
        <CardHeader
          title="Numerical Features Statistics"
          subtitle="Summary statistics for numerical columns"
          icon={<Hash className="w-5 h-5" />}
        />
        {numericalEntries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Feature</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Count</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Mean</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Std</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Min</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">25%</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Median</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">75%</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Max</th>
                </tr>
              </thead>
              <tbody>
                {numericalEntries.map(function (entry) {
                  var name = entry[0]
                  var stats = entry[1] as any
                  return (
                    <tr key={name} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-900">{name}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatNum(stats.count)}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatNum(stats.mean)}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatNum(stats.std)}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatNum(stats.min)}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatNum(stats['25%'])}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatNum(stats['50%'])}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatNum(stats['75%'])}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatNum(stats.max)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400">
            No numerical features found in dataset
          </div>
        )}
      </Card>

      {/* Categorical Features */}
      {categoricalEntries.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Categorical Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoricalEntries.map(function (entry) {
              var name = entry[0]
              var stats = entry[1] as any
              var distribution = stats.distribution ?? {}
              var distValues = Object.values(distribution) as number[]
              var maxVal = distValues.length > 0 ? Math.max(...distValues) : 1

              return (
                <Card key={name}>
                  <CardHeader
                    title={name.replace(/_/g, ' ')}
                    subtitle={(stats.unique_count ?? 0) + ' unique values'}
                  />
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Most Common:</span>
                      <Badge variant="primary">{String(stats.most_common ?? 'N/A')}</Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Count:</span>
                      <span className="font-semibold">{(stats.most_common_count ?? 0).toLocaleString()}</span>
                    </div>
                    {Object.keys(distribution).length > 0 && (
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        {Object.entries(distribution).slice(0, 4).map(function (distEntry) {
                          var key = distEntry[0]
                          var val = distEntry[1] as number
                          return (
                            <ProgressBar
                              key={key}
                              label={key}
                              value={val}
                              max={maxVal}
                              size="sm"
                            />
                          )
                        })}
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Dataset Info Footer */}
      <Card className="bg-slate-50">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <span className="text-slate-500 text-sm">Dataset: </span>
            <span className="font-semibold text-slate-900">{datasetName}</span>
          </div>
          <div>
            <span className="text-slate-500 text-sm">Memory: </span>
            <span className="font-semibold text-slate-900">{memoryUsage}</span>
          </div>
          <div>
            <span className="text-slate-500 text-sm">Records: </span>
            <span className="font-semibold text-slate-900">{totalRecords.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-slate-500 text-sm">Features: </span>
            <span className="font-semibold text-slate-900">{totalFeatures}</span>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default EDA