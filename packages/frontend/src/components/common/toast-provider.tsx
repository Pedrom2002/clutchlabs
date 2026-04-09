'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react'

interface Toast {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

interface ToastContext {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContext>({
  success: () => {},
  error: () => {},
  info: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const value: ToastContext = {
    success: (msg) => addToast('success', msg),
    error: (msg) => addToast('error', msg),
    info: (msg) => addToast('info', msg),
  }

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
  }

  const colors = {
    success: 'border-green-500/30 bg-green-500/10 text-green-400',
    error: 'border-red-500/30 bg-red-500/10 text-red-400',
    info: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = icons[toast.type]
          return (
            <div
              key={toast.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm animate-in slide-in-from-right ${colors[toast.type]}`}
              role="alert"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="text-sm">{toast.message}</span>
              <button
                onClick={() => remove(toast.id)}
                className="ml-2 opacity-60 hover:opacity-100"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
