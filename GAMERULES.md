# War Games: Trench Combat — Game Rules Specification

> **Source**: `GameRules.docx` by ANC Productions
> **Purpose**: Implementation-ready specification for software development. This document is the authoritative reference for game logic. Sections marked `> AMBIGUITY:` are open questions that require designer clarification before implementation.

---

## 1. Document conventions

- **Acronyms** are defined in §2.
- **Stats tables** use a single canonical schema (Speed / Range / RTD / DP / Count).
- **Phases** are numbered in execution order (§7).
- **Edge cases** are called out in `> NOTE:` blocks.
- **Open questions** are flagged in `> AMBIGUITY:` blocks.

---

## 2. Glossary

### 2.1 Mechanics
| Term | Meaning |
|------|---------|
| D6 | A standard 6-sided die roll |
| DP | Damage Point — the unit of damage; equivalent to 1 HP |
| HP | Hit Points (maximum) — synonymous with max DP capacity |
| RTD | Roll To Damage — minimum D6 result needed to inflict 1 DP on a target. Notation `N+` means "roll N or higher". |
| LOS | Line of Sight |
| S | Speed (max tiles per Movement Phase) |
| R | Range (max tiles to fire) |
| AOE | Area of Effect |

### 2.2 Standard units
| Code | Name |
|------|------|
| IFV | Infantry Fighting Vehicle |
| AA | Mobile Anti-Air *(also written as `MAA` in flavour text)* |
| LT | Light Tank |
| HT | Heavy Tank |
| MA | Mobile Artillery |
| GS | Gunship (aircraft) |

### 2.3 Standard fortifications
| Code | Name |
|------|------|
| TL | Trench Line |
| DE | Defensive Emplacement |

### 2.4 Commanders (optional)
| Code | Name |
|------|------|
| DC | Designated Commander (attaches to an existing unit) |
| AC | Army Commander (specialised command tank) |

### 2.5 Advanced (Escalation) units
| Code | Name |
|------|------|
| IDV | Infantry Deployment Vehicle (hover IFV) |
| HLT | Hover Light Tank |
| HST | Hover Support Tank |
| HHT | Heavy Hover Tank |
| SA | Static Artillery |
| CAS | Close Air Support (aircraft) |
| CKW | City Killer Walker |

### 2.6 Advanced fortifications
| Code | Name |
|------|------|
| ATL | Automated Trench Line |
| CB | Command Bunker |

### 2.7 Terrain
| Code | Name |
|------|------|
| RC | River Crossing |
| RL | Rail Line |
| BR | Bridge |

---

## 3. Core mechanics

### 3.1 Roll To Damage (RTD)
When a unit fires on a target within range and LOS:
1. Roll 1×D6.
2. If `roll >= target's RTD threshold` → 1 DP applied to target.
3. Otherwise → no effect.

**All damage is applied at the END of the phase** (not immediately on roll). This matters for simultaneous firing.

**Exceptions:**
- **Artillery (MA, SA)** auto-damages anything it hits — no RTD roll needed. *Exception: bridges still get an RTD check.*
- **Bridges** are destroyed by exactly **1 successful hit** from any source with RTD 4+.
- **Gunship (GS) missiles** auto-hit their target (target avoids RTD).

### 3.2 Damage tracking
Each unit/fortification has a maximum DP capacity. Damage taken is tracked on a Damage Chart per player.

| Asset | Max DP |
|-------|--------|
| IFV, AA, LT, HT, MA | 5 |
| TL | 5 |
| DE | 5 |
| GS | **3** |

> **AMBIGUITY 1**: The GS damage chart only shows 3 DP columns (vs 5 for ground units). Confirm GS has 3 max DP.

### 3.3 Line of Sight (LOS)
- A firing unit cannot draw LOS through another unit, fortification, or terrain.
- A unit on higher elevation can fire OVER N intervening obstacles (where N = elevation bonus, see §6.1).
- A unit can be fired UPON over obstacles if the firer is at sufficiently higher elevation.
- **Artillery and aircraft ignore LOS.**

### 3.4 Speed
- Maximum tiles a unit may move per Movement Phase.
- A unit may move any distance from 0 up to its Speed value.
- Aircraft (GS, CAS) only move during the Airstrike Phase (§7.4).

