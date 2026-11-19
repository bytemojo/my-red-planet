// Step 22a: the Episode 1 score. PURE (no Phaser, no DOM, no clock): the same state always gives the same score, and nothing here changes the state.
// Step 22b draws this on the mission screen; the old computeResult() in episode.ts still feeds the current debrief until then.
import { SELF_SUFFICIENT_GOAL } from './constants';
import { CREW_IDS, teamMorale } from './crewlife';
import { QUIZ, levelsPassed, quizOf } from './quiz';
import { baseEnergy, plantHealth } from './episode';
import { sustainabilityPenalty } from './dish';
import { rates } from './sim';
import { BONUS_STARS, bonusDone } from '../story/objectives';
import type { GameState, ResKey } from './types';

/** The five measures, each 0-100. */
export type MeasureId = 'morale' | 'health' | 'plants' | 'energy' | 'sustainability';
export interface Measures { morale: number; health: number; plants: number; energy: number; sustainability: number }

/** Weights. They sum to exactly 1 (tested), so five measures of 100 give a score of 1000. */
export const WEIGHTS: Readonly<Record<MeasureId, number>> = { morale: 0.25, health: 0.2, plants: 0.2, energy: 0.15, sustainability: 0.2 };
export const MEASURE_LABELS: Readonly<Record<MeasureId, string>> = {
  morale: 'Team Morale', health: 'Player Health', plants: 'Plant Growth', energy: 'Station Energy', sustainability: 'Sustainability',
};
export const MAX_SCORE = 1000;
/** Main stars: finishing the episode is 1 star, then these score marks give the 2nd and 3rd. */
export const STAR_MARKS = { second: 450, third: 700 } as const;
/** Sustainability: the base counts as fully sustainable when it could live this many Sols on its stocks alone (the campaign goal). */
export const SUSTAIN_FULL_SOLS = SELF_SUFFICIENT_GOAL;
export const HOURS_PER_SOL = 24;

const clamp100 = (n: number): number => Math.max(0, Math.min(100, Math.round(Number.isFinite(n) ? n : 0)));

/**
 * SUSTAINABILITY = how long the base survives without a shipment from Earth.
 * For air, water and food: Sols the current stock lasts at today's net rate (production counts, a water maker that is OFF produces nothing).
 * A resource that is not shrinking lasts "forever" (capped). The weakest resource decides. SUSTAIN_FULL_SOLS Sols or more = 100.
 * Then the dish decision's cost comes off (core/dish.ts sustainabilityPenalty: comms 8, dish 4, none 0).
 */
export function solsWithoutShipment(s: GameState): number {
  const r = rates(s);
  let best = Infinity;
  for (const k of ['o2', 'water', 'food'] as ResKey[]) {
    const perSol = -r[k] * HOURS_PER_SOL;                       // positive = the stock shrinks
    best = Math.min(best, perSol > 1e-9 ? s.res[k] / perSol : Infinity);
  }
  return Math.min(best, SUSTAIN_FULL_SOLS);
}
export const sustainabilityMeasure = (s: GameState): number => clamp100((solsWithoutShipment(s) / SUSTAIN_FULL_SOLS) * 100 - sustainabilityPenalty(s));

export function measuresOf(s: GameState): Measures {
  return {
    morale: clamp100(teamMorale(s)), health: clamp100(s.health), plants: clamp100(plantHealth(s)),
    energy: clamp100(baseEnergy(s)), sustainability: sustainabilityMeasure(s),
  };
}

/** THE score formula: score = round( sum over the five measures of weight x measure x 10 ), 0..1000. */
export function scoreOf(m: Measures): number {
  let t = 0;
  for (const id of Object.keys(WEIGHTS) as MeasureId[]) t += WEIGHTS[id] * clamp100(m[id]);
  return Math.max(0, Math.min(MAX_SCORE, Math.round(t * (MAX_SCORE / 100))));
}
/** 1 star for finishing, 2 from STAR_MARKS.second, 3 from STAR_MARKS.third. */
export const mainStars = (score: number): 1 | 2 | 3 => (score >= STAR_MARKS.third ? 3 : score >= STAR_MARKS.second ? 2 : 1);

export interface Score { measures: Measures; score: number; stars: 1 | 2 | 3 }
export function computeScore(s: GameState): Score {
  const measures = measuresOf(s), score = scoreOf(measures);
  return { measures, score, stars: mainStars(score) };
}

// ---------- bonus stars ----------
/** Share rule (assumption, also in STATE.md): the tick shows at once on this device; it only COUNTS toward the bonus total one hour later. */
export const SHARE_COUNT_AFTER_MS = 60 * 60 * 1000;
export const shareMarked = (sharedAt: number | null | undefined): boolean => typeof sharedAt === 'number' && Number.isFinite(sharedAt);
export const shareCounts = (sharedAt: number | null | undefined, now: number): boolean => shareMarked(sharedAt) && now - (sharedAt as number) >= SHARE_COUNT_AFTER_MS;

export interface BonusInput { wikiRead?: boolean; sharedAt?: number | null; now: number }
export interface BonusResult { id: string; label: string; done: boolean; counts: boolean }
/** done = what the screen ticks; counts = what is added to the bonus total. They differ only for Share, in its first hour. */
export function bonusResults(s: GameState, input: BonusInput): BonusResult[] {
  return BONUS_STARS.map(b => {
    if (b.id === 'share') return { id: b.id, label: b.label, done: shareMarked(input.sharedAt), counts: shareCounts(input.sharedAt, input.now) };
    const done = bonusDone(s, b.id, { wikiRead: input.wikiRead, shared: shareMarked(input.sharedAt) });
    return { id: b.id, label: b.label, done, counts: done };
  });
}
export const bonusCount = (rs: BonusResult[]): number => rs.filter(r => r.counts).length;

// ---------- Step 27i: Astronaut Mastery (quiz). A SEPARATE number: nothing above (the Episode 1 score formula) reads or changes it. ----------
/** 20 levels in all (4 crew x 5). Each passed level is worth 4.5 points (90 total); each level passed under QUIZ.FAST_S adds 0.5 (10 total). */
export const MASTERY = { LEVELS_TOTAL: CREW_IDS.length * QUIZ.LEVELS, LEVEL_POINTS: 90, SPEED_POINTS: 10 } as const;
/** Astronaut Mastery, 0-100. Built only from counters that go up (levels passed, fast first passes), so a failure or a timeout can never lower it. */
export function masteryScore(s: GameState): number {
  const levels = levelsPassed(s), fast = Math.min(quizOf(s).fastPasses, levels);
  return Math.max(0, Math.min(100, Math.round((levels / MASTERY.LEVELS_TOTAL) * MASTERY.LEVEL_POINTS + (fast / MASTERY.LEVELS_TOTAL) * MASTERY.SPEED_POINTS)));
}
/** One short line for the mission screen, the pause menu and the badge. */
export const masteryLine = (s: GameState): string => `ASTRONAUT MASTERY ${masteryScore(s)} / 100`;
export const masteryDetail = (s: GameState): string => `${levelsPassed(s)} of ${MASTERY.LEVELS_TOTAL} quiz levels passed`;
