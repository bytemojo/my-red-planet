// Step 24h: where the crew may stand and walk. Pure (no Phaser), so it can be tested against the REAL collision grid.
// Crew obey the same tile grid as the player (layout.ts buildLayout().blocked): no walking through tables, beds or machines.
import { pathToClosestReachable } from './pathfinding';
import type { CrewId } from '../core/types';

export const T = 32;
export type Blocked = (x: number, y: number) => boolean;
export interface Tile { x: number; y: number }
export type Rand = () => number;
export type Rect = [number, number, number, number];

export const tileOfPx = (x: number, y: number): Tile => ({ x: Math.floor(x / T), y: Math.floor(y / T) });
export const centerOfTile = (t: Tile): { x: number; y: number } => ({ x: (t.x + 0.5) * T, y: (t.y + 0.5) * T });
export const isFreeTile = (blocked: Blocked, w: number, h: number, x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && !blocked(x, y);

// After the quarantine ends, each person works somewhere in the base during the day (tile units: x0, y0, x1, y1).
export const CREW_WORK: Record<CrewId, Rect> = {
  reyes: [18.8, 6.6, 27.2, 8.4], aiko: [7.5, 5.6, 11.5, 6.4], david: [19, 10.6, 27, 11.7], sofia: [18.8, 13.6, 27.2, 15.4],
};

// A random FREE tile inside a work rectangle, or null when the rectangle has no free floor.
export function pickWorkTile(rect: Rect, blocked: Blocked, w: number, h: number, rand: Rand): Tile | null {
  const free: Tile[] = [];
  for (let y = Math.floor(rect[1]); y <= Math.floor(rect[3]); y++) for (let x = Math.floor(rect[0]); x <= Math.floor(rect[2]); x++) if (isFreeTile(blocked, w, h, x, y)) free.push({ x, y });
  return free.length ? free[Math.min(free.length - 1, Math.floor(rand() * free.length))] : null;
}

// Tile route from where the sprite stands to a target tile. The grid path (4-neighbour BFS) only ever steps onto free tiles, so a straight
// walk between two consecutive tile centres stays on free floor. If the target cannot be reached the route ends at the closest reachable tile.
export function routeTo(fromPx: { x: number; y: number }, target: Tile, blocked: Blocked, w: number, h: number): Tile[] {
  const start = tileOfPx(fromPx.x, fromPx.y);
  if (start.x < 0 || start.y < 0 || start.x >= w || start.y >= h) return [];
  return pathToClosestReachable(w, h, start, target, blocked).path;
}

// Hungry crew PACE: 3 to 4 tiles back and forth along free floor in a straight line. Returns the waypoints [B, A, B, A] (A = where they stand),
// or null when no straight free lane of at least 3 tiles starts here.
export const PACE_MIN = 3, PACE_MAX = 4;
export function paceRoute(from: Tile, blocked: Blocked, w: number, h: number, rand: Rand): Tile[] | null {
  if (!isFreeTile(blocked, w, h, from.x, from.y)) return null;
  const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
  const first = Math.floor(rand() * dirs.length);
  for (let len = PACE_MAX; len >= PACE_MIN; len--) {
    for (let k = 0; k < dirs.length; k++) {
      const d = dirs[(first + k) % dirs.length];
      let ok = true;
      for (let i = 1; i <= len && ok; i++) ok = isFreeTile(blocked, w, h, from.x + d.x * i, from.y + d.y * i);
      if (ok) { const B = { x: from.x + d.x * len, y: from.y + d.y * len }; return [B, from, B, from]; }
    }
  }
  return null;
}

// ---- the quarantine rooms (drawn by hand in quarters.ts, so their furniture is described here as data and tested) ----
// Spots inside a room, as [dx from the room's left edge, absolute y of the feet].
export const SPOT = { window: [46, 478], mid: [46, 492], rug: [48, 522], bedside: [44, 548], chair: [44, 470], bed: [19, 566] } as const;
export type SpotName = keyof typeof SPOT;
export const WANDER: SpotName[] = ['window', 'mid', 'rug', 'bedside'];
export const WALK_SPOTS: SpotName[] = ['window', 'mid', 'rug', 'bedside'];       // spots a person STANDS on (the chair and bed are sat on / lain on)
// The pacing lane: one straight line, 3 tiles long, with no furniture on it.
export const PACE_LANE = { dx: 46, yTop: 476, yBottom: 572 } as const;
// Furniture boxes relative to the room's left edge: [x0, y0, x1, y1]. Matches drawRoom().
export const ROOM_FURNITURE: Record<string, Rect> = { bed: [4, 494, 36, 570], desk: [54, 430, 70, 468], chair: [32, 436, 50, 470], item: [55, 544, 71, 567] };
// A standing sprite's feet cover about 12 x 6 px.
export const footprint = (x: number, y: number): Rect => [x - 6, y - 6, x + 6, y];
export const rectsOverlap = (a: Rect, b: Rect) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

export type CrewPhase = { hungry: boolean; wasHungry: boolean; night: boolean; act: string; atWork: boolean };
// When must a crew member choose a new activity RIGHT NOW (besides when the current one ran out)? Hunger only counts when it CHANGES:
// it used to re-fire every frame for a hungry person standing still, which made them flicker and restart their route.
export function needsNewActivity(p: CrewPhase): boolean {
  if (p.hungry !== p.wasHungry) return true;
  if (p.night && !p.atWork && p.act !== 'sleep' && p.act !== 'read') return true;
  if (!p.night && p.act === 'sleep') return true;
  return false;
}
