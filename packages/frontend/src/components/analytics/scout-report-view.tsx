'use client'

import { useTranslations } from 'next-intl'
import {
  AlertTriangle,
  CheckCircle2,
  Map as MapIcon,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import type { ScoutReport } from '@/types/scout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { mapName } from '@/lib/constants'

interface Props {
  report: ScoutReport
}

export function ScoutReportView({ report }: Props) {
  const t = useTranslations('scout')

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="leading-relaxed text-muted-foreground">{report.summary}</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">{t('createdAt')}</p>
              <p className="font-mono text-sm">
                {new Date(report.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Matches</p>
              <p className="font-mono text-sm">{report.matches_analyzed}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Maps</p>
              <p className="font-mono text-sm">{report.maps.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Players</p>
              <p className="font-mono text-sm">{report.key_players.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-success" />
              {t('strongMaps')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.maps
              .filter((m) => report.strong_maps.includes(m.map))
              .map((m) => (
                <div key={m.map}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{mapName(m.map)}</span>
                    <span className="font-mono text-xs">
                      {Math.round(m.win_rate * 100)}% · {m.matches_played}M
                    </span>
                  </div>
                  <Progress value={m.win_rate * 100} className="mt-1" />
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-warning" />
              {t('weakMaps')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.maps
              .filter((m) => report.weak_maps.includes(m.map))
              .map((m) => (
                <div key={m.map}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{mapName(m.map)}</span>
                    <span className="font-mono text-xs">
                      {Math.round(m.win_rate * 100)}% · {m.matches_played}M
                    </span>
                  </div>
                  <Progress value={m.win_rate * 100} className="mt-1" />
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            {t('tacticalTrends')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {report.tactical_trends.map((tt) => (
            <div
              key={tt.id}
              className="rounded-md border border-border bg-secondary/40 p-3"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{mapName(tt.map)}</Badge>
                <Badge variant={tt.side === 'T' ? 'warning' : 'minor'}>{tt.side}</Badge>
                <Badge variant="secondary">{tt.category}</Badge>
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  {Math.round(tt.frequency * 100)}% · {Math.round(tt.success_rate * 100)}% win
                </span>
              </div>
              <p className="text-sm">{tt.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            {t('keyPlayers')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {report.key_players.map((p) => (
              <div
                key={p.steam_id}
                className="rounded-md border border-border bg-secondary/40 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium">{p.name}</p>
                  <Badge variant="outline">{p.role}</Badge>
                </div>
                <p className="font-mono text-lg">{p.rating.toFixed(2)}</p>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <p>
                    <span className="text-success">+</span> {p.primary_strength}
                  </p>
                  <p>
                    <span className="text-destructive">−</span> {p.primary_weakness}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapIcon className="h-4 w-4 text-primary" />
            {t('counterStrategies')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {report.counter_strategies.map((cs) => (
            <div key={cs.id} className="rounded-md border border-primary/30 bg-primary/5 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="font-medium text-primary">{cs.title}</p>
                <Badge variant="secondary">{cs.difficulty}</Badge>
                <span className="ml-auto font-mono text-xs text-success">
                  +{Math.round(cs.expected_win_rate_delta * 100)}% win
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{cs.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {cs.applies_to_maps.map((m) => (
                  <Badge key={m} variant="outline" className="text-xs">
                    {mapName(m)}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
