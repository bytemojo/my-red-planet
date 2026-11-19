import { describe, expect, it } from 'vitest';
import { ACTION_DEFS, ActionRunner, MIN_STEP_MS, RACK_RULE, REDUCED_MOTION_SCALE, WALK_TIMEOUT_MS, applyActionBeat, buildTimeline, cookActionPlan, canStartAction, type ActionDef, type ActionId } from '../src/core/actions';
import { ACTION_FRAME_COUNT } from '../src/game/pixelart';

const ids = Object.keys(ACTION_DEFS) as ActionId[];
// A tiny recorder: what happened, in order.
function rig(def: ActionDef, reduced = false) {
  const log: string[] = [], r = new ActionRunner();
  const ok = r.start(def, { onBeat: () => log.push('beat'), onDone: () => log.push('done'), onAbort: () => log.push('abort') }, reduced);
  return { r, log, ok };
}
const playToEnd = (r: ActionRunner, dt = 16) => { r.arrive(); for (let i = 0; i < 2000 && r.locked; i++) r.tick(dt); };

describe('action definitions', () => {
  it('every action has a beat inside its steps and only uses frames that exist', () => {
    for (const id of ids) {
      const d = ACTION_DEFS[id];
      expect(d.id).toBe(id); expect(d.steps.length).toBeGreaterThanOrEqual(4);
      expect(d.beatStep).toBeGreaterThanOrEqual(0); expect(d.beatStep).toBeLessThan(d.steps.length);
      for (const s of d.steps) {
        expect(s.ms).toBeGreaterThan(0);
        if (s.pose !== 'carry') expect(s.frame).toBeLessThan(ACTION_FRAME_COUNT[s.pose]);
      }
    }
  });
  it('the beat time is the sum of the steps before the beat step', () => {
    const d = ACTION_DEFS.pull_bands, tl = buildTimeline(d);
    expect(tl.beatAt).toBe(d.steps.slice(0, d.beatStep).reduce((a, s) => a + s.ms, 0));
    expect(tl.total).toBe(d.steps.reduce((a, s) => a + s.ms, 0));
    expect(tl.beatAt).toBeGreaterThan(0); expect(tl.beatAt).toBeLessThan(tl.total);
  });
  it('reduced motion is shorter but keeps every step and the beat', () => {
    for (const id of ids) {
      const full = buildTimeline(ACTION_DEFS[id]), quick = buildTimeline(ACTION_DEFS[id], true);
      expect(quick.steps.length).toBe(full.steps.length); expect(quick.total).toBeLessThan(full.total);
      expect(quick.steps.every(s => s.ms >= MIN_STEP_MS)).toBe(true);
      expect(quick.beatAt).toBeLessThan(quick.total);
    }
    expect(REDUCED_MOTION_SCALE).toBeLessThan(1);
  });
});

describe('ActionRunner lifecycle', () => {
  it('locks from start, plays, fires the beat once and done once, in that order, then unlocks', () => {
    const { r, log, ok } = rig(ACTION_DEFS.pull_bands);
    expect(ok).toBe(true); expect(r.locked).toBe(true); expect(r.phase).toBe('walking');
    r.arrive(); expect(r.phase).toBe('posing'); expect(r.locked).toBe(true);
    playToEnd(r);
    expect(log).toEqual(['beat', 'done']); expect(r.locked).toBe(false); expect(r.phase).toBe('idle');
  });
  it('the beat does not fire early: nothing before the beat time, exactly at it', () => {
    const d = ACTION_DEFS.pick_up, { r, log } = rig(d), at = buildTimeline(d).beatAt;
    r.arrive(); r.tick(at - 1); expect(log).toEqual([]);
    r.tick(1); expect(log).toEqual(['beat']);
    r.tick(5); expect(log).toEqual(['beat']); // never twice
  });
  it('a huge time step still fires beat then done exactly once', () => {
    const { r, log } = rig(ACTION_DEFS.put_down); r.arrive(); r.tick(1e7); r.tick(1e7);
    expect(log).toEqual(['beat', 'done']);
  });
  it('shows the right frame over time', () => {
    const d = ACTION_DEFS.pick_up, { r } = rig(d); r.arrive();
    expect(r.frameAt(0)).toEqual({ pose: 'reach', frame: 0 });
    const tl = buildTimeline(d); expect(r.frameAt(tl.beatAt)).toEqual({ pose: 'reach', frame: d.beatStep });
    expect(r.frameAt(tl.total + 999)?.frame).toBe(d.steps.length - 1);
  });
  it('refuses to start a second action while one is running, and keeps the first one intact', () => {
    const { r, log } = rig(ACTION_DEFS.pull_bands);
    expect(r.start(ACTION_DEFS.pick_up, { onBeat: () => log.push('WRONG') })).toBe(false);
    playToEnd(r); expect(log).toEqual(['beat', 'done']);
  });
  it('is unlocked before onDone runs, so onDone can start the next action', () => {
    const r = new ActionRunner(), log: string[] = [];
    r.start(ACTION_DEFS.pick_up, { onDone: () => { log.push('first done'); expect(r.locked).toBe(false); expect(r.start(ACTION_DEFS.put_down, { onBeat: () => log.push('second beat') })).toBe(true); } });
    playToEnd(r); expect(r.locked).toBe(true); expect(r.phase).toBe('walking'); playToEnd(r);
    expect(log).toEqual(['first done', 'second beat']); expect(r.locked).toBe(false);
  });
  it('reduced motion finishes sooner but still fires the beat and done', () => {
    const a = rig(ACTION_DEFS.pick_up, false), b = rig(ACTION_DEFS.pick_up, true);
    const time = (r: ActionRunner) => { r.arrive(); let t = 0; while (r.locked && t < 1e5) { r.tick(10); t += 10; } return t; };
    const slow = time(a.r), fast = time(b.r);
    expect(fast).toBeLessThan(slow); expect(a.log).toEqual(['beat', 'done']); expect(b.log).toEqual(['beat', 'done']);
  });
});

