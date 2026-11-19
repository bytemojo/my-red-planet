import { describe, expect, it } from 'vitest';
import { SAVE_VERSION, act, advance, endSol, newGame, rates } from '../src/core/sim';
import { newSession, migrateState } from '../src/core/session';
import { EP } from '../src/core/constants';
import { afterStormAction } from '../src/core/episode';
import { missedRounds, pumpRunning, waterMeLabel, wateringLoad } from '../src/core/watering';
import { ACTION_DEFS, buildTimeline } from '../src/core/actions';
import type { GameState } from '../src/core/types';

// A quiet storm-phase state: Sol 2, panels stowed, no cards waiting.
const storm = (): GameState => {
  const s = newSession(7, { mode: 'storm', quick: true }).state;
  s.pending = null; s.ep!.phase = 'storm'; s.ep!.panelsStowed = true; s.sol = 2; s.hour = 8;
  for (const p of s.plots) { p.health = 80; p.watered = false; p.wateredAm = false; p.wateredPm = false; }
  return s;
};
const hand = (s: GameState, id: string) => act(s, 'water', { plot: id, tool: 'sprinkler' });
const sleepNow = (s: GameState) => { s.pending = null; s.hour = 23; endSol(s); };

describe('Step 15a: watering mode (core)', () => {
  it('new games start manual and the save version moved on', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(6);
    expect(newGame(1).wateringMode).toBe('manual');
    expect(storm().wateringMode).toBe('manual');
  });

  it('old saves migrate: manual, or automatic if the pump was already repaired', () => {
    const old = (fixed: boolean) => { const s = storm() as any; s.version = 5; delete s.wateringMode; s.ep.wateringFixed = fixed; return migrateState(s)!; };
    expect(old(false).wateringMode).toBe('manual'); expect(old(true).wateringMode).toBe('automatic');
    expect(old(false).version).toBe(SAVE_VERSION);
  });

  it('automatic drains more power than manual over the same storm night', () => {
    const run = (mode: 'automatic' | 'manual') => { const s = storm(); s.wateringMode = mode; s.hour = 19; s.res.power = 60; for (let i = 0; i < 4; i++) advance(s, 1); return s.res.power; };
    const auto = run('automatic'), manual = run('manual');
    expect(auto).toBeLessThan(manual);
    const a = storm(), m = storm(); a.wateringMode = 'automatic';
    expect(wateringLoad(a)).toBe(EP.PUMP_POWER); expect(wateringLoad(m)).toBe(-EP.NONESSENTIAL_POWER);
    expect(rates(a).load).toBeGreaterThan(rates(m).load);
  });

  it('manual mode needs a watering in the morning AND the evening; each round once', () => {
    const s = storm(); const id = s.plots[0].id;
    expect(hand(s, id).ok).toBe(true); expect(hand(s, id).ok).toBe(false); // same morning round
    s.hour = EP.WATER_PM_HOUR; expect(hand(s, id).ok).toBe(true);          // evening round is a new one
    expect(hand(s, id).ok).toBe(false);
    expect(missedRounds(s.plots[0])).toBe(0);
  });

  it('a missed watering lowers crop health; automatic keeps plants healthy', () => {
    const run = (setup: (s: GameState) => void) => { const s = storm(); setup(s); sleepNow(s); return s.plots[0].health!; };
    const none = run(() => {});
    const half = run(s => { hand(s, 'p0'); });
    const both = run(s => { hand(s, 'p0'); s.hour = EP.WATER_PM_HOUR; hand(s, 'p0'); });
    const auto = run(s => { s.wateringMode = 'automatic'; });
    expect(half).toBeGreaterThan(none); expect(both).toBeGreaterThan(half);
    expect(none).toBe(80 - EP.DRY_PLANT + 0); expect(half).toBe(80 - EP.DRY_PLANT / 2);
    expect(both).toBeGreaterThanOrEqual(80); expect(auto).toBeGreaterThanOrEqual(80);
  });

  it('watering rounds reset every Sol', () => {
    const s = storm(); hand(s, 'p0'); sleepNow(s);
    expect(s.plots[0].wateredAm).toBe(false); expect(s.plots[0].wateredPm).toBe(false); expect(s.plots[0].watered).toBe(false);
  });

  it('automatic mode waters the beds itself, so hand watering is refused (and costs nothing)', () => {
    const s = storm(); s.wateringMode = 'automatic'; const w = s.res.water, e = s.energy;
    expect(pumpRunning(s)).toBe(true);
    const r = hand(s, 'p0'); expect(r.ok).toBe(false); expect(r.msg).toMatch(/automatically/i);
    expect(s.res.water).toBe(w); expect(s.energy).toBe(e);
    sleepNow(s); expect(s.plots.every(p => p.crop === null || p.watered === false)).toBe(true); // flags reset for the new Sol
  });

  it('the player can switch modes; a broken pump cannot run automatic', () => {
    const s = storm();
    expect(act(s, 'watering_mode', { mode: 'manual' }).ok).toBe(false);      // already manual
    expect(act(s, 'watering_mode', { mode: 'automatic' }).ok).toBe(true); expect(s.wateringMode).toBe('automatic');
    expect(act(s, 'watering_mode', { mode: 'manual' }).ok).toBe(true); expect(s.wateringMode).toBe('manual');
    s.ep!.phase = 'after'; s.ep!.wateringFixed = false;
    const r = act(s, 'watering_mode', { mode: 'automatic' }); expect(r.ok).toBe(false); expect(r.msg).toMatch(/broken/i);
    expect(pumpRunning(s)).toBe(false);
  });

  it('repairing the pump after the storm turns automatic watering on', () => {
    const s = storm(); s.ep!.phase = 'after'; expect(s.wateringMode).toBe('manual');
    afterStormAction(s, 'water');
    expect(s.ep!.wateringFixed).toBe(true); expect(s.wateringMode).toBe('automatic'); expect(pumpRunning(s)).toBe(true);
    expect(act(newGame(1), 'watering_mode', { mode: 'automatic' }).ok).toBe(false); // the open campaign has no pump control
  });
});

