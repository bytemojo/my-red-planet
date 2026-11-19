import { describe, it, expect } from 'vitest';
import { daylight, NIGHT_FLOOR, INDOOR_TINT_ALPHA, OUTDOOR_LIGHTS, lightAlpha } from '../src/game/daylight';
import { SOLAR_PANEL_ORIGINS } from '../src/game/solar-panel-layout';

const hours = Array.from({ length: 241 }, (_, i) => i / 10);
describe('outdoor daylight (Step 26d)', () => {
  it('brightness never drops below the night floor, even in a dust storm', () => {
    for (const h of hours) for (const dust of [0, 0.5, 1]) expect(daylight(h, dust).brightness).toBeGreaterThanOrEqual(NIGHT_FLOOR - 1e-9);
  });
  it('midday is full brightness and night is noticeably darker', () => {
    expect(daylight(12, 0).brightness).toBe(1);
    expect(daylight(23, 0).brightness).toBeLessThan(0.6);
  });
  it('is the same for the same hour and smooth across the 24 -> 0 boundary', () => {
    expect(daylight(7.3, 0.2)).toEqual(daylight(7.3, 0.2));
    expect(daylight(23.999, 0).alpha).toBeCloseTo(daylight(0, 0).alpha, 2);
    for (let i = 1; i < hours.length; i++) expect(Math.abs(daylight(hours[i], 0).alpha - daylight(hours[i - 1], 0).alpha)).toBeLessThan(0.09);
  });
  it('lamps are off by day, full at night, and a dusty noon does not light them', () => {
    expect(daylight(12, 0).lamp).toBe(0); expect(daylight(23, 0).lamp).toBe(1); expect(daylight(12, 1).lamp).toBe(0);
    const l = OUTDOOR_LIGHTS[0]; expect(lightAlpha(l, 0, 1000)).toBe(0); expect(lightAlpha(l, 1, 1000)).toBeGreaterThan(0);
  });
  it('inside rooms never change with the hour', () => expect(INDOOR_TINT_ALPHA).toBe(0));
  it('has lights for every solar panel, the dish and the base corners, with unique ids', () => {
    expect(OUTDOOR_LIGHTS.filter(l => l.kind === 'solar').length).toBe(SOLAR_PANEL_ORIGINS.length);
    expect(OUTDOOR_LIGHTS.some(l => l.kind === 'dish')).toBe(true);
    expect(OUTDOOR_LIGHTS.filter(l => l.kind === 'corner').length).toBeGreaterThanOrEqual(3);
    expect(new Set(OUTDOOR_LIGHTS.map(l => l.id)).size).toBe(OUTDOOR_LIGHTS.length);
  });
});
