/**
 * CS2 map coordinate transforms.
 * Source: Valve radar overviews (game coords → radar pixel coords).
 */

export interface MapConfig {
  name: string
  displayName: string
  radarImage: string
  pos_x: number
  pos_y: number
  scale: number
  image_width: number
  image_height: number
}

export const MAP_CONFIGS: Record<string, MapConfig> = {
  de_mirage: {
    name: 'de_mirage',
    displayName: 'Mirage',
    radarImage: '/maps/de_mirage_radar.png',
    pos_x: -3230,
    pos_y: 1713,
    scale: 5.0,
    image_width: 1024,
    image_height: 1024,
  },
  de_inferno: {
    name: 'de_inferno',
    displayName: 'Inferno',
    radarImage: '/maps/de_inferno_radar.png',
    pos_x: -2087,
    pos_y: 3870,
    scale: 4.9,
    image_width: 1024,
    image_height: 1024,
  },
  de_anubis: {
    name: 'de_anubis',
    displayName: 'Anubis',
    radarImage: '/maps/de_anubis_radar.png',
    pos_x: -2796,
    pos_y: 3328,
    scale: 5.22,
    image_width: 1024,
    image_height: 1024,
  },
  de_dust2: {
    name: 'de_dust2',
    displayName: 'Dust 2',
    radarImage: '/maps/de_dust2_radar.png',
    pos_x: -2476,
    pos_y: 3239,
    scale: 4.4,
    image_width: 1024,
    image_height: 1024,
  },
  de_nuke: {
    name: 'de_nuke',
    displayName: 'Nuke',
    radarImage: '/maps/de_nuke_radar.png',
    pos_x: -3453,
    pos_y: 2887,
    scale: 7.0,
    image_width: 1024,
    image_height: 1024,
  },
  de_overpass: {
    name: 'de_overpass',
    displayName: 'Overpass',
    radarImage: '/maps/de_overpass_radar.png',
    pos_x: -4831,
    pos_y: 1781,
    scale: 5.2,
    image_width: 1024,
    image_height: 1024,
  },
  de_vertigo: {
    name: 'de_vertigo',
    displayName: 'Vertigo',
    radarImage: '/maps/de_vertigo_radar.png',
    pos_x: -3168,
    pos_y: 1762,
    scale: 4.0,
    image_width: 1024,
    image_height: 1024,
  },
  de_ancient: {
    name: 'de_ancient',
    displayName: 'Ancient',
    radarImage: '/maps/de_ancient_radar.png',
    pos_x: -2953,
    pos_y: 2164,
    scale: 5.0,
    image_width: 1024,
    image_height: 1024,
  },
}

export function getMapConfig(map: string): MapConfig | null {
  return MAP_CONFIGS[map] ?? null
}

/**
 * Convert game world coordinates to pixel coordinates on the radar image.
 */
export function gameToPixel(
  gameX: number,
  gameY: number,
  map: string
): { px: number; py: number } | null {
  const cfg = MAP_CONFIGS[map]
  if (!cfg) return null
  return {
    px: (gameX - cfg.pos_x) / cfg.scale,
    py: (cfg.pos_y - gameY) / cfg.scale,
  }
}

/**
 * Convert game coords to fractional [0..1] coordinates (resolution-independent).
 */
export function gameToNormalized(
  gameX: number,
  gameY: number,
  map: string
): { x: number; y: number } | null {
  const cfg = MAP_CONFIGS[map]
  if (!cfg) return null
  const pixel = gameToPixel(gameX, gameY, map)
  if (!pixel) return null
  return {
    x: pixel.px / cfg.image_width,
    y: pixel.py / cfg.image_height,
  }
}
