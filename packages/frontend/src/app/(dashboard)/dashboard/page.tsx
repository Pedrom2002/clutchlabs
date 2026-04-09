'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart3, Crosshair, FileUp, Target, Upload } from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { api } from '@/lib/api-client'

interface DashboardStats {
  demos: number
  players: number
  hasDemos: boolean
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({ demos: 0, players: 0, hasDemos: false })
  const [loaded, setLoaded] = useState(false)

  const loadStats = useCallback(async () => {
    try {
      const [demosData, playersData] = await Promise.all([
        api.get<{ total: number }>('/demos?page=1&page_size=1'),
        api.get<{ total: number }>('/players?page=1&page_size=1').catch(() => ({ total: 0 })),
      ])
      setStats({
        demos: demosData.total,
        players: playersData.total,
        hasDemos: demosData.total > 0,
      })
    } catch {
      // silently handle
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  if (!loaded) return null

  if (!stats.hasDemos) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <EmptyState
          icon={FileUp}
          title="Upload Your First Demo"
          description="Get started by uploading a CS2 demo file (.dem). Our AI will analyze every round and deliver actionable insights."
          actionLabel="Upload Demo"
          actionHref="/dashboard/demos"
        />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 text-text-muted text-xs mb-1">
            <Target className="h-3.5 w-3.5" />
            Demos Uploaded
          </div>
          <div className="text-3xl font-bold">{stats.demos}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 text-text-muted text-xs mb-1">
            <Crosshair className="h-3.5 w-3.5" />
            Players Tracked
          </div>
          <div className="text-3xl font-bold">{stats.players}</div>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 text-text-muted text-xs mb-1">
            <BarChart3 className="h-3.5 w-3.5" />
            AI Analysis
          </div>
          <div className="text-3xl font-bold text-green-400">Active</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/dashboard/demos"
          className="bg-bg-card border border-border rounded-xl p-6 hover:border-primary/40 transition-colors group"
        >
          <Upload className="h-8 w-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
          <h2 className="text-lg font-bold mb-1">Upload Demo</h2>
          <p className="text-sm text-text-muted">
            Upload a new .dem file for AI analysis
          </p>
        </Link>

        <Link
          href="/dashboard/analytics"
          className="bg-bg-card border border-border rounded-xl p-6 hover:border-primary/40 transition-colors group"
        >
          <BarChart3 className="h-8 w-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
          <h2 className="text-lg font-bold mb-1">View Analytics</h2>
          <p className="text-sm text-text-muted">
            Player rankings, performance trends, and insights
          </p>
        </Link>
      </div>
    </div>
  )
}
