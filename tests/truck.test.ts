import { describe, expect, it } from 'vitest';
import { TRUCK, canEnter, charge, drive, driveSecondsLeft, newTruckState, park } from '../src/core/truck';
import { newGame, SAVE_VERSION } from '../src/core/sim';
import { migrateState } from '../src/core/session';
import { buildLayout, H, W } from '../src/game/layout';

const run = (t: ReturnType<typeof newTruckState>, secs: number, step: number, f: typeof drive) => { for (let i = 0; i < Math.round(secs / step); i++) t = f(t, step); return t; };

describe('Step 28f: Mars truck core', () => {
  it('starts full and parked', () => { expect(newTruckState()).toEqual({ energy: 100, driving: false }); });
  it('constants: 120 s of driving, 300 s of charging', () => { expect(TRUCK.DRIVE_SECONDS).toBe(120); expect(TRUCK.CHARGE_SECONDS).toBe(300); });
  it('a full charge lasts exactly 120 s of driving, whatever the step size', () => {
    for (const step of [1, 0.5, 1 / 60, 0.1]) {
      let t = newTruckState(); const before = run(t, 119, step, drive);
      expect(before.energy).toBeGreaterThan(0); expect(before.driving).toBe(true);
      t = run(t, 120, step, drive); expect(t.energy).toBe(0); expect(t.driving).toBe(false);
    }
    expect(drive(newTruckState(), 120).energy).toBe(0);
  });
  it('at 0 energy driving does nothing and never goes negative', () => {
    const t = drive({ energy: 0, driving: false }, 5); expect(t).toEqual({ energy: 0, driving: false });
    expect(drive({ energy: 0.5, driving: true }, 50).energy).toBe(0);
  });
  it('parked and idle: 0 to full in exactly 300 s, capped at 100', () => {
    for (const step of [1, 0.5, 1 / 60]) {
      const t = run({ energy: 0, driving: false }, 300, step, charge); expect(t.energy).toBe(100);
      expect(run({ energy: 0, driving: false }, 150, step, charge).energy).toBeCloseTo(50, 6);
    }
    expect(charge({ energy: 99, driving: false }, 600).energy).toBe(100);
  });
  it('no charging while driving; parking makes it charge again', () => {
    const d = { energy: 40, driving: true }; expect(charge(d, 100)).toEqual(d);
    const p = park(d); expect(p.driving).toBe(false); expect(charge(p, 30).energy).toBe(50);
  });
  it('driveSecondsLeft rounds up and is 120 when full, 0 when empty', () => {
    expect(driveSecondsLeft(newTruckState())).toBe(120); expect(driveSecondsLeft({ energy: 0, driving: false })).toBe(0);
    expect(driveSecondsLeft({ energy: 50, driving: false })).toBe(60); expect(driveSecondsLeft(drive(newTruckState(), 1))).toBe(119);
  });
  it('the truck can never enter the base: every indoor tile, wall, the airlock door and apron and the storage annex are blocked', () => {
    const L: any = buildLayout();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (L.inside[y][x]) expect(canEnter({ x, y }), `${x},${y}`).toBe(false);
    for (const t of [{ x: 15, y: 18 }, { x: 16, y: 18 }, { x: 15, y: 19 }, { x: 16, y: 20 }, { x: 20, y: 20 }, { x: 28, y: 21 }]) expect(canEnter(t), `${t.x},${t.y}`).toBe(false);
  });
  it('open outdoor ground (solar field edge, truck bay, rover and cave areas) is allowed', () => {
    for (const t of [{ x: 34, y: 31 }, { x: 39, y: 27 }, { x: 34, y: 23 }, { x: 45, y: 10 }, { x: 12, y: 24 }]) expect(canEnter(t), `${t.x},${t.y}`).toBe(true);
  });
  it('save version 8 holds truck energy and an old save (v7) migrates to a full, parked truck', () => {
    expect(SAVE_VERSION).toBe(8);
    const s = newGame(); s.truck = { energy: 37.5, driving: false };
    const back = migrateState(JSON.parse(JSON.stringify(s))); expect(back?.truck).toEqual({ energy: 37.5, driving: false });
    const old: any = JSON.parse(JSON.stringify(newGame())); old.version = 7; delete old.truck;
    const m: any = migrateState(old); expect(m.version).toBe(8); expect(m.truck).toEqual({ energy: 100, driving: false });
  });
});
