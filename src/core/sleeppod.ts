// Step 17a: sleeping in the pod. Pure logic. It reuses the EXISTING sleep()/endSol: exactly one Sol passes.
// Refusals: something must happen first. Early wake: the night's events are waiting, so an alarm pulse wakes you with a reason.
import { describePending } from './director';
import { sleep, type Session } from './session';
import type { DailyReport, GameState } from './types';

/** Null when the player may sleep, otherwise the reason (always short, kid-friendly, and never about the suit). */
export function sleepRefusal(s: GameState): string | null {
  if (s.failed) return 'The mission has stopped.';
  if (s.pending) return 'Finish the conversation first.';
  if (s.outside) return 'You can only sleep inside the base.';
  const ep = s.ep;
  if (ep) {
    if (ep.call === 'ringing') return 'Captain Reyes is calling. Answer the intercom first.';
    if (ep.phase === 'call') return 'Captain Reyes is waiting for you at the hallway intercom.';
    if (ep.stormCall === 'stow' && !ep.panelsStowed && ep.phase !== 'after' && ep.phase !== 'done') return 'You planned to stow the panels. Pull the panel lever first.';
  }
  return null;
}

/** After waking: when a major event is already waiting, an alarm pulse woke you early. Returns the reason, or null for a calm morning. */
export function wakeReason(s: GameState): string | null {
  if (!s.pending) return null;
  const v = describePending(s);
  return v?.lines?.[0] ? `Alarm! ${v.lines[0]}` : 'Alarm! Something needs your attention.';
}

export type PodResult = { ok: false; reason: string } | { ok: true; report: DailyReport; wakeReason: string | null; solBefore: number };
export function podSleep(sess: Session): PodResult {
  const reason = sleepRefusal(sess.state); if (reason) return { ok: false, reason };
  const solBefore = sess.state.sol, report = sleep(sess);
  return { ok: true, report, wakeReason: wakeReason(sess.state), solBefore };
}
