'use client'

import { useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'

export function Header() {
  const router = useRouter()
  const { user, organization, logout } = useAuthStore()

  async function handleLogout() {
    await logout()
    router.push('/')
  }

  return (
    <header className="h-16 border-b border-border bg-bg-card px-6 flex items-center justify-between">
      <div>
        <span className="text-sm text-text-muted">{organization?.name}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-text-muted" />
          <span>{user?.display_name}</span>
          <span className="text-xs bg-bg-elevated text-text-muted px-2 py-0.5 rounded">
            {user?.role}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="text-text-muted hover:text-danger transition-colors p-1"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
