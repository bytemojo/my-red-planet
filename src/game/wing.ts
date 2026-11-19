// The east wing (owner's prompt pack, Step 5): gym (north), science lab and bathroom (south),
// reached through the corridor door at x=29. Drawn in the same 2-pixel art grid as the crew quarters.
// world.ts builds the walls and applies WING_BLOCKS; this file draws the furniture.
import Phaser from 'phaser';

const T = 32;
// Furniture footprints (collision) live in layout.ts so tests can import them without Phaser.
export { WING_BLOCKS } from './layout';

const r2 = (g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, c: number, a = 1) => { g.fillStyle(c, a); g.fillRect(Math.round(x), Math.round(y), w, h); };
const label = (scene: Phaser.Scene, txt: string, x: number, y: number, color = '#8ceaff', size = 10) =>
  scene.add.text(x, y, txt, { fontFamily: 'Rajdhani, sans-serif', fontSize: size + 'px', fontStyle: '700', color, stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(3).setAlpha(0.9).setResolution(2);

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

  // ---------- SCIENCE LAB ----------
  const lab = scene.add.graphics().setDepth(14 * T);
  r2(lab, 30 * T + 2, 13 * T - 10, 2 * T - 4, 24, 0xdfe6f2); r2(lab, 30 * T + 2, 13 * T + 14, 2 * T - 4, 16, 0x8d99b3);         // bench (2 tiles: tile 32 is the doorway)
  r2(lab, 31 * T, 13 * T - 30, 12, 26, 0x31405e); r2(lab, 31 * T + 3, 13 * T - 38, 6, 10, 0x2a3550); r2(lab, 31 * T - 4, 13 * T - 8, 20, 4, 0x5d6b88); // microscope
  [0xe0575b, 0x66d17a, 0x5ad1ff].forEach((c, i) => { r2(lab, 30 * T + 1 + i * 8, 13 * T - 18, 6, 12, c, 0.85); r2(lab, 30 * T + 1 + i * 8, 13 * T - 20, 6, 3, 0xffffff); }); // sample jars (on the bench, clear of the doorway)
  r2(lab, 33 * T + 2, 13 * T - 26, 2 * T - 4, 36, 0x9fd8ff, 0.35); r2(lab, 33 * T + 2, 13 * T - 26, 2 * T - 4, 3, 0xffffff, 0.6);  // glovebox
  lab.fillStyle(0x0a1a33, 1); lab.fillCircle(33.5 * T + 2, 13 * T, 6); lab.fillCircle(34.4 * T + 2, 13 * T, 6);
  const shelf = scene.add.graphics().setDepth(18 * T);
  r2(shelf, 30 * T + 2, 17 * T - 12, 2 * T - 4, 30, 0x5d6b88); [0x8a5a3c, 0xb07a52, 0xd9a07a].forEach((c, i) => r2(shelf, 30 * T + 8 + i * 16, 17 * T - 8, 12, 8, c));
  const badge = scene.add.graphics().setDepth(16 * T);                                     // radiation badge reader on the west wall
  r2(badge, 30 * T + 2, 15 * T - 6, 14, 20, 0x24365a); r2(badge, 30 * T + 4, 15 * T - 2, 10, 6, 0x4dffb0);
  label(scene, 'SCIENCE LAB', 32.5 * T, 15.6 * T, '#bfe8ff', 7).setData('room', 'lab');

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
