# Owner's Episode 1 prompt pack (reference, NOT the to-do list)

Saved verbatim from the team lead (typos lightly corrected). **The priority order in HANDOFF.md wins** where it conflicts with this file, because the hackathon challenge (docs/CHALLENGE.md) sets the judging priorities. Use this file for the owner's intent, detail and wording. None of Steps 0-14 below have been run yet except the owner's visual note, which became Visual Pass A (done, see HANDOFF.md).

---

# NOTES FROM OWNER (run first)

Start with the visual direction first: character and location design before gameplay mechanics. Integrate this into the build of the core gameplay mechanic: I'm looking for visual quality, pixel art style, Stardew Valley cuteness. Make sure the characters, rooms, habitat and objects are properly detailed. The characters are currently just in their pods. Put a thin room divider between their quarters and show them animated and walking around, sitting down or sleeping or writing in a journal. When it is night time show them sleeping or reading with a desk lamp on. Show their morale on top of their head based on your conversations with them (more convos = happy crew), from neutral emoji to happy to sad. You can talk to cheer them up. You also have to bring food to them from the kitchen. So basically part of the task is cooking and feeding them (you cook the same thing every day and they get low on morale). Pick what to feed based on availability, water plants, clean panels, (WHEN CREW NEEDS FOOD SHOW FOOD EMOJI IN THOUGHT BUBBLE, MAKE THEM MOVE MORE), check systems for repair, in time the crew becomes healthy (WHEN CROPS NEED WATERING SHOW WATER EMOJI) and you harvest your first crops (SHOW HARVEST READY). After the storm is over you get your highlight/score and an option to replay the mission.

I WANT EACH ACTION TO BE DONE MANUALLY RATHER THAN ON BUTTON PRESS IN A MENU UI. FOR EXAMPLE WATERING CROPS SHOULD SHOW THE CHARACTER WATERING, COOKING IN THE KITCHEN SHOWS REAL ANIMATION OVER AN ELECTRIC HEATER (NO OPEN FLAME), FIXING REPAIRS ALSO REQUIRES ANIMATION ON THE MACHINE.

---

# MY RED PLANET: Episode 1 "The Storm"

## How the owner intended it to run
Run steps in order, one per agent session: paste the Shared Header, then one Step. Do not start step N+1 until step N's acceptance checks pass and it is committed. Each step ends with `npm run check`, a browser playthrough, HANDOFF.md updated, ROADMAP.md ticked only for what was tested, one commit.

## Conflicts between this brief and AGENTS.md (defaults chosen by the owner's pack)
| # | New brief says | Existing repo says | Default |
|---|---|---|---|
| 1 | Site: **Hebrus Valles** | Hadriacus Mons, Hellas Planitia | Hebrus Valles for Episode 1. Verify real coordinates (USGS Gazetteer of Planetary Nomenclature). |
| 2 | Outside without suit: pass out, restart from last checkpoint | Suit blackout: towed in, lose energy/power/time | Pass out and reload last checkpoint (auto-saved each Sol start and after each objective). Nobody dies. |
| 3 | Top meters: Base Energy, Player Health, Team Morale | Three headline meters: Life Support, Power, Radiation | New three on the top bar. Air/water/solar/crew/comms/Maven in the meter popup. Small action-energy bar stays. **See HANDOFF decision D2: this drops radiation, which the challenge names.** |
| 4 | Captain "Reya" | Captain Elena Reyes | Keep Reyes (probably a typo). |
| 5 | Sims-style creator, new modules | "Do not redesign" the holo look | Keep holo/cyan/amber style. New screens allowed in that style. |
| 6 | Fragments after "ignore below this" | n/a | Only the stray fragment about "alternative plan / shutdown / everyone falls sick" is notes. Episodes, intercom, sleep pod, shipment, comms static, hub-management lines are kept. |
| 7 | Can't clean panels during the storm but must check Maven outside | n/a | Sol 1 = prep day (outside allowed, Maven warnings live). Sols 2-4 = locked inside. Panels cleaned after. |
| 8 | Intercom buzzes up to 5 min | Audio needs a user gesture | Buzz up to 5 real minutes or until answered, visible mute button. Icon stays until answered. |

