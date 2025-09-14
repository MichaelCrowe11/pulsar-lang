'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChartBarIcon,
  DocumentTextIcon,
  BoltIcon,
  TrendingUpIcon,
  StarIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import DocumentUpload from '@/components/dashboard/DocumentUpload'
import FinancialMetrics from '@/components/dashboard/FinancialMetrics'
import SentimentGauge from '@/components/dashboard/SentimentGauge'
import { useAppStore } from '@/lib/store'
import { AnalysisResult } from '@/types'

// Mock data for demonstration
const mockAnalysis: AnalysisResult = {
  ticker: 'AAPL',
  period: '2024-Q4',
  financial_metrics: {
    eps: 2.18,
    revenue: 94300000000,
    gross_margin: 46.2,
    operating_margin: 30.1,
    net_income: 25000000000,
    free_cash_flow: 28500000000,
    operating_cash_flow: 32200000000,
    total_debt: 95000000000,
    cash_equivalents: 62800000000
  },
  summary: 'Apple delivered strong Q4 2024 results with record iPhone revenue and continued services growth. The company reported earnings per share of $2.18, beating analyst expectations of $2.10. Revenue reached $94.3 billion, up 6% year-over-year, driven by iPhone sales and expanding services revenue.',
  sentiment: {
    score: 0.65,
    label: 'Positive',
    drivers: [
      'Record iPhone revenue growth',
      'Strong services expansion',
      'Positive management outlook',
      'Market share gains in China',
      'Innovation pipeline strength'
    ],
    confidence: 0.87
  },
  citations: [
    { section: 'Management Discussion', text: 'Referenced in analysis', page: '1-5' }
  ],
  confidence: 0.89,
  analysis_timestamp: new Date().toISOString()
}

const features = [
  {
    icon: <DocumentTextIcon className="w-8 h-8" />,
    title: 'Document Analysis',
    description: 'Upload and analyze 10-K, 10-Q filings, earnings transcripts, and press releases with AI precision.'
  },
  {
    icon: <ChartBarIcon className="w-8 h-8" />,
    title: 'Financial Metrics',
    description: 'Automatically extract key financial metrics including EPS, revenue, margins, and cash flow data.'
  },
  {
    icon: <TrendingUpIcon className="w-8 h-8" />,
    title: 'Sentiment Analysis',
    description: 'AI-powered sentiment analysis of management commentary and forward-looking statements.'
  },
  {
    icon: <BoltIcon className="w-8 h-8" />,
    title: 'Real-time Insights',
    description: 'Get instant analysis and insights with confidence scoring and citation tracking.'
  }
]

export default function HomePage() {
  const { currentAnalysis, setCurrentAnalysis } = useAppStore()
  const [showDemo, setShowDemo] = useState(false)

  const loadDemoData = () => {
    setCurrentAnalysis(mockAnalysis)
    setShowDemo(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <ChartBarIcon className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">FinStat Pro</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">Documentation</Button>
              <Button variant="primary" size="sm">Sign In</Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              AI-Powered
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {' '}Financial Analysis
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Transform your financial document analysis with advanced AI. Extract insights from 10-K filings, 
              earnings reports, and transcripts in seconds, not hours.
            </p>
            <div className="flex items-center justify-center space-x-4">
              <Button size="lg" onClick={loadDemoData}>
                Try Demo
                <ArrowRightIcon className="w-5 h-5 ml-2" />
              </Button>
              <Button variant="secondary" size="lg">
                View Features
              </Button>
            </div>
          </motion.div>

          {/* Features Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
              >
                <Card hover className="text-center h-full">
                  <div className="text-blue-600 mb-4 flex justify-center">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Main Application */}
      <AnimatePresence>
        {(showDemo || currentAnalysis) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white border-t"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Upload Section */}
                <div className="lg:col-span-1">
                  <DocumentUpload />
                </div>

                {/* Analysis Results */}
                <div className="lg:col-span-2 space-y-8">
                  {currentAnalysis && (
                    <>
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                      >
                        <FinancialMetrics 
                          metrics={currentAnalysis.financial_metrics}
                        />
                      </motion.div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.6, delay: 0.1 }}
                        >
                          <SentimentGauge sentiment={currentAnalysis.sentiment} />
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.6, delay: 0.2 }}
                        >
                          <Card>
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-semibold">AI Summary</h3>
                              <div className="flex items-center space-x-2">
                                <StarIcon className="w-4 h-4 text-yellow-500" />
                                <span className="text-sm font-medium text-gray-600">
                                  {(currentAnalysis.confidence * 100).toFixed(0)}% confidence
                                </span>
                              </div>
                            </div>
                            <p className="text-gray-700 leading-relaxed">
                              {currentAnalysis.summary}
                            </p>
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <div className="text-sm text-gray-500">
                                <span className="font-medium">Company:</span> {currentAnalysis.ticker} •{' '}
                                <span className="font-medium">Period:</span> {currentAnalysis.period}
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <ChartBarIcon className="w-6 h-6" />
              <span className="text-lg font-semibold">FinStat Pro</span>
            </div>
            <p className="text-gray-400">
              Advanced AI-powered financial document analysis platform
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}