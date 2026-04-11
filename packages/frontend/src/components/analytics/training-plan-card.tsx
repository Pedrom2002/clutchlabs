'use client'

import { useTranslations } from 'next-intl'
import { Dumbbell } from 'lucide-react'
import type { TrainingArea } from '@/types/training'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface Props {
  area: TrainingArea
}

const PRIORITY_VARIANT: Record<string, BadgeProps['variant']> = {
  high: 'critical',
  medium: 'major',
  low: 'minor',
}

export function TrainingPlanCard({ area }: Props) {
  const t = useTranslations('player')

  // Compute progress 0..1 from current → target.
  const range = Math.abs(area.target_value - area.pro_value)
  const progress =
    area.direction === 'lower-is-better'
      ? Math.max(
          0,
          Math.min(1, 1 - (area.current_value - area.target_value) / Math.max(range, 0.01))
        )
      : Math.max(
          0,
          Math.min(1, area.current_value / Math.max(area.target_value, 0.01))
        )

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{area.display_name}</CardTitle>
          <Badge variant={PRIORITY_VARIANT[area.priority] ?? 'secondary'}>
            {t(area.priority)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {t('current')}: <span className="font-mono text-foreground">{area.current_value.toFixed(2)}</span>
          </span>
          <span>
            {t('target')}: <span className="font-mono text-foreground">{area.target_value.toFixed(2)}</span>
          </span>
          <span>
            {t('pro')}: <span className="font-mono text-foreground">{area.pro_value.toFixed(2)}</span>
          </span>
        </div>
        <Progress value={progress * 100} />
        <p className="text-xs text-muted-foreground">{area.rationale}</p>

        {area.drills.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('drill')}
            </p>
            {area.drills.map((d) => (
              <div
                key={d.id}
                className="flex items-start gap-3 rounded-md border border-border bg-secondary/40 p-2"
              >
                <Dumbbell className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{d.title}</p>
                  <p className="text-xs text-muted-foreground">{d.description}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {d.est_minutes}min · {d.difficulty}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
