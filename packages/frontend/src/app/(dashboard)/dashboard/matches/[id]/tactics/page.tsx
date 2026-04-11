'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Activity, BarChart3, Brain } from 'lucide-react'
import * as predictionApi from '@/lib/api/prediction'
import { QUERY_KEYS } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const STRATEGY_DATA = [
  { name: 'A site exec', count: 18, success: 11 },
  { name: 'B site exec', count: 9, success: 4 },
  { name: 'Mid control', count: 14, success: 9 },
  { name: 'Default', count: 22, success: 12 },
  { name: 'Force', count: 4, success: 1 },
]

export default function MatchTacticsPage() {
  const { id } = useParams<{ id: string }>()

  const { data: prediction, isLoading } = useQuery({
    queryKey: QUERY_KEYS.matchPrediction(id),
    queryFn: () => predictionApi.getMatchPrediction(id),
  })

  if (isLoading || !prediction) return <Skeleton className="h-96 w-full" />

  const winProbData = prediction.per_round.map((p) => ({
    round: p.round_number,
    T: Math.round(p.win_prob_t * 100),
    CT: Math.round(p.win_prob_ct * 100),
  }))

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-primary" />
            Round-by-round win probability
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Predicted by the Mamba transformer based on equipment, players alive, and tactical context.
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={winProbData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 12% 18%)" />
              <XAxis dataKey="round" stroke="hsl(240 8% 60%)" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} stroke="hsl(240 8% 60%)" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(240 14% 8%)',
                  border: '1px solid hsl(240 12% 18%)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="T" stroke="hsl(38 92% 50%)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="CT" stroke="hsl(192 100% 50%)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" />
            Strategy distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={STRATEGY_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 12% 18%)" />
              <XAxis dataKey="name" stroke="hsl(240 8% 60%)" tick={{ fontSize: 11 }} />
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
              <Bar dataKey="count" fill="hsl(240 12% 30%)" name="Attempts" />
              <Bar dataKey="success" fill="hsl(24 100% 50%)" name="Success" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Tactical breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            • Strong performance em executes A-site (61% win rate). Os utility lineups são consistentes e os entries chegam coordenados.
          </p>
          <p>
            • B-site executes underperform a 44% — faltam smokes para top mid e a entrada está demasiado isolada.
          </p>
          <p>
            • Defaults longos têm sucesso em 55% das rondas, mas a transição para hit é demasiado lenta (média 75s) — adversários têm tempo de rotacionar.
          </p>
          <p>
            • Em rondas force-buy, win rate baixíssimo (25%) — recomenda-se eco completo em vez.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
