// Step 7a: failure causes and thresholds. Pure TypeScript (no Phaser, no DOM). Causes are DATA; evaluateFailures() decides which one (if any) applies.
// Nobody dies: a failure fades to black, shows the reason and the tip, then restores the checkpoint (Step 7b draws that screen).
// Low morale / health first gives a WARNING. A failure needs a SUSTAINED critical state, so one missed meal is never fatal.
import { FAIL } from './constants';
import { alertFor } from './episode';
import { teamMorale } from './crewlife';
import { reloadCheckpoint, type Session } from './session';
import type { GameState } from './types';

/** Step 8d: how the oxygen tank meter looks: blue (50%+), amber (25-50%), low = below the SUIT_AIR warning (red, pulsing amber, red glow on the suit's tank). */
export const tankLevel = (air: number): 'ok' | 'mid' | 'low' => (air < FAIL.SUIT_AIR_WARN ? 'low' : air < 50 ? 'mid' : 'ok');

export type FailureId = 'NO_SUIT' | 'RADIATION_HIGH' | 'SUIT_AIR' | 'PLAYER_HEALTH_LOW' | 'TEAM_MORALE_LOW' | 'RESOURCE_DEPLETED';
export interface FailureCause {
  id: FailureId;
  reason: string;                 // one sentence: what went wrong
  checkpoint: 'last_checkpoint' | 'airlock';  // where you restart: the existing checkpoint (start of the Sol or the last finished objective); NO_SUIT lands you at the airlock instead
  tip: string;                    // what to do next time
}

/** Step 24j: the exact NO_SUIT tip. It only ever appears AFTER the failure (Owner Rule 3). */
export const NO_SUIT_TIP = 'Always put on your suit before going outside.';
export const FAILURE_TIP_SUFFIX = 'Tip: always pay attention to your meters.';

export const FAILURE_CAUSES: Record<FailureId, FailureCause> = {
  NO_SUIT: { id: 'NO_SUIT', checkpoint: 'airlock', reason: 'You went outside without your EVA suit.', tip: NO_SUIT_TIP },
  RADIATION_HIGH: { id: 'RADIATION_HIGH', checkpoint: 'last_checkpoint', reason: 'You stayed outside while the radiation was high.', tip: 'When the Solar Alert turns red, get back inside fast.' },
  SUIT_AIR: { id: 'SUIT_AIR', checkpoint: 'last_checkpoint', reason: 'The air in your suit ran out while you were outside.', tip: 'Watch your suit air and walk back to the airlock before it runs low.' },
  PLAYER_HEALTH_LOW: { id: 'PLAYER_HEALTH_LOW', checkpoint: 'last_checkpoint', reason: 'Your health stayed too low for too long.', tip: 'Feed the crew and yourself. A skipped meal hurts everyone.' },
  TEAM_MORALE_LOW: { id: 'TEAM_MORALE_LOW', checkpoint: 'last_checkpoint', reason: 'The crew felt so low for so long that the team could not carry on.', tip: 'Talk to the crew, serve different meals, and watch the morale face above each person.' },
  RESOURCE_DEPLETED: { id: 'RESOURCE_DEPLETED', checkpoint: 'last_checkpoint', reason: 'The base ran out of air, water or food.', tip: 'Always pay attention to your meters.' },
};

/** The lines the failure screen shows under the reason: the cause's own tip, then the shared closing tip (never the same sentence twice). */
export function failureTips(id: FailureId): string[] {
  const own = FAILURE_CAUSES[id].tip, shared = FAILURE_TIP_SUFFIX.replace(/^Tip:\s*/i, '');
  return own.toLowerCase() === shared.toLowerCase() ? [FAILURE_TIP_SUFFIX] : [own, FAILURE_TIP_SUFFIX];
}
/** Reason + tips as one text. Always ends with the shared tip. */
export const failureText = (id: FailureId): string => [FAILURE_CAUSES[id].reason, ...failureTips(id)].join(' ');

// Sustained-time counters live in flags (saved with the game, no save-shape change). They reset as soon as the state is no longer critical.
const H = 'fail_health_h', M = 'fail_morale_h', R = 'fail_rad_h';
const num = (s: GameState, k: string) => Number(s.flags[k] ?? 0) || 0;
export const resetFailureCounters = (s: GameState): void => { s.flags[H] = 0; s.flags[M] = 0; s.flags[R] = 0; };

export interface FailureCheck { failure: FailureId | null; warnings: FailureId[] }

/**
 * Look at the state and say whether it is a failure and which warnings apply. `hours` = game hours since the last call (0 = just look).
 * Only the sustained-time counters change. The first matching cause wins, in the order of FailureId.
 */
