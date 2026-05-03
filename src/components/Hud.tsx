// HUD: minimap, team legend, status bar, controls

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { SQRT3 } from '../lib/hex-math';
import { PALETTE, type Tile, type TileMap } from '../lib/terrain';

export interface Team {
  id: string;
  name: string;
  color: string;
}

export const TEAMS: readonly Team[] = [
  { id: 'crimson', name: 'Crimson', color: '#e25555' },
  { id: 'amber',   name: 'Amber',   color: '#e0a23a' },
  { id: 'verdant', name: 'Verdant', color: '#5cc26b' },
  { id: 'azure',   name: 'Azure',   color: '#3aa1e0' },
  { id: 'violet',  name: 'Violet',  color: '#9b6fe0' },
  { id: 'slate',   name: 'Slate',   color: '#9aa6b2' },
];

export interface TeamLegendProps {
  teams: readonly Team[];
  activeId: string;
  onSelect: (id: string) => void;
  players: Record<string, number>;
}

export function TeamLegend({ teams, activeId, onSelect, players }: TeamLegendProps) {
  return (
    <div className="hud-card team-legend">
      <div className="hud-card-title">
        <span className="dot" style={{ background: '#e8eef6' }}></span>
        Teams
      </div>
      <div className="team-list">
        {teams.map((t) => {
          const active = t.id === activeId;
          const p = players[t.id] ?? 0;
          return (
            <button
              key={t.id}
              className={'team-item' + (active ? ' active' : '')}
              onClick={() => onSelect(t.id)}
              style={{ ['--team-color' as string]: t.color } as CSSProperties}
            >
              <span className="team-swatch" style={{ background: t.color }}>
                {active && (
                  <svg width="10" height="10" viewBox="0 0 10 10">
                    <path
                      d="M2 5l2 2 4-5"
                      stroke="#0c0f14"
                      strokeWidth="1.6"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span className="team-name">{t.name}</span>
              <span className="team-count">{p}</span>
            </button>
          );
        })}
      </div>
      <div className="legend-foot">click a team to set selection color</div>
    </div>
  );
}

export interface View {
  tx: number;
  ty: number;
  scale: number;
}

export interface Viewport {
  w: number;
  h: number;
}

export interface StatusBarProps {
  hovered: Tile | null;
  selected: string | null;
  scale: number;
  view: View;
  cols: number;
  rows: number;
  onReset: () => void;
}

export function StatusBar({ hovered, selected, scale, cols, rows, onReset }: StatusBarProps) {
  return (
    <div className="hud-card status-bar">
      <div className="status-group">
        <span className="status-label">cursor</span>
        <span className="status-val mono">
          {hovered ? `${hovered.q}, ${hovered.r}` : '—'}
        </span>
      </div>
      <div className="status-divider" />
      <div className="status-group">
        <span className="status-label">selected</span>
        <span className="status-val mono">{selected ? selected : '—'}</span>
      </div>
      <div className="status-divider" />
      <div className="status-group">
        <span className="status-label">terrain</span>
        <span className="status-val">
          {hovered ? PALETTE[hovered.type].label.toLowerCase() : '—'}
        </span>
      </div>
      <div className="status-divider" />
      <div className="status-group">
        <span className="status-label">zoom</span>
        <span className="status-val mono">{(scale * 100).toFixed(0)}%</span>
      </div>
      <div className="status-divider" />
      <div className="status-group">
        <span className="status-label">grid</span>
        <span className="status-val mono">
          {cols}×{rows}
        </span>
      </div>
      <button className="status-btn" onClick={onReset} title="Reset view (R)">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 6a3.5 3.5 0 1 0 1.2-2.65"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            d="M2 1.6V4h2.4"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        reset view
      </button>
    </div>
  );
}

export interface MinimapProps {
  tiles: TileMap;
  cols: number;
  rows: number;
  hexSize: number;
  view: View | null;
  viewport: Viewport | null;
  selected: string | null;
  teamColor: string;
}

// Minimap renders a downsampled representation of terrain + viewport rect
export function Minimap({
  tiles,
  cols,
  rows,
  hexSize,
  view,
  viewport,
  selected,
  teamColor,
}: MinimapProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [size] = useState({ w: 200, h: 140 });

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = size.w * dpr;
    c.height = size.h * dpr;
    c.style.width = size.w + 'px';
    c.style.height = size.h + 'px';
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);

    // background
    ctx.fillStyle = '#0a0e13';
    ctx.fillRect(0, 0, size.w, size.h);

    // compute world bounds
    const worldW = (cols + 0.5) * SQRT3 * hexSize;
    const worldH = (rows * 1.5 + 0.5) * hexSize;
    const pad = 6;
    const sx = (size.w - pad * 2) / worldW;
    const sy = (size.h - pad * 2) / worldH;
    const s = Math.min(sx, sy);
    const offX = pad + (size.w - pad * 2 - worldW * s) / 2;
    const offY = pad + (size.h - pad * 2 - worldH * s) / 2;

    // draw a downsampled version: every other tile if grid is large
    const step = cols * rows > 6000 ? 2 : 1;
    for (const t of tiles.values()) {
      if (step > 1 && ((t.col + t.row) & 1)) continue;
      const px = (SQRT3 * t.q + (SQRT3 / 2) * t.r) * hexSize + worldW / 2;
      const py = 1.5 * t.r * hexSize + hexSize;
      const x = offX + px * s;
      const y = offY + py * s;
      const pal = PALETTE[t.type];
      ctx.fillStyle = pal.fill;
      ctx.fillRect(x - 1, y - 1, 2 * step, 2 * step);
    }

    // selection marker
    if (selected) {
      const t = tiles.get(selected);
      if (t) {
        const px = (SQRT3 * t.q + (SQRT3 / 2) * t.r) * hexSize + worldW / 2;
        const py = 1.5 * t.r * hexSize + hexSize;
        const x = offX + px * s;
        const y = offY + py * s;
        ctx.fillStyle = teamColor;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }

    // viewport rect
    if (view && viewport) {
      // viewport in world coords
      const vw = viewport.w / view.scale;
      const vh = viewport.h / view.scale;
      const vx = -view.tx / view.scale;
      const vy = -view.ty / view.scale;
      const rx = offX + (vx + worldW / 2 - hexSize) * s;
      const ry = offY + vy * s;
      const rw = vw * s;
      const rh = vh * s;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(rx, ry, rw, rh);
    }
  }, [tiles, cols, rows, hexSize, view, viewport, selected, teamColor, size]);

  return (
    <div className="hud-card minimap">
      <div className="hud-card-title">
        <span className="dot" style={{ background: '#e8eef6' }}></span>
        Map
      </div>
      <canvas ref={ref} className="minimap-canvas" />
    </div>
  );
}
