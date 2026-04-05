import React from 'react'
import { cn } from '../../utils/helpers'
import { ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string | number
  label: string
  description?: string
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: SelectOption[]
  label?: string
  error?: string
  hint?: string
  onChange?: (value: string) => void
}

export const Select: React.FC<SelectProps> = ({
  options,
  label,
  error,
  hint,
  onChange,
  className,
  value,
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className={cn(
            'w-full px-4 py-3 bg-slate-50 border rounded-xl text-slate-900 appearance-none cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
            'transition-all duration-200 pr-10',
            error ? 'border-red-300 focus:ring-red-500' : 'border-slate-200',
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
      </div>
      {hint && !error && (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
      {error && (
        <p className="mt-1.5 text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}