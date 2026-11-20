import { describe, it, expect } from 'vitest';
import { AIRLOCK, newAirlock, stepAirlock, pressure, innerOpen, outerOpen, innerBlocks, outerBlocks, exposed, cycling, whereTile, type Airlock, type Where, type AirlockEvent } from '../src/core/airlock';

const run = (a: Airlock, secs: number, where: Where, can = true, dt = 0.05): AirlockEvent[] => { const ev: AirlockEvent[] = []; for (let t = 0; t < secs; t += dt) ev.push(...stepAirlock(a, dt, where, can)); return ev; };

describe('airlock: exit', () => {
  it('starts at habitat pressure, inner door open, outer door shut', () => {
    const a = newAirlock(); expect([a.phase, pressure(a), innerOpen(a), outerOpen(a)]).toEqual(['habitat', 1, 1, 0]);
    expect(innerBlocks(a)).toBe(false); expect(outerBlocks(a)).toBe(true);
  });
  it('stepping into the passage shuts the inner door FIRST, then depressurises, then opens the outer door', () => {
    const a = newAirlock(); stepAirlock(a, 0.05, 'inside', true); stepAirlock(a, 0.05, 'chamber', true);
    expect(a.phase).toBe('inner_closing'); expect(outerBlocks(a)).toBe(true);
    run(a, AIRLOCK.DOOR_S + 0.1, 'chamber');
    expect(a.phase).toBe('depressurising'); expect(innerOpen(a)).toBe(0); expect(innerBlocks(a)).toBe(true); expect(outerBlocks(a)).toBe(true);
    run(a, AIRLOCK.DEPRESS_S / 2, 'chamber'); expect(pressure(a)).toBeGreaterThan(0.3); expect(pressure(a)).toBeLessThan(0.7); expect(outerOpen(a)).toBe(0);
    const ev = run(a, AIRLOCK.DEPRESS_S / 2 + AIRLOCK.DOOR_S + 0.2, 'chamber');
    expect(ev).toContain('outer_opened'); expect(a.phase).toBe('mars'); expect([pressure(a), innerOpen(a), outerOpen(a)]).toEqual([0, 0, 1]); expect(outerBlocks(a)).toBe(false);
  });
  it('the pressure meter only ever falls during depressurising', () => {
    const a = newAirlock(); stepAirlock(a, 0.05, 'inside', true); run(a, AIRLOCK.DOOR_S + 0.1, 'chamber'); let last = 1;
    for (let i = 0; i < 200 && a.phase === 'depressurising'; i++) { stepAirlock(a, 0.05, 'chamber', true); const p = pressure(a); expect(p).toBeLessThanOrEqual(last + 1e-9); last = p; }
  });
  it('the inner door never opens while the outer door is open (never both)', () => {
    const a = newAirlock(); stepAirlock(a, 0.05, 'inside', true);
    for (let i = 0; i < 400; i++) { stepAirlock(a, 0.05, i < 300 ? 'chamber' : 'outside', true); expect(innerOpen(a) > 0 && outerOpen(a) > 0).toBe(false); }
  });
  it('the door behind you stays shut once you walk out', () => {
    const a = newAirlock(); stepAirlock(a, 0.05, 'inside', true); run(a, 12, 'chamber'); run(a, 5, 'outside');
    expect(a.phase).toBe('mars'); expect(innerOpen(a)).toBe(0);
  });
  it('a storm lock keeps the passage from cycling', () => {
    const a = newAirlock(); stepAirlock(a, 0.05, 'inside', true); run(a, 5, 'chamber', false); expect(a.phase).toBe('habitat');
  });
  it('standing in the passage right after respawn does nothing until the player has been inside', () => {
    const a = newAirlock(); a.armed = false; run(a, 3, 'chamber'); expect(a.phase).toBe('habitat');
    run(a, 0.2, 'inside'); run(a, 0.2, 'chamber'); expect(cycling(a)).toBe(true);
  });
});

