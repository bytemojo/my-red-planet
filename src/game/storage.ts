// Storage room (Step 3a): a pressurised annex south of Comms, door at tile (19,18) from the comms room.
// Art only. Metal shelving with clear plastic snap-lid bins (no wood, cardboard, cloth or paper), a cyan wall screen, a NO FLAME sign and a
// wall-mounted extinguisher. Walls and the doorway are built in world.ts from the constants below.
import Phaser from 'phaser';

const T = 32;
import { STORAGE, STORAGE_BINS, binZoneId } from './layout';
export { STORAGE, STORAGE_WALL_Y, STORAGE_BLOCKS, STORAGE_BINS, BIN_TILE_X, binZoneId, binZone, binMarker } from './layout';

const r2 = (g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, c: number, a = 1) => { g.fillStyle(c, a); g.fillRect(Math.round(x), Math.round(y), w, h); };

// Step 3b: each bin is a tap/E zone on the aisle tile (y20) right below its shelf unit.
export const binStand = (i: number) => ({ x: (23 + i + 0.5) * T, y: (STORAGE.y1 + 0.45) * T });
export const binIndex = (zone: string) => STORAGE_BINS.findIndex(b => binZoneId(b.id) === zone);
export interface StorageArt { /** Pop the snap lid of bin i open (true) or shut (false). */ setOpen(i: number, open: boolean): void }
export let storageArt: StorageArt | null = null;

