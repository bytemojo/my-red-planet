// Step 21a: after the storm clean-up the water maker shuts down and the crew needs emergency water from a CANDIDATE ice sheet.
// Pure data + predicates (the transitions live in episode.ts). Never say the ice is confirmed. No suit hints in any text here.
import { EP } from './constants';
import type { GameState } from './types';

type Held = string | null | undefined;

export const WATER_MAKER_OFF = 'water_maker_off';   // set when the clean-up is done; production stops until ice is delivered
export const ICE_COLLECTED = 'ice_collected';     // Step 21b sets this when the container is full
export const ICE_DELIVERED = 'ice_delivered';       // the container reached the water-maker intake

export const waterMakerOff = (s: Pick<GameState, 'flags'>): boolean => !!s.flags[WATER_MAKER_OFF];
export const iceDelivered = (s: Pick<GameState, 'flags'>): boolean => !!s.flags[ICE_DELIVERED];

export const ICE_OBJECTIVE = {
  title: 'COLLECT EMERGENCY WATER',
  detail: 'The water maker has shut down. Collect emergency water from the candidate ice sheet, bring it back and pour it into the water-maker intake.',
  now: 'Collect emergency water from the candidate ice sheet.',
  next: 'Carry it back to the water-maker intake.',
};
export const ICE_TASKS = ['Collect emergency water from the candidate ice sheet', 'Carry the container back to the water-maker intake'] as const;

// ---------- Step 21b: the two physical steps (pure checks; sim.ts act('ice_chip') / act('ice_pour') use them) ----------
/** Why the player cannot chip ice right now (null = can). No text here mentions the suit. */
export function iceProblem(s: Pick<GameState, 'ep' | 'flags' | 'outside' | 'energy' | 'suit' | 'suitOn'>, held: Held): string | null {
  if (s.ep?.phase !== 'ice') return 'There is nothing to collect right now.';
  if (s.flags[ICE_COLLECTED]) return 'The container is full. Carry it to the water-maker intake.';
  if (!s.outside) return 'The candidate ice sheet is outside the base.';
  if (held) return 'Put your item down first.';
  if (s.energy < EP.ICE_ENERGY) return 'You are too tired to chip ice. Sleep to get your energy back.';
  if (s.suitOn && s.suit < EP.ICE_AIR) return 'Your air is too low. Go back inside to refill it.';
  return null;
}
/** Why the container cannot be poured in right now (null = can). */
export function pourProblem(s: Pick<GameState, 'ep' | 'flags' | 'outside'>, held: Held): string | null {
  if (s.ep?.phase !== 'ice') return 'The water maker does not need ice right now.';
  if (!s.flags[ICE_COLLECTED] || held !== 'ice_sample') return 'Bring a container of ice here first.';
  if (s.outside) return 'The intake is inside the base.';
  return null;
}
