# HANDOFF (update at the end of every session)

## State: Phase 0 done, Phase 2 partly done. Last updated by the starter-repo author.

### Done and tested (npm test: 15 passing)
Simulation (power/air/water/food, dust, flares), energy per action, farming, 5 buildings, cave verbs + cavern + campaign end, sustainability streak, events + scripted beats + memory flags, rewind to any Sol, save/load, data-integrity tests, daily report generation.

### Built but NOT yet run in a browser
The whole front end: `src/game/WorldScene.ts`, `src/game/world.ts`, `src/ui/*`, `src/main.ts`. They type-check and `npm run build` succeeds, but nobody has played them (no browser was available). **First job: run `npm run dev` and play Sol 1-3.** Likely trouble spots: `world.ts` (ported legacy drawing, ts-nocheck, patched farm/bunk/building code), zone prompts and the `E` key, dialogue flow when a beat fires after an action, the 5th farm bed (annex) visibility, NPC positions after quarantine ends, panel re-rendering after actions, touch joystick.

### Look and feel
The owner wants the prototype's look (menu, HUD, rooms, plants, sick bay, control module, result screen) kept as is. It was ported, not redesigned. The earlier placeholder-sprite atlas was removed. The Stardew-style art question is open (see AGENTS.md).

### Known gaps
- Climate data is a DEV FALLBACK (see docs/DATA_MANIFEST.md). Flare entries unverified.
- Walking crew NPCs after quarantine are static sprites. The 5th bed's floor area is blocked even before the annex exists.
- No underground cave scene (cave is a panel from the cave mouth). No player bunk: rest is in the Control Module (Time tab).
- Communication delay is only partly modelled (shipments, Earth-call beat).
- Legacy features not ported: live DONKI fetch (replaced by bundled JSON), intro cinematic, the original per-level result scoring (replaced by per-stage results).
- Journal "happened" text strips the speaker prefix with a regex; check it reads well.

### Next
1. Browser playtest + fixes (Phase 2).
2. Real data replacement (Phase 4), in parallel if a second agent is available.
3. Decide with the owner whether to move characters/crops to Stardew-style sprites (AGENTS.md, Look and feel).

### Commands
`npm install` · `npm run dev` · `npm run check` (tests + type-check + build) · 
