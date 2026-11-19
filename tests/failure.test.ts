import { describe, expect, it } from 'vitest';
import { FAIL } from '../src/core/constants';
import { FAILURE_CAUSES, FAILURE_TIP_SUFFIX, FAILURE_TITLES, WARNING_LINES, causeFromLegacy, evaluateFailures, failureText, failureTips, newWarnings, resetFailureCounters, restoreAfterFailure, respawnAtAirlock, FAILURE_ICON, suitRefillShows, NO_SUIT_TIP, type FailureId } from '../src/core/failure';
import { advance, endSol, newGame } from '../src/core/sim';
import { newSession, saveCheckpoint } from '../src/core/session';
import { teamMorale } from '../src/core/crewlife';
import { CREW_IDS } from '../src/core/crewlife';
import type { GameState } from '../src/core/types';

const calm = (): GameState => { const s = newGame(1, { mode: 'storm' }); s.pending = null; s.sol = 1; s.hour = 10; resetFailureCounters(s); return s; }; // Sol 1, 10:00, alert LOW
const risky = (s: GameState) => { s.hour = 18; s.ep!.sun.classType = 'X'; }; // Solar Alert HIGH
const setMorale = (s: GameState, v: number) => { for (const id of CREW_IDS) s.crew[id].morale = v; };
const IDS: FailureId[] = ['NO_SUIT', 'RADIATION_HIGH', 'SUIT_AIR', 'PLAYER_HEALTH_LOW', 'TEAM_MORALE_LOW', 'RESOURCE_DEPLETED'];

describe('failure causes (data)', () => {
  it('defines all six causes, each with id, reason, checkpoint and tip', () => {
    expect(Object.keys(FAILURE_CAUSES).sort()).toEqual([...IDS].sort());
    for (const id of IDS) { const c = FAILURE_CAUSES[id]; expect(c.id).toBe(id); expect(c.reason.length).toBeGreaterThan(10); expect(c.checkpoint).toBe(id === 'NO_SUIT' ? 'airlock' : 'last_checkpoint'); expect(c.tip.length).toBeGreaterThan(10); }
  });
  it('uses the exact tips from the brief', () => {
    expect(FAILURE_CAUSES.NO_SUIT.tip).toBe('Always put on your suit before going outside.');
    expect(FAILURE_CAUSES.RADIATION_HIGH.tip).toBe('When the Solar Alert turns red, get back inside fast.');
    expect(FAILURE_CAUSES.TEAM_MORALE_LOW.tip).toBe('Talk to the crew, serve different meals, and watch the morale face above each person.');
    expect(FAILURE_CAUSES.PLAYER_HEALTH_LOW.tip).toBe('Feed the crew and yourself. A skipped meal hurts everyone.');
    expect(FAILURE_CAUSES.RESOURCE_DEPLETED.tip).toBe('Always pay attention to your meters.');
  });
  it('every failure text ends with the shared tip, and never says it twice', () => {
    for (const id of IDS) { expect(failureText(id).endsWith(FAILURE_TIP_SUFFIX)).toBe(true); expect(failureText(id).split(FAILURE_TIP_SUFFIX).length).toBe(2); }
    expect(FAILURE_TIP_SUFFIX).toBe('Tip: always pay attention to your meters.');
    expect(failureTips('RESOURCE_DEPLETED')).toEqual([FAILURE_TIP_SUFFIX]);
    expect(failureTips('NO_SUIT')).toEqual([FAILURE_CAUSES.NO_SUIT.tip, FAILURE_TIP_SUFFIX]);
  });
});

