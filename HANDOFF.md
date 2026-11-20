# HANDOFF (update at the end of every session)

## Latest session (2026-11-20): quiz intro alignment and desktop gameplay zoom
**Status: `npm run check` passes (55 files, 702 passed, 1 skipped, type-check and production build). Browser-verified at 1440×900.**
- Raised the Astronaut Quiz intro's right-side content so its thought bubble starts level with Captain Reyes's portrait. Portrait size and bottom alignment are unchanged.
- Zoomed desktop gameplay out by 50% (`DESKTOP_ZOOM_FACTOR = 0.5`); mobile camera behavior is unchanged. Updated desktop camera expectations.
- Browser geometry check confirmed the intro content and portrait both start at y=340, and the portrait remains anchored to the viewport bottom at y=900. Gameplay screenshot shows the wider desktop view.
- Camera tests pass (3/3); the timing-sensitive dish tests pass both alone (15/15) and in the successful full check. The initial full run timed out once under load, then the clean rerun passed.
- Committed as `7b3afb8` and pushed to `origin/master`. Not redeployed; the user asked to push this latest change.

## Latest session (2026-11-20): quiz intro crop and shared mute
**Status: `npm run check` passes (55 files, 702 passed, 1 skipped, type-check and production build); browser-verified on desktop and mobile.**
- Anchored Captain Reyes's welcome-screen cutout to the viewport bottom with no desktop scrollbar.
- Opening the quiz now pauses menu audio even if a music start was already in flight; starting the quiz plays only its own music. The quiz mute control now updates the app-wide sound setting and stops all quiz audio.
- Browser verification: portrait bottom matched the viewport at 1440×900 and 390×844; menu tracks were paused before the quiz track started; mute toggled global sound and paused/resumed audio. Test sound was restored to off.
- Pushed as `93f9dfb` and deployed to https://myredplanet.vercel.app; production quiz CSS/JS and both quiz tracks returned successfully.

## Latest session (2026-11-20): Astronaut Quiz portrait crop
**Status: `npm run check` passes (55 files, 702 passed, 1 skipped, type-check and production build); browser-checked at 1440×900.**
- The Captain Reyes cutout is static instead of bobbing. On desktop quiz questions, its bottom is aligned with the viewport edge so the screen hides the cutout boundary.
- Browser check confirmed the portrait ends at y=900 on a 900px screen and has no CSS animation.
- Finished the requested preview polish: smaller desktop menu logo, gold animated quiz button, pause close X/mastery placement, right-column microscope controls with arrow-key navigation, quiz-only music and one-time victory audio, desktop cover preload, and delayed pixel-style startup fallback.
- The intercom alert is at bottom-left and routes directly to the call when clicked (committed separately). Browser checks covered menu/pause, microscope navigation, intercom arrival, fresh startup, and quiz audio playback.
- Production deployment is READY at https://myredplanet.vercel.app; the menu, quiz page, and both quiz audio assets returned HTTP 200.
- Untested: human listening for audio balance on a device with speakers.

## Latest session (2026-11-20): merged generated game SFX into snapshot
**Status: `npm run check` passes (55 test files, 701 passed, 1 skipped, TypeScript, production build).** The preview server responds on port 5181; a fresh browser load shows the menu.
- Merged the generated Web Audio action sounds from `preview/sfx-package-2026-11-20` into `src/ui/audio.ts`, preserving the snapshot's background music/crossfade and current sound controls. These action sounds are generated at runtime; there are no separate SFX asset files.
- Added the airlock `door` and `hiss` sounds required by this snapshot's `WorldScene.ts`; this resolves its missing-method type errors and runtime error.
- Created `my-red-planet-app-2026-11-20-merged-with-sfx.zip`, retaining the original archive unchanged.
- Untested: human audio listening/playthrough for individual actions and a browser interaction through the airlock. Next: verify the action SFX mix and volume in a real playthrough.