export function buildStorage(scene: Phaser.Scene): void {
  storageArt = null;
  const fx0 = STORAGE.x0 * T, fy0 = STORAGE.y0 * T, fw = (STORAGE.x1 - STORAGE.x0 + 1) * T, fh = (STORAGE.y1 - STORAGE.y0 + 1) * T;
  // floor: white-grey metal tiles, cyan guide strip down the aisle, hazard threshold in the doorway
  const fl = scene.add.graphics().setDepth(1);
  for (let y = STORAGE.y0; y <= STORAGE.y1; y++) for (let x = STORAGE.x0; x <= STORAGE.x1; x++) r2(fl, x * T, y * T, T, T, (x + y) % 2 ? 0x34456a : 0x2d3d62);
  r2(fl, fx0, fy0 + fh - 8, fw, 2, 0x39d9ff, 0.35);
  const dx = STORAGE.door[0] * T, dy = STORAGE.door[1] * T;
  r2(fl, dx, dy, T, T, 0x2d3d62);
  for (let i = 0; i < 4; i++) { r2(fl, dx + i * 8, dy + 22, 4, 8, 0xffb340); r2(fl, dx + i * 8 + 4, dy + 22, 4, 8, 0x1a2238); }
  // wall face (north wall row y18): everything here sits just above the wall row, below the shelves and the player
  const wd = (STORAGE.y0) * T + 1, wl = scene.add.graphics().setDepth(wd), wy = 18 * T;
  // cyan wall screen (tiles 21-22): dark glass, frame, three stock bars, status light
  const sx = 21 * T + 2, sw = 2 * T - 4;
  r2(wl, sx, wy + 4, sw, 22, 0x8d99b3); r2(wl, sx + 2, wy + 6, sw - 4, 18, 0x06142a);
  [[0.8, 0x4dffb0], [0.5, 0x39d9ff], [0.3, 0xffb340]].forEach(([f, c], i) => { r2(wl, sx + 6, wy + 10 + i * 5, 14, 2, 0x16304f); r2(wl, sx + 6, wy + 10 + i * 5, Math.round(14 * (f as number)), 2, c as number); });
  r2(wl, sx + 26, wy + 9, 22, 1, 0x39d9ff, 0.7); r2(wl, sx + 26, wy + 13, 16, 1, 0x39d9ff, 0.5); r2(wl, sx + 26, wy + 17, 20, 1, 0x39d9ff, 0.35);
  const led = scene.add.graphics().setDepth(wd + 1); r2(led, sx + sw - 6, wy + 22, 3, 2, 0x4dffb0);
  scene.tweens.add({ targets: led, alpha: 0.25, duration: 900, yoyo: true, repeat: -1 });
  // NO FLAME sign (tile 23): crossed circle, same language as the kitchen
  const cx = 23 * T + 16, cy = wy + 12;
  wl.fillStyle(0xf3f6fa, 1); wl.fillCircle(cx, cy, 8);
  wl.fillStyle(0x23304a, 1); wl.fillTriangle(cx, cy - 5, cx - 3, cy + 2, cx + 3, cy + 2); wl.fillCircle(cx, cy + 3, 3);
  wl.lineStyle(2, 0xff4d5e, 1); wl.strokeCircle(cx, cy, 8); wl.beginPath(); wl.moveTo(cx - 6, cy + 6); wl.lineTo(cx + 6, cy - 6); wl.strokePath();
  // wall-mounted extinguisher (tile 24): red metal cylinder, nozzle, gauge, bracket, green safety plate
  const ex = 24 * T + 12;
  r2(wl, ex - 4, wy + 6, 4, 18, 0x8d99b3); r2(wl, ex + 8, wy + 6, 4, 18, 0x8d99b3);
  r2(wl, ex, wy + 8, 8, 18, 0xe03a3a); r2(wl, ex + 1, wy + 8, 2, 18, 0xff8a8a, 0.7); r2(wl, ex + 1, wy + 5, 6, 3, 0x2a3550); r2(wl, ex + 6, wy + 4, 4, 2, 0x2a3550);
  r2(wl, ex + 2, wy + 12, 4, 4, 0xf3f6fa); r2(wl, ex - 2, wy + 27, 12, 3, 0x4dffb0);
  // shelving units (blocked row y19): grey metal frame, two shelves of clear bins with snap lids and coloured tags
  const sh = scene.add.graphics().setDepth(STORAGE.y0 * T + T);
  STORAGE_BINS.forEach((b, i) => {
    const bx = (23 + i) * T, by = STORAGE.y0 * T;
    r2(sh, bx, by - 3, T, T + 3, 0x4a5876); r2(sh, bx + 1, by - 2, T - 2, T, 0x1a2540); // frame + dark back
    r2(sh, bx, by - 3, 2, T + 3, 0x8d99b3); r2(sh, bx + T - 2, by - 3, 2, T + 3, 0x8d99b3); r2(sh, bx, by - 3, T, 2, 0x8d99b3);
    for (const sy of [by + 12, by + 27]) r2(sh, bx + 1, sy, T - 2, 2, 0x8d99b3);
    for (const [bt, bh] of [[by - 1, 12], [by + 14, 12]] as const) {
      r2(sh, bx + 4, bt, T - 8, bh, 0xc9e8ff, 0.32); r2(sh, bx + 4, bt, T - 8, 3, 0xeaf6ff, 0.8); // clear body, white snap lid
      r2(sh, bx + 4, bt + 3, 1, bh - 3, 0xeaf6ff, 0.6); r2(sh, bx + T - 5, bt + 3, 1, bh - 3, 0xeaf6ff, 0.6);
      r2(sh, bx + 5, bt + 1, 3, 2, 0x8d99b3); r2(sh, bx + T - 8, bt + 1, 3, 2, 0x8d99b3); // latches
      r2(sh, bx + 10, bt + 5, 4, bh - 6, b.tag, 0.8); r2(sh, bx + 16, bt + 7, 5, bh - 8, 0xffffff, 0.45); // contents
    }
    r2(sh, bx + 10, by + 10, 12, 3, b.tag); // coloured tag plate
  });
  const lab = (txt: string, x: number, y: number, color: string, size: number) =>
    scene.add.text(x, y, txt, { fontFamily: 'Rajdhani, sans-serif', fontSize: size + 'px', fontStyle: '700', color, stroke: '#000', strokeThickness: 2, align: 'center', lineSpacing: -2 }).setOrigin(0.5).setAlpha(0.95).setResolution(2).setDepth(STORAGE.y0 * T + T + 1);
  STORAGE_BINS.forEach((b, i) => lab(b.name, (23 + i) * T + 16, STORAGE.y0 * T + 12, '#ffffff', 6));
  lab('STORAGE', 21 * T, STORAGE.y1 * T + 8, '#8ceaff', 9).setDepth(21 * T).setData('room', 'storage');
  lab('NO FLAME', 23 * T + 16, wy + 29, '#ff9fb2', 6).setDepth(wd + 1);
  lab('INVENTORY', 22 * T - 1, wy + 3, '#8ceaff', 6).setDepth(wd + 2);
  // popped lids: a lifted white lid plate on the upper bin plus a cyan glow from the open bin (hidden until opened)
  const lids = STORAGE_BINS.map((b, i) => {
    const g = scene.add.graphics().setDepth(STORAGE.y0 * T + T + 2).setVisible(false), bx = (23 + i) * T, by = STORAGE.y0 * T;
    r2(g, bx + 5, by - 1, T - 10, 8, 0x39d9ff, 0.55); r2(g, bx + 8, by + 1, T - 16, 4, 0xeaf6ff, 0.8); // light from inside the bin
    g.fillStyle(0xeaf6ff, 1); g.fillTriangle(bx + 4, by - 1, bx + T - 4, by - 1, bx + T - 6, by - 9); g.fillTriangle(bx + 4, by - 1, bx + T - 6, by - 9, bx + 6, by - 9); // lid swung up
    r2(g, bx + 6, by - 9, T - 12, 2, 0x8d99b3); return g;
  });
  storageArt = { setOpen: (i, open) => { lids[i]?.setVisible(open); } };
}
