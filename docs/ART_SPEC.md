# Art spec: Stardew-style pixel art

## Rules
- Tiles 16x16. Characters 16x32 (feet at bottom centre). View: 3/4 top-down. Rendered at integer zoom, `pixelArt: true`.
- Outlined sprites (1px dark outline), soft 2-3 step shading, readable silhouettes. Warm, cozy colours for the colony against the harsh red landscape.
- Locked palette (extend only with owner approval): sand #C97A52, sand shadow #BA6946, dust #DE9664, rock #784437, rock shadow #5C322C, floor #D6C4A8, wall #586076, glass #96D2E1, soil #603C2C, leaf green #8CCD64, panel blue #243C82, skin #F0C8A0, outline #1E181E.
- Never copy Stardew Valley sprites or layouts. Original art only. Check licences for any asset pack (attribution, commercial use) and record them in `docs/ASSET_LICENSES.md`.

## Contract
The game loads ONE atlas: `public/assets/atlas.png` + `atlas.json` (Phaser hash format). Every frame name in `docs/frames.generated.txt` must exist, same size. Replace the art, keep the names. Regenerate placeholders with `npm run assets` (this overwrites the atlas, so do not run it after real art is in).

## Frame names
- Tiles: `tile_ground_a|b|dust`, `tile_floor`, `tile_wall`, `tile_glass`, `tile_door`, `tile_ridge`, `tile_soil`, `tile_soil_wet`
- Crops (4 growth stages 0-3): `crop_{lettuce|tomato|bean|potato}_{0-3}`
- Objects 16x16: `obj_console`, `obj_bed`, `obj_intercom`, `obj_panel`, `obj_cave`; 32x16: `obj_rover`
- Buildings: `bld_solar_2` (32x16), `bld_recycler`, `bld_shelter` (16x16), `bld_rover_bay` (32x16)
- Characters (16x32): `char_{player|reyes|aiko|david|sofia}_{down|up|left|right}_{0|1}` (2-frame walk)

## Wanted next
Sunrise/sunset tint is a rectangle overlay today. Interior props, cave tileset, sick-bay window, crop growth sparkle, dust-storm particles, UI frame art (wood/cream panels).
