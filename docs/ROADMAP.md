# Roadmap (check boxes only after testing; note what is untested)

Legend: [x] done and tested · [~] exists but not fully verified · [ ] not started

## Phase 0: Scaffold
- [x] Vite + TS + Phaser project, tests, build (`npm run check` passes)
- [x] Docs for agents: AGENTS.md, HANDOFF.md, DESIGN.md, ART_SPEC.md, DATA_MANIFEST.md
- [x] Placeholder atlas generator

## Phase 1: Port from legacy (legacy/Junior_Mars_Commander.html)
- [x] Power vs air/water/farm trade-off, sun curve, dust effect on solar
- [x] Suit air, radiation allowance, X-class flare multiplier (2.0)
- [ ] Live DONKI fetch with archived fallback (legacy had it). Replace with preprocessed JSON per DATA_MANIFEST.md; no live dependency
- [ ] Sound effects, awards, leaderboard, settings (reduced motion), intro cinematic
- [ ] Original 12-second comms delay interaction as a playable mini-mechanic

## Phase 2: One excellent Sol (the playable core)
- [x] Simulation, energy per action, crops, buildings, sustainability, rewind, save (unit-tested)
- [~] Phaser world: movement, interaction, HUD, menus. Type-checks and builds; NOT yet played in a browser
- [ ] Playtest in browser, fix bugs, tune HOURS_PER_SEC and balance
- [ ] Collapse HUD to three headline meters

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
- [ ] Real Stardew-style art swap per ART_SPEC.md
- [ ] Touch controls / tablet pass
- [ ] Test as a 9-year-old and as a NASA judge; write README for judges
