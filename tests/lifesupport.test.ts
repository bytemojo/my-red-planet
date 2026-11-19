import { describe, it, expect } from 'vitest';
import { pickLifeSupportState, tankFill } from '../src/core/lifesupport';
import { WATER_MAKER_OFF } from '../src/core/icerun';

const st = (res: Partial<{ o2: number; water: number; food: number; power: number }> = {}, flags: Record<string, number> = {}) =>
  ({ res: { o2: 80, water: 70, food: 60, power: 50, ...res }, flags }) as any;

describe('life support art states (Step 26b)', () => {
  it('both machines run in normal play', () => expect(pickLifeSupportState(st())).toEqual({ o2On: true, waterOn: true }));
  it('the water maker is OFF while the ice-run story has it shut down, and the oxygen unit is not affected', () =>
    expect(pickLifeSupportState(st({}, { [WATER_MAKER_OFF]: 1 }))).toEqual({ o2On: true, waterOn: false }));
  it('the oxygen unit is OFF with no air or no power', () => {
    expect(pickLifeSupportState(st({ o2: 0 })).o2On).toBe(false);
    expect(pickLifeSupportState(st({ power: 0 })).o2On).toBe(false);
  });
  it('a low (but not empty) meter keeps the machine in its running art', () => expect(pickLifeSupportState(st({ o2: 10, power: 5 })).o2On).toBe(true));
  it('tank fill is clamped to 0..1 and safe for bad numbers', () => {
    expect(tankFill(0)).toBe(0); expect(tankFill(50)).toBe(0.5); expect(tankFill(100)).toBe(1);
    expect(tankFill(-20)).toBe(0); expect(tankFill(250)).toBe(1); expect(tankFill(NaN)).toBe(0);
  });
});