describe('evaluateFailures: each cause', () => {
  it('a calm start is fine: no failure, no warning', () => {
    const r = evaluateFailures(calm(), 0); expect(r.failure).toBeNull(); expect(r.warnings).toEqual([]);
  });
  it('NO_SUIT: outside without the suit', () => {
    const s = calm(); s.outside = true; s.suitOn = false; expect(evaluateFailures(s, 0.25).failure).toBeNull(); s.health = FAIL.HEALTH_CRITICAL; expect(evaluateFailures(s, 0.25).failure).toBe('NO_SUIT');
    s.suitOn = true; expect(evaluateFailures(s, 0.25).failure).toBeNull();
  });
  it('SUIT_AIR: warns when low, fails at zero', () => {
    const s = calm(); s.outside = true; s.suitOn = true; s.suit = FAIL.SUIT_AIR_WARN;
    let r = evaluateFailures(s, 0.25); expect(r.failure).toBeNull(); expect(r.warnings).toContain('SUIT_AIR');
    s.suit = 0; r = evaluateFailures(s, 0.25); expect(r.failure).toBe('SUIT_AIR');
  });
  it('RADIATION_HIGH: a warning at once, a failure only after RADIATION_HOURS outside during a HIGH alert', () => {
    const s = calm(); risky(s); s.outside = true; s.suitOn = true; s.suit = 100;
    let r = evaluateFailures(s, 0.25); expect(r.failure).toBeNull(); expect(r.warnings).toContain('RADIATION_HIGH');
    for (let h = 0.25; h < FAIL.RADIATION_HOURS - 0.3; h += 0.25) r = evaluateFailures(s, 0.25); expect(r.failure).toBeNull();
    r = evaluateFailures(s, 0.5); expect(r.failure).toBe('RADIATION_HIGH');
  });
  it('RADIATION_HIGH: going back inside resets the clock', () => {
    const s = calm(); risky(s); s.outside = true; s.suitOn = true; s.suit = 100;
    evaluateFailures(s, 1.5); s.outside = false; evaluateFailures(s, 0.25); s.outside = true;
    expect(evaluateFailures(s, 1.5).failure).toBeNull(); // 1.5 h again, not 3 h
  });
  it('RADIATION_HIGH does not apply when the alert is low', () => {
    const s = calm(); s.outside = true; s.suitOn = true; s.suit = 100; expect(evaluateFailures(s, 5).failure).toBeNull();
  });
  it('PLAYER_HEALTH_LOW: warning, then failure only after CRITICAL_HOURS at critical; zero health fails at once', () => {
    const s = calm(); s.health = FAIL.HEALTH_WARN;
    let r = evaluateFailures(s, 1); expect(r.failure).toBeNull(); expect(r.warnings).toContain('PLAYER_HEALTH_LOW');
    s.health = FAIL.HEALTH_CRITICAL; r = evaluateFailures(s, FAIL.CRITICAL_HOURS - 0.5); expect(r.failure).toBeNull();
    r = evaluateFailures(s, 0.5); expect(r.failure).toBe('PLAYER_HEALTH_LOW');
    const z = calm(); z.health = 0; expect(evaluateFailures(z, 0).failure).toBe('PLAYER_HEALTH_LOW');
  });
  it('PLAYER_HEALTH_LOW: recovering above critical resets the clock', () => {
    const s = calm(); s.health = FAIL.HEALTH_CRITICAL; evaluateFailures(s, FAIL.CRITICAL_HOURS - 0.5); s.health = FAIL.HEALTH_CRITICAL + 10; evaluateFailures(s, 0.25);
    s.health = FAIL.HEALTH_CRITICAL; expect(evaluateFailures(s, FAIL.CRITICAL_HOURS - 0.5).failure).toBeNull();
  });
  it('TEAM_MORALE_LOW: warning first, failure only after CRITICAL_HOURS at critical', () => {
    const s = calm(); setMorale(s, FAIL.MORALE_WARN);
    let r = evaluateFailures(s, 1); expect(r.failure).toBeNull(); expect(r.warnings).toContain('TEAM_MORALE_LOW');
    setMorale(s, FAIL.MORALE_CRITICAL); expect(teamMorale(s)).toBe(FAIL.MORALE_CRITICAL);
    r = evaluateFailures(s, FAIL.CRITICAL_HOURS - 0.5); expect(r.failure).toBeNull();
    r = evaluateFailures(s, 0.5); expect(r.failure).toBe('TEAM_MORALE_LOW');
  });
  it('RESOURCE_DEPLETED: warns when low, fails at zero (air, water or food)', () => {
    for (const k of ['o2', 'water', 'food'] as const) {
      const s = calm(); s.res[k] = FAIL.RESOURCE_WARN; let r = evaluateFailures(s, 0.25); expect(r.failure).toBeNull(); expect(r.warnings).toContain('RESOURCE_DEPLETED');
      s.res[k] = 0; r = evaluateFailures(s, 0.25); expect(r.failure).toBe('RESOURCE_DEPLETED');
    }
  });
  it('thresholds are ordered so a warning always comes before a failure', () => {
    expect(FAIL.HEALTH_WARN).toBeGreaterThan(FAIL.HEALTH_CRITICAL); expect(FAIL.MORALE_WARN).toBeGreaterThan(FAIL.MORALE_CRITICAL);
    expect(FAIL.CRITICAL_HOURS).toBeGreaterThanOrEqual(3); expect(FAIL.RESOURCE_WARN).toBeGreaterThan(0);
  });
});