## Shared Header (the owner pastes this before every step)
```
You are continuing the browser game MY RED PLANET (Vite + TypeScript + Phaser 3 + DOM overlays).
Read AGENTS.md, then HANDOFF.md, then docs/ROADMAP.md and docs/EPISODE1.md (if it exists) BEFORE touching code.

Rules for this session:
- Do ONLY the step below. Do not start other steps.
- Game logic in src/core/ (pure TS, no Phaser/DOM, unit-tested). Content as data in src/story/. Phaser only reads state and calls act()/resolve().
- Keep the holographic cyan/amber UI style (src/ui/holo.css). Original art only; never copy Stardew assets.
- Every player-facing line of NPC dialogue that addresses the player uses the token {name}, replaced at render time with the player's chosen first name.
- Kid-safe (ages 7-12): nobody dies, no punishing absences, short plain text.
- Data honesty: never invent NASA facts or URLs. Every external NASA link must be checked (open it or fetch it) and recorded in src/data/manifest.json. Game models (e.g. the Maven meter) are labelled "game model", not observation. The game works fully offline; only the external links need internet.
- No fake features: no button that does nothing.
- Save state is plain JSON. Bump the save version and migrate or reset old saves safely.
- Finish with: npm run check passing, a browser playthrough of what you built (npm run dev), HANDOFF.md updated honestly (done / broken / untested / next), ROADMAP.md ticked only for what you tested, and one git commit.
- Final message: what works, what you could not verify, and the exact manual test steps for me.
```

## Step 0: Align the project docs with the new brief (NO gameplay code)
Create docs/EPISODE1.md with the spec below, organised into sections (Story, Flow, Base layout, Systems, HUD/meters, Crew, Storm arc, Journal, Map, Scoring, Episodes). Update AGENTS.md, HANDOFF.md, docs/ROADMAP.md.
Decisions to bake in:
1. Site is Hebrus Valles (verify real coordinates from the USGS Gazetteer of Planetary Nomenclature or another NASA/USGS source; record in the manifest). Update README/intro references to Hadriacus Mons where they describe Episode 1.
2. Fail state: going outside without a suit = pass out, reload last checkpoint. Replaces "towed in".
3. Top HUD meters: Base Energy, Player Health, Team Morale. Meter popup shows water, air, solar power, crew, comms, Maven alert. Keep the small action-energy bar.
4. Keep captain's name "Reyes" unless told otherwise.
5. Episodes: Ep1 "The Storm". Ep2 "The Rover" (placeholder, later). Episodes replayable from the main menu.
6. The earlier "three headline meters" rule is retired.

Episode 1 core loop: Take care of habitat (install / fix / repair) -> Familiarise with crew (take care of them, learn about them) -> Expand territory (explore and build on Mars).

Opening backstory text (verbatim, in a holographic card, first thing players see):
> "The year is 2036. You are part of a NASA mission to explore the Hebrus Valles region on Mars and build the foundation for future human habitation. But soon after landing, the flu leaves everyone on your team sick except you. As the only healthy crew member on the base and a radiation storm approaching, the future of humanity on Mars now rests on you. Do your best, recruit."

Episode 1 structure: Sol 1 = prep day (outside allowed). Sols 2-4 = 3 sols locked inside during the radiation storm, which coincides with a regional dust storm. Base starts at 50% power ("Base at 50% power already."). Solar panels are dust-covered and cannot be cleaned until after the storm.
Also: list every step (1-13) in ROADMAP.md as unchecked items under an "Episode 1" section; list open questions at the top of HANDOFF.md. Do not delete legacy/ or touch src/.
Acceptance: docs consistent (grep "Hadriacus", "towed", "three headline" and resolve every hit); npm run check passes.

## Step 1: Baseline playtest and bug fixes (existing game)
Play Sol 1 to Sol 3 in a real browser (Playwright fine, screenshots). Test movement (keys, tap-to-walk, touch), E key, zone prompts, intercom, farm beds and crop stages, air/water panel, comms, solar and EVA, pause menu, save/resume, rewind, daily report. Fix every bug in the smallest way. Known suspects: crop occlusion, tap-to-station routing around blocked furniture, blocked 5th bed area, journal "happened" text regex. Tests for fixes touching src/core or src/story. No new features. Deliver: bug list in HANDOFF.md, screenshots in docs/playtest/. Acceptance: Sol 1-3 playable with no console errors; npm run check passes.

