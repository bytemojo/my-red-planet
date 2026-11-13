# HANDOFF (update at the end of every session)

## State: Phase 0 done, Phase 2 partly done; original pixel-sprite pass started. Last updated by Codex.

### Done and tested (npm test: 16 passing)
Simulation (power/air/water/food, dust, flares), energy per action, farming, 5 buildings, cave verbs + cavern + campaign end, sustainability streak, events + scripted beats + memory flags, rewind to any Sol, save/load, data-integrity tests, daily report generation.

### Built but NOT yet played through in a browser
The whole front end: `src/game/WorldScene.ts`, `src/game/world.ts`, `src/ui/*`, `src/main.ts`. The menu title was browser-checked at desktop and narrow mobile widths. The 16 unit tests and TypeScript check pass; the agent runner has not returned a completed Vite production-build line or a browser playthrough. **First job: play Sol 1-3**, checking the new player/EVA walk frames, crew sprites after quarantine, crop stages in the farm, zone prompts, click/tap routing, the pause panel, and the `E` key.

### Look and feel
The owner wants the prototype's look (menu, HUD, rooms, plants, sick bay, control module, result screen) kept as is. It was ported, not redesigned. The earlier placeholder-sprite atlas was removed. The Stardew-style art question is open (see AGENTS.md).

### Art work in this session
- Owner approved an original cozy, high-detail pixel-art direction (not Stardew Valley assets or copied designs).
- `src/game/sprites.ts` now generates crisp, project-owned runtime sprite textures for the junior explorer (indoor + EVA, three walk frames), four identifiable crew members, and four growth stages for each crop.
- `src/game/world.ts` consumes those textures for the player, crew and six plants per active bed; the oxygen and water makers now have pixel-machine overlays. The remaining world/rover/building art is retained for the next pass.

### Audio and touch controls
- `src/ui/audio.ts` now builds cleanly and generates a small upbeat, cozy lo-fi loop with Web Audio (no files or network). It starts after the player's first gesture as browsers require, changes between menu/game patterns, and all existing action/menu buttons retain click feedback.
- The top-right global sound control visibly switches between speaker and muted states and now stays reachable above the game HUD.
- The menu starfield already has slow individual star twinkles and an intentionally rare 25-75 second shooting-star interval; reduced-motion disables its continuous animation.
- Mouse/touch short taps on the world now walk the explorer to that point. Tapping a station walks to its marker and opens it; touch dragging still works as a joystick. Keyboard controls are retained.
- The menu composition now keeps the title higher, with deliberate breathing room before its buttons. The flat top-right sound SVG becomes a pause button during gameplay; pause offers resume, sound, save, and save-to-menu controls.
- Sick-bay activation is now a narrow, visible wall-intercom target instead of the whole hallway. The intercom opens a two-choice messenger-style chat with each crew member, their avatar, relationship hearts, a personal backstory, and optional NASA-learning links.

### Progressive learning and sources
- The game title shown in the browser/menu is now **My Little Red Planet**.
- `src/story/learning.ts` holds optional, kid-friendly NASA source cards. A small magnifying-glass button opens a card only when the player chooses it, then offers an external NASA link.
- Current objectives, source-backed decision events, earned discoveries, and auto-added mission/crop lessons can all carry that button. Mission completion and a first crop plan write simple lessons to the journal.
- Official NASA links cover space crops, the 2018 dust storm, DONKI, Mars exploration resources, and cave/radiation research. The game still clearly labels its climate table as a dev fallback and its radiation multiplier as a game model.

### Known gaps
- Climate data is a DEV FALLBACK (see docs/DATA_MANIFEST.md). Flare entries unverified.
- Walking crew NPCs after quarantine are static sprites. The 5th bed's floor area is blocked even before the annex exists.
- No underground cave scene (cave is a panel from the cave mouth). No player bunk: rest is in the Control Module (Time tab).
- Communication delay is only partly modelled (shipments, Earth-call beat).
- Legacy features not ported: live DONKI fetch (replaced by bundled JSON), intro cinematic, the original per-level result scoring (replaced by per-stage results).
- Journal "happened" text strips the speaker prefix with a regex; check it reads well.

### Next
1. Browser playtest + fixes (Phase 2), especially visual crop placement/occlusion, the character walk cycle, and tap-to-station routing around blocked furniture/walls.
2. Browser-check magnifying-glass controls in HUD, dialogue, reports, stage results, and journal; confirm external NASA links open correctly.
3. Continue the approved original pixel-art pass: machine/rover/building texture atlases and construction variants, while keeping the locked UI.
4. Real data replacement (Phase 4).

### Commands
`npm install` · `npm run dev` · `npm run check` (tests + type-check + build) · 
