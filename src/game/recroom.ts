// Step 17a: the REC ROOM (east half of the old comms room) with the SLEEP POD. Hard-shell pod, plastic table, soft cyan light. No wood, fabric or flame.
// Layout: partition wall x23; entrance from the corridor gap at (24,12); interior x24-28, y13-17. Pod in the NE corner, plastic table on the south side.
// Art-only module (Phaser), data exports are pure so layout.ts / tests can import them.
import type Phaser from 'phaser';

const T = 32;
export const REC = { wallX: 23, wallY0: 12, wallY1: 17, x0: 24, x1: 28, y0: 13, y1: 17 } as const;
export const POD = { zone: 'pod', label: 'Sleep Pod', x: 27, y: 13, w: 2, h: 2 } as const;
/** Interaction tiles: the floor west of the pod. The explorer stands here and faces right. */
export const POD_ZONE = { x0: 25, y0: 13, x1: 26, y1: 14, label: POD.label, inside: true } as const;
export const POD_MARKER: [number, number] = [26.2, 14.2];
export const podStand = () => ({ x: POD_MARKER[0] * T, y: POD_MARKER[1] * T });
/** Step 17b: NASA WIKI wall display in the partition wall (tiles 23,14-15), read from the floor tile east of it. */
export const WIKI_SCREEN = { zone: 'wiki', label: 'NASA Wiki', wallX: 23, y0: 14, y1: 15 } as const;
export const WIKI_ZONE = { x0: 23, y0: 14, x1: 24, y1: 15, label: WIKI_SCREEN.label, inside: true } as const;
export const WIKI_MARKER: [number, number] = [24.3, 14.9];
/** Step 17b: two 1x1 plastic game tables on the south side. Stand on the floor tile north of each (the table tile itself is blocked). */
export const GAME_TABLES = [
  { zone: 'chess', label: 'Chess Table', game: 'Chess', step: 19, x: 25, y: 16 },
  { zone: 'checkers', label: 'Checkers Table', game: 'Checkers', step: 18, x: 27, y: 16 },
] as const;
export const tableZone = (t: (typeof GAME_TABLES)[number]) => ({ x0: t.x, y0: t.y - 1, x1: t.x, y1: t.y + 1, label: t.label, inside: true });
export const tableMarker = (t: (typeof GAME_TABLES)[number]): [number, number] => [t.x + 0.5, t.y - 0.6];
export const recStand = (m: [number, number]) => ({ x: m[0] * T, y: m[1] * T });
/** Step 24i: the centre of the pod's bed bay (world px) where the sleeper lies, visible through the lid. */
export const podBay = { x: POD.x * T + POD.w * T / 2, y: POD.y * T + 34 } as const;
/** Step 24i: decoration. Owner Rule 1: nothing flammable, so every piece lists its materials (tested). The plant is a REAL plant in a metal pot (solid, one tile). */
export const PLANT = { x: 28, y: 17, label: 'Potted plant' } as const;
export const EARTH_PRINT = { x0: 25, x1: 26, wallY: 12, label: 'Earth hologram print' } as const; // on the north wall, clear of the doorway gap at x24
export const REC_DECOR: { id: string; label: string; materials: string[] }[] = [
  { id: 'earth_print', label: EARTH_PRINT.label, materials: ['metal frame', 'hologram film', 'glass'] },
  { id: 'plant', label: PLANT.label, materials: ['living plant', 'metal pot', 'soil'] },
];
/** How long the room takes to dim (and to brighten again), in ms. */
export const DIM_MS = 2500;
/** Step 24i: the pure part of sleeping in the pod (tested): the explorer NEVER vanishes: whenever they are in the pod the sleeper sprite is shown. */
export type PodPhase = 'none' | 'in' | 'out';
export interface PodSleepState { phase: PodPhase; climb: number }          // climb 0 = at the pod's edge .. 1 = lying in the bay
export interface PodInput { mine: boolean; lying: boolean; busy: boolean }  // mine = the pod_sleep action is running; lying = its lying-down poses; busy = the Sol is passing / the report is open
export interface PodView { phase: PodPhase; climb: number; inPod: boolean; asleep: boolean; lidOpen: boolean; dimTarget: 0 | 1; sleeperVisible: boolean; playerVisible: boolean }
export const CLIMB_MS = 500;
export function stepPodSleep(st: PodSleepState, inp: PodInput, dtms: number, reduced: boolean): PodView {
  let { phase, climb } = st;
  if (inp.lying && phase === 'none') phase = 'in';
  else if (phase === 'in' && !inp.mine && !inp.busy) phase = 'out';          // report closed (or the sleep was refused): wake up
  const rate = reduced ? 1 : dtms / CLIMB_MS;
  if (phase === 'in') climb = Math.min(1, climb + rate);
  else if (phase === 'out') { climb = Math.max(0, climb - rate); if (climb <= 0) phase = 'none'; }
  const inPod = phase !== 'none', asleep = phase === 'in' && climb >= 1;
  return { phase, climb, inPod, asleep, lidOpen: (inp.mine && !inp.lying && !inPod) || (inPod && !asleep), dimTarget: phase === 'in' ? 1 : 0, sleeperVisible: inPod, playerVisible: !inPod };
}
/** One easing step of the room dimming: DIM_MS from 0 to 1 and back (instant when `fast`, for reduced motion). */
export const stepDim = (dim: number, target: 0 | 1, dtms: number, fast = false) => { const d = target - dim; return Math.abs(d) < 0.0005 ? target : dim + Math.sign(d) * Math.min(Math.abs(d), fast ? 1 : dtms / DIM_MS); };
/** Collision footprints [x, y, w, h]: the pod, the two game tables and the potted plant. */
export const REC_BLOCKS: [number, number, number, number][] = [[POD.x, POD.y, POD.w, POD.h], ...GAME_TABLES.map(t => [t.x, t.y, 1, 1] as [number, number, number, number]), [PLANT.x, PLANT.y, 1, 1]];

