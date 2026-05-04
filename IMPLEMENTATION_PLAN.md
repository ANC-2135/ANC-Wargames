# ANC-Wargames — Implementation Plan

Manual review: Upon review we'll leave notes with @FIX, @TODO, @CLARIFICATION, @CONFIRM - When planning these will need to be addressed before moving forward.

> Captured 2026-05-04 after a clarifying-question pass over `GAMERULES.md`. This document is the working build plan; rules-of-the-game live in `GAMERULES.md`. Manual review pending before execution.

Cross-references to `GAMERULES.md` use `§N.M` (rules section) and `Q#` (one of the 38 ambiguity flags in §13 of that doc).

---

## 1. Architectural decisions (locked in)

| Decision | Choice | Rationale / impact |
|---|---|---|
| Multiplayer | Async submit-orders; SQLite is source of truth | Existing Fastify + better-sqlite3 stack already supports it. Fits "all players move simultaneously." |
| Phase loop | Per-match: round N → orders queue → server resolves all phases in §7 order → broadcast next state | Maps cleanly onto Fastify routes + a server-side resolver module. |
| Control | One human per side; `Controller` interface abstracts over `HumanController` and (future) `AIController` | Lets AI plug in without server changes. |
| Escalation | Feature-flagged, off by default | Rules and UI gated behind `match.config.escalation`. |
| Map | Default `mapSide: 16`; hex grid (flat-top tile, pointy-top overall map) | TweaksPanel stays the design tool. |
| Deploy zones | Two opposing wedges; `wedgeDepth` / `zoneShape` parameters configurable per-match | Defaults derive from axial coords, not hardcoded. |
| Move collision | Two opposing units onto same tile → Chaos Mode resolves immediately at end of Movement Phase | Forces a "lite" Chaos Mode forward into the build order. |
| LOS | Mountain blocks ground LOS; obstacle blocks if `obstacle.elevation >= firer.elevation`; aircraft + artillery ignore LOS; no defender-uphill penalty | Recorded as a `los.ts` rules module. |

## 2. Cluster-A defaults (confirm-the-obvious, baked into stat tables)

Unless overridden later, the implementation will assume:

| # | Question | Default |
|---|---|---|
| 1 | GS Max DP | 3 |
| 3 | Default counts | 5×IFV, 5×AA, 5×LT, 5×HT, 5×MA, 5×TL, 3×DE, 3×GS |
| 5 | HT/HHT firepower | Offensive: target's effective RTD −1 |
| 8 | DE | 5 DP, 3 instances per side |
| 9 | AC Max DP | 5 |
| 12 | Knight Commander Engaged | N auto-hits where N = remaining DP |
| 18 | Artillery dispersion | Hex grid; each D6 → one of 6 neighbours; collisions stack damage |
| 19 | AA suppression | Defender's AA in range of the target tile suppresses AOE |
| 23 | Chaos Mode | Resolves once per round; recurs if units remain co-located |
| 25 | HST damage chart | 5 DP cols + 5 mine cols |
| 26 | CAS Max DP | 2 |
| 31 | Mines | Each entered mine triggers = 1 DP |
| 35 | CKW | Max 1 per side |

## 3. Foundation work (Milestone 0 — prerequisites)

Infrastructure laid down before any phase milestone. None of this is user-visible alone, but skipping it forces rework at every step.

1. **`packages/shared` — game-state types**
   - `MatchId`, `PlayerId`, `Side`, `UnitId`, `UnitType`, `UnitStats`, `Asset` (unit OR fortification), `Order`, `Phase`, `RoundState`, `MatchConfig`, `MatchState`.
   - Stat tables (Speed/Range/RTD/MaxDP/Count) live here as a const so client and server share one source of truth.
2. **`apps/server` — match service**
   - Migration `002_matches.sql`: `matches`, `players`, `assets`, `orders`, `events` (append-only event log so resolution is replayable).
   - Routes: `POST /api/matches` (create + setup), `POST /api/matches/:id/orders` (submit phase orders), `GET /api/matches/:id` (state), `POST /api/matches/:id/resolve` (server-driven; called when all sides have submitted).
   - `src/game/` resolver module — pure functions over `MatchState + Orders → MatchState + Events`. **Critical**: keep this dependency-free and unit-testable. The resolver is the heart of the game; never let route handlers contain rules.