describe('airlock: entry', () => {
  const outsideAirlock = () => { const a = newAirlock(true); return a; };
  it('stepping in from outside shuts the OUTER door, repressurises (meter rises), then opens the inner door', () => {
    const a = outsideAirlock(); run(a, 0.2, 'chamber');
    expect(a.phase).toBe('outer_closing'); expect(innerBlocks(a)).toBe(true);
    run(a, AIRLOCK.DOOR_S + 0.1, 'chamber'); expect(a.phase).toBe('pressurising'); expect(outerOpen(a)).toBe(0);
    let last = 0; for (let i = 0; i < 400 && a.phase === 'pressurising'; i++) { stepAirlock(a, 0.05, 'chamber', true); expect(pressure(a)).toBeGreaterThanOrEqual(last - 1e-9); last = pressure(a); }
    const ev = run(a, AIRLOCK.DOOR_S + 0.3, 'chamber'); expect(ev).toContain('inner_opened'); expect([a.phase, pressure(a), innerOpen(a), outerOpen(a)]).toEqual(['habitat', 1, 1, 0]);
  });
  it('after the inner door opens the passage does NOT cycle again until the player walks into the base and back', () => {
    const a = outsideAirlock(); run(a, 20, 'chamber'); expect(a.phase).toBe('habitat'); run(a, 3, 'chamber'); expect(a.phase).toBe('habitat');
    run(a, 0.2, 'inside'); run(a, 0.2, 'chamber'); expect(a.phase).toBe('inner_closing');
  });
  it('a player who stays in the depressurised passage is brought back in after the stuck time', () => {
    const a = newAirlock(); stepAirlock(a, 0.05, 'inside', true); for (let i = 0; i < 1000 && a.phase !== 'mars'; i++) stepAirlock(a, 0.05, 'chamber', true); expect(a.phase).toBe('mars');
    run(a, AIRLOCK.STUCK_S - 1, 'chamber'); expect(a.phase).toBe('mars'); run(a, 1.1, 'chamber'); expect(a.phase).toBe('outer_closing');
  });
  it('the inner door is solid from the moment it starts to close', () => {
    const a = newAirlock(); stepAirlock(a, 0.05, 'inside', true); stepAirlock(a, 0.05, 'chamber', true); expect(a.phase).toBe('inner_closing'); expect(innerBlocks(a)).toBe(true);
  });
  it('an airlock that finds the player back inside the base syncs to habitat pressure', () => {
    const a = newAirlock(true); stepAirlock(a, 0.05, 'inside', true); expect([a.phase, innerOpen(a)]).toEqual(['habitat', 1]);
  });
  it('an airlock that finds the player outside syncs to Mars pressure', () => {
    const a = newAirlock(); stepAirlock(a, 0.05, 'outside', true); expect(a.phase).toBe('mars');
  });
});

describe('airlock: exposure and tiles', () => {
  it('an unsuited player is exposed once the pressure drops, and stops being exposed when the passage is back to habitat', () => {
    const a = newAirlock(); expect(exposed(a)).toBe(false); stepAirlock(a, 0.05, 'inside', true); run(a, AIRLOCK.DOOR_S + 0.1, 'chamber'); expect(exposed(a)).toBe(false);
    run(a, 1.5, 'chamber'); expect(exposed(a)).toBe(true);
    run(a, 30, 'chamber'); expect(exposed(a)).toBe(false); // cycled back in by the stuck rule
  });
  it('tiles map to the right side of the doors', () => {
    expect(whereTile(15, 16)).toBe('inside'); expect(whereTile(15, 17)).toBe('chamber'); expect(whereTile(16, 18)).toBe('chamber');
    expect(whereTile(16, 19)).toBe('outside'); expect(whereTile(10, 12)).toBe('inside'); expect(whereTile(14, 18)).toBe('inside');
  });
});

import { meterBlocks, statusColor } from '../src/game/airlock';
describe('airlock panel meter (pixel loading bar)', () => {
  it('lights 8 blocks at habitat pressure and none at Mars, in between while cycling', () => {
    expect([meterBlocks(1), meterBlocks(0.5), meterBlocks(0)]).toEqual([8, 4, 0]);
    expect(meterBlocks(2)).toBe(8); expect(meterBlocks(-1)).toBe(0);
  });
  it('the status light is green in habitat air, amber while cycling, red at Mars pressure', () => {
    const a = newAirlock(); expect(statusColor(a)).toBe(0x4dffb0); stepAirlock(a, 0.05, 'inside', true); stepAirlock(a, 0.05, 'chamber', true); expect(statusColor(a)).toBe(0xffb340);
    expect(statusColor(newAirlock(true))).toBe(0xff5c5c);
  });
});
