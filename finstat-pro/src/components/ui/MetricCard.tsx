import { ReactNode } from 'react'
import { cn, formatCurrency, formatPercentage, getSurpriseColor } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number | null
  change?: number
  changeType?: 'percentage' | 'absolute'
  icon?: ReactNode
  format?: 'currency' | 'percentage' | 'number' | 'custom'
  className?: string
  size?: 'sm' | 'md' | 'lg'
  trend?: 'up' | 'down' | 'neutral'
}

export default function MetricCard({
  title,
  value,
  change,
  changeType = 'percentage',
  icon,
  format = 'custom',
  className,
  size = 'md',
  trend
}: MetricCardProps) {
  const formatValue = (val: string | number | null) => {
    if (val === null || val === undefined) return 'N/A'
    
    switch (format) {
      case 'currency':
        return typeof val === 'number' ? formatCurrency(val) : val
      case 'percentage':
        return typeof val === 'number' ? formatPercentage(val) : val
      case 'number':
        return typeof val === 'number' ? val.toLocaleString() : val
      default:
        return val
    }
  }

  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  const valueSize = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl'
  }

  const getTrendIcon = () => {
    if (trend === 'up') {
      return (
        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      )
    } else if (trend === 'down') {
      return (
        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )
    }
    return null
  }

  return (
    <div className={cn('metric-card', sizeClasses[size], className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            {icon && <div className="text-gray-400">{icon}</div>}
            <p className="text-sm font-medium text-gray-600">{title}</p>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <p className={cn('font-bold text-gray-900', valueSize[size])}>
              {formatValue(value)}
            </p>
            {change !== undefined && (
              <div className="flex items-center space-x-1">
                {getTrendIcon()}
                <span className={cn('text-sm font-medium', getSurpriseColor(change))}>
                  {changeType === 'percentage' ? `${change > 0 ? '+' : ''}${change.toFixed(1)}%` : `${change > 0 ? '+' : ''}${change}`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}