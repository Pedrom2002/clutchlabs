'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { AlertCircle, Brain, Loader2, MapPin, Users } from 'lucide-react'
import { matchesApi, type TacticsResponse, type TacticsStrategyType } from '@/lib/api-client'

const STRATEGY_COLORS: Record<TacticsStrategyType, string> = {
  default: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  rush: 'bg-red-500/15 text-red-300 border-red-500/30',
  eco: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
  force: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  execute: 'bg-green-500/15 text-green-300 border-green-500/30',
}

function TacticsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-64 bg-bg-elevated rounded animate-pulse" />
      <div className="h-4 w-96 bg-bg-elevated rounded animate-pulse" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 bg-bg-card border border-border rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default function TacticsPage() {
  const { id } = useParams<{ id: string }>()
  const t = useTranslations('tactics')

  const { data, isLoading, isError } = useQuery<TacticsResponse>({
    queryKey: ['match', id, 'tactics'],
    queryFn: () => matchesApi.getTactics(id),
    enabled: !!id,
    retry: false,
  })

  if (isLoading) return <TacticsSkeleton />

  if (isError || !data) {
    return (
      <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
        <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-medium text-red-300">{t('loadError')}</div>
        </div>
      </div>
    )
  }

  const strategyKey = (s: TacticsStrategyType) =>
    `strategy${s[0].toUpperCase()}${s.slice(1)}` as
      | 'strategyDefault'
      | 'strategyRush'
      | 'strategyEco'
      | 'strategyForce'
      | 'strategyExecute'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          {t('title')}
        </h1>
        <p className="text-text-muted text-sm mt-1">{t('subtitle')}</p>
      </div>

      {/* Team tendencies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-400 mb-3">
            <MapPin className="h-4 w-4" />
            {t('ctPreferredSites')}
          </div>
          {data.team_tendencies.ct_preferred_sites.length === 0 ? (
            <p className="text-text-dim text-xs italic">—</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {data.team_tendencies.ct_preferred_sites.map((site) => (
                <span
                  key={site}
                  className="px-2 py-0.5 rounded border border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs"
                >
                  {site}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-400 mb-3">
            <MapPin className="h-4 w-4" />
            {t('tPreferredExecutes')}
          </div>
          {data.team_tendencies.t_preferred_executes.length === 0 ? (
            <p className="text-text-dim text-xs italic">—</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {data.team_tendencies.t_preferred_executes.map((ex) => (
                <span
                  key={ex}
                  className="px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs"
                >
                  {ex}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rounds */}
      <section>
        <h2 className="text-sm font-medium text-text mb-3">{t('roundStrategies')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.rounds.map((r) => (
            <div
              key={`${r.round_number}-${r.side}`}
              className="bg-bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">R{r.round_number}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      r.side === 'T'
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'bg-blue-500/15 text-blue-300'
                    }`}
                  >
                    {r.side}
                  </span>
                </div>
                <span className="text-[10px] text-text-dim tabular-nums">
                  {Math.round(r.confidence * 100)}%
                </span>
              </div>
              <div
                className={`inline-block px-2 py-0.5 rounded border text-xs font-medium mb-2 ${STRATEGY_COLORS[r.strategy_type]}`}
              >
                {t(strategyKey(r.strategy_type))}
              </div>
              <p className="text-xs text-text-muted mb-2">{r.description}</p>
              {r.key_players.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap text-[10px] text-text-dim">
                  <Users className="h-3 w-3" />
                  {r.key_players.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
