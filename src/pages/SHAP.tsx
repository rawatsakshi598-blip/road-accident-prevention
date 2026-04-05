// src/pages/SHAP.tsx

import { useState, useEffect } from 'react'
import { Card, CardHeader, Loading } from '../components/ui'
import { Brain, AlertTriangle, Info, HelpCircle } from 'lucide-react'

export function SHAP() {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/shap/feature-importance')
      .then(res => res.json())
      .then((result) => {
        setData(result)
        setIsLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setIsLoading(false)
      })
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loading size="lg" text="Loading SHAP analysis..." />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="bg-red-50 border-red-200">
        <p className="text-red-600">Failed to load SHAP data: {error}</p>
        <p className="text-red-500 text-sm mt-1">Restart backend to generate SHAP analysis</p>
      </Card>
    )
  }

  const features = Array.isArray(data.features) ? data.features : []
  const interpretation = data.interpretation || 'SHAP explains individual predictions by calculating contribution of each feature.'

  const highImpact = features.filter((f: any) => Math.abs(f.importance || 0) > 0.05).length
  const mediumImpact = features.filter((f: any) => Math.abs(f.importance || 0) > 0.02 && Math.abs(f.importance || 0) <= 0.05).length
  const lowImpact = features.filter((f: any) => Math.abs(f.importance || 0) <= 0.02).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">SHAP Analysis</h1>
        <p className="text-slate-500 mt-1">Understand model predictions with SHAP values</p>
      </div>

      {/* What is SHAP */}
      <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100">
        <CardHeader
          title="What is SHAP?"
          subtitle="Explainable AI using Game Theory"
          icon={<Brain className="w-5 h-5" />}
        />
        <p className="text-slate-700 text-sm leading-relaxed">
          {interpretation}
        </p>
      </Card>

      {/* Impact Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="text-center">
          <div className="p-3 bg-red-100 rounded-xl text-red-600 w-fit mx-auto mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-bold text-slate-900">{highImpact}</h3>
          <p className="text-slate-500 text-sm">High Impact</p>
        </Card>

        <Card className="text-center">
          <div className="p-3 bg-amber-100 rounded-xl text-amber-600 w-fit mx-auto mb-3">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-bold text-slate-900">{mediumImpact}</h3>
          <p className="text-slate-500 text-sm">Medium Impact</p>
        </Card>

        <Card className="text-center">
          <div className="p-3 bg-green-100 rounded-xl text-green-600 w-fit mx-auto mb-3">
            <Info className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-bold text-slate-900">{lowImpact}</h3>
          <p className="text-slate-500 text-sm">Low Impact</p>
        </Card>
      </div>

      {/* Top Influential Features */}
      {features.length > 0 && (
        <Card>
          <CardHeader
            title="Top Influential Features"
            subtitle="Most important features for prediction"
            icon={<Brain className="w-5 h-5" />}
          />
          <div className="space-y-3">
            {features.slice(0, 10).map((feat: any, idx: number) => {
              const importanceValue = feat.importance || 0
              const percentage = Math.round(Math.abs(importanceValue) * 100)
              return (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-semibold text-sm">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-slate-900">{feat.name || feat.feature_name || 'Feature ' + (idx + 1)}</span>
                  </div>
                  <div className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold">
                    {percentage}%
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Complete Feature Importance Table */}
      {features.length > 0 && (
        <Card>
          <CardHeader
            title="Complete Feature Importance"
            subtitle="All features ranked by SHAP values"
            icon={<Brain className="w-5 h-5" />}
          />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">#</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Feature</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">SHAP Value</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Importance</th>
                </tr>
              </thead>
              <tbody>
                {features.map((feat: any, idx: number) => {
                  const importance = feat.importance || 0
                  const value = feat.shap_value || 0
                  const percentage = Math.abs(importance)
                  return (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-900">{idx + 1}</td>
                      <td className="py-3 px-4 text-slate-700">{feat.name || feat.feature_name || '-'}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">{value.toFixed(4)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        {(percentage * 100).toFixed(2)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* No Data State */}
      {(features.length === 0 || !data.features) && (
        <Card className="bg-slate-50">
          <div className="text-center py-8">
            <Brain className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">No SHAP Data Available</h3>
            <p className="text-slate-500 mt-2 max-w-md mx-auto">
              SHAP analysis requires the backend to generate feature importance scores. 
              Please restart the backend to generate this analysis.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}

export default SHAP