3. **Controller abstraction (client)**
   - `Controller.proposeOrders(state, phase) → Order[]`. `HumanController` reads from UI; `AIController` (stub for now) returns `[]`. Wiring set up so adding AI later is a new file, not a refactor.
4. **Deployment-zone helper (`apps/client/src/lib/zones.ts`, also reused server-side)**
   - `wedgeFor(side, mapSide, depthFraction)` returns the set of `HexKey`s a side can place into. Wedge centred on the side's vertex (top vertex for player 1, bottom vertex for player 2 in a 1v1 — natural after the recent rotation).

**Cleanup**: rip out the demo `clicks` route + `001_clicks.sql` migration once Milestone 2 lands. Until then it's harmless.

## 4. Milestones

### M1 — Map foundation + deployment zones (§12 phase 1)
- Map terrain types → elevation levels: `deep_water/water/sand/plains/grass/forest = 1, hills = 2 or 3 (tunable), mountain = 5`. Add `elevation` to `Tile` (can derive from `terrain.ts` rather than store).
- Render Mountain as visually distinct (impassable indicator).
- Implement and render wedge deployment zones for both sides (two coloured overlays in HexCanvas).
- TweaksPanel gains `wedgeDepth` slider so the zone size can be tuned live.

**Resolves**: Q36 (default 16), Q37 (hex confirmed), Q38 (wedges + adjustable), Q13 (elevation rules).

### M2 — Units, placement, Movement Phase (§12 phase 2)
- Standard unit registry with stats from §4 (IFV/AA/LT/HT/MA/GS).
- Setup UI: each player drags assets from a counter pool into their wedge; server validates.
- Movement Phase: client submits an `Order[]` of `{unitId, path: HexKey[]}`. Server validates each path (≤ Speed, no friendly tile end-state, terrain rules, etc).
- Simultaneous resolution: server walks every order step-by-step in lock-step; collisions detected.
- Aircraft (GS) skip Movement.
- **Lite Chaos hook**: on collision detection, mark contested tiles for Chaos resolution. Actual Chaos resolution lands in M5 — until then, contested orders are *rejected* with a clear error, so Movement still works for non-conflicting plays.

**Resolves**: Q3 (default counts), Q5 (HT firepower offensive — defined here, used in M3).

### M3 — LOS + Firing Phase + RTD (§12 phase 3)
- `los.ts`: hex line drawer (cube-coordinate variant), elevation-aware obstacle test per the locked-in rules.
- Firing Phase: each non-AA/non-MA/non-GS unit submits one `{shooterId, targetId}`. Server validates range + LOS, rolls D6, applies HT/AC modifiers.
- All damage applied *at end of phase* (matches §3.1).
- Damage rolls and outcomes stored in the `events` log so the client can replay/animate.

### M4 — Damage tracking + destruction (§12 phase 4)
- `Asset.dp` decrements; at 0 → unit destroyed (removed); fortification at 0 → marked inoperable (defer fort logic to M8).
- Damage Chart UI per side (HUD panel).
- Round counter + phase indicator.
- **First playable end-to-end loop** for unit-vs-unit firing.

### M5 — Lite Chaos Mode (pulled forward from §12 phase 8)
- Resolution per §8.1: each side rolls D6 per remaining DP, RTD checks, distribute damage, end-of-phase application.
- Scope: **unit-vs-unit only** (no forts, no commanders, no 3-way). Covers movement collisions and gives Movement Phase its proper resolution.
- Chaos persists across rounds if units stay co-located (Q23 default).
- M2's collision-rejection becomes collision-resolution.

**Resolves**: Q23.

### M6 — Artillery Phase (§12 phase 6)
- MA places an Artillery Targeting Marker round 1; round 2+ resolves 3×D6 dispersion onto hex neighbours (D6 1–6 → one of six neighbours; collisions stack damage).
- AA suppression: if defender has AA in range of the target tile, only centre + 3 dice tiles take damage; else centre + ALL 6 neighbours.
- Auto-damage (skip RTD) except for bridges (defer bridge handling to M9).
- Designer Q&A at start of milestone: Q4 (exact suppression formula).

**Resolves**: Q4, Q18, Q19.

