'use client'

import { AlertTriangle, TrendingUp } from 'lucide-react'

interface WeaknessProfileProps {
  weaknesses: string[]
  strengths: string[]
}

export function WeaknessProfile({ weaknesses, strengths }: WeaknessProfileProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3 text-red-400 text-sm font-medium">
          <AlertTriangle className="h-4 w-4" />
          Weaknesses
        </div>
        {weaknesses.length === 0 ? (
          <p className="text-text-dim text-xs italic">No weaknesses recorded</p>
        ) : (
          <ul className="space-y-1.5">
            {weaknesses.map((w, i) => (
              <li
                key={i}
                className="text-sm text-text-muted pl-3 border-l-2 border-red-500/40"
              >
                {w}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="bg-bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3 text-green-400 text-sm font-medium">
          <TrendingUp className="h-4 w-4" />
          Strengths
        </div>
        {strengths.length === 0 ? (
          <p className="text-text-dim text-xs italic">No strengths recorded</p>
        ) : (
          <ul className="space-y-1.5">
            {strengths.map((s, i) => (
              <li
                key={i}
                className="text-sm text-text-muted pl-3 border-l-2 border-green-500/40"
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
