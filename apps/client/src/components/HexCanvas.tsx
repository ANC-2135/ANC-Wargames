// HexCanvas — pan/zoom canvas hex renderer.

import { useEffect, useRef, type MutableRefObject } from 'react';
import { hexToPixel, pixelToHex, key } from '../lib/hex-math';
import { PALETTE, type Tile, type TileMap } from '../lib/terrain';

export interface HexView {
  tx: number;
  ty: number;
  scale: number;
}

export interface HexViewHandle {
  readonly view: HexView;
  reset(): void;
  panBy(dx: number, dy: number): void;
  zoomBy(factor: number, cx?: number, cy?: number): void;
}

export type ShowCoords = boolean | 'always';

export interface HexCanvasProps {
  tiles: TileMap;
  hexSize?: number;
  selected: Set<string>;
  hovered: string | null;
  teamColor: string;
  showCoords: ShowCoords;
  panSpeed?: number;
  zoomSpeed?: number;
  onTileClick?: (tile: Tile | null, evt: PointerEvent) => void;
  onHover?: (tile: Tile | null) => void;
  viewRef?: MutableRefObject<HexViewHandle | null>;
  onViewChange?: (view: HexView) => void;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  w: number;
  h: number;
}

interface DragState {
  id: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  moved: boolean;
  startTx: number;
  startTy: number;
}

type LOD = 'hi' | 'md' | 'lo';

