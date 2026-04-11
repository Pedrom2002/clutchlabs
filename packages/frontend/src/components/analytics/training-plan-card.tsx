'use client'

import { Target } from 'lucide-react'

interface TrainingPlanCardProps {
  title?: string
  items: string[]
  emptyMessage?: string
}

export function TrainingPlanCard({
  title = 'Training Plan',
  items,
  emptyMessage = 'No training items yet.',
}: TrainingPlanCardProps) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3 text-primary text-sm font-medium">
        <Target className="h-4 w-4" />
        {title}
      </div>
      {items.length === 0 ? (
        <p className="text-text-dim text-xs italic">{emptyMessage}</p>
      ) : (
        <ol className="space-y-2">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-sm text-text-muted"
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-semibold flex items-center justify-center">
                {i + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
