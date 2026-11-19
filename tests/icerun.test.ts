import { describe, expect, it } from 'vitest';
import { newSession } from '../src/core/session';
import { act, advance, rates } from '../src/core/sim';
import { scriptedAlert } from '../src/story/alert';
import { EP } from '../src/core/constants';
import { describePending, poll, resolve } from '../src/core/director';
import { afterStormAction, deliverIce, maybeFinish, objective, objectiveTasks } from '../src/core/episode';
import { objectivesView } from '../src/story/objectives';
import { ICE_COLLECTED, iceDelivered, iceProblem, pourProblem, waterMakerOff } from '../src/core/icerun';
import { evaluateFailures } from '../src/core/failure';
import { FAIL } from '../src/core/constants';
import type { GameState } from '../src/core/types';
import { fillName } from '../src/story/name';
import { CAPTAIN_BEAT_ID, CAPTAIN_LINE, EP_BEATS } from '../src/story/episode1';

// a state at the end of the storm clean-up, one job left
const afterStorm = (): GameState => {
  const s = newSession(7, { mode: 'storm', quick: true }).state;
  s.ep!.phase = 'after'; s.sol = 5; s.pending = null; s.ep!.panelsStowed = false;
  afterStormAction(s, 'water');           // first job: not finished yet
  return s;
};

describe('Step 21a: water maker shutdown + ice run', () => {
  it('the clean-up no longer ends the episode: the water maker shuts down first', () => {
    const s = afterStorm();
    expect(s.ep!.phase).toBe('after'); expect(waterMakerOff(s)).toBe(false);
    afterStormAction(s, 'clean');          // second job done
    expect(s.ep!.phase).toBe('ice'); expect(s.ep!.result).toBeNull();
    expect(waterMakerOff(s)).toBe(true);
    expect(s.pending).toEqual({ kind: 'event', id: 'water_shutdown' });
  });
  it('Reyes warns, says CANDIDATE ice, and never mentions the suit', () => {
    const s = afterStorm(); afterStormAction(s, 'clean');
    const v = describePending(s)!; expect(v.speaker).toBe('reyes');
    expect(v.lines.join(' ')).toMatch(/candidate/i); expect(v.lines.join(' ')).not.toMatch(/suit|eva/i);
    expect(v.choices.map(c => c.id)).toEqual(['ok']);
    resolve(s, 'ok'); poll(s); expect(s.pending).toBeNull(); expect(s.ep!.phase).toBe('ice');
  });
  it('objective sequence: after -> ice (no suit words) -> done', () => {
    const s = afterStorm(); expect(objective(s).title).toBe('AFTER THE STORM');
    afterStormAction(s, 'clean');
    const o = objective(s), v = objectivesView(s), tasks = objectiveTasks(s);
    expect(o.title).toBe('COLLECT EMERGENCY WATER'); expect(v.now).toMatch(/candidate ice sheet/);
    expect(`${o.detail} ${v.now} ${v.next} ${tasks.map(t => t.label).join(' ')}`).not.toMatch(/suit|eva|wear/i);
    expect(tasks.map(t => t.done)).toEqual([false, false]);
    s.flags[ICE_COLLECTED] = 1; expect(objectiveTasks(s)[0].done).toBe(true);
    expect(deliverIce(s)).toBe(true);
    expect(s.ep!.phase).toBe('done'); expect(s.ep!.result).not.toBeNull(); expect(iceDelivered(s)).toBe(true); expect(waterMakerOff(s)).toBe(false);
    expect(objective(s).title).toBe('MISSION COMPLETE');
  });
  it('deliverIce only works during the ice phase', () => {
    const s = afterStorm(); expect(deliverIce(s)).toBe(false); expect(s.ep!.phase).toBe('after');
    expect(maybeFinish(s)).toBe(false);
  });
  it('water stops refilling while the maker is off and comes back when it is on', () => {
    const s = afterStorm(); const before = rates(s).water;
    afterStormAction(s, 'clean');
    expect(rates(s).water).toBeLessThan(before);
    s.res.water = 50; advance(s, 1); expect(s.res.water).toBeLessThan(50);
    deliverIce(s); expect(rates(s).water).toBeCloseTo(before, 5);
    expect(s.res.water).toBeGreaterThan(0);
  });
  it('outside without the suit still fails (NO_SUIT) during the ice run', () => {
    const s = afterStorm(); afterStormAction(s, 'clean');
    s.outside = true; s.suitOn = false; s.health = FAIL.HEALTH_CRITICAL;
    expect(evaluateFailures(s, 0.1).failure).toBe('NO_SUIT');
    s.suitOn = true; s.health = 100; expect(evaluateFailures(s, 0.1).failure).toBeNull();
  });

  describe('Step 21b: the physical ice run', () => {
    const iceRun = (): GameState => { const s = afterStorm(); afterStormAction(s, 'clean'); s.pending = null; s.energy = 100; return s; };
    it('chipping needs: outside, empty hands, energy; it costs energy and suit air at the beat', () => {
      const s = iceRun();
      expect(act(s, 'ice_chip', { held: '' }).ok).toBe(false);          // inside
      expect(s.flags[ICE_COLLECTED]).toBeFalsy();
      s.outside = true; s.suitOn = true; s.suit = 100;
      expect(iceProblem(s, 'spare_part')).toMatch(/Put your item down/);
      s.energy = EP.ICE_ENERGY - 1; expect(iceProblem(s, null)).toMatch(/tired/);
      s.energy = 50; const r = act(s, 'ice_chip', { held: '' });
      expect(r.ok).toBe(true); expect(s.energy).toBe(50 - EP.ICE_ENERGY); expect(s.suit).toBe(100 - EP.ICE_AIR);
      expect(s.flags[ICE_COLLECTED]).toBe(1);
      expect(act(s, 'ice_chip', { held: '' }).ok).toBe(false);          // already full
    });
    it('chipping without the air tank on does not touch the tank; low tank is refused', () => {
      const s = iceRun(); s.outside = true; s.suitOn = false; s.suit = 60; act(s, 'ice_chip', { held: '' }); expect(s.suit).toBe(60);
      const t = iceRun(); t.outside = true; t.suitOn = true; t.suit = EP.ICE_AIR - 1; expect(iceProblem(t, null)).toMatch(/air/);
    });
    it('pouring needs the container, inside; it ends the episode and fills water', () => {
      const s = iceRun(); s.outside = true; s.suitOn = true; act(s, 'ice_chip', { held: '' });
      expect(pourProblem(s, 'ice_sample')).toMatch(/inside/);
      s.outside = false; expect(act(s, 'ice_pour', { held: '' }).ok).toBe(false);   // hands empty
      s.res.water = 20; const r = act(s, 'ice_pour', { held: 'ice_sample' });
      expect(r.ok).toBe(true); expect(s.ep!.phase).toBe('done'); expect(s.res.water).toBeGreaterThanOrEqual(20 + EP.ICE_WATER - 5);
      expect(waterMakerOff(s)).toBe(false);
    });
    it('cannot pour before collecting', () => {
      const s = iceRun(); expect(act(s, 'ice_pour', { held: 'ice_sample' }).ok).toBe(false); expect(s.ep!.phase).toBe('ice');
    });
    it('the Solar Alert is calm during the ice run (every hour of Sol 5 and later)', () => {
      for (const sol of [5, 6]) for (let h = 0; h < 24; h++) expect(scriptedAlert(sol, h)).toBe('low');
    });
  });
});

