# HANDOFF (update at the end of every session)

Last updated 2026-11-14 by Claude Code (session ended mid-playtest, usage ran out). Next agent: **Codex**.

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

## ⚠️ FIRST TASK for Codex: confirm the Episode 1 UI in a browser (NOT yet done)
The rules are unit-tested and the whole front end **type-checks and builds**, but a full **browser** playthrough was **interrupted before it finished** — only the menu and the opening card were screenshotted. The last fix (keep the opening card from being closed by `loadSession`; `WorldScene.ts` ~line 62) was **not re-verified end to end.** So:
1. `npm run dev`, then play **Episode 1** by hand Sol 1 → debrief. Also a **Quick start** (menu button: systems pre-checked, clock near the Storm Call). Fix any UI bug you find; the rules layer is solid, so bugs will be in wiring/markup.
2. Or run the automated pass: `npm i --no-save playwright-core` (uses installed Chrome), start the dev server on 5179, then `node scripts/ep1-playthrough.mjs docs/playtest/ep1` — it drives the whole episode and saves screenshots. **Look at them.**
3. Check: the ring sound + mute; the countdown bar and "Take your time"; "Ask Earth" shows "message sent" and resolves only after the storm (the `earth_reply` beat fires); the 3 meters + alert chip update; airlock refuses during the storm; passing out reloads the checkpoint; the debrief tree lines link cause→effect; every wiki/learning link opens.
4. Confirm the live DONKI fetch on the menu (online) and the graceful ARCHIVED fallback (offline / block the request).

## Then, if time (smaller, each optional)
- **Audio polish:** radiation alarm when the alert flips to HIGH while outside (sound exists: `sfx.alarm`); wire it in `WorldScene.update`.
- **Mobile pass:** the ep-bar and ring at phone width (CSS is there; eyeball it).
- **Owner decisions still open** (ask, don't guess): D1 the old campaign still says Hadriacus Mons in `beats.ts`/menu (Episode 1 uses Hebrus Valles correctly; the campaign is untouched); D2 captain "Reya" vs "Reyes" (kept Reyes); D3 title/subtitle "Junior Astronaut Mission Trainer"; D4 which scope from `docs/PROMPT_PACK.md` to cut.
- **Judge package:** a short README section + the 2-min video script (open on the Storm Call). `docs/NASA_SOURCES.md` is ready to hand over.

## Earlier work still in place (Visual Pass A)
Generated pixel characters (`src/game/pixelart.ts`, `sprites.ts`), crew quarters with animated crew + morale faces + hunger bubbles + meal hatch (`quarters.ts`, `crewlife.ts`), day/night (`skytint.ts`/`daynight.ts`). The **open campaign** (original 6-stage game) still exists and works; Episode 1 runs alongside it (`state.ep` null = campaign). Screenshots in `docs/playtest/`.

## Known gaps / not verified
- The Episode 1 **browser** flow (see FIRST TASK). Touch controls with the taller sprite. Post-quarantine crew placement (campaign only).
- Campaign-mode climate table is still a labelled dev fallback (Episode 1 does not use it). Campaign discovery cards still say "verify citation".
- `scripts/` needs `playwright-core` + Chrome for the automated playtest (not a runtime dependency).

## Commands
`npm install` · `npm run dev` · `npm run check` · `node scripts/ep1-playthrough.mjs <outdir>` (after installing playwright-core, dev server on 5179)