## Step 2: Episode framework, checkpoints, "new game vs resume"
1. Episode model in src/core: Episode { id, title, status: 'playable' | 'coming_soon' }. Ep1 playable. Ep2 "The Rover" coming_soon (locked card that says "Coming soon", no dead button).
2. Main menu: NEW GAME / CONTINUE (only with a valid save) / EPISODES (replay any unlocked episode from the start). NEW GAME with an existing save asks to confirm overwrite. NEW GAME with no save goes to character creation (Step 3; for now a stub that starts the game).
3. Checkpoints: auto-save at the start of every Sol and after each completed objective; keep only the last checkpoint (plus rewind snapshots). Expose reloadLastCheckpoint() in src/core/session.ts.
4. Save versioning and safe migration of the old 'mrp.save.v1'.
5. Per-episode result record (empty scoring fields for now: moraleAvg, baseEnergy, plantHealth, stars) stored in the save.
Tests: checkpoint written at Sol start and objective complete; reload restores exactly; old saves migrate or reset without a crash.

## Step 3: Character creator (Sims-style, one scrollable modal) [recommended cut]
Shown only on NEW game with no save. One scrollable holographic modal with a live preview. Sections: (1) name, ONE first name only, spaces blocked while typing, letters and hyphen/apostrophe, 2-12 chars, helper "One name only"; (2) skin tone, 8-10 even swatches dark to light, selected has a ring; (3) body style: two choices with previews, long hair or short hair, labelled by description not gender; (4) hair colour wheel with accessible fallback (hex input or presets), live preview; (5) CONTINUE disabled until the name is valid. Extend the sprite generator for skin, body, hair on indoor and EVA frames (now `buildPlayerSheet(scene, spec)` in src/game/sprites.ts). Store { name, skin, body, hair } in save and settings. Add a {name} templating function in src/story (one place) and convert ALL NPC dialogue (beats, crew, events, director), using the name in roughly 1 of 3 lines, never twice in a line. Remove the old "callsign" setting. Tests: name validator, template function, save round-trip.

## Step 4: Opening sequence: holo card -> intercom call -> first objective
1. Holographic card with the backstory (verbatim above). Player taps CONTINUE.
2. Game starts in the base. After a short beat the INTERCOM RINGS: generated ring/buzz via Web Audio, repeating, visible mute button next to the icon; if audio is not unlocked, show the visual alert and play on first gesture. A flat intercom icon in the upper corner pulses/shakes with Captain Reyes' avatar/name. Keeps buzzing until answered or 5 real minutes pass (then quiet but the icon stays lit until answered).
3. The player must walk to the quarantine intercom in the hallway outside the locked med bay, press E, and pick the caller from a list of crew (indicator on who is calling). The wrong person gives a gentle "no answer".
4. Conversation: the crew member's cut-out portrait with text. Med bay is locked; talk through the intercom only.
5. Reyes' first scripted conversation (use {name}): "There's a solar storm coming and just our luck, it's happening during the middle of a dust storm." / "{name}, our power reserves are already down, so we need you to maintain all systems." / "Check that all core systems are functioning before the solar storm hits. Always watch your Maven meter for solar alerts while you're outside."
6. Objective at top: exactly "TALK TO CAPTAIN REYES" until the call is done; then "CHECK ALL CORE SYSTEMS (0/5): air, water, plants, comms, solar panels", ticking as each is checked.
Tests: call state machine (ringing, answered, timed-out-but-lit), objective progression.

