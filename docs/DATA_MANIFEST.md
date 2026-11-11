# Data manifest policy

The machine-readable manifest is `src/data/manifest.json`. Required fields per dataset: id, name, source, url, instrument, dateRange, location, units, transformation, limitations, kind (`observation` | `model` | `dev-fallback`), verified.

## Current state (be honest in the submission)
| Dataset | Status |
|---|---|
| DONKI flares X8.7 (2024-05-14) and X9.0 (2024-10-03) | Real events, **not yet verified against DONKI**. Class/date entered from memory. Verify, fill the exact URL, then set `verified: true`. |
| 2018 global dust storm | Real, used as narrative inspiration. Needs a specific NASA article URL. |
| Climate table (`climate.json`) | **DEV FALLBACK. Hand-written, not NASA data.** Must be replaced with a documented product (NASA Mars GCM, or MEDA/REMS observations) before the NASA-relevance claim is made. |

## Rules
- Do not assume a dataset exists in the format you need. Verify access, coverage, licence, and write the processing steps here.
- Rover data (MEDA/REMS/InSight) comes from their landing sites, not Hellas Planitia. Say so in `location`/`limitations`.
- DONKI does not measure radiation at the outpost. The multiplier is a game model.
- Keep model output and observations separate (`kind`). Real-data event cards show the REAL DATA badge; dev fallback events show GAME.
- Preprocess into JSON under `src/data/`. No runtime API dependency.
- A test (`tests/sim.test.ts`) fails if a real-data event cites an id that is not in the manifest.
