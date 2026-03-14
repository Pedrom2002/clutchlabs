'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileUp,
  Loader2,
  RefreshCw,
  Upload,
  XCircle,
} from 'lucide-react'
import { api, ApiError } from '@/lib/api-client'
import type { Demo, DemoStatus, PaginatedResponse } from '@/types/demo'

const statusConfig: Record<
  DemoStatus,
  { label: string; icon: typeof Clock; className: string }
> = {
  uploaded: { label: 'Uploaded', icon: Clock, className: 'text-text-muted' },
  queued: { label: 'Queued', icon: Clock, className: 'text-text-muted' },
  downloading: { label: 'Downloading', icon: Loader2, className: 'text-accent animate-spin' },
  parsing: { label: 'Parsing', icon: Loader2, className: 'text-accent animate-spin' },
  extracting_features: { label: 'Extracting', icon: Loader2, className: 'text-accent animate-spin' },
  running_models: { label: 'Running ML', icon: Loader2, className: 'text-accent animate-spin' },
  completed: { label: 'Completed', icon: CheckCircle2, className: 'text-success' },
  failed: { label: 'Failed', icon: XCircle, className: 'text-error' },
  error: { label: 'Error', icon: AlertCircle, className: 'text-error' },
}

const PROCESSING_STATUSES: DemoStatus[] = [
  'uploaded',
  'queued',
  'downloading',
  'parsing',
  'extracting_features',
  'running_models',
]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function DemosPage() {
  const [demos, setDemos] = useState<Demo[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadDemos = useCallback(async (p: number = 1) => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.get<PaginatedResponse<Demo>>(`/demos?page=${p}&page_size=20`)
      setDemos(data.items)
      setTotal(data.total)
      setPage(data.page)
      setPages(data.pages)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to load demos')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Load on mount
  useEffect(() => {
    loadDemos(1)
  }, [loadDemos])

  // Poll for status updates when any demo is still processing
  useEffect(() => {
    const hasProcessing = demos.some((d) =>
      PROCESSING_STATUSES.includes(d.status)
    )
    if (!hasProcessing) return

    const interval = setInterval(() => {
      loadDemos(page)
    }, 10_000)

    return () => clearInterval(interval)
  }, [demos, page, loadDemos])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.dem')) {
      setError('Only .dem files are accepted')
      return
    }

    try {
      setUploading(true)
      setError(null)
      await api.upload<Demo>('/demos', file)
      await loadDemos(1)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Upload failed')
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Demos</h1>
          <p className="text-text-muted text-sm mt-1">
            Upload and manage your CS2 demo files
          </p>
        </div>
        <label
          aria-label="Upload demo file"
          className={`inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors cursor-pointer ${
            uploading ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? 'Uploading...' : 'Upload Demo'}
          <input
            ref={fileInputRef}
            type="file"
            accept=".dem"
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 text-error text-sm px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => loadDemos(page)}
            className="text-error hover:text-error/80 transition-colors ml-4"
            aria-label="Retry"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading && demos.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 text-text-muted animate-spin" />
        </div>
      ) : demos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-bg-elevated rounded-full p-4 mb-4">
            <FileUp className="h-8 w-8 text-text-dim" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Demos Yet</h3>
          <p className="text-text-muted text-sm max-w-sm mb-4">
            Upload your first CS2 demo file to get started with AI-powered analysis.
          </p>
          <label className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors cursor-pointer">
            <Upload className="h-4 w-4" />
            Upload Demo
            <input
              type="file"
              accept=".dem"
              onChange={handleUpload}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <>
          <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-left">
                  <th className="px-4 py-3 font-medium">Filename</th>
                  <th className="px-4 py-3 font-medium">Size</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {demos.map((demo) => {
                  const status = statusConfig[demo.status]
                  const StatusIcon = status.icon
                  return (
                    <tr
                      key={demo.id}
                      className="border-b border-border last:border-0 hover:bg-bg-elevated/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/demos/${demo.id}`}
                          className="text-text hover:text-primary transition-colors font-medium"
                        >
                          {demo.original_filename}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {formatBytes(demo.file_size_bytes)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 ${status.className}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {formatDate(demo.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-text-muted text-sm">
                {total} demo{total !== 1 ? 's' : ''} total
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => loadDemos(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm bg-bg-elevated rounded-lg disabled:opacity-50 hover:bg-border transition-colors"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5 text-sm text-text-muted">
                  {page} / {pages}
                </span>
                <button
                  onClick={() => loadDemos(page + 1)}
                  disabled={page >= pages}
                  className="px-3 py-1.5 text-sm bg-bg-elevated rounded-lg disabled:opacity-50 hover:bg-border transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
