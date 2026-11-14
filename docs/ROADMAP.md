# Roadmap (check boxes only after testing; note what is untested)

Legend: [x] done and tested · [~] exists but not fully verified · [ ] not started

## Phase 0: Scaffold
- [x] Vite + TS + Phaser project, tests, build (`npm run check` passes)
- [x] Docs for agents: AGENTS.md, HANDOFF.md, DESIGN.md, DATA_MANIFEST.md
- [x] Look ported from the legacy prototype: home menu, HUD, panels, rooms (see AGENTS.md)

## Phase 1: Port from legacy (legacy/Junior_Mars_Commander.html)
- [x] Power vs air/water/farm trade-off, sun curve, dust effect on solar
- [x] Suit air, radiation allowance, X-class flare multiplier (2.0)
- [ ] Live DONKI fetch with archived fallback (legacy had it). Replace with preprocessed JSON per DATA_MANIFEST.md; no live dependency
- [x] Sound effects, awards, leaderboard (device-local), settings (sound, reduce motion, callsign), starfield menu, touch joystick
- [ ] Intro cinematic
- [ ] Original 12-second comms delay interaction as a playable mini-mechanic

## Phase 2: One excellent Sol (the playable core)
- [x] Simulation, energy per action, crops, buildings, sustainability, rewind, save (unit-tested)
- [~] Phaser world, zone panels, HUD, menu, dialogue, results. Type-checks and builds; NOT yet played in a browser
- [ ] Playtest in browser, fix bugs, tune HOURS_PER_SEC and balance
- [x] HUD is the prototype's layout: objective line, four meters in a popover, energy bar, suit/radiation when outside

## Visual Pass A (owner's "visuals first" note, 2026-11-14)
- [x] Original generated pixel characters (player, EVA, 4 crew), 3 directions, walk cycle, poses (screenshot-checked)
- [x] Crew quarters with thin dividers, bed, desk, lamp, chair, personal items
- [x] Crew animated: wander, stand at window, lie down, nap, write at desk; evening reading by lamplight; night sleep with zzz
- [x] Morale faces over heads; hunger thought bubble; heart reaction to chats and meals
- [x] Meal hatch: serve food by hand (tray animation), costs energy and food, morale effects (unit-tested)
- [x] Farm beds: water-drop bubble when dry, star bubble when ready
- [x] Day/night tint, outdoor and indoor lights at night, dust dimming (pure maths unit-tested)
- [x] Intercom zone moved to the corridor (was unreachable inside the sealed bay)
- [~] Touch controls with the taller sprite; post-quarantine crew placement: not human-tested
- [ ] Visual Pass B: kitchen with electric heater, cooking, on-screen animations for watering, panel cleaning, repairs

## Episode 1 "The Storm" (2026-11-14)
- [x] Core rules + decision tree + scoring (54 unit tests)
- [x] Opening card, ringing intercom, 5-system check, suit rack, timed Storm Call, Ask Earth delay, 3 storm Sols, radiation-shield choice, faults, after-storm repairs, debrief + replay (browser-verified, 17 checks + full playthrough)
- [x] Live DONKI "Today's Sun" with ARCHIVED fallback (browser-verified online and blocked)
- [x] NASA wiki (30 checked links) + docs/NASA_SOURCES.md
- [x] Owner decisions D1-D4 applied (Hebrus Valles text, Reyes, subtitle, cuts)
- [x] Character creator (Step 3): name rule, skin, body style, hair wheel, live preview, overwrite confirm (16 browser checks)
- [ ] Gym + health loop, bathroom, science lab (Steps 5/9)
- [ ] Mars map + journal photos (Step 12)
- [~] Touch play on a real device; audio by ear (not testable headless)
- [-] Cut by owner: Episode 2, 20 crew chats

## Phase 3: Crew and construction
- [x] 4 crew with dialogue by stage, friendship, quarantine arc
- [ ] One full personal storyline per crew member (Reyes and one other first)
- [ ] Buildings with visible construction animation; furniture/decoration (defer)

## Phase 4: NASA data
- [x] Manifest, bundled JSON, flare scheduling, tests that every real-data event cites the manifest
- [ ] Replace `mars-climate-dev-fallback` with a real NASA Mars Global Climate Model or MEDA/REMS-derived table (verify access first, cap research at a few hours)
- [ ] Verify flare class/date entries in DONKI; fill exact source URLs; set `verified: true`
- [ ] Add one more real dust or rover-observation event

## Phase 5: Retention
- [x] Daily Sol report built from game state; manual Sol advance; journal
- [ ] Richer report (crew discoveries, construction progress)
- [ ] Timeline compare screen with outcome numbers (currently decisions only)

## Phase 6: Cave, polish, test
- [x] Cave verbs and ending logic (unit-level)
- [ ] Cave underground map/scene (currently a menu from the cave mouth)
- [ ] Decide with the owner: keep the prototype's look, or move characters/crops to Stardew-style sprites
- [ ] Touch controls / tablet pass
- [ ] Test as a 9-year-old and as a NASA judge; write README for judges
