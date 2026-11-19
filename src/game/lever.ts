// Step 16a: the solar-panel lever on the control module's east wall (indoors). Pull it to STOW or put the panels back OUT.
// Two art states: handle UP + cyan OUT light (panels out) / handle DOWN + amber STOWED light. Metal and plastic only.
import type Phaser from 'phaser';

const T = 32;
export const LEVER = { wallX: 17, y: 6, zone: 'lever', label: 'Panel Lever' } as const;
export const LEVER_ZONE = { x0: 16, y0: 6, x1: 16, y1: 7, label: LEVER.label, inside: true } as const;
/** Where the explorer stands (tile units). The lever is on the east wall, so the explorer faces right. */
export const LEVER_MARKER: [number, number] = [16.05, 6.65];
export const leverStand = () => ({ x: LEVER_MARKER[0] * T, y: LEVER_MARKER[1] * T });

export interface LeverArt { setStowed(on: boolean): void }

export function buildLever(scene: Phaser.Scene): LeverArt {
  const px = LEVER.wallX * T + 2, py = LEVER.y * T - 4, depth = (LEVER.y + 2) * T + 1;
  const g = scene.add.graphics().setDepth(depth);
  g.fillStyle(0x1d2740, 1); g.fillRect(px, py, 28, 46); g.lineStyle(1, 0x5f7fb0, 1); g.strokeRect(px + 0.5, py + 0.5, 27, 45);
  g.fillStyle(0x0b1428, 1); g.fillRect(px + 4, py + 14, 20, 4); // the slot the handle slides in
  g.fillStyle(0x8d99b3, 1); for (const [bx, by] of [[3, 3], [23, 3], [3, 41], [23, 41]]) g.fillRect(px + bx, py + by, 2, 2);
  scene.add.text(px + 14, py + 7, 'PANELS', { fontFamily: 'Rajdhani, sans-serif', fontSize: '6px', fontStyle: '700', color: '#8ceaff' }).setOrigin(0.5).setDepth(depth + 1).setResolution(2);
  const handle = scene.add.graphics().setDepth(depth + 1), light = scene.add.graphics().setDepth(depth + 1);
  let on: boolean | null = null;
  const draw = (stowed: boolean) => {
    handle.clear(); const hx = px + 14, hy = py + 16; // handle pivots at the slot: up = out, down = stowed
    handle.fillStyle(0x8d99b3, 1); handle.fillRect(hx - 1, stowed ? hy : hy - 11, 3, 11);
    handle.fillStyle(stowed ? 0xffb340 : 0x39d9ff, 1); handle.fillRect(hx - 3, stowed ? hy + 10 : hy - 13, 7, 4);
    light.clear(); light.fillStyle(stowed ? 0xffb340 : 0x39d9ff, 1); light.fillCircle(px + 14, py + 36, 3);
    light.fillStyle(0xffffff, 0.5); light.fillRect(px + 13, py + 35, 1, 1);
  };
  return { setStowed: s => { if (s === on) return; on = s; draw(s); } };
}
