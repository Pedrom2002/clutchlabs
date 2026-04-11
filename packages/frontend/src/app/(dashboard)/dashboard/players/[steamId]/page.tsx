'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Crosshair, Sparkles, Target, Zap } from 'lucide-react'
import * as playersApi from '@/lib/api/players'
import * as trainingApi from '@/lib/api/training'
import { QUERY_KEYS, mapName } from '@/lib/constants'
import { formatRating } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/page-header'
import { StatCard } from '@/components/common/stat-card'
import { RadarChart } from '@/components/charts/radar-chart'
import { WeaknessProfileCard } from '@/components/analytics/weakness-profile'

export default function PlayerProfilePage() {
  const { steamId } = useParams<{ steamId: string }>()
  const router = useRouter()
  const t = useTranslations('player')

  const { data: stats, isLoading } = useQuery({
    queryKey: QUERY_KEYS.playerStats(steamId),
    queryFn: () => playersApi.stats(steamId),
  })

  const { data: errSummary } = useQuery({
    queryKey: QUERY_KEYS.playerErrors(steamId),
    queryFn: () => playersApi.errorsSummary(steamId),
    retry: false,
  })

  const { data: weakness, isLoading: weaknessLoading } = useQuery({
    queryKey: QUERY_KEYS.playerWeakness(steamId),
    queryFn: () => trainingApi.getWeakness(steamId),
  })

  if (isLoading || !stats) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    )
  }

  const radarData = [
    { label: t('rolesAim'), value: Math.min(stats.avg_headshot_pct * 1.5, 100) },
    { label: t('rolesPosition'), value: Math.min(stats.avg_survival_rate, 100) },
    { label: t('rolesSense'), value: Math.min(stats.avg_kast_pct, 100) },
    { label: t('rolesClutch'), value: Math.min(stats.avg_impact_rating * 50, 100) },
    {
      label: t('rolesUtility'),
      value: Math.min(
        (stats.total_flash_assists / Math.max(stats.total_rounds, 1)) * 500,
        100
      ),
    },
  ]

  const mapEntries = Object.entries(stats.maps_played).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <PageHeader
        title={stats.player_name}
        description={`${stats.total_matches} matches · ${stats.total_rounds} rounds`}
        actions={
          <Button asChild>
            <Link href={`/dashboard/players/${steamId}/training`}>
              {t('viewTrainingPlan')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      {/* Top stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="HLTV Rating"
          value={formatRating(stats.avg_hltv_rating)}
          icon={Sparkles}
        />
        <StatCard label={t('kdRatio')} value={stats.avg_kd_ratio.toFixed(2)} icon={Crosshair} />
        <StatCard label="ADR" value={stats.avg_adr.toFixed(0)} icon={Target} />
        <StatCard
          label={t('headshotPct')}
          value={`${stats.avg_headshot_pct.toFixed(0)}%`}
          icon={Zap}
        />
      </div>

      {/* Radar + weakness profile */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('performanceRadar')}</CardTitle>
          </CardHeader>
          <CardContent>
            <RadarChart data={radarData} />
          </CardContent>
        </Card>
        <WeaknessProfileCard profile={weakness ?? null} loading={weaknessLoading} />
      </div>

      {/* Career totals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" />
            Career totals
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3 text-center font-medium">Kills</th>
                <th className="px-4 py-3 text-center font-medium">Deaths</th>
                <th className="px-4 py-3 text-center font-medium">Assists</th>
                <th className="px-4 py-3 text-center font-medium">HS</th>
                <th className="px-4 py-3 text-center font-medium">First</th>
                <th className="px-4 py-3 text-center font-medium">Clutch</th>
                <th className="px-4 py-3 text-center font-medium">3K+</th>
                <th className="px-4 py-3 text-center font-medium">4K+</th>
                <th className="px-4 py-3 text-center font-medium">Aces</th>
              </tr>
            </thead>
            <tbody>
              <tr className="font-mono">
                <td className="px-4 py-3 text-center font-bold">{stats.total_kills}</td>
                <td className="px-4 py-3 text-center">{stats.total_deaths}</td>
                <td className="px-4 py-3 text-center">{stats.total_assists}</td>
                <td className="px-4 py-3 text-center">{stats.total_headshot_kills}</td>
                <td className="px-4 py-3 text-center">{stats.total_first_kills}</td>
                <td className="px-4 py-3 text-center">{stats.total_clutch_wins}</td>
                <td className="px-4 py-3 text-center">{stats.total_multi_kills_3k}</td>
                <td className="px-4 py-3 text-center">{stats.total_multi_kills_4k}</td>
                <td className="px-4 py-3 text-center">{stats.total_multi_kills_5k}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Errors */}
      {errSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Error analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-secondary p-3 text-center">
                <p className="font-mono text-xl font-bold">{errSummary.total_errors}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="rounded-lg bg-secondary p-3 text-center">
                <p className="font-mono text-xl font-bold text-destructive">
                  {errSummary.critical_count}
                </p>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
              <div className="rounded-lg bg-secondary p-3 text-center">
                <p className="font-mono text-xl font-bold">{errSummary.positioning_errors}</p>
                <p className="text-xs text-muted-foreground">Positioning</p>
              </div>
              <div className="rounded-lg bg-secondary p-3 text-center">
                <p className="font-mono text-xl font-bold">{errSummary.utility_errors}</p>
                <p className="text-xs text-muted-foreground">Utility</p>
              </div>
            </div>
            {errSummary.top_recommendations.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Top recommendations
                </p>
                {errSummary.top_recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-primary/30 bg-primary/5 p-3"
                  >
                    <p className="text-sm font-medium text-primary">{rec.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{rec.description}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Maps */}
      {mapEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('performanceByMap')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {mapEntries.map(([map, count]) => (
                <Badge
                  key={map}
                  variant={map === stats.best_map ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {mapName(map)}
                  <span className="ml-1.5 opacity-75">×{count}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
