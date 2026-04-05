// src/components/ui/Loading.tsx

import React from 'react'

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

const sizes: Record<string, string> = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
}

export const Loading: React.FC<LoadingProps> = ({ size = 'md', text }) => (
  <div className="flex flex-col items-center gap-4">
    <div className={`animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600 ${sizes[size]}`} />
    {text && <p className="text-sm text-slate-500">{text}</p>}
  </div>
)

export const LoadingSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
)

export const CardSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-24 bg-slate-200 rounded-lg" />
    <div className="h-8 bg-slate-200 rounded-lg" />
    <div className="h-8 bg-slate-200 rounded-lg" />
  </div>
)