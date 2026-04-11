'use client'

/**
 * Backwards-compatibility shim — delegates to sonner so existing
 * useToast() callers keep working while we migrate them.
 */

import { toast as sonner } from 'sonner'

export function ToastProvider({ children }: { children: React.ReactNode }) {
  // Toaster is mounted globally in <Providers>; this is just a passthrough.
  return <>{children}</>
}

export function useToast() {
  return {
    success: (message: string) => sonner.success(message),
    error: (message: string) => sonner.error(message),
    info: (message: string) => sonner(message),
  }
}
