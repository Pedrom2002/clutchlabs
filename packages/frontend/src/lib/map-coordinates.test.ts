import { describe, expect, it } from 'vitest'
import {
  gameToNormalized,
  gameToPixel,
  getMapConfig,
  MAP_CONFIGS,
} from './map-coordinates'

describe('map-coordinates', () => {
  it('exposes all active duty maps', () => {
    expect(getMapConfig('de_mirage')).toBeTruthy()
    expect(getMapConfig('de_inferno')).toBeTruthy()
    expect(getMapConfig('de_anubis')).toBeTruthy()
    expect(getMapConfig('de_dust2')).toBeTruthy()
    expect(getMapConfig('de_nuke')).toBeTruthy()
    expect(getMapConfig('de_overpass')).toBeTruthy()
    expect(getMapConfig('de_vertigo')).toBeTruthy()
  })

  it('returns null for unknown map', () => {
    expect(getMapConfig('de_unknown')).toBeNull()
  })

  it('converts game coords to pixel coords', () => {
    const cfg = MAP_CONFIGS.de_mirage
    const result = gameToPixel(cfg.pos_x, cfg.pos_y, 'de_mirage')
    // At pos_x, pos_y the result should be (0, 0)
    expect(result?.px).toBeCloseTo(0)
    expect(result?.py).toBeCloseTo(0)
  })

  it('inverts Y axis (game Y up vs pixel Y down)', () => {
    const cfg = MAP_CONFIGS.de_mirage
    // A point above pos_y (greater game Y) should produce smaller pixel Y
    const point = gameToPixel(cfg.pos_x, cfg.pos_y - 100 * cfg.scale, 'de_mirage')
    expect(point?.py).toBeCloseTo(100)
  })

  it('returns normalized 0..1 coordinates', () => {
    const cfg = MAP_CONFIGS.de_mirage
    const center = gameToNormalized(
      cfg.pos_x + (cfg.image_width * cfg.scale) / 2,
      cfg.pos_y - (cfg.image_height * cfg.scale) / 2,
      'de_mirage'
    )
    expect(center?.x).toBeCloseTo(0.5)
    expect(center?.y).toBeCloseTo(0.5)
  })
})
