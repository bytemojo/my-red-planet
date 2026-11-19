// Wall racks the explorer takes props from (and puts them back on). Data-driven.
// Step 3c: the racks live in the STORAGE room now (west wall x=18, and the north wall tile x=20).
// 'west' racks: the explorer stands on the floor tile east of the wall tile and faces left.
// 'north' racks: the explorer stands on the floor tile south of the wall tile (wallX = tile x, y = wall row). Art is original pixel graphics: metal and plastic, no wood or cloth.
import type Phaser from 'phaser';
import type { PropId } from '../core/inventory';

const T = 32;
export interface PropRack { zone: string; item: PropId; label: string; sign: string; wallX: number; y: number; wall?: 'west' | 'north' | 'stand' }
export const PROP_RACKS: readonly PropRack[] = [
  // Step 24f: the water can (sprinkler) stands on a small floor stand right next to the grow beds (tile x10,y7, beside bed 5), not in storage.
  { zone: 'rack_tool', item: 'sprinkler', label: 'Water Can Stand', sign: 'WATER', wallX: 10, y: 7, wall: 'stand' },
  { zone: 'rack_seed', item: 'seed_packet', label: 'Seed Drawer', sign: 'SEEDS', wallX: 18, y: 20 },
  { zone: 'rack_parts', item: 'spare_part', label: 'Spare Parts', sign: 'PARTS', wallX: 20, y: 18, wall: 'north' },
];
/** Interaction zone in tiles (covers the wall tile too, so tapping the rack walks to it). */
export const rackZone = (r: PropRack) => r.wall === 'stand'
  ? { x0: r.wallX, y0: r.y, x1: r.wallX, y1: r.y + 1, label: r.label, inside: true } // the stand tile and the floor tile in front of it
  : r.wall === 'north'
  ? { x0: r.wallX, y0: r.y, x1: r.wallX, y1: r.y + 1, label: r.label, inside: true }
  : { x0: r.wallX, y0: r.y, x1: r.wallX + 1, y1: r.y, label: r.label, inside: true };
/** Where the explorer stands (tile units, used as the tap/arrow marker). */
export const rackMarker = (r: PropRack): [number, number] => r.wall === 'north' || r.wall === 'stand' ? [r.wallX + 0.5, r.y + 1.55] : [r.wallX + 1.6, r.y + 0.55];
/** Stand-point in world pixels, and which way to face. */
export const rackStand = (r: PropRack) => { const [mx, my] = rackMarker(r); return { x: mx * T, y: my * T }; };
export const rackByZone = (zone: string) => PROP_RACKS.find(r => r.zone === zone);

export interface RackArt {
  /** Hide the prop on the rack while the explorer is holding it. */ setHeld(item: PropId | null): void;
  /** Step 15b: pulse a bright outline round the rack that holds this item (null = none). */ setHighlight(item: PropId | null): void;
}

export function buildPropRacks(scene: Phaser.Scene): RackArt {
  const shown: Record<string, Phaser.GameObjects.Image> = {}, glow: Record<string, Phaser.GameObjects.Graphics> = {};
  for (const r of PROP_RACKS) {
    if (r.wall === 'stand') { // a free-standing metal stand on the floor: base plate, post, shelf, label
      const sd = (r.y + 1) * T + 1, sx = r.wallX * T, sy = r.y * T, g = scene.add.graphics().setDepth(sd);
      g.fillStyle(0x1b2d4c, 1); g.fillRect(sx + 5, sy + 17, 22, 13); g.lineStyle(1, 0x39d9ff, 0.85); g.strokeRect(sx + 5.5, sy + 17.5, 21, 12);
      g.fillStyle(0x9fb4d6, 1); g.fillRect(sx + 3, sy + 15, 26, 3); g.fillStyle(0x5b6b8c, 1); g.fillRect(sx + 4, sy + 29, 24, 2);
      scene.add.text(sx + 16, sy + 24, r.sign, { fontFamily: 'Rajdhani, sans-serif', fontSize: '6px', fontStyle: '700', color: '#8ceaff' }).setOrigin(0.5).setDepth(sd + 1).setResolution(2);
      const gl = scene.add.graphics().setDepth(sd + 2).setVisible(false); gl.lineStyle(2, 0xffb340, 1); gl.strokeRoundedRect(sx + 1, sy + 1, 30, 31, 4); glow[r.item] = gl;
      scene.tweens.add({ targets: gl, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });
      shown[r.item] = scene.add.image(sx + 16, sy + 8, 'props', r.item).setDepth(sd + 1);
      continue;
    }
    const north = r.wall === 'north', depth = (r.y + 1) * T + 1, px = r.wallX * T + 2, py = north ? r.y * T + 1 : r.y * T - 12, g = scene.add.graphics().setDepth(depth);
    g.fillStyle(0x1b2d4c, 1); g.fillRoundedRect(px, py, 28, 30, 3); g.lineStyle(1, 0x39d9ff, 0.85); g.strokeRoundedRect(px + 0.5, py + 0.5, 27, 29, 3);
    if (r.item === 'sprinkler') { g.fillStyle(0x9fb4d6, 1); g.fillRect(px + 3, py + 5, 22, 2); g.fillRect(px + 3, py + 24, 22, 2); g.fillStyle(0xffb340, 1); g.fillRect(px + 5, py + 7, 2, 4); g.fillRect(px + 21, py + 7, 2, 4); }
    if (r.item === 'seed_packet') { g.fillStyle(0x5b6b8c, 1); g.fillRect(px + 3, py + 16, 22, 11); g.fillStyle(0x39d9ff, 1); g.fillRect(px + 11, py + 20, 6, 2); g.fillStyle(0x2f8f4a, 1); g.fillRect(px + 4, py + 17, 3, 2); }
    if (r.item === 'spare_part') { g.fillStyle(0xe8eef8, 0.22); g.fillRect(px + 3, py + 13, 22, 14); g.lineStyle(1, 0xe8eef8, 0.8); g.strokeRect(px + 3.5, py + 13.5, 21, 13); g.fillStyle(0xe8eef8, 0.9); g.fillRect(px + 3, py + 12, 22, 2); }
    scene.add.text(px + 14, py + 4, r.sign, { fontFamily: 'Rajdhani, sans-serif', fontSize: '6px', fontStyle: '700', color: '#8ceaff' }).setOrigin(0.5).setDepth(depth + 1).setResolution(2);
    const gl = scene.add.graphics().setDepth(depth + 2).setVisible(false); gl.lineStyle(2, 0xffb340, 1); gl.strokeRoundedRect(px - 2, py - 2, 32, 34, 4); glow[r.item] = gl;
    scene.tweens.add({ targets: gl, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });
    shown[r.item] = scene.add.image(px + 14, py + 16, 'props', r.item).setDepth(depth + 1);
  }
  return { setHeld: item => { for (const k of Object.keys(shown)) shown[k].setVisible(k !== item); }, setHighlight: item => { for (const k of Object.keys(glow)) glow[k].setVisible(k === item); } };
}
