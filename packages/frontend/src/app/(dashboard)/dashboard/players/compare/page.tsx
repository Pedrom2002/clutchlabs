'use client'

import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import * as playersApi from '@/lib/api/players'
import { QUERY_KEYS } from '@/lib/constants'
import { useUrlState } from '@/hooks/use-url-state'
import { PageHeader } from '@/components/common/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadarChart } from '@/components/charts/radar-chart'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function PlayerComparePage() {
  const t = useTranslations('player')
  const [a, setA] = useUrlState('a', '')
  const [b, setB] = useUrlState('b', '')

  const { data: list } = useQuery({
    queryKey: QUERY_KEYS.players,
    queryFn: () => playersApi.list({ page: 1, page_size: 50 }),
  })

  const { data: statsA } = useQuery({
    queryKey: QUERY_KEYS.playerStats(a),
    queryFn: () => playersApi.stats(a),
    enabled: Boolean(a),
  })
  const { data: statsB } = useQuery({
    queryKey: QUERY_KEYS.playerStats(b),
    queryFn: () => playersApi.stats(b),
    enabled: Boolean(b),
  })

  const radarFor = (s: typeof statsA) =>
    s
      ? [
          { label: t('rolesAim'), value: Math.min(s.avg_headshot_pct * 1.5, 100) },
          { label: t('rolesPosition'), value: Math.min(s.avg_survival_rate, 100) },
          { label: t('rolesSense'), value: Math.min(s.avg_kast_pct, 100) },
          { label: t('rolesClutch'), value: Math.min(s.avg_impact_rating * 50, 100) },
          {
            label: t('rolesUtility'),
            value: Math.min(
              (s.total_flash_assists / Math.max(s.total_rounds, 1)) * 500,
              100
            ),
          },
        ]
      : []

  return (
    <div className="space-y-6">
      <PageHeader title={`${t('title')} · Compare`} />
      <div className="grid gap-2 md:grid-cols-2">
        <Select value={a} onValueChange={setA}>
          <SelectTrigger>
            <SelectValue placeholder="Player A" />
          </SelectTrigger>
          <SelectContent>
            {list?.items?.map((p) => (
              <SelectItem key={p.player_steam_id} value={p.player_steam_id}>
                {p.player_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={b} onValueChange={setB}>
          <SelectTrigger>
            <SelectValue placeholder="Player B" />
          </SelectTrigger>
          <SelectContent>
            {list?.items?.map((p) => (
              <SelectItem key={p.player_steam_id} value={p.player_steam_id}>
                {p.player_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {a && b && statsA && statsB ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {statsA.player_name} <span className="text-muted-foreground">vs</span> {statsB.player_name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadarChart data={radarFor(statsA)} compare={radarFor(statsB)} />
          </CardContent>
        </Card>
      ) : (
        <Skeleton className="h-64 w-full" />
      )}
    </div>
  )
}