export function HexCanvas({
  tiles,
  hexSize = 22,
  selected,
  hovered,
  teamColor,
  showCoords,
  panSpeed = 1,
  zoomSpeed = 1,
  onTileClick,
  onHover,
  viewRef,
  onViewChange,
}: HexCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // view state lives in a ref to avoid re-rendering on every pan tick
  const view = useRef<HexView>({ tx: 0, ty: 0, scale: 1 });
  const drag = useRef<DragState | null>(null);
  const dpr = useRef<number>(window.devicePixelRatio || 1);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const rafRef = useRef<number>(0);
  const dirty = useRef<boolean>(true);
  const keys = useRef<Set<string>>(new Set());

  // Compute world bounding box once
  const bounds = useRef<Bounds>({ minX: 0, minY: 0, maxX: 0, maxY: 0, w: 0, h: 0 });

  function emitView() {
    if (onViewChange) onViewChange({ ...view.current });
  }

  function requestDraw() {
    dirty.current = true;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      if (dirty.current) draw();
    });
  }

  function applyZoom(factor: number, cx: number, cy: number) {
    const v = view.current;
    const newScale = Math.min(6, Math.max(0.15, v.scale * factor));
    const k = newScale / v.scale;
    v.tx = cx - (cx - v.tx) * k;
    v.ty = cy - (cy - v.ty) * k;
    v.scale = newScale;
    requestDraw();
    emitView();
  }

  function animateTo(target: HexView) {
    const start = { ...view.current };
    const t0 = performance.now();
    const dur = 350;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      view.current = {
        tx: start.tx + (target.tx - start.tx) * e,
        ty: start.ty + (target.ty - start.ty) * e,
        scale: start.scale + (target.scale - start.scale) * e,
      };
      requestDraw();
      emitView();
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  useEffect(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const t of tiles.values()) {
      const { x, y } = hexToPixel(t.q, t.r, hexSize);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    const pad = hexSize * 2;
    bounds.current = {
      minX: minX - pad,
      minY: minY - pad,
      maxX: maxX + pad,
      maxY: maxY + pad,
      w: maxX - minX + pad * 2,
      h: maxY - minY + pad * 2,
    };
    requestDraw();
  }, [tiles, hexSize]);

  // Resize handling
  useEffect(() => {
    const el = containerRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      sizeRef.current = { w: rect.width, h: rect.height };
      dpr.current = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr.current);
      canvas.height = Math.round(rect.height * dpr.current);
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      requestDraw();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Initial fit
  useEffect(() => {
    const fit = () => {
      const { w, h } = sizeRef.current;
      if (!w || !h) return;
      const b = bounds.current;
      if (!b.w) return;
      const scale = Math.min(w / b.w, h / b.h) * 0.95;
      const tx = (w - b.w * scale) / 2 - b.minX * scale;
      const ty = (h - b.h * scale) / 2 - b.minY * scale;
      view.current = { tx, ty, scale };
      requestDraw();
      emitView();
    };
    const id = setInterval(() => {
      if (sizeRef.current.w && bounds.current.w) {
        fit();
        clearInterval(id);
      }
    }, 30);
    return () => clearInterval(id);
  }, [tiles, hexSize]);

  // Expose imperative API
  useEffect(() => {
    if (!viewRef) return;
    viewRef.current = {
      get view() {
        return view.current;
      },
      reset() {
        const { w, h } = sizeRef.current;
        const b = bounds.current;
        const scale = Math.min(w / b.w, h / b.h) * 0.95;
        const tx = (w - b.w * scale) / 2 - b.minX * scale;
        const ty = (h - b.h * scale) / 2 - b.minY * scale;
        animateTo({ tx, ty, scale });
      },
      panBy(dx: number, dy: number) {
        view.current.tx += dx;
        view.current.ty += dy;
        requestDraw();
        emitView();
      },
      zoomBy(factor: number, cx?: number, cy?: number) {
        const { w, h } = sizeRef.current;
        const ux = cx ?? w / 2;
        const uy = cy ?? h / 2;
        applyZoom(factor, ux, uy);
      },
    };
  });

  // ---- Pointer / wheel ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function screenToWorldLocal(lx: number, ly: number) {
      const v = view.current;
      return { x: (lx - v.tx) / v.scale, y: (ly - v.ty) / v.scale };
    }
    function pickTileLocal(lx: number, ly: number): Tile | null {
      const { x, y } = screenToWorldLocal(lx, ly);
      const { q, r } = pixelToHex(x, y, hexSize);
      return tiles.get(key(q, r)) ?? null;
    }

    const onPointerDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      drag.current = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        moved: false,
        startTx: view.current.tx,
        startTy: view.current.ty,
      };
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const lx = e.clientX - rect.left;
      const ly = e.clientY - rect.top;
      if (!drag.current) {
        const tile = pickTileLocal(lx, ly);
        onHover?.(tile);
      }
      if (drag.current && drag.current.id === e.pointerId) {
        const dx = (e.clientX - drag.current.lastX) * panSpeed;
        const dy = (e.clientY - drag.current.lastY) * panSpeed;
        drag.current.lastX = e.clientX;
        drag.current.lastY = e.clientY;
        if (
          Math.abs(e.clientX - drag.current.startX) +
            Math.abs(e.clientY - drag.current.startY) >
          4
        ) {
          drag.current.moved = true;
        }
        view.current.tx += dx;
        view.current.ty += dy;
        requestDraw();
        emitView();
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (drag.current && drag.current.id === e.pointerId) {
        const wasClick = !drag.current.moved;
        drag.current = null;
        if (wasClick) {
          const rect = canvas.getBoundingClientRect();
          const lx = e.clientX - rect.left;
          const ly = e.clientY - rect.top;
          const tile = pickTileLocal(lx, ly);
          onTileClick?.(tile, e);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      if (e.ctrlKey) {
        const factor = Math.exp(-e.deltaY * 0.01 * zoomSpeed);
        applyZoom(factor, cx, cy);
      } else if (e.shiftKey) {
        view.current.tx -= e.deltaY * panSpeed;
        requestDraw();
        emitView();
      } else {
        const factor = Math.exp(-e.deltaY * 0.0015 * zoomSpeed);
        applyZoom(factor, cx, cy);
      }
    };

    const onLeave = () => onHover?.(null);

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [panSpeed, zoomSpeed, onTileClick, onHover, tiles, hexSize]);

  // ---- Keyboard pan ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        keys.current.add(e.key);
        e.preventDefault();
      } else if (e.key === '+' || e.key === '=') {
        const { w, h } = sizeRef.current;
        applyZoom(1.15, w / 2, h / 2);
      } else if (e.key === '-' || e.key === '_') {
        const { w, h } = sizeRef.current;
        applyZoom(1 / 1.15, w / 2, h / 2);
      }
    };
    const onUp = (e: KeyboardEvent) => keys.current.delete(e.key);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onUp);

    let last = performance.now();
    let frame = 0;
    const tick = (t: number) => {
      const dt = Math.min(50, t - last);
      last = t;
      const k = keys.current;
      if (k.size) {
        const speed = 0.6 * dt * panSpeed;
        if (k.has('ArrowLeft')) view.current.tx += speed;
        if (k.has('ArrowRight')) view.current.tx -= speed;
        if (k.has('ArrowUp')) view.current.ty += speed;
        if (k.has('ArrowDown')) view.current.ty -= speed;
        requestDraw();
        emitView();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onUp);
      cancelAnimationFrame(frame);
    };
  }, [panSpeed]);

  // re-draw whenever inputs change
  useEffect(() => {
    requestDraw();
  }, [selected, hovered, teamColor, showCoords, hexSize, tiles]);

  function draw() {
    dirty.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    if (!w || !h) return;
    const v = view.current;

    ctx.setTransform(dpr.current, 0, 0, dpr.current, 0, 0);
    // background
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0d1218');
    grad.addColorStop(1, '#080b10');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // world transform on top of dpr
    ctx.setTransform(
      dpr.current * v.scale,
      0,
      0,
      dpr.current * v.scale,
      dpr.current * v.tx,
      dpr.current * v.ty,
    );

    // visible-world rect
    const inv = 1 / v.scale;
    const visMinX = -v.tx * inv;
    const visMinY = -v.ty * inv;
    const visMaxX = (w - v.tx) * inv;
    const visMaxY = (h - v.ty) * inv;
    const margin = hexSize * 2;

    // LOD: at very low zoom skip texture detail
    const lod: LOD = v.scale > 0.6 ? 'hi' : v.scale > 0.3 ? 'md' : 'lo';

    // Stroke width in world units
    const strokeW = Math.max(0.5, 1 / v.scale);

    for (const tile of tiles.values()) {
      const { x: cx, y: cy } = hexToPixel(tile.q, tile.r, hexSize);
      if (
        cx + hexSize < visMinX - margin ||
        cx - hexSize > visMaxX + margin ||
        cy + hexSize < visMinY - margin ||
        cy - hexSize > visMaxY + margin
      )
        continue;

      drawHex(ctx, tile, cx, cy, hexSize, lod, strokeW);
    }

    // Hover ring
    if (hovered) {
      const t = tiles.get(hovered);
      if (t) {
        const { x: cx, y: cy } = hexToPixel(t.q, t.r, hexSize);
        drawHexOutline(ctx, cx, cy, hexSize * 0.98, '#ffffff', 1.5 / v.scale, 0.55);
      }
    }

    // Selection
    if (selected && selected.size) {
      for (const k of selected) {
        const t = tiles.get(k);
        if (!t) continue;
        const { x: cx, y: cy } = hexToPixel(t.q, t.r, hexSize);
        ctx.save();
        traceHex(ctx, cx, cy, hexSize * 0.96);
        ctx.fillStyle = teamColor + '55';
        ctx.fill();
        ctx.restore();
        drawHexOutline(ctx, cx, cy, hexSize * 0.96, teamColor, 2.4 / v.scale, 1);
        drawHexOutline(ctx, cx, cy, hexSize * 0.92, '#ffffff', 1 / v.scale, 0.85);
      }
    }

    // Coords on hover/select
    if (showCoords && v.scale > 0.55) {
      ctx.save();
      ctx.font = `${Math.max(8, hexSize * 0.42)}px JetBrains Mono, ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const showAll = showCoords === 'always';
      const targets = new Set<string>();
      if (hovered) targets.add(hovered);
      if (selected) for (const k of selected) targets.add(k);
      const iter: Iterable<Tile | undefined> = showAll
        ? tiles.values()
        : Array.from(targets).map((k) => tiles.get(k));
      for (const t of iter) {
        if (!t) continue;
        const { x: cx, y: cy } = hexToPixel(t.q, t.r, hexSize);
        if (
          cx < visMinX - margin ||
          cx > visMaxX + margin ||
          cy < visMinY - margin ||
          cy > visMaxY + margin
        )
          continue;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText(`${t.q},${t.r}`, cx, cy);
      }
      ctx.restore();
    }
  }

  function traceHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i - 30);
      const x = cx + size * Math.cos(a);
      const y = cy + size * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function drawHex(
    ctx: CanvasRenderingContext2D,
    tile: Tile,
    cx: number,
    cy: number,
    size: number,
    lod: LOD,
    strokeW: number,
  ) {
    const pal = PALETTE[tile.type];
    traceHex(ctx, cx, cy, size * 0.985);
    ctx.fillStyle = pal.fill;
    ctx.fill();

    if (lod !== 'lo') {
      // subtle texture: small accent dabs based on tile.detail/moist/elev
      ctx.save();
      ctx.clip();
      if (tile.type === 'water' || tile.type === 'deep_water') {
        ctx.strokeStyle = pal.accent;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = Math.max(0.4, size * 0.05);
        const off = (tile.detail - 0.5) * size * 0.5;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(cx - size * 0.55, cy + i * size * 0.32 + off);
          ctx.lineTo(cx + size * 0.55, cy + i * size * 0.32 + off);
          ctx.stroke();
        }
      } else if (tile.type === 'forest') {
        ctx.fillStyle = pal.edge;
        const r = size * 0.18;
        ctx.beginPath();
        ctx.arc(cx - size * 0.22, cy + size * 0.05, r, 0, Math.PI * 2);
        ctx.arc(cx + size * 0.22, cy - size * 0.12, r * 0.85, 0, Math.PI * 2);
        ctx.arc(cx + size * 0.05, cy + size * 0.28, r * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = pal.accent;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(cx - size * 0.22, cy - size * 0.02, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
      } else if (tile.type === 'mountain') {
        ctx.fillStyle = pal.accent;
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.45, cy + size * 0.35);
        ctx.lineTo(cx, cy - size * 0.4);
        ctx.lineTo(cx + size * 0.45, cy + size * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.13, cy - size * 0.12);
        ctx.lineTo(cx, cy - size * 0.4);
        ctx.lineTo(cx + size * 0.13, cy - size * 0.12);
        ctx.closePath();
        ctx.fill();
      } else if (tile.type === 'hills') {
        ctx.fillStyle = pal.accent;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(cx - size * 0.2, cy + size * 0.15, size * 0.28, Math.PI, 0);
        ctx.arc(cx + size * 0.25, cy + size * 0.05, size * 0.22, Math.PI, 0);
        ctx.fill();
      } else if (tile.type === 'sand') {
        ctx.fillStyle = pal.edge;
        ctx.globalAlpha = 0.5;
        const dn = 3;
        for (let i = 0; i < dn; i++) {
          const ax = cx + (tile.detail - 0.5) * size + Math.cos(i) * size * 0.3;
          const ay = cy + (tile.moist - 0.5) * size + Math.sin(i * 1.7) * size * 0.25;
          ctx.beginPath();
          ctx.arc(ax, ay, size * 0.06, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (tile.type === 'grass' || tile.type === 'plains') {
        ctx.strokeStyle = pal.accent;
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = Math.max(0.3, size * 0.05);
        for (let i = 0; i < 3; i++) {
          const ax = cx + ((((i * 37 + tile.q * 13) % 100) / 100 - 0.5) * size * 0.8);
          const ay = cy + ((((i * 53 + tile.r * 17) % 100) / 100 - 0.5) * size * 0.8);
          ctx.beginPath();
          ctx.moveTo(ax, ay + size * 0.08);
          ctx.lineTo(ax, ay - size * 0.08);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // edge stroke
    ctx.lineWidth = strokeW;
    ctx.strokeStyle = pal.edge;
    ctx.stroke();
  }

  function drawHexOutline(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    color: string,
    lineW: number,
    alpha = 1,
  ) {
    ctx.save();
    ctx.globalAlpha = alpha;
    traceHex(ctx, cx, cy, size);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineW;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }

  return (
    <div ref={containerRef} className="hex-canvas-wrap">
      <canvas ref={canvasRef} className="hex-canvas" />
    </div>
  );
}