### 3.5 Range
- Maximum firing distance in tiles.
- Modified by elevation bonus (§6.1).
- Modified by terrain effects (e.g., AC charged-shot range — §5.2).

### 3.6 Amphibious property
A unit flagged "amphibious" ignores river crossing penalties and survives bridge destruction.

| Unit | Amphibious? |
|------|-------------|
| IFV | ✅ Yes |
| LT | ✅ Yes |
| AA, HT, MA | ❌ No |
| All hover units (IDV, HLT, HST, HHT) | ✅ effectively (hover, not amphibious — see §9.1) |

> **AMBIGUITY 2**: The advanced "Hover Tank" trait is described separately from amphibious. Confirm that hover units treat rivers identically to amphibious units (the rule "travel over rivers and minefields with no penalty" suggests yes).

---

## 4. Standard units — combat statistics

| Unit | Speed | Range | RTD  | Max DP | Count per side | Phase fires in |
|------|-------|-------|------|--------|---------------|----------------|
| IFV  | 3     | 2     | 2+   | 5      | 5             | Firing |
| AA   | 2     | 5     | 3+   | 5      | 5             | **Airstrike only** |
| LT   | 2     | 5     | 3+   | 5      | 5             | Firing |
| HT   | 1     | 5     | 4+   | 5      | 5             | Firing |
| MA   | 1     | 15    | 4+   | 5      | 5             | **Artillery only** |
| GS   | 20*   | 1     | 3+   | 3      | 3             | **Airstrike only** |

\* GS Speed of 20 covers movement-to-firing-position-and-return during one Airstrike Phase.

> **AMBIGUITY 3**: Confirm starting unit counts. The damage charts imply 5 each of IFV/AA/LT/HT/MA/TL and 3 each of DE/GS per side. The "Game mode" rule (§8.2) says players can opt for fewer (e.g. "3 of each instead of 5"), strongly suggesting 5 is the default.

### 4.1 IFV — Infantry Fighting Vehicle
Amphibious assault carrier. Carries troops to seize/restore fortifications.
- **No river crossing penalty.**
- Seizes or restores a fortification if alive on it at end of round (§5.4 / §5.5).

### 4.2 AA — Mobile Anti-Air
Anti-aircraft platform.
- **Only fires during the Airstrike Phase**, against aircraft.
- Suppresses artillery efficiency (see §7.3 — AA presence within range of an artillery target reduces AOE).

> **AMBIGUITY 4**: "Limits artillery efficiency" — the only mechanical statement found is in §7.3 ("when no AA is within range of your target, all surrounding tiles will be struck"). Confirm: AA presence within range of the **target tile** restricts artillery damage to the centre tile + the 3×D6-rolled tiles, while AA absence means centre + ALL surrounding tiles?

### 4.3 LT — Light Tank
Amphibious medium-armour tank.
- No river crossing penalty.

### 4.4 HT — Heavy Tank
Heavy-armour tank with a powerful main gun.
- **Increased firepower**: when HT fires on a target, the target's effective RTD threshold is reduced by 1 (e.g. HT firing at LT, normally 3+, now hits on 2+).
- Not amphibious.

> **AMBIGUITY 5**: The text reads *"Increased firepower: Roll to damage against an enemy target is negated by 1"*. Confirm interpretation: this is **HT's offensive bonus** when shooting (target RTD −1), NOT a defensive trait reducing damage taken by HT. Same applies to HHT (§9.4).

### 4.5 MA — Mobile Artillery
Long-range AOE artillery.
- **Only fires during the Artillery Phase.**
- Hits the marked tile + surrounding tiles per 3×D6 (see §7.3).
- Skips RTD (auto-damage), except against bridges.

### 4.6 GS — Gunship (aircraft)
- Stationed at a friendly DE.
- **Only moves and fires during the Airstrike Phase.**
- Movement: up to 20 tiles to a firing position, then return to base (DE) by end of phase.
- Path may be any direction (around AA, behind terrain) but total movement ≤ 20 tiles.
- Fires up to **2 shots per Airstrike Phase** (per the phase rule in §7.4).
- Missiles auto-hit (target skips RTD).
- **Avoids RTD when fired upon** — only AA and other aircraft can damage GS.
- If damaged by AA on its inbound path, GS aborts the strike.
- If parent DE is inoperable, GS cannot operate until DE is restored.
- A player MAY use their own GS to fire on enemy aircraft (if in range).

