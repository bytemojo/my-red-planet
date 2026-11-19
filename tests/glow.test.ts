import { describe, expect, it } from 'vitest';
import { FAIL } from '../src/core/constants';
import { GLOW_OBJECTS, METER_GLOW, glowAlpha, glowingObjects, lowMeters } from '../src/game/glow';
import { CLICK_BOXES } from '../src/game/layout';

const res = (o: Partial<Record<'o2' | 'water' | 'food' | 'power', number>> = {}) => ({ o2: 80, water: 80, food: 80, power: 80, ...o });
describe('low meter glows only its own object (Step 24k)', () => {
  it('nothing glows when every meter is fine', () => { expect(glowingObjects(res())).toEqual([]); });
  it('each meter maps to the right object(s)', () => {
    expect(glowingObjects(res({ water: 5 })).sort()).toEqual(['water_maker', 'water_pump']);
    expect(glowingObjects(res({ o2: 5 }))).toEqual(['oxygen_unit']);
    expect(glowingObjects(res({ power: 5 }))).toEqual(['power_unit']);
    expect(glowingObjects(res({ food: 5 }))).toEqual(['food_bin']);
  });
  it('other objects are not glowing (no leak between meters)', () => {
    const g = glowingObjects(res({ water: FAIL.RESOURCE_WARN })); expect(g).not.toContain('oxygen_unit'); expect(g).not.toContain('food_bin'); expect(g).not.toContain('power_unit');
    expect(lowMeters(res({ water: FAIL.RESOURCE_WARN + 1 }))).toEqual([]); // just above the threshold: no glow
  });
  it('it stops when the meter recovers; two low meters glow both', () => {
    expect(glowingObjects(res({ food: 3, o2: 3 })).sort()).toEqual(['food_bin', 'oxygen_unit']); expect(glowingObjects(res({ food: 60 }))).toEqual([]);
  });
  it('the map only names known objects, and every object belongs to one meter', () => {
    const used = Object.values(METER_GLOW).flat(); for (const id of used) expect(GLOW_OBJECTS[id]).toBeTruthy(); expect(new Set(used).size).toBe(used.length); expect(Object.keys(GLOW_OBJECTS).sort()).toEqual([...used].sort());
  });
  it('oxygen unit and water maker boxes match the life-support click boxes', () => { expect(CLICK_BOXES.ls).toContainEqual(GLOW_OBJECTS.oxygen_unit.tiles); expect(CLICK_BOXES.ls).toContainEqual(GLOW_OBJECTS.water_maker.tiles); });
  it('the pulse is slow (2 s cycle), soft, and steady with reduced motion', () => {
    expect(glowAlpha(0)).toBeCloseTo(glowAlpha(2000)); expect(glowAlpha(1000)).toBeGreaterThan(glowAlpha(0)); expect(glowAlpha(1000)).toBeLessThanOrEqual(0.7); expect(glowAlpha(123, true)).toBe(glowAlpha(999, true));
  });
});
