'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Clock, Loader2, Plus, Star } from 'lucide-react'
import { scoutApi, type ScoutReport } from '@/lib/api-client'

export default function ScoutListPage() {
  const t = useTranslations('scout')

  const { data, isLoading, error } = useQuery({
    queryKey: ['scout', 'list'],
    queryFn: () => scoutApi.list(),
    retry: false,
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">{t('title')}</h1>
          <p className="text-text-muted text-sm mt-1">{t('subtitle')}</p>
        </div>
        <Link
          href="/dashboard/scout/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/80 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('newReport')}
        </Link>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 text-text-muted animate-spin" />
        </div>
      )}

      {!isLoading && error && (
        <div className="text-center py-16 text-text-muted text-sm">
          {t('noReports')}
        </div>
      )}

      {!isLoading && !error && data && data.length === 0 && (
        <div className="text-center py-16">
          <p className="text-text-muted text-sm mb-3">{t('noReports')}</p>
          <Link
            href="/dashboard/scout/new"
            className="text-primary text-sm hover:underline"
          >
            {t('createFirst')}
          </Link>
        </div>
      )}

      {!isLoading && !error && data && data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((r: ScoutReport) => (
            <Link
              key={r.id}
              href={`/dashboard/scout/${r.id}`}
              className="bg-bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-text-muted text-xs mb-0.5">
                    {t('playerSteamId')}
                  </div>
                  <div className="font-mono text-sm">{r.player_steam_id}</div>
                </div>
                <div className="flex items-center gap-1 text-primary">
                  <Star className="h-4 w-4" />
                  <span className="text-lg font-bold tabular-nums">
                    {r.rating.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-text-dim">
                <span>{r.weaknesses.length} weaknesses</span>
                <span>{r.strengths.length} strengths</span>
                <span>{r.training_plan.length} training items</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-text-dim mt-2">
                <Clock className="h-3 w-3" />
                {new Date(r.created_at).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
