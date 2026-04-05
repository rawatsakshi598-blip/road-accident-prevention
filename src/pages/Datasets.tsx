// src/pages/Datasets.tsx

import React from 'react'
import { useDatasets } from '../hooks/useApi'
import { Card, CardHeader, Badge, Loading } from '../components/ui'
import { MetricCard } from '../components/charts'
import {
  Database,
  FileText,
  Calendar,
  Layers,
  ExternalLink,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
  AlertTriangle,
  HardDrive,
  BarChart3,
} from 'lucide-react'

// ── Types matching backend response ───────────────────────────────────────────

interface DatasetInfo {
  key: string
  name: string
  records: number
  features: number
  severity_classes: number
  period: string
  source: string
  doi?: string
  url?: string
  status: 'loaded' | 'not_found'
  instructions?: string
}

interface DatasetsResponse {
  datasets: DatasetInfo[]
}

// ── Helper functions ──────────────────────────────────────────────────────────

function getStatusBadge(status: string) {
  if (status === 'loaded') {
    return (
      <Badge variant="success" dot>
        Loaded
      </Badge>
    )
  }
  return (
    <Badge variant="danger" dot>
      Not Found
    </Badge>
  )
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

function getSourceIcon(source: string) {
  if (source === 'Zenodo') {
    return <HardDrive className="w-4 h-4" />
  }
  if (source === 'Kaggle') {
    return <Database className="w-4 h-4" />
  }
  return <FileText className="w-4 h-4" />
}

function getSourceColor(source: string): string {
  if (source === 'Zenodo') {
    return 'bg-blue-100 text-blue-700'
  }
  if (source === 'Kaggle') {
    return 'bg-cyan-100 text-cyan-700'
  }
  return 'bg-slate-100 text-slate-700'
}

// ── Dataset Card Component ────────────────────────────────────────────────────

function DatasetCard(props: { dataset: DatasetInfo }) {
  var ds = props.dataset
  var isLoaded = ds.status === 'loaded'
  var linkUrl = ds.doi || ds.url || ''

  return (
    <Card className={isLoaded ? '' : 'border-amber-200 bg-amber-50/30'}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div
            className={
              'w-14 h-14 rounded-2xl flex items-center justify-center ' +
              (isLoaded
                ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                : 'bg-amber-100 text-amber-600')
            }
          >
            <Database className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">{ds.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ' +
                  getSourceColor(ds.source)
                }
              >
                {getSourceIcon(ds.source)}
                {ds.source}
              </span>
              {getStatusBadge(ds.status)}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {isLoaded ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-slate-50 rounded-xl text-center">
            <div className="text-2xl font-bold text-slate-900">
              {formatNumber(ds.records)}
            </div>
            <div className="text-sm text-slate-500 mt-1">Records</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl text-center">
            <div className="text-2xl font-bold text-slate-900">{ds.features}</div>
            <div className="text-sm text-slate-500 mt-1">Features</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl text-center">
            <div className="text-2xl font-bold text-slate-900">
              {ds.severity_classes}
            </div>
            <div className="text-sm text-slate-500 mt-1">Classes</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl text-center">
            <div className="text-2xl font-bold text-slate-900">{ds.period}</div>
            <div className="text-sm text-slate-500 mt-1">Period</div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Dataset Not Found</p>
              <p className="text-sm text-amber-700 mt-1">
                {ds.instructions || 'Please download and place the dataset in the data/ folder.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Details */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between py-2 border-b border-slate-100">
          <span className="text-slate-500 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Dataset Key
          </span>
          <span className="font-mono text-sm font-semibold text-slate-900">
            {ds.key}
          </span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-slate-100">
          <span className="text-slate-500 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Time Period
          </span>
          <span className="font-semibold text-slate-900">{ds.period}</span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-slate-100">
          <span className="text-slate-500 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Severity Classes
          </span>
          <span className="font-semibold text-slate-900">
            {ds.severity_classes} classes
          </span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-slate-500 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Total Records
          </span>
          <span className="font-semibold text-slate-900">
            {ds.records.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Download Link */}
      {linkUrl && (
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors"
        >
          <Download className="w-4 h-4" />
          Download from {ds.source}
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </Card>
  )
}

// ── Main Datasets Page ────────────────────────────────────────────────────────

export const Datasets: React.FC = function () {
  var result = useDatasets()
  var data = result.data as DatasetsResponse | null
  var isLoading = result.isLoading
  var error = result.error
  var refetch = result.refetch

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loading size="lg" text="Loading datasets..." />
      </div>
    )
  }

  var datasets: DatasetInfo[] = data?.datasets || []
  var totalRecords = datasets.reduce(function (sum, ds) {
    return sum + ds.records
  }, 0)
  var totalFeatures = datasets.reduce(function (sum, ds) {
    return sum + ds.features
  }, 0)
  var loadedCount = datasets.filter(function (ds) {
    return ds.status === 'loaded'
  }).length

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Datasets</h1>
          <p className="text-slate-500 mt-1">
            Manage and explore available datasets for accident severity prediction
          </p>
        </div>
        <button
          onClick={refetch}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-red-800">Failed to Load Datasets</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
            <button
              onClick={refetch}
              className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Datasets"
          value={datasets.length}
          subtitle={loadedCount + ' loaded'}
          icon={<Database className="w-6 h-6" />}
          color="primary"
        />
        <MetricCard
          title="Total Records"
          value={formatNumber(totalRecords)}
          subtitle="Across all datasets"
          icon={<FileText className="w-6 h-6" />}
          color="info"
        />
        <MetricCard
          title="Total Features"
          value={totalFeatures}
          subtitle="Combined columns"
          icon={<Layers className="w-6 h-6" />}
          color="success"
        />
        <MetricCard
          title="Status"
          value={loadedCount === datasets.length ? 'All Ready' : 'Partial'}
          subtitle={
            loadedCount === datasets.length
              ? 'All datasets loaded'
              : loadedCount + '/' + datasets.length + ' loaded'
          }
          icon={
            loadedCount === datasets.length ? (
              <CheckCircle className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )
          }
          color={loadedCount === datasets.length ? 'success' : 'warning'}
        />
      </div>

      {/* Dataset Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {datasets.map(function (ds) {
          return <DatasetCard key={ds.key} dataset={ds} />
        })}
      </div>

      {/* Empty State */}
      {datasets.length === 0 && !error && (
        <Card className="text-center py-12">
          <Database className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-700">No Datasets Found</h3>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">
            Please ensure the backend is running and datasets are placed in the data/ folder.
          </p>
        </Card>
      )}

      {/* Instructions Card */}
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
        <CardHeader
          title="Dataset Setup Instructions"
          subtitle="How to add datasets to the system"
          icon={<FileText className="w-5 h-5" />}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* NHAI Dataset */}
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <h4 className="font-semibold text-slate-900 mb-2">
              NHAI Multi-Corridor Dataset
            </h4>
            <ol className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  1
                </span>
                <span>
                  Visit{' '}
                  <a
                    href="https://doi.org/10.5281/zenodo.16946653"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline"
                  >
                    Zenodo DOI
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  2
                </span>
                <span>Download the CSV file</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  3
                </span>
                <span>
                  Save as <code className="px-1 bg-slate-100 rounded">accident_data.csv</code> in{' '}
                  <code className="px-1 bg-slate-100 rounded">data/</code> folder
                </span>
              </li>
            </ol>
          </div>

          {/* Kaggle Dataset */}
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <h4 className="font-semibold text-slate-900 mb-2">
              Kaggle India Severity Dataset
            </h4>
            <ol className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-cyan-100 text-cyan-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  1
                </span>
                <span>
                  Visit{' '}
                  <a
                    href="https://www.kaggle.com/datasets/s3programmer/road-accident-severity-in-india"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-600 hover:underline"
                  >
                    Kaggle Dataset
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-cyan-100 text-cyan-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  2
                </span>
                <span>Sign in and download the CSV</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-cyan-100 text-cyan-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  3
                </span>
                <span>
                  Save as{' '}
                  <code className="px-1 bg-slate-100 rounded">accident_severity_india.csv</code> in{' '}
                  <code className="px-1 bg-slate-100 rounded">data/</code> folder
                </span>
              </li>
            </ol>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default Datasets