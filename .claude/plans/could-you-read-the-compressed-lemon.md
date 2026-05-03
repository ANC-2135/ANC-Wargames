# Plan: Vite + TypeScript dev setup with non-technical README

## Context
Today the project is a build-less prototype: `index.html` pulls React/ReactDOM/Babel from `unpkg.com` and loads six sibling files (`hex-math.js`, `terrain.js`, `tweaks-panel.jsx`, `hex-canvas.jsx`, `hud.jsx`, `app.jsx`) as `<script src="…">`. Those files communicate by attaching globals to `window` (`HexMath`, `Terrain`, `TEAMS`, `HexCanvas`, `TeamLegend`, `Minimap`, `StatusBar`, `TweaksPanel`, …). It only "runs" if you serve it over HTTP because Babel-Standalone uses `fetch()` for `type="text/babel"` `src` attributes.

The user wants this to grow into a web game, so we are switching to:
- **Vite** as the dev server / build tool (real HMR, real module resolution, real build for production).
- **TypeScript (strict)** across the whole codebase, so types catch breakages early as the game grows.
- A **README** written for someone who has never installed Node before.

There are two existing constraints that the migration must not break:
1. The `/*EDITMODE-BEGIN*/ … /*EDITMODE-END*/` markers around `TWEAK_DEFAULTS` in `app.jsx`.
2. The `window.parent.postMessage({ type: '__edit_mode_*' }, '*')` plumbing in `tweaks-panel.jsx`.

Both look like an external "edit-in-place" tool the user runs the prototype inside. Migration must preserve them verbatim.

---

## Target structure

```
ANC-Wargames/
├── README.md                  ← new, non-technical
├── package.json               ← new
├── tsconfig.json              ← new (strict)
├── tsconfig.node.json         ← new (for vite.config)
├── vite.config.ts             ← new
├── .gitignore                 ← new (node_modules, dist)
├── index.html                 ← edited: drop CDN/Babel scripts; add <script type="module" src="/src/main.tsx">
├── public/
│   └── assets/                ← MOVE existing assets/ here so URLs stay /assets/tokens/X.png
│       ├── tokens/
│       └── vehicles/
└── src/
    ├── main.tsx               ← entry: ReactDOM.createRoot(...).render(<App />)
    ├── App.tsx                ← <App /> component (from app.jsx)
    ├── styles.css             ← extracted from <style> block in index.html
    ├── lib/
    │   ├── hex-math.ts        ← from hex-math.js, exports + types
    │   └── terrain.ts         ← from terrain.js, exports + types
    └── components/
        ├── HexCanvas.tsx      ← from hex-canvas.jsx
        ├── Hud.tsx            ← TEAMS + TeamLegend + Minimap + StatusBar (from hud.jsx)
        └── TweaksPanel.tsx    ← TweaksPanel + TweakSection/Slider/Number/Radio + useTweaks (from tweaks-panel.jsx)
```

Why this layout:
- `public/assets/` keeps the existing image URLs (`/assets/tokens/X.png`) working unchanged. Vite serves `public/` at the root.
- `src/lib/` for pure logic, `src/components/` for React — easy to grow.
- One file per existing source file (no premature splitting). `Hud.tsx` keeps the related legend/minimap/status pieces together as they are today.

---

## Dependencies (added by `npm install`)

Runtime:
- `react@^18.3.1`, `react-dom@^18.3.1` (matches current CDN versions)

Dev:
- `vite@^5`
- `@vitejs/plugin-react-swc` (faster than the Babel plugin; we have no Babel-only features to preserve)
- `typescript@^5`
- `@types/react`, `@types/react-dom`

No state library, no router, no test runner yet — keep it minimal. Add as the game needs them.

---

## Configuration files

**`package.json`** — minimal:
```json
{
  "name": "anc-wargames",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b --noEmit"
  }
}
```
(deps added by `npm install` commands during execution)

**`tsconfig.json`** — strict, React-JSX, ES2022, bundler resolution:
- `"strict": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`, `"noFallthroughCasesInSwitch": true`
- `"jsx": "react-jsx"` (no need to import React in every file)
- `"moduleResolution": "bundler"`, `"module": "ESNext"`, `"target": "ES2022"`
- `"lib": ["ES2022", "DOM", "DOM.Iterable"]`
- `"include": ["src"]`

**`tsconfig.node.json`** — companion for `vite.config.ts` only.

