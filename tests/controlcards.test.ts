import { describe, expect, it } from 'vitest';
import { newGame } from '../src/core/sim';
import { breakMachine } from '../src/core/inventory';
import { ICON } from '../src/ui/icons';
import { levelOf, nowNext, systemCards } from '../src/story/controlcards';

const g = () => { const s = newGame(1, { mode: 'storm' }); s.pending = null; return s; };
describe('control module system cards (Step 25b)', () => {
  it('shows the six systems plus food and you, each with an icon, a meter 0-100, a level and one line', () => {
    const cards = systemCards(g()); const ids = cards.map(c => c.id);
    for (const id of ['life', 'power', 'water', 'comms', 'radiation', 'solar']) expect(ids).toContain(id);
    for (const c of cards) { expect(ICON[c.icon]).toBeTruthy(); expect(c.value).toBeGreaterThanOrEqual(0); expect(c.value).toBeLessThanOrEqual(100); expect(['ok', 'warn', 'crit']).toContain(c.level); expect(c.line.length).toBeGreaterThan(3); expect(c.line.length).toBeLessThan(40); }
  });
  it('levels follow the HUD cut-offs', () => { expect(levelOf(10)).toBe('crit'); expect(levelOf(30)).toBe('warn'); expect(levelOf(80)).toBe('ok'); });
  it('low air makes the life support card go red; a broken comms console shows crit', () => {
    const s = g(); s.res.o2 = 10; expect(systemCards(s).find(c => c.id === 'life')!.level).toBe('crit');
    expect(systemCards(g()).find(c => c.id === 'comms')!.level).toBe('ok'); const t = g(); breakMachine(t, 'comms'); expect(systemCards(t).find(c => c.id === 'comms')!.level).toBe('crit');
  });
  it('the food card shows Sols, never portions; the NOW strip has text in an episode', () => {
    expect(systemCards(g()).find(c => c.id === 'food')!.line).toBe('FOOD: 180 Sols left'); expect(nowNext(g()).now.length).toBeGreaterThan(3);
  });
});
