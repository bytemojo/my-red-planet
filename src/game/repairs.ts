// Step 13b: BROKEN art overlays for the comms console, microwave and electric heater (the repaired art is the normal art underneath).
// Broken = dark cracked screen / dead coil, amber blinking light, loose cable. Metal and plastic only; sparks elsewhere are cyan, never fire.
import type Phaser from 'phaser';
import { KITCHEN } from './layout';
import { isBroken, type MachineId } from '../core/inventory';
import type { GameState } from '../core/types';

const T = 32;
const K0 = KITCHEN.x0 * T;
/** Where the explorer stands to repair each machine (world px) and which way the machine is. */
export const MACHINE_STAND: Record<MachineId, { x: number; y: number; face: 'left' | 'right' }> = {
  comms: { x: 21.4 * T, y: 15.55 * T, face: 'right' },
  microwave: { x: (KITCHEN.x0 + 0.4) * T, y: 8.6 * T, face: 'left' },
  heater: { x: (KITCHEN.x0 + 0.4) * T, y: 8.6 * T, face: 'left' },
};
const RING_AT: Record<MachineId, [number, number]> = { comms: [21.5 * T, 16 * T - 52], microwave: [K0 + 21, 6 * T - 14], heater: [K0 + 16, 7 * T - 12] };

export interface RepairArt { sync(s: Pick<GameState, 'flags'>): void; setRing(id: MachineId, p: number | null): void }

export function buildRepairArt(scene: Phaser.Scene): RepairArt {
  const mk = (depth: number, draw: (g: Phaser.GameObjects.Graphics) => void, light: [number, number]) => {
    const g = scene.add.graphics().setDepth(depth); draw(g);
    const dot = scene.add.circle(light[0], light[1], 2.5, 0xffb340, 1).setDepth(depth + 1);
    scene.tweens.add({ targets: dot, alpha: 0.15, duration: 520, yoyo: true, repeat: -1 });
    return { g, dot, set(b: boolean) { g.setVisible(b); dot.setVisible(b); } };
  };
  const rect = (g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, c: number, a = 1) => { g.fillStyle(c, a); g.fillRect(x, y, w, h); };
  const crack = (g: Phaser.GameObjects.Graphics, pts: [number, number][]) => { g.lineStyle(1, 0xffb340, 0.9); g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.strokePath(); };
  const cable = (g: Phaser.GameObjects.Graphics, x: number, y: number) => { g.lineStyle(2, 0x4a5876, 1); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 3, y + 6); g.lineTo(x + 1, y + 12); g.strokePath(); rect(g, x - 1, y + 12, 4, 3, 0xffb340); };
  const parts: Record<MachineId, ReturnType<typeof mk>> = {
    comms: mk(17 * T + 2, g => { // dead cracked console screen
      const x = 20 * T + 16, y = 16 * T - 40, w = 3 * T - 32, h = 22;
      rect(g, x, y, w, h, 0x0a0f1c); rect(g, x + 2, y + 1, w - 4, 1, 0x39475f);
      crack(g, [[x + 18, y], [x + 28, y + 9], [x + 22, y + 14], [x + 40, y + 22]]); crack(g, [[x + 28, y + 9], [x + 50, y + 5]]);
      rect(g, x + 36, y + 16, 22, 1, 0xffb340, 0.8); cable(g, 23 * T - 24, 16 * T - 16);
    }, [20 * T + 8, 16 * T - 12]),
    microwave: mk(7 * T + 2, g => { // blank cavity, cracked glass, dead display
      rect(g, K0 + 9, 6 * T - 1, 17, 12, 0x05090f); crack(g, [[K0 + 12, 6 * T - 1], [K0 + 17, 6 * T + 5], [K0 + 15, 6 * T + 10]]); crack(g, [[K0 + 17, 6 * T + 5], [K0 + 24, 6 * T + 3]]);
      rect(g, K0 + 28, 6 * T - 1, 7, 5, 0x0a0f1c); rect(g, K0 + 29, 6 * T + 1, 5, 1, 0xffb340, 0.8); cable(g, K0 + 34, 6 * T + 14);
    }, [K0 + 33, 6 * T + 8]),
    heater: mk(8 * T + 2, g => { // cold grey coil, loose cable
      rect(g, K0 + 7, 7 * T + 2, 18, 9, 0x101a32); g.lineStyle(2, 0x4a5876, 1); g.strokeCircle(K0 + 16, 7 * T + 6, 4.2); g.lineStyle(1, 0x4a5876, 1); g.strokeCircle(K0 + 16, 7 * T + 6, 2.2);
      crack(g, [[K0 + 10, 7 * T + 3], [K0 + 14, 7 * T + 7], [K0 + 12, 7 * T + 10]]); cable(g, K0 + 5, 7 * T + 13);
    }, [K0 + 26, 7 * T + 13]),
  };
  const ring = scene.add.graphics().setDepth(9 * T);
  return {
    sync: s => { for (const id of Object.keys(parts) as MachineId[]) parts[id].set(isBroken(s, id)); },
    setRing: (id, p) => {
      ring.clear(); if (p === null) return;
      const [cx, cy] = RING_AT[id], rad = 8, a0 = -Math.PI / 2;
      ring.lineStyle(3, 0x143a56, 0.9); ring.beginPath(); ring.arc(cx, cy, rad, 0, Math.PI * 2); ring.strokePath();
      ring.lineStyle(3, 0x8ceaff, 1); ring.beginPath(); ring.arc(cx, cy, rad, a0, a0 + Math.PI * 2 * Math.max(0.001, Math.min(1, p))); ring.strokePath();
    },
  };
}
