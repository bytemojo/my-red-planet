import { describe, expect, it } from 'vitest';
import { newSession } from '../src/core/session';
import { endSol } from '../src/core/sim';
import { CREW_IDS } from '../src/core/crewlife';
import { GAME_REWARD, gameRefusal, gameReward, rewardTaken } from '../src/core/games';

const fresh = () => newSession(7, { mode: 'storm', quick: true }).state;
const avg = (s: ReturnType<typeof fresh>) => CREW_IDS.reduce((a, id) => a + s.crew[id].morale, 0) / CREW_IDS.length;

describe('Step 18b: rec-room game reward', () => {
  it('a win gives more morale than a draw, and a draw more than a loss; every crew member gets it', () => {
    const gains = (['win', 'draw', 'loss'] as const).map(o => { const s = fresh(); CREW_IDS.forEach(id => (s.crew[id].morale = 50)); gameReward(s, 'checkers', o); return CREW_IDS.map(id => s.crew[id].morale - 50); });
    expect(gains[0].every(g => g === GAME_REWARD.win)).toBe(true);
    expect(GAME_REWARD.win).toBeGreaterThan(GAME_REWARD.draw); expect(GAME_REWARD.draw).toBeGreaterThan(GAME_REWARD.loss); expect(GAME_REWARD.loss).toBeGreaterThan(0);
    expect(gains[2].every(g => g === GAME_REWARD.loss)).toBe(true);
  });
  it('only ONE reward per Sol: a second game gives nothing and costs no energy', () => {
    const s = fresh(); CREW_IDS.forEach(id => (s.crew[id].morale = 50));
    const a = gameReward(s, 'checkers', 'win'), m1 = avg(s), e1 = s.energy;
    const b = gameReward(s, 'checkers', 'win');
    expect(a.applied).toBe(true); expect(b.applied).toBe(false); expect(avg(s)).toBe(m1); expect(s.energy).toBe(e1);
    expect(rewardTaken(s)).toBe(true);
  });
  it('the reward comes back the next Sol', () => {
    const s = fresh(); gameReward(s, 'checkers', 'loss'); expect(rewardTaken(s)).toBe(true);
    endSol(s); expect(rewardTaken(s)).toBe(false); expect(gameReward(s, 'chess', 'win').applied).toBe(true);
  });
  it('costs a little energy once, writes a journal line, and caps morale at 100', () => {
    const s = fresh(); CREW_IDS.forEach(id => (s.crew[id].morale = 99)); const e = s.energy, n = s.log.length;
    gameReward(s, 'checkers', 'win');
    expect(s.energy).toBe(e - GAME_REWARD.ENERGY); expect(s.log.length).toBe(n + 1); expect(s.log[0].text).toMatch(/checkers/); expect(s.crew.reyes.morale).toBe(100);
  });
  it('refuses when too tired or outside, with no mention of the suit', () => {
    const s = fresh(); expect(gameRefusal(s)).toBeNull();
    s.energy = 0; expect(gameRefusal(s)).toMatch(/tired/i); s.energy = 50; s.outside = true; expect(gameRefusal(s)).toMatch(/inside/i);
    expect(gameRefusal(s)!.toLowerCase()).not.toContain('suit');
  });
});