## Step 5: Build out the base layout (rooms and furniture)
Add in the same pixel style: KITCHEN with a small white plastic dining table; BATHROOM (private, open-top, fixtures only, kid-safe); SCIENCE LAB next to the INDOOR GREENHOUSE; MED BAY quarantine, locked (crew visible sleeping behind glass, only the intercom works; now implemented as crew quarters, see HANDOFF); GYM with exactly three interactive pieces (elastic resistance bands on wall anchors, compact cycle ergometer, folding rowing machine that folds flat against the wall, show both states); SLEEP POD in the comms room (the player's bed; sleeps until morning and refills action energy using existing sleep logic); SUIT RACK in the hallway to the airlock (the suit must be on the route to the exit). Correct collision, tap-to-walk routes around furniture, a clear prompt label per zone. Gym/suit/sleep-pod logic is a stub that opens a simple panel until Steps 6-7.

## Step 6: Mars day/night, suit/outside rules, Maven meter
1. Day and night: smooth tint from the sol hour (DONE in Visual Pass A: src/game/skytint.ts, daynight.ts). Outdoor lights ON at night with soft glow (done). Dust-storm days dim and orange-brown (done).
2. Suit rules: suit rack E to put on, E to take off; suit state in HUD; going out without the suit = pass out, fade, "You forgot your suit!" gentle message, reload last checkpoint (Step 2), one-time friendly hint. Suit on = outside allowed (subject to storm lock). Taking it off only indoors. Keep the suit-air resource.
3. MAVEN meter (game model): incoming radiation alert level Low / Elevated / High / Storm. Outside at High alert: warning flashes and sounds "Run inside!". Staying out through High drains Player Health fast; at zero health pass out and reload last checkpoint. Label "MAVEN ALERT (game model)" with a magnifier tooltip linking to the real NASA MAVEN mission page (verify URL). No live data. (Owner note in the pack: "NASA DONKI NOT MAVEN FOR ALL", i.e. the radiation/space-weather story should be DONKI-based; see docs/CHALLENGE.md.)
4. src/core: pure functions for alert level over time (fluctuating during storm sols, low and steady when safe), health drain, pass-out rule. Unit-tested.

## Step 7: HUD, meters popup, system modules
1. Top HUD exactly three meters: Base Energy, Player Health, Team Morale (icon + bar), plus the small action-energy bar, objective line, suit/Maven readout outside.
2. Meter icon opens a popup with ALL system meters: Water, Air, Solar power, Crew, Comms, Maven alert. Each row has a magnifier linking to a verified NASA source (Mars weather row links to a real NASA data portal, e.g. Perseverance MEDA / Curiosity REMS pages). Tooltip: "The game does not use live data; it references real readings."
3. HUB MODULES: Farming, O2, Water, Power, Crew, Comms; each shows status, what is wrong, and a repair/maintain action costing action energy. Reuse src/ui/panels.ts.
4. Base energy, health and morale as first-class state (teamMorale() exists in src/core/crewlife.ts); derive the HUD meters from state. Tests for derivations and module repairs.

## Step 8: Habitat care loop: crops, manual watering, solar panels, repairs
1. Dynamic crops: beds start with small visible seedlings/flowering plants and grow through distinct stages (add a flowering stage). Plant health is real state (water, light, power).
2. Watering: the automatic watering system is broken at the start. Water manually with a sprinkler (walk to each bed, E, costs energy) until repaired. Repair is a multi-step objective possible only after the storm.
3. Solar panels: dust builds up and cuts output. Cleaning needs a suit and energy. Covered by the dust storm and cannot be cleaned until the radiation storm passes. Base starts at 50% power.
4. "Plan B" faults: when power is low the automatic reserves shut down in favour of manual work. 2-3 data-driven fault events in src/story/events.ts, two choices each, both with real costs.
5. All checks (air, water, plants, comms, solar) count toward "CHECK ALL CORE SYSTEMS".
Tests: crop growth curve, water/plant health, panel efficiency vs dust, fault events using flags.

## Step 9: Gym and health loop [recommended: one machine only]
Player Health is kept up by exercising every sol. Missing a day lowers health; overtraining also lowers it; a sweet spot (e.g. 1-2 sessions) with a simple hint. Three machines with different short workouts and benefits (bands low cost mild; bike cardio medium; rower best, highest energy cost) and a kid-friendly fact on why astronauts exercise (verify against a NASA source, magnifier link). Workout is a short interactive mini-action (timed key presses / hold), skippable. Gentle morning message when health dropped. Health feeds how long the player can stay outside. Tests for the daily rule.

## Step 10: Crew intercom chats and backstories (content) [recommended: 2 chats each]
Intercom chat limited to TWO per sol across all crew; show remaining chats. A chat boosts Team Morale and friendship hearts; each unlocks a new piece of that person's story. Tone: tired, funny, honest (they are sick); use {name}. Writing rules: relatable, non-cliche, specific details (a smell, an object, an awkward moment), no inspirational-poster lines, plain language for 7-12, max about 3 short lines per message. 4 crew x 5 chats (owner wants 20) with two reply choices each that change the reply and give different small morale/friendship results. Keep existing facts (Reyes grew up in coastal Virginia, etc.). Some chats unlock a real-data discovery tied to the person's job, with a verified NASA link. Data in src/story/crew.ts. Tests: no unreachable chat, every choice has a reply, the two-per-sol cap works.

## Step 11: The storm arc (3 sols locked in)
Sol 1 (prep day): outside allowed with suit. Check all core systems, start manual watering, do what is possible on panels BEFORE the storm hits (storm arrival signalled by Maven rising and Reyes warning). Base power 50%.
Sols 2-4 locked in: airlock refuses with a clear message; Maven visibly high and fluctuating (deterministic from sol/hour so rewind cannot change it); Earth uplink is down, only static at the comms console (short static sound, scrambled fragments, one tiny clue per sol); electronics faults queue repairs for after the storm; player manages hub modules; daily loop: two crew chats, manual watering, gym, check modules, sleep in the pod.
After the storm: Maven reads low, airlock opens, objectives "CLEAN THE SOLAR PANELS" and "REPAIR THE WATERING SYSTEM", power recovers as panels are cleaned. Nobody dies; health at zero reloads the checkpoint. Episode ends when panels are cleaned and watering is repaired -> results (Step 13).
**Challenge note:** this is where "The Storm Call" (stow vs leave the panels, 10-second decision, Ask Earth with delayed reply) belongs. See HANDOFF Task 1.
Tests: storm schedule (3 sols, deterministic fluctuation), airlock lock rule, comms-static rule, post-storm objective chain.

## Step 12: Journal, NASA tooltips, Mars map [recommended cut or shrink]
Journal from the pause menu: first entry with 3-6 small optimised NASA images in public/ (verify usage guidelines, store credit + source URL in manifest, no hotlinking); player notes that save and delete; AUTO entries after every completed objective in first person, plain language, no dates or sol numbers, each with a magnifier to a verified NASA source recorded in the manifest. Mars map in the pause menu showing the real location (Hebrus Valles) from real NASA/USGS map data (e.g. MOLA colour-shaded relief), one optimised image with credit, marker from verified lat/long, labelled "game location based on real map data". Tests: notes persist; one auto entry per objective; every journal link maps to a manifest id.

## Step 13: Results, shipment countdown, episode replay
1. RESULTS after the mission: score from team morale, base energy, plant health (show player health too), 1-3 stars, 1-2 kid-friendly lines on what went well and what to try. Save best result per episode.
2. NEXT SHIPMENT FROM EARTH shown in the comms room / Control Module as a countdown in sols. The real trip is about 6 months; convert correctly to sols (1 sol is about 24h 39m) with the calculation in a code comment. Keep the Sustainability Score rule.
3. EPISODE REPLAY from the Episodes screen with the same character; best results kept. Ep2 "The Rover" stays "Coming soon".
4. One full Episode 1 run start to finish with no dead ends. Cut scope before shipping anything half-working.
Tests: scoring, shipment conversion, replay resets state but keeps the best result.

## Step 14: Final QA and release prep (QA only, no features)
Play Episode 1 twice (fast and thorough) at desktop and phone width with screenshots; test as a 9-year-old and as a NASA judge (every real-data item traces to the manifest, model output labelled, works offline, all external links open); verify name rule, save/resume/new-game, checkpoints, storm lock, suit rule, chat cap, gym sweet spot, journal, map, results; accessibility (keyboard only, reduced motion, mute, contrast); `npm run check`; README for judges; docs/QA_REPORT.md pass/fail per check. Do not deploy.

## Notes
- If an agent starts changing things outside its step, stop it and re-paste the Shared Header.
- Ep2 "The Rover" gets its own prompt pack after Ep1 passes Step 14.
