// Step 28b: OUTDOOR GROUND ART as pure data. groundOps() returns draw commands for one outdoor tile; world.ts replays them on a Phaser Graphics
// object (and tests / a preview script can replay them anywhere). Deterministic: a per-tile hash, never a shared random stream, so the art
// never changes when the map or other drawing changes. Original art: red and ochre regolith, pebbles, ripples, small dunes, craters, tyre tracks.
import { CRATERS, LANDMARKS, T, type Terrain } from './layout';

export type Op =
  | { k: 'rect'; x: number; y: number; w: number; h: number; c: number; a: number }
  | { k: 'ell'; x: number; y: number; w: number; h: number; c: number; a: number }
  | { k: 'line'; x1: number; y1: number; x2: number; y2: number; c: number; a: number; lw: number };

/** Deterministic 0..1 hash of a tile and a salt. */
export function hash(x: number, y: number, salt = 0): number {
  let h = Math.imul(x + 374761393, 668265263) ^ Math.imul(y + 1274126177, 2246822519) ^ Math.imul(salt + 97, 3266489917);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
/** Smooth low-frequency noise (value noise over 6-tile cells) so big patches drift between red and ochre. */
export function patch(x: number, y: number): number {
  const cs = 6, fx = x / cs, fy = y / cs, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const s = (t: number) => t * t * (3 - 2 * t), a = hash(x0, y0, 7), b = hash(x0 + 1, y0, 7), c = hash(x0, y0 + 1, 7), d = hash(x0 + 1, y0 + 1, 7);
  const top = a + (b - a) * s(tx), bot = c + (d - c) * s(tx);
  return top + (bot - top) * s(ty);
}
/** Regolith palette from dark rust to light ochre; `v` 0..1 picks the colour. */
export const REGOLITH = [0x8f3b22, 0x9f4527, 0xa94b2a, 0xb4532d, 0xbb5a33, 0xc4693c, 0xcc7a45, 0xd08a52];
export const regolithAt = (v: number): number => REGOLITH[Math.max(0, Math.min(REGOLITH.length - 1, Math.floor(v * REGOLITH.length)))];

/** Tyre tracks (tile coordinates of the centre line): from the airlock pad south, east to the truck bay, and north to the rover site. */
export const TRACKS: [number, number][][] = [
  [[15.5, 21], [15.5, 28.5], [34, 28.5], [34, 29.5]],
  [[34, 28.5], [34, 25]],
];
function onTrack(x: number, y: number): { horizontal: boolean } | null {
  for (const path of TRACKS) for (let i = 0; i + 1 < path.length; i++) {
    const [ax, ay] = path[i], [bx, by] = path[i + 1];
    const minX = Math.min(ax, bx), maxX = Math.max(ax, bx), minY = Math.min(ay, by), maxY = Math.max(ay, by);
    if (x + 0.5 >= minX && x + 0.5 <= maxX + 0.001 && y + 0.5 >= minY && y + 0.5 <= maxY + 0.001) return { horizontal: ay === by };
  }
  return null;
}
const craterAt = (x: number, y: number) => { for (const [cx, cy, r] of CRATERS) { const d = Math.hypot(x - cx, y - cy); if (d <= r + 0.5) return { cx, cy, r, d }; } return null; };

/** Draw commands for ONE outdoor tile at tile (x, y). Pixel coordinates are world pixels (tile * T). */
export function groundTileOps(x: number, y: number, terrain: Terrain, nearBase: boolean): Op[] {
  const ops: Op[] = []; const px = x * T, py = y * T;
  const r = (salt: number) => hash(x, y, salt);
  const rect = (dx: number, dy: number, w: number, h: number, c: number, a: number) => ops.push({ k: 'rect', x: px + dx, y: py + dy, w, h, c, a });
  const ell = (dx: number, dy: number, w: number, h: number, c: number, a: number) => ops.push({ k: 'ell', x: px + dx + w / 2, y: py + dy + h / 2, w, h, c, a }); // dx,dy = top-left of the ellipse box
  const line = (x1: number, y1: number, x2: number, y2: number, c: number, a: number, lw = 1) => ops.push({ k: 'line', x1: px + x1, y1: py + y1, x2: px + x2, y2: py + y2, c, a, lw });

  if (terrain === 'pad') { // the metal truck pad: plates, bolts, hazard corners
    rect(0, 0, T, T, 0x34476b, 1); rect(0, 0, T, 1, 0x5a74a0, 0.6); rect(0, T - 1, T, 1, 0x0a1220, 0.6);
    line(0.5, 0.5, 0.5, T - 0.5, 0x0a1220, 0.5); line(T - 0.5, 0.5, T - 0.5, T - 0.5, 0x0a1220, 0.5);
    for (const [bx, by] of [[3, 3], [T - 5, 3], [3, T - 5], [T - 5, T - 5]]) rect(bx, by, 2, 2, 0x8aa3c9, 0.7);
    if ((x + y) % 2 === 0) rect(0, 0, T, T, 0xffffff, 0.03);
    return ops;
  }
  // base colour: patchy red <-> ochre, a little darker near rock fields and crater floors
  let v = 0.25 + patch(x, y) * 0.55 + (r(1) - 0.5) * 0.18;
  if (terrain === 'rockfield') v -= 0.12;
  if (terrain === 'dune') v += 0.2;
  rect(0, 0, T, T, regolithAt(v), 1);
  rect(0, 0, T, T, 0x000000, 0.06 + r(2) * 0.06); // grain: each tile a hair different
  // fine speckles and pebbles
  const specks = 2 + Math.floor(r(3) * 4);
  for (let i = 0; i < specks; i++) { const sx = r(10 + i) * 28, sy = r(20 + i) * 28; if (r(30 + i) < 0.5) rect(sx, sy, 2, 1, 0x3a160c, 0.22); else rect(sx, sy, 2, 2, 0xffc79a, 0.16); }
  const pebbles = terrain === 'rockfield' ? 4 : terrain === 'open' ? (r(4) < 0.45 ? 1 + Math.floor(r(5) * 2) : 0) : 0;
  for (let i = 0; i < pebbles; i++) {
    const sx = 2 + r(40 + i) * 24, sy = 3 + r(50 + i) * 22, w = 3 + Math.floor(r(60 + i) * 4);
    ell(sx + 1, sy + 3, w + 2, 3, 0x000000, 0.28);        // soft shadow, falls south-east
    rect(sx, sy, w, w - 1, 0x6e2f1d, 1); rect(sx, sy, w, 1, 0xc9825a, 0.9); rect(sx + w - 1, sy, 1, w - 1, 0x4a2216, 0.8); // body, lit top, dark side
  }
  if (r(6) < 0.07) line(0, r(70) * T, T, r(71) * T, 0xffd0a8, 0.16);
  // small ripples (wind marks): pairs of light/dark arcs on open ground
  if (terrain === 'open' && r(8) < 0.1) { const rx = 4 + r(80) * 14, ry = 6 + r(81) * 16; ell(rx, ry, 18, 5, 0x6b2f1c, 0.2); ell(rx - 1, ry - 2, 16, 4, 0xe9a070, 0.22); }
  // dune ridge: a light windward face on top, a shadowed lee face below, a bright crest line
  if (terrain === 'dune') {
    rect(0, 2, T, 9, 0xe3a066, 0.35); line(0, 11, T, 10 + r(90) * 3, 0xffe2bd, 0.55, 1); rect(0, 12, T, 11, 0x5a2414, 0.22); rect(0, 23, T, 4, 0x000000, 0.12);
    for (let i = 0; i < 3; i++) line(2 + i * 9, 5 + i, 12 + i * 9, 7 + i, 0xffe2bd, 0.18);
  }
  // raised rim stones on the blocked north rim (the smooth bowl and rim shapes come from craterOps)
  const cr = craterAt(x, y);
  if (cr && terrain === 'rim' && y <= cr.cy) for (let i = 0; i < 2; i++) { const sx = 4 + r(100 + i) * 20, sy = 6 + r(110 + i) * 16; rect(sx + 1, sy + 3, 6, 2, 0x000000, 0.3); rect(sx, sy, 6, 4, 0x6e2f1d, 1); rect(sx, sy, 6, 1, 0xd08460, 0.8); }
  // tyre tracks: two parallel rows of tread marks near the base and out to the truck bay
  const tr = onTrack(x, y);
  if (tr && (terrain === 'open' || terrain === 'dune')) {
    for (const o of [10, 22]) {
      if (tr.horizontal) for (let k = 0; k < 4; k++) { rect(k * 8, o, 5, 2, 0x3a160c, 0.38); rect(k * 8, o - 1, 5, 1, 0xe9a070, 0.18); }
      else for (let k = 0; k < 4; k++) { rect(o, k * 8, 2, 5, 0x3a160c, 0.38); rect(o - 1, k * 8, 1, 5, 0xe9a070, 0.18); }
    }
  }
  // near the base the dust is trodden flat: a slightly lighter, smoother patch
  if (nearBase) rect(0, 0, T, T, 0xffc79a, 0.04);
  return ops;
}

/** Smooth crater shapes (drawn over the tiles, so no square edges): a light raised rim, a dark bowl, shadow under the far rim, light on the near inner wall. */
export function craterOps(cx: number, cy: number, r: number): Op[] {
  const X = (cx + 0.5) * T, Y = (cy + 0.5) * T, R = r * T;
  return [
    { k: 'ell', x: X + 3, y: Y + 5, w: R * 2.25, h: R * 1.7, c: 0x000000, a: 0.18 },     // soft shadow outside the rim
    { k: 'ell', x: X, y: Y, w: R * 2.2, h: R * 1.65, c: 0xd9885a, a: 0.55 },             // raised rim, lit
    { k: 'ell', x: X, y: Y + 3, w: R * 1.8, h: R * 1.3, c: 0x7a3320, a: 1 },             // inner wall
    { k: 'ell', x: X, y: Y + 6, w: R * 1.55, h: R * 1.08, c: 0x4a1d10, a: 0.9 },         // bowl floor, dark
    { k: 'ell', x: X, y: Y + 9, w: R * 1.2, h: R * 0.72, c: 0x6e2f1d, a: 0.7 },          // floor, a little lighter in the middle
    { k: 'ell', x: X, y: Y - R * 0.5, w: R * 1.5, h: R * 0.32, c: 0x000000, a: 0.25 },   // shadow under the far (north) rim
    { k: 'ell', x: X, y: Y + R * 0.6, w: R * 1.3, h: R * 0.22, c: 0xf0a878, a: 0.25 },   // sunlit near inner wall
  ];
}
/** Soft ground shadow for a rock (drawn under it, falling south-east). */
export function rockShadowOps(rx: number, ry: number, w: number): Op[] {
  return [{ k: 'ell', x: rx * T + (w * T) / 2 + 5, y: ry * T + T - 4, w: w * T - 2, h: 12, c: 0x000000, a: 0.3 }];
}

/** Dust drift: slow translucent puffs moving east. Pure positions so the motion can be tested. Returns pixel centre and alpha. */
export const DUST_PUFFS = 16;
export function dustPuff(i: number, tSec: number, mapW: number, mapH: number): { x: number; y: number; w: number; h: number; a: number } {
  const speed = 4 + hash(i, 0, 201) * 5;                       // px per second: very slow
  const span = mapW * T + 200;
  const x = ((hash(i, 0, 202) * span + tSec * speed) % span) - 100;
  const y = (2 + hash(i, 0, 203) * (mapH - 4)) * T + Math.sin(tSec * 0.1 + i) * 6;
  return { x, y, w: 120 + hash(i, 0, 204) * 160, h: 26 + hash(i, 0, 205) * 24, a: 0.035 + hash(i, 0, 206) * 0.03 };
}
export const isLandmarkPad = (x: number, y: number) => LANDMARKS.some(l => !l.existing && x >= l.x0 && x <= l.x1 && y >= l.y0 && y <= l.y1);