> **AMBIGUITY 6**: GS Range is listed as 1 — i.e., it must be adjacent to its target to fire. Confirm Range 1 is correct (it implies the GS must fly directly next to the target tile to fire missiles).

> **AMBIGUITY 7**: "Two shots per phase" is implied by the Airstrike Phase rules ("aircraft can fire twice"). Confirm both shots may target the same or different enemies, and whether both must be within Range 1 of the firing position OR if GS can move between shots.

---

## 5. Fortifications

### 5.1 Statistics

| Fort | Speed | Range | RTD | Max DP | Count per side | Defensive RTD bonus to occupant |
|------|-------|-------|-----|--------|---------------|----------------------------------|
| TL   | 0     | 2     | 4+  | 5      | 5             | +1 |
| DE   | 0     | 5     | 5+  | 5      | 3             | +2 |

> **AMBIGUITY 8**: The DE damage chart shows only 3 unit-instance rows (1, 2, 3) but appears to have full 5-DP columns. Confirm DE has 5 max DP and 3 instances per side.

**General fortification rules:**
- Static — never move.
- Provide a **defensive RTD bonus** to friendly units stationed on them (the unit's RTD when fired upon is increased by the bonus, making it harder to damage).
- When reduced to 0 DP, fortifications become **inoperable** (not destroyed). They remain on the board and can be restored or seized.
- No fortifications may be placed on water or rail tiles.

### 5.2 AC — Army Commander (optional unit)

| Speed | Range  | RTD | Max DP |
|-------|--------|-----|--------|
| 2     | 5–10*  | 5+  | ?      |

\* Standard range is 5. If the AC remains stationary for 1 full round, range becomes 10 with **no terrain bonus applied**. The AC continues firing at range 10 each round until it moves, at which point it reverts to range 5.

> **AMBIGUITY 9**: The AC stat block does not specify Max DP. Default assumption: 5 DP (matching standard ground units). Please confirm.

**AC is the team's commander unit** (see §5.3). Its death loses the game for its team.

### 5.3 DC — Designated Commander (alternative to AC)
- Chosen at game setup: pick any unit on your side to be the DC.
- The DC unit is mechanically identical to its base unit type — but its death loses the game for its team.

> **AMBIGUITY 10**: Does the DC unit gain ANY bonus, or is it just a tag on a regular unit? The rules don't grant DC the "Hold the Line" / "Targeting Assistance" / "Knight Commander Engaged" bonuses (those are AC-specific). Confirm the DC is a "vulnerable flag" with no offensive/defensive perks beyond the host unit's normal stats.

### 5.4 AC commander bonuses
- **A. Hold the Line** — A friendly unit within AC's max range AND LOS, that is about to die from a single DP, may reroll the killing RTD check.

> **AMBIGUITY 11**: Once per round? Once per phase? Per friendly unit per round? Unbounded? Confirm cadence/limit.

- **B. Targeting Assistance** — Friendly units (excluding artillery: MA, SA) and friendly fortifications within AC's normal range (not extended range) get **+1 to RTD rolls** when firing.
- **C. Knight Commander Engaged** *(Chaos Mode only)* — When AC is in Chaos Mode, it auto-succeeds on RTD checks equal to its remaining DP per round, **unless** fighting another command unit (AC vs AC, or AC vs DC).

> **AMBIGUITY 12**: "Skip a RTD roll per Damage Points remaining" — interpreted as: AC scores N automatic hits in Chaos Mode where N = its current remaining DP. Confirm interpretation.

### 5.5 Seizing a fortification
1. Move an IFV (or IDV — §9.1) onto an enemy fortification tile.
2. The fortification cannot already be occupied by an enemy unit (clear it first via Chaos Mode — §6).
3. The IFV must remain alive on the tile until the **start of the next round**.
4. At that point: the fortification is seized, place a Seizure Token, and the fortification is restored to full DP.
5. **Until seizure completes, the seizing IFV does NOT receive the defensive RTD bonus.**

### 5.6 Restoring a fortification
1. Move an IFV (or IDV) onto a friendly inoperable fortification.
2. IFV must remain alive until start of next round.
3. Fortification is restored to full DP.
4. **The restoring IFV DOES receive the defensive bonus immediately** (unlike seizure).

---

## 6. Terrain

### 6.1 Elevation levels

| Level | Name | Range bonus | LOS bonus | Notes |
|-------|------|-------------|-----------|-------|
| 1 | Flat Lands | — | — | No effect |
| 2 | High Ground | +1 | +1 | Can fire over 1 obstacle |
| 3 | Higher Ground | +2 | +2 | Can fire over 2 obstacles |
| 4 | Highest Ground | +3 | +3 | Can fire over 3 obstacles |
| 5 | Mountain | — | — | Impassable; blocks LOS for all ground units |

Bonuses apply to the unit/fortification standing on the elevated tile when firing **out**. Aircraft and artillery ignore LOS entirely.

> **AMBIGUITY 13**: Elevation interactions:
> - Does Mountain (level 5) also block aircraft/artillery LOS? Probably yes for ground-fired LOS, no for artillery/aircraft, but please confirm.
> - When a target is on lower elevation than the firer's LOS line, do obstacles in between still block? Suggested rule: an obstacle blocks LOS unless the firer's elevation exceeds the obstacle's elevation by enough levels to "see over".
> - When defender is on higher ground, does the firer suffer any LOS penalty? Rules don't specify.

### 6.2 River Crossing (RC)
- Non-amphibious, non-hover units must remain stationary 1 round at the river's edge before crossing.
- Non-amphibious unit **cannot fire while attempting a crossing**.
- No fortifications on water tiles.

> **AMBIGUITY 14**: Does the unit "spend a round" by ending its turn ON the river tile, or by staying ADJACENT for a round and then moving across the next round? Suggested: stay adjacent at end of round 1, move onto/past the water tile in round 2's movement phase.

### 6.3 Rail Line (RL)
- A unit ending its turn on RL has its Speed raised to **3** for its next Movement Phase (RL travel).
- A unit can only move 1 tile when **disembarking** from RL.
- No fortifications on RL.

> **AMBIGUITY 15**: Confirm the RL boost mechanic — is it: (a) end turn on RL → next round, max move = 3 along RL, OR (b) move at Speed 3 if you spend the entire move on RL tiles? Also: does "disembark = 1 tile" mean the move that leaves the rail can only travel 1 tile total, or the disembark step is 1 tile after some on-rail movement?

### 6.4 Bridge (BR)
- Allows units to cross water without the RC penalty.
- **Destroyed in 1 successful hit** from any unit/fortification with RTD 4+ within range.
- If a bridge is targeted while a unit occupies it: BOTH the unit AND the bridge each take an RTD check from the attack.

> **AMBIGUITY 16**: Is "RTD for both" a single attack roll resolved against both targets independently, or two separate D6 rolls (one per target)? And does this apply only to the bridge being targeted, or also when the unit is the target?

- If the bridge is destroyed while a non-amphibious unit is on it, the unit dies instantly. Amphibious units survive and presumably end up on the (now bridgeless) water tile.

---

## 7. Round phase order

### 7.1 Setup Phase (round 0 / pre-game)
Each team:
1. Selects player count and game mode (§8).
2. Decides number of each unit/fortification type to bring (default 5 of standard units, 3 of DE/GS).
3. Designates Commander unit if using (DC or AC).
4. Deploys units and fortifications on the map.

### 7.2 Movement Phase
- **All players move simultaneously** (no turn order).
- Each unit may move 0 to (Speed) tiles, in any direction.
- A unit cannot end its move on a tile occupied by a friendly unit.
- Moving onto a tile occupied by an enemy unit/fortification triggers **Chaos Mode** (§8).
- Aircraft (GS, CAS) do NOT move this phase.

> **AMBIGUITY 17**: Simultaneous movement conflict resolution — what happens if two opposing units attempt to enter the same tile in the same round? Both stop short? Chaos Mode triggers from both sides? Suggested rule needed.

### 7.3 Firing Phase
- Each eligible unit (NOT AA, NOT MA, NOT GS, NOT CAS) selects one target in range and LOS.
- Roll D6 vs target's effective RTD (defender's RTD threshold ± modifiers).
- All damage applied at end of phase.

