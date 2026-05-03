// Seeded value-noise terrain. Returns a Map keyed by "q,r" → terrain object.

const Terrain = (() => {
  // Mulberry32 PRNG
  function mulberry32(seed) {
    return function () {
      let t = (seed += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 2D value noise on integer grid; bilinear-interp between samples
  function makeValueNoise(seed, scale) {
    const cache = new Map();
    function rand(ix, iy) {
      const k = ix + ',' + iy;
      let v = cache.get(k);
      if (v === undefined) {
        // hash
        let h = ((ix * 374761393) ^ (iy * 668265263) ^ seed) >>> 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        v = ((h ^ (h >>> 16)) >>> 0) / 4294967296;
        cache.set(k, v);
      }
      return v;
    }
    function smooth(t) { return t * t * (3 - 2 * t); }
    return function (x, y) {
      const sx = x / scale, sy = y / scale;
      const ix = Math.floor(sx), iy = Math.floor(sy);
      const fx = smooth(sx - ix), fy = smooth(sy - iy);
      const a = rand(ix, iy), b = rand(ix + 1, iy);
      const c = rand(ix, iy + 1), d = rand(ix + 1, iy + 1);
      return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
    };
  }

  // Layered: elevation + moisture → terrain type
  function generate(cols, rows, seed = 1337) {
    const elev = makeValueNoise(seed, 14);
    const elev2 = makeValueNoise(seed + 1, 6);
    const moist = makeValueNoise(seed + 2, 18);
    const detail = makeValueNoise(seed + 3, 3);

    const map = new Map();
    const cx = cols / 2, cy = rows / 2;
    const maxR = Math.min(cx, cy);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // soft circular falloff so the world has coastline
        const dx = (col - cx) / maxR;
        const dy = (row - cy) / maxR;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const falloff = Math.max(0, 1 - Math.pow(dist, 2.2) * 0.85);

        let e = elev(col, row) * 0.65 + elev2(col, row) * 0.35;
        e = e * falloff;

        const m = moist(col, row);
        const d = detail(col, row);

        let type;
        if (e < 0.18) type = 'deep_water';
        else if (e < 0.28) type = 'water';
        else if (e < 0.34) type = 'sand';
        else if (e < 0.62) {
          if (m < 0.42) type = 'plains';
          else if (m < 0.7) type = 'grass';
          else type = 'forest';
        } else if (e < 0.78) type = 'hills';
        else type = 'mountain';

        const { q, r } = HexMath.offsetToAxial(col, row);
        map.set(HexMath.key(q, r), {
          q, r, col, row,
          type,
          elev: e,
          moist: m,
          detail: d,
        });
      }
    }
    return map;
  }

  // Terrain visual config — paired tones, subtle textures drawn in canvas
  const PALETTE = {
    deep_water: { fill: '#1b3a55', edge: '#16314a', accent: '#244a6b', label: 'Deep' },
    water:      { fill: '#2a5a7d', edge: '#234e6e', accent: '#3b6f93', label: 'Water' },
    sand:       { fill: '#c9b486', edge: '#b39e72', accent: '#d8c596', label: 'Sand' },
    plains:     { fill: '#9cae6f', edge: '#869a5e', accent: '#aabd7d', label: 'Plains' },
    grass:      { fill: '#6f9555', edge: '#5d8147', accent: '#7fa564', label: 'Grass' },
    forest:     { fill: '#3f6b3e', edge: '#345a34', accent: '#4d7d4c', label: 'Forest' },
    hills:      { fill: '#8a8060', edge: '#736a4f', accent: '#9b9070', label: 'Hills' },
    mountain:   { fill: '#7d7670', edge: '#5f5853', accent: '#9a948e', label: 'Mountain' },
  };

  return { generate, PALETTE, mulberry32 };
})();

window.Terrain = Terrain;
