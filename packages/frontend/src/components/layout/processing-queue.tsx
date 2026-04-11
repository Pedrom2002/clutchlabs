'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as demosApi from '@/lib/api/demos'
import { QUERY_KEYS } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth-store'
import { Progress } from '@/components/ui/progress'
import type { Demo, DemoStatus } from '@/types/demo'
import Link from 'next/link'

const PROCESSING_STATUSES: DemoStatus[] = [
  'queued',
  'downloading',
  'parsing',
  'extracting_features',
  'running_models',
]

const STATUS_PROGRESS: Record<DemoStatus, number> = {
  uploaded: 5,
  queued: 10,
  downloading: 20,
  parsing: 40,
  extracting_features: 65,
  running_models: 85,
  completed: 100,
  failed: 100,
  error: 100,
}

export function ProcessingQueue() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [expanded, setExpanded] = useState(false)
  const t = useTranslations('demo')

  const { data } = useQuery({
    queryKey: QUERY_KEYS.demos,
    queryFn: () => demosApi.list({ page: 1, page_size: 20 }),
    enabled: isAuthenticated,
    refetchInterval: 5000,
  })

  const inFlight: Demo[] =
    data?.items?.filter((d) => PROCESSING_STATUSES.includes(d.status)) ?? []
  if (inFlight.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 rounded-lg border border-border bg-card shadow-lg">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          {t('processingPhases')} · {inFlight.length}
        </span>
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>
      {expanded && (
        <ul className="max-h-72 divide-y divide-border overflow-y-auto px-2 pb-2">
          {inFlight.map((demo) => {
            const pct = STATUS_PROGRESS[demo.status] ?? 0
            return (
              <li key={demo.id} className="flex flex-col gap-1 p-2">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/dashboard/demos/${demo.id}`}
                    className="truncate text-xs font-medium hover:text-primary"
                  >
                    {demo.original_filename}
                  </Link>
                  <span className="shrink-0 text-[10px] uppercase text-muted-foreground">
                    {t(demo.status)}
                  </span>
                </div>
                <Progress value={pct} className="h-1" />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
