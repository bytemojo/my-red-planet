import { describe, expect, it } from 'vitest';
import { act, endSol, newGame } from '../src/core/sim';
import { describePending, resolve } from '../src/core/director';
import { BOTANIST, heartsOf } from '../src/core/crewlife';
import { unlockedCrops } from '../src/core/inventory';
import { AOKI_TOPICS, aokiChoice, aokiHint, aokiTalk, allCropsUnlocked } from '../src/story/aoki';
import { ACTION_ENERGY } from '../src/core/constants';
import { deserialize, newSession, serialize } from '../src/core/session';
import type { GameState } from '../src/core/types';

const dismissAll = (s: GameState) => { let n = 0; while (s.pending && n++ < 5) { const v = describePending(s)!; resolve(s, v.choices[0]?.id ?? 'continue'); } };
const fresh = () => { const s = newGame(7); dismissAll(s); s.energy = 100; return s; };

describe('Step 10b: botanist topics', () => {
  it('has at least 6 topics with two choices, two replies and a fact', () => {
    expect(AOKI_TOPICS.length).toBeGreaterThanOrEqual(6);
    for (const t of AOKI_TOPICS) { expect(t.choices).toHaveLength(2); expect(t.replies.every(r => r.length > 20)).toBe(true); expect(t.fact.length).toBeGreaterThan(10); }
    expect(new Set(AOKI_TOPICS.map(t => t.id)).size).toBe(AOKI_TOPICS.length);
  });
  it('a topic costs energy, gives one heart and is remembered', () => {
    const s = fresh(), h0 = heartsOf(s, BOTANIST), e0 = s.energy;
    const r = act(s, 'aoki_talk', { topic: 'light', choice: '1' });
    expect(r.ok).toBe(true);
    expect(e0 - s.energy).toBe(ACTION_ENERGY.aoki_talk);
    expect(heartsOf(s, BOTANIST)).toBe(h0 + 1);
    expect(aokiChoice(s, 'light')).toBe(1);
  });
  it('refuses a finished topic, unknown topics, bad choices and no energy', () => {
    const s = fresh();
    expect(act(s, 'aoki_talk', { topic: 'light', choice: '0' }).ok).toBe(true);
    const e = s.energy;
    expect(act(s, 'aoki_talk', { topic: 'light', choice: '0' }).ok).toBe(false);
    expect(act(s, 'aoki_talk', { topic: 'nope', choice: '0' }).ok).toBe(false);
    expect(act(s, 'aoki_talk', { topic: 'soil', choice: '5' }).ok).toBe(false);
    expect(s.energy).toBe(e);
    s.energy = 1;
    expect(act(s, 'aoki_talk', { topic: 'soil', choice: '0' }).ok).toBe(false);
    expect(aokiChoice(s, 'soil')).toBeNull();
  });
  it('only the first new topic each Sol earns a heart', () => {
    const s = fresh(), h0 = heartsOf(s, BOTANIST);
    act(s, 'aoki_talk', { topic: 'light', choice: '0' });
    act(s, 'aoki_talk', { topic: 'soil', choice: '0' });
    expect(heartsOf(s, BOTANIST)).toBe(h0 + 1);
    expect(aokiChoice(s, 'soil')).toBe(0);                    // still read, just no extra heart
    endSol(s); dismissAll(s); s.energy = 100;
    const h1 = heartsOf(s, BOTANIST);
    act(s, 'aoki_talk', { topic: 'water', choice: '0' });
    expect(heartsOf(s, BOTANIST)).toBe(h1 + 1);
  });
  it('hearts open crops: tomato at 2, carrot+spinach at 4, wheat at 5; unlock listed once', () => {
    const s = fresh(); s.crew[BOTANIST].friendship = 1; s.flags.tmp_aoki_heart = false;
    const r = aokiTalk(s, 'light', 0);
    expect(r.unlocked).toEqual(['tomato']);
    expect(unlockedCrops(s)).toContain('tomato');
    s.flags.tmp_aoki_heart = false; s.crew[BOTANIST].friendship = 3;
    expect(aokiTalk(s, 'soil', 0).unlocked.sort()).toEqual(['carrot', 'spinach']);
    s.flags.tmp_aoki_heart = false;
    expect(allCropsUnlocked(s)).toBe(false);                 // 4 hearts: wheat still locked
    expect(aokiTalk(s, 'water', 0).unlocked).toEqual(['wheat']);
    expect(allCropsUnlocked(s)).toBe(true);
    s.flags.tmp_aoki_heart = false;
    expect(aokiTalk(s, 'roots', 0).unlocked).toEqual([]);   // nothing opens twice, hearts stay capped
    expect(heartsOf(s, BOTANIST)).toBe(5);
  });
  it('the hint says how many hearts the next crop needs', () => {
    const s = fresh(); s.crew[BOTANIST].friendship = 0;
    expect(aokiHint(s)).toContain('2 hearts');
    s.crew[BOTANIST].friendship = 3; s.flags.unlock_tomato = true;
    expect(aokiHint(s)).toContain('4 hearts');
  });
  it('finished topics and unlocks survive save and load', () => {
    const sess = newSession(3); dismissAll(sess.state); sess.state.energy = 100;
    sess.state.crew[BOTANIST].friendship = 1;
    act(sess.state, 'aoki_talk', { topic: 'beans', choice: '1' });
    const back = deserialize(serialize(sess))!;
    expect(aokiChoice(back.state, 'beans')).toBe(1);
    expect(unlockedCrops(back.state)).toContain('tomato');
  });
});
