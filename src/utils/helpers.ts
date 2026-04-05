import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number, decimals: number = 2): string {
  if (num === undefined || num === null || isNaN(num)) return 'N/A'
  return num.toFixed(decimals)
}

export function formatPercent(num: number, decimals: number = 1): string {
  if (num === undefined || num === null || isNaN(num)) return 'N/A'
  return `${(num * 100).toFixed(decimals)}%`
}

export function formatLargeNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

export function getColorByIndex(index: number): string {
  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
    '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  ]
  return colors[index % colors.length]
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    'Fatal': '#ef4444',
    'Serious': '#f59e0b',
    'Slight': '#22c55e',
    'Minor': '#3b82f6',
  }
  return colors[severity] || '#64748b'
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function sortByValue(obj: Record<string, number>, desc: boolean = true): [string, number][] {
  return Object.entries(obj).sort((a, b) => desc ? b[1] - a[1] : a[1] - b[1])
}