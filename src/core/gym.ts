// Gym and player health (owner's prompt pack, Step 9). Pure rules, unit-tested in tests/gym.test.ts.
// The sweet spot is 1-2 workouts per Sol: skipping or overtraining both cost health. Game model numbers,
// based on the real idea that space station crews exercise about two hours every day (see docs/NASA_SOURCES.md).
import { clamp, flagNum } from './util';
import type { GameState } from './types';

export type Machine = 'bands' | 'bike' | 'rower';
export const MACHINES: Record<Machine, { name: string; energy: number; health: number; what: string }> = {
  bands: { name: 'Resistance bands', energy: 5, health: 2, what: 'A quick warm-up for shoulders and core. Low effort, small boost.' },
  bike: { name: 'Cycle ergometer', energy: 10, health: 4, what: 'A seatless bike you clip into. Cardio for your heart and lungs.' },
  rower: { name: 'Rowing machine', energy: 15, health: 6, what: 'Works the whole body. The best workout, and the most tiring.' },
};
export const GYM = { SWEET_MIN: 1, SWEET_MAX: 2, SKIPPED: -8, SWEET: 10, OVERTRAINED: -5, OVER_NOW: -4 };

export const workoutsToday = (s: GameState) => flagNum(s, 'tmp_workouts');

export function workout(s: GameState, m: Machine): { ok: boolean; msg: string } {
  const mc = MACHINES[m];
  if (s.energy < mc.energy) return { ok: false, msg: 'Too tired to work out. Rest first.' };
  s.energy -= mc.energy;
  const n = workoutsToday(s) + 1; s.flags.tmp_workouts = n;
  if (n > GYM.SWEET_MAX) { s.health = clamp(s.health + GYM.OVER_NOW, 0, 100); return { ok: true, msg: `Too much! That is workout ${n} today. Your muscles need rest now.` }; }
  s.health = clamp(s.health + mc.health, 0, 100);
  return { ok: true, msg: `${mc.name} done (${n} of ${GYM.SWEET_MAX} today).` };
}

// Called at the end of a Sol (before tmp_ flags are cleared). Returns the morning message.
export function gymNight(s: GameState): string {
  const n = workoutsToday(s);
  if (n === 0) { s.health = clamp(s.health + GYM.SKIPPED, 0, 100); return `You skipped your workout yesterday, so your health dropped (${GYM.SKIPPED}). Try one or two sessions today.`; }
  if (n > GYM.SWEET_MAX) { s.health = clamp(s.health + GYM.OVERTRAINED, 0, 100); return `You trained ${n} times yesterday. Too much: your health dropped (${GYM.OVERTRAINED}). One or two sessions is the sweet spot.`; }
  s.health = clamp(s.health + GYM.SWEET, 0, 100);
  return `Good workout yesterday. You rested well and recovered (+${GYM.SWEET} health).`;
}

// Healthier explorers handle radiation outside better: drain x0.7 at full health, x1.3 at zero.
export const outsideDrainFactor = (health: number) => 1.3 - 0.6 * clamp(health, 0, 100) / 100;
