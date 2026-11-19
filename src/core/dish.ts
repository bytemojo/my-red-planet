// Step 14a: the dish decision (pure: no Phaser/DOM). After the five-system check a fault shows on the outdoor dish and the comms console.
// Captain Reyes says only ONE can be fixed before the storm. The choice only sets a flag + objective; the repair itself is physical (Steps 14b/14c).
//   A) 'comms': repair the console inside. Earth contact stays good, but the water maker stays damaged (water is tight).
//   B) 'dish' : go outside and repair the dish / water-maker link. Water production is restored, but comms stay unreliable (static, late replies).
import { EP } from './constants';
import { breakMachine, isBroken } from './inventory';
import { SYSTEMS } from './episode-systems';
import type { GameState } from './types';

export type DishBranch = 'comms' | 'dish';
export const FAULT_FLAG = 'fault_repaired';      // the ONE critical fault is repaired (read by story/objectives.ts)
export const DISH_FAULT_FLAG = 'dish_fault';     // the fault has been shown (set once, after the check)
export const DISH_CHOICE_FLAG = 'dish_choice';   // 'comms' | 'dish'
export const DISH_BROKEN_FLAG = 'dish_broken';   // the outdoor dish art/state is broken until branch B repairs it

export const dishChoice = (s: Pick<GameState, 'flags'>): DishBranch | null => { const v = s.flags[DISH_CHOICE_FLAG]; return v === 'comms' || v === 'dish' ? v : null; };
export const dishFaultRaised = (s: Pick<GameState, 'flags'>) => !!s.flags[DISH_FAULT_FLAG];
export const faultRepaired = (s: Pick<GameState, 'flags'>) => !!s.flags[FAULT_FLAG];
export const isDishBroken = (s: Pick<GameState, 'flags'>) => !!s.flags[DISH_BROKEN_FLAG];

/** True once all five systems are checked on Sol 1 (before the storm) and the fault has not been shown yet. */
export const shouldRaiseDish = (s: GameState): boolean =>
  !!s.ep && s.sol === 1 && !dishFaultRaised(s) && SYSTEMS.every(x => s.ep!.checked.includes(x));

/** Show the fault: the dish and the comms console are both broken; only one can be fixed. Returns true if it just happened. */
export function raiseDish(s: GameState): boolean {
  if (!shouldRaiseDish(s)) return false;
  s.flags[DISH_FAULT_FLAG] = 1; s.flags[DISH_BROKEN_FLAG] = 1; breakMachine(s, 'comms');
  if (!s.pending) s.pending = { kind: 'event', id: 'dish_decision' };
  return true;
}
export function chooseDish(s: GameState, branch: DishBranch): void { s.flags[DISH_CHOICE_FLAG] = branch; }

// ---------- branch B: the dish is repaired outside ----------
export const DISH_NEED_CHOICE_MSG = 'The dish is not today\'s repair job.';
export const DISH_OUTSIDE_MSG = 'The dish is outside.';
/** Why the dish cannot be repaired right now (null = can). Pure. */
export function dishProblem(s: Pick<GameState, 'flags' | 'outside' | 'energy'>, partInHand: boolean, parts: number): string | null {
  if (dishChoice(s) !== 'dish') return DISH_NEED_CHOICE_MSG;
  if (!isDishBroken(s)) return 'The dish already works.';
  if (!s.outside) return DISH_OUTSIDE_MSG;
  if (!partInHand) return 'Hold a spare part first. Take one from the storage room.';
  if (parts < 1) return 'There are no spare parts left.';
  if (s.energy < EP.DISH_REPAIR_ENERGY) return 'You are too tired to repair it. Sleep to get your energy back.';
  return null;
}

// ---------- consequences (read by sim, beats, the debrief and, later, the score) ----------
/** Branch A leaves the water maker damaged: this much water is lost on every storm night. */
export const waterLossPerNight = (s: Pick<GameState, 'flags'>): number => dishChoice(s) === 'comms' ? EP.DISH_WATER_LOSS : 0;
/** Branch B leaves comms down: Earth's reply arrives later, as static. */
export const staticComms = (s: Pick<GameState, 'flags'>): boolean => dishChoice(s) === 'dish' && isBroken(s, 'comms');
export const earthReplySol = (s: Pick<GameState, 'flags'>): number => staticComms(s) ? 3 : 2;
/** Points taken off Sustainability (Step 22 reads this): a damaged water maker costs more than late mail. */
export const sustainabilityPenalty = (s: Pick<GameState, 'flags'>): number => dishChoice(s) === 'comms' ? EP.DISH_SUSTAIN.comms : dishChoice(s) === 'dish' ? EP.DISH_SUSTAIN.dish : 0;

// Step 26c: pure pose of the WORKING outdoor dish. It turns slowly around its mast (one turn per DISH_TURN_MS).
// 'face' is how wide the bowl looks from the camera (never edge-on thin), 'swing' shifts the feed horn sideways.
export const DISH_TURN_MS = 12000;
export const DISH_MIN_FACE = 0.3;
export const dishSpin = (tMs: number, reduced = false): { angle: number; face: number; swing: number } => {
  const angle = reduced ? 0.6 : ((tMs % DISH_TURN_MS) / DISH_TURN_MS) * Math.PI * 2;
  return { angle, face: DISH_MIN_FACE + (1 - DISH_MIN_FACE) * Math.abs(Math.cos(angle)), swing: Math.sin(angle) };
};