### 7.4 Artillery Phase
**Round 1 (setup)**: Each MA/SA places an Artillery Targeting Marker on the map. The marker has an arrow pointing AWAY from the firing unit, indicating the line of fire.

**Round 2 onward**: For each marker:
1. Roll 3×D6 to determine which surrounding tiles get struck this phase, **in addition to the centre (marker) tile**.
2. Apply damage to all hit tiles. Units/fortifications hit auto-take 1 DP (RTD skipped).
3. Bridges still roll RTD when hit.
4. Tiles can be hit more than once (cumulative damage).
5. Reposition markers for next round.

**AA suppression rule**: When NO friendly AA is within range of the target tile, ALL surrounding tiles are struck (full AOE). When AA IS within range, only the 3×D6-indicated tiles + centre are struck.

> **AMBIGUITY 18**: 3×D6 mechanic. The "6 outcomes per die" mapping suggests a **hex grid** with 6 surrounding tiles. Confirm:
> 1. Is the map a hex grid or a square grid?
> 2. If hex: each D6 result (1–6) maps to one of the 6 adjacent hex positions?
> 3. If 3×D6 land on the same tile, does that tile take multiple damage points?
> 4. If square grid (8 adjacent tiles), how does D6 map to 8 directions?

> **AMBIGUITY 19**: "Whose AA matters?" — does the AA suppression check use the **firing player's** AA, the **target's** AA, or any AA on the board? Most natural read: the **defender's** AA within range of the target tile suppresses the artillery's AOE.

