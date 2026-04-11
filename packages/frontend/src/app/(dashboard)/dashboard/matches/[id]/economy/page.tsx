'use client'

import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DollarSign, TrendingUp, Loader2 } from 'lucide-react'
import { api } from '@/lib/api-client'
import type { MatchDetail } from '@/types/demo'

type BuyType = 'eco' | 'force' | 'semi' | 'full' | 'pistol' | null | undefined

const BUY_COLORS: Record<string, string> = {
  pistol: '#a855f7',
  eco: '#ef4444',
  force: '#eab308',
  semi: '#06b6d4',
  full: '#22c55e',
}

function classifyBuy(value: number | null): BuyType {
  if (value == null) return null
  if (value < 2000) return 'pistol'
  if (value < 5000) return 'eco'
  if (value < 15000) return 'force'
  if (value < 20000) return 'semi'
  return 'full'
}

export default function EconomyPage() {
  const { id } = useParams<{ id: string }>()
  const t = useTranslations('economy')

  const { data, isLoading, error } = useQuery({
    queryKey: ['match', id, 'detail'],
    queryFn: () => api.get<MatchDetail>(`/demos/matches/${id}`),
    enabled: !!id,
  })

  const chartData = useMemo(() => {
    if (!data) return []
    return data.rounds.map((r) => ({
      round: r.round_number,
      T: r.t_equipment_value ?? 0,
      CT: r.ct_equipment_value ?? 0,
      tBuy: r.t_buy_type ?? classifyBuy(r.t_equipment_value),
      ctBuy: r.ct_buy_type ?? classifyBuy(r.ct_equipment_value),
      winner: r.winner_side,
    }))
  }, [data])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 text-text-muted animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-16 text-text-muted text-sm">
        {t('noData')}
      </div>
    )
  }

  const hasEconomy = chartData.some((d) => d.T > 0 || d.CT > 0)
  if (!hasEconomy) {
    return (
      <div className="text-center py-16 text-text-muted text-sm">{t('noData')}</div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          {t('title')}
        </h1>
        <p className="text-text-muted text-sm mt-1">{t('subtitle')}</p>
      </div>

      {/* Equipment value bar chart */}
      <section className="bg-bg-card border border-border rounded-xl p-4">
        <h2 className="text-sm font-medium text-text mb-3">{t('equipmentValue')}</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} barGap={0} barCategoryGap="15%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="round" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              tick={{ fill: '#888', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a2e',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(label) => `${t('round')} ${label}`}
              formatter={(value, name) => [`$${Number(value).toLocaleString()}`, String(name)]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={4500} stroke="rgba(255,255,255,0.15)" strokeDasharray="5 5" />
            <Bar dataKey="T" name={t('tSide')} fill="#f59e0b" opacity={0.85} radius={[2, 2, 0, 0]} />
            <Bar dataKey="CT" name={t('ctSide')} fill="#3b82f6" opacity={0.85} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Buy-type prediction chips */}
      <section className="bg-bg-card border border-border rounded-xl p-4">
        <h2 className="text-sm font-medium text-text mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          {t('buyPrediction')}
        </h2>
        <div className="space-y-3">
          {(['T', 'CT'] as const).map((side) => (
            <div key={side}>
              <div
                className={`text-xs font-medium mb-1 ${
                  side === 'T' ? 'text-amber-400' : 'text-blue-400'
                }`}
              >
                {side === 'T' ? t('tSide') : t('ctSide')}
              </div>
              <div className="flex flex-wrap gap-1">
                {chartData.map((d) => {
                  const buy = side === 'T' ? d.tBuy : d.ctBuy
                  const color = BUY_COLORS[String(buy)] ?? '#555'
                  return (
                    <div
                      key={`${side}-${d.round}`}
                      title={`R${d.round} ${buy ?? '-'}`}
                      className="text-[10px] px-2 py-0.5 rounded border font-medium"
                      style={{
                        color,
                        borderColor: `${color}55`,
                        backgroundColor: `${color}14`,
                      }}
                    >
                      {d.round}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          <div className="flex gap-3 pt-2 border-t border-border text-[10px] text-text-dim">
            {Object.entries(BUY_COLORS).map(([k, c]) => (
              <span key={k} className="flex items-center gap-1 capitalize">
                <span className="w-2 h-2 rounded" style={{ backgroundColor: c }} />
                {k}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline line chart */}
      <section className="bg-bg-card border border-border rounded-xl p-4">
        <h2 className="text-sm font-medium text-text mb-3">{t('timeline')}</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="round" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              tick={{ fill: '#888', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a2e',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line type="monotone" dataKey="T" stroke="#f59e0b" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="CT" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </div>
  )
}
