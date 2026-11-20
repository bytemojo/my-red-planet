import { describe, expect, it } from 'vitest';
import { TRUCK, TRUCK_HALF_W, TRUCK_SPEED, canEnter, exitSpot, nearTruck, newTruckState, stepTruck, truckBarText, truckBlocked, type TruckPos } from '../src/core/truck';

const open = () => false; // no rocks anywhere
const free = (_x: number, _y: number) => false; // truck may stand anywhere
const start: TruckPos = { x: 40 * 32, y: 40 * 32, facing: 1 };

describe('Step 28h: driving the truck', () => {
  it('a full charge drives exactly 120 seconds, then stops with no damage', () => {
    let t = newTruckState(), pos = start, seconds = 0, empty = false;
    for (let i = 0; i < 60 * 130; i++) { const r = stepTruck(t, pos, { dx: 0, dy: -1 }, 1 / 60, free); t = r.truck; pos = r.pos; if (r.moving) seconds += 1 / 60; empty ||= r.empty; }
    expect(seconds).toBeCloseTo(TRUCK.DRIVE_SECONDS, 0);
    expect(t.energy).toBe(0); expect(t.driving).toBe(false); expect(empty).toBe(true);
  });
  it('drives at TRUCK_SPEED, diagonals are not faster', () => {
    const a = stepTruck(newTruckState(), start, { dx: 1, dy: 0 }, 1, free).pos, b = stepTruck(newTruckState(), start, { dx: 5, dy: 5 }, 1, free).pos;
    expect(a.x - start.x).toBeCloseTo(TRUCK_SPEED, 5);
    expect(Math.hypot(b.x - start.x, b.y - start.y)).toBeCloseTo(TRUCK_SPEED, 5);
  });
  it('an empty truck does not move and does not charge while keys are held', () => {
    const r = stepTruck({ energy: 0, driving: false }, start, { dx: 1, dy: 0 }, 1, free);
    expect(r.moving).toBe(false); expect(r.empty).toBe(true); expect(r.truck.energy).toBe(0); expect(r.pos).toEqual(start);
  });
  it('idle (no input) charges 0 to full in 300 s; driving never charges', () => {
    let t = { energy: 0, driving: false };
    for (let i = 0; i < 300; i++) t = stepTruck(t, start, { dx: 0, dy: 0 }, 1, free).truck;
    expect(t.energy).toBe(TRUCK.MAX);
    const d = stepTruck({ energy: 50, driving: false }, start, { dx: 1, dy: 0 }, 1, free).truck;
    expect(d.energy).toBeLessThan(50);
  });
  it('a blocked move costs nothing and slides along the free axis', () => {
    const wallEast = (x: number) => x > start.x + 10; // blocked beyond 10 px east
    const r = stepTruck(newTruckState(), start, { dx: 1, dy: 1 }, 0.1, wallEast);
    expect(r.pos.x).toBe(start.x); expect(r.pos.y).toBeGreaterThan(start.y); // slid south
    const stuck = stepTruck(newTruckState(), start, { dx: 1, dy: 0 }, 1, wallEast);
    expect(stuck.moving).toBe(false); expect(stuck.truck.energy).toBe(TRUCK.MAX);
  });
  it('faces the way it drives and keeps the facing when driving up or down', () => {
    expect(stepTruck(newTruckState(), start, { dx: -1, dy: 0 }, 0.1, free).pos.facing).toBe(-1);
    expect(stepTruck(newTruckState(), { ...start, facing: -1 }, { dx: 0, dy: 1 }, 0.1, free).pos.facing).toBe(-1);
  });
  it('the truck can never enter the base, the annex or the airlock apron', () => {
    for (const [x, y] of [[10, 10], [24, 20], [15, 19], [35, 3], [4, 2], [39, 18]]) expect(canEnter({ x, y })).toBe(false);
    expect(truckBlocked(open, 10 * 32 + 16, 10 * 32 + 16)).toBe(true);
    expect(truckBlocked(open, 34.5 * 32, 32 * 32)).toBe(false); // the truck bay pad
    // drive north from the bay on open ground: it stops at the base wall line (y 19 tiles) and never gets in
    let t = newTruckState(), pos: TruckPos = { x: 24 * 32, y: 30 * 32, facing: 1 };
    for (let i = 0; i < 60 * 60; i++) { const r = stepTruck({ ...t, energy: 100 }, pos, { dx: 0, dy: -1 }, 1 / 60, (x, y) => truckBlocked(open, x, y)); pos = r.pos; }
    expect(pos.y).toBeGreaterThanOrEqual(22 * 32 - 2); // annex is y19-21: stopped just south of it
    expect(canEnter({ x: Math.floor(pos.x / 32), y: Math.floor((pos.y - 6) / 32) })).toBe(true);
  });
  it('rocks and the map edge (the collision grid) stop the truck too', () => {
    const grid = (tx: number, ty: number) => tx < 0 || ty < 0 || tx >= 64 || ty >= 44 || (tx === 41 && ty === 40);
    expect(truckBlocked(grid, 41 * 32 + 16, 40 * 32 + 16)).toBe(true);
    expect(truckBlocked(grid, 5, 41 * 32)).toBe(true); // off the west edge (half width overhang)
    expect(truckBlocked(grid, 50 * 32, 41 * 32)).toBe(false);
    expect(TRUCK_HALF_W).toBeLessThan(32); // can pass a gap two tiles wide
  });
  it('the explorer steps out onto the first free spot, or stays in if there is none', () => {
    const p = { x: 500, y: 500, facing: 1 as const };
    const first = exitSpot(p, () => true)!; expect(first).toEqual({ x: 460, y: 514 });
    const second = exitSpot(p, (x) => x > 500)!; expect(second.x).toBeGreaterThan(500);
    expect(exitSpot(p, () => false)).toBeNull();
  });
  it('near the truck within reach only', () => {
    expect(nearTruck(500, 520, { x: 500, y: 500 })).toBe(true); expect(nearTruck(500, 600, { x: 500, y: 500 })).toBe(false);
  });
  it('bar text is minutes and seconds left', () => {
    expect(truckBarText(newTruckState())).toBe('TRUCK: 2:00 left');
    expect(truckBarText({ energy: 50, driving: true })).toBe('TRUCK: 1:00 left');
    expect(truckBarText({ energy: 0, driving: false })).toBe('TRUCK: 0:00 left');
  });
});