## Latest session (2026-11-20): merged the airlock (V2) branch into the game
**Status: NOT yet run: `npm install` + `npm run check` and a browser pass are owed (the merge was done without node_modules or network).**
- Base = the game zip (Astronaut Quiz, MP3 music, menu cover/logo, leaderboard removed). On top: everything from `mrp-v2-airlock` (64x44 map, airlock, Mars truck + energy bar, rover card, cave, ground, camera, microscope + 8 pictures, save v8, Step 30b tap-target/board-size CSS, `_browser.mjs` test helper, new tests).
- Kept from the game on purpose: `ui/audio.ts` (MP3 crossfade), `ui/menu.ts`, `ui/episode.ts`, `vite.config.ts` (two-page build), `tests/share.test.ts`. The airlock side still had the leaderboard; it stays removed, so the 3 `recordRun(...)` calls in `WorldScene.ts` were dropped.
- Hand-merged: `WorldScene.ts` (airlock file + `music.location(outside ? 'outdoor' : 'indoor')` + game's leaderboard removal), `index.html` (game menu + `#truck-bar`), `holo.css` (game menu styling + rover/truck/microscope blocks + 44 px close button + board sizing), `public/sw.js` (cache `mrp-v6`: game precache list + microscope pictures; `tests/sw.test.ts` checks the list).
- First things to check: music still switches indoor/outdoor and when driving the truck; the quiz opens from the menu; the airlock and truck bar work on the new map; old saves migrate (v7 -> v8).

## Latest session (2026-11-20): supplied Astronaut Quiz rank badges
**Status: `npm run check` passes (including 25 Astronaut Quiz tests); production build passes.**
- Replaced the generic inline-SVG rank art with the five supplied transparent PNGs: Recruit, Explorer, Commander, Solar Scientist, and Galaxy Brain.
- The artwork is used consistently in the quiz rank ladder, result screens, and the downloadable/shareable report-card PNG.
- Added a test that locks the tier-to-image mapping. The standalone quiz page and all five PNG paths returned HTTP 200 from the local Vite server.
- Untested: a human visual pass of the finished report card at desktop and mobile sizes.

Last updated 2026-11-16 by Claude (Master Build Prompt Step 1; see the first section below).

## Latest session (2026-11-20): Astronaut Quiz minigame and leaderboard removal
**Status: `npm run check` passes (including 24 Astronaut Quiz tests); production build passes.** The development server was started and both `/` and `/astronaut-quiz.html` returned HTTP 200. Browser interaction still needs a human playthrough.
- Added the supplied standalone Astronaut Quiz package under `src/minigames/astronaut-quiz/`, its dedicated `astronaut-quiz.html` route, and `tests/astronaut-quiz.test.ts`.
- Added **Play Astronaut Quiz** to the home menu. It opens over the menu without touching the colony session, respects the existing name, sound and reduced-motion settings, mutes menu music while open, and restores it when closed.
- Removed the leaderboard menu button, leaderboard dialog and styles, local leaderboard score storage, run score recording, and the debrief copy that mentioned it. Awards remain.
- Needs a human in the browser: open the quiz from the menu, close it, and complete enough questions to confirm the answer, report-card and return-to-menu flows on desktop and touch.

## Latest session (2026-11-16, later): STEP 2a kitchen rebuild (art and walls only)
**Status: `npm run check` passes (123 tests, tsc, vite build). NOT run in a browser.** Only `src/game/world.ts` changed (plus STATE/HANDOFF/docs).
- Found: the old kitchen was a 2x2 walkable pocket; its art was drawn at depth 100, under the wall rows, so the microwave and heater were hidden, and both labels sat at depth 3 (also hidden). The prep island had no collision.
- Now: interior x15-16,y7-9, door (14,8). Counter row y7 (blocked): hotplate on the left under a wall microwave, sink on the right under two ingredient bins, KITCHEN sign. Small white table at (16,8), now blocked. Walkable cells: (15,8), (15,9), (16,9). Cook marker (15.5,8.6) is directly in front of the hotplate. South wall (15,10),(16,10) is a glass serving window with an ELECTRIC / NO FLAME sign readable from the corridor. Tile-checker floor, runner, hazard threshold and a green status light at the door. Electric only, no flame.
- Depths: wall-face art 7*T+1, counter 8*T, counter items 8*T+1, table 9*T, glow 8*T+2, floor 1.
- Checked: collision grid regenerated from world.ts (table and glass appear, all three walkable cells reachable from the door) and the art rendered offline to `docs/playtest/kitchen-2a-render.png` (stub scene + PIL, approximate fonts).
- Needs a human in the browser: art depth against the player at (15,8), (15,9), (16,9); tap-to-walk into the kitchen; cook animation still plays; sign text readable; glass window look from the corridor.
- Not done (Step 2b): any kitchen interaction change, tray carry, using the tray prop.

## Latest session (2026-11-16): Master Build Prompt STEP 1 (action animation foundation)
**Status: code written, unit-tested, NOT run in a browser. Treat every visual item below as UNTESTED until someone plays it.**
The sandbox had no network, so `npm install` failed (Vite, Vitest and Phaser could not be installed). `npm run check` and `npm run dev` were NOT run. What WAS run: all 123 unit tests (79 old + 44 new) through a throwaway vitest shim on node:test (not committed), a mutation check proving the new tests catch a broken runner, and `tsc` with Phaser stubbed (no errors in new code). The pose and prop art was rendered to PNG and checked by eye.

### What was added
- `src/core/actions.ts` (pure): `ACTION_DEFS` (pull_bands, pick_up, put_down), `ActionRunner` (walking -> posing -> idle; beat fires exactly once; `finish()` never skips the beat; walk timeout 8 s; `forceUnlock()` for world resets), `buildTimeline`, `canStartAction`/`applyActionBeat` (energy is checked at start, charged only at the beat), reduced-motion scaling (x0.35).
- `src/core/inventory.ts` (pure): one held item (`pickUp`, `putDown`, `PROP_IDS`). Runtime only: NOT in GameState, so not saved or rewound. Resetting the player empties the hands. Step 3 should extend this file with stock counts rather than create a new one.
- `src/game/actions.ts`: `playAction(scene, id, {stand, face, onBeat, onDone, onAbort})`, `stepAction`, `drawPlayer`. The header comment documents how to add an animated interaction.
- `src/game/pixelart.ts`: 7 poses (reach, crouch, pour, kneel, pull, suitup, sleep; 4-5 frames each), carry-walk frames (3 dirs x 3), hand anchors per frame, 5 prop sprites (tray, sprinkler, seed packet, spare part, ice sample). `src/game/sprites.ts`: second sheet `player_act` (kept apart from `player` to stay under GPU texture-width limits), `props` sheet.
- `src/game/effects.ts`: dustPuff, waterDroplets, sparkle, steam, holoFlicker, amberBlink (all respect prefers-reduced-motion).
- `src/game/racks.ts`: data-driven wall racks (`PROP_RACKS`) on the greenhouse west wall: TOOLS (sprinkler), SEEDS (seed packet), PARTS (spare part). Stand tiles (5,4), (5,5), (5,6) were checked against the walkability grid computed from world.ts.
- `WorldScene.ts`: action runner + held prop wired in; keys/joystick/taps ignored while an action runs; `resetPlayer` always unlocks and empties the hands.
- Proof 1: Resistance Bands now plays kneel/pull (bands snap taut at the beat), THEN opens the workout panel. Proof 2: the three racks (pick up with a reach animation, carry visibly, put back; "Put your item down first" if hands are full; 1 energy to pick up, charged at the beat).

### Needs a human in the browser (UNTESTED)
1. Bands: press E at the gym bands; the explorer should walk to the spot, kneel/pull, and the panel opens afterwards.
2. Racks: greenhouse west wall (tiles x=4, y=4..6). Pick up each prop, walk 10+ tiles, put it back. Check the prop sits in the hand facing left AND right, indoors and in the EVA suit (the suit is still a panel toggle until Step 8).
3. Rack art depth: drawn at depth (y+1)*32+1 over the wall; confirm it is not hidden or overlapping the beds at x=6.
4. Reduced motion: enable the OS setting; animations should be short but still work.
5. Press Esc mid-action: controls must come back and nothing double-fires.
6. `npm install && npm run check` on a machine with network.

### Notes and honest deviations
- The racks are a foundation for Steps 3/6, so picking up a prop does nothing else yet. The owner's Step 1 asked for a rack carry proof. Step 3 should MOVE them into the storage room by editing `PROP_RACKS` (and the zones/markers derive from it).
- Only the bands (not the bike or rower) got the pre-workout animation, as specified.
- Poses are side-view and mirrored for left. Targets north/south of the explorer will look sideways; choose a stand-point so the object is left or right.
- The new tray prop art exists but nothing uses it yet; Step 2 will.
- Existing kitchen verification from the previous session is still pending.

## START HERE
Read: `AGENTS.md` (rules) → this file → `docs/CHALLENGE.md` (what the judges want) → `docs/NASA_SOURCES.md` (every real-data point, for judges) → `docs/DESIGN.md`. `docs/PROMPT_PACK.md` is the owner's long Episode 1 brief — reference for wording/intent, not the task order; this file sets the order.

**Setup:** `npm install` · `npm run dev` (port 5173, or `--port 5179`) · `npm run check` (tests + type-check + build).
**Git:** branch `visual-pass-a` tracks `origin/visual-pass-a`. The user has GitHub access to `bytemojo/my-red-planet`; pushing this branch was explicitly requested. Do not commit `.env.local` or `.vercel/`.

**Always:** `npm run check` must pass before you call anything done. Commit after each task. Update this file honestly.

## Latest session (2026-11-15): Episode UI polish and menu navigation
- Kept the compact Solar Forecast warning on the menu; selecting it opens the details modal with its NASA DONKI source. Offline play uses the archived flare.
- Character dialogue and choice cards now use the requested comic-book style. The Learn More control is a blue, slowly blinking magnifying-glass icon; character dialogue no longer shows a REAL DATA chip. Dr. Silva's radiation line is: “The space weather alert goes to its peak tonight. How should we prepare?”
- Polished the Episode HUD: colorful icon-and-meter rows without numbers or card backgrounds, one colored morale face, the requested resource/Solar Alert color scales, and a circular radar showing the player and current objective. The Sol clock is outside the radar at the screen's bottom-right, without a card background and with a subtle blurred shadow.
- Moved the NASA wiki button to the home menu immediately after Your awards and removed its dedicated pause-menu button. The global mute remains; the Reyes intercom has no separate mute button.
- Validation: `npm run check` passed (79 tests, type-check, production build); `git diff --check` passed. Browser-tested at `http://127.0.0.1:5175/`: menu placement and wiki modal, radiation dialogue wording and comic styling, Learn More icon and NASA learning modal, absence of the dialogue REAL DATA chip and Reyes intercom mute button, and Sol-clock positioning/transparent background with drop-shadow. Real-device touch/audio remain untested.

## Kitchen vertical slice (2026-11-15): dedicated room implemented, browser/build validation blocked
- Replaced the ugly corridor kitchenette with a dedicated four-by-four room immediately east of the greenhouse in `src/game/world.ts`, including a doorway, floor runner, counter wall, microwave, electric heater, sink/tap, storage lockers, ingredient bins, prep island, serving tray, status lights, and `KITCHEN` / `ELECTRIC · NO FLAME` labels. No open flame was added.
- Added a dedicated `Cook in Kitchen` world interaction and objective guidance in `src/game/WorldScene.ts`. The existing meal hatch remains the delivery point and can still open the same tray menu during Episode 1.
- Updated the meal panel copy in `src/ui/panels.ts` to present the loop as `SELECT → COOK → DELIVER`, while preserving the existing five-portion atomic meal rules, limited stock, water/power costs, and disabled-state advice.
- Cooking now visibly prepares the tray with steam, switches to the tray pose, carries the player to the quarantine hatch, and shows `TRAY DELIVERED` before control returns. The core state update remains in `cook_serve`, so existing meal tests and checkpoint semantics are preserved.
- `npx tsc --noEmit` passed and `git diff --check` passed. `npm run check`, `npm run build`, and `npm run dev` are currently blocked before project compilation by Vitest/Vite/esbuild reporting `Cannot read directory "../../..": Access is denied` while resolving `vite.config.ts`; browser validation is therefore pending. The pre-existing uncommitted solar-panel layout files are still present and were not folded into this kitchen change.

## Previous session (2026-11-15): gameplay UI + quarantined crew portraits
- Simplified the pass-out message; the checkpoint recovery and suit-rack tip remain.
- Added a circular HUD radar with player location, key station markers, and the current objective highlighted. Verified at desktop and 390px mobile width.
- Crew chat choices are stored in `GameState` and saves (SAVE_VERSION 4); old saves and rewind snapshots migrate with empty chat records. David's reply was browser-tested after leaving and reopening the intercom. Chat profile photos remain the regular crew portraits.
- The workout now judges the marker position shown on the last rendered frame and reports clear hit/miss feedback. Browser-tested five successful PUSH hits through the green zone.
- Removed the user-facing Quick Start menu button and route. The internal quick-start simulation option remains for automated testing only; the browser test fixture no longer depends on a visible button.
- Added supplied sick-state dialogue cutouts for Reyes and Dr. Silva. They are used only before `quarantine_over`; recovered dialogue uses the existing PNGs. Dr. Silva's cutout is half-size in both states. The chat profile images are unchanged. The Reyes asset is a single-frame GIF; Dr. Silva's latest attachment has a `.gif` filename but PNG file signature and one frame. Neither cutout is animated; a multi-frame asset is still needed for animation.
- Validation: `npm run check` passed (76 tests, type-check, production build). Browser-checked pass-out copy, radar layout, saved David chat, and workout. The browser test runner script itself was not run here because `playwright-core` is not installed; real-device touch/audio remain untested.

## What this session built: Episode 1 "The Storm" (the whole thing)
The owner's goal (message 2026-11-14): "one level done well." The challenge author's signature scene (dust storm about to bury the panels, 10 seconds to decide) is now the centrepiece. Flow, all implemented:

1. **Menu** → "Solar Forecast" card fetches the last 30 days of **real NASA DONKI flares live** (CORS ok, no key); labelled LIVE, with an ARCHIVED fallback (the real X9.0 flare of 2024-10-03). The fetched flare drives the storm automatically when available.
2. **Episode 1: The Storm** button → backstory holo card (owner's verbatim text, Hebrus Valles, 2036).
3. Base starts at **50% power**, dusty panels, seedlings in the beds, crew quarantined. **Intercom rings** (sound + shaking icon + mute, goes quiet after 5 real min). Walk to the hallway intercom, press E, **pick Reyes** from the crew (wrong person = gentle "no answer").
4. Reyes' call → objective **"CHECK ALL CORE SYSTEMS (0/5)": air, water, plants, comms, solar**. Each panel has a "✓ CHECK" button; solar is outside, so you must put the **suit** on at the rack first (suit rack is a new interactable in the hallway).
5. Evening of Sol 1 → **The Storm Call**: a 12-second timed decision card. **Stow** (no solar power, battery must carry everything) / **Leave out** (some power, dust buries the panels a bit more each night) / **Ask Earth** (the reply only arrives mid-storm — communication delay). A **"Take your time"** button pauses the countdown for young kids. Timeout = panels stay out.
6. **Sols 2–4 locked inside** (airlock refuses with a message). Space-weather alert runs HIGH/STORM (deterministic). **Radiation peak** card on Sol 2 (fill water walls / squeeze into the corner / hope — each costs something). **Power faults** and a **missed-system fault** (the system you skipped on Sol 1 breaks on Sol 3). Comms = static with one scrambled clue per Sol. Daily loop: 2 crew chats, water by hand (pump is broken), feed the crew, sleep.
7. **After the storm** → clean the panels (buried ones take extra work + leave permanent scratches) and repair the watering pump → **debrief**: stars, four metrics, and a **decision→consequence tree** ("You left the panels out → dust buried them → power was low"), plus **"Replay with a different plan."**
8. **Suit rule / health:** outside without the suit, or staying out through a HIGH alert, = pass out → reload last checkpoint (auto-saved at each Sol start and each objective). **Nobody dies.**
9. **NASA wiki** (5 sections: food, health, energy, travel, resources + "how the game uses NASA data"), reachable from the menu Help, the pause menu, the Control Module journal, and the debrief. All links opened and checked 2026-11-14.

### Code map (Episode 1)
- `src/core/episode.ts` — **pure rules** (storm timeline, alert levels, Storm Call, nightly consequences, decision tree, scoring). `src/core/constants.ts` → `EP` block.
- `src/story/episode1.ts` — beats + decision cards (content). `src/story/wiki.ts` — the wiki links. `src/story/learning.ts` — new learning cards (space_radiation, comms_delay, donki_live, exercise, water_recycling, moxie, nuclear_power, hebrus).
- `src/ui/episode.ts` — opening card, ringing intercom, 3 HUD meters, comms static, debrief, wiki, "Solar Forecast" DONKI fetch.
- Wired into: `src/core/director.ts` (ep beats/events + `onResolve`), `src/core/sim.ts` (`newGame({mode:'storm'})`, new actions: `answer check suit panels repair_watering`, `feed`; **SAVE_VERSION = 3**), `src/core/session.ts` (checkpoints: `saveCheckpoint`/`reloadCheckpoint`), `src/ui/panels.ts`, `src/ui/hud.ts`, `src/ui/ui.ts` (timed dialogue + {name}), `src/game/WorldScene.ts` (suit zone, storm lock, `passOut`, debrief), `src/game/world.ts` (suit rack + stowed-panel art), `src/ui/menu.ts`, `src/main.ts`.
- Data: `src/data/manifest.json` + `src/data/solar-events.json` — the two DONKI flares are now **verified: true** with exact flrIDs and peak times. `docs/NASA_SOURCES.md` is the judge-facing source list.

### Tested (77 unit tests, all pass; type-check + build clean)
`tests/episode.test.ts` (17): opening/call, the Storm Call (timed, stow vs out, Ask Earth delay), **balance** (neither choice dominates; a careful player and a leave-it-out player both survive, with different damage), storm lock, missed-check fault, deterministic alert, suit pass-out + checkpoint reload, after-storm finish + linked tree, scoring, 2 chats/Sol, save v3 migration. Plus the existing crew/art/sim tests.

## Episode 1 browser verification: COMPLETE (Claude Code, 2026-11-14)
Built on Codex's partial pass (its notes are kept below). Done in headless Chrome with two scripts, then screenshots were checked by eye. Screenshots: `docs/playtest/ep1/`.
- **Full playthrough** (`scripts/ep1-playthrough.mjs`): menu → backstory → ringing intercom → wrong caller gets "no answer" → Reyes' call → all 5 system checks (suit on for solar) → Storm Call (countdown + Take your time) → stow → 3 storm Sols (radiation-peak card, morning reports, static comms) → after the storm → dig out/clean panels → repair pump → **debrief with stars, metrics and a linked decision→consequence tree** → NASA wiki. **Zero console errors.**
- **17 targeted checks, all PASS on 2026-11-14** (`scripts/ep1-checks.mjs`): live DONKI on the menu; ARCHIVED fallback with DONKI blocked; the then-visible Quick Start; **Ask Earth**; storm airlock; suit pass-out and checkpoint reload; wiki links and learning source; no console errors. The test script now uses an internal quick-mode fixture and checks that the Quick Start button is absent, but that revised script was not rerun in this session. Note: the wiki-link checks open real nasa.gov pages and can time out on a slow connection.

### Bugs found and fixed in this pass
1. **Ask Earth never worked** (important): the countdown kept a copy of the old timeout choice, so asking Earth was recorded as "time ran out" and Earth's reply never came. Fixed in `src/ui/ui.ts` (reads `v.timer` at the deadline).
2. **Wiki and learning cards were invisible over the menu**: `#overlays` lived inside the hidden game screen. Moved it to the top level in `index.html` (same root cause as the earlier opening-card bug).
3. **Wiki section icons rendered huge** and pushed the links off-screen: inline SVGs had no size. Fixed in `src/ui/holo.css`.
4. **The objective's ⌕ learn button could swallow clicks**: the HUD rewrote that HTML 5 times a second. Now it only writes when the content changes (`setHtml` in `src/ui/hud.ts`).
5. The farm panel stayed open under the debrief; the debrief buttons wrapped badly. Fixed in `src/ui/episode.ts` / `holo.css`.
Also added: the radiation alarm sound while outside during a HIGH/STORM alert (`WorldScene.update`).

### Character creator (pack Step 3): DONE, browser-verified (16 checks, `scripts/creator-checks.mjs`)
Play → (asks "Start a new game?" if a save exists) → **creator** → backstory card → game. One scrollable holo modal with a live preview (front, side, EVA suit): (1) first name: spaces and symbols are blocked while typing, letters/hyphen/apostrophe, 2-12 characters, "One name only" helper, error text; (2) ten skin tones dark to light; (3) body style by description: "Long hair, narrower shoulders" / "Short hair, broader shoulders" (new `build` option in `pixelart.ts`); (4) hair colour wheel + 10 presets + hex input; CONTINUE disabled until the name is valid. The look is saved in settings and drawn on the player in the world (`lookToSpec`, `buildPlayerSheet` in `WorldScene.loadSession`). `settings.name` is the one source for `{name}` (`src/story/name.ts` `fillName`); the old Settings "Callsign" is now "Your name" with the same rule. The old Quick Start shortcut was removed from the menu; its internal option remains for automated tests only. Rules in `src/core/player.ts`, tests in `tests/player.test.ts`.

### East wing: gym, science lab, bathroom (pack Steps 5/9): DONE, browser-verified (11 checks, `scripts/wing-checks.mjs`)
- New **east wing** (tiles x 30-39) reached through a door in the corridor's old east wall. Walls in `world.ts`, furniture in `src/game/wing.ts` (`WING_BLOCKS` = collision). The comms dish moved outside to x 40-41; the campaign-only candidate cave moved to the south-east (x 37-41, y 23-27). The day/night indoor tint now covers the wing.
- **Gym** with the pack's three machines: resistance bands on wall anchors, a seatless cycle ergometer with a waist strap (wheel spins while used), and a rowing machine that is **folded flat against the wall** and **unfolds** while you row. Each opens a panel, then a short **rhythm mini-game** (press SPACE/tap in the green zone, 5 reps; "Skip (same result)" for accessibility), then the explorer is shown exercising. Rules (`src/core/gym.ts`, 8 tests): bands/bike/rower cost 5/10/15 energy and give +2/+4/+6 health; each night **0 workouts = -8 health**, **1-2 = +10** (rested and recovered), **3+ = -5** (overtrained, plus an immediate warning); the morning report says which. Healthier explorers lose health more slowly outside (`outsideDrainFactor`). The old automatic +15 health every night was removed: health now comes from the routine. NASA fact: crews exercise about two hours a day (verified page, learning card `exercise`).
- **Science lab**: microscope ("check the plants": 8 energy, +8 plant health, once per Sol) and a radiation-badge reader (shows your health and today's space-weather alert, links to the radiation and Curiosity RAD cards).
- **Bathroom** (fixtures only, kid-safe): sink, space toilet, shower; explains that water goes to Water Recovery and that the ISS recovers 98% (verified, learning card `water_recycling`).
- Honest deviation: the pack wanted the lab "right next to the greenhouse". The greenhouse has no free wall, so the lab is in the new wing. The campaign's build spots (solar array 2, recycler, shelter) now overlap the wing; they only appear in the old campaign, which the menu no longer starts.

### Journal + Mars map (pack Step 12): DONE, browser-verified (13 checks, `scripts/journal-checks.mjs`)
- **My journal** (pause menu → MY JOURNAL, or Control Module → Journal → MY JOURNAL), four tabs: **Mars photos** (PIA11704 Hebrus Valles pits, PIA19400 blue sunset in Gale Crater, PIA22487 Mars before/during the 2018 dust storm, PIA17936 Earth as the evening star; downsized to 880 px and **bundled** in `public/journal/`, each with its exact Photojournal credit and a source link); **Mission diary** (first-person entries written automatically when each objective is done, no dates or Sol numbers, each with a ⌕ NASA card: call, checks, Storm Call, storm over, panels, watering, mission complete; `diary()` in `episode.ts`); **My notes** (write and delete; saved in the game save as `state.notes`; typing does not move the explorer); **Mars map** (USGS MGS MOLA colour shaded relief, public domain, bundled in `public/map/`; a pin at the USGS Gazetteer centre of Hebrus Valles, 19.98°N 126.60°E, Feature 2404; labelled "Game location based on real map data"). Pause → MARS MAP opens straight to the map.
- Usage terms checked on the NASA Images and Media Usage Guidelines and the JPL Image Use Policy (educational use with credit). All credits, sources and terms are in `docs/NASA_SOURCES.md` section 2 and the manifest (`nasa-journal-photos`, `usgs-mola-map`). Tests (`tests/journal.test.ts`) fail if a photo is not bundled or not listed for the judges, if a diary entry is missing, duplicated, not first person or has a Sol number, or if its NASA link is not in `docs/NASA_SOURCES.md`.
- Also fixed: **Escape now closes whatever is on top** (before, opening the journal or wiki from the pause menu left Escape closing the hidden pause screen instead); opening them from the pause menu now closes the pause screen.

### Owner decisions (answered 2026-11-14)
- **D1** Hebrus Valles in all visible text (menu Help, README, AGENTS.md, page description). The old campaign code still says Hadriacus Mons/Hellas Planitia; it is not reachable from the menu, so it was left alone.
- **D2** Captain **Reyes** (not Reya).
- **D3** Title stays **My Little Red Planet**; **"A Junior Astronaut Mission Trainer"** is the subtitle (menu, browser tab, share cards, README). Checked on one line at desktop and at 390px phone width.
- **D4** Cut **Episode 2** and the **20 crew chats** (keep one chat each, 2 per Sol). **Still in scope:** the character creator (pack Step 3), the extra rooms + gym (Steps 5/9), the Mars map + journal photos (Step 12).

### Codex browser pass (2026-11-14; partial, kept for the record)
- Opened the opening card, intercom ring and mute; completed the then-available Quick Start storm sequence through Sol 5 in visible Chrome (Storm Call, Take Your Time, Ask Earth sent state, radiation choices, burial reports 55% → 40% → 35%, storm-end dialogue, AFTER THE STORM objective). Did not finish cleanup/debrief or the other checks. Headless Chrome would not launch in Codex's environment (`SIGABRT`); it launches fine in Claude Code's.

## Next (in order)
1. ~~Character creator~~ **DONE** (see below).
2. ~~Gym + health loop, bathroom, science lab~~ **DONE** (see below).
3. ~~Mars map + journal photos~~ **DONE** (see below).
4. ~~Judge package~~ **DONE**: `docs/DEMO_SCRIPT.md` (2-minute video, opens on the Storm Call); README points judges to `docs/NASA_SOURCES.md`.
5. **Kitchen vertical slice DONE in source, not browser-verified yet:** dedicated greenhouse-adjacent room art, kitchen interaction, five-portion menu copy, cooking/steam/tray carry animation, and physical carry-to-hatch delivery are implemented. Remaining kitchen work: original food card art, farm produce in the same menu, and physical watering/planting/repair animations.
6. Not yet checked by a human: touch/joystick play on a real phone or tablet; the sound of the ring/alarm/static (headless runs are silent).

### Codex continuation (2026-11-15)
- Added a phase-specific checklist to the Episode 1 objective dropdown in `src/core/episode.ts` / `src/ui/hud.ts`: the current action and upcoming tasks are visible for the call, systems check, prep, storm, cleanup, and debrief phases. Completed items show checkmarks. Campaign HUD chips are unchanged.
- Fixed the objective hint icon sizing in `src/ui/holo.css`; visually checked the opening call phase in browser at 1440×810. Checklist reads “Answer Captain Reyes at the hallway intercom”; hint and intercom callout are visible without layout overflow.
- Added a unit test for phase-specific checklist state (`tests/episode.test.ts`).
- Added an Episode 1 meal tray at the quarantine meal hatch: eight limited-stock NASA-style packaged meal choices, five portions per serving, water costs for hydrated meals, power costs for heated meals, estimated prep time, and serving animation. Added two core tests for resource accounting and atomic failure. Browser-checked a mixed five-portion tray in Sol 2, cooking and serving at the hatch, the energy cost and health gain. Full debrief run after this change remains untested.
- Added five optional bonus-star objectives to the objective dropdown and debrief (team morale, journal note, NASA source, share, plant health), plus WhatsApp/X/Facebook links and copy-link control. Share/wiki completion is session-local; no analytics or external tracking. Browser-checked the HUD objective/bonus list, but did not finish a full storm-to-debrief browser run after these changes.
- Fixed the east-wing lab bench collision so tile 32 remains open as the lab doorway (`src/game/wing.ts`). Polished dialogue choice cards.
- Review follow-up: bonus goals now use one shared definition and reset on a new run, the meal button explains why it is disabled, malformed tray data is rejected safely, the player cannot reopen the hatch during the serving animation, and the tray summary stays visible while meal cards scroll on narrow screens. The 445px kitchen layout was checked in the browser after restarting Vite.
- Current suite: 77 tests; `npm run check` passed (unit tests, TypeScript, production build).
- Still not built from prompt #2: a separate kitchen room and farm-produce/locked-crop menu; physical farm planting/watering/repair animations; rec-room sleep pod and playable chess/checkers; a new storm preparation repair choice; the water-ice continuation ending. Keep the existing Episode 1 finale unless the owner explicitly wants a second playable chapter; these remaining requests need design and a full playtest before calling them done.

## Earlier work still in place (Visual Pass A)
Generated pixel characters (`src/game/pixelart.ts`, `sprites.ts`), crew quarters with animated crew + morale faces + hunger bubbles + meal hatch (`quarters.ts`, `crewlife.ts`), day/night (`skytint.ts`/`daynight.ts`). The **open campaign** (original 6-stage game) still exists and works; Episode 1 runs alongside it (`state.ep` null = campaign). Screenshots in `docs/playtest/`.

## Known gaps / not verified
- Touch controls on a real device; audio (headless runs are silent). Post-quarantine crew placement (campaign only).
- Campaign-mode climate table is still a labelled dev fallback (Episode 1 does not use it). Campaign discovery cards still say "verify citation".
- `scripts/` needs `playwright-core` + Chrome for the automated playtest (not a runtime dependency).

## Commands
`npm install` · `npm run dev` · `npm run check` · browser scripts (after `npm i --no-save playwright-core`, Chrome, dev server on 5179): `node scripts/ep1-playthrough.mjs <outdir>` and `node scripts/ep1-checks.mjs <outdir>`
