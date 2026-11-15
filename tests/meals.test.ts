import { describe, expect, it } from 'vitest';
import { act, newGame } from '../src/core/sim';

describe('Episode 1 kitchen tray', () => {
  it('charges hydration, heater power, energy and limited NASA meal stock only for a full five-portion tray', () => {
    const s = newGame(7, { mode: 'storm' });
    s.crew.reyes.hunger = 80;
    const before = { water: s.res.water, power: s.res.power, energy: s.energy };
    const tray = ['eggs', 'oatmeal', 'soup', 'chicken', 'mac'];
    expect(act(s, 'cook_serve', { tray: JSON.stringify(tray) }).ok).toBe(true);
    expect(s.res.water).toBeCloseTo(before.water - 0.6);
    expect(s.res.power).toBe(before.power - 5);
    expect(s.energy).toBe(before.energy - 6);
    expect(s.flags.meal_eggs).toBe(7);
    expect(s.crew.reyes.hunger).toBe(0);
    expect(s.health).toBe(100);
  });

  it('does not spend supplies if the tray is incomplete or the heater cannot be powered', () => {
    const s = newGame(8, { mode: 'storm' });
    s.crew.reyes.hunger = 80;
    expect(act(s, 'cook_serve', { tray: JSON.stringify(['chicken']) }).ok).toBe(false);
    expect(s.flags.meal_chicken).toBeUndefined();
    s.res.power = 1;
    expect(act(s, 'cook_serve', { tray: JSON.stringify(['chicken', 'chicken', 'chicken', 'chicken', 'chicken']) }).msg).toMatch(/power/i);
    expect(s.flags.meal_chicken).toBeUndefined();
  });
});
