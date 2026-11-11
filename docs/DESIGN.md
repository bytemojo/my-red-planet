# Design decisions (locked unless the owner changes them)

## Owner decisions
- Rewind to any earlier Sol morning (not capped at 7). Storage cap `MAX_SNAPSHOTS` = 60 Sols; raise it if saves stay small.
- Every action costs energy; sleeping refills it (80 if you stay up past 22:00).
- Mastery test: Sustainability Score, i.e. Sols without an Earth shipment. Goal: 10.
- Cave = four verbs (explore, excavate, pressurize, shield), 3 levels each. Total 8 levels, at least 1 of each, opens a huge cavern with water. Then endless play.
- Suit blackout: towed in, -30 energy, -8 power, +3 hours lost.
- Science facts only as earned discoveries/journal entries.
- Stardew-style art. Placeholders now, real art later.

## Merged from the ChatGPT brief
Data honesty rules, manifest, "check don't assume", kid-safe retention, must-have vs defer lists, offline-first, never copy Stardew assets, caves are candidates, small REAL DATA badge.

## Stages (6, trimmed for a one-week build)
1 First Days (harvest a crop) → 2 The Greenhouse (build annex) → 3 Power and Infrastructure (solar 2 + recycler; quarantine ends) → 4 Surface Exploration (rover bay + 2 trips) → 5 The Cave (four verbs) → 6 A Sustainable Colony (10 Sols no shipment) → sandbox.

## Scripted vs open
- **Scripted** (`beats.ts`): intro, Aiko's seeds, David's panels, Earth call, quarantine over, rover ready, cave found, cavern opened, campaign complete.
- **Open** (`events.ts`): solar flare (real DONKI flares scheduled onto Sols), global dust storm (2018 inspiration), dust front, cold snap, strong wind, panel fault, crew requests.
- **Memory:** flags written by choices (`risky`, `knows_cleaning`, `aiko_help`, `reported`) feed later weights and beats. Extend this. It is what makes the world feel like it reacts to the player.

## Communication delay
Currently modelled as: Earth shipments take a Sol to land, the "Ask Earth" choice answers late, and the Earth-call beat teaches the 3-22 minute delay. A real delayed-reply mechanic (messages that arrive N Sols later, driven by Earth-Mars distance) is on the roadmap.

## Balance (simplified units, tune in `core/constants.ts`)
Dim lights + balanced air/water is roughly neutral. Bright lights or dust push power negative. Food only comes from harvests. Tests in `tests/sim.test.ts` pin the expected behaviour: an unattended colony starves in ~5 Sols; a player who plants and waters daily survives 12 Sols.
