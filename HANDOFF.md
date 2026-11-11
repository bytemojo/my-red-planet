# HANDOFF (update at the end of every session)

## State: Phase 0 done, Phase 2 partly done. Last updated by the starter-repo author.

### Done and tested (npm test: 15 passing)
Simulation (power/air/water/food, dust, flares), energy per action, farming, 5 buildings, cave verbs + cavern + campaign end, sustainability streak, events + scripted beats + memory flags, rewind to any Sol, save/load, data-integrity tests, daily report generation.

### Built but NOT yet run in a browser
The Phaser world (`src/game/WorldScene.ts`), DOM UI (`src/ui/ui.ts`) and map. They type-check and `npm run build` succeeds, but nobody has played them. **First job for the next session: run `npm run dev`, play Sol 1-3, fix whatever breaks.** Likely trouble spots: collision at doorways, E-key interaction range, modal flow when a beat fires mid-action, crew sprite positions, HUD overlap on small screens.

### Known gaps
- Climate data is a DEV FALLBACK (see docs/DATA_MANIFEST.md). Flare entries unverified.
- HUD shows 7 bars; target is 3 headline meters.
- No sound, no touch controls, no underground cave scene, no real art (placeholders).
- Communication delay is only partly modelled (shipments, Earth-call beat).
- Legacy features not ported: live DONKI fetch, awards, leaderboard, sound, intro (see ROADMAP Phase 1).
- Journal "happened" text strips the speaker prefix with a regex; check it reads well.

### Next
1. Browser playtest + fixes (Phase 2).
2. Real data replacement (Phase 4), in parallel if a second agent is available.
3. Art swap when assets exist (docs/ART_SPEC.md).

### Commands
`npm install` · `npm run dev` · `npm run check` (tests + type-check + build) · `npm run assets` (regenerates PLACEHOLDER art, overwrites atlas)
