'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * Sync a string component state with URL search params.
 */
export function useUrlState(
  key: string,
  defaultValue: string
): [string, (next: string) => void] {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()

  const value = useMemo(() => {
    const raw = search.get(key)
    return raw ?? defaultValue
  }, [search, key, defaultValue])

  const setValue = useCallback(
    (next: string) => {
      const params = new URLSearchParams(search.toString())
      if (!next || next === defaultValue) {
        params.delete(key)
      } else {
        params.set(key, next)
      }
      const qs = params.toString()
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    },
    [router, pathname, search, key, defaultValue]
  )

  return [value, setValue]
}

/**
 * Same as useUrlState but for numeric values.
 */
export function useUrlNumber(
  key: string,
  defaultValue: number
): [number, (next: number) => void] {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()

  const value = useMemo(() => {
    const raw = search.get(key)
    if (raw == null) return defaultValue
    const n = Number(raw)
    return Number.isFinite(n) ? n : defaultValue
  }, [search, key, defaultValue])

  const setValue = useCallback(
    (next: number) => {
      const params = new URLSearchParams(search.toString())
      if (next === defaultValue) {
        params.delete(key)
      } else {
        params.set(key, String(next))
      }
      const qs = params.toString()
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    },
    [router, pathname, search, key, defaultValue]
  )

  return [value, setValue]
}
