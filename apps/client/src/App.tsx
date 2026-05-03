// Main app

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { generate } from './lib/terrain';
import { key } from './lib/hex-math';
import { postClick } from './api';
import { HexCanvas, type HexView, type HexViewHandle } from './components/HexCanvas';
import { TEAMS, TeamLegend, Minimap, StatusBar } from './components/Hud';
import {
  TweaksPanel,
  TweakSection,
  TweakSlider,
  TweakNumber,
  TweakRadio,
  useTweaks,
} from './components/TweaksPanel';

type ShowCoordsMode = 'off' | 'select' | 'always';

interface Tweaks {
  hexSize: number;
  cols: number;
  rows: number;
  panSpeed: number;
  zoomSpeed: number;
  showCoords: ShowCoordsMode;
  seed: number;
  [k: string]: unknown;
}

const TWEAK_DEFAULTS: Tweaks = /*EDITMODE-BEGIN*/ {
  "hexSize": 22,
  "cols": 100,
  "rows": 100,
  "panSpeed": 1,
  "zoomSpeed": 1,
  "showCoords": "select",
  "seed": 1337,
} /*EDITMODE-END*/;

export function App() {
  const [tweaks, setTweak] = useTweaks<Tweaks>(TWEAK_DEFAULTS);
  const { hexSize, cols, rows, panSpeed, zoomSpeed, showCoords, seed } = tweaks;

  // Generate world
  const tiles = useMemo(() => generate(cols, rows, seed), [cols, rows, seed]);

  // Selection (single)
  const [selected, setSelected] = useState<string | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [activeTeam, setActiveTeam] = useState<string>(TEAMS[0]!.id);
  const [view, setView] = useState<HexView>({ tx: 0, ty: 0, scale: 1 });
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  const stageRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<HexViewHandle | null>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setViewport({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const teamColor = TEAMS.find((t) => t.id === activeTeam)?.color ?? '#ffffff';

  const handleClick = useCallback(
    (tile: { q: number; r: number } | null) => {
      if (!tile) {
        setSelected(null);
        return;
      }
      const k = key(tile.q, tile.r);
      setSelected((prev) => (prev === k ? null : k));
      // Smoke-test wiring: log every click to the server.
      void postClick({ teamId: activeTeam, q: tile.q, r: tile.r });
    },
    [activeTeam],
  );

  const handleHover = useCallback((tile: { q: number; r: number } | null) => {
    setHoveredKey(tile ? key(tile.q, tile.r) : null);
  }, []);

  const handleReset = () => viewRef.current?.reset();

  // R key for reset
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
        handleReset();
      } else if (e.key === 'Escape') {
        setSelected(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // For status & player counts (player counts = 0 for now, just stub)
  const players: Record<string, number> = TEAMS.reduce<Record<string, number>>((acc, t) => {
    acc[t.id] = 0;
    return acc;
  }, {});
  if (selected) players[activeTeam] = 1;

  const hoveredTile = hoveredKey ? tiles.get(hoveredKey) ?? null : null;

  const showCoordsForCanvas: boolean | 'always' =
    showCoords === 'always' ? 'always' : showCoords === 'select';

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg className="brand-mark" viewBox="0 0 24 24">
            <polygon
              points="12,2 21,7 21,17 12,22 3,17 3,7"
              fill="none"
              stroke="#e7eef7"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <polygon
              points="12,7 17,9.5 17,14.5 12,17 7,14.5 7,9.5"
              fill="#e7eef7"
              opacity="0.85"
            />
          </svg>
          <span className="brand-name">Hexfield</span>
          <span className="brand-sub">prototype · room #4f2a</span>
        </div>
        <div className="topbar-spacer" />
        <div className="topbar-info">
          <span className="pip" />
          <span>connected · 1 player</span>
        </div>
      </header>

      <div className="stage" ref={stageRef}>
        <HexCanvas
          tiles={tiles}
          cols={cols}
          rows={rows}
          hexSize={hexSize}
          selected={selected ? new Set([selected]) : new Set()}
          hovered={hoveredKey}
          teamColor={teamColor}
          showCoords={showCoordsForCanvas}
          panSpeed={panSpeed}
          zoomSpeed={zoomSpeed}
          onTileClick={handleClick}
          onHover={handleHover}
          viewRef={viewRef}
          onViewChange={setView}
        />
        <div className="hud-overlay">
          <TeamLegend
            teams={TEAMS}
            activeId={activeTeam}
            onSelect={setActiveTeam}
            players={players}
          />
          <Minimap
            tiles={tiles}
            cols={cols}
            rows={rows}
            hexSize={hexSize}
            view={view}
            viewport={viewport}
            selected={selected}
            teamColor={teamColor}
          />
          <div className="hint">
            <kbd>drag</kbd>
            <span>pan</span>
            <kbd>scroll</kbd>
            <span>zoom</span>
            <kbd>↑↓←→</kbd>
            <span>pan</span>
            <kbd>R</kbd>
            <span>reset</span>
            <kbd>Esc</kbd>
            <span>deselect</span>
          </div>
        </div>
      </div>

      <div className="bottom-row">
        <StatusBar
          hovered={hoveredTile}
          selected={selected}
          scale={view.scale}
          view={view}
          cols={cols}
          rows={rows}
          onReset={handleReset}
        />
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Grid">
          <TweakSlider
            label="Hex size"
            value={hexSize}
            min={10}
            max={48}
            step={1}
            onChange={(v) => setTweak('hexSize', v)}
          />
          <TweakSlider
            label="Columns"
            value={cols}
            min={20}
            max={200}
            step={5}
            onChange={(v) => setTweak('cols', v)}
          />
          <TweakSlider
            label="Rows"
            value={rows}
            min={20}
            max={200}
            step={5}
            onChange={(v) => setTweak('rows', v)}
          />
          <TweakNumber
            label="Seed"
            value={seed}
            step={1}
            onChange={(v) => setTweak('seed', Number(v) || 0)}
          />
        </TweakSection>
        <TweakSection label="Interaction">
          <TweakSlider
            label="Pan speed"
            value={panSpeed}
            min={0.25}
            max={3}
            step={0.05}
            onChange={(v) => setTweak('panSpeed', v)}
          />
          <TweakSlider
            label="Zoom speed"
            value={zoomSpeed}
            min={0.25}
            max={3}
            step={0.05}
            onChange={(v) => setTweak('zoomSpeed', v)}
          />
        </TweakSection>
        <TweakSection label="Display">
          <TweakRadio<ShowCoordsMode>
            label="Coordinates"
            value={showCoords}
            options={[
              { value: 'off', label: 'Off' },
              { value: 'select', label: 'On select' },
              { value: 'always', label: 'Always' },
            ]}
            onChange={(v) => setTweak('showCoords', v)}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}
