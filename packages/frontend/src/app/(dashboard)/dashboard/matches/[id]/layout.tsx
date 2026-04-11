'use client'

import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

const TABS = ['overview', 'errors', 'winprob', 'tactics', 'economy', 'replay'] as const
type Tab = (typeof TABS)[number]

const TAB_KEY: Record<Tab, 'tabOverview' | 'tabErrors' | 'tabWinprob' | 'tabTactics' | 'tabEconomy' | 'tabReplay'> = {
  overview: 'tabOverview',
  errors: 'tabErrors',
  winprob: 'tabWinprob',
  tactics: 'tabTactics',
  economy: 'tabEconomy',
  replay: 'tabReplay',
}

export default function MatchLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>()
  const pathname = usePathname()
  const t = useTranslations('match')

  const baseHref = `/dashboard/matches/${id}`
  const activeTab: Tab =
    TABS.find((tab) =>
      tab === 'overview' ? pathname === baseHref : pathname.startsWith(`${baseHref}/${tab}`)
    ) ?? 'overview'

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((tab) => {
          const href = tab === 'overview' ? baseHref : `${baseHref}/${tab}`
          const isActive = activeTab === tab
          return (
            <Link
              key={tab}
              href={href}
              className={cn(
                'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text'
              )}
            >
              {t(TAB_KEY[tab])}
            </Link>
          )
        })}
      </div>
      {children}
    </div>
  )
}
