import { describe, expect, it } from 'vitest';
import { newSession } from '../src/core/session';
import { CREW_IDS } from '../src/core/crewlife';
import { EP } from '../src/core/constants';
import {
  HOURS_PER_SOL, MAX_SCORE, MEASURE_LABELS, STAR_MARKS, SUSTAIN_FULL_SOLS, WEIGHTS, bonusCount, bonusResults, computeScore, mainStars,
  measuresOf, scoreOf, shareCounts, shareMarked, solsWithoutShipment, sustainabilityMeasure, SHARE_COUNT_AFTER_MS, type Measures, type MeasureId,
} from '../src/core/score';
import type { GameState } from '../src/core/types';

const fresh = (): GameState => { const s = newSession(11, { mode: 'storm', quick: true }).state; s.pending = null; return s; };
const full: Measures = { morale: 100, health: 100, plants: 100, energy: 100, sustainability: 100 };
const ids = Object.keys(WEIGHTS) as MeasureId[];

describe('Step 22a: score formula', () => {
  it('has five labelled measures and the weights sum to exactly 1', () => {
    expect(ids).toEqual(['morale', 'health', 'plants', 'energy', 'sustainability']);
    expect(ids.map(i => MEASURE_LABELS[i])).toEqual(['Team Morale', 'Player Health', 'Plant Growth', 'Station Energy', 'Sustainability']);
    expect(ids.reduce((a, i) => a + WEIGHTS[i], 0)).toBeCloseTo(1, 12);
  });
  it('is out of 1000: all 100 = 1000, all 0 = 0, and out-of-range inputs are clamped', () => {
    expect(MAX_SCORE).toBe(1000);
    expect(scoreOf(full)).toBe(1000);
    expect(scoreOf({ morale: 0, health: 0, plants: 0, energy: 0, sustainability: 0 })).toBe(0);
    expect(scoreOf({ morale: 500, health: 500, plants: 500, energy: 500, sustainability: 500 })).toBe(1000);
    expect(scoreOf({ morale: -9, health: NaN, plants: -1, energy: -50, sustainability: -3 })).toBe(0);
  });
  it('each measure moves the score by exactly its weight x 10 per point', () => {
    for (const id of ids) {
      const lo = scoreOf({ ...full, [id]: 0 }), hi = scoreOf({ ...full, [id]: 50 });
      expect(hi - lo).toBe(Math.round(WEIGHTS[id] * 500));
      expect(scoreOf({ ...full, [id]: 60 })).toBeGreaterThan(scoreOf({ ...full, [id]: 40 }));
    }
  });
  it('3 main stars: 1 for finishing, 2 and 3 at the documented marks', () => {
    expect(mainStars(0)).toBe(1); expect(mainStars(STAR_MARKS.second - 1)).toBe(1); expect(mainStars(STAR_MARKS.second)).toBe(2);
    expect(mainStars(STAR_MARKS.third - 1)).toBe(2); expect(mainStars(STAR_MARKS.third)).toBe(3); expect(mainStars(1000)).toBe(3);
  });
  it('computeScore reads a real state, is deterministic and does not change it', () => {
    const s = fresh(), snap = JSON.stringify(s);
    const a = computeScore(s), b = computeScore(s);
    expect(a).toEqual(b); expect(JSON.stringify(s)).toBe(snap);
    expect(a.score).toBeGreaterThanOrEqual(0); expect(a.score).toBeLessThanOrEqual(1000);
    for (const id of ids) { expect(a.measures[id]).toBeGreaterThanOrEqual(0); expect(a.measures[id]).toBeLessThanOrEqual(100); expect(Number.isInteger(a.measures[id])).toBe(true); }
    expect(a.score).toBe(scoreOf(a.measures)); expect(a.stars).toBe(mainStars(a.score));
  });
  it('morale and health measures follow the game state', () => {
    const s = fresh();
    for (const c of CREW_IDS) s.crew[c].morale = 80; s.health = 64;
    const m = measuresOf(s); expect(m.morale).toBe(80); expect(m.health).toBe(64);
    for (const c of CREW_IDS) s.crew[c].morale = 20; expect(measuresOf(s).morale).toBe(20);
  });
});

