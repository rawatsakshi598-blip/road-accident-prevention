import React from 'react'
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { getColorByIndex } from '../../utils/helpers'

interface BarChartProps {
  data: { name: string; value: number }[]
  height?: number
  color?: string
  showGrid?: boolean
  horizontal?: boolean
  showValues?: boolean
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 300,
  color,
  showGrid = true,
  horizontal = false,
  showValues = false,
}) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl text-sm">
          <p className="font-medium">{label}</p>
          <p className="text-indigo-300">{payload[0].value.toFixed(2)}</p>
        </div>
      )
    }
    return null
  }

  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data} layout="vertical" margin={{ left: 80, right: 20 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />}
          <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} width={75} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={25}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={color || getColorByIndex(index)} />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />}
        <XAxis 
          dataKey="name" 
          tick={{ fill: '#64748b', fontSize: 11 }} 
          axisLine={false} 
          tickLine={false}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={50}>
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={color || getColorByIndex(index)} />
          ))}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}