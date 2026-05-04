// Seeded value-noise terrain. Returns a Map keyed by "q,r" → terrain object.

import { hexDistance, hexShapeAxials, key, type HexKey } from './hex-math';

export type TerrainType =
  | 'deep_water'
  | 'water'
  | 'sand'
  | 'plains'
  | 'grass'
  | 'forest'
  | 'hills'
  | 'mountain';

export interface Tile {
  q: number;
  r: number;
  type: TerrainType;
  elev: number;
  moist: number;
  detail: number;
}

export type TileMap = Map<HexKey, Tile>;

export interface PaletteEntry {
  fill: string;
  edge: string;
  accent: string;
  label: string;
}

// Mulberry32 PRNG
export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type NoiseFn = (x: number, y: number) => number;

// 2D value noise on integer grid; bilinear-interp between samples
function makeValueNoise(seed: number, scale: number): NoiseFn {
  const cache = new Map<string, number>();
  function rand(ix: number, iy: number): number {
    const k = ix + ',' + iy;
    let v = cache.get(k);
    if (v === undefined) {
      let h = ((ix * 374761393) ^ (iy * 668265263) ^ seed) >>> 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      v = ((h ^ (h >>> 16)) >>> 0) / 4294967296;
      cache.set(k, v);
    }
    return v;
  }
  function smooth(t: number): number {
    return t * t * (3 - 2 * t);
  }
  return function (x: number, y: number): number {
    const sx = x / scale;
    const sy = y / scale;
    const ix = Math.floor(sx);
    const iy = Math.floor(sy);
    const fx = smooth(sx - ix);
    const fy = smooth(sy - iy);
    const a = rand(ix, iy);
    const b = rand(ix + 1, iy);
    const c = rand(ix, iy + 1);
    const d = rand(ix + 1, iy + 1);
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
  };
}

// Layered: elevation + moisture → terrain type. The world is a single large
// hexagon of `side` tiles per side, centered on axial (0, 0).
export function generate(side: number, seed = 1337): TileMap {
  const elev = makeValueNoise(seed, 14);
  const elev2 = makeValueNoise(seed + 1, 6);
  const moist = makeValueNoise(seed + 2, 18);
  const detail = makeValueNoise(seed + 3, 3);

  const map: TileMap = new Map();
  const n = Math.max(1, side - 1);

  for (const { q, r } of hexShapeAxials(side)) {
    const dist = hexDistance(q, r, 0, 0) / n;
    const falloff = Math.max(0, 1 - Math.pow(dist, 2.2) * 0.85);

    let e = elev(q, r) * 0.65 + elev2(q, r) * 0.35;
    e = e * falloff;

    const m = moist(q, r);
    const d = detail(q, r);

    let type: TerrainType;
    if (e < 0.18) type = 'deep_water';
    else if (e < 0.28) type = 'water';
    else if (e < 0.34) type = 'sand';
    else if (e < 0.62) {
      if (m < 0.42) type = 'plains';
      else if (m < 0.7) type = 'grass';
      else type = 'forest';
    } else if (e < 0.78) type = 'hills';
    else type = 'mountain';

    map.set(key(q, r), { q, r, type, elev: e, moist: m, detail: d });
  }
  return map;
}

// Terrain visual config — paired tones, subtle textures drawn in canvas
export const PALETTE: Record<TerrainType, PaletteEntry> = {
  deep_water: { fill: '#1b3a55', edge: '#16314a', accent: '#244a6b', label: 'Deep' },
  water:      { fill: '#2a5a7d', edge: '#234e6e', accent: '#3b6f93', label: 'Water' },
  sand:       { fill: '#c9b486', edge: '#b39e72', accent: '#d8c596', label: 'Sand' },
  plains:     { fill: '#9cae6f', edge: '#869a5e', accent: '#aabd7d', label: 'Plains' },
  grass:      { fill: '#6f9555', edge: '#5d8147', accent: '#7fa564', label: 'Grass' },
  forest:     { fill: '#3f6b3e', edge: '#345a34', accent: '#4d7d4c', label: 'Forest' },
  hills:      { fill: '#8a8060', edge: '#736a4f', accent: '#9b9070', label: 'Hills' },
  mountain:   { fill: '#7d7670', edge: '#5f5853', accent: '#9a948e', label: 'Mountain' },
};