describe('Step 22a: sustainability = how long the base survives without a shipment', () => {
  it('is the weakest of air, water and food, in Sols, capped at the campaign goal', () => {
    const s = fresh(); s.res.o2 = 100; s.res.water = 100; s.res.food = 100;
    const sols = solsWithoutShipment(s); expect(sols).toBeGreaterThan(0); expect(sols).toBeLessThanOrEqual(SUSTAIN_FULL_SOLS);
    const before = sustainabilityMeasure(s);
    s.res.food = 0; expect(solsWithoutShipment(s)).toBe(0); expect(sustainabilityMeasure(s)).toBe(0);
    s.res.food = 30; expect(sustainabilityMeasure(s)).toBeLessThan(before);          // food has no production: its stock decides
    s.res.food = 100; s.res.water = 0.5; expect(sustainabilityMeasure(s)).toBe(before); // water is produced while the maker runs, so a low tank alone is not the limit
    s.flags.water_maker_off = 1; expect(sustainabilityMeasure(s)).toBeLessThan(before); // with the maker off the tank is all there is
  });
  it('more stock never lowers it', () => {
    const s = fresh(); let prev = -1;
    for (const v of [0, 10, 25, 50, 75, 100]) { s.res.o2 = v; s.res.water = v; s.res.food = v; const m = sustainabilityMeasure(s); expect(m).toBeGreaterThanOrEqual(prev); prev = m; }
  });
  it('a stopped water maker shortens it', () => {
    const s = fresh(); s.res.o2 = 100; s.res.water = 60; s.res.food = 100; s.res.power = 100;
    const on = solsWithoutShipment(s); s.flags.water_maker_off = 1; expect(solsWithoutShipment(s)).toBeLessThanOrEqual(on);
  });
  it('the dish decision costs points: comms 8, dish 4, none 0 (and never below 0)', () => {
    const s = fresh(); s.res.o2 = 100; s.res.water = 100; s.res.food = 100; s.res.power = 100;
    const none = sustainabilityMeasure(s);
    s.flags.dish_choice = 'comms'; expect(sustainabilityMeasure(s)).toBe(Math.max(0, none - EP.DISH_SUSTAIN.comms));
    s.flags.dish_choice = 'dish'; expect(sustainabilityMeasure(s)).toBe(Math.max(0, none - EP.DISH_SUSTAIN.dish));
    s.res.o2 = 0; s.res.water = 0; s.res.food = 0; s.flags.dish_choice = 'comms'; expect(sustainabilityMeasure(s)).toBe(0);
    expect(HOURS_PER_SOL).toBe(24);
  });
});

describe('Step 22a: bonus stars (pure)', () => {
  const NOW = 1_800_000_000_000;
  it('share: ticked at once, but counts only after one hour', () => {
    expect(shareMarked(null)).toBe(false); expect(shareMarked(undefined)).toBe(false); expect(shareMarked(NOW)).toBe(true);
    expect(shareCounts(null, NOW)).toBe(false);
    expect(shareCounts(NOW, NOW)).toBe(false); expect(shareCounts(NOW, NOW + SHARE_COUNT_AFTER_MS - 1)).toBe(false);
    expect(shareCounts(NOW, NOW + SHARE_COUNT_AFTER_MS)).toBe(true);
  });
  it('bonusResults lists the five goals; share shows done before it counts', () => {
    const s = fresh();
    let rs = bonusResults(s, { now: NOW }); expect(rs.map(r => r.id)).toEqual(['crops', 'morale', 'journal', 'wiki', 'share']); expect(bonusCount(rs)).toBe(0);
    rs = bonusResults(s, { now: NOW, sharedAt: NOW, wikiRead: true });
    const share = rs.find(r => r.id === 'share')!; expect(share.done).toBe(true); expect(share.counts).toBe(false);
    expect(rs.find(r => r.id === 'wiki')!.counts).toBe(true); expect(bonusCount(rs)).toBe(1);
    rs = bonusResults(s, { now: NOW + SHARE_COUNT_AFTER_MS, sharedAt: NOW, wikiRead: true }); expect(bonusCount(rs)).toBe(2);
  });
  it('journal and morale come from the game state', () => {
    const s = fresh(); s.notes = [{ id: 'n1', sol: 1, text: 'Day one', at: 0 } as never];
    expect(bonusResults(s, { now: NOW }).find(r => r.id === 'journal')!.done).toBe(true);
    s.ep!.phase = 'done'; for (const c of CREW_IDS) s.crew[c].morale = 90; expect(bonusResults(s, { now: NOW }).find(r => r.id === 'morale')!.done).toBe(true);
    for (const c of CREW_IDS) s.crew[c].morale = 10; expect(bonusResults(s, { now: NOW }).find(r => r.id === 'morale')!.done).toBe(false);
  });
});