export function evaluateFailures(s: GameState, hours = 0): FailureCheck {
  const warnings: FailureId[] = [];
  const warn = (id: FailureId) => { if (!warnings.includes(id)) warnings.push(id); };
  const high = s.ep ? ['high', 'storm'].includes(alertFor(s)) : false;
  const morale = teamMorale(s);

  // sustained counters
  s.flags[H] = s.health <= FAIL.HEALTH_CRITICAL ? num(s, H) + hours : 0;
  s.flags[M] = morale <= FAIL.MORALE_CRITICAL ? num(s, M) + hours : 0;
  s.flags[R] = s.outside && s.suitOn && high ? num(s, R) + hours : 0;

  // warnings come first
  if (s.health <= FAIL.HEALTH_WARN) warn('PLAYER_HEALTH_LOW');
  if (morale <= FAIL.MORALE_WARN) warn('TEAM_MORALE_LOW');
  if (s.outside && high) warn('RADIATION_HIGH');
  if (s.outside && s.suit <= FAIL.SUIT_AIR_WARN) warn('SUIT_AIR');
  if ((['o2', 'water', 'food'] as const).some(k => s.res[k] <= FAIL.RESOURCE_WARN)) warn('RESOURCE_DEPLETED');

  // failures need more than a warning
  let failure: FailureId | null = null;
  if (s.ep && (s.outside || s.airExposed) && !s.suitOn && s.health <= FAIL.HEALTH_CRITICAL) failure = 'NO_SUIT'; // Step 8c: the health drain outside without the suit gets you here
  else if (s.outside && s.suit <= 0) failure = 'SUIT_AIR';
  else if (num(s, R) >= FAIL.RADIATION_HOURS) failure = 'RADIATION_HIGH';
  else if (s.health <= 0 || num(s, H) >= FAIL.CRITICAL_HOURS) failure = 'PLAYER_HEALTH_LOW';
  else if ((['o2', 'water', 'food'] as const).some(k => s.res[k] <= 0)) failure = 'RESOURCE_DEPLETED';
  else if (num(s, M) >= FAIL.CRITICAL_HOURS) failure = 'TEAM_MORALE_LOW';
  return { failure, warnings };
}

/** Map today's pass-out kinds (flags.tmp_passout) and the old resource failure (state.failed) to a cause, so the old pass-out keeps working through the new screen (Step 7b). */
export function causeFromLegacy(kind: string, s?: Pick<GameState, 'outside' | 'ep'> & { sol: number; hour: number }): FailureId {
  if (kind === 'suit') return 'NO_SUIT';
  if (kind === 'air') return 'SUIT_AIR';
  if (kind === 'health') return s && s.outside && s.ep && ['high', 'storm'].includes(alertFor(s as GameState)) ? 'RADIATION_HIGH' : 'PLAYER_HEALTH_LOW';
  return 'RESOURCE_DEPLETED'; // 'o2' | 'water' | 'food'
}

// ---------- Step 7b: the failure screen, the warning state, and the restore ----------
export const FAILURE_TITLES: Record<FailureId, string> = {
  NO_SUIT: 'You passed out', RADIATION_HIGH: 'You passed out', SUIT_AIR: 'You passed out', PLAYER_HEALTH_LOW: 'You passed out',
  TEAM_MORALE_LOW: 'The crew needs a break', RESOURCE_DEPLETED: 'The base ran out of supplies',
};
/** Step 25c: the icon (a key of ui/icons.ts) shown at the top of the compact failure card. */
export const FAILURE_ICON: Record<FailureId, string> = { NO_SUIT: 'suit', RADIATION_HIGH: 'rad', SUIT_AIR: 'o2', PLAYER_HEALTH_LOW: 'heart', TEAM_MORALE_LOW: 'crew', RESOURCE_DEPLETED: 'gauge' };
/** Captain Reyes on the intercom when a warning first appears. NO_SUIT has none: going outside without the suit is immediate, and the only reminder is the tip after the failure. */
export const WARNING_LINES: Partial<Record<FailureId, string>> = {
  PLAYER_HEALTH_LOW: 'Your health is getting low. Eat something and rest.',
  TEAM_MORALE_LOW: 'The crew is feeling down. Go and talk to them.',
  RADIATION_HIGH: 'The Solar Alert is high! Get back inside, now.',
  SUIT_AIR: 'Your suit air is running low. Head for the airlock.',
  RESOURCE_DEPLETED: 'One of our supplies is almost gone. Check your meters.',
};
/** Warnings that appeared since last time (so a warning plays once, and again only after it went away). */
export const newWarnings = (before: readonly FailureId[], now: readonly FailureId[]): FailureId[] => now.filter(w => !before.includes(w));

/** Step 24j: the suit refill animation/toast only plays when the suit is actually worn, inside, and not full. */
export const suitRefillShows = (s: Pick<GameState, 'ep' | 'suitOn' | 'outside' | 'suit'>): boolean => !!s.ep && s.suitOn && !s.outside && s.suit < 99.5;

/** Step 24j: NO_SUIT ends here. Time, energy and supplies stay as they are: the player is inside (airlock), health is raised to a safe level, counters are cleared. */
export function respawnAtAirlock(s: GameState): void {
  s.outside = false; s.health = Math.max(s.health, FAIL.NO_SUIT_SAFE_HEALTH); s.failed = null;
  resetFailureCounters(s); delete s.flags.tmp_failed_snooze; delete s.flags.tmp_passout; s.flags.last_failure = 'NO_SUIT';
  if (s.ep) s.ep.passOuts = (s.ep.passOuts ?? 0) + 1;
}

/**
 * Every failure restores the SAME existing checkpoint (start of the Sol or last finished objective): the explorer is back inside with a full suit,
 * the failure counters and the resource failure are cleared, and the pass-out count goes up. Returns false if there is no checkpoint.
 */
export function restoreAfterFailure(sess: Session, id: FailureId): boolean {
  if (id === 'NO_SUIT') { respawnAtAirlock(sess.state); return true; } // Step 24j: no checkpoint restart; the player lands inside at the airlock
  if (!reloadCheckpoint(sess)) return false;
  const s = sess.state; resetFailureCounters(s); s.failed = null; delete s.flags.tmp_failed_snooze; delete s.flags.tmp_passout; s.flags.last_failure = id;
  return true;
}
