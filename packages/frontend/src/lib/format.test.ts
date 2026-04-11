import { describe, expect, it } from 'vitest'
import { formatBytes, formatDuration, formatRating } from './format'

describe('format', () => {
  describe('formatBytes', () => {
    it('formats zero', () => {
      expect(formatBytes(0)).toBe('0 B')
    })
    it('formats KB', () => {
      expect(formatBytes(1500)).toBe('1.5 KB')
    })
    it('formats MB', () => {
      expect(formatBytes(2_500_000)).toBe('2.4 MB')
    })
    it('respects decimals param', () => {
      expect(formatBytes(1500, 2)).toBe('1.46 KB')
    })
  })

  describe('formatDuration', () => {
    it('returns 0:00 for zero or negative', () => {
      expect(formatDuration(0)).toBe('0:00')
      expect(formatDuration(-5)).toBe('0:00')
    })
    it('formats minutes:seconds', () => {
      expect(formatDuration(125)).toBe('2:05')
    })
    it('formats hours when above 3600s', () => {
      expect(formatDuration(3725)).toBe('1:02:05')
    })
  })

  describe('formatRating', () => {
    it('handles null', () => {
      expect(formatRating(null)).toBe('—')
      expect(formatRating(undefined)).toBe('—')
    })
    it('formats with 2 decimals', () => {
      expect(formatRating(1.234)).toBe('1.23')
    })
  })
})
