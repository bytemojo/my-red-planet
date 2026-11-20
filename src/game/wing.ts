// The east wing (owner's prompt pack, Step 5): gym (north), science lab and bathroom (south),
// reached through the corridor door at x=29. Drawn in the same 2-pixel art grid as the crew quarters.
// world.ts builds the walls and applies WING_BLOCKS; this file draws the furniture.
import Phaser from 'phaser';
import { prefersReducedMotion } from './effects';

const T = 32;
// Furniture footprints (collision) live in layout.ts so tests can import them without Phaser.
export { WING_BLOCKS } from './layout';

const r2 = (g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, c: number, a = 1) => { g.fillStyle(c, a); g.fillRect(Math.round(x), Math.round(y), w, h); };
const label = (scene: Phaser.Scene, txt: string, x: number, y: number, color = '#8ceaff', size = 10) =>
  scene.add.text(x, y, txt, { fontFamily: 'Rajdhani, sans-serif', fontSize: size + 'px', fontStyle: '700', color, stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(3).setAlpha(0.9).setResolution(2);

/** Step 29a: the science lab. Metal, glass and plastic only (no wood, cloth or paper). Footprints are unchanged (WING_BLOCKS): west bench x30-31, east bench x33-34 (tile 32 is the doorway), sample rack on the south-west block. */
export function drawLab(scene: Phaser.Scene) {
  const lab = scene.add.graphics().setDepth(14 * T), by = 13 * T, ly = by + 6; // ly = the line the things on the bench top stand on
  // two benches: pale resin top with highlight and edge shade, steel front panel with vents, feet
  for (const x0 of [30 * T + 2, 33 * T + 2]) {
    r2(lab, x0, by - 10, 2 * T - 4, 24, 0xdfe6f2); r2(lab, x0, by - 10, 2 * T - 4, 2, 0xffffff); r2(lab, x0, by + 12, 2 * T - 4, 2, 0xaab6cc);
    r2(lab, x0, by + 14, 2 * T - 4, 16, 0x8d99b3); r2(lab, x0, by + 14, 2 * T - 4, 2, 0x6b7894);
    for (let i = 0; i < 4; i++) { r2(lab, x0 + 5 + i * 14, by + 19, 8, 1, 0x5d6b88); r2(lab, x0 + 5 + i * 14, by + 22, 8, 1, 0x5d6b88); }
    r2(lab, x0 + 2, by + 28, 4, 2, 0x4a5672); r2(lab, x0 + 2 * T - 10, by + 28, 4, 2, 0x4a5672);
  }
  // pixel laptop with a glowing screen (west bench, left)
  { const lx = 30 * T + 4;
    r2(lab, lx, ly - 3, 24, 4, 0x2a3550); r2(lab, lx + 1, ly - 3, 22, 1, 0x4a5a80); for (let k = 0; k < 5; k++) r2(lab, lx + 3 + k * 4, ly - 2, 3, 1, 0x7f8db0); r2(lab, lx + 9, ly - 4, 6, 1, 0x6b7894);
    r2(lab, lx + 2, ly - 23, 20, 19, 0x1a2440); r2(lab, lx + 4, ly - 21, 16, 14, 0x0b3550);
    r2(lab, lx + 5, ly - 19, 9, 1, 0x7cf3ff); r2(lab, lx + 5, ly - 17, 12, 1, 0x7cf3ff); r2(lab, lx + 5, ly - 15, 7, 1, 0x9dffb0);
    [3, 6, 4, 8, 5].forEach((h, i) => r2(lab, lx + 6 + i * 3, ly - 8 - h, 2, h, i % 2 ? 0x5ad1ff : 0x9dffb0)); r2(lab, lx + 4, ly - 8, 16, 1, 0x2a8fb0);
    const glow = scene.add.graphics().setDepth(14 * T + 1).setBlendMode(Phaser.BlendModes.ADD);
    glow.fillStyle(0x1fd0ff, 0.2); glow.fillRect(lx + 4, ly - 21, 16, 14); glow.fillStyle(0x1fd0ff, 0.09); glow.fillRect(lx - 3, ly - 25, 30, 22); glow.fillRect(lx - 4, ly - 3, 32, 8); // screen + soft light on the bench
    if (!prefersReducedMotion()) scene.tweens.add({ targets: glow, alpha: { from: 0.55, to: 1 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
  // microscope on the bench (west bench, right): base, arm, tube + eyepiece, objective turret, stage with a slide, focus knob, status light
  { const mx = 31 * T + 4;
    r2(lab, mx, ly - 4, 20, 4, 0x5d6b88); r2(lab, mx, ly - 4, 20, 1, 0x8d99b3); r2(lab, mx + 17, ly - 3, 2, 1, 0x4dffb0);
    r2(lab, mx + 13, ly - 27, 5, 23, 0x31405e); r2(lab, mx + 13, ly - 27, 1, 23, 0x4a5a80); r2(lab, mx + 5, ly - 29, 13, 5, 0x31405e);
    r2(lab, mx + 5, ly - 31, 5, 9, 0x3a4a6e); r2(lab, mx + 5, ly - 31, 1, 9, 0x5d6b88); r2(lab, mx + 4, ly - 36, 7, 3, 0x111a33); r2(lab, mx + 5, ly - 38, 5, 2, 0x2a3550);
    r2(lab, mx + 4, ly - 22, 8, 3, 0x8d99b3); r2(lab, mx + 6, ly - 19, 4, 4, 0xc9d5ea); r2(lab, mx + 7, ly - 16, 2, 1, 0x7cf3ff);
    r2(lab, mx + 1, ly - 12, 14, 2, 0x8d99b3); r2(lab, mx + 3, ly - 14, 8, 2, 0x9fd8ff, 0.75);
    lab.fillStyle(0x6b7894, 1); lab.fillCircle(mx + 16, ly - 10, 3.2); lab.fillStyle(0xc9d5ea, 1); lab.fillCircle(mx + 16, ly - 10, 1.8); }
  // glovebox (east bench, left): clear panels, steel frame, glare, two glove ports
  { const gb = 33 * T + 4;
    r2(lab, gb, by - 14, 30, 24, 0x9fd8ff, 0.3); r2(lab, gb, by - 14, 30, 2, 0xdfe6f2); r2(lab, gb, by - 14, 2, 24, 0xc9d5ea); r2(lab, gb + 28, by - 14, 2, 24, 0xc9d5ea); r2(lab, gb, by + 8, 30, 2, 0x8d99b3);
    r2(lab, gb + 5, by - 10, 2, 14, 0xffffff, 0.5); r2(lab, gb + 8, by - 10, 1, 6, 0xffffff, 0.35);
    for (const gx of [gb + 9, gb + 21]) { lab.fillStyle(0x4a5a80, 1); lab.fillCircle(gx, by + 1, 6); lab.fillStyle(0x0a1a33, 1); lab.fillCircle(gx, by + 1, 4.5); } }
  // test tubes in a metal rack (east bench, right): glass, cyan / green / amber liquids, coloured caps
  { const tx = 34 * T + 4, liquid = [0x5ad1ff, 0x66d17a, 0xffb347, 0x5ad1ff, 0x66d17a], cap = [0xe0575b, 0xffffff, 0x5ad1ff, 0xffc94a, 0xe0575b];
    r2(lab, tx, ly - 2, 22, 3, 0x6b7894); r2(lab, tx, ly - 2, 22, 1, 0x8d99b3); r2(lab, tx, ly - 11, 22, 2, 0x8d99b3); r2(lab, tx, ly - 11, 1, 10, 0x8d99b3); r2(lab, tx + 21, ly - 11, 1, 10, 0x8d99b3);
    liquid.forEach((c, i) => { const x = tx + 1 + i * 4, lvl = 5 + (i * 3) % 6; r2(lab, x, ly - 14, 3, 12, 0xdff4ff, 0.35); r2(lab, x, ly - 2 - lvl, 3, lvl, c, 0.9); r2(lab, x, ly - 15, 3, 2, cap[i]); r2(lab, x, ly - 13, 1, 9, 0xffffff, 0.55); }); }
  // cyan wall display above the glovebox: little waveform, readout label, status dots
  { const wx = 33 * T + 3, wy = 12 * T + 2;
    r2(lab, wx, wy, 58, 16, 0x1a2440); r2(lab, wx + 2, wy + 2, 54, 12, 0x0b3550); r2(lab, wx + 2, wy + 2, 54, 1, 0x2a8fb0);
    [5, 7, 4, 8, 6, 3, 7, 5, 8, 4, 6].forEach((h, i) => r2(lab, wx + 4 + i * 3, wy + 13 - h, 2, h, 0x5ad1ff)); r2(lab, wx + 40, wy + 4, 3, 3, 0x4dffb0); r2(lab, wx + 45, wy + 4, 3, 3, 0xffc94a); r2(lab, wx + 50, wy + 4, 3, 3, 0x5ad1ff);
    label(scene, 'SAMPLES', wx + 46, wy + 10, '#8ceaff', 5).setDepth(14 * T + 2);
    const g = scene.add.graphics().setDepth(14 * T + 1).setBlendMode(Phaser.BlendModes.ADD); g.fillStyle(0x1fd0ff, 0.14); g.fillRect(wx + 2, wy + 2, 54, 12); g.fillRect(wx - 2, wy - 2, 62, 22); }
  // hazard sign on the west wall (amber triangle with a "!", no flame) above the badge reader
  { const hx = 30 * T + 10, hy = 14 * T + 1;
    lab.fillStyle(0x1a1a1a, 1); lab.fillTriangle(hx, hy - 1, hx - 9, hy + 14, hx + 9, hy + 14); lab.fillStyle(0xffb020, 1); lab.fillTriangle(hx, hy + 1, hx - 7, hy + 12, hx + 7, hy + 12);
    r2(lab, hx - 1, hy + 4, 2, 4, 0x1a1a1a); r2(lab, hx - 1, hy + 9, 2, 2, 0x1a1a1a); }
  // metal sample rack in the south-west corner: steel uprights and shelves, clear plastic sample boxes with coloured tags
  const shelf = scene.add.graphics().setDepth(18 * T), rx = 30 * T + 2, rt = 17 * T - 22;
  r2(shelf, rx, rt, 60, 40, 0x31405e, 0.35); // back panel shade
  [0, 14, 28, 38].forEach(o => { r2(shelf, rx, rt + o, 60, 2, 0x8d99b3); r2(shelf, rx, rt + o + 2, 60, 1, 0x5d6b88); }); r2(shelf, rx, rt, 3, 40, 0x8d99b3); r2(shelf, rx + 57, rt, 3, 40, 0x8d99b3);
  const tags = [0xe0575b, 0x66d17a, 0x5ad1ff, 0xffc94a, 0xc08cff, 0x66d17a, 0xe0575b, 0x5ad1ff, 0xffc94a];
  [[1, 10], [15, 10], [29, 6]].forEach(([o, h], row) => { for (let i = 0; i < 3; i++) { const bx = rx + 4 + i * 18, byy = rt + o + 2, tag = tags[row * 3 + i];
    r2(shelf, bx, byy, 15, h, 0xcfeaff, 0.5); r2(shelf, bx, byy, 15, 3, 0xffffff, 0.85); r2(shelf, bx, byy + h - 1, 15, 1, 0x8d99b3); r2(shelf, bx, byy, 1, h, 0xffffff, 0.6);
    if (h > 6) { r2(shelf, bx + 3, byy + 6, 4, 2, [0xb0643c, 0x8d99b3, 0xd9b38a][(row + i) % 3]); r2(shelf, bx + 8, byy + 7, 3, 2, 0x6b7894); } r2(shelf, bx + 5, byy + 3, 6, 2, tag); } });
  const badge = scene.add.graphics().setDepth(16 * T);                                     // radiation badge reader on the west wall (unchanged)
  r2(badge, 30 * T + 2, 15 * T - 6, 14, 20, 0x24365a); r2(badge, 30 * T + 4, 15 * T - 2, 10, 6, 0x4dffb0);
  label(scene, 'SCIENCE LAB', 32.5 * T, 15.6 * T, '#bfe8ff', 7).setData('room', 'lab');
}

export interface Wing { setRower(open: boolean): void; setBands(pulling: boolean): void; spin(on: boolean): void }

/** Lab doorway tile (x, y). world.ts leaves it open in the y=12 wall. */
export const LAB_DOOR: [number, number] = [32, 12];

export function buildWing(scene: Phaser.Scene, getPlayer?: () => { x: number; y: number } | undefined): Wing {
  // ---------- GYM ----------
  const mats = scene.add.graphics().setDepth(1);
  r2(mats, 32.6 * T, 4.9 * T, 2.8 * T, 1.5 * T, 0x2a3f6e, 0.85); r2(mats, 35.6 * T, 3.9 * T, 3.2 * T, 2.4 * T, 0x2a3f6e, 0.85);
  r2(mats, 30.1 * T, 3.9 * T, 2.2 * T, 2.2 * T, 0x3a2f5e, 0.85);
  // poster on the north wall
  const poster = scene.add.graphics().setDepth(3 * T + 1);
  r2(poster, 34.2 * T, 3 * T - 26, 26, 18, 0xe9e1cf); r2(poster, 34.2 * T + 2, 3 * T - 24, 22, 4, 0xff6b4a);
  label(scene, '2 HRS/DAY', 34.2 * T + 13, 3 * T - 13, '#1c2c4a', 7).setDepth(3 * T + 2);
  // ---- Step 13d: more gym detail. Rubber mats, wall mirror, cyan wall display; all metal / plastic / rubber, no wood or fabric. ----
  const matFx = scene.add.graphics().setDepth(1);
  for (const [mx, my, mw, mh] of [[32.6, 4.9, 2.8, 1.5], [35.6, 3.9, 3.2, 2.4], [30.1, 3.9, 2.2, 2.2]] as const) {
    matFx.lineStyle(1, 0x39d9ff, 0.35); matFx.strokeRect(mx * T + 1.5, my * T + 1.5, mw * T - 3, mh * T - 3);        // bright edge
    for (let k = 8; k < mw * T - 4; k += 8) r2(matFx, mx * T + k, my * T + 4, 1, mh * T - 8, 0xffffff, 0.07);        // rubber ridges
    for (const [cx, cy] of [[mx * T + 3, my * T + 3], [(mx + mw) * T - 6, my * T + 3], [mx * T + 3, (my + mh) * T - 6], [(mx + mw) * T - 6, (my + mh) * T - 6]]) r2(matFx, cx, cy, 3, 3, 0x8d99b3, 0.8); // corner clips
  }
  const wall = scene.add.graphics().setDepth(3 * T + 1);
  { // wall mirror (between the bands and the poster)
    const mx = 32.15 * T, my = 3 * T - 28;
    r2(wall, mx, my, 54, 24, 0x8d99b3); r2(wall, mx + 2, my + 2, 50, 20, 0x2a4a6e); r2(wall, mx + 2, my + 2, 50, 20, 0x9fd8ff, 0.3);
    wall.lineStyle(2, 0xffffff, 0.45); wall.lineBetween(mx + 8, my + 21, mx + 20, my + 3); wall.lineBetween(mx + 24, my + 21, mx + 30, my + 13); r2(wall, mx + 2, my + 21, 50, 1, 0x5b6b8c);
  }
  const screen = scene.add.graphics().setDepth(3 * T + 1); // cyan wall display: heart-rate trace + 2 HRS/DAY bar
  const drawScreen = (t: number) => {
    screen.clear(); const sx = 35.15 * T, sy = 3 * T - 26;
    r2(screen, sx, sy, 30, 20, 0x31405e); r2(screen, sx + 2, sy + 2, 26, 16, 0x07142a);
    r2(screen, sx + 3, sy + 3, 14, 2, 0x39d9ff, 0.9); r2(screen, sx + 3, sy + 14, 22, 2, 0x143a56); r2(screen, sx + 3, sy + 14, 15, 2, 0x4dffb0);
    screen.lineStyle(1, 0x8ceaff, 0.55 + 0.35 * Math.sin(t / 400)); screen.beginPath();
    for (let k = 0; k <= 22; k++) { const y = sy + 9 + (k % 8 === 4 ? -3 : k % 8 === 5 ? 3 : 0); k ? screen.lineTo(sx + 3 + k, y) : screen.moveTo(sx + 3, y); } screen.strokePath();
  };
  drawScreen(0);
  // resistance bands: a metal rail on the wall, two anchor plates, spare loops on pegs
  const anchors = scene.add.graphics().setDepth(3 * T + 1);
  r2(anchors, 30.05 * T, 3 * T - 18, 62, 5, 0x8d99b3); r2(anchors, 30.05 * T, 3 * T - 18, 62, 1, 0xe3ecff); r2(anchors, 30.05 * T, 3 * T - 14, 62, 1, 0x4a5876);
  for (const ax of [30.55, 31.45]) { r2(anchors, ax * T - 5, 3 * T - 14, 10, 8, 0x8d99b3); r2(anchors, ax * T - 2, 3 * T - 11, 4, 2, 0x2a3550); r2(anchors, ax * T - 4, 3 * T - 13, 1, 1, 0xe3ecff); r2(anchors, ax * T + 3, 3 * T - 13, 1, 1, 0xe3ecff); }
  for (const [px, col] of [[30.2, 0xff6b6b], [31.85, 0x6bb6ff]] as const) { anchors.lineStyle(2, col, 1); anchors.strokeCircle(px * T, 3 * T - 6, 4); r2(anchors, px * T - 1, 3 * T - 12, 2, 4, 0x4a5876); } // spare loops on pegs
  const bands = scene.add.graphics().setDepth(4 * T);
  const drawBands = (pull: boolean) => {
    bands.clear();
    [[30.55, 0x66d17a, 0xb6f5c0], [31.45, 0xffd84a, 0xfff0a0]].forEach(([ax, col, hi]) => {
      const x0 = (ax as number) * T, len = pull ? 50 : 30, dx = pull ? (ax === 30.55 ? -6 : 6) : 0;
      bands.lineStyle(3, col as number, 1); bands.lineBetween(x0, 3 * T - 6, x0 + dx, 3 * T - 6 + len);
      bands.lineStyle(1, hi as number, 0.9); bands.lineBetween(x0 - 1, 3 * T - 6, x0 + dx - 1, 3 * T - 6 + len);
      r2(bands, x0 - 5 + dx, 3 * T - 6 + len, 10, 4, 0x31405e); bands.lineStyle(1, 0xaebbd3, 1); bands.strokeRect(x0 - 3 + dx, 3 * T - 5 + len, 6, 2); // grip + D-ring
      r2(bands, x0 - 5 + dx, 3 * T - 6 + len, 10, 1, 0x5b6b8c); for (let k = 0; k < 5; k++) r2(bands, x0 - 4 + dx + k * 2, 3 * T - 4 + len, 1, 2, 0x141c30); r2(bands, x0 - 2 + dx, 3 * T - 9 + len, 4, 3, 0xaebbd3); r2(bands, x0 - 2 + dx, 3 * T - 9 + len, 4, 1, 0xffffff, 0.7); // Step 26e: ridged rubber grip, highlight, crimp ring
    });
  };
  drawBands(false);
  // cycle ergometer: base with feet, post, plastic seat, cranks and pedals, flywheel, waist strap, cyan display
  const bike = scene.add.graphics().setDepth(5 * T);
  const bx = 33.1 * T;
  r2(bike, bx, 5 * T - 8, 58, 8, 0x5d6b88); r2(bike, bx, 5 * T - 8, 58, 2, 0xaebbd3);           // base
  r2(bike, bx + 2, 5 * T - 1, 10, 3, 0x2a3550); r2(bike, bx + 46, 5 * T - 1, 10, 3, 0x2a3550);    // rubber feet
  r2(bike, bx + 28, 4 * T + 6, 6, 18, 0x8d99b3); r2(bike, bx + 28, 4 * T + 6, 1, 18, 0xe3ecff, 0.6); // seat post
  r2(bike, bx + 22, 4 * T + 3, 20, 5, 0x31405e); r2(bike, bx + 22, 4 * T + 3, 20, 1, 0x5b6b8c);     // plastic seat
  r2(bike, 34.6 * T - 4, 4 * T - 4, 6, 26, 0x8d99b3); r2(bike, 34.6 * T - 12, 4 * T - 8, 22, 5, 0x31405e); // handlebar
  r2(bike, bx + 4, 4 * T + 10, 26, 3, 0xffb340);                                                      // waist strap
  r2(bike, 34.6 * T - 14, 4 * T - 22, 26, 13, 0x31405e); r2(bike, 34.6 * T - 12, 4 * T - 20, 22, 9, 0x07142a); // display housing
  const bikeDisp = scene.add.graphics().setDepth(5 * T + 2);
  const wheel = scene.add.graphics().setDepth(5 * T + 1); let spinT = 0, spinning = false;
  const drawBikeDisp = (on: boolean, t: number) => {
    bikeDisp.clear(); const x = 34.6 * T - 12, y = 4 * T - 20;
    if (!on) { r2(bikeDisp, x + 2, y + 3, 8, 2, 0x143a56); return; }
    r2(bikeDisp, x + 2, y + 2, 18, 2, 0x39d9ff); for (let k = 0; k < 5; k++) r2(bikeDisp, x + 2 + k * 4, y + 6 - ((Math.sin(t / 120 + k) + 1) * 1.5), 3, 2 + (Math.sin(t / 120 + k) + 1) * 1.5, 0x4dffb0);
  };
  const drawWheel = (a: number) => {
    wheel.clear(); const cx = 33.6 * T + 6, cy = 4 * T + 14;
    wheel.fillStyle(0x2a3550, 1); wheel.fillCircle(cx, cy, 11); wheel.lineStyle(2, 0x39d9ff, spinning ? 1 : 0.8); wheel.strokeCircle(cx, cy, 11); wheel.lineStyle(1, 0x5b6b8c, 1); wheel.strokeCircle(cx, cy, 6);
    for (let k = 0; k < 4; k++) wheel.lineBetween(cx, cy, cx + Math.cos(a + k * Math.PI / 2) * 10, cy + Math.sin(a + k * Math.PI / 2) * 10);
    r2(wheel, cx + Math.cos(a) * 9 - 3, cy + Math.sin(a) * 9 - 3, 6, 6, 0xffb340); r2(wheel, cx - 2, cy - 2, 4, 4, 0x8d99b3);
    const px = bx + 31, py = 5 * T - 12; // crank and pedals turn with the wheel
    wheel.lineStyle(2, 0x8d99b3, 1); wheel.lineBetween(px - Math.cos(a) * 7, py - Math.sin(a) * 4, px + Math.cos(a) * 7, py + Math.sin(a) * 4);
    r2(wheel, px + Math.cos(a) * 7 - 3, py + Math.sin(a) * 4 - 1, 6, 2, 0x31405e); r2(wheel, px - Math.cos(a) * 7 - 3, py - Math.sin(a) * 4 - 1, 6, 2, 0x31405e);
  };
  drawWheel(0); drawBikeDisp(false, 0);
  // rowing machine: folds flat against the wall when not in use; unfolded it has rail, sliding seat, handle + chain, flywheel, footplates and a display
  const rower = scene.add.graphics();
  const rowerDyn = scene.add.graphics().setDepth(5 * T + 5); let rowing = false, rowT = 0;
  const drawRowerDyn = () => {
    rowerDyn.clear(); if (!rowing) return;
    const fx = 38.6 * T, fy = 4.9 * T + 2, k = (Math.sin(rowT) + 1) / 2, seatX = 36.1 * T + k * 1.5 * T, hx = seatX + 14 + (1 - k) * 6;
    r2(rowerDyn, seatX, 4.9 * T - 5, 16, 6, 0x31405e); r2(rowerDyn, seatX, 4.9 * T - 5, 16, 1, 0x5b6b8c); r2(rowerDyn, seatX + 2, 4.9 * T + 1, 3, 3, 0x8d99b3); r2(rowerDyn, seatX + 11, 4.9 * T + 1, 3, 3, 0x8d99b3); // seat + rollers
    rowerDyn.lineStyle(1, 0xaebbd3, 1); rowerDyn.lineBetween(fx - 6, fy - 4, hx, 4.9 * T - 3); r2(rowerDyn, hx - 1, 4.9 * T - 6, 3, 8, 0xffb340);     // chain + handle
    rowerDyn.lineStyle(1, 0x8ceaff, 0.9); for (let s = 0; s < 4; s++) rowerDyn.lineBetween(fx, fy, fx + Math.cos(rowT * 3 + s * Math.PI / 2) * 9, fy + Math.sin(rowT * 3 + s * Math.PI / 2) * 9); // spinning spokes
    r2(rowerDyn, fx - 3, fy - 24, 20, 12, 0x31405e); r2(rowerDyn, fx - 1, fy - 22, 16, 8, 0x07142a);                                                    // display on a stem
    r2(rowerDyn, fx + 1, fy - 20, 12, 2, 0x39d9ff); for (let s = 0; s < 4; s++) r2(rowerDyn, fx + 1 + s * 3, fy - 16, 2, 2 - Math.sin(rowT * 2 + s), 0x4dffb0);
  };
  scene.events.on('update', (t: number, dt: number) => {
    if (spinning) { spinT += dt / 90; drawWheel(spinT); drawBikeDisp(true, t); }
    if (rowing) { rowT += dt / 420; drawRowerDyn(); }
    drawScreen(t);
  });
  // ---- Step 26e: second detail pass (static layers over the first pass). Metal, plastic and rubber only: shading, highlights, labels, grips, cables. ----
  { // rubber mats: diamond tread dots, bevelled edge (light top-left, shadow bottom-right), printed centre stripe
    const mt = scene.add.graphics().setDepth(1.5);
    for (const [mx, my, mw, mh] of [[32.6, 4.9, 2.8, 1.5], [35.6, 3.9, 3.2, 2.4], [30.1, 3.9, 2.2, 2.2]] as const) {
      const x0 = mx * T, y0 = my * T, w = mw * T, h = mh * T;
      for (let j = 0, ry = 7; ry < h - 6; ry += 6, j++) for (let rx = 7 + (j % 2) * 3; rx < w - 6; rx += 6) r2(mt, x0 + rx, y0 + ry, 2, 2, 0x000000, 0.16);
      r2(mt, x0 + 2, y0 + 2, w - 4, 1, 0xffffff, 0.22); r2(mt, x0 + 2, y0 + 2, 1, h - 4, 0xffffff, 0.14);
      r2(mt, x0 + 2, y0 + h - 3, w - 4, 1, 0x000000, 0.3); r2(mt, x0 + w - 3, y0 + 2, 1, h - 4, 0x000000, 0.22);
      r2(mt, x0 + w / 2 - 9, y0 + h / 2 - 1, 18, 2, 0x39d9ff, 0.35); r2(mt, x0 + w / 2 - 1, y0 + h / 2 - 5, 2, 10, 0x39d9ff, 0.35); // printed cross
    }
  }
  { // wall mirror: brushed metal frame, bolts, bevel, longer reflection streaks, tiny reflected display glow, floor shelf
    const mg = scene.add.graphics().setDepth(3 * T + 1.5), mx = 32.15 * T, my = 3 * T - 28;
    r2(mg, mx, my, 54, 1, 0xe3ecff); r2(mg, mx, my, 1, 24, 0xe3ecff, 0.8); r2(mg, mx, my + 23, 54, 1, 0x4a5876); r2(mg, mx + 53, my, 1, 24, 0x4a5876);
    for (const [bx2, by2] of [[mx + 1, my + 1], [mx + 50, my + 1], [mx + 1, my + 20], [mx + 50, my + 20]]) { r2(mg, bx2, by2, 3, 3, 0x24365a); r2(mg, bx2, by2, 1, 1, 0xe3ecff, 0.9); }
    for (const [sx0, w0] of [[10, 3], [22, 2], [37, 5]]) { mg.lineStyle(w0 > 2 ? 2 : 1, 0xffffff, 0.3); mg.lineBetween(mx + sx0 + 8, my + 21, mx + sx0 + 18, my + 4); }
    r2(mg, mx + 42, my + 8, 6, 4, 0x39d9ff, 0.3); r2(mg, mx + 43, my + 9, 4, 1, 0x8ceaff, 0.5);  // reflected cyan display
    r2(mg, mx + 6, my + 24, 42, 2, 0x5b6b8c); r2(mg, mx + 6, my + 24, 42, 1, 0xaebbd3);           // little metal shelf under the mirror
  }
  { // resistance bands rail: screws, engraved ticks and colour-coded weight tags (green 5 KG, yellow 10 KG)
    const rg = scene.add.graphics().setDepth(3 * T + 1.5);
    for (let k = 0; k < 5; k++) { r2(rg, 30.05 * T + 5 + k * 13, 3 * T - 17, 3, 3, 0x4a5876); r2(rg, 30.05 * T + 5 + k * 13, 3 * T - 17, 1, 1, 0xe3ecff); }
    for (const [ax, col] of [[30.55, 0x66d17a], [31.45, 0xffd84a]] as const) { r2(rg, ax * T - 7, 3 * T - 26, 14, 7, 0x1c2c4a); r2(rg, ax * T - 7, 3 * T - 26, 14, 2, col); }
    label(scene, '5 KG', 30.55 * T, 3 * T - 21, '#e3ecff', 5).setDepth(3 * T + 2); label(scene, '10 KG', 31.45 * T, 3 * T - 21, '#e3ecff', 5).setDepth(3 * T + 2);
  }
  { // wall display: bezel buttons, status LED and a small HR label
    const wd = scene.add.graphics().setDepth(3 * T + 1.5), sx = 35.15 * T, sy = 3 * T - 26;
    r2(wd, sx, sy, 30, 1, 0x8d99b3); r2(wd, sx, sy + 19, 30, 1, 0x1c2c4a);
    for (let k = 0; k < 3; k++) { r2(wd, sx + 4 + k * 6, sy + 21, 4, 2, 0x5b6b8c); r2(wd, sx + 4 + k * 6, sy + 21, 4, 1, 0xaebbd3); }
    r2(wd, sx + 24, sy + 21, 3, 2, 0x4dffb0);
    label(scene, 'HR', sx + 25, sy + 4, '#8ceaff', 5).setDepth(3 * T + 2);
  }
  { // cycle: shaded seat, telescopic post collar + orange adjust knob, rubber handle grips, cables, base vents, flywheel shroud, RPM plate
    const bd = scene.add.graphics().setDepth(5 * T + 0.5), bx2 = 33.1 * T;
    r2(bd, bx2 + 22, 4 * T + 3, 20, 1, 0xaebbd3, 0.7); r2(bd, bx2 + 24, 4 * T + 7, 16, 1, 0x141c30); r2(bd, bx2 + 28, 4 * T + 3, 6, 5, 0x24365a, 0.5); // seat shading + groove
    r2(bd, bx2 + 26, 4 * T + 14, 10, 3, 0x24365a); r2(bd, bx2 + 26, 4 * T + 14, 10, 1, 0xaebbd3); r2(bd, bx2 + 36, 4 * T + 14, 3, 3, 0xffb340); r2(bd, bx2 + 36, 4 * T + 14, 3, 1, 0xfff0a0); // collar + knob
    r2(bd, 34.6 * T - 12, 4 * T - 8, 4, 5, 0x141c30); r2(bd, 34.6 * T + 6, 4 * T - 8, 4, 5, 0x141c30); for (let k = 0; k < 2; k++) { r2(bd, 34.6 * T - 11 + k * 2, 4 * T - 7, 1, 3, 0x5b6b8c); r2(bd, 34.6 * T + 7 + k * 2, 4 * T - 7, 1, 3, 0x5b6b8c); } // grips
    bd.lineStyle(1, 0x141c30, 1); bd.lineBetween(34.6 * T - 1, 4 * T - 9, 34.6 * T - 1, 4 * T + 22); bd.lineBetween(34.6 * T + 1, 4 * T - 9, 34.6 * T + 3, 4 * T + 6); // display cables
    for (let k = 0; k < 3; k++) { r2(bd, bx2 + 8 + k * 4, 5 * T - 6, 2, 4, 0x24365a); r2(bd, bx2 + 40 + k * 4, 5 * T - 6, 2, 4, 0x24365a); } // base vents
    bd.fillStyle(0x17243d, 1); bd.fillCircle(33.6 * T + 6, 4 * T + 14, 14); bd.lineStyle(1, 0x5b6b8c, 1); bd.strokeCircle(33.6 * T + 6, 4 * T + 14, 14);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; r2(bd, 33.6 * T + 6 + Math.cos(a) * 12 - 1, 4 * T + 14 + Math.sin(a) * 12 - 1, 2, 2, 0x8d99b3); } // shroud bolts
    r2(bd, 34.6 * T - 8, 4 * T - 26, 14, 4, 0x1c2c4a); r2(bd, 34.6 * T - 8, 4 * T - 26, 14, 1, 0x5b6b8c);
    label(scene, 'RPM', 34.6 * T - 1, 4 * T - 24, '#8ceaff', 5).setDepth(5 * T + 3);
  }
  const rowerDetail = scene.add.graphics();
  const drawRowerDetail = (open: boolean) => {
    rowerDetail.clear();
    if (!open) { // folded against the wall: rail screws, grip tape on the hooked handle, vented flywheel housing
      rowerDetail.setDepth(4 * T + 0.5);
      for (let k = 0; k < 4; k++) r2(rowerDetail, 36.3 * T + 4, 3 * T - 24 + k * 13, 3, 3, 0x24365a);
      for (let k = 0; k < 3; k++) r2(rowerDetail, 36.3 * T + 14, 3 * T + 7 + k * 2, 3, 1, 0x8a5a10);
      r2(rowerDetail, 36.3 * T - 3, 3 * T - 6, 18, 1, 0x8d99b3, 0.6); r2(rowerDetail, 36.3 * T - 3, 3 * T + 1, 18, 1, 0x141c30);
      rowerDetail.lineStyle(1, 0x141c30, 1); rowerDetail.strokeCircle(37.4 * T, 4 * T + 8, 6); rowerDetail.strokeCircle(37.4 * T, 4 * T + 8, 3);
    } else { // unfolded: ruler ticks on the rail, groove, vented flywheel cover, ridged footplate strap, heel cups
      rowerDetail.setDepth(5 * T + 4.5);
      for (let k = 0; k <= 12; k++) r2(rowerDetail, 35.8 * T + 4 + k * 7, 4.9 * T + 3, 1, k % 4 === 0 ? 3 : 2, 0x1c2c4a);
      r2(rowerDetail, 35.8 * T + 2, 4.9 * T + 2, 3 * T - 26, 1, 0x141c30); r2(rowerDetail, 35.8 * T, 4.9 * T + 7, 3 * T, 1, 0x141c30, 0.7);
      for (const sx of [35.8 * T + 6, 35.8 * T + 3 * T - 10]) { r2(rowerDetail, sx, 4.9 * T + 1, 2, 2, 0x8d99b3); }
      rowerDetail.lineStyle(1, 0x141c30, 1); rowerDetail.strokeCircle(38.6 * T, 4.9 * T + 2, 7); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; r2(rowerDetail, 38.6 * T + Math.cos(a) * 9 - 1, 4.9 * T + 2 + Math.sin(a) * 9 - 1, 2, 2, 0x0c1830); } // cover vents
      for (let k = 0; k < 3; k++) r2(rowerDetail, 37.9 * T + 1, 4.9 * T - 3 + k * 2, 6, 1, 0x8a5a10); r2(rowerDetail, 37.9 * T, 4.9 * T + 8, 8, 4, 0x141c30); r2(rowerDetail, 37.9 * T, 4.9 * T + 8, 8, 1, 0x5b6b8c); // strap ridges + heel cup
    }
  };
  const drawRower = (open: boolean) => {
    rower.clear(); drawRowerDetail(open); rowing = open; if (!open) { rowerDyn.clear(); }
    if (!open) { // folded: an upright rail against the wall
      rower.setDepth(4 * T);
      r2(rower, 36.3 * T, 3 * T - 30, 12, 60, 0x5d6b88); r2(rower, 36.3 * T, 3 * T - 30, 12, 3, 0xaebbd3); r2(rower, 36.3 * T + 5, 3 * T - 26, 1, 52, 0x31405e);
      r2(rower, 36.3 * T - 3, 3 * T - 6, 18, 8, 0x31405e); r2(rower, 36.3 * T - 3, 3 * T - 6, 18, 1, 0x5b6b8c);        // seat parked at the top
      r2(rower, 36.3 * T + 14, 3 * T + 6, 3, 8, 0xffb340);                                                              // handle hooked on the rail
      rower.fillStyle(0x2a3550, 1); rower.fillCircle(37.4 * T, 4 * T + 8, 10); rower.lineStyle(2, 0x39d9ff, 0.8); rower.strokeCircle(37.4 * T, 4 * T + 8, 10);
      rower.lineStyle(1, 0x5b6b8c, 1); for (let s = 0; s < 4; s++) rower.lineBetween(37.4 * T, 4 * T + 8, 37.4 * T + Math.cos(s * Math.PI / 2 + .6) * 9, 4 * T + 8 + Math.sin(s * Math.PI / 2 + .6) * 9);
    } else { // unfolded: a long rail on the floor
      rower.setDepth(5 * T + 4);
      r2(rower, 35.8 * T, 4.9 * T, 3 * T, 8, 0x5d6b88); r2(rower, 35.8 * T, 4.9 * T, 3 * T, 2, 0xaebbd3); r2(rower, 35.8 * T, 4.9 * T + 6, 3 * T, 2, 0x31405e);
      r2(rower, 35.8 * T, 4.9 * T + 8, 6, 3, 0x2a3550); r2(rower, 38.6 * T - 4, 4.9 * T + 8, 8, 3, 0x2a3550);              // rubber feet
      rower.fillStyle(0x2a3550, 1); rower.fillCircle(38.6 * T, 4.9 * T + 2, 11); rower.lineStyle(2, 0x39d9ff, 0.9); rower.strokeCircle(38.6 * T, 4.9 * T + 2, 11);
      r2(rower, 37.9 * T, 4.9 * T - 6, 8, 18, 0x31405e); r2(rower, 37.9 * T + 1, 4.9 * T - 4, 6, 3, 0xffb340);            // footplates + strap
    }
    drawRowerDyn();
  };
  drawRower(false);
  label(scene, 'GYM', 34.5 * T, 7.4 * T, '#9dffb0', 8).setData('room', 'gym');
  label(scene, 'BANDS', 31 * T, 6.3 * T, '#8ceaff', 8); label(scene, 'BIKE', 34 * T, 6.6 * T, '#8ceaff', 8); label(scene, 'ROWER', 37.3 * T, 6.6 * T, '#8ceaff', 8);

  // ---------- SCIENCE LAB (Step 29a detail pass: see drawLab) ----------
  drawLab(scene);

  // ---------- LAB DOOR: two metal leaves slide into the wall when the player is near ----------
  const dx0 = LAB_DOOR[0] * T, dy0 = LAB_DOOR[1] * T;
  const door = scene.add.graphics().setDepth((LAB_DOOR[1] + 1) * T + 1);   // just above the wall row so it reads as part of the wall face
  let openAmt = 0, drawnAmt = -1;
  const drawDoor = () => {
    door.clear();
    const leaf = Math.round((T / 2 - 2) * (1 - openAmt)) + 3;                 // each leaf shrinks from 14px to a 3px sliver in the wall
    const top = dy0 - 12, h = T + 12;
    r2(door, dx0, top, T, 3, 0x2a3550);                                       // lintel
    r2(door, dx0, top, 3, h, 0x2a3550); r2(door, dx0 + T - 3, top, 3, h, 0x2a3550); // frame posts
    for (const left of [true, false]) {
      const x = left ? dx0 + 3 : dx0 + T - 3 - leaf;
      r2(door, x, top + 3, leaf, h - 3, 0x8d99b3); r2(door, x, top + 3, leaf, 2, 0xdfe6f2);   // leaf + highlight
      if (leaf > 6) r2(door, left ? x + leaf - 3 : x, top + 8, 3, h - 14, 0x31405e);             // seam edge
    }
    r2(door, dx0 + T / 2 - 6, top + 5, 12, 3, openAmt > 0.5 ? 0x4dffb0 : 0x8ceaff, 0.95);       // status strip: cyan shut, green open
  };
  drawDoor(); drawnAmt = openAmt;
  const onUpdate = (_t: number, dt: number) => {
    const p = getPlayer?.();
    const near = !!p && Math.hypot(p.x - (dx0 + T / 2), p.y - (dy0 + T / 2)) < 1.7 * T;
    const next = Math.max(0, Math.min(1, openAmt + (near ? 1 : -1) * dt / 180));
    if (next !== openAmt) openAmt = next;
    if (Math.abs(openAmt - drawnAmt) > 0.02 || (openAmt === 0 || openAmt === 1) && drawnAmt !== openAmt) { drawDoor(); drawnAmt = openAmt; }
  };
  scene.events.on('update', onUpdate);
  scene.events.once('shutdown', () => scene.events.off('update', onUpdate));

  // ---------- BATHROOM (fixtures only) ----------
  const bath = scene.add.graphics().setDepth(14 * T);
  r2(bath, 36 * T + 4, 13 * T - 8, 24, 20, 0xeef3fa); bath.fillStyle(0x9fd8ff, 1); bath.fillEllipse(36 * T + 16, 13 * T + 2, 16, 8); r2(bath, 36 * T + 6, 13 * T - 22, 20, 12, 0x9fd8ff, 0.5); // sink + mirror
  r2(bath, 38 * T + 4, 13 * T - 10, 24, 26, 0xeef3fa); r2(bath, 38 * T + 6, 13 * T - 6, 20, 8, 0xc8d3e3); r2(bath, 38 * T + 24, 13 * T - 2, 6, 3, 0x5d6b88); // space toilet + fan hose
  const shower = scene.add.graphics().setDepth(18 * T);
  r2(shower, 36 * T + 2, 16 * T - 14, 3 * T - 4, 2 * T + 12, 0xdfe9f5, 0.55); for (let i = 0; i < 6; i++) r2(shower, 36 * T + 8 + i * 14, 16 * T - 12, 2, 2 * T + 8, 0xffffff, 0.35);
  const pipes = scene.add.graphics().setDepth(13 * T);
  pipes.lineStyle(3, 0x6b7fa6, 1); pipes.lineBetween(36 * T + 16, 12 * T + 30, 36 * T + 16, 12 * T + 18); pipes.lineBetween(36 * T + 16, 12 * T + 18, 38.8 * T, 12 * T + 18);
  label(scene, 'BATHROOM', 37.5 * T, 15.3 * T, '#bfe8ff', 7).setData('room', 'bath');
  label(scene, '→ WATER RECOVERY', 37.4 * T, 12.45 * T, '#8ceaff', 7).setDepth(13 * T + 1);

  return {
    setRower: open => drawRower(open),
    setBands: pull => drawBands(pull),
    spin: on => { spinning = on; },
  };
}
