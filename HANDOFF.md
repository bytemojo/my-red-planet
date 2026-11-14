# HANDOFF (update at the end of every session)

Last updated 2026-11-14 by Claude Code. Next agent: Codex (OpenAI). The previous agent ran out of usage, so everything it knows is written here and in `docs/`.

## START HERE
Read in this order: `AGENTS.md` (rules, do not break) → this file → `docs/CHALLENGE.md` (what the hackathon judges want, and why the task queue below is ordered the way it is) → `docs/DESIGN.md` → `docs/ROADMAP.md`.
`docs/PROMPT_PACK.md` is the owner's long Episode 1 prompt pack (Steps 0-14). It is **reference for intent and wording, not a to-do list**. Where it conflicts with the queue below, the queue wins (the challenge sets the priorities).

**Setup:** `npm install` · `npm run dev` · `npm run check` (tests + type-check + build, must pass before you call anything done). Currently 37 tests pass.
**Git:** work is on branch `visual-pass-a` (one commit, `3b8ebb7`, ahead of `master` = `787f487`). The handoff docs written after that commit may be uncommitted: run `git status` first and commit them (`git add -A && git commit`). Keep working on this branch or branch off it. Commit after every task.
**Do not:** push to `origin` (the owner's private GitHub repo `bytemojo/my-red-planet`; the user does not have access yet), run `vercel` anything, or open/print/commit `.env.local` and `.vercel/` (owner's Vercel credentials, already gitignored). The owner merges (squash) and Vercel rebuilds myredplanet.vercel.app. Hand work over as the branch, a `git bundle`, or a zip.
**Report honestly:** done / broken / untested. Never tick ROADMAP.md for something you did not run.

## The goal in one paragraph
NASA Space Apps 2026 challenge "Build a Junior Astronaut Mission Trainer": kids 7-12 run a Mars outpost and feel real trade-offs (power, life support, radiation shielding, food, communication delay) with real NASA data and visible consequences. The author's signature scene: *a dust storm is about to bury your solar panels, you have 10 seconds: retract them and lose power tonight, or leave them out and risk more.* Build that moment, make the data honest, keep the scope small. Details and quotes: `docs/CHALLENGE.md`.

## Task queue (do in order, one at a time, commit after each)

### Task 0: sanity check (15 min)
`npm install`, `npm run check`, `npm run dev`, play Sol 1 (Enter through the briefing, walk to the glass wall below the farm, watch the crew, use the intercom, rest from the Control Module with **C**). Run `scripts/playtest-shots.mjs` (header explains how). Fix only things that are actually broken.

### Task 1: "The Storm Call" (the author's scene) ← highest value
Goal: one tense, fair, timed decision where both options cost something, plus a communication-delay lesson.
- **Card:** when the storm arrives (Episode 1: end of Sol 1 / start of storm sols; until the Episode 1 arc exists, trigger it from a forced event on a chosen Sol), the game pauses into a decision card with a ~10 s countdown ring and three buttons:
  1. **Stow the panels:** panels safe, solar output 0 for the storm Sols, battery drains, so the player must shed load (existing levers: `s.farm` bright/dim, `s.ls` mode, heating flag).
  2. **Leave them out:** keep some power at storm-reduced efficiency, but each storm Sol adds panel damage/burial that lowers `solarEfficiency` until repaired (repair costs energy + power).
  3. **Ask Earth:** the reply arrives *after* the timer (communication delay). The card then defaults to option 2. After the deadline Reyes relays what Earth said, which teaches why crews must decide alone.
- A **"Take your time"** toggle on the card pauses the countdown (kids 7-12 should not be stressed). Timeout = panels stay out (indecision is a choice). Nobody dies.
- Label the stow/damage rules **"game model"**. Real storm-and-sunlight fact to cite: the 2018 global dust storm (`mars-2018-global-dust-storm` in `src/data/manifest.json`).
- **Implementation hints:** put rules in a new pure `src/core/storm.ts` with tests; add state fields to `GameState` (e.g. `panels: 'out' | 'stowed'`, `panelDamage`), **bump `SAVE_VERSION` in `src/core/sim.ts` to 3 and extend `migrateState` in `src/core/session.ts`**; read the new fields in `solarGen`/`solarEfficiency` (`src/core/sim.ts`). The director already supports forced events (`weight >= 100` in `src/core/director.ts`); the timed UI belongs in `runPending` (`src/ui/ui.ts`) with an optional `timeoutChoice`. Add a journal "why/science" entry.
- **Tests (required):** both choices have a real cost; **neither dominates** (write a balance test comparing power, panel damage and food after 3 storm Sols); Ask Earth never resolves before the deadline; migration from v2.
- **Acceptance:** a judge can reach this card within about 2 minutes (see Task 6 "start at the storm"), and sees its consequence in the next Sols and in the debrief (Task 4).

