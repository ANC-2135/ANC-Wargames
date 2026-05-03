// Main app

const { useMemo, useState, useRef, useCallback, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "hexSize": 22,
  "cols": 100,
  "rows": 100,
  "panSpeed": 1,
  "zoomSpeed": 1,
  "showCoords": "select",
  "seed": 1337
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const { hexSize, cols, rows, panSpeed, zoomSpeed, showCoords, seed } = tweaks;

  // Generate world
  const tiles = useMemo(() => Terrain.generate(cols, rows, seed), [cols, rows, seed]);

  // Selection (single)
  const [selected, setSelected] = useState(null); // "q,r" or null
  const [hoveredKey, setHoveredKey] = useState(null);
  const [activeTeam, setActiveTeam] = useState(TEAMS[0].id);
  const [view, setView] = useState({ tx: 0, ty: 0, scale: 1 });
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  const stageRef = useRef(null);
  const viewRef = useRef(null);

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

  const teamColor = TEAMS.find(t => t.id === activeTeam).color;

  const handleClick = useCallback((tile, evt) => {
    if (!tile) {
      setSelected(null);
      return;
    }
    const k = HexMath.key(tile.q, tile.r);
    setSelected(prev => prev === k ? null : k);
  }, []);

  const handleHover = useCallback((tile) => {
    setHoveredKey(tile ? HexMath.key(tile.q, tile.r) : null);
  }, []);

  const handleReset = () => viewRef.current?.reset();

  // R key for reset
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'r' || e.key === 'R') {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
        handleReset();
      } else if (e.key === 'Escape') {
        setSelected(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // For status & player counts (player counts = 0 for now, just stub)
  const players = TEAMS.reduce((acc, t) => { acc[t.id] = 0; return acc; }, {});
  if (selected) players[activeTeam] = 1;

  const hoveredTile = hoveredKey ? tiles.get(hoveredKey) : null;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg className="brand-mark" viewBox="0 0 24 24">
            <polygon points="12,2 21,7 21,17 12,22 3,17 3,7"
              fill="none" stroke="#e7eef7" strokeWidth="1.5" strokeLinejoin="round"/>
            <polygon points="12,7 17,9.5 17,14.5 12,17 7,14.5 7,9.5"
              fill="#e7eef7" opacity="0.85"/>
          </svg>
          <span className="brand-name">Hexfield</span>
          <span className="brand-sub">prototype · room #4f2a</span>
        </div>
        <div className="topbar-spacer"/>
        <div className="topbar-info">
          <span className="pip"/>
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
          showCoords={showCoords === 'always' ? 'always' : (showCoords === 'select' ? true : false)}
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
            <kbd>drag</kbd><span>pan</span>
            <kbd>scroll</kbd><span>zoom</span>
            <kbd>↑↓←→</kbd><span>pan</span>
            <kbd>R</kbd><span>reset</span>
            <kbd>Esc</kbd><span>deselect</span>
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
          <TweakSlider label="Hex size" value={hexSize} min={10} max={48} step={1}
            onChange={(v) => setTweak('hexSize', v)} />
          <TweakSlider label="Columns" value={cols} min={20} max={200} step={5}
            onChange={(v) => setTweak('cols', v)} />
          <TweakSlider label="Rows" value={rows} min={20} max={200} step={5}
            onChange={(v) => setTweak('rows', v)} />
          <TweakNumber label="Seed" value={seed} step={1}
            onChange={(v) => setTweak('seed', Number(v) || 0)} />
        </TweakSection>
        <TweakSection label="Interaction">
          <TweakSlider label="Pan speed" value={panSpeed} min={0.25} max={3} step={0.05}
            onChange={(v) => setTweak('panSpeed', v)} />
          <TweakSlider label="Zoom speed" value={zoomSpeed} min={0.25} max={3} step={0.05}
            onChange={(v) => setTweak('zoomSpeed', v)} />
        </TweakSection>
        <TweakSection label="Display">
          <TweakRadio label="Coordinates"
            value={showCoords}
            options={[
              { value: 'off',    label: 'Off' },
              { value: 'select', label: 'On select' },
              { value: 'always', label: 'Always' },
            ]}
            onChange={(v) => setTweak('showCoords', v)} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
