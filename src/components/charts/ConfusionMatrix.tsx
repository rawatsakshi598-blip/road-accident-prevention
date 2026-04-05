import React from 'react'
import { cn } from '../../utils/helpers'

interface ConfusionMatrixProps {
  matrix: number[][]
  labels?: string[]
  title?: string
}

export const ConfusionMatrix: React.FC<ConfusionMatrixProps> = ({
  matrix,
  labels = ['Fatal', 'Serious', 'Slight'],
  title,
}) => {
  const maxValue = Math.max(...matrix.flat())
  
  const getIntensity = (value: number): string => {
    const ratio = value / maxValue
    if (ratio > 0.8) return 'bg-indigo-600 text-white'
    if (ratio > 0.6) return 'bg-indigo-500 text-white'
    if (ratio > 0.4) return 'bg-indigo-400 text-white'
    if (ratio > 0.2) return 'bg-indigo-300 text-indigo-900'
    if (ratio > 0.1) return 'bg-indigo-200 text-indigo-900'
    return 'bg-indigo-50 text-indigo-900'
  }

  return (
    <div className="space-y-4">
      {title && <h4 className="text-sm font-medium text-slate-700 text-center">{title}</h4>}
      
      <div className="flex justify-center">
        <div className="inline-block">
          {/* Header Row */}
          <div className="flex">
            <div className="w-20 h-10" />
            {labels.map((label, i) => (
              <div
                key={i}
                className="w-16 h-10 flex items-center justify-center text-xs font-medium text-slate-600"
              >
                {label}
              </div>
            ))}
          </div>
          
          {/* Matrix Rows */}
          {matrix.map((row, i) => (
            <div key={i} className="flex">
              <div className="w-20 h-16 flex items-center justify-end pr-3 text-xs font-medium text-slate-600">
                {labels[i]}
              </div>
              {row.map((value, j) => (
                <div
                  key={j}
                  className={cn(
                    'w-16 h-16 flex items-center justify-center text-sm font-bold rounded-lg m-0.5 transition-all hover:scale-105',
                    getIntensity(value)
                  )}
                >
                  {value}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      
      {/* Labels */}
      <div className="flex justify-center gap-8 text-xs text-slate-500">
        <span>← Predicted →</span>
      </div>
    </div>
  )
}