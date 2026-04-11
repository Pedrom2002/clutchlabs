'use client'

import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Filter, Sparkles } from 'lucide-react'
import * as matchesApi from '@/lib/api/matches'
import { QUERY_KEYS } from '@/lib/constants'
import type { DetectedError } from '@/types/demo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ShapWaterfall } from '@/components/charts/shap-waterfall'
import { useUrlState } from '@/hooks/use-url-state'

const SEVERITY_VARIANT: Record<string, BadgeProps['variant']> = {
  critical: 'critical',
  major: 'major',
  minor: 'minor',
  info: 'minor',
}

function ErrorCard({
  err,
  active,
  onClick,
}: {
  err: DetectedError
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={
        'w-full rounded-lg border p-3 text-left transition-colors hover:border-primary/50 ' +
        (active ? 'border-primary bg-primary/5' : 'border-border bg-card')
      }
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={SEVERITY_VARIANT[err.severity] ?? 'secondary'}>{err.severity}</Badge>
          <span className="text-sm font-medium">R{err.round_number}</span>
          <span className="text-xs capitalize text-muted-foreground">{err.error_type}</span>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">
          {Math.round(err.confidence * 100)}%
        </span>
      </div>
      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{err.description}</p>
    </button>
  )
}

function ErrorDetail({ err }: { err: DetectedError }) {
  const t = useTranslations('errors')
  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant={SEVERITY_VARIANT[err.severity] ?? 'secondary'}>{err.severity}</Badge>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {err.error_type}
          </span>
        </div>
        <CardTitle className="text-base">{err.description}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-md bg-secondary p-2">
            <p className="text-muted-foreground">Round</p>
            <p className="font-mono text-base font-semibold">{err.round_number}</p>
          </div>
          <div className="rounded-md bg-secondary p-2">
            <p className="text-muted-foreground">{t('confidence')}</p>
            <p className="font-mono text-base font-semibold">
              {Math.round(err.confidence * 100)}%
            </p>
          </div>
          <div className="rounded-md bg-secondary p-2">
            <p className="text-muted-foreground">Model</p>
            <p className="truncate font-mono text-[10px]">{err.model_name}</p>
          </div>
        </div>

        {err.explanation && err.explanation.feature_importances.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('shapWaterfall')}
            </p>
            <ShapWaterfall importances={err.explanation.feature_importances} />
          </div>
        )}

        {err.explanation?.explanation_text && (
          <div className="rounded-md border border-border bg-secondary p-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {t('explanation')}
            </p>
            <p className="mt-1 text-sm">{err.explanation.explanation_text}</p>
          </div>
        )}

        {err.recommendation && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <div className="mb-1 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <p className="text-sm font-medium text-primary">{err.recommendation.title}</p>
            </div>
            <p className="text-sm text-muted-foreground">{err.recommendation.description}</p>
            {err.recommendation.expected_impact && (
              <p className="mt-2 text-xs text-muted-foreground">
                {err.recommendation.expected_impact}
              </p>
            )}
            {err.recommendation.pro_reference && (
              <p className="mt-1 text-xs italic text-muted-foreground">
                ✦ {err.recommendation.pro_reference}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function MatchErrorsPage() {
  const { id } = useParams<{ id: string }>()
  const t = useTranslations('errors')

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.matchErrors(id),
    queryFn: () => matchesApi.errors(id),
  })

  const [severity, setSeverity] = useUrlState('sev', 'all')
  const [type, setType] = useUrlState('type', 'all')
  const [player, setPlayer] = useUrlState('p', 'all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!data) return []
    return data.errors.filter((e) => {
      if (severity !== 'all' && e.severity !== severity) return false
      if (type !== 'all' && e.error_type !== type) return false
      if (player !== 'all' && e.player_steam_id !== player) return false
      return true
    })
  }, [data, severity, type, player])

  const players = useMemo(
    () => (data ? Array.from(new Set(data.errors.map((e) => e.player_steam_id))) : []),
    [data]
  )

  const types = useMemo(
    () => (data ? Array.from(new Set(data.errors.map((e) => e.error_type))) : []),
    [data]
  )

  const selected = filtered.find((e) => e.id === selectedId) ?? filtered[0] ?? null

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!data || data.errors.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16">
          <AlertTriangle className="h-10 w-10 text-muted-foreground" />
          <p className="text-lg font-medium">{t('noErrors')}</p>
          <p className="text-sm text-muted-foreground">{t('noErrorsDesc')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="font-mono text-2xl font-bold">{data.total_errors}</p>
            <p className="text-xs text-muted-foreground">{t('total')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="font-mono text-2xl font-bold text-severity-critical">
              {data.critical_count}
            </p>
            <p className="text-xs text-muted-foreground">{t('critical')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="font-mono text-2xl font-bold text-severity-major">
              {data.errors.filter((e) => e.severity === 'major').length}
            </p>
            <p className="text-xs text-muted-foreground">{t('major')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="font-mono text-2xl font-bold text-severity-minor">
              {data.minor_count}
            </p>
            <p className="text-xs text-muted-foreground">{t('minor')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={severity} onValueChange={(v) => setSeverity(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('filterSeverity')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allSeverities')}</SelectItem>
            <SelectItem value="critical">{t('critical')}</SelectItem>
            <SelectItem value="major">{t('major')}</SelectItem>
            <SelectItem value="minor">{t('minor')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={(v) => setType(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('filterType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allTypes')}</SelectItem>
            {types.map((tp) => (
              <SelectItem key={tp} value={tp} className="capitalize">
                {tp}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={player} onValueChange={(v) => setPlayer(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('filterPlayer')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allPlayers')}</SelectItem>
            {players.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Master/detail */}
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-2 lg:max-h-[640px] lg:overflow-y-auto lg:pr-2">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t('noResults')}</p>
          ) : (
            filtered.map((err) => (
              <ErrorCard
                key={err.id}
                err={err}
                active={selected?.id === err.id}
                onClick={() => setSelectedId(err.id)}
              />
            ))
          )}
        </div>
        <div>
          {selected ? (
            <ErrorDetail err={selected} />
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Select an error
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
