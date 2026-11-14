# HANDOFF (update at the end of every session)

Last updated 2026-11-14 by Claude Code (Episode 1 browser verification complete; owner decisions D1-D4 answered).

## START HERE
Read: `AGENTS.md` (rules) → this file → `docs/CHALLENGE.md` (what the judges want) → `docs/NASA_SOURCES.md` (every real-data point, for judges) → `docs/DESIGN.md`. `docs/PROMPT_PACK.md` is the owner's long Episode 1 brief — reference for wording/intent, not the task order; this file sets the order.

**Setup:** `npm install` · `npm run dev` (port 5173, or `--port 5179`) · `npm run check` (54 tests + type-check + build, all passing now). 
**Git:** branch `visual-pass-a`, latest commit `0f7e6f2`. Includes the owner's GitHub update (crew portraits, commit `c6a6cb4`) already merged. The user has GitHub access to `bytemojo/my-red-planet`; they will push/PR. **Do not** run `vercel`, push without asking, or open/commit `.env.local` or `.vercel/`.
**Always:** `npm run check` must pass before you call anything done. Commit after each task. Update this file honestly.

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
- **17 targeted checks, all PASS** (`scripts/ep1-checks.mjs`): live DONKI on the menu (read real flares, e.g. M3.5 on 2026-11-05, 13 flares in 30 days); ARCHIVED fallback with DONKI blocked, and the storm then uses the archived X9.0 flare; Quick Start (systems pre-checked, Storm Call arrives by itself); **Ask Earth**: "message sent", panels stay out at the deadline, and Earth's reply arrives on Sol 2 *after* "the storm is here" (too late to change the call); airlock refuses during the storm (toast "Airlock sealed"); going outside without the suit → pass out → checkpoint reload (back inside, pass-out counted); wiki: 30 https links, all open in a new tab and load the NASA page; learning card opens its NASA source; no console errors in any run. Note: the two link checks depend on nasa.gov loading; one run timed out once on a slow page, the rerun passed.

### Bugs found and fixed in this pass
1. **Ask Earth never worked** (important): the countdown kept a copy of the old timeout choice, so asking Earth was recorded as "time ran out" and Earth's reply never came. Fixed in `src/ui/ui.ts` (reads `v.timer` at the deadline).
2. **Wiki and learning cards were invisible over the menu**: `#overlays` lived inside the hidden game screen. Moved it to the top level in `index.html` (same root cause as the earlier opening-card bug).
3. **Wiki section icons rendered huge** and pushed the links off-screen: inline SVGs had no size. Fixed in `src/ui/holo.css`.
4. **The objective's ⌕ learn button could swallow clicks**: the HUD rewrote that HTML 5 times a second. Now it only writes when the content changes (`setHtml` in `src/ui/hud.ts`).
5. The farm panel stayed open under the debrief; the debrief buttons wrapped badly. Fixed in `src/ui/episode.ts` / `holo.css`.
Also added: the radiation alarm sound while outside during a HIGH/STORM alert (`WorldScene.update`).

### Character creator (pack Step 3): DONE, browser-verified (16 checks, `scripts/creator-checks.mjs`)
Play → (asks "Start a new game?" if a save exists) → **creator** → backstory card → game. One scrollable holo modal with a live preview (front, side, EVA suit): (1) first name: spaces and symbols are blocked while typing, letters/hyphen/apostrophe, 2-12 characters, "One name only" helper, error text; (2) ten skin tones dark to light; (3) body style by description: "Long hair, narrower shoulders" / "Short hair, broader shoulders" (new `build` option in `pixelart.ts`); (4) hair colour wheel + 10 presets + hex input; CONTINUE disabled until the name is valid. The look is saved in settings and drawn on the player in the world (`lookToSpec`, `buildPlayerSheet` in `WorldScene.loadSession`). `settings.name` is the one source for `{name}` (`src/story/name.ts` `fillName`); the old Settings "Callsign" is now "Your name" with the same rule. Quick Start skips the creator and uses the last look. Rules in `src/core/player.ts`, tests in `tests/player.test.ts`.

### Owner decisions (answered 2026-11-14)
- **D1** Hebrus Valles in all visible text (menu Help, README, AGENTS.md, page description). The old campaign code still says Hadriacus Mons/Hellas Planitia; it is not reachable from the menu, so it was left alone.
- **D2** Captain **Reyes** (not Reya).
- **D3** Title stays **My Little Red Planet**; **"A Junior Astronaut Mission Trainer"** is the subtitle (menu, browser tab, share cards, README). Checked on one line at desktop and at 390px phone width.
- **D4** Cut **Episode 2** and the **20 crew chats** (keep one chat each, 2 per Sol). **Still in scope:** the character creator (pack Step 3), the extra rooms + gym (Steps 5/9), the Mars map + journal photos (Step 12).

### Codex browser pass (2026-11-14; partial, kept for the record)
- Opened the opening card, intercom ring and mute; completed the Quick Start storm sequence through Sol 5 in visible Chrome (Storm Call, Take Your Time, Ask Earth sent state, radiation choices, burial reports 55% → 40% → 35%, storm-end dialogue, AFTER THE STORM objective). Did not finish cleanup/debrief or the other checks. Headless Chrome would not launch in Codex's environment (`SIGABRT`); it launches fine in Claude Code's.

## Next (in order)
1. ~~Character creator~~ **DONE** (see below).
2. **Gym + health loop** (pack Steps 5/9) and the **bathroom / science lab** rooms (Step 5), drawn in the same pixel style.
3. **Mars map + journal photos** (Step 12): bundle NASA images with credits (check usage guidelines), marker at Hebrus Valles from a verified source.
4. Judge package: 2-minute video script (open on the Storm Call). README already points judges to `docs/NASA_SOURCES.md`.
5. Not yet checked by a human: touch/joystick play on a real phone or tablet; the sound of the ring/alarm/static (headless runs are silent).

## Earlier work still in place (Visual Pass A)
Generated pixel characters (`src/game/pixelart.ts`, `sprites.ts`), crew quarters with animated crew + morale faces + hunger bubbles + meal hatch (`quarters.ts`, `crewlife.ts`), day/night (`skytint.ts`/`daynight.ts`). The **open campaign** (original 6-stage game) still exists and works; Episode 1 runs alongside it (`state.ep` null = campaign). Screenshots in `docs/playtest/`.

## Known gaps / not verified
- Touch controls on a real device; audio (headless runs are silent). Post-quarantine crew placement (campaign only).
- Campaign-mode climate table is still a labelled dev fallback (Episode 1 does not use it). Campaign discovery cards still say "verify citation".
- `scripts/` needs `playwright-core` + Chrome for the automated playtest (not a runtime dependency).

## Commands
`npm install` · `npm run dev` · `npm run check` · browser scripts (after `npm i --no-save playwright-core`, Chrome, dev server on 5179): `node scripts/ep1-playthrough.mjs <outdir>` and `node scripts/ep1-checks.mjs <outdir>`
