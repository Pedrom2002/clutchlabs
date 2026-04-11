/**
 * Localized number / date / size formatters that respect the active locale.
 * Use these instead of toLocaleString() ad hoc.
 */

export function formatNumber(value: number, locale = 'pt-PT', opts?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale, opts).format(value)
}

export function formatPercent(value: number, locale = 'pt-PT', digits = 0) {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

export function formatDate(value: string | Date, locale = 'pt-PT') {
  const d = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(d)
}

export function formatDateTime(value: string | Date, locale = 'pt-PT') {
  const d = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

export function formatRelativeTime(value: string | Date, locale = 'pt-PT'): string {
  const d = typeof value === 'string' ? new Date(value) : value
  const diff = (d.getTime() - Date.now()) / 1000
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const abs = Math.abs(diff)
  if (abs < 60) return rtf.format(Math.round(diff), 'second')
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86_400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (abs < 604_800) return rtf.format(Math.round(diff / 86_400), 'day')
  if (abs < 2_592_000) return rtf.format(Math.round(diff / 604_800), 'week')
  if (abs < 31_536_000) return rtf.format(Math.round(diff / 2_592_000), 'month')
  return rtf.format(Math.round(diff / 31_536_000), 'year')
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(decimals)} ${sizes[i]}`
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatRating(value: number | null | undefined): string {
  if (value == null) return '—'
  return value.toFixed(2)
}
