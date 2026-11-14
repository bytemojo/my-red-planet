// The east wing (owner's prompt pack, Step 5): gym (north), science lab and bathroom (south),
// reached through the corridor door at x=29. Drawn in the same 2-pixel art grid as the crew quarters.
// world.ts builds the walls and applies WING_BLOCKS; this file draws the furniture.
import Phaser from 'phaser';

const T = 32;
// Furniture footprints in tiles [x, y, w, h] (collision).
export const WING_BLOCKS: [number, number, number, number][] = [
  [33, 4, 2, 1],                 // cycle ergometer
  [36, 3, 2, 1],                 // rowing machine, folded against the north wall
  [30, 13, 3, 1], [33, 13, 2, 1], [30, 17, 2, 1], // lab bench + microscope, glovebox, sample shelf
  [36, 13, 1, 1], [38, 13, 1, 1], [36, 16, 3, 2], // bathroom: sink, space toilet, shower stall
];

const r2 = (g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, c: number, a = 1) => { g.fillStyle(c, a); g.fillRect(Math.round(x), Math.round(y), w, h); };
const label = (scene: Phaser.Scene, txt: string, x: number, y: number, color = '#8ceaff', size = 10) =>
  scene.add.text(x, y, txt, { fontFamily: 'Rajdhani, sans-serif', fontSize: size + 'px', fontStyle: '700', color, stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(3).setAlpha(0.9).setResolution(2);

export interface Wing { setRower(open: boolean): void; setBands(pulling: boolean): void; spin(on: boolean): void }

export function buildWing(scene: Phaser.Scene): Wing {
  // ---------- GYM ----------
  const mats = scene.add.graphics().setDepth(1);
  r2(mats, 32.6 * T, 4.9 * T, 2.8 * T, 1.5 * T, 0x2a3f6e, 0.85); r2(mats, 35.6 * T, 3.9 * T, 3.2 * T, 2.4 * T, 0x2a3f6e, 0.85);
  r2(mats, 30.1 * T, 3.9 * T, 2.2 * T, 2.2 * T, 0x3a2f5e, 0.85);
  // poster on the north wall
  const poster = scene.add.graphics().setDepth(3 * T + 1);
  r2(poster, 34.2 * T, 3 * T - 26, 26, 18, 0xe9e1cf); r2(poster, 34.2 * T + 2, 3 * T - 24, 22, 4, 0xff6b4a);
  label(scene, '2 HRS/DAY', 34.2 * T + 13, 3 * T - 13, '#1c2c4a', 7).setDepth(3 * T + 2);
  // resistance bands: two anchor plates on the wall with stretchy bands and handles
  const anchors = scene.add.graphics().setDepth(3 * T + 1);
  for (const ax of [30.55, 31.45]) { r2(anchors, ax * T - 5, 3 * T - 14, 10, 8, 0x8d99b3); r2(anchors, ax * T - 2, 3 * T - 11, 4, 2, 0x2a3550); }
  const bands = scene.add.graphics().setDepth(4 * T);
  const drawBands = (pull: boolean) => {
    bands.clear();
    [[30.55, 0x66d17a], [31.45, 0xffd84a]].forEach(([ax, col]) => {
      const x0 = (ax as number) * T, len = pull ? 50 : 30;
      bands.lineStyle(3, col as number, 1); bands.lineBetween(x0, 3 * T - 6, x0 + (pull ? (ax === 30.55 ? -6 : 6) : 0), 3 * T - 6 + len);
      r2(bands, x0 - 5 + (pull ? (ax === 30.55 ? -6 : 6) : 0), 3 * T - 6 + len, 10, 4, 0x31405e);
    });
  };
  drawBands(false);
  // cycle ergometer: seatless, clip-in pedals, waist strap
  const bike = scene.add.graphics().setDepth(5 * T);
  r2(bike, 33.1 * T, 5 * T - 8, 58, 8, 0x5d6b88); r2(bike, 33.1 * T, 5 * T - 8, 58, 2, 0xaebbd3);           // base
  r2(bike, 34.6 * T - 4, 4 * T - 4, 6, 26, 0x8d99b3); r2(bike, 34.6 * T - 12, 4 * T - 8, 22, 5, 0x31405e); // handlebar
  r2(bike, 33.4 * T, 4 * T + 10, 26, 3, 0xffb340);                                                         // waist strap
  const wheel = scene.add.graphics().setDepth(5 * T + 1); let spinT = 0, spinning = false;
  const drawWheel = (a: number) => { wheel.clear(); const cx = 33.6 * T + 6, cy = 4 * T + 14; wheel.fillStyle(0x2a3550, 1); wheel.fillCircle(cx, cy, 11); wheel.lineStyle(2, 0x39d9ff, 0.9); wheel.strokeCircle(cx, cy, 11); wheel.lineBetween(cx, cy, cx + Math.cos(a) * 9, cy + Math.sin(a) * 9); r2(wheel, cx + Math.cos(a) * 9 - 3, cy + Math.sin(a) * 9 - 2, 6, 4, 0x39d9ff); };
  drawWheel(0);
  scene.events.on('update', (_t: number, dt: number) => { if (spinning) { spinT += dt / 90; drawWheel(spinT); } });
  // rowing machine: folds flat against the wall when not in use
  const rower = scene.add.graphics();
  const drawRower = (open: boolean) => {
    rower.clear();
    if (!open) { // folded: an upright rail against the wall
      rower.setDepth(4 * T);
      r2(rower, 36.3 * T, 3 * T - 30, 12, 60, 0x5d6b88); r2(rower, 36.3 * T, 3 * T - 30, 12, 3, 0xaebbd3);
      r2(rower, 36.3 * T - 3, 3 * T - 6, 18, 8, 0x31405e);                    // seat parked at the top
      rower.fillStyle(0x2a3550, 1); rower.fillCircle(37.4 * T, 4 * T + 8, 10); rower.lineStyle(2, 0x39d9ff, 0.8); rower.strokeCircle(37.4 * T, 4 * T + 8, 10);
    } else { // unfolded: a long rail on the floor
      rower.setDepth(5 * T + 4);
      r2(rower, 35.8 * T, 4.9 * T, 3 * T, 8, 0x5d6b88); r2(rower, 35.8 * T, 4.9 * T, 3 * T, 2, 0xaebbd3);
      rower.fillStyle(0x2a3550, 1); rower.fillCircle(38.6 * T, 4.9 * T + 2, 11); rower.lineStyle(2, 0x39d9ff, 0.9); rower.strokeCircle(38.6 * T, 4.9 * T + 2, 11);
      r2(rower, 37.9 * T, 4.9 * T - 6, 8, 18, 0x31405e);                       // footplates
    }
  };
  drawRower(false);
  label(scene, 'GYM', 34.5 * T, 7.4 * T, '#9dffb0', 11);
  label(scene, 'BANDS', 31 * T, 6.3 * T, '#8ceaff', 8); label(scene, 'BIKE', 34 * T, 6.6 * T, '#8ceaff', 8); label(scene, 'ROWER', 37.3 * T, 6.6 * T, '#8ceaff', 8);

  // ---------- SCIENCE LAB ----------
  const lab = scene.add.graphics().setDepth(14 * T);
  r2(lab, 30 * T + 2, 13 * T - 10, 3 * T - 4, 24, 0xdfe6f2); r2(lab, 30 * T + 2, 13 * T + 14, 3 * T - 4, 16, 0x8d99b3);         // bench
  r2(lab, 31 * T, 13 * T - 30, 12, 26, 0x31405e); r2(lab, 31 * T + 3, 13 * T - 38, 6, 10, 0x2a3550); r2(lab, 31 * T - 4, 13 * T - 8, 20, 4, 0x5d6b88); // microscope
  [0xe0575b, 0x66d17a, 0x5ad1ff].forEach((c, i) => { r2(lab, 32 * T + 2 + i * 9, 13 * T - 18, 6, 12, c, 0.85); r2(lab, 32 * T + 2 + i * 9, 13 * T - 20, 6, 3, 0xffffff); }); // sample jars
  r2(lab, 33 * T + 2, 13 * T - 26, 2 * T - 4, 36, 0x9fd8ff, 0.35); r2(lab, 33 * T + 2, 13 * T - 26, 2 * T - 4, 3, 0xffffff, 0.6);  // glovebox
  lab.fillStyle(0x0a1a33, 1); lab.fillCircle(33.5 * T + 2, 13 * T, 6); lab.fillCircle(34.4 * T + 2, 13 * T, 6);
  const shelf = scene.add.graphics().setDepth(18 * T);
  r2(shelf, 30 * T + 2, 17 * T - 12, 2 * T - 4, 30, 0x5d6b88); [0x8a5a3c, 0xb07a52, 0xd9a07a].forEach((c, i) => r2(shelf, 30 * T + 8 + i * 16, 17 * T - 8, 12, 8, c));
  const badge = scene.add.graphics().setDepth(16 * T);                                     // radiation badge reader on the west wall
  r2(badge, 30 * T + 2, 15 * T - 6, 14, 20, 0x24365a); r2(badge, 30 * T + 4, 15 * T - 2, 10, 6, 0x4dffb0);
  label(scene, 'SCIENCE LAB', 32.5 * T, 15.6 * T, '#bfe8ff', 10);

  // ---------- BATHROOM (fixtures only) ----------
  const bath = scene.add.graphics().setDepth(14 * T);
  r2(bath, 36 * T + 4, 13 * T - 8, 24, 20, 0xeef3fa); bath.fillStyle(0x9fd8ff, 1); bath.fillEllipse(36 * T + 16, 13 * T + 2, 16, 8); r2(bath, 36 * T + 6, 13 * T - 22, 20, 12, 0x9fd8ff, 0.5); // sink + mirror
  r2(bath, 38 * T + 4, 13 * T - 10, 24, 26, 0xeef3fa); r2(bath, 38 * T + 6, 13 * T - 6, 20, 8, 0xc8d3e3); r2(bath, 38 * T + 24, 13 * T - 2, 6, 3, 0x5d6b88); // space toilet + fan hose
  const shower = scene.add.graphics().setDepth(18 * T);
  r2(shower, 36 * T + 2, 16 * T - 14, 3 * T - 4, 2 * T + 12, 0xdfe9f5, 0.55); for (let i = 0; i < 6; i++) r2(shower, 36 * T + 8 + i * 14, 16 * T - 12, 2, 2 * T + 8, 0xffffff, 0.35);
  const pipes = scene.add.graphics().setDepth(13 * T);
  pipes.lineStyle(3, 0x6b7fa6, 1); pipes.lineBetween(36 * T + 16, 12 * T + 30, 36 * T + 16, 12 * T + 18); pipes.lineBetween(36 * T + 16, 12 * T + 18, 38.8 * T, 12 * T + 18);
  label(scene, 'BATHROOM', 37.5 * T, 15.3 * T, '#bfe8ff', 9);
  label(scene, '→ WATER RECOVERY', 37.4 * T, 12.45 * T, '#8ceaff', 7).setDepth(13 * T + 1);

  return {
    setRower: open => drawRower(open),
    setBands: pull => drawBands(pull),
    spin: on => { spinning = on; },
  };
}