describe('Step 15b: watering mode in the world', () => {
  const planted = () => { const s = storm(); s.plots.forEach(p => { p.crop = null; }); s.plots[0].crop = 'lettuce'; s.plots[0].growth = 1; return s; };
  it('WATER ME shows only in manual mode, only while a planted bed waits, and names the round', () => {
    const s = planted(); s.hour = 9;
    expect(waterMeLabel(s)).toBe('MORNING');
    s.hour = 17; expect(waterMeLabel(s)).toBe('EVENING');
    s.wateringMode = 'automatic'; expect(waterMeLabel(s)).toBeNull();
    s.wateringMode = 'manual'; s.plots[0].wateredPm = true; expect(waterMeLabel(s)).toBeNull();
    expect(waterMeLabel(newGame(1))).toBeNull(); // the open campaign has no chip
    const empty = storm(); empty.plots.forEach(p => { p.crop = null; }); expect(waterMeLabel(empty)).toBeNull();
  });
  it('the pump control is a free animation and the mode only changes at its beat', () => {
    const d = ACTION_DEFS.pump_mode, tl = buildTimeline(d, false);
    expect(d.energy).toBe(0); expect(tl.beatAt).toBeGreaterThan(0); expect(d.steps.length).toBeGreaterThan(1);
    const s = planted(); const e = s.energy;
    expect(s.wateringMode).toBe('manual'); // nothing has switched before the beat
    expect(act(s, 'watering_mode', { mode: 'automatic' }).ok).toBe(true);
    expect(s.wateringMode).toBe('automatic'); expect(s.energy).toBe(e);
  });
  it('a broken pump cannot be switched on, so the control sends the player to repair it', () => {
    const s = planted(); s.ep!.phase = 'after'; s.ep!.wateringFixed = false;
    expect(act(s, 'watering_mode', { mode: 'automatic' }).ok).toBe(false); expect(s.wateringMode).toBe('manual');
  });
});
