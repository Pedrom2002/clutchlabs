'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  HardDrive,
  Loader2,
  Map as MapIcon,
  XCircle,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as demosApi from '@/lib/api/demos'
import { QUERY_KEYS, mapName } from '@/lib/constants'
import { formatBytes, formatDateTime } from '@/lib/format'
import type { DemoStatus } from '@/types/demo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const PHASE_ORDER: DemoStatus[] = [
  'uploaded',
  'queued',
  'parsing',
  'extracting_features',
  'running_models',
  'completed',
]

const PHASE_PROGRESS: Record<DemoStatus, number> = {
  uploaded: 5,
  queued: 15,
  downloading: 25,
  parsing: 45,
  extracting_features: 65,
  running_models: 85,
  completed: 100,
  failed: 100,
  error: 100,
}

const STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
  completed: 'success',
  failed: 'destructive',
  error: 'destructive',
}

export default function DemoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const t = useTranslations('demo')

  const { data: demo, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.demo(id),
    queryFn: () => demosApi.get(id),
    refetchInterval: (q) => {
      const status = q.state.data?.status
      if (!status || ['completed', 'failed', 'error'].includes(status)) return false
      return 3000
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !demo) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-destructive">Demo not found</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>
    )
  }

  const progress = PHASE_PROGRESS[demo.status] ?? 0
  const isProcessing = !['completed', 'failed', 'error'].includes(demo.status)
  const variant = STATUS_VARIANT[demo.status] ?? 'secondary'

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <CardTitle className="flex items-center gap-2 truncate">
                <FileText className="h-5 w-5 shrink-0 text-primary" />
                <span className="truncate">{demo.original_filename}</span>
              </CardTitle>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <HardDrive className="h-3 w-3" />
                  {formatBytes(demo.file_size_bytes)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDateTime(demo.created_at)}
                </span>
              </div>
            </div>
            <Badge variant={variant} className="capitalize">
              {t(demo.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {demo.error_message && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {demo.error_message}
            </div>
          )}

          {/* Phase tracker */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('processingPhases')}
            </p>
            <Progress value={progress} className="mb-3" />
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {PHASE_ORDER.map((phase, idx) => {
                const currentIdx = PHASE_ORDER.indexOf(demo.status as DemoStatus)
                const isDone = currentIdx >= 0 && idx < currentIdx
                const isActive = currentIdx === idx && isProcessing
                const isFailed = ['failed', 'error'].includes(demo.status)

                return (
                  <li
                    key={phase}
                    className={cn(
                      'flex items-center gap-2 rounded-md border border-border p-2 text-xs',
                      isActive && 'border-primary/50 bg-primary/5',
                      isDone && 'opacity-70'
                    )}
                  >
                    {isFailed && idx === currentIdx ? (
                      <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                    ) : isDone || demo.status === 'completed' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                    ) : isActive ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                    ) : (
                      <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-border" />
                    )}
                    <span className="truncate capitalize">{t(phase)}</span>
                  </li>
                )
              })}
            </ol>
          </div>
        </CardContent>
      </Card>

      {demo.match && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapIcon className="h-4 w-4 text-primary" />
              {mapName(demo.match.map)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-6">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{demo.match.team1_name || 'Team 1'}</p>
                <p className="font-mono text-3xl font-bold">{demo.match.team1_score}</p>
              </div>
              <span className="font-mono text-lg text-muted-foreground">vs</span>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{demo.match.team2_name || 'Team 2'}</p>
                <p className="font-mono text-3xl font-bold">{demo.match.team2_score}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>{demo.match.total_rounds} rounds</span>
              {demo.match.duration_seconds && (
                <span>{Math.round(demo.match.duration_seconds / 60)}m</span>
              )}
              {demo.match.match_date && <span>{formatDateTime(demo.match.match_date)}</span>}
            </div>
            <Button asChild>
              <Link href={`/dashboard/matches/${demo.match.id}`}>
                {t('openMatch')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