describe('Step 21c: the captain line', () => {
  // the ice container is in the hands and the player is inside, at the intake
  const delivered = (): GameState => {
    const s = afterStorm(); afterStormAction(s, 'clean'); s.pending = null;
    s.energy = 100; s.outside = false; s.flags[ICE_COLLECTED] = 1;
    expect(act(s, 'ice_pour', { held: 'ice_sample' }).ok).toBe(true);
    return s;
  };
  it('the exact text, with the player name inserted', () => {
    expect(CAPTAIN_LINE).toBe("I hope you're ready {name}. The real game just started.");
    expect(fillName(CAPTAIN_LINE, 'Lenny')).toBe("I hope you're ready Lenny. The real game just started.");
    expect(fillName(CAPTAIN_LINE, '')).toBe("I hope you're ready Rookie. The real game just started.");
  });
  it('delivering the container queues ONE captain scene from Reyes, with the exact line and nothing to choose', () => {
    const s = delivered(); poll(s);
    expect(s.ep!.phase).toBe('done'); expect(s.pending).toEqual({ kind: 'beat', id: CAPTAIN_BEAT_ID });
    const v = describePending(s)!;
    expect(v.speaker).toBe('reyes'); expect(v.choices).toEqual([]); expect(v.lines).toEqual([CAPTAIN_LINE]);
    expect(fillName(v.lines[0], 'Mira')).toBe("I hope you're ready Mira. The real game just started.");
  });
  it('it plays once: after it is resolved nothing is pending and it never returns', () => {
    const s = delivered(); poll(s);
    expect(resolve(s)).toBe(true); expect(s.seenBeats).toContain(CAPTAIN_BEAT_ID); expect(s.pending).toBeNull();
    poll(s); expect(s.pending).toBeNull();
  });
  it('it cannot fire early: not while the ice run is still going, not before the ice is delivered', () => {
    const beat = EP_BEATS.find(b => b.id === CAPTAIN_BEAT_ID)!;
    const s = afterStorm(); afterStormAction(s, 'clean'); s.pending = null;
    expect(beat.when(s)).toBe(false); poll(s); expect(s.pending).toBeNull();
    s.flags[ICE_COLLECTED] = 1; expect(beat.when(s)).toBe(false);
    s.ep!.phase = 'done'; expect(beat.when(s)).toBe(false);          // done alone is not enough: the delivery flag decides
  });
  it('no panel path skips it: the only way to the mission screen is through the pending scene', () => {
    const s = delivered(); poll(s);
    expect(s.pending?.id).toBe(CAPTAIN_BEAT_ID);
    expect(resolve(s, 'skip')).toBe(true);                           // any answer just ends this one line scene; there is no other effect
    expect(s.ep!.result).not.toBeNull();
  });
});
