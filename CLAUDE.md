# ANC-Wargames

Browser-based hex-grid wargame, growing from prototype toward turn-based multiplayer. **Yarn 4 monorepo** with three workspaces: `apps/client` (React + Vite), `apps/server` (Fastify + better-sqlite3), `packages/shared` (TS types).

## Commands (run from repo root)

- `yarn dev` — `docker compose up --build`. Brings up three services: client at `http://localhost:5173/`, server at `http://localhost:3001/`, and a read-only sqlite-web DB viewer at `http://localhost:8081/`. SQLite file lands in `./data/anc.db` via bind-mount.
- `yarn dev:native` — runs both workspaces directly with `tsx watch` / `vite`. Faster feedback than docker; native DB lands at `apps/server/data/anc.db` (different file from the docker one — they don't share state).
- `yarn typecheck` — typechecks every workspace. **Run after non-trivial changes.**
- `yarn build` — typecheck + production build of every workspace.
- `yarn stop` — `docker compose down`.

Targeting one workspace: `yarn workspace @anc/client typecheck`, `yarn workspace @anc/server dev`, etc.

## Layout

```
apps/client/          React + Vite SPA. Owns its own tsconfig*.json + vite.config.ts.
apps/server/          Fastify + better-sqlite3. tsx-watched in dev; no build step in dev.
  src/
    db.ts             open + run idempotent SQL migrations from src/migrations/*.sql
    routes/           one file per resource; each exports a FastifyPluginAsyncZod
    migrations/       NNN_name.sql, applied in lex order, tracked in `_migrations` table
packages/shared/      Pure types consumed by both apps. No build — package.json points at src/index.ts.
data/                 Bind-mounted into the server container. Gitignored.
compose.yaml          dev-time compose. Bind-mounts source for HMR; `data/` for DB persistence.
```

## Architectural decisions worth knowing

- **Fastify over Express** — `fastify-type-provider-zod` lets a single zod schema both validate `request.body` and infer the handler's TS types. Keep route handlers shaped as `FastifyPluginAsyncZod`-returning factory functions that take the `db` (see `routes/clicks.ts`) so dependencies stay injectable.
- **better-sqlite3, not a full DB server** — the eventual hosting story is a self-contained Docker container, so the DB is one file inside the volume. Synchronous API; no `await db.query()`. If we ever need multi-process access we'll switch to Postgres.
- **Roll-your-own migrations** — `db.ts` reads `src/migrations/*.sql` in lex order, tracks applied filenames in `_migrations`. Don't add Drizzle/Knex/Prisma until the schema needs joins/relations the hand-written SQL can't express clearly.
- **Vite proxy** — client calls `/api/*`; vite proxies to `VITE_API_TARGET` (defaults to `http://localhost:3001` for native dev, set to `http://server:3001` by compose). Never put the API origin in client code.
- **Type sharing via `@anc/shared`** — both apps `import type { Click } from '@anc/shared'`. The package has no build step (`main`/`types` point at `src/index.ts`); tsx and vite both resolve `.ts` directly.

## External-editor integration — do not remove

The prototype runs inside an external "edit mode" host. Two pieces must be preserved verbatim:

1. **`apps/client/src/App.tsx`** — `TWEAK_DEFAULTS` is wrapped in `/*EDITMODE-BEGIN*/ … /*EDITMODE-END*/` comment markers. The host pattern-matches these to rewrite the block on disk when the user drags a slider. The literal between the markers must stay JSON-shaped (no spread, no expressions, no computed keys).
2. **`apps/client/src/components/TweaksPanel.tsx`** — `window.parent.postMessage` calls (`__edit_mode_available`, `__edit_mode_set_keys`, `__edit_mode_dismissed`) and the `'message'` listener for `__activate_edit_mode` / `__deactivate_edit_mode`. The listener is registered *before* `__edit_mode_available` is posted on purpose — don't reorder.

If strict TS flags either, fix the types around them, not the protocol.

## Conventions

- **Hex math**: pointy-top, axial coords. `key(q, r)` from `apps/client/src/lib/hex-math.ts` produces the `"q,r"` string used as the canonical `Map` key everywhere — always go through it, don't hand-format.
- **Assets**: drop static files in `apps/client/public/assets/`; reference them as `/assets/...` in code (Vite serves `public/` at root).
- **Modules**: `src/lib/` = pure logic, no React; `src/components/` = React. No `window.X = X` globals — everything imports.
- **API endpoints**: namespaced under `/api/*`. Validate inputs with zod via `fastify-type-provider-zod`; transform DB row shape (snake_case) to API shape (camelCase) at the route boundary, never expose raw rows.

## Strict-TS gotchas

- `verbatimModuleSyntax: true` everywhere — type-only imports MUST use `import type { Foo } from '...'`.
- Server tsconfig sets `allowImportingTsExtensions: true` so `.ts` import suffixes are required (matches what tsx wants at runtime).
- `noUnusedLocals` / `noUnusedParameters` are on. For props you accept-but-don't-use, rename with a leading `_` and `void` it once in the body (see `_cols` / `_rows` in `HexCanvas.tsx`).
- Use `MutableRefObject` (not `RefObject`) for refs the component assigns into — see `viewRef` in `HexCanvas.tsx`.

## Docker / WSL2 gotchas

- The bind-mounted `data/` directory ends up owned by `root` because the container runs as root by default. Use `sudo rm -rf data/` if you need to wipe it from the host, or `docker compose down && docker compose run --rm server sh -c 'rm -rf /data/*'`.
- HMR through bind-mounts on WSL2 needs polling. `vite.config.ts` already enables `usePolling` when `VITE_USE_POLLING=1` (set by compose).
- `better-sqlite3` is a native module — the server image uses `node:20-bookworm` (not `-slim`) so the build toolchain is present. Don't switch to alpine without adding `apk add --no-cache python3 make g++`.

## Performance notes

`HexCanvas.draw` loops every tile each frame and culls per-tile. Fine up to ~10k tiles. If grids grow or zoom-out gets slow, the next move is an **offscreen pre-rendered world canvas** (regenerate on `tiles`/`hexSize` change, blit at low zoom). Cheaper interim wins: batch fills by `pal.fill` color (set `fillStyle` once per terrain type), or drop into a raster representation at extreme zoom-out (the `Minimap` already does this).
