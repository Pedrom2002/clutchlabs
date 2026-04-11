'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface ShapImportance {
  feature: string
  value: number | string
  impact: number
}

interface ShapWaterfallProps {
  importances: ShapImportance[]
  className?: string
  maxRows?: number
}

export function ShapWaterfall({
  importances,
  className,
  maxRows = 8,
}: ShapWaterfallProps) {
  const sorted = React.useMemo(
    () => [...importances].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).slice(0, maxRows),
    [importances, maxRows]
  )
  const max = Math.max(...sorted.map((s) => Math.abs(s.impact)), 0.01)

  return (
    <div className={cn('space-y-2', className)} role="figure" aria-label="SHAP feature importances">
      {sorted.map((row) => {
        const width = Math.min((Math.abs(row.impact) / max) * 100, 100)
        const positive = row.impact > 0
        return (
          <div key={row.feature} className="grid grid-cols-[minmax(120px,1fr)_2fr_60px] items-center gap-2 text-xs">
            <span className="truncate text-right text-muted-foreground">{row.feature}</span>
            <div className="relative h-5 overflow-hidden rounded-md bg-muted/50">
              <div
                className={cn(
                  'absolute inset-y-0 transition-all',
                  positive ? 'left-1/2 bg-destructive/70' : 'right-1/2 bg-success/70'
                )}
                style={{ width: `${width / 2}%` }}
              />
              <div className="absolute left-1/2 top-0 h-full w-px bg-border" />
            </div>
            <span
              className={cn(
                'text-right font-mono',
                positive ? 'text-destructive' : 'text-success'
              )}
            >
              {positive ? '+' : ''}
              {row.impact.toFixed(2)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