**`vite.config.ts`**:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
export default defineConfig({ plugins: [react()] });
```

**`.gitignore`**: `node_modules/`, `dist/`, `*.local`, `.vite/`.

---

## index.html changes

- Keep the `<style>…</style>` block extracted into `src/styles.css` (imported by `main.tsx`) — or leave it inline if simpler, but extraction keeps `index.html` clean.
- **Delete** all four `<script src="https://unpkg.com/…">` tags and all six `<script src="…">` / `<script type="text/babel" src="…">` tags.
- **Add**: `<script type="module" src="/src/main.tsx"></script>` before `</body>`.
- Keep the Google Fonts `<link>` tags — unaffected.

---

## File-by-file migration

For every file: remove `window.X = X` lines; add `export` at definition sites; add `import` at top of any file that used to rely on the global.

### `src/lib/hex-math.ts` (from `hex-math.js`)
- Replace `const HexMath = (() => { … return { … }; })()` with named exports: `export function hexToPixel(...)`, `export function pixelToHex(...)`, etc.
- Add `export const SQRT3`, `export const NEIGHBORS`.
- Types to add:
  ```ts
  export interface Axial { q: number; r: number; }
  export interface Offset { col: number; row: number; }
  export interface Pixel { x: number; y: number; }
  export type HexKey = `${number},${number}`;
  ```
- All functions get explicit param/return types.
- Drop `window.HexMath = HexMath`.

### `src/lib/terrain.ts` (from `terrain.js`)
- `import * as HexMath from './hex-math'` (or named imports).
- Named exports: `generate`, `PALETTE`, `mulberry32`.
- Types:
  ```ts
  export type TerrainType =
    | 'deep_water' | 'water' | 'sand' | 'plains'
    | 'grass' | 'forest' | 'hills' | 'mountain';
  export interface Tile {
    q: number; r: number; col: number; row: number;
    type: TerrainType; elev: number; moist: number; detail: number;
  }
  export type TileMap = Map<HexKey, Tile>;
  export interface PaletteEntry { fill: string; edge: string; accent: string; label: string; }
  export const PALETTE: Record<TerrainType, PaletteEntry>;
  ```
- Drop `window.Terrain = Terrain`.

### `src/components/Hud.tsx` (from `hud.jsx`)
- Named exports: `TEAMS`, `TeamLegend`, `Minimap`, `StatusBar`.
- Define a `Team` interface and type `TEAMS` as `readonly Team[]`.
- Each component gets a `Props` interface (e.g. `TeamLegendProps { teams; activeId; onSelect; players }`).
- `Minimap` reads `Tile` / `TileMap` types from `../lib/terrain`.
- Drop the four `window.X = X` lines.

### `src/components/HexCanvas.tsx` (from `hex-canvas.jsx`)
- `export function HexCanvas(props: HexCanvasProps)`.
- `import { hexToPixel, hexCorners, key, pixelToHex } from '../lib/hex-math'` etc.
- `import type { Tile, TileMap } from '../lib/terrain'`.
- Props interface covers everything `app.jsx` passes today: `tiles, cols, rows, hexSize, selected: Set<HexKey>, hovered, teamColor, showCoords, panSpeed, zoomSpeed, onTileClick, onHover, viewRef, onViewChange`.
- `viewRef` → `React.MutableRefObject<{ reset: () => void } | null>`.
- Drop `window.HexCanvas = HexCanvas`.

### `src/components/TweaksPanel.tsx` (from `tweaks-panel.jsx`)
- Named exports: `TweaksPanel`, `TweakSection`, `TweakSlider`, `TweakNumber`, `TweakRadio`, `useTweaks`.
- `useTweaks<T extends Record<string, unknown>>(defaults: T): [T, <K extends keyof T>(k: K, v: T[K]) => void]` — generic over the shape so callers get checked field names.
- **Keep all `window.parent.postMessage({ type: '__edit_mode_*' }, '*')` calls and the `'message'` listener exactly as-is** (this is the external editor bridge).
- Type the message events with a discriminated union (`__edit_mode_set_keys` etc.) but cast from `event.data` at the boundary; do not change the wire format.

### `src/App.tsx` (from `app.jsx`, component half)
- `import { HexCanvas } from './components/HexCanvas'`
- `import { TEAMS, TeamLegend, Minimap, StatusBar } from './components/Hud'`
- `import { TweaksPanel, TweakSection, TweakSlider, TweakNumber, TweakRadio, useTweaks } from './components/TweaksPanel'`
- `import * as HexMath from './lib/hex-math'`
- `import * as Terrain from './lib/terrain'`
- Replace `const { useMemo, useState, … } = React` with `import { useMemo, useState, useRef, useCallback, useEffect } from 'react'`.
- Define `interface Tweaks { hexSize: number; cols: number; rows: number; panSpeed: number; zoomSpeed: number; showCoords: 'off' | 'select' | 'always'; seed: number; }` and type `TWEAK_DEFAULTS: Tweaks`.
- **Preserve the `/*EDITMODE-BEGIN*/ … /*EDITMODE-END*/` markers around the literal**, including the exact JSON-style formatting between them — the external editor pattern-matches on those.
- `export function App() { … }` (no `ReactDOM.createRoot` here).

### `src/main.tsx` (entry)
```tsx
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
const el = document.getElementById('root');
if (el) createRoot(el).render(<App />);
```

### `src/styles.css`
- Verbatim copy of the `<style>…</style>` block currently in `index.html`.

---

## README.md (for a non-technical reader)

Structure (each step short, with the exact command in a code block):

1. **What this is** — one sentence: "A browser-based hex-grid wargame prototype. This guide gets it running on your own computer."
2. **One-time setup**
   1. Install **Node.js**. Go to <https://nodejs.org/>, download the **LTS** version (the big green button on the left), run the installer, accept the defaults. *Why: Node.js is the engine that runs the dev tools.*
   2. Open a terminal in this folder.
      - Windows: right-click the folder in File Explorer → "Open in Terminal".
      - macOS: right-click → "New Terminal at Folder" (enable in Finder settings if missing).
      - Linux: open Terminal, then `cd` into this folder.
   3. Run `npm install` and wait for it to finish (≈1 minute the first time, nothing the next time). *This downloads the libraries the project uses into a `node_modules` folder.*
3. **Every time you want to run the game**
   1. In the terminal in this folder, run `npm run dev`.
   2. The terminal will print something like `Local: http://localhost:5173/`. Click the link, or copy it into your browser. The page should load.
   3. Edits to files in `src/` reload in the browser automatically.
   4. To stop, press `Ctrl + C` in the terminal.
