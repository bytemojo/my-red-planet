// Airlock art (Phaser drawing only; the rules live in src/core/airlock.ts). The passage is the 2x2 tiles x15-16, y17-18.
// INNER door on the north edge (next to the suit rack side of the corridor), OUTER door on the south edge. Each door has a wall PANEL with a pixel
// pressure meter (8 blocks, a loading bar that drains while the passage depressurises and fills while it repressurises), a status light and HAB / MARS ends.
// Metal and glass only. The meter shows NO numbers (no invented data).
import Phaser from 'phaser';
import { AIRLOCK_TILES, cycling, innerOpen, outerOpen, pressure, type Airlock } from '../core/airlock';

const T = 32;
// A 3x5 pixel font for the two meter ends (only the letters HAB and MARS need).
const GLYPH: Record<string, string[]> = { H: ['101', '101', '111', '101', '101'], A: ['010', '101', '111', '101', '101'], B: ['110', '101', '110', '101', '110'], M: ['101', '111', '111', '101', '101'], R: ['110', '101', '110', '101', '101'], S: ['011', '100', '010', '001', '110'] };
const word = (g: Phaser.GameObjects.Graphics, w: string, x: number, y: number, c: number) => { [...w].forEach((ch, i) => GLYPH[ch].forEach((row, j) => [...row].forEach((bit, k) => { if (bit === '1') r2(g, x + i * 4 + k, y + j, 1, 1, c); }))); };
const r2 = (g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, c: number, a = 1) => { g.fillStyle(c, a); g.fillRect(Math.round(x), Math.round(y), w, h); };
const DX0 = AIRLOCK_TILES.x0 * T, DX1 = (AIRLOCK_TILES.x1 + 1) * T;       // the doorway spans 64 px
const INNER_Y = AIRLOCK_TILES.y0 * T - 6, OUTER_Y = (AIRLOCK_TILES.y1 + 1) * T - 6;

export const METER_BLOCKS = 8;
/** How many of the 8 meter blocks are lit for a pressure of 0..1. Full habitat = 8, Mars = 0. Pure, so it can be tested. */
export const meterBlocks = (p: number): number => Math.round(Math.max(0, Math.min(1, p)) * METER_BLOCKS);
/** Status light colour: green = habitat air, amber = cycling, red = Mars pressure. */
export const statusColor = (a: Airlock): number => cycling(a) ? 0xffb340 : pressure(a) >= 1 ? 0x4dffb0 : 0xff5c5c;

export interface AirlockArt { update(a: Airlock, timeMs: number): void }
export function buildAirlock(scene: Phaser.Scene): AirlockArt {
  const inner = scene.add.graphics().setDepth(AIRLOCK_TILES.y0 * T + 4);
  const outer = scene.add.graphics().setDepth((AIRLOCK_TILES.y1 + 1) * T + 4);
  const panelIn = scene.add.graphics().setDepth((AIRLOCK_TILES.y1 + 1) * T + 3);   // on the east wall tile (17,17), beside the inner door (above the wall row below it)
  const panelOut = scene.add.graphics().setDepth((AIRLOCK_TILES.y1 + 1) * T + 5);  // on the west wall tile (14,18), beside the outer door
  const sign = (x: number, y: number) => { const g = scene.add.graphics().setDepth(19 * T + 7); r2(g, x, y, 22, 5, 0x15110a); for (let k = 0; k < 11; k++) r2(g, x + k * 2, y, 1, 5, k % 2 ? 0x15110a : 0xe8b923); }; // small hazard strip under each panel

  const door = (g: Phaser.GameObjects.Graphics, y0: number, open: number) => {
    g.clear();
    const top = y0 - 8, h = 14, leaf = Math.round(((DX1 - DX0) / 2 - 5) * (1 - open)) + 3; // each leaf shrinks into the wall as the door opens
    r2(g, DX0, top, DX1 - DX0, 3, 0x2a3550); r2(g, DX0, top, 3, h, 0x2a3550); r2(g, DX1 - 3, top, 3, h, 0x2a3550); // lintel + frame posts
    for (const left of [true, false]) {
      const x = left ? DX0 + 3 : DX1 - 3 - leaf;
      r2(g, x, top + 3, leaf, h - 3, 0x8d99b3); r2(g, x, top + 3, leaf, 2, 0xdfe6f2);
      if (leaf > 8) { const ex = left ? x + leaf - 4 : x; for (let k = 0; k < 4; k++) r2(g, ex, top + 5 + k * 3, 4, 2, k % 2 ? 0x15110a : 0xe8b923); } // hazard stripes on the leading edges
    }
  };
  const panel = (g: Phaser.GameObjects.Graphics, px: number, py: number, a: Airlock, blink: boolean) => {
    g.clear();
    r2(g, px, py, 32, 27, 0x0a1428); r2(g, px, py, 32, 1, 0x39d9ff); r2(g, px, py + 26, 32, 1, 0x39d9ff); r2(g, px, py, 1, 27, 0x39d9ff); r2(g, px + 31, py, 1, 27, 0x39d9ff); // housing
    const col = statusColor(a), on = !cycling(a) || blink;
    r2(g, px + 3, py + 3, 4, 4, 0x1a2540); if (on) r2(g, px + 3, py + 3, 4, 4, col);                                  // status light (amber blinks while cycling)
    r2(g, px + 10, py + 4, 19, 1, 0x39d9ff, 0.5); r2(g, px + 10, py + 7, 12, 1, 0x39d9ff, 0.25);                       // tiny readout lines
    const lit = meterBlocks(pressure(a));
    for (let i = 0; i < METER_BLOCKS; i++) { // loading bar: left = HAB end, right = MARS end. Blocks go dark from the right as the pressure falls.
      const x = px + 4 + i * 3, c = i < 3 ? 0xff7a4d : i < 5 ? 0xffb340 : 0x39d9ff;
      r2(g, x, py + 10, 2, 8, 0x16213a); if (i < lit) { r2(g, x, py + 10, 2, 8, c); r2(g, x, py + 10, 2, 2, 0xdff9ff, 0.55); }
    }
    word(g, 'HAB', px + 2, py + 20, 0x8ceaff); word(g, 'MARS', px + 15, py + 20, 0xff9a7a);
  };
  sign(14 * T + 5, 19 * T - 2); sign(17 * T + 5, 18 * T + 1);
  let key = '';
  return {
    update(a, timeMs) {
      const blink = Math.floor(timeMs / 350) % 2 === 0, io = innerOpen(a), oo = outerOpen(a), p = meterBlocks(pressure(a));
      const k = `${io.toFixed(2)}|${oo.toFixed(2)}|${p}|${a.phase}|${cycling(a) ? blink : 0}`;
      if (k === key) return; key = k;
      door(inner, INNER_Y, io); door(outer, OUTER_Y, oo);
      panel(panelIn, 17 * T, 17 * T + 2, a, blink); panel(panelOut, 14 * T, 18 * T + 2, a, blink);
    },
  };
}
