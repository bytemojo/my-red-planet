# MY RED PLANET: master brief for any AI agent

You are continuing a browser game for the NASA Space Apps Challenge. Several different AI tools work on this repo, so **this file and HANDOFF.md are your only memory**. Read both first. Then read docs/DESIGN.md and docs/ROADMAP.md.

## The game in one paragraph
A cozy, Stardew-Valley-style farming and colony-building game on Mars, for children aged 7-12. The player is a junior intern alone at a research outpost near Hadriacus Mons, Hellas Planitia, because the crew is quarantined with the flu. They farm, manage power/water/air/food, build, explore by rover, and finally open a candidate lava-tube cave into a protected underground colony. Kids learn that every resource has a cost and every decision has consequences, by playing, not by reading panels.

## Two kinds of content. Keep them separate.
1. **Scripted story beats** (`src/story/beats.ts`): authored scenes with fixed triggers (`when(state)`), fired once, in array order. They carry the campaign from stage to stage.
2. **Systemic events** (`src/story/events.ts`): a pool of decision cards drawn each morning by weight from (a) the day's environment and (b) the player's earlier choices (flags). This is the open-ended, replayable layer.
Both use the same `Choice { effects }` format and the same director (`src/core/director.ts`). **Past decisions must change future content** via `flags` (see `reyes_risk_talk`, `panel_fault`). Do not write a feature that ignores the player's earlier choices.

## Hard rules (do not break these)
- **No unlimited resources, no perfect choice.** Every option in every decision costs something real.
- **Every player action costs energy** (`ACTION_ENERGY`). Sleep refills it.
- **Sustainability Score = Sols since the last Earth shipment.** The campaign is won by reaching `SELF_SUFFICIENT_GOAL` Sols without one. Shipments exist as a safety net but reset the streak.
- **Cave has four verbs: explore, excavate, pressurize, shield.** They grow the tube into a huge cavern with water. After the cavern + 10 self-sufficient Sols: campaign ends, endless play continues.
- **Suit blackout** has a real consequence (towed in, lose energy, power and time).
- **Rewind to ANY earlier Sol morning** (snapshots, capped at `MAX_SNAPSHOTS`). Rewind restores player decisions and simulated colony state only. NASA-derived environment is a pure function of the Sol number in `src/core/env.ts` and must NEVER depend on player state.
- **Science facts appear only as earned discovery events** (`src/story/discoveries.ts`) or as journal entries after a decision. No info-dump popups.
- **Kid-safe retention:** no login streaks, nothing dies or decays while the player is away, no punishing absences. Manual Sol advance so judges can move fast.
- **Target: three headline meters** (Life Support, Power, Radiation) with the rest hidden underneath, so kids are not overwhelmed. The starter HUD still shows seven bars (Air, Water, Food, Power, Energy, Suit, Safe); collapsing them is a Phase 6 task. Do not add more.
- **Data honesty:** never invent a NASA event; never fake a "live Mars weather" service; model output is not an observation; DONKI does not measure radiation at the outpost. Every real-data event must cite an id in `src/data/manifest.json` (a test enforces this). Anything that is not real data must be labelled `dev-fallback` in the manifest. Show a small REAL DATA badge on real-data event cards (already implemented).
- **Offline-first:** all data is bundled JSON. No API call may block play. No secrets in client code.
- **Never copy Stardew Valley's assets, names, maps or music.** Original art only.
- **Caves are candidates, not confirmed.** Say "candidate" in any text about the caves.
- **No fake features.** No button that does nothing. Never mark a task done without running it.

## Stack and architecture
Vite + TypeScript + Phaser 3 (world) + plain DOM overlays (UI). No React/Tailwind on purpose: one state source, fewer moving parts.
```
src/core/    PURE TypeScript. No Phaser, no DOM. State is plain JSON. Fully unit-tested.
  types.ts constants.ts  sim.ts (rates, advance, endSol, act)  director.ts (beats+events)
  env.ts (NASA-derived env)  session.ts (rewind, save/load)  effects.ts rng.ts util.ts
src/story/   Content only: beats.ts events.ts discoveries.ts crew.ts
src/data/    Bundled JSON: manifest.json climate.json solar-events.json
src/game/    Phaser: WorldScene.ts (movement, interaction, sync), map.ts (layout, objects)
src/ui/      ui.ts (modals, HUD), style.css
scripts/     gen-placeholders.mjs (placeholder art atlas)
legacy/      The original single-file prototype. Reference only. Do not edit.
```
Rules: game logic goes in `core/`, never in `game/`. Content goes in `story/` as data. Phaser code only reads state and calls `act()`/`resolve()`.

## Look and feel (locked by the owner)
The game must keep the look of the original prototype in `legacy/Junior_Mars_Commander.html`: the holographic home menu over a starfield with a glowing Mars, the cyan/amber HUD, dialogue with a portrait panel, option cards, the Control Module, and the world's rooms (indoor farm with glowing grow-beds, sick bay with sleeping crew, control module with holo-Mars, comms console, life-support machines, solar farm with dust, rover bay). **Do not redesign these.**
- UI styling: `src/ui/holo.css` (copied from the prototype) and `src/ui/icons.ts`. Fonts: Orbitron and Rajdhani (Google Fonts, with system fallbacks, so it still works offline).
- World drawing: `src/game/world.ts`. Ported from the prototype's `buildWorld`; it draws with Phaser graphics at 32px tiles. It is `// @ts-nocheck` on purpose (verbatim legacy drawing). Farm beds, bunks, rover, buildings and the cave mouth are rewritten to read the new game state. Keep it working; type it gradually.
- Intro briefing text is owner-written (see `beats.ts`, beat `intro`). Keep its wording.
- The owner also wants a Stardew-Valley-style pixel-art feel eventually. That is **not decided against the prototype's look yet**: ask before replacing the procedural drawing with sprite art. If you do, introduce a sprite atlas with fixed frame names and keep the existing UI.

## How to work
1. Read HANDOFF.md, then docs/ROADMAP.md. Do **one phase** at a time.
2. Check, don't assume: open the file, run the code. Never claim complete without `npm run check` (tests + type-check + build) passing, and, for anything visible, playing it in a browser (`npm run dev`).
3. Add or update tests for any change in `src/core/` or `src/story/`.
4. Commit after each phase. Small, working increments beat big broken ones.
5. At the end of EVERY session, update HANDOFF.md: done / broken / next / untested. Be honest.
6. When scope is tight, cut features, never quality of the core loop. A smaller complete game beats a bigger broken one.

## Test the game as two people before calling anything done
- **A 9-year-old on their first try:** do they know what to do within 2 minutes? Is any text too long or technical?
- **A NASA judge:** can every real-data event be traced to the manifest? Are model output and observation kept apart? Does it work offline?