### 7.5 Airstrike Phase
1. **AA fires first** at any inbound aircraft within AA's range.
   - If AA inflicts ≥1 DP, the aircraft aborts its strike (returns to base; no firing this round).
2. Surviving aircraft (GS, CAS) move up to their max Speed to a firing position.
3. They fire (GS: 2 shots, CAS: same? — see ambiguity below).
4. Aircraft return to base (DE for GS, CB for CAS) by end of phase.

> **AMBIGUITY 20**: Number of shots per aircraft per Airstrike Phase. The rules say "the aircraft can fire twice" in §7.4 of the Airstrike rules. Confirm:
> - Both GS and CAS fire 2 shots per phase?
> - Can the 2 shots be at different targets?
> - Must the aircraft be stationary between shots, or can it move between them?

> **AMBIGUITY 21**: AA-vs-aircraft initiative — must each AA fire against the closest inbound aircraft, or can the AA player select which aircraft to engage? What if multiple AAs can hit the same aircraft?

> **AMBIGUITY 22**: GS firing on enemy aircraft (mentioned as an allowed action) — does this happen during the Airstrike Phase? Before or after enemy AA gets to act?

---

## 8. Chaos Mode (close combat)

Triggered when a unit moves onto a tile occupied by an enemy unit and/or fortification.

### 8.1 Resolution
- Every involved party rolls 1×D6 PER REMAINING DP of their participating unit/fortification.
  - Example: a full-HP unit with 5 DP rolls 5×D6.
  - A 2-DP unit rolls 2×D6.
- Each die is checked against the appropriate opponent's RTD threshold.
- All damage applied at the END of Chaos Mode.
- Successful damage may be **selectively distributed** among opponents, capped at 5 DP per target (max HP).

### 8.2 Edge cases
- **Enemy unit + enemy fortification share a tile (same owner)**: the unit gets the fort's defensive RTD bonus AND the fortification participates in combat.
- **3-way Chaos Mode**: a unit moves onto an IFV that is itself seizing a third player's fortification. All three sides engage. **The seizure still proceeds** unless the IFV is destroyed.
- **Non-IFV vs fortification**: any non-IFV unit can engage a fortification in Chaos Mode, but:
  - Cannot seize it.
  - Can only reduce it to 0 DP (inoperable).
  - Suffers **−1 to RTD rolls** when attacking the fortification.
- **IFV vs fortification**: the IFV may CHOOSE to engage in Chaos Mode, OR simply remain in place to seize at end of round (passive seizure).

### 8.3 Ending Chaos Mode
- Players may move out during the next Movement Phase.
- Same or different unit can re-engage immediately, triggering a new Chaos Mode.

> **AMBIGUITY 23**: Does Chaos Mode resolve in a single round (start of move → resolution at end), or does it persist across rounds while units remain co-located? Suggested: it triggers on movement entry, resolves once that round, and recurs each round if units remain together.

---

## 9. Advanced Content: Escalation

