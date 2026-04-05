import React from 'react'
import { cn } from '../../utils/helpers'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  color = 'primary',
  className,
}) => {
  const colorClasses = {
    primary: 'from-indigo-500 to-purple-600',
    success: 'from-emerald-500 to-teal-600',
    warning: 'from-amber-500 to-orange-600',
    danger: 'from-red-500 to-rose-600',
    info: 'from-cyan-500 to-blue-600',
  }

  const iconBgClasses = {
    primary: 'bg-indigo-100 text-indigo-600',
    success: 'bg-emerald-100 text-emerald-600',
    warning: 'bg-amber-100 text-amber-600',
    danger: 'bg-red-100 text-red-600',
    info: 'bg-cyan-100 text-cyan-600',
  }

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-slate-400'

  return (
    <div
      className={cn(
        'bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6 hover:shadow-xl transition-all duration-300',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
            {trend && trendValue && (
              <span className={cn('flex items-center gap-1 text-sm font-medium', trendColor)}>
                <TrendIcon className="w-4 h-4" />
                {trendValue}
              </span>
            )}
          </div>
          {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
        </div>
        {icon && (
          <div className={cn('p-3 rounded-xl', iconBgClasses[color])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}