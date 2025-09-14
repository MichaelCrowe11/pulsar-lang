import clsx from 'clsx'
import { format, formatDistanceToNow } from 'date-fns'

export function cn(...classes: (string | undefined | null | false)[]): string {
  return clsx(classes)
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A'
  
  if (Math.abs(value) >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`
  } else if (Math.abs(value) >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`
  } else if (Math.abs(value) >= 1e3) {
    return `$${(value / 1e3).toFixed(2)}K`
  }
  
  return `$${value.toFixed(2)}`
}

export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A'
  return `${value.toFixed(1)}%`
}

export function formatNumber(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return 'N/A'
  return value.toLocaleString(undefined, { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  })
}

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, 'MMM dd, yyyy')
}

export function formatTimeAgo(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(dateObj, { addSuffix: true })
}

export function getSentimentColor(score: number): string {
  if (score > 0.3) return 'text-green-600 bg-green-50'
  if (score < -0.3) return 'text-red-600 bg-red-50'
  return 'text-yellow-600 bg-yellow-50'
}

export function getSurpriseColor(surprise: number): string {
  if (surprise > 2) return 'text-green-600'
  if (surprise < -2) return 'text-red-600'
  return 'text-gray-600'
}

export function getConfidenceColor(confidence: number): string {
  if (confidence > 0.8) return 'text-green-600'
  if (confidence > 0.6) return 'text-yellow-600'
  return 'text-red-600'
}

export function generateTicker(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const length = Math.random() > 0.5 ? 4 : 3
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length))
  }
  
  return result
}