> Escalation rules are an OPTIONAL ruleset. Implementation should treat this as a separate feature flag.

### 9.1 Hover Tank trait
A "hover" unit travels above the surface, ignoring terrain that affects ground vehicles.
- **No river crossing penalty.**
- **Ignores minefields** (no damage when entering or moving through).
- Rules text: *"All hover units can fire at a target behind another, or cover unless directly behind it."*

> **AMBIGUITY 24**: The hover-LOS rule wording is unclear. Best guess: hover units can fire over a single obstacle (1 unit/fort/cover) UNLESS the target is directly behind that obstacle (i.e., immediately adjacent on the far side). Please clarify the intended meaning — possible alternatives:
> - Hover units get a flat +1 LOS bypass.
> - Hover units fire as if they had +1 elevation.
> - Hover units can hit anything not directly hidden by another obstacle's adjacency.

### 9.2 Advanced unit statistics

| Unit | Speed | Range | RTD  | Max DP* | Notes |
|------|-------|-------|------|---------|-------|
| IDV  | 4     | 3     | 1+   | 5       | Hover IFV. Seizes/restores forts. |
| HLT  | 3     | 5     | 2+   | 5       | Hover LT. |
| HST  | 4     | 5     | 1+   | 5*      | Hover. Repairs adjacent fixed positions (+1 DP per round). Deploys minefields (max 5). |
| HHT  | 2     | 5     | 3+   | 5       | Hover HT. Same firepower bonus as HT (target RTD −1). |
| SA   | 0     | 15    | 5+   | 5       | Static MA variant. Artillery-fired hits roll RTD against SA (no auto-damage from artillery). |
| CAS  | 20    | 2     | 2+   | ?       | Aircraft. Like GS but longer firing range, weaker armour. Stationed at CB. |

\* DP values for advanced units are interpreted from damage charts; please verify against game testing.

> **AMBIGUITY 25**: HST damage chart has **10 columns** instead of 5. The rule "(Maximum of 5 minefields per tank, recorded on the Damage Point Chart)" suggests the chart tracks 5 DP + 5 minefield deployments. Confirm the layout: columns 1–5 = DP taken, columns 6–10 = minefields placed.

> **AMBIGUITY 26**: CAS Max DP not specified. The flavour text says "Their armour is weaker than the Gunship". GS = 3 DP, so CAS likely has 2 DP. Please confirm.

> **AMBIGUITY 27**: CAS Speed is 20 like GS. Confirm CAS also fires twice per Airstrike Phase, and the same abort-on-AA-damage rule applies.

### 9.3 Advanced fortification statistics

| Fort | Speed | Range | RTD  | Max DP | Count | Defensive bonus | Notes |
|------|-------|-------|------|--------|-------|-----------------|-------|
| ATL  | 0     | 5     | 4+   | 5      | ?     | +1              | Includes anti-air. If destroyed and restored, becomes a normal TL for the rest of the game. |
| CB   | 0     | 5     | 5+   | 5      | 3     | +2              | Houses CAS aircraft. Losing all 3 = team eliminated (alternative to DE-loss). |

> **AMBIGUITY 28**: ATL count per side is not specified in the rules. Confirm.

> **AMBIGUITY 29**: ATL "Provides Anti Air" — does this mean ATL fires during the Airstrike Phase like an AA unit (against aircraft)? With what range and RTD? Or just suppresses artillery the way AA does? Please clarify.

> **AMBIGUITY 30**: For Siege Breaker victory (§10.2), is the win condition "all 3 DE" OR "all 3 CB" OR "all 3 of either"? If a team has both DE and CB on the field, what's the seize-count requirement?

### 9.4 Unit descriptions (advanced)
- **IDV**: Hover IFV. Seizes/restores forts. Lighter armour than IFV but faster.
- **HLT**: Hover variant of LT. Faster, lighter armour.
- **HST**: Hover engineer/support tank. Two unique abilities:
  - **Repair**: adjacent friendly fixed position (fortification or bridge) gains +1 DP per round if HST stays adjacent.
  - **Minefield deploy**: at start of HST's Movement Phase, place a Mine Token on its current tile (no movement penalty for the HST). Max 5 mines per HST, tracked on its damage chart.
- **HHT**: Hover variant of HT. Same `target RTD −1` firing bonus.
- **SA**: Stationary artillery; harder to destroy because artillery can't auto-hit it (RTD applies to artillery vs SA).

