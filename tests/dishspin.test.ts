import { describe, it, expect } from 'vitest';
import { dishSpin, DISH_TURN_MS, DISH_MIN_FACE } from '../src/core/dish';

describe('outdoor dish rotation (Step 26c)', () => {
  it('the bowl never goes edge-on thin and never exceeds full width', () => {
    for (let t = 0; t < DISH_TURN_MS * 2; t += 97) { const f = dishSpin(t).face; expect(f).toBeGreaterThanOrEqual(DISH_MIN_FACE - 1e-9); expect(f).toBeLessThanOrEqual(1 + 1e-9); }
  });
  it('is smooth: a tiny time step changes the pose only a little', () => {
    for (let t = 0; t < DISH_TURN_MS; t += 250) expect(Math.abs(dishSpin(t + 16).face - dishSpin(t).face)).toBeLessThan(0.02);
  });
  it('repeats every full turn and is deterministic', () => {
    expect(dishSpin(1234).face).toBeCloseTo(dishSpin(1234 + DISH_TURN_MS).face, 9);
    expect(dishSpin(777)).toEqual(dishSpin(777));
  });
  it('reduced motion holds one still pose', () => expect(dishSpin(0, true)).toEqual(dishSpin(9999, true)));
});