### M7 — Airstrike Phase (§12 phase 7)
- DE fortification stub needed first (just enough for "GS is stationed at a friendly DE"). Full DE behaviour lands in M8.
- Phase order: AA fires at inbound aircraft → survivors move → fire → return.
- GS movement budget 20 tiles total round-trip; 2 shots; abort on AA damage.
- Designer Q&A at start of milestone: Q6 (Range 1 means adjacent), Q7 (split shots, move-between), Q20–Q22 (CAS rate, AA initiative, GS-vs-GS timing).

**At the end of M7, the game is "fully playable" per the designer bar** — all four required phases run.

### M8 — Fortifications, seizure, restoration (§12 phase 5)
- TL + DE with defensive RTD bonus, max DP, inoperable state.
- IFV seizure (§5.5), restoration (§5.6).
- Chaos extends to unit-vs-fort and 3-way (now in scope from M5).

**Resolves**: Q8, edges in §8.2.

### M9 — Bridges, rivers, rail lines (§12 phase 10)
- BR + RC + RL terrain. Designer Q&A: Q14, Q15, Q16.

### M10 — Commanders + victory conditions (§12 phase 9)
- DC and AC; "Hold the Line", "Targeting Assistance", Knight Commander Engaged.
- Regicide, Siege Breaker, Peace Treaty resolution.
- Designer Q&A: Q9, Q10, Q11, Q12.

### M11 — AI controller
- `AIController.proposeOrders` for at least one playable difficulty. Heuristic-based (target nearest enemy, cluster around HT, etc).

### M12 — Escalation feature flag
- Hover units, ATL/CB, HST mines, CKW. Designer Q&A: Q24–Q35.

## 5. Outstanding-question ledger (deferred questions, by milestone)

The right cluster will be asked *as each milestone starts*, not all up front:

| Will ask at | Questions |
|---|---|
| M6 start | Q4, Q19 (AA suppression specifics) |
| M7 start | Q6, Q7, Q20, Q21, Q22, Q27 (aircraft mechanics) |
| M8 start | Q8 (confirm only) |
| M9 start | Q14, Q15, Q16 (terrain effects) |
| M10 start | Q9, Q10, Q11, Q12 (commander mechanics) |
| M12 start | Q24–Q35 (Escalation cluster) |

Cluster-A defaults (§2 above) are baked into stat tables now and can be flipped with a config change later.

## 6. Suggested first concrete step

**Milestone 0 + M1**: lay down the shared types, match service skeleton, and the deployment-zone overlay on the existing map. Self-contained chunk that lands without any rules logic and prepares the ground for unit placement.

## 7. Open implementation questions

Designer-fillable. Each entry lists the question, the options I see, and a `Decision:` line for you to fill in during review. The **Blocking** set must be answered before M0 starts; the **Soon** set must be answered before the milestone where each one bites.

### 7.1 Blocking (answer before M0)

#### O1 — Fog of war / visibility model
What does each player see of the opponent's state?
- (a) Full board always (tabletop fidelity, simplest).
- (b) Enemy units visible only when within friendly LOS (classic wargame).
- (c) Enemy units always visible, but enemy *orders* hidden until phase resolves (hybrid; matches async submit-orders well).
- (d) Variant: enemy units shown as silhouettes/last-known-position outside LOS.

Cascade: shapes event-log filtering, `MatchState` projection per player, and what the client renders during the orders phase.

**Decision:**

#### O2 — Player identity / auth
How does the server know who is making a request?
- (a) Anonymous handle + match-code (no signup; cookie-bound session per match).
- (b) Persistent account (email or OAuth login).
- (c) Magic-link join URL per side (no account; URL itself is the credential).

Cascade: shape of `players` table, header/cookie scheme, how the dev `yarn dev` flow simulates two players locally.

**Decision:**