describe('one missed meal is never fatal', () => {
  it('a whole day with nobody fed (hunger at 100 for hours) causes no failure and no health or morale failure', () => {
    const s = calm(); s.hour = 8; s.outside = false; const seen = new Set<FailureId>();
    for (const id of CREW_IDS) s.crew[id].hunger = 100; // nobody ate: the worst case for one missed meal
    while (s.hour < 23.9) { advance(s, 0.25); s.pending = null; const r = evaluateFailures(s, 0.25); if (r.failure) seen.add(r.failure); }
    expect([...seen]).toEqual([]);
    expect(teamMorale(s)).toBeGreaterThan(FAIL.MORALE_CRITICAL);
    expect(s.health).toBeGreaterThan(FAIL.HEALTH_CRITICAL);
  });
  it('and the night after a missed meal (hungry crew go to bed) still leaves morale above critical', () => {
    const s = calm(); for (const id of CREW_IDS) s.crew[id].hunger = 100;
    endSol(s); s.pending = null; resetFailureCounters(s);
    const r = evaluateFailures(s, 0); expect(r.failure).toBeNull(); expect(teamMorale(s)).toBeGreaterThan(FAIL.MORALE_CRITICAL);
  });
});

describe('causeFromLegacy (keeps today\'s pass-out kinds working through the new causes)', () => {
  it('maps suit, air, resources and health', () => {
    expect(causeFromLegacy('suit')).toBe('NO_SUIT'); expect(causeFromLegacy('air')).toBe('SUIT_AIR');
    for (const k of ['o2', 'water', 'food']) expect(causeFromLegacy(k)).toBe('RESOURCE_DEPLETED');
    expect(causeFromLegacy('health')).toBe('PLAYER_HEALTH_LOW');
    const s = calm(); risky(s); s.outside = true; expect(causeFromLegacy('health', s)).toBe('RADIATION_HIGH');
  });
});

describe('failure screen data and warnings (Step 7b)', () => {
  it('every cause has a title; every warning-able cause has a Reyes line', () => {
    for (const id of IDS) expect(FAILURE_TITLES[id].length).toBeGreaterThan(5);
    for (const id of IDS.filter(x => x !== 'NO_SUIT')) expect((WARNING_LINES[id] ?? '').length).toBeGreaterThan(10);
    expect(WARNING_LINES.NO_SUIT).toBeUndefined(); // no suit hint before a failure
  });
  it('a warning plays once and again only after it went away', () => {
    expect(newWarnings([], ['PLAYER_HEALTH_LOW'])).toEqual(['PLAYER_HEALTH_LOW']);
    expect(newWarnings(['PLAYER_HEALTH_LOW'], ['PLAYER_HEALTH_LOW', 'SUIT_AIR'])).toEqual(['SUIT_AIR']);
    expect(newWarnings(['SUIT_AIR'], [])).toEqual([]);
  });
});

