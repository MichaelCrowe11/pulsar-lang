import { cn } from '@/lib/utils'

interface ProgressBarProps {
  progress: number
  size?: 'sm' | 'md' | 'lg'
  color?: 'blue' | 'green' | 'yellow' | 'red'
  showLabel?: boolean
  animated?: boolean
  className?: string
}

export default function ProgressBar({
  progress,
  size = 'md',
  color = 'blue',
  showLabel = true,
  animated = false,
  className
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress))

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  }

  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-600',
    red: 'bg-red-600'
  }

  const bgColorClasses = {
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    yellow: 'bg-yellow-100',
    red: 'bg-red-100'
  }

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-500">{clampedProgress.toFixed(0)}%</span>
        </div>
      )}
      <div className={cn('w-full rounded-full', bgColorClasses[color], sizeClasses[size])}>
        <div
          className={cn(
            'rounded-full transition-all duration-300 ease-out',
            colorClasses[color],
            sizeClasses[size],
            animated && 'animate-pulse'
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  )
}