4. **Common problems**
   - *"`npm` is not recognized" / "command not found":* Node.js didn't install correctly, or the terminal was open before installing — close every terminal window, open a new one, try again.
   - *"Port 5173 is in use":* something else is using that port. Run `npm run dev -- --port 5174`.
   - *Browser shows a blank page:* open the browser DevTools (F12), copy any red text from the Console tab, and share it.
5. **Optional: build a shareable version** — `npm run build` puts a self-contained copy in `dist/`. Any static file host (or `npm run preview` to test it locally) can serve that folder.

Tone: imperative, no jargon, every command in a fenced block; never assume the reader knows what `cd`, `npm`, or "module" means without a one-line gloss the first time.

---

## Verification (after execution)

1. `npm install` completes with no errors.
2. `npm run typecheck` passes (proves the strict TS migration is clean).
3. `npm run dev` starts; visiting the printed URL renders:
   - Topbar with "Hexfield" brand
   - Hex canvas (terrain, mouse pan/zoom work)
   - Team legend (right), Minimap (bottom-left), StatusBar (bottom)
   - Hint card and Tweaks panel
4. Browser DevTools Console has **no red errors** and **no 404s** under the Network tab.
5. Press `R` resets the view; `Esc` deselects; click selects a hex — all behaviors match the pre-migration build.
6. `npm run build` produces a `dist/` folder; `npm run preview` serves it and the page works the same.
7. The `/*EDITMODE-BEGIN*/ … /*EDITMODE-END*/` block is byte-identical to the original (diff against the pre-migration `app.jsx` to confirm).

---

## Files changed / added

**Added:** `README.md`, `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/lib/hex-math.ts`, `src/lib/terrain.ts`, `src/components/HexCanvas.tsx`, `src/components/Hud.tsx`, `src/components/TweaksPanel.tsx`.

**Edited:** `index.html` (drop CDN + sibling-script tags, add module entry; optionally extract `<style>`).

**Moved:** `assets/` → `public/assets/` (no file content changes).

**Deleted:** `app.jsx`, `hex-canvas.jsx`, `hud.jsx`, `tweaks-panel.jsx`, `terrain.js`, `hex-math.js` (replaced by their `src/` counterparts).
