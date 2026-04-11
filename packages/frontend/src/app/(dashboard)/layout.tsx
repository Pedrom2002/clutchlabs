'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { ErrorBoundary } from '@/components/error-boundary'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { CommandPalette } from '@/components/layout/command-palette'
import { ProcessingQueue } from '@/components/layout/processing-queue'
import { useAuthStore } from '@/stores/auth-store'
import { useTheme } from '@/lib/theme'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { toggle: toggleTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Global navigation shortcuts
  useHotkeys('g+d', () => router.push('/dashboard'))
  useHotkeys('g+m', () => router.push('/dashboard/matches'))
  useHotkeys('g+p', () => router.push('/dashboard/players'))
  useHotkeys('g+s', () => router.push('/dashboard/scout'))
  useHotkeys('u', () => router.push('/dashboard/demos?upload=1'))
  useHotkeys('t', () => toggleTheme())

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/login')
    }
  }, [mounted, isAuthenticated, router])

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Skeleton className="h-12 w-48" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main id="main-content" className="flex-1 p-4 md:p-6 lg:p-8">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      <CommandPalette />
      <ProcessingQueue />
    </div>
  )
}
