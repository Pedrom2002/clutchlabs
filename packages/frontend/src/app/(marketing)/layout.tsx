import Link from 'next/link'
import { Crosshair } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/button'
import { ThemeSwitcher } from '@/components/layout/theme-switcher'
import { LanguageSwitcher } from '@/components/layout/language-switcher'

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('common')
  const tAuth = await getTranslations('auth')

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <Crosshair className="h-6 w-6 text-primary" />
            <span>{t('appName')}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/pricing"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              Pricing
            </Link>
            <ThemeSwitcher />
            <LanguageSwitcher />
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">{tAuth('login')}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">{tAuth('signUp')}</Link>
            </Button>
          </div>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} {t('appName')}. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
