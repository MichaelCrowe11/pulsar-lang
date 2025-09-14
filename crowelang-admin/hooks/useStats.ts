'use client'

import { useState, useEffect } from 'react'

interface Stats {
  revenue: {
    total: number
    change: string
  }
  licenses: {
    active: number
    new: number
  }
  customers: {
    total: number
    new: number
  }
  crypto: {
    total: number
    volume: number
  }
}

export function useStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // In production, this would fetch from API
        // For now, using mock data
        const mockStats: Stats = {
          revenue: {
            total: 7695,
            change: '+22.5%'
          },
          licenses: {
            active: 47,
            new: 8
          },
          customers: {
            total: 73,
            new: 5
          },
          crypto: {
            total: 12,
            volume: 2000
          }
        }
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500))
        
        setStats(mockStats)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stats')
        setLoading(false)
      }
    }

    fetchStats()
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    
    return () => clearInterval(interval)
  }, [])

  return { stats, loading, error }
}