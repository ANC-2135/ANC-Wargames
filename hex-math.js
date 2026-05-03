// Axial / pointy-top hex math
// Reference: https://www.redblobgames.com/grids/hexagons/

const HexMath = (() => {
  const SQRT3 = Math.sqrt(3);

  // Pointy-top: width = sqrt(3) * size, height = 2 * size
  // size = "radius" from center to corner
  function hexToPixel(q, r, size) {
    const x = size * (SQRT3 * q + SQRT3 / 2 * r);
    const y = size * (3 / 2 * r);
    return { x, y };
  }

  function pixelToHex(x, y, size) {
    const q = (SQRT3 / 3 * x - 1 / 3 * y) / size;
    const r = (2 / 3 * y) / size;
    return axialRound(q, r);
  }

  function axialRound(q, r) {
    const s = -q - r;
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);
    const dq = Math.abs(rq - q);
    const dr = Math.abs(rr - r);
    const ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs;
    else if (dr > ds) rr = -rq - rs;
    return { q: rq, r: rr };
  }

  function hexCorners(cx, cy, size) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 180 * (60 * i - 30); // pointy-top
      pts.push([cx + size * Math.cos(angle), cy + size * Math.sin(angle)]);
    }
    return pts;
  }

  // For an offset/rectangular layout: convert (col, row) on the underlying
  // rectangular grid to axial (q, r) — using "odd-r" offset (every odd row shifted right).
  function offsetToAxial(col, row) {
    const q = col - ((row - (row & 1)) >> 1);
    const r = row;
    return { q, r };
  }

  function axialToOffset(q, r) {
    const col = q + ((r - (r & 1)) >> 1);
    const row = r;
    return { col, row };
  }

  function key(q, r) {
    return q + ',' + r;
  }

  const NEIGHBORS = [
    [+1, 0], [+1, -1], [0, -1],
    [-1, 0], [-1, +1], [0, +1],
  ];

  function neighbors(q, r) {
    return NEIGHBORS.map(([dq, dr]) => ({ q: q + dq, r: r + dr }));
  }

  return {
    SQRT3, hexToPixel, pixelToHex, hexCorners,
    offsetToAxial, axialToOffset, key, neighbors,
  };
})();

window.HexMath = HexMath;