describe('ActionRunner always unlocks', () => {
  it('finish() in the middle fires the beat if it has not happened, then done', () => {
    const { r, log } = rig(ACTION_DEFS.pick_up); r.arrive(); r.tick(10); expect(log).toEqual([]);
    r.finish(); expect(log).toEqual(['beat', 'done']); expect(r.locked).toBe(false);
    r.finish(); expect(log).toEqual(['beat', 'done']); // calling it again does nothing
  });
  it('finish() after the beat only fires done (the effect is never repeated)', () => {
    const d = ACTION_DEFS.pick_up, { r, log } = rig(d); r.arrive(); r.tick(buildTimeline(d).beatAt + 1);
    r.finish(); expect(log).toEqual(['beat', 'done']);
  });
  it('abort() while walking fires onAbort, never the beat, and unlocks', () => {
    const { r, log } = rig(ACTION_DEFS.pick_up); r.abort();
    expect(log).toEqual(['abort']); expect(r.locked).toBe(false);
  });
  it('abort() after the beat behaves like finish(): the effect already happened, so the action completes', () => {
    const d = ACTION_DEFS.pick_up, { r, log } = rig(d); r.arrive(); r.tick(buildTimeline(d).beatAt + 1); r.abort();
    expect(log).toEqual(['beat', 'done']); expect(r.locked).toBe(false);
  });
  it('a walk that never arrives times out: unlocked, no beat', () => {
    const { r, log } = rig(ACTION_DEFS.pick_up);
    expect(r.walkTick(WALK_TIMEOUT_MS - 1)).toBe('walking'); expect(r.locked).toBe(true);
    expect(r.walkTick(2)).toBe('timeout'); expect(r.locked).toBe(false); expect(log).toEqual(['abort']);
  });
  it('finish() during the walk unlocks without the beat', () => {
    const { r, log } = rig(ACTION_DEFS.pick_up); r.finish(); expect(log).toEqual(['abort']); expect(r.locked).toBe(false);
  });
  it('forceUnlock() (a world reset) frees the controls and calls nothing', () => {
    const { r, log } = rig(ACTION_DEFS.pick_up); r.arrive(); r.tick(10); r.forceUnlock();
    expect(r.locked).toBe(false); expect(log).toEqual([]); r.tick(1000); expect(log).toEqual([]);
  });
  it('whatever happens, once finish() is called the controls are free (random sequences)', () => {
    let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (let run = 0; run < 300; run++) {
      const log: string[] = [], r = new ActionRunner(); let starts = 0;
      for (let i = 0; i < 25; i++) {
        const op = Math.floor(rnd() * 6);
        if (op === 0 && r.start(ACTION_DEFS[ids[Math.floor(rnd() * ids.length)]], { onBeat: () => log.push('b'), onDone: () => log.push('d'), onAbort: () => log.push('a') }, rnd() < 0.5)) starts++;
        else if (op === 1) r.arrive(); else if (op === 2) r.tick(rnd() * 400); else if (op === 3) r.walkTick(rnd() * 3000);
        else if (op === 4) r.abort(); else r.finish();
      }
      r.finish(); expect(r.locked).toBe(false);
      expect(log.filter(x => x === 'b').length).toBeLessThanOrEqual(starts);
      expect(log.filter(x => x === 'd' || x === 'a').length).toBeLessThanOrEqual(starts);
      // every beat is followed by a done before the next start: no beat is left without its done
      expect(log.filter(x => x === 'b').length).toBe(log.filter(x => x === 'd').length);
    }
  });
});

