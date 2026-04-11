'use client'

import { Clock, Star } from 'lucide-react'
import type { ScoutReport } from '@/lib/api-client'

export function ScoutReportView({ report }: { report: ScoutReport }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-text-muted text-xs mb-1">Player</div>
          <div className="font-mono text-sm">{report.player_steam_id}</div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-primary">
            <Star className="h-4 w-4" />
            <span className="text-lg font-bold">{report.rating.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-end gap-1 text-[10px] text-text-dim mt-1">
            <Clock className="h-3 w-3" />
            {new Date(report.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  )
}
