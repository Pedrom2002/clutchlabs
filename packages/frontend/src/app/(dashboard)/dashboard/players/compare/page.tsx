'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Loader2, Plus, Users, X } from 'lucide-react'
import { playersApi, type PlayerCompareResponse, type PlayerCompareRow } from '@/lib/api-client'
import { RadarChart, type RadarSeries } from '@/components/charts/radar-chart'
import type { PlayerAggregatedStats } from '@/types/demo'
import { api } from '@/lib/api-client'

const SERIES_COLORS = ['#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#06b6d4']

/**
 * Adapts raw aggregated stats into a compare row — used as a fallback when
 * the /players/compare endpoint is not yet available server-side.
 */
function statsToRow(s: PlayerAggregatedStats): PlayerCompareRow {
  const kills = s.total_kills
  const hsPct = kills > 0 ? (s.total_headshot_kills / kills) * 100 : 0
  return {
    player_steam_id: s.player_steam_id,
    player_name: s.player_name,
    rating: s.avg_hltv_rating,
    kd: s.avg_kd_ratio,
    hs_pct: hsPct,
    adr: s.avg_adr,
    util_damage: s.total_utility_damage / Math.max(s.total_matches, 1),
  }
}

function normalize(row: PlayerCompareRow): number[] {
  // Normalize onto a 0..100 radar scale using reasonable CS2 caps.
  return [
    Math.min((row.rating / 2) * 100, 100),
    Math.min((row.kd / 2) * 100, 100),
    Math.min(row.hs_pct, 100),
    Math.min((row.adr / 150) * 100, 100),
    Math.min((row.util_damage / 400) * 100, 100),
  ]
}

export default function PlayerComparePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const t = useTranslations('compare')

  const steamIds = useMemo(() => searchParams.getAll('steamId'), [searchParams])

  const [newId, setNewId] = useState('')

  const query = useQuery({
    queryKey: ['players', 'compare', steamIds],
    queryFn: async (): Promise<PlayerCompareRow[]> => {
      if (steamIds.length < 2) return []
      try {
        const res = await playersApi.compare(steamIds)
        return (res as PlayerCompareResponse).players
      } catch {
        // Fallback — fetch per-player stats and adapt.
        const rows = await Promise.all(
          steamIds.map((id) =>
            api
              .get<PlayerAggregatedStats>(`/players/${id}/stats`)
              .then(statsToRow)
              .catch(() => null)
          )
        )
        return rows.filter((r): r is PlayerCompareRow => r !== null)
      }
    },
    enabled: steamIds.length >= 2,
    retry: false,
  })

  const updateSteamIds = (ids: string[]) => {
    const params = new URLSearchParams()
    ids.forEach((id) => params.append('steamId', id))
    router.push(`/dashboard/players/compare?${params.toString()}`)
  }

  const addSteamId = () => {
    if (!newId.trim()) return
    updateSteamIds([...steamIds, newId.trim()])
    setNewId('')
  }

  const removeSteamId = (id: string) => {
    updateSteamIds(steamIds.filter((s) => s !== id))
  }

  const metrics = [
    t('metricRating'),
    t('metricKd'),
    t('metricHs'),
    t('metricAdr'),
    t('metricUtil'),
  ]

  const series: RadarSeries[] =
    query.data?.map((row, i) => ({
      label: row.player_name,
      color: SERIES_COLORS[i % SERIES_COLORS.length],
      values: normalize(row),
    })) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          {t('title')}
        </h1>
        <p className="text-text-muted text-sm mt-1">{t('subtitle')}</p>
      </div>

      {/* Current players + add form */}
      <div className="bg-bg-card border border-border rounded-xl p-4">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {steamIds.map((id) => (
            <button
              key={id}
              onClick={() => removeSteamId(id)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-bg-elevated border border-border text-xs font-mono"
            >
              {id}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSteamId()}
            placeholder={t('addPlayer')}
            className="flex-1 bg-bg-elevated border border-border rounded px-3 py-1.5 text-sm font-mono"
          />
          <button
            onClick={addSteamId}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-primary text-white text-sm"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {steamIds.length < 2 && (
        <div className="text-center py-12 text-text-muted text-sm">{t('noPlayers')}</div>
      )}

      {query.isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 text-text-muted animate-spin" />
        </div>
      )}

      {query.data && query.data.length >= 2 && (
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <RadarChart metrics={metrics} series={series} size={380} />
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {series.map((s) => (
              <span key={s.label} className="flex items-center gap-1.5 text-xs">
                <span
                  className="inline-block w-3 h-3 rounded-sm"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
              </span>
            ))}
          </div>

          {/* Raw comparison table */}
          <div className="overflow-x-auto mt-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-xs">
                  <th className="px-3 py-2 text-left font-medium">Player</th>
                  <th className="px-3 py-2 text-center font-medium">{t('metricRating')}</th>
                  <th className="px-3 py-2 text-center font-medium">{t('metricKd')}</th>
                  <th className="px-3 py-2 text-center font-medium">{t('metricHs')}</th>
                  <th className="px-3 py-2 text-center font-medium">{t('metricAdr')}</th>
                  <th className="px-3 py-2 text-center font-medium">{t('metricUtil')}</th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((row) => (
                  <tr key={row.player_steam_id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium">{row.player_name}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{row.rating.toFixed(2)}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{row.kd.toFixed(2)}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{row.hs_pct.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-center tabular-nums">{row.adr.toFixed(1)}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{row.util_damage.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