### Task 2: honest real data (DONKI) and "Today's Sun"
- Verify access first, cap research at ~1-2 hours: does `https://api.nasa.gov/DONKI/FLR` (and `GST`/`CME` if useful) work from a browser (CORS, key, rate limits with `DEMO_KEY`)? **No private key in client code.** Prefer a build-time script `scripts/fetch-donki.mjs` that writes `src/data/solar-events.json` with `verified: true` plus a live fetch with a labelled fallback if feasible.
- Verify the two flares currently in `src/data/solar-events.json` / manifest (X8.7 on 2024-05-14, X9.0 on 2024-10-03 were typed **from memory**). Fix or remove; set `verified` truthfully; fill exact URLs in `src/data/manifest.json` and `docs/DATA_MANIFEST.md`.
- Add a small **"Today's Sun"** card (menu or HUD) that says LIVE or ARCHIVED (with the data date), shows the real flare class/date, and maps it to the day's risk level. Offline must still work. **Never present static data as live.**
- Replace `climate.json` (hand-written, labelled `dev-fallback`) with a documented real product if time allows (Perseverance MEDA / Curiosity REMS, labelled as the rover's landing site, not the base); otherwise keep the dev-fallback label visible.
- Add one real astronaut-health finding from NASA OSDR or another verified NASA page (e.g. bone/muscle loss), linked via the existing learning-card system in `src/story/learning.ts`.

### Task 3: radiation shielding as a planned trade-off
Today `s.rad` resets to +5 each night and only drains outside. Make shielding a decision: before a flare/storm the player can spend power, energy or time to shield (the `shelter` building already halves exposure), and unshielded exposure carries into later Sols. Link the level of risk to Task 2's real flare data. Keep it to 2-3 numbers a kid can follow. Tests in `tests/`.

### Task 4: debrief screen ("own your consequences") + replay
Use `s.decisions`, `s.journal` and `s.history` to show a 3-line cause → effect chain ("You left the panels out → power was low at midnight → the crew sheltered in the dark"), end-of-episode score/stars (see PROMPT_PACK Step 13) and a **Replay with a different plan** button (Rewind already exists: `rewind()` in `src/core/session.ts`; weather never changes on rewind, which is a lesson in itself).

### Task 5: headline meters (ASK THE OWNER FIRST)
The challenge names power, radiation shielding and life support; the owner's pack puts Base Energy / Player Health / Team Morale on the top bar (drops radiation). Recommendation: top bar Power · Life Support (air+water) · Radiation, with morale shown by the crew faces and food by the meal hatch. Do not change the HUD until the owner decides (D2).

### Task 6: judge-facing package
README for judges (what it is, how to play in 2 minutes, **table of datasets: what each drives in the game, live or archived, limitations**), a labelled "start at the storm" option (a real state setup, no fake features), a 2-minute video script (open on the storm decision), and a short "Where our data comes from" screen in the game. Check the official rubric at https://www.spaceappschallenge.org/2026/challenges/ and the video notes in `docs/CHALLENGE.md`.

### Task 7: only what survives the cut (recommended; owner has not confirmed)
Still worth doing from `docs/PROMPT_PACK.md`: Step 1 (playtest; partly automated), Step 2 (minimal checkpoints/episodes), Step 4 (opening call), Step 6 (suit rule), Step 8 (habitat care, manual watering), Step 11 (storm arc), Step 13 (results). Cut or shrink: Step 3 character creator, Step 5 bathroom/lab and extra gym pieces, Step 9 to one machine, Step 10 to 2 chats each, Step 12 map and journal photos, Episode 2. Visual Pass B (kitchen, cooking, action animations): keep cooking only if the heater costs power and competes with shielding; keep watering and panel-cleaning animations.

## Decisions waiting for the owner (ask, do not guess)
- **D1 Site and backstory:** the owner's pack says Hebrus Valles / year 2036; `AGENTS.md`, `beats.ts` (intro beat, owner-written, "keep its wording") and the menu still say Hadriacus Mons, Hellas Planitia. Pack Step 0 would reconcile this; it has not been run.
- **D2 Headline meters:** see Task 5.
- **D3 Scope cuts:** see Task 7.
- **D4 Captain "Reya" vs "Reyes":** kept Reyes.
- **D5 Role/title:** the challenge says "Commander seat"; the game casts the player as a junior intern. Possible subtitle: "Junior Astronaut Mission Trainer".

## What exists now (Visual Pass A, done and tested)
- **Characters:** `src/game/pixelart.ts` (pure, tested) generates every frame from a `CharSpec` (skin, hair colour, 6 hair styles, top, bottom, shoes, accent): 3 directions × 3 walk frames, plus write/read/lie/sleep/tray poses, EVA suit variant, shading and outline. `src/game/sprites.ts` builds Phaser sheets (`player`, `crew_<id>`, `icons`) with named frames (`in_down_stand`, `ev_side_step1`, `write1`, `sleep2`, `tray`, `mood_happy`, `bubble_food`...). `buildPlayerSheet(scene, spec)` rebuilds the player look.
- **Crew quarters:** `src/game/quarters.ts`. Four rooms behind frosted dividers (bed, desk, lamp, chair, rug, personal item). Crew choose activities from `src/core/crewlife.ts` (`pickActivity`, pure, tested): wander, pace when hungry, stand at the window, lie, nap, write, read (lamp on in the evening), sleep at night. After the quarantine ends they work around the base by day (random spots, **no collision check**).
- **Morale and hunger:** `CrewState { friendship, met, morale, hunger }`, constants in `CREW_LIFE` (`src/core/constants.ts`). Face over the head = mood; food thought bubble = hungry; heart = reacted to chat/meal. Chats +15 morale (first of the Sol) / +4; no chat overnight −8; going to bed hungry −6; story `friend` effects add morale.
- **Meal hatch:** zone `hatch` in `WorldScene.ts` (corridor above the glass wall, next to the intercom). Walk up, press E, tray animation (1.3 s), action `feed` in `src/core/sim.ts` (6 energy, needs ≥5 food). Only while quarantined.
- **Farm bubbles:** water drop when a bed needs watering (until 21:00), star when ready (`world.ts`).
- **Day/night:** `src/game/skytint.ts` (pure, tested) + `src/game/daynight.ts` (Phaser): blue dusk, blue-violet night, dim orange dust days, indoor tint 40%, outdoor/indoor lights at night, helmet glow.
- **Bug fixed:** the intercom zone used to sit inside the sealed bay (unreachable). Zones `sick` (tiles x 8-9, y 11) and `hatch` (x 11-12, y 11) are now in the corridor.
- **Save version 2** + `migrateState` (v1 saves and their rewind snapshots upgrade safely; newer-than-known saves are rejected). `SAVE_VERSION` is exported from `src/core/sim.ts`.
- **Crew portraits (owner, commit c6a6cb4):** transparent cutouts in `public/crew/<id>.png`, used as the large speaker cutout in dialogue (`runPending`, `src/ui/ui.ts`) and as thumbnails via `crewPortrait(id)` in the intercom and Control Module crew tab. Hover styles are limited to fine pointers. Not checked at a physical phone viewport.
- **Tests:** `tests/sim.test.ts` (16), `tests/crew.test.ts` (14), `tests/art.test.ts` (7). Screenshots: `docs/playtest/`.

## Code map and gotchas
- `src/game/world.ts` is `// @ts-nocheck` legacy-style drawing (dense one-liners, 32px tiles, grid 44×30). Walls/blocked tiles are computed at the top (`blocked`, `inside`). The old `bunks` footprints were removed when the quarters were added.
- `src/game/WorldScene.ts`: `ZONES` (tile rectangles + prompt label), `MARKERS` (where tap-to-walk goes), `doAct()` routes a zone to its panel, `update()` is the game loop. The guide arrow is `guide()`.
- `src/ui/panels.ts`: DOM panels (farm, air/water, comms, solar, crew, control module). `src/ui/ui.ts`: modals, dialogue (`runPending`), toasts.
- State is plain JSON (`src/core/types.ts`). All rules in `src/core/`, no Phaser/DOM there. NASA-derived environment is a pure function of the Sol (`src/core/env.ts`); never make it depend on player state.
- **Visual checks:** dev builds expose `window.__game` (Phaser game). `scripts/playtest-shots.mjs` starts a game, teleports the player, sets the hour, and writes screenshots (needs `npm i --no-save playwright-core` and Chrome; header explains). Always look at the screenshots; a green type-check does not mean it looks right.
- If Vite shows its error overlay, an esbuild error is in a file you just edited; read the overlay text (`vite-error-overlay` shadow root) or the dev server output.

## Not verified (needs a human)
Touch/joystick controls with the taller sprite; post-quarantine crew positions (may overlap machines); rewinding into a Sol saved before save v2 in a browser (unit-tested only); the whole game has still not been played start to finish by a person.

## Known gaps (carried over)
Climate data is a DEV FALLBACK; flare entries unverified; no cave scene; no player bunk; seven-bar HUD; Episode 1 pack Steps 0-14 not started; communication delay only in dialogue and the shipment.