export interface PodArt {
  /** 0 = lid fully open, 1 = closed. The lid eases towards the target each frame. */
  setLidTarget(t: 0 | 1): void;
  /** Call every frame (ms). Returns the current lid position 0..1. `fast` (reduced motion) skips the slow dimming. */
  tick(dtms: number, fast?: boolean): number;
  setOccupied(on: boolean): void;
  /** Step 24i: 1 = the room lights dim slowly (2.5 s), 0 = they brighten again. */
  setDimTarget(t: 0 | 1): void;
}

export function buildRecRoom(scene: Phaser.Scene): PodArt {
  const x0 = REC.x0 * T, y0 = REC.y0 * T, w = (REC.x1 - REC.x0 + 1) * T, h = (REC.y1 - REC.y0 + 1) * T;
  // soft cyan floor wash + pulsing glow
  const wash = scene.add.graphics().setDepth(3.1); wash.fillStyle(0x39d9ff, 0.07); wash.fillRect(x0, y0, w, h);
  wash.lineStyle(1, 0x39d9ff, 0.25); wash.strokeRect(x0 + 4.5, y0 + 4.5, w - 9, h - 9);
  const glow = scene.add.graphics().setDepth(3.2); glow.fillStyle(0x8ceaff, 0.1); glow.fillEllipse(x0 + w / 2, y0 + h / 2, w * 0.9, h * 0.7);
  scene.tweens.add({ targets: glow, alpha: 0.35, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  scene.add.text(28 * T, 12 * T + 12, 'REC ROOM', { fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontStyle: '700', color: '#8ceaff' }).setOrigin(0.5).setDepth(13 * T).setResolution(2).setData('room', 'rec');
  // two small plastic game tables (clear top, white legs, a 4x4 board of cyan and dark squares)
  for (const t of GAME_TABLES) {
    const tx = t.x * T, ty = t.y * T, tb = scene.add.graphics().setDepth((t.y + 1) * T + 2);
    tb.fillStyle(0x0b1428, 0.35); tb.fillEllipse(tx + 16, ty + 28, T - 4, 8);
    tb.fillStyle(0xdfe8f5, 1); tb.fillRect(tx + 5, ty + 14, 3, 14); tb.fillRect(tx + T - 8, ty + 14, 3, 14);
    tb.fillStyle(0xbfe6f5, 0.9); tb.fillRect(tx + 2, ty + 4, T - 4, 12); tb.lineStyle(1, 0xffffff, 0.8); tb.strokeRect(tx + 2.5, ty + 4.5, T - 5, 11);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { tb.fillStyle((i + j) % 2 ? 0x24365a : 0x8ceaff, 0.9); tb.fillRect(tx + 4 + i * 6, ty + 6 + j * 3, 6, 3); }
    if (t.zone === 'checkers') { tb.fillStyle(0xffb340, 1); tb.fillRect(tx + 7, ty + 7, 3, 2); tb.fillStyle(0xff6a4d, 1); tb.fillRect(tx + 19, ty + 10, 3, 2); }
    else { tb.fillStyle(0xffffff, 1); tb.fillRect(tx + 8, ty + 7, 2, 2); tb.fillStyle(0x0b1428, 1); tb.fillRect(tx + 20, ty + 10, 2, 2); }
    scene.add.text(tx + 16, ty + T + 8, t.game.toUpperCase(), { fontFamily: 'Rajdhani, sans-serif', fontSize: '6px', fontStyle: '700', color: '#8ceaff' }).setOrigin(0.5).setDepth((t.y + 2) * T + 3).setResolution(2);
  }
  // NASA WIKI display: a cyan screen set into the partition wall (tiles 23,14-15)
  const wx = WIKI_SCREEN.wallX * T, wy = WIKI_SCREEN.y0 * T, wd = (WIKI_SCREEN.y1 + 1) * T + 1;
  const wiki = scene.add.graphics().setDepth(wd);
  wiki.fillStyle(0x0a1a33, 1); wiki.fillRoundedRect(wx + 3, wy + 4, T - 6, 2 * T - 8, 3);
  wiki.lineStyle(1, 0x39d9ff, 1); wiki.strokeRoundedRect(wx + 3.5, wy + 4.5, T - 7, 2 * T - 9, 3);
  wiki.fillStyle(0x39d9ff, 0.25); wiki.fillRect(wx + 6, wy + 8, T - 12, 2 * T - 16);
  wiki.fillStyle(0x8ceaff, 1); wiki.fillCircle(wx + 16, wy + 20, 6); wiki.fillStyle(0x0a1a33, 1); wiki.fillCircle(wx + 18, wy + 18, 2); wiki.fillCircle(wx + 14, wy + 23, 2);
  wiki.fillStyle(0x8ceaff, 0.9); for (let i = 0; i < 4; i++) wiki.fillRect(wx + 8, wy + 32 + i * 5, i % 2 ? 12 : 16, 2);
  const wglow = scene.add.graphics().setDepth(wd + 1); wglow.fillStyle(0xffffff, 0.12); wglow.fillRect(wx + 6, wy + 8, T - 12, 6);
  scene.tweens.add({ targets: wglow, alpha: 0.2, y: 34, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  scene.add.text(wx + 16, wy - 4, 'NASA WIKI', { fontFamily: 'Rajdhani, sans-serif', fontSize: '6px', fontStyle: '700', color: '#8ceaff' }).setOrigin(0.5).setDepth(wd + 2).setResolution(2);
  // Step 24i: Earth hologram print: a brushed-metal frame on the north wall holding a glowing hologram of Earth (no paper).
  {
    const ex = EARTH_PRINT.x0 * T + 4, ey = EARTH_PRINT.wallY * T + 4, ew = (EARTH_PRINT.x1 - EARTH_PRINT.x0 + 1) * T - 8, eh = 24, d = (EARTH_PRINT.wallY + 1) * T + 2;
    const g = scene.add.graphics().setDepth(d);
    g.fillStyle(0x0b1428, 0.35); g.fillRect(ex + 2, ey + eh, ew - 2, 3);                                  // shadow under the frame
    g.fillStyle(0x93a8cc, 1); g.fillRect(ex, ey, ew, eh); g.fillStyle(0xdfe8f5, 1); g.fillRect(ex, ey, ew, 2); g.fillStyle(0x5d6b88, 1); g.fillRect(ex, ey + eh - 2, ew, 2);
    g.fillStyle(0x070f22, 1); g.fillRect(ex + 3, ey + 3, ew - 6, eh - 6);                                 // dark holo bay
    const cx = ex + 16, cy = ey + eh / 2;
    g.fillStyle(0x39d9ff, 0.18); g.fillCircle(cx, cy, 10);                                                // atmosphere glow
    g.fillStyle(0x1f78c8, 1); g.fillCircle(cx, cy, 8); g.fillStyle(0x2a9be0, 1); g.fillCircle(cx - 1, cy - 1, 6);
    g.fillStyle(0x4dd88a, 1); g.fillRect(cx - 5, cy - 4, 4, 3); g.fillRect(cx - 4, cy - 1, 3, 4); g.fillRect(cx + 1, cy - 5, 4, 3); g.fillRect(cx + 2, cy, 3, 3); // continents
    g.fillStyle(0xffffff, 0.8); g.fillRect(cx - 4, cy - 7, 3, 1); g.fillRect(cx + 1, cy + 4, 4, 1);       // clouds / ice
    g.fillStyle(0xffffff, 0.35); g.fillRect(cx - 5, cy - 6, 2, 2);                                        // highlight
    g.fillStyle(0x8ceaff, 0.7); for (let i = 0; i < 4; i++) g.fillRect(ex + 28, ey + 7 + i * 3, i % 2 ? 10 : 14, 1); // data lines
    g.fillStyle(0xe3ecff, 1); for (const [bx, by] of [[1, 1], [ew - 3, 1], [1, eh - 3], [ew - 3, eh - 3]]) g.fillRect(ex + bx, ey + by, 2, 2); // bolts
    const scan = scene.add.graphics().setDepth(d + 1); scan.fillStyle(0x8ceaff, 0.35); scan.fillRect(ex + 4, ey + 4, ew - 8, 1);
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) scene.tweens.add({ targets: scan, y: eh - 10, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    scene.add.text(ex + ew / 2, ey + eh + 6, 'EARTH', { fontFamily: 'Rajdhani, sans-serif', fontSize: '6px', fontStyle: '700', color: '#8ceaff' }).setOrigin(0.5).setDepth(d + 2).setResolution(2);
  }
  // Step 24i: a real potted plant in a brushed-metal pot, in the south-east corner. It sways very slightly.
  {
    const bx = PLANT.x * T, by = PLANT.y * T, d = by + 30;
    const pot = scene.add.graphics().setDepth(d);
    pot.fillStyle(0x0b1428, 0.35); pot.fillEllipse(bx + 16, by + 29, 24, 7);
    pot.fillStyle(0x6f7f9e, 1); pot.fillRect(bx + 9, by + 17, 14, 11); pot.fillStyle(0xaebbd3, 1); pot.fillRect(bx + 9, by + 17, 4, 11); pot.fillStyle(0x4a5878, 1); pot.fillRect(bx + 20, by + 17, 3, 11);
    pot.fillStyle(0x3a4a6c, 1); pot.fillRect(bx + 10, by + 28, 12, 2);
    pot.fillStyle(0xc9d4e8, 1); pot.fillRect(bx + 7, by + 14, 18, 4); pot.fillStyle(0xffffff, 0.7); pot.fillRect(bx + 7, by + 14, 18, 1);
    pot.fillStyle(0x4b2e22, 1); pot.fillRect(bx + 9, by + 13, 14, 2);                                      // soil
    pot.fillStyle(0xe3ecff, 1); pot.fillRect(bx + 12, by + 21, 1, 1); pot.fillRect(bx + 19, by + 21, 1, 1); // bolts
    const leaves = scene.add.graphics(); const L = (x: number, y: number, w: number, h: number, c: number) => { leaves.fillStyle(c, 1); leaves.fillRect(x, y, w, h); };
    L(-1, -17, 2, 17, 0x2f7a2c);                                                                          // stem
    for (const [x, y, w] of [[-10, -9, 9], [1, -12, 9], [-9, -16, 8], [1, -19, 8]] as const) { L(x, y, w, 3, 0x3a8a35); L(x + 1, y, w - 3, 1, 0x7be88a); L(x + (x < 0 ? 0 : w - 2), y + 2, 2, 2, 0x2f7a2c); }
    L(-3, -26, 6, 8, 0x3a8a35); L(-2, -26, 3, 6, 0x7be88a);                                              // new leaf at the top
    const sway = scene.add.container(bx + 16, by + 13, [leaves]).setDepth(d + 1);
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) { sway.setAngle(-2); scene.tweens.add({ targets: sway, angle: 2, duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
  }
  // sleep pod: hard shell on the floor, glass-like lid that slides up over the bed
  const px = POD.x * T, py = POD.y * T, pw = POD.w * T, ph = POD.h * T, depth = (POD.y + POD.h) * T + 1;
  const body = scene.add.graphics().setDepth(depth);
  body.fillStyle(0x0b1428, 0.4); body.fillEllipse(px + pw / 2, py + ph - 2, pw - 2, 10);
  body.fillStyle(0xdfe8f5, 1); body.fillRoundedRect(px + 2, py + 6, pw - 4, ph - 8, 8);
  body.lineStyle(2, 0x93a8cc, 1); body.strokeRoundedRect(px + 2, py + 6, pw - 4, ph - 8, 8);
  body.fillStyle(0x24365a, 1); body.fillRoundedRect(px + 8, py + 14, pw - 16, ph - 26, 6);   // the bed bay
  body.fillStyle(0x6fb7d9, 1); body.fillRoundedRect(px + 11, py + 22, pw - 22, ph - 40, 4);  // plastic mattress shell
  body.fillStyle(0xeaf7ff, 1); body.fillRoundedRect(px + 12, py + 24, 16, ph - 44, 4);       // pillow block
  body.fillStyle(0x8d99b3, 1); for (const [bx, by] of [[6, 10], [pw - 8, 10], [6, ph - 6], [pw - 8, ph - 6]]) body.fillRect(px + bx, py + by, 2, 2);
  const panel = scene.add.graphics().setDepth(depth + 2); panel.fillStyle(0x0a1a33, 1); panel.fillRect(px + pw - 22, py + 8, 18, 6);
  const light = scene.add.graphics().setDepth(depth + 3);
  const lid = scene.add.graphics().setDepth(depth + 2);
  scene.add.text(px + pw / 2, py - 2, 'SLEEP POD', { fontFamily: 'Rajdhani, sans-serif', fontSize: '7px', fontStyle: '700', color: '#8ceaff' }).setOrigin(0.5).setDepth(depth + 4).setResolution(2);
  // Step 24i: the room lights dim and brighten with a slow tween (DIM_MS each way).
  const dimG = scene.add.graphics().setDepth(9505);
  let dim = 0, dimTarget: 0 | 1 = 0, dimDrawn = -1;
  const drawDim = () => { const k = Math.round(dim * 40); if (k === dimDrawn) return; dimDrawn = k; dimG.clear(); if (k > 0) { dimG.fillStyle(0x050a18, 0.6 * (k / 40)); dimG.fillRect(REC.x0 * T, REC.wallY0 * T, (REC.x1 - REC.x0 + 1) * T, (REC.y1 - REC.wallY0 + 1) * T); } };
  let target: 0 | 1 = 1, pos = 1, occupied = false, drawn = -1, drawnOcc: boolean | null = null;
  const draw = () => {
    const k = Math.round(pos * 20); if (k === drawn && drawnOcc === occupied) return; drawn = k; drawnOcc = occupied;
    lid.clear(); const lh = Math.max(2, (ph - 30) * pos); // lid slides: closed = covers the bay, open = a thin strip at the head end
    lid.fillStyle(0x9fd8ff, 0.55); lid.fillRoundedRect(px + 9, py + 15, pw - 18, lh, 5); lid.lineStyle(1, 0xffffff, 0.8); lid.strokeRoundedRect(px + 9.5, py + 15.5, pw - 19, lh - 1, 5);
    light.clear(); light.fillStyle(occupied ? 0xffb340 : 0x39d9ff, 1); light.fillCircle(px + pw - 8, py + 11, 2);
  };
  draw();
  return {
    setLidTarget: t => { target = t; },
    tick: (dtms, fast) => {
      const d = target - pos; if (Math.abs(d) > 0.001) { pos += Math.sign(d) * Math.min(Math.abs(d), dtms / 450); draw(); }
      if (dim !== dimTarget) { dim = stepDim(dim, dimTarget, dtms, fast); drawDim(); }
      return pos;
    },
    setDimTarget: t => { dimTarget = t; },
    setOccupied: on => { if (on !== occupied) { occupied = on; draw(); } },
  };
}
