import { describe, expect, it } from 'vitest';
import { advance } from '../src/core/sim';
import { poll, resolve } from '../src/core/director';
import { newSession } from '../src/core/session';
import { podSleep, sleepRefusal, wakeReason } from '../src/core/sleeppod';
import { ACTION_DEFS, buildTimeline } from '../src/core/actions';
import type { GameState } from '../src/core/types';

const quick = () => newSession(7, { mode: 'storm', quick: true });
const toStormCall = (s: GameState) => { while (!s.pending) advance(s, 0.25); if (s.pending.id === 'dish_decision') { resolve(s, 'comms'); poll(s); } while (!s.pending) advance(s, 0.25); };

describe('Step 17a: the sleep pod', () => {
  it('refuses to sleep while a conversation, the Reyes call or a planned lever pull is pending, and says why', () => {
    const sess = quick(), s = sess.state;
    s.pending = { kind: 'beat', id: 'ep_call' };
    expect(sleepRefusal(s)).toMatch(/conversation/i);
    const r = podSleep(sess); expect(r.ok).toBe(false); expect(sess.state.sol).toBe(1);
    s.pending = null; s.ep!.call = 'ringing'; expect(sleepRefusal(s)).toMatch(/Reyes/);
    s.ep!.call = 'answered'; s.ep!.phase = 'prep'; expect(sleepRefusal(s)).toBeNull();
    s.ep!.stormCall = 'stow'; s.ep!.panelsStowed = false; expect(sleepRefusal(s)).toMatch(/lever/i);
    s.ep!.panelsStowed = true; expect(sleepRefusal(s)).toBeNull();
    s.outside = true; expect(sleepRefusal(s)).toMatch(/inside/i);
    for (const t of [sleepRefusal(s)!]) expect(t.toLowerCase()).not.toContain('suit');
  });
  it('exactly one Sol passes, using the existing endSol', () => {
    const sess = quick(), s = sess.state; s.pending = null; s.ep!.call = 'answered'; s.ep!.phase = 'prep'; s.hour = 20;
    const before = s.sol, r = podSleep(sess);
    expect(r.ok).toBe(true); expect(sess.state.sol).toBe(before + 1); expect(sess.state.hour).toBeLessThan(12);
    if (r.ok) expect(r.solBefore).toBe(before);
  });
  it('an alarm wakes you early with a reason when a major event is already waiting; a calm morning has none', () => {
    const sess = quick(), s = sess.state; s.pending = null;
    expect(wakeReason(s)).toBeNull();
    s.pending = { kind: 'event', id: 'radiation_peak' };
    expect(wakeReason(s)).toMatch(/^Alarm!/);
  });
  it('the pod is an animated action whose sleep beat comes after the lid-closing poses', () => {
    const d = ACTION_DEFS.pod_sleep; expect(d.energy).toBe(0);
    expect(d.steps.some(x => x.pose === 'reach')).toBe(true); expect(d.steps.filter(x => x.pose === 'sleep').length).toBeGreaterThan(2);
    expect(buildTimeline(d, false).beatAt).toBeGreaterThan(buildTimeline(d, false).total * 0.6);
  });
});
