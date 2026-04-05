import React from 'react'
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { getColorByIndex, getSeverityColor } from '../../utils/helpers'

interface PieChartProps {
  data: { name: string; value: number }[]
  height?: number
  showLegend?: boolean
  innerRadius?: number
  useSeverityColors?: boolean
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  height = 300,
  showLegend = true,
  innerRadius = 60,
  useSeverityColors = false,
}) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const total = data.reduce((sum, item) => sum + item.value, 0)
      const percent = ((payload[0].value / total) * 100).toFixed(1)
      return (
        <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl text-sm">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-indigo-300">{payload[0].value} ({percent}%)</p>
        </div>
      )
    }
    return null
  }

  const CustomLegend = ({ payload }: any) => (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-slate-600">{entry.value}</span>
        </div>
      ))}
    </div>
  )

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={innerRadius + 40}
          paddingAngle={3}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={useSeverityColors ? getSeverityColor(entry.name) : getColorByIndex(index)}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend content={<CustomLegend />} />}
      </RechartsPieChart>
    </ResponsiveContainer>
  )
}