# ANC-Wargames

Browser-based hex-grid wargame, growing from prototype toward multiplayer. Vite + React 18 + TypeScript (strict). Pure SPA — no backend yet.

## Commands

- `npm run dev` — dev server with HMR at `http://localhost:5173/`
- `npm run typecheck` — `tsc -b --noEmit`. **Run this after non-trivial changes**; `npm run build` also typechecks but is slower.
- `npm run build` / `npm run preview`

## External-editor integration — do not remove

The prototype runs inside an external "edit mode" host. Two pieces glue it together; both must be preserved verbatim across refactors:

1. **`src/App.tsx`** — `TWEAK_DEFAULTS` is wrapped in `/*EDITMODE-BEGIN*/ … /*EDITMODE-END*/` comment markers. The host pattern-matches these to rewrite the block on disk when the user drags a slider. The literal between the markers must stay JSON-shaped (no spread, no expressions, no computed keys).
2. **`src/components/TweaksPanel.tsx`** — `window.parent.postMessage` calls (`__edit_mode_available`, `__edit_mode_set_keys`, `__edit_mode_dismissed`) and the `'message'` listener for `__activate_edit_mode` / `__deactivate_edit_mode`. The listener is registered *before* `__edit_mode_available` is posted on purpose — don't reorder.

If strict TS flags either, fix the types around them, not the protocol.

## Conventions

- **Hex math**: pointy-top, axial coords. `key(q, r)` from `src/lib/hex-math.ts` produces the `"q,r"` string used as the canonical `Map` key everywhere — always go through it, don't hand-format.
- **Assets**: drop static files in `public/assets/`; reference them as `/assets/...` in code (Vite serves `public/` at root).
- **Modules**: `src/lib/` = pure logic, no React; `src/components/` = React. No `window.X = X` globals — everything imports.

## Strict-TS gotchas

- `verbatimModuleSyntax: true` — type-only imports MUST use `import type { Foo } from '...'`.
- `noUnusedLocals` / `noUnusedParameters` are on. For props you accept-but-don't-use, rename with a leading `_` and `void` it once in the body (see `_cols` / `_rows` in `HexCanvas.tsx`).
- Use `MutableRefObject` (not `RefObject`) for refs the component assigns into — see `viewRef` in `HexCanvas.tsx`.

## Performance notes

`HexCanvas.draw` loops every tile each frame and culls per-tile. Fine up to ~10k tiles. If grids grow or zoom-out gets slow, the next move is an **offscreen pre-rendered world canvas** (regenerate on `tiles`/`hexSize` change, blit at low zoom). Cheaper interim wins: batch fills by `pal.fill` color (set `fillStyle` once per terrain type), or drop into a raster representation at extreme zoom-out (the `Minimap` already does this).
