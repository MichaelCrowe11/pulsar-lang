'use client'

import { useMemo } from 'react'
import { 
  CurrencyDollarIcon, 
  ChartBarIcon, 
  TrendingUpIcon,
  BanknotesIcon 
} from '@heroicons/react/24/outline'
import { FinancialMetrics as FinancialMetricsType } from '@/types'
import MetricCard from '@/components/ui/MetricCard'
import Card, { CardHeader } from '@/components/ui/Card'

interface FinancialMetricsProps {
  metrics: FinancialMetricsType
  previousMetrics?: FinancialMetricsType
  className?: string
}

export default function FinancialMetrics({ 
  metrics, 
  previousMetrics,
  className 
}: FinancialMetricsProps) {
  const calculateChange = (current: number | null, previous: number | null): number | undefined => {
    if (current === null || previous === null || previous === 0) return undefined
    return ((current - previous) / Math.abs(previous)) * 100
  }

  const metricsData = useMemo(() => [
    {
      title: 'Earnings Per Share',
      value: metrics.eps,
      change: previousMetrics ? calculateChange(metrics.eps, previousMetrics.eps) : undefined,
      icon: <CurrencyDollarIcon className="w-5 h-5" />,
      format: 'currency' as const,
      trend: metrics.eps && previousMetrics?.eps ? 
        (metrics.eps > previousMetrics.eps ? 'up' as const : 
         metrics.eps < previousMetrics.eps ? 'down' as const : 'neutral' as const) : undefined
    },
    {
      title: 'Revenue',
      value: metrics.revenue,
      change: previousMetrics ? calculateChange(metrics.revenue, previousMetrics.revenue) : undefined,
      icon: <ChartBarIcon className="w-5 h-5" />,
      format: 'currency' as const,
      trend: metrics.revenue && previousMetrics?.revenue ? 
        (metrics.revenue > previousMetrics.revenue ? 'up' as const : 
         metrics.revenue < previousMetrics.revenue ? 'down' as const : 'neutral' as const) : undefined
    },
    {
      title: 'Gross Margin',
      value: metrics.gross_margin,
      change: previousMetrics ? calculateChange(metrics.gross_margin, previousMetrics.gross_margin) : undefined,
      icon: <TrendingUpIcon className="w-5 h-5" />,
      format: 'percentage' as const,
      trend: metrics.gross_margin && previousMetrics?.gross_margin ? 
        (metrics.gross_margin > previousMetrics.gross_margin ? 'up' as const : 
         metrics.gross_margin < previousMetrics.gross_margin ? 'down' as const : 'neutral' as const) : undefined
    },
    {
      title: 'Free Cash Flow',
      value: metrics.free_cash_flow,
      change: previousMetrics ? calculateChange(metrics.free_cash_flow, previousMetrics.free_cash_flow) : undefined,
      icon: <BanknotesIcon className="w-5 h-5" />,
      format: 'currency' as const,
      trend: metrics.free_cash_flow && previousMetrics?.free_cash_flow ? 
        (metrics.free_cash_flow > previousMetrics.free_cash_flow ? 'up' as const : 
         metrics.free_cash_flow < previousMetrics.free_cash_flow ? 'down' as const : 'neutral' as const) : undefined
    },
    {
      title: 'Operating Margin',
      value: metrics.operating_margin,
      change: previousMetrics ? calculateChange(metrics.operating_margin, previousMetrics.operating_margin) : undefined,
      icon: <ChartBarIcon className="w-5 h-5" />,
      format: 'percentage' as const,
      trend: metrics.operating_margin && previousMetrics?.operating_margin ? 
        (metrics.operating_margin > previousMetrics.operating_margin ? 'up' as const : 
         metrics.operating_margin < previousMetrics.operating_margin ? 'down' as const : 'neutral' as const) : undefined
    },
    {
      title: 'Net Income',
      value: metrics.net_income,
      change: previousMetrics ? calculateChange(metrics.net_income, previousMetrics.net_income) : undefined,
      icon: <CurrencyDollarIcon className="w-5 h-5" />,
      format: 'currency' as const,
      trend: metrics.net_income && previousMetrics?.net_income ? 
        (metrics.net_income > previousMetrics.net_income ? 'up' as const : 
         metrics.net_income < previousMetrics.net_income ? 'down' as const : 'neutral' as const) : undefined
    },
    {
      title: 'Cash Equivalents',
      value: metrics.cash_equivalents,
      change: previousMetrics ? calculateChange(metrics.cash_equivalents, previousMetrics.cash_equivalents) : undefined,
      icon: <BanknotesIcon className="w-5 h-5" />,
      format: 'currency' as const,
      trend: metrics.cash_equivalents && previousMetrics?.cash_equivalents ? 
        (metrics.cash_equivalents > previousMetrics.cash_equivalents ? 'up' as const : 
         metrics.cash_equivalents < previousMetrics.cash_equivalents ? 'down' as const : 'neutral' as const) : undefined
    },
    {
      title: 'Total Debt',
      value: metrics.total_debt,
      change: previousMetrics ? calculateChange(metrics.total_debt, previousMetrics.total_debt) : undefined,
      icon: <CurrencyDollarIcon className="w-5 h-5" />,
      format: 'currency' as const,
      trend: metrics.total_debt && previousMetrics?.total_debt ? 
        (metrics.total_debt > previousMetrics.total_debt ? 'down' as const : 
         metrics.total_debt < previousMetrics.total_debt ? 'up' as const : 'neutral' as const) : undefined
    }
  ], [metrics, previousMetrics])

  return (
    <Card className={className}>
      <CardHeader 
        title="Financial Metrics"
        subtitle="Key performance indicators extracted from documents"
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricsData.map((metric) => (
          <MetricCard
            key={metric.title}
            title={metric.title}
            value={metric.value}
            change={metric.change}
            icon={metric.icon}
            format={metric.format}
            trend={metric.trend}
            size="sm"
          />
        ))}
      </div>
    </Card>
  )
}