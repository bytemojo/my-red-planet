import { describe, expect, it } from 'vitest';
import { newSession } from '../src/core/session';
import { bestAndTip, consequenceLines } from '../src/story/consequences';
import type { GameState } from '../src/core/types';

const fresh = (): GameState => { const s = newSession(5, { mode: 'storm', quick: true }).state; s.pending = null; return s; };

describe('Step 22b: mission screen text', () => {
  it('comms vs dish: each branch names what you got and what it cost', () => {
    const s = fresh(); s.flags.dish_choice = 'comms';
    let t = consequenceLines(s).find(l => l.topic === 'Comms or dish')!.text; expect(t).toMatch(/comms console/); expect(t).toMatch(/water/);
    s.flags.dish_choice = 'dish';
    t = consequenceLines(s).find(l => l.topic === 'Comms or dish')!.text; expect(t).toMatch(/dish/); expect(t).toMatch(/static/);
    delete s.flags.dish_choice; expect(consequenceLines(s).some(l => l.topic === 'Comms or dish')).toBe(false);
  });
  it('manual vs automatic watering', () => {
    const s = fresh();
    s.wateringMode = 'automatic'; expect(consequenceLines(s).find(l => l.topic === 'Watering')!.text).toMatch(/automatically/);
    s.wateringMode = 'manual'; expect(consequenceLines(s).find(l => l.topic === 'Watering')!.text).toMatch(/by hand/);
  });
  it('panel plan reuses the story tree text, and is left out when no panel choice was made', () => {
    const s = fresh(); expect(consequenceLines(s).some(l => l.topic === 'Panel plan')).toBe(false);
    s.ep!.tree.push({ id: 'p1', sol: 2, kind: 'choice', tag: 'panels', tone: 'mixed', text: 'You stowed the panels during the storm.' });
    expect(consequenceLines(s).find(l => l.topic === 'Panel plan')!.text).toBe('You stowed the panels during the storm.');
  });
  it('no line mentions the suit', () => {
    const s = fresh(); s.flags.dish_choice = 'dish';
    const all = [...consequenceLines(s).map(l => l.text), ...(['morale', 'health', 'plants', 'energy', 'sustainability'] as const).flatMap(id => { const m = { morale: 50, health: 50, plants: 50, energy: 50, sustainability: 50, [id]: 0 }; const r = bestAndTip(m); return [r.best.text, r.tip.text]; })];
    expect(all.join(' ')).not.toMatch(/suit|eva/i);
  });
  it('best = highest measure, tip = lowest, deterministic on ties', () => {
    const r = bestAndTip({ morale: 40, health: 90, plants: 70, energy: 55, sustainability: 20 });
    expect(r.best.id).toBe('health'); expect(r.tip.id).toBe('sustainability'); expect(r.best.label).toBe('Player Health');
    const t = bestAndTip({ morale: 50, health: 50, plants: 50, energy: 50, sustainability: 50 });
    expect(t.best.id).toBe('morale'); expect(t.tip.id).toBe('sustainability');
  });
});
