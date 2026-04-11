'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  BarChart3,
  FileUp,
  Home,
  LineChart,
  LogOut,
  Moon,
  Settings,
  Sun,
  Trophy,
  Upload,
  Users,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useTheme } from '@/lib/theme'
import { useAuthStore } from '@/stores/auth-store'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const logout = useAuthStore((s) => s.logout)
  const t = useTranslations('command')
  const tNav = useTranslations('nav')

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const go = (path: string) => {
    setOpen(false)
    router.push(path)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t('placeholder')} />
      <CommandList>
        <CommandEmpty>{t('noResults')}</CommandEmpty>

        <CommandGroup heading={t('navigation')}>
          <CommandItem onSelect={() => go('/dashboard')}>
            <Home className="h-4 w-4" />
            <span>{tNav('dashboard')}</span>
          </CommandItem>
          <CommandItem onSelect={() => go('/dashboard/demos')}>
            <FileUp className="h-4 w-4" />
            <span>{tNav('demos')}</span>
          </CommandItem>
          <CommandItem onSelect={() => go('/dashboard/matches')}>
            <BarChart3 className="h-4 w-4" />
            <span>{tNav('matches')}</span>
          </CommandItem>
          <CommandItem onSelect={() => go('/dashboard/players')}>
            <Users className="h-4 w-4" />
            <span>{tNav('players')}</span>
          </CommandItem>
          <CommandItem onSelect={() => go('/dashboard/scout')}>
            <LineChart className="h-4 w-4" />
            <span>{tNav('scout')}</span>
          </CommandItem>
          <CommandItem onSelect={() => go('/dashboard/pro')}>
            <Trophy className="h-4 w-4" />
            <span>{tNav('proMatches')}</span>
          </CommandItem>
          <CommandItem onSelect={() => go('/dashboard/settings')}>
            <Settings className="h-4 w-4" />
            <span>{tNav('settings')}</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t('actions')}>
          <CommandItem onSelect={() => go('/dashboard/demos?upload=1')}>
            <Upload className="h-4 w-4" />
            <span>{t('uploadDemo')}</span>
          </CommandItem>
          <CommandItem onSelect={() => go('/dashboard/scout/new')}>
            <LineChart className="h-4 w-4" />
            <span>{t('newScoutReport')}</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              toggle()
              setOpen(false)
            }}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{t('toggleTheme')}</span>
          </CommandItem>
          <CommandItem
            onSelect={async () => {
              setOpen(false)
              await logout()
              router.push('/login')
            }}
          >
            <LogOut className="h-4 w-4" />
            <span>{t('logout')}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

export function CommandPaletteTrigger() {
  const t = useTranslations('common')
  return (
    <button
      type="button"
      onClick={() => {
        const evt = new KeyboardEvent('keydown', { key: 'k', metaKey: true })
        document.dispatchEvent(evt)
      }}
      className="hidden h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-xs text-muted-foreground transition-colors hover:bg-secondary md:flex md:w-64 lg:w-80"
      aria-label={t('search')}
    >
      <span className="flex-1 text-left">{t('search')}…</span>
      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        ⌘K
      </kbd>
    </button>
  )
}
