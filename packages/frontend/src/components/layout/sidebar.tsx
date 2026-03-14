'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Crosshair,
  FileUp,
  Home,
  Map,
  Settings,
  Shield,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: Home },
  { href: '/dashboard/demos', label: 'Demos', icon: FileUp },
  { href: '/dashboard/matches', label: 'Matches', icon: Crosshair },
  { href: '/dashboard/players', label: 'Players', icon: Users },
  { href: '/dashboard/maps', label: 'Maps', icon: Map },
  { href: '/dashboard/tactics', label: 'Tactics', icon: Shield },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 border-r border-border bg-bg-card flex flex-col h-screen sticky top-0">
      <div className="h-16 flex items-center px-5 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <Crosshair className="h-5 w-5 text-primary" />
          <span className="text-sm">AI CS2 Analytics</span>
        </Link>
      </div>
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary-dim text-primary font-medium'
                  : 'text-text-muted hover:text-text hover:bg-bg-elevated'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
