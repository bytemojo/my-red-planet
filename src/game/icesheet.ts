// Step 21b: the candidate ice sheet (outside, west pocket) and the water-maker intake (life support, under the WATER MAKER label).
// Original pixel art, metal/plastic/ice only. The sheet shows only during the ice run; the intake lamp blinks amber while the maker is OFF.
import type Phaser from 'phaser';
const T = 32;
export const ICE_SHEET = { zone: 'ice', label: 'Candidate Ice Sheet', x0: 2, y0: 22, x1: 3, y1: 24 } as const;
export const ICE_ZONE = { x0: 2, y0: 22, x1: 3, y1: 24, label: ICE_SHEET.label, inside: false } as const;
export const ICE_MARKER: [number, number] = [3, 23.5];
export const INTAKE = { zone: 'intake', label: 'Water Maker Intake', tx: 24, ty: 4 } as const;
export const INTAKE_ZONE = { x0: 25, y0: 5, x1: 26, y1: 5, label: INTAKE.label, inside: true } as const;
export const INTAKE_MARKER: [number, number] = [25.5, 5.6];

export interface IceArt { update(iceRun: boolean, collected: boolean, makerOff: boolean, nowMs: number): void; shards(): { x: number; y: number } }

export function buildIceSheet(scene: Phaser.Scene): IceArt {
  // --- the sheet: a pale patch with cracks and glints, plus a pulsing marker outline while it is the objective ---
  const x = ICE_SHEET.x0 * T, y = ICE_SHEET.y0 * T, w = 2 * T, h = 3 * T;
  const sheet = scene.add.graphics().setDepth(1);
  sheet.fillStyle(0xcfeeff, 0.92); sheet.fillRoundedRect(x + 4, y + 8, w - 8, h - 16, 10);
  sheet.fillStyle(0x9fd8f2, 1); sheet.fillRoundedRect(x + 10, y + 22, w - 22, h - 46, 8);
  sheet.lineStyle(1, 0x4aa8d8, 1); for (const [a, b, c, d] of [[14, 20, 30, 44], [30, 44, 26, 64], [30, 44, 50, 52], [44, 14, 40, 36], [16, 70, 36, 78]]) { sheet.beginPath(); sheet.moveTo(x + a, y + b); sheet.lineTo(x + c, y + d); sheet.strokePath(); }
  sheet.fillStyle(0xffffff, 1); for (const [a, b] of [[18, 16], [46, 30], [24, 58], [50, 70], [36, 86]]) sheet.fillRect(x + a, y + b, 2, 2);
  const ring = scene.add.graphics().setDepth(1);
  const label = scene.add.text(x + w / 2, y - 4, 'CANDIDATE ICE', { fontFamily: 'Rajdhani, sans-serif', fontSize: '7px', fontStyle: '700', color: '#8ceaff' }).setOrigin(0.5, 1).setDepth(40 * T).setResolution(2);
  // --- the intake: a clear hopper with a funnel on the water maker's face + a status lamp ---
  const px = INTAKE.tx * T + 4, py = INTAKE.ty * T + 2, depth = (INTAKE.ty + 1) * T + 1;
  const hop = scene.add.graphics().setDepth(depth);
  hop.fillStyle(0x1d2740, 1); hop.fillRect(px, py, 24, 28); hop.lineStyle(1, 0x5f7fb0, 1); hop.strokeRect(px + 0.5, py + 0.5, 23, 27);
  hop.fillStyle(0xbfe8ff, 0.35); hop.fillTriangle(px + 3, py + 4, px + 21, py + 4, px + 12, py + 18); hop.lineStyle(1, 0x8ceaff, 1); hop.strokeTriangle(px + 3, py + 4, px + 21, py + 4, px + 12, py + 18);
  hop.fillStyle(0x8d99b3, 1); hop.fillRect(px + 10, py + 18, 4, 6);
  scene.add.text(px + 12, py + 30, 'INTAKE', { fontFamily: 'Rajdhani, sans-serif', fontSize: '5px', fontStyle: '700', color: '#8ceaff' }).setOrigin(0.5, 0).setDepth(depth + 1).setResolution(2);
  const lamp = scene.add.graphics().setDepth(depth + 1);
  return {
    update(iceRun, collected, makerOff, now) {
      sheet.setVisible(iceRun); label.setVisible(iceRun && !collected);
      ring.clear(); if (iceRun && !collected) { ring.lineStyle(2, 0x8ceaff, 0.45 + 0.4 * Math.abs(Math.sin(now / 420))); ring.strokeRoundedRect(x + 2, y + 6, w - 4, h - 12, 12); }
      lamp.clear(); const blink = !makerOff || Math.floor(now / 450) % 2 === 0;
      lamp.fillStyle(makerOff ? 0xff8a3a : 0x39d9ff, blink ? 1 : 0.25); lamp.fillCircle(px + 20, py + 24, 2.5);
    },
    shards: () => ({ x: x + w / 2, y: y + h / 2 }),
  };
}
