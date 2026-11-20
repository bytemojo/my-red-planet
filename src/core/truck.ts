// Step 28f: the Mars truck, pure rules (no Phaser, no DOM). Art is 28g, driving is 28h.
// Energy 0..100. A full charge lasts exactly TRUCK.DRIVE_SECONDS of driving; solar charging fills it from 0 in TRUCK.CHARGE_SECONDS,
// but ONLY while the truck is parked and idle (not driving). The truck can never enter the base: the whole base footprint and the airlock apron are blocked for it.
import type { TruckState } from './types';

export const TRUCK = { MAX: 100, DRIVE_SECONDS: 120, CHARGE_SECONDS: 300 } as const;
export const TRUCK_DRAIN_PER_S = TRUCK.MAX / TRUCK.DRIVE_SECONDS;
export const TRUCK_CHARGE_PER_S = TRUCK.MAX / TRUCK.CHARGE_SECONDS;

/** Tile rectangles [x, y, w, h] the truck may never enter: base walls and rooms (x4-39, y2-18), the storage annex (x18-29, y19-21), and the airlock apron south of the door. */
export const TRUCK_BLOCKED_RECTS: readonly [number, number, number, number][] = [
  [4, 2, 36, 17],   // the whole base, walls included (greenhouse, kitchen, life support, comms, rec room, gym, lab, bath, corridor)
  [18, 19, 12, 3],  // storage annex
  [13, 19, 6, 2],   // airlock apron: the door tiles (15-16, 18) open onto it, people walk here, the truck does not
];

export const newTruckState = (): TruckState => ({ energy: TRUCK.MAX, driving: false });

const clampE = (e: number) => (e <= 1e-6 ? 0 : e >= TRUCK.MAX - 1e-6 ? TRUCK.MAX : e); // full precision; only values within a hair of empty/full snap, so many tiny steps still hit exactly 0 and 100

/** Can the truck stand on this tile? (Base footprint rule only; rocks and the map edge are the collision grid's job in 28h.) */
export function canEnter(tile: { x: number; y: number }): boolean {
  return !TRUCK_BLOCKED_RECTS.some(([x, y, w, h]) => tile.x >= x && tile.x < x + w && tile.y >= y && tile.y < y + h);
}

/** Drive for dt seconds. Needs energy; at 0 the truck stops (driving false), no damage. */
export function drive(t: TruckState, dt: number): TruckState {
  if (!(dt > 0) || t.energy <= 0) return { energy: clampE(t.energy), driving: false };
  const energy = clampE(t.energy - TRUCK_DRAIN_PER_S * dt);
  return { energy, driving: energy > 0 };
}

/** The driver stops (or gets out): the truck is parked and idle. */
export const park = (t: TruckState): TruckState => ({ energy: t.energy, driving: false });

/** Solar charging for dt seconds. Does nothing while driving. */
export function charge(t: TruckState, dt: number): TruckState {
  if (t.driving || !(dt > 0)) return t;
  return { energy: clampE(t.energy + TRUCK_CHARGE_PER_S * dt), driving: false };
}

/** Whole seconds of driving left on the current energy (for the HUD bar text). */
export const driveSecondsLeft = (t: TruckState): number => Math.ceil(clampE(t.energy) / TRUCK_DRAIN_PER_S - 1e-9) || 0; // || 0 turns -0 into 0

// ----- Step 28h: driving (pure) -----
// The truck is sealed: the driver needs no suit. Energy only drains while the driver is actually moving; with no input the truck is parked and idle (solar charging works).
// At 0 energy it simply stops (empty: true), no damage and no failure. While keys are held on an empty battery it does NOT charge, so it never stutters.
export const TRUCK_SPEED = 150;        // px per second (the walking explorer is 86 outside)
export const TRUCK_HALF_W = 24;        // collision half width in px (the art is wider; the tyres may overhang rocks a little)
export const TRUCK_REACH = 56;         // px: how close the explorer must stand to climb in
export const TRUCK_TILE = 32;

export interface TruckPos { x: number; y: number; facing: 1 | -1 }
export interface DriveResult { truck: TruckState; pos: TruckPos; moving: boolean; /** the battery is empty and the driver tried to move */ empty: boolean }

/** True when the truck's ground box at feet position (x, y) touches a blocked tile. `gridBlocked(tx, ty)` is the collision grid (true off the map). Base footprint rule comes from canEnter. */
export function truckBlocked(gridBlocked: (tx: number, ty: number) => boolean, x: number, y: number): boolean {
  const pts: [number, number][] = [[-TRUCK_HALF_W, -6], [TRUCK_HALF_W, -6], [-TRUCK_HALF_W, 2], [TRUCK_HALF_W, 2], [0, -6], [0, 2]];
  return pts.some(([ox, oy]) => { const tx = Math.floor((x + ox) / TRUCK_TILE), ty = Math.floor((y + oy) / TRUCK_TILE); return gridBlocked(tx, ty) || !canEnter({ x: tx, y: ty }); });
}

/** One frame of driving. `input` is the raw direction (keys and joystick, any length); `blocked(x, y)` says whether the truck may stand there. */
export function stepTruck(t: TruckState, pos: TruckPos, input: { dx: number; dy: number }, dt: number, blocked: (x: number, y: number) => boolean): DriveResult {
  let dx = input.dx, dy = input.dy; const m = Math.hypot(dx, dy);
  if (!(dt > 0) || m < 0.1) return { truck: charge(park(t), dt), pos, moving: false, empty: false }; // parked and idle: solar charging
  if (m > 1) { dx /= m; dy /= m; }
  if (t.energy <= 0) return { truck: park(t), pos, moving: false, empty: true };                      // empty: stop gently, no damage, no charge while keys are held
  const truck = drive(t, dt);
  let { x, y } = pos; const nx = x + dx * TRUCK_SPEED * dt, ny = y + dy * TRUCK_SPEED * dt;
  if (!blocked(nx, y)) x = nx; if (!blocked(x, ny)) y = ny;
  const moved = x !== pos.x || y !== pos.y;
  const facing: 1 | -1 = Math.abs(dx) > 0.2 ? (dx < 0 ? -1 : 1) : pos.facing;
  return { truck: moved ? truck : { energy: t.energy, driving: false }, pos: { x, y, facing }, moving: moved, empty: false }; // pushing against a rock costs nothing
}

export const nearTruck = (px: number, py: number, pos: { x: number; y: number }): boolean => Math.hypot(px - pos.x, py - pos.y) <= TRUCK_REACH;

/** Where the explorer steps out: the first free spot around the truck (right door side first). `free(x, y)` is the explorer's own collision test. Null = nowhere (caller keeps the driver in the cab). */
export function exitSpot(pos: { x: number; y: number; facing: 1 | -1 }, free: (x: number, y: number) => boolean): { x: number; y: number } | null {
  const f = pos.facing, c: [number, number][] = [[-f * 40, 14], [f * 40, 14], [0, 24], [-f * 40, -6], [f * 40, -6], [0, -22], [-f * 56, 24], [f * 56, 24]];
  for (const [ox, oy] of c) if (free(pos.x + ox, pos.y + oy)) return { x: pos.x + ox, y: pos.y + oy };
  return null;
}

/** HUD text for the truck energy bar while driving: time left at the current charge (m:ss). */
export const truckBarText = (t: TruckState): string => { const s = driveSecondsLeft(t); return `TRUCK: ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} left`; };
