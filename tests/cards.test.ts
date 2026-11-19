import { describe, it, expect } from 'vitest';
import { EP_EVENTS } from '../src/story/episode1';

// Step 20b: the two story decisions are three cards (benefit / cost / risk), the timeout choice has none.
describe('decision cards', () => {
  for (const id of ['storm_call', 'dish_decision']) {
    it(`${id}: every playable choice has benefit, cost and risk`, () => {
      const ev = EP_EVENTS.find(e => e.id === id)!;
      const playable = ev.choices.filter(c => c.id !== 'wait');
      expect(playable.length).toBeGreaterThanOrEqual(2);
      for (const c of playable) {
        expect(c.card?.benefit.length).toBeGreaterThan(5);
        expect(c.card?.cost.length).toBeGreaterThan(5);
        expect(c.card?.risk.length).toBeGreaterThan(5);
        for (const m of c.card?.meters ?? []) expect(['up', 'down']).toContain(m.dir);
      }
    });
  }
  it('storm call shows three cards', () => {
    const ev = EP_EVENTS.find(e => e.id === 'storm_call')!;
    expect(ev.choices.filter(c => c.id !== 'wait' && c.card)).toHaveLength(3);
  });
});
