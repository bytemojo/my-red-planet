import { describe, expect, it } from 'vitest';
import { act, endSol } from '../src/core/sim';
import { newSession } from '../src/core/session';
import { GYM, MACHINES, gymNight, outsideDrainFactor } from '../src/core/gym';
import { describePending, resolve } from '../src/core/director';
import type { GameState } from '../src/core/types';

const quick = () => { const s = newSession(5, { mode: 'storm', quick: true }).state; s.health = 80; return s; };
const clearStory = (s: GameState) => { let n = 0; while (s.pending && n++ < 8) { const v = describePending(s)!; resolve(s, v.choices.find(c => !c.disabled && c.id !== 'wait')?.id ?? 'continue'); } };

describe('gym: the daily exercise rule', () => {
  it('each machine costs a different amount of energy and gives a different boost', () => {
    const e = [MACHINES.bands, MACHINES.bike, MACHINES.rower];
    expect(e[0].energy).toBeLessThan(e[1].energy); expect(e[1].energy).toBeLessThan(e[2].energy);
    expect(e[0].health).toBeLessThan(e[2].health);
    const s = quick(), e0 = s.energy, h0 = s.health;
    expect(act(s, 'workout', { machine: 'rower' }).ok).toBe(true);
    expect(s.energy).toBe(e0 - MACHINES.rower.energy); expect(s.health).toBe(h0 + MACHINES.rower.health);
  });
  it('skipping a day lowers health, with a morning message', () => {
    const s = quick(); const h = s.health; const msg = gymNight(s);
    expect(s.health).toBe(h + GYM.SKIPPED); expect(msg).toMatch(/skipped/);
  });
  it('one or two workouts is the sweet spot', () => {
    const s = quick(); act(s, 'workout', { machine: 'bands' }); const h = s.health;
    gymNight(s); expect(s.health).toBe(h + GYM.SWEET);
  });
  it('overtraining (3+) costs health right away and overnight', () => {
    const s = quick(); act(s, 'workout', { machine: 'bands' }); act(s, 'workout', { machine: 'bands' });
    const h = s.health; const r = act(s, 'workout', { machine: 'bands' });
    expect(r.msg).toMatch(/Too much/); expect(s.health).toBe(h + GYM.OVER_NOW);
    const h2 = s.health; const msg = gymNight(s); expect(s.health).toBe(h2 + GYM.OVERTRAINED); expect(msg).toMatch(/Too much/);
  });
  it('the morning report tells you about yesterday\'s workout', () => {
    const s = quick(); clearStory(s); s.pending = null; s.hour = 23;
    const rep = endSol(s);
    expect(rep.lines.some(l => /workout/.test(l))).toBe(true);
  });
  it('a healthier explorer loses health more slowly outside', () => {
    expect(outsideDrainFactor(100)).toBeLessThan(outsideDrainFactor(20));
  });
  it('workouts cannot happen without enough energy', () => {
    const s = quick(); s.energy = 3; expect(act(s, 'workout', { machine: 'bike' }).ok).toBe(false);
  });
});

describe('science lab', () => {
  it('studying the plants costs energy, helps plant health, once per Sol', () => {
    const s = quick(); const h = s.plots[0].health!, e = s.energy;
    expect(act(s, 'study_plants').ok).toBe(true);
    expect(s.plots[0].health).toBeGreaterThan(h); expect(s.energy).toBeLessThan(e);
    expect(act(s, 'study_plants').ok).toBe(false);
  });
});
