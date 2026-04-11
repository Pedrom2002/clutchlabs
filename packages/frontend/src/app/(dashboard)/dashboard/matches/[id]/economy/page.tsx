'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { DollarSign } from 'lucide-react'
import * as matchesApi from '@/lib/api/matches'
import { QUERY_KEYS, BUY_TYPE_LABELS } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

export default function MatchEconomyPage() {
  const { id } = useParams<{ id: string }>()
  const t = useTranslations('match')

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.matchEconomy(id),
    queryFn: () => matchesApi.economy(id),
  })

  if (isLoading || !data) {
    return <Skeleton className="h-80 w-full" />
  }

  const chartData = data.rounds.map((r) => ({
    round: r.round_number,
    T: r.t_equipment_value ?? 0,
    CT: r.ct_equipment_value ?? 0,
  }))

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-primary" />
            {t('economyChart')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 12% 18%)" />
              <XAxis dataKey="round" stroke="hsl(240 8% 60%)" tick={{ fontSize: 11 }} />
              <YAxis stroke="hsl(240 8% 60%)" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(240 14% 8%)',
                  border: '1px solid hsl(240 12% 18%)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend />
              <Bar dataKey="T" fill="hsl(38 92% 50%)" />
              <Bar dataKey="CT" fill="hsl(192 100% 50%)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-round breakdown</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3 text-center">R</th>
                <th className="px-4 py-3 text-center">Winner</th>
                <th className="px-4 py-3 text-center">T equip</th>
                <th className="px-4 py-3 text-center">CT equip</th>
                <th className="px-4 py-3 text-center">T buy</th>
                <th className="px-4 py-3 text-center">CT buy</th>
                <th className="px-4 py-3 text-center">Score</th>
              </tr>
            </thead>
            <tbody>
              {data.rounds.map((r) => (
                <tr key={r.round_number} className="border-b border-border hover:bg-secondary/40">
                  <td className="px-4 py-2.5 text-center font-mono">{r.round_number}</td>
                  <td className="px-4 py-2.5 text-center">
                    {r.winner_side ? <Badge variant="secondary">{r.winner_side}</Badge> : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center font-mono">
                    ${r.t_equipment_value?.toLocaleString() ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center font-mono">
                    ${r.ct_equipment_value?.toLocaleString() ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center text-xs text-muted-foreground">
                    {r.t_buy_type ? BUY_TYPE_LABELS[r.t_buy_type] ?? r.t_buy_type : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center text-xs text-muted-foreground">
                    {r.ct_buy_type ? BUY_TYPE_LABELS[r.ct_buy_type] ?? r.ct_buy_type : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center font-mono text-xs">
                    {r.team1_score} - {r.team2_score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