describe('every cause restores the checkpoint (Step 7b)', () => {
  const ruin = (id: FailureId, s: GameState) => { // put the state into the failure, as the game would
    s.sol = 3; s.hour = 20; s.energy = 2; s.res.food = 0; s.failed = 'food'; s.flags.tmp_passout = 'x'; s.flags.tmp_failed_snooze = true; s.flags.fail_health_h = 9; s.flags.fail_morale_h = 9; s.flags.fail_rad_h = 9;
    if (id === 'NO_SUIT') { s.outside = true; s.suitOn = false; } else if (id === 'SUIT_AIR') { s.outside = true; s.suitOn = true; s.suit = 0; }
    else if (id === 'RADIATION_HIGH') { s.outside = true; s.suitOn = true; s.health = 5; } else if (id === 'PLAYER_HEALTH_LOW') s.health = 0; else if (id === 'TEAM_MORALE_LOW') setMorale(s, 0);
  };
  for (const id of IDS.filter(x => x !== 'NO_SUIT')) it(`${id}: back to the checkpoint, inside, full suit, counters cleared`, () => {
    const sess = newSession(1, { mode: 'storm' }); sess.state.pending = null; saveCheckpoint(sess);
    const want = JSON.parse(sess.checkpoint!) as GameState;
    ruin(id, sess.state); expect(sess.state.sol).toBe(3);
    expect(restoreAfterFailure(sess, id)).toBe(true);
    const s = sess.state;
    expect(s.sol).toBe(want.sol); expect(s.hour).toBe(want.hour); expect(s.energy).toBe(want.energy); expect(s.res.food).toBe(want.res.food); expect(s.health).toBe(want.health);
    expect(s.outside).toBe(false); expect(s.suit).toBe(100); expect(s.failed).toBeNull(); expect(s.flags.tmp_passout).toBeUndefined(); expect(s.flags.tmp_failed_snooze).toBeUndefined();
    expect([s.flags.fail_health_h, s.flags.fail_morale_h, s.flags.fail_rad_h]).toEqual([0, 0, 0]);
    expect(s.ep!.passOuts).toBe((want.ep!.passOuts ?? 0) + 1); expect(s.flags.last_failure).toBe(id);
    expect(evaluateFailures(s, 0).failure).toBeNull(); // not failing again straight away
  });
  it('without a checkpoint nothing is restored', () => {
    const sess = newSession(1, { mode: 'storm' }); delete sess.checkpoint; expect(restoreAfterFailure(sess, 'RESOURCE_DEPLETED')).toBe(false);
  });
  it('the old pass-out kinds restore too, through causeFromLegacy', () => {
    for (const kind of ['suit', 'air', 'health', 'food']) { const sess = newSession(1, { mode: 'storm' }); sess.state.sol = 4; expect(restoreAfterFailure(sess, causeFromLegacy(kind, sess.state))).toBe(true); expect(sess.state.sol).toBe(kind === 'suit' ? 4 : 1); } // NO_SUIT ('suit') lands at the airlock and keeps the Sol (Step 24j)
  });
});

describe('compact failure card (Step 25c)', () => {
  it('every cause has an icon that exists in the icon set', async () => { const { ICON } = await import('../src/ui/icons'); for (const id of IDS) expect(ICON[FAILURE_ICON[id]], id).toBeTruthy(); });
});
describe('NO_SUIT airlock respawn and tip (Step 24j)', () => {
  it('the tip is the exact text', () => { expect(NO_SUIT_TIP).toBe('Always put on your suit before going outside.'); expect(FAILURE_CAUSES.NO_SUIT.tip).toBe(NO_SUIT_TIP); expect(FAIL.NO_SUIT_GLITCH_MS).toBe(3000); });
  it('NO_SUIT ends inside with safe health and NO checkpoint restart', () => {
    const sess = newSession(1, { mode: 'storm' }); sess.state.pending = null; saveCheckpoint(sess);
    const s = sess.state; s.sol = 3; s.hour = 15; s.energy = 40; s.outside = true; s.suitOn = false; s.health = 0; s.flags.fail_health_h = 9;
    expect(restoreAfterFailure(sess, 'NO_SUIT')).toBe(true);
    expect(sess.state).toBe(s); expect(s.sol).toBe(3); expect(s.hour).toBe(15); expect(s.energy).toBe(40);
    expect(s.outside).toBe(false); expect(s.health).toBeGreaterThanOrEqual(FAIL.NO_SUIT_SAFE_HEALTH); expect(s.flags.fail_health_h).toBe(0); expect(s.flags.last_failure).toBe('NO_SUIT');
    expect(evaluateFailures(s, 0).failure).toBeNull();
  });
  it('health already above safe is kept; works with no checkpoint', () => {
    const s = newGame(1, { mode: 'storm' }); s.health = 90; respawnAtAirlock(s); expect(s.health).toBe(90);
    const sess = newSession(1, { mode: 'storm' }); delete sess.checkpoint; expect(restoreAfterFailure(sess, 'NO_SUIT')).toBe(true);
  });
  it('refill shows only while wearing the suit inside', () => {
    const s = calm(); s.suit = 50; s.outside = false; s.suitOn = false; expect(suitRefillShows(s)).toBe(false);
    s.suitOn = true; expect(suitRefillShows(s)).toBe(true); s.outside = true; expect(suitRefillShows(s)).toBe(false); s.outside = false; s.suit = 100; expect(suitRefillShows(s)).toBe(false);
  });
});
