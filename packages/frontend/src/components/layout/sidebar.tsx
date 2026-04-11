'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  BarChart3,
  Crosshair,
  FileUp,
  Home,
  LineChart,
  Settings,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface NavItem {
  href: string
  labelKey: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { href: '/dashboard', labelKey: 'overview', icon: Home },
  { href: '/dashboard/demos', labelKey: 'demos', icon: FileUp },
  { href: '/dashboard/matches', labelKey: 'matches', icon: BarChart3 },
  { href: '/dashboard/players', labelKey: 'players', icon: Users },
  { href: '/dashboard/scout', labelKey: 'scout', icon: LineChart },
  { href: '/dashboard/pro', labelKey: 'proMatches', icon: Trophy },
  { href: '/dashboard/analytics', labelKey: 'analytics', icon: BarChart3 },
  { href: '/dashboard/settings', labelKey: 'settings', icon: Settings },
]

interface SidebarProps {
  collapsed?: boolean
  onNavigate?: () => void
}

export function SidebarContent({ collapsed = false, onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const tCommon = useTranslations('common')

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          'flex h-16 items-center border-b border-border px-5',
          collapsed ? 'justify-center px-3' : 'justify-between'
        )}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-bold text-foreground"
          onClick={onNavigate}
        >
          <Crosshair className="h-5 w-5 shrink-0 text-primary" />
          {!collapsed && <span className="text-sm">{tCommon('appName')}</span>}
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3" aria-label="Main navigation">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/')
          const linkContent = (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                collapsed && 'justify-center px-2',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{t(item.labelKey)}</span>}
            </Link>
          )
          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right">{t(item.labelKey)}</TooltipContent>
              </Tooltip>
            )
          }
          return linkContent
        })}
      </nav>
      <div className="border-t border-border p-3 text-[11px] text-muted-foreground">
        {!collapsed && <p className="px-2">v0.1.0 · beta</p>}
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside
      className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-border bg-card lg:flex"
      aria-label="Sidebar"
    >
      <SidebarContent />
    </aside>
  )
}
