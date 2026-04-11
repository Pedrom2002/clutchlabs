import { describe, expect, it } from 'vitest'
import { getScoutReport, listScoutReports, listOpponents } from './scout'

describe('scout mocks', () => {
  it('returns at least one opponent', async () => {
    const opps = await listOpponents()
    expect(opps.length).toBeGreaterThan(0)
    expect(opps[0]).toHaveProperty('id')
    expect(opps[0]).toHaveProperty('name')
  })

  it('returns scout report list', async () => {
    const reports = await listScoutReports()
    expect(Array.isArray(reports)).toBe(true)
    expect(reports.length).toBeGreaterThan(0)
  })

  it('returns a complete scout report', async () => {
    const report = await getScoutReport('rpt-001')
    expect(report.opponent).toBeTruthy()
    expect(report.maps.length).toBeGreaterThan(0)
    expect(report.tactical_trends.length).toBeGreaterThan(0)
    expect(report.key_players.length).toBeGreaterThan(0)
    expect(report.counter_strategies.length).toBeGreaterThan(0)
    expect(typeof report.summary).toBe('string')
  })
})