describe('energy is charged at the beat, never before', () => {
  it('cannot start when too tired, and a pending conversation blocks it', () => {
    expect(canStartAction({ energy: 0, pending: null }, ACTION_DEFS.pick_up).ok).toBe(false);
    expect(canStartAction({ energy: 5, pending: null }, ACTION_DEFS.pick_up).ok).toBe(true);
    expect(canStartAction({ energy: 50, pending: { kind: 'event', id: 'x' } }, ACTION_DEFS.pick_up).ok).toBe(false);
    expect(canStartAction({ energy: 0, pending: null }, ACTION_DEFS.put_down).ok).toBe(true); // free
  });
  it('energy only drops when the beat fires', () => {
    const s = { energy: 10 }, d = ACTION_DEFS.pick_up, r = new ActionRunner();
    const seen: number[] = [];
    r.start(d, { onBeat: () => { applyActionBeat(s, d); seen.push(s.energy); } });
    r.arrive(); r.tick(buildTimeline(d).beatAt - 1); expect(s.energy).toBe(10); // walking and wind-up are free
    r.tick(1); expect(s.energy).toBe(10 - d.energy); r.tick(1e6); expect(s.energy).toBe(10 - d.energy); expect(seen.length).toBe(1);
  });
  it('never goes below zero', () => {
    const s = { energy: 0 }; expect(applyActionBeat(s, ACTION_DEFS.pick_up)).toMatchObject({ ok: false, spent: 0 }); expect(s.energy).toBe(0);
  });
});

describe('racks', () => {
  it('pick up when empty-handed, put back when holding that item, refuse when holding something else', () => {
    expect(RACK_RULE(null, 'sprinkler')).toBe('pick_up');
    expect(RACK_RULE('sprinkler', 'sprinkler')).toBe('put_down');
    expect(RACK_RULE('seed_packet', 'sprinkler')).toBe('full');
  });
});

describe('cooking animations (Step 2c)', () => {
  it('has one free, distinct animation per method, in cold-wet-hot order', () => {
    expect(cookActionPlan(['HEAT', 'READY TO EAT', 'HYDRATE'])).toEqual(['cook_ready', 'cook_hydrate', 'cook_heat']);
    expect(cookActionPlan(['HEAT', 'HEAT', 'HEAT'])).toEqual(['cook_heat']);
    expect(cookActionPlan(['READY TO EAT', 'READY TO EAT'])).toEqual(['cook_ready']);
    expect(cookActionPlan(['nope'])).toEqual([]);
    for (const id of ['cook_ready', 'cook_hydrate', 'cook_heat'] as const) expect(ACTION_DEFS[id].energy).toBe(0);
    const sigs = new Set(['cook_ready', 'cook_hydrate', 'cook_heat'].map(id => JSON.stringify(ACTION_DEFS[id as ActionId].steps.map(s => s.pose + s.ms))));
    expect(sigs.size).toBe(3);
  });
  it('charges no energy at the beat, and the beat fires once', () => {
    const s = { energy: 50 } as never as { energy: number };
    for (const id of ['cook_ready', 'cook_hydrate', 'cook_heat'] as const) {
      const { r, log } = rig(ACTION_DEFS[id]); playToEnd(r);
      expect(log).toEqual(['beat', 'done']); expect(applyActionBeat(s, ACTION_DEFS[id]).spent).toBe(0);
    }
    expect(s.energy).toBe(50);
  });
});

describe('serve tray action (Step 2d)', () => {
  it('is free, has its beat inside the steps, and fires the beat once', () => {
    const d = ACTION_DEFS.serve_tray; expect(d.energy).toBe(0);
    const { r, log } = rig(d); playToEnd(r); expect(log).toEqual(['beat', 'done']);
  });
  it('an aborted walk never fires the beat (so nobody is fed)', () => {
    const { r, log } = rig(ACTION_DEFS.serve_tray); r.abort(); expect(log).toEqual(['abort']);
  });
});

describe('suit rack actions (Step 8b)', () => {
  it('suit_up plays frames 0..4 and suit_off plays them backwards, both free with the beat inside', () => {
    const up = ACTION_DEFS.suit_up, off = ACTION_DEFS.suit_off;
    expect(up.energy).toBe(0); expect(off.energy).toBe(0);
    expect(up.steps.map(s => s.frame)).toEqual([0, 1, 2, 3, 4]);
    expect(off.steps.map(s => s.frame)).toEqual([4, 3, 2, 1, 0]);
    for (const d of [up, off]) { expect(d.steps.every(s => s.pose === 'suitup')).toBe(true); expect(d.beatStep).toBeGreaterThan(0); expect(d.beatStep).toBeLessThan(d.steps.length); }
  });
  it('the beat fires once, and an aborted walk never changes the suit', () => {
    for (const id of ['suit_up', 'suit_off'] as const) {
      const a = rig(ACTION_DEFS[id]); playToEnd(a.r); expect(a.log).toEqual(['beat', 'done']);
      const b = rig(ACTION_DEFS[id]); b.r.abort(); expect(b.log).toEqual(['abort']);
    }
  });
});
