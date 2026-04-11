'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  FileUp,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react'
import * as demosApi from '@/lib/api/demos'
import * as matchesApi from '@/lib/api/matches'
import { QUERY_KEYS } from '@/lib/constants'
import { mapName } from '@/lib/constants'
import { formatRelativeTime } from '@/lib/format'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/empty-state'
import { RatingTrendChart } from '@/components/charts/rating-trend'

function makeTrendData() {
  // Synthetic 90-day rating curve. Replaced by real API once available.
  const today = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (12 - i) * 7)
    const rating = 0.95 + Math.sin(i * 0.5) * 0.08 + i * 0.012 + (Math.random() - 0.5) * 0.04
    return { date: d.toISOString(), rating: Number(rating.toFixed(2)) }
  })
}

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const tCommon = useTranslations('common')

  const { data: demos, isLoading: demosLoading } = useQuery({
    queryKey: QUERY_KEYS.demos,
    queryFn: () => demosApi.list({ page: 1, page_size: 50 }),
  })

  const { data: matches, isLoading: matchesLoading } = useQuery({
    queryKey: QUERY_KEYS.matches,
    queryFn: () => matchesApi.list({ page: 1, page_size: 5, sort: 'date', order: 'desc' }),
    retry: false,
  })

  const trendData = makeTrendData()
  const totalDemos = demos?.total ?? 0

  if (!demosLoading && totalDemos === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('title')} description={t('subtitle')} />
        <EmptyState
          icon={FileUp}
          title={t('uploadDemoDesc')}
          description="Carrega o teu primeiro ficheiro .dem para começares a análise com IA."
          actionLabel={t('uploadDemo')}
          actionHref="/dashboard/demos"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          <Button asChild>
            <Link href="/dashboard/demos">
              <FileUp className="h-4 w-4" />
              {t('uploadDemo')}
            </Link>
          </Button>
        }
      />

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('matchesThisMonth')}
          value={demosLoading ? '—' : totalDemos}
          icon={Target}
          trend={12}
          trendLabel={t('trendUp')}
          loading={demosLoading}
        />
        <StatCard
          label={t('winRate')}
          value="64%"
          icon={Trophy}
          trend={5}
          trendLabel={t('trendUp')}
        />
        <StatCard
          label={t('errorsPerMatch')}
          value="11.2"
          icon={AlertTriangle}
          trend={-3}
          trendLabel={t('trendUp')}
        />
        <StatCard
          label={t('teamRating')}
          value="1.08"
          icon={Sparkles}
          trend={4}
          trendLabel={t('trendUp')}
        />
      </div>

      {/* Trend chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('performanceTrend')}</CardTitle>
          <p className="text-xs text-muted-foreground">{t('performanceTrendDesc')}</p>
        </CardHeader>
        <CardContent>
          <RatingTrendChart data={trendData} />
        </CardContent>
      </Card>

      {/* Recent matches + top errors */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t('recentMatches')}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/matches">
                {tCommon('viewAll')}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {matchesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !matches || matches.items.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t('noMatches')}</p>
            ) : (
              <ul className="divide-y divide-border">
                {matches.items.slice(0, 5).map((m) => {
                  const won = m.team1_score > m.team2_score
                  return (
                    <li key={m.id}>
                      <Link
                        href={`/dashboard/matches/${m.id}`}
                        className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-primary"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <BarChart3 className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{mapName(m.map)}</p>
                            <p className="text-xs text-muted-foreground">
                              {m.match_date ? formatRelativeTime(m.match_date) : '—'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {m.team1_score} - {m.team2_score}
                          </span>
                          <Badge variant={won ? 'success' : 'destructive'}>
                            {won ? 'W' : 'L'}
                          </Badge>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t('topErrors')}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/analytics">
                {tCommon('viewAll')}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {[
                { label: 'Multi-angle exposure', count: 24, severity: 'critical' as const },
                { label: 'Peek without flash', count: 19, severity: 'major' as const },
                { label: 'Late rotation', count: 15, severity: 'major' as const },
                { label: 'Utility hoarding', count: 11, severity: 'minor' as const },
                { label: 'Bad re-peek', count: 9, severity: 'minor' as const },
              ].map((err) => (
                <li
                  key={err.label}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <span className="text-foreground">{err.label}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={err.severity}>{err.severity}</Badge>
                    <span className="font-mono text-xs text-muted-foreground">×{err.count}</span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
