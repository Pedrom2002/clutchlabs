'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { SidebarContent } from '@/components/layout/sidebar'
import { ThemeSwitcher } from '@/components/layout/theme-switcher'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import { UserMenu } from '@/components/layout/user-menu'
import { NotificationsBell } from '@/components/layout/notifications-bell'
import { TeamSwitcher } from '@/components/layout/team-switcher'
import { CommandPaletteTrigger } from '@/components/layout/command-palette'

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-md md:px-6">
      {/* Mobile menu trigger */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="hidden lg:block">
        <TeamSwitcher />
      </div>

      <div className="flex flex-1 justify-center px-2 md:px-6">
        <CommandPaletteTrigger />
      </div>

      <div className="flex items-center gap-1">
        <NotificationsBell />
        <ThemeSwitcher />
        <LanguageSwitcher />
        <UserMenu />
      </div>
    </header>
  )
}
