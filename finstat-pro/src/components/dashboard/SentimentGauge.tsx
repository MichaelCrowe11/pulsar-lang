'use client'

import { useMemo } from 'react'
import { SentimentAnalysis } from '@/types'
import Card, { CardHeader } from '@/components/ui/Card'
import { cn, getSentimentColor } from '@/lib/utils'

interface SentimentGaugeProps {
  sentiment: SentimentAnalysis
  className?: string
}

export default function SentimentGauge({ sentiment, className }: SentimentGaugeProps) {
  const gaugeData = useMemo(() => {
    const score = sentiment.score
    const normalizedScore = ((score + 1) / 2) * 100 // Convert from [-1,1] to [0,100]
    
    let color = 'text-gray-500'
    let bgColor = 'bg-gray-100'
    let fillColor = 'bg-gray-400'
    
    if (score > 0.3) {
      color = 'text-green-600'
      bgColor = 'bg-green-100'
      fillColor = 'bg-green-500'
    } else if (score < -0.3) {
      color = 'text-red-600'
      bgColor = 'bg-red-100'
      fillColor = 'bg-red-500'
    } else {
      color = 'text-yellow-600'
      bgColor = 'bg-yellow-100'
      fillColor = 'bg-yellow-500'
    }
    
    return {
      score: normalizedScore,
      color,
      bgColor,
      fillColor,
      label: sentiment.label,
      rawScore: score
    }
  }, [sentiment])

  const confidenceColor = sentiment.confidence > 0.8 ? 'text-green-600' : 
                         sentiment.confidence > 0.6 ? 'text-yellow-600' : 'text-red-600'

  return (
    <Card className={className}>
      <CardHeader 
        title="Sentiment Analysis"
        subtitle="AI analysis of management commentary and forward-looking statements"
      />
      
      <div className="space-y-6">
        {/* Circular Gauge */}
        <div className="flex items-center justify-center">
          <div className="relative w-32 h-32">
            {/* Background circle */}
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="50"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-200"
              />
              {/* Progress circle */}
              <circle
                cx="60"
                cy="60"
                r="50"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                className={gaugeData.fillColor.replace('bg-', 'text-')}
                style={{
                  strokeDasharray: `${2 * Math.PI * 50}`,
                  strokeDashoffset: `${2 * Math.PI * 50 * (1 - gaugeData.score / 100)}`
                }}
              />
            </svg>
            
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn('text-2xl font-bold', gaugeData.color)}>
                {sentiment.score.toFixed(1)}
              </span>
              <span className={cn('text-xs font-medium', gaugeData.color)}>
                {gaugeData.label}
              </span>
            </div>
          </div>
        </div>

        {/* Sentiment Details */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Confidence</span>
              <span className={cn('text-sm font-bold', confidenceColor)}>
                {(sentiment.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={cn('h-2 rounded-full transition-all duration-500', 
                  confidence > 0.8 ? 'bg-green-500' : 
                  confidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500')}
                style={{ width: `${sentiment.confidence * 100}%` }}
              />
            </div>
          </div>

          {/* Sentiment Drivers */}
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-3">Key Sentiment Drivers</h4>
            <div className="space-y-2">
              {sentiment.drivers.slice(0, 5).map((driver, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className={cn('w-2 h-2 rounded-full', gaugeData.fillColor)} />
                  <span className="text-sm text-gray-700">{driver}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sentiment Scale */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Very Negative</span>
            <span>Neutral</span>
            <span>Very Positive</span>
          </div>
          <div className="relative w-full h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full">
            <div 
              className="absolute w-3 h-3 bg-white border-2 border-gray-800 rounded-full transform -translate-y-0.5"
              style={{ left: `calc(${gaugeData.score}% - 6px)` }}
            />
          </div>
        </div>
      </div>
    </Card>
  )
}