#### O3 — Deterministic RNG
How and where are dice rolled?
- (a) Server-side `seedrandom`-style PRNG, seed stored on the match row, every roll appended to the `events` table with `(rollId, seed, value)`. Replay-deterministic.
- (b) Server uses unseeded RNG; record outcomes in events but no replay.
- (c) Client-rolled with server validation (don't recommend — opens cheating).

Cascade: every resolution test asserts against deterministic output; replay/spectator mode comes for free with (a).

**Decision:**

#### O4 — Network transport for state updates
How does the client learn about resolved phases?
- (a) HTTP polling on `GET /api/matches/:id` every N seconds (simplest; no extra infra).
- (b) Server-Sent Events (one-way push from server; works through HTTP/proxies).
- (c) WebSocket (bidirectional; needed only if we later add chat/typing/cursor presence).

Cascade: server route shape, client data-fetch layer, infra footprint.

**Decision:**

#### O5 — Client state-management approach
Where does `MatchState` live on the client?
- (a) React Context + `useReducer` for match state; component-local state for UI.
- (b) Zustand store for match + ephemeral order-drafting state.
- (c) `@tanstack/react-query` as the server-state cache; local store only for in-progress order drafts.

Cascade: file layout under `apps/client/src/`, how `Controller` reads/writes state, optimistic UI behaviour.

**Decision:**

#### O6 — Setup-phase placement protocol
How is initial deployment carried out?
- (a) Simultaneous + hidden: each player places privately, both reveal when both have submitted.
- (b) Simultaneous + visible: each placement appears live to the opponent.
- (c) Alternating: I-go-you-go placement, one asset at a time.
- (d) Snake draft: alternating with reversal each round.

Cascade: M2 setup UI, server validation, fog-of-war interaction (overlaps with O1).

**Decision:**

#### O7 — Phase-deadline / abandonment policy
What happens if a player doesn't submit?
- (a) No timer (manual / GM-style); waits indefinitely. Add resign button.
- (b) Soft deadline: configurable per-match; on expiry, missing player's units default to "no orders" and the phase resolves.
- (c) Hard turn clock with chess-style increment.

Cascade: server scheduler, lobby config UI, how matches recover from disconnects.

**Decision:**

#### O8 — Unit visual representation
What does a unit look like on the hex map (placeholder is fine)?
- (a) Coloured disc with 2–3 letter code (IFV, HT, etc.). Cheap; readable.
- (b) Counter-style chit (square/round token with code + DP pip).
- (c) Sprite/icon per unit type (more art work — defer).

Cascade: M2 rendering, hit-testing, animation hooks.

**Decision:**

### 7.2 Soon (answer at the noted milestone)

#### O9 — Lobby / match-code flow (M0)
Single match-code link? Browser-side lobby list? Direct-create-and-share-URL? **Decision:**

#### O10 — Reconnect & resume (M0)
Match retention period and resume UX. Default suggestion: 7-day retention; rejoin via stored cookie or share-link. **Decision:**

#### O11 — Order editability (M2)
Can a queued order be modified before the phase resolves? Default suggestion: yes, until you press "Lock In"; locked orders are final. **Decision:**

#### O12 — Mid-game stalemate detector (M10)
What happens if both sides go functionally extinct without triggering Regicide or Siege Breaker? Default suggestion: §10.3 Peace Treaty rule C kicks in (least cumulative damage wins) when no legal orders remain on either side. **Decision:**

#### O13 — Multi-mode setup (post-M11)
Plan currently fleshes out 1v1 only. When do we tackle 1v1v1, 2v2, Large 1v1? Default suggestion: defer until after M11 (AI). **Decision:**

#### O14 — Edit-mode host integration (M2 onward)
`CLAUDE.md` flags the TweaksPanel + EDITMODE markers as load-bearing for the external prototype host. Do those stay through full game build, or do we sunset them once Match Setup UI replaces TweaksPanel? **Decision:**

#### O15 — Testing strategy (M0)
Vitest? Node `node:test`? What does a resolver-test fixture look like (state-in / orders-in → state-out / events-out)? **Decision:**

#### O16 — Event/animation schema (M3)
Concrete shape of an `Event`. Suggested: `{ id, matchId, round, phase, kind, payload, createdAt }` with `kind` in `'fire' | 'damage' | 'destroy' | 'move' | 'collide' | 'roll' | …`. Client subscribes to events newer than its high-water-mark and animates each. **Decision:**

### 7.3 Cosmetic (clearly deferrable)

Sound effects, accessibility (color-blind palette, keyboard-only operation, screen reader labels), i18n, mobile/touch input, tutorial / rules help overlay, spectator mode. Capture a one-line decision per item only if/when it becomes blocking.
