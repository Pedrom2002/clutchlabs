import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

interface StatCardProps {
  label: string
  value: React.ReactNode
  icon?: LucideIcon
  trend?: number // positive = good (up), negative = bad (down)
  trendLabel?: string
  className?: string
  loading?: boolean
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  className,
  loading,
}: StatCardProps) {
  const trendDir = trend == null ? null : trend >= 0 ? 'up' : 'down'

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="mt-2 font-mono text-3xl font-bold tracking-tight">
          {loading ? <span className="opacity-30">—</span> : value}
        </div>
        {trend != null && (
          <div
            className={cn(
              'mt-2 flex items-center gap-1 text-xs font-medium',
              trendDir === 'up' ? 'text-success' : 'text-destructive'
            )}
          >
            {trendDir === 'up' ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            <span>
              {trend > 0 ? '+' : ''}
              {trend}
              {typeof trend === 'number' && Math.abs(trend) < 10 ? '%' : ''}
            </span>
            {trendLabel && <span className="text-muted-foreground">{trendLabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
