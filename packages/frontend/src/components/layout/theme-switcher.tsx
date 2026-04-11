'use client'

import { Moon, Sun } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useTheme } from '@/lib/theme'
import { Button } from '@/components/ui/button'

export function ThemeSwitcher() {
  const { theme, toggle } = useTheme()
  const t = useTranslations('common')

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={t('toggleTheme')}>
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
