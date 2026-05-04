// Axial / flat-top hex math
// Reference: https://www.redblobgames.com/grids/hexagons/

export interface Axial {
  q: number;
  r: number;
}

export interface Offset {
  col: number;
  row: number;
}

export interface Pixel {
  x: number;
  y: number;
}

export type HexKey = string;

export const SQRT3 = Math.sqrt(3);

// Flat-top: width = 2 * size, height = sqrt(3) * size
// size = "radius" from center to corner
export function hexToPixel(q: number, r: number, size: number): Pixel {
  const x = size * ((3 / 2) * q);
  const y = size * ((SQRT3 / 2) * q + SQRT3 * r);
  return { x, y };
}

export function pixelToHex(x: number, y: number, size: number): Axial {
  const q = ((2 / 3) * x) / size;
  const r = (-(1 / 3) * x + (SQRT3 / 3) * y) / size;
  return axialRound(q, r);
}

export function axialRound(q: number, r: number): Axial {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq, r: rr };
}

export function hexCorners(cx: number, cy: number, size: number): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i); // flat-top
    pts.push([cx + size * Math.cos(angle), cy + size * Math.sin(angle)]);
  }
  return pts;
}

// For an offset/rectangular layout: convert (col, row) on the underlying
// rectangular grid to axial (q, r) — using "odd-r" offset (every odd row shifted right).
export function offsetToAxial(col: number, row: number): Axial {
  const q = col - ((row - (row & 1)) >> 1);
  const r = row;
  return { q, r };
}

export function axialToOffset(q: number, r: number): Offset {
  const col = q + ((r - (r & 1)) >> 1);
  const row = r;
  return { col, row };
}

export function key(q: number, r: number): HexKey {
  return q + ',' + r;
}

export const NEIGHBORS: ReadonlyArray<readonly [number, number]> = [
  [+1, 0], [+1, -1], [0, -1],
  [-1, 0], [-1, +1], [0, +1],
];

export function neighbors(q: number, r: number): Axial[] {
  return NEIGHBORS.map(([dq, dr]) => ({ q: q + dq, r: r + dr }));
}

export function hexDistance(q1: number, r1: number, q2: number, r2: number): number {
  const dq = q1 - q2;
  const dr = r1 - r2;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

// Iterate every axial coord inside a hexagonal region of `side` tiles per side,
// centered at (0, 0). Total tiles = 1 + 3*side*(side-1).
export function* hexShapeAxials(side: number): Generator<Axial> {
  const n = side - 1;
  for (let q = -n; q <= n; q++) {
    const rMin = Math.max(-n, -q - n);
    const rMax = Math.min(n, -q + n);
    for (let r = rMin; r <= rMax; r++) yield { q, r };
  }
}
