# HANDOFF (update at the end of every session)

Last updated 2026-11-15 by Copilot (gameplay UI fixes and quarantine dialogue portraits).

## START HERE
Read: `AGENTS.md` (rules) → this file → `docs/CHALLENGE.md` (what the judges want) → `docs/NASA_SOURCES.md` (every real-data point, for judges) → `docs/DESIGN.md`. `docs/PROMPT_PACK.md` is the owner's long Episode 1 brief — reference for wording/intent, not the task order; this file sets the order.

**Setup:** `npm install` · `npm run dev` (port 5173, or `--port 5179`) · `npm run check` (76 tests + type-check + build, all passing now).
**Git:** branch `visual-pass-a` tracks `origin/visual-pass-a`. Includes the owner's GitHub update (crew portraits, commit `c6a6cb4`) already merged. The user has GitHub access to `bytemojo/my-red-planet`. **Do not** run `vercel`, push unless asked, or open/commit `.env.local` or `.vercel/`.
**Always:** `npm run check` must pass before you call anything done. Commit after each task. Update this file honestly.

## Latest session (2026-11-15): gameplay UI + quarantined crew portraits
- Simplified the pass-out message; the checkpoint recovery and suit-rack tip remain.
- Added a circular HUD radar with player location, key station markers, and the current objective highlighted. Verified at desktop and 390px mobile width.
- Crew chat choices are stored in `GameState` and saves (SAVE_VERSION 4); old saves and rewind snapshots migrate with empty chat records. David's reply was browser-tested after leaving and reopening the intercom. Chat profile photos remain the regular crew portraits.
- The workout now judges the marker position shown on the last rendered frame and reports clear hit/miss feedback. Browser-tested five successful PUSH hits through the green zone.
- Removed the user-facing Quick Start menu button and route. The internal quick-start simulation option remains for automated testing only; the browser test fixture no longer depends on a visible button.
- Added supplied sick-state dialogue cutouts for Reyes and Dr. Silva. They are used only before `quarantine_over`; recovered dialogue uses the existing PNGs. Dr. Silva's cutout is half-size in both states. The chat profile images are unchanged. The Reyes asset is a single-frame GIF; Dr. Silva's latest attachment has a `.gif` filename but PNG file signature and one frame. Neither cutout is animated; a multi-frame asset is still needed for animation.
- Validation: `npm run check` passed (76 tests, type-check, production build). Browser-checked pass-out copy, radar layout, saved David chat, and workout. The browser test runner script itself was not run here because `playwright-core` is not installed; real-device touch/audio remain untested.

## What this session built: Episode 1 "The Storm" (the whole thing)
The owner's goal (message 2026-11-14): "one level done well." The challenge author's signature scene (dust storm about to bury the panels, 10 seconds to decide) is now the centrepiece. Flow, all implemented:

1. **Menu** → "Today's Sun" card fetches the last 30 days of **real NASA DONKI flares live** (CORS ok, no key); labelled LIVE, with an ARCHIVED fallback (the real X9.0 flare of 2024-10-03). A toggle picks which Sun drives the storm.
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
- `src/ui/episode.ts` — opening card, ringing intercom, 3 HUD meters, comms static, debrief, wiki, "Today's Sun" DONKI fetch.
- Wired into: `src/core/director.ts` (ep beats/events + `onResolve`), `src/core/sim.ts` (`newGame({mode:'storm'})`, new actions: `answer check suit panels repair_watering`, `feed`; **SAVE_VERSION = 3**), `src/core/session.ts` (checkpoints: `saveCheckpoint`/`reloadCheckpoint`), `src/ui/panels.ts`, `src/ui/hud.ts`, `src/ui/ui.ts` (timed dialogue + {name}), `src/game/WorldScene.ts` (suit zone, storm lock, `passOut`, debrief), `src/game/world.ts` (suit rack + stowed-panel art), `src/ui/menu.ts`, `src/main.ts`.
- Data: `src/data/manifest.json` + `src/data/solar-events.json` — the two DONKI flares are now **verified: true** with exact flrIDs and peak times. `docs/NASA_SOURCES.md` is the judge-facing source list.

### Tested (54 unit tests, all pass; type-check + build clean)
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
6. The owner's original visual note also asked for a **kitchen with cooking on an electric heater** and on-screen animations for **watering** and **repairs**. Not built yet; it was not in the D4 question, so ask the owner whether it is still wanted for Level 1.
5. Not yet checked by a human: touch/joystick play on a real phone or tablet; the sound of the ring/alarm/static (headless runs are silent).

## Earlier work still in place (Visual Pass A)
Generated pixel characters (`src/game/pixelart.ts`, `sprites.ts`), crew quarters with animated crew + morale faces + hunger bubbles + meal hatch (`quarters.ts`, `crewlife.ts`), day/night (`skytint.ts`/`daynight.ts`). The **open campaign** (original 6-stage game) still exists and works; Episode 1 runs alongside it (`state.ep` null = campaign). Screenshots in `docs/playtest/`.

## Known gaps / not verified
- Touch controls on a real device; audio (headless runs are silent). Post-quarantine crew placement (campaign only).
- Campaign-mode climate table is still a labelled dev fallback (Episode 1 does not use it). Campaign discovery cards still say "verify citation".
- `scripts/` needs `playwright-core` + Chrome for the automated playtest (not a runtime dependency).

## Commands
`npm install` · `npm run dev` · `npm run check` · browser scripts (after `npm i --no-save playwright-core`, Chrome, dev server on 5179): `node scripts/ep1-playthrough.mjs <outdir>` and `node scripts/ep1-checks.mjs <outdir>`