### 9.5 Minefields
- Placed by HST.
- Destroyed by:
  - Firing on the mine with RTD 4+ (1 hit).
  - A unit moves onto/over it (mine triggers, target takes 1 DP, mine removed).
  - An adjacent unit clears it by remaining stationary for 1 round.
- Hover units pass through minefields with NO effect.

> **AMBIGUITY 31**: When a unit moves over (not onto) a mine — does each entered tile with a mine deal 1 DP, or only the final tile? Suggested: each mine triggered = 1 DP.

> **AMBIGUITY 32**: Are minefields visible to all players, or only the deploying player? Standard wargame convention varies; please confirm.

### 9.6 CB — Command Bunker
Functions like DE but houses CAS instead of GS.
- When seized, attacker may relocate one of their CAS to the captured CB during the Airstrike Phase. The CAS may engage targets en route, provided it can finish the move at the new CB.
- Cannot store/use GS.

### 9.7 CKW — City Killer Walker (special unit)
Massive 50m bipedal walker. Treated as a special asset with multiple firing modes.

| Speed | Range  | RTD |
|-------|--------|-----|
| 1     | 6–10*  | 6+  |

\* Range varies by firing mode.

> **AMBIGUITY 33**: CKW Max DP not specified. Given its description as "heavily armoured", suggested 5 or higher (perhaps 10?). Please confirm.

**Firing modes** (must be triggered by staying stationary for N rounds):

| Mode | Stationary rounds required | Range | Effect |
|------|----------------------------|-------|--------|
| A | 0 (after moving) | 6 | Normal fire (RTD applies). |
| B | 1 | 10 | Skips RTD (auto-damage). |
| C | 2 | 10 | Inflicts **2 DP** on a single target. Skips RTD. |
| D | 3 | designated tile | **Special**: fires a "small sun" — annihilates anything on the targeted tile. Fortifications hit by Mode D **cannot be restored** for the rest of the game. |

After 3 stationary rounds, instead of using Mode D, the player may continue firing in Mode C indefinitely while remaining stationary. Mode D can be used at any later point but requires another 3 stationary rounds to charge.

> **AMBIGUITY 34**: Mode D affects a single tile or AOE? "Annihilating anything upon it" suggests single tile. Confirm. Also: does Mode D pass LOS rules, since CKW has Range "10" listed for Mode B/C — what is Mode D's range?

> **AMBIGUITY 35**: Only 1 CKW per region per side ("only one of these walker variants active per Region at any given time"). For implementation, treat as max 1 CKW per side.

---

## 10. Victory conditions

A team is eliminated when one of the following occurs:

### 10.1 Regicide
- Eliminate the enemy team's Commander unit (DC or AC).

### 10.2 Siege Breaker
- Seize and hold all 3 of an enemy's DE (or CB in Escalation) — see §9.3 ambiguity 30.

### 10.3 Peace Treaty
The game may end at any point. Resolution by precedence (highest precedence applies):

| Order | Condition | Outcome |
|-------|-----------|---------|
| A | A player has been knocked out via Regicide or Siege Breaker | The remaining player(s) win by default. |
| B | All players agree on a victor | That player wins. |
| C | No agreement reached | Player with the **least cumulative damage taken** to their units wins. |
| D | None of the above | Players settle for a draw. |

---

## 11. Map setup

### 11.1 Player formations

| Mode | Players | Formation |
|------|---------|-----------|
| 1v1 | 2 | Opposite ends of the map |
| 1v1v1 | 3 | Three opposing corners |
| 2v2 | 4 | Two teams of 2, opposite ends |
| Large 1v1 | 2 | Both players use all available units/fortifications |

(Recommended setups for new players. Players deploy units and fortifications within their start zone "as they see fit".)

### 11.2 Game mode (unit count)
- Default unit counts per side: 5×IFV, 5×AA, 5×LT, 5×HT, 5×MA, 5×TL, 3×DE, 3×GS.
- Players may agree to use fewer (e.g. 3 of each) for shorter games.
- During setup, players may swap standard units for advanced (Escalation) units, or add special units (e.g., CKW).

> **AMBIGUITY 36**: Map dimensions and tile count are not specified in the rules. For implementation, please define a default board size (e.g. 30×30 hex/square) and allow it to be configurable.

