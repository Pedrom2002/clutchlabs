'use client'

import { Bell } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Notification {
  id: string
  type: 'demo' | 'error' | 'scout' | 'invite'
  title: string
  description: string
  created_at: string
  read: boolean
}

const mockNotifications: Notification[] = [
  {
    id: 'n1',
    type: 'demo',
    title: 'Demo processada',
    description: 'mirage-vs-faze.dem está pronta para análise',
    created_at: new Date(Date.now() - 3 * 60_000).toISOString(),
    read: false,
  },
  {
    id: 'n2',
    type: 'error',
    title: 'Erro crítico detetado',
    description: 'Player1 — overaggressive peek em Mirage round 14',
    created_at: new Date(Date.now() - 25 * 60_000).toISOString(),
    read: false,
  },
  {
    id: 'n3',
    type: 'scout',
    title: 'Scout report pronto',
    description: 'Natus Vincere — 12 matches analisados',
    created_at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    read: true,
  },
]

export function NotificationsBell() {
  const [items, setItems] = useState<Notification[]>(mockNotifications)
  const t = useTranslations('notifications')
  const unread = items.filter((n) => !n.read).length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t('title')}>
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span
              className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-destructive"
              aria-label={`${unread} unread`}
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>{t('title')}</span>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => setItems((arr) => arr.map((i) => ({ ...i, read: true })))}
              className="text-xs font-normal text-primary hover:underline"
            >
              {t('markAllRead')}
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            {t('noNotifications')}
          </div>
        ) : (
          <ScrollArea className="h-72">
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`flex flex-col gap-1 px-3 py-3 ${n.read ? 'opacity-70' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium">{n.title}</span>
                    {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{n.description}</p>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
