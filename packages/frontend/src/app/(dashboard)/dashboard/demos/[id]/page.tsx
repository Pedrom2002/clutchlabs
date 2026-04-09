'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Clock,
  FileText,
  HardDrive,
  Loader2,
  Map,
} from 'lucide-react'
import { api, ApiError } from '@/lib/api-client'
import type { DemoDetail } from '@/types/demo'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(date: string): string {
  return new Date(date).toLocaleString()
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'text-green-400 bg-green-500/10 border-green-500/30',
  failed: 'text-red-400 bg-red-500/10 border-red-500/30',
  error: 'text-red-400 bg-red-500/10 border-red-500/30',
  parsing: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  queued: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  uploaded: 'text-text-muted bg-bg-elevated border-border',
}

export default function DemoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const demoId = params.id as string

  const [demo, setDemo] = useState<DemoDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDemo = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.get<DemoDetail>(`/demos/${demoId}`)
      setDemo(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load demo')
    } finally {
      setLoading(false)
    }
  }, [demoId])

  useEffect(() => {
    loadDemo()
  }, [loadDemo])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-text-muted animate-spin" />
      </div>
    )
  }

  if (error || !demo) {
    return (
      <div className="text-center py-20">
        <p className="text-error mb-4">{error || 'Demo not found'}</p>
        <button onClick={() => router.back()} className="text-primary text-sm hover:underline">
          Go back
        </button>
      </div>
    )
  }

  const statusColor = STATUS_COLORS[demo.status] || STATUS_COLORS.uploaded

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-text-muted hover:text-text text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="bg-bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {demo.original_filename}
            </h1>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-text-muted">
              <span className="flex items-center gap-1">
                <HardDrive className="h-3.5 w-3.5" />
                {formatBytes(demo.file_size_bytes)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Uploaded {formatDate(demo.created_at)}
              </span>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
            {demo.status}
          </span>
        </div>

        {demo.error_message && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            {demo.error_message}
          </div>
        )}

        {demo.parsing_started_at && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-text-dim">Parsing started</span>
              <p className="text-text-muted">{formatDate(demo.parsing_started_at)}</p>
            </div>
            {demo.parsing_completed_at && (
              <div>
                <span className="text-text-dim">Parsing completed</span>
                <p className="text-text-muted">{formatDate(demo.parsing_completed_at)}</p>
              </div>
            )}
            {demo.processing_completed_at && (
              <div>
                <span className="text-text-dim">Processing completed</span>
                <p className="text-text-muted">{formatDate(demo.processing_completed_at)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {demo.match && (
        <div className="bg-bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Map className="h-4 w-4 text-primary" />
            Match Result
          </h2>
          <div className="flex items-center gap-6 mb-4">
            <div className="text-center">
              <div className="text-text-muted text-xs mb-1">
                {demo.match.team1_name || 'Team 1'}
              </div>
              <div className="text-3xl font-bold">{demo.match.team1_score}</div>
            </div>
            <div className="text-text-dim text-lg font-medium">vs</div>
            <div className="text-center">
              <div className="text-text-muted text-xs mb-1">
                {demo.match.team2_name || 'Team 2'}
              </div>
              <div className="text-3xl font-bold">{demo.match.team2_score}</div>
            </div>
          </div>
          <div className="flex gap-4 text-sm text-text-muted mb-4">
            <span>{demo.match.map}</span>
            <span>{demo.match.total_rounds} rounds</span>
          </div>
          <Link
            href={`/dashboard/matches/${demo.match.id}`}
            className="inline-flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/80"
          >
            View Full Match Details
          </Link>
        </div>
      )}
    </div>
  )
}