> **AMBIGUITY 37**: Is the map a **hex grid** or a **square grid**? Strong implementation hint: 3×D6 for artillery dispersion → hex (6 neighbours = D6 outcomes). Please confirm.

> **AMBIGUITY 38**: Deployment zones — are the start zones formally defined (e.g. "rear 3 rows") or fully player-discretion? Recommended: define a default deployment depth (e.g. 1/4 of map per player) for software enforcement, configurable.

---

## 12. Suggested implementation phases

This is a recommended phasing for incremental development. Each phase produces a runnable game state.

| Phase | Scope | Depends on |
|-------|-------|------------|
| 1 | Map grid (hex), terrain rendering, elevation levels, deployment | — |
| 2 | Standard ground units: stats, placement, Movement Phase | 1 |
| 3 | LOS algorithm, Range, Firing Phase, RTD resolution | 2 |
| 4 | Damage tracking (charts), unit destruction | 3 |
| 5 | Standard fortifications (TL, DE), seizure, restoration | 4 |
| 6 | Artillery Phase (MA, targeting markers, 3×D6 dispersion, AA suppression) | 4 |
| 7 | Airstrike Phase (GS, AA interception, return-to-base) | 5, 6 |
| 8 | Chaos Mode (close combat) | 4 |
| 9 | Commanders (DC, AC) and victory conditions | 8 |
| 10 | Bridges, rivers, rail lines (terrain effects on movement) | 2 |
| 11 | Escalation: hover units, advanced fortifications | all above |
| 12 | Escalation: HST minefields, CKW, advanced victory edges | 11 |

---

## 13. Summary of open questions

The 38 ambiguity flags above are summarised here for designer review:

1. GS Max DP = 3? (§3.2)
2. Hover units treat rivers identically to amphibious? (§3.6)
3. Default unit counts (5/5/5/5/5/5/3/3)? (§4)
4. AA's exact "limits artillery efficiency" mechanic? (§4.2)
5. HT/HHT firepower bonus — offensive (target RTD −1)? (§4.4, §9.4)
6. GS Range = 1 means literally adjacent? (§4.6)
7. GS firing — 2 shots, same/different targets, can move between? (§4.6)
8. DE has 5 DP and 3 instances? (§5.1)
9. AC Max DP = 5? (§5.2)
10. DC has no AC bonuses (just a "kill-loses-game" tag)? (§5.3)
11. "Hold the Line" cadence/limit per round? (§5.4)
12. "Knight Commander" = N auto-hits where N = remaining DP? (§5.4)
13. Elevation interactions with Mountain LOS, downward fire, defender-on-high? (§6.1)
14. River crossing — adjacent for 1 round, then move? (§6.2)
15. Rail Line — exact speed-boost and disembark mechanics? (§6.3)
16. Bridge under fire — single roll vs both, or two separate rolls? (§6.4)
17. Simultaneous movement conflict resolution? (§7.2)
18. Hex vs square grid for artillery 3×D6? (§7.4)
19. AA suppression — defender's AA in range of target tile? (§7.4)
20. Aircraft 2-shot mechanics (movement between, target choice)? (§7.5)
21. AA-vs-aircraft initiative (player choice vs auto)? (§7.5)
22. GS firing on enemy aircraft — when in Airstrike Phase? (§7.5)
23. Chaos Mode — single-round resolution vs persistent? (§8.3)
24. Hover unit LOS rule wording? (§9.1)
25. HST damage chart layout (5 DP + 5 mines)? (§9.2)
26. CAS Max DP = 2? (§9.2)
27. CAS firing rate vs GS? (§9.2)
28. ATL count per side? (§9.3)
29. ATL "Provides Anti Air" — full AA behaviour? (§9.3)
30. Siege Breaker victory with mixed DE/CB fortifications? (§9.3)
31. Mines triggering — 1 DP per mine entered? (§9.5)
32. Mine visibility — both players or deploying player only? (§9.5)
33. CKW Max DP? (§9.7)
34. CKW Mode D — single tile, range, LOS? (§9.7)
35. CKW max 1 per side per region? (§9.7)
36. Map dimensions default? (§11.2)
37. Hex or square grid? (§11.2)
38. Deployment zone definition? (§11.2)