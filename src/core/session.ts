import { MAX_SNAPSHOTS } from './constants';
import { endSol, newGame } from './sim';
import type { DailyReport, Decision, GameState, SolSummary } from './types';

// A Session wraps the live state with the rewind timeline. Rewind restores the MORNING of an earlier Sol.
// NASA-derived environment is a pure function of the Sol number (see env.ts), so it is never rewritten.
export interface Branch { fromSol: number; toSol: number; history: SolSummary[]; decisions: Decision[] }
export interface Session { state: GameState; snapshots: Record<number, string>; branches: Branch[] }

const clone = (s: GameState): GameState => JSON.parse(JSON.stringify(s));

export function snapshot(sess: Session): void {
  sess.snapshots[sess.state.sol] = JSON.stringify(sess.state);
  const sols = Object.keys(sess.snapshots).map(Number).sort((a, b) => a - b);
  while (sols.length > MAX_SNAPSHOTS) delete sess.snapshots[sols.shift()!];
}
export function newSession(seed = 1): Session {
  const sess: Session = { state: newGame(seed), snapshots: {}, branches: [] };
  snapshot(sess);
  return sess;
}
export function sleep(sess: Session): DailyReport {
  const report = endSol(sess.state);
  snapshot(sess);
  return report;
}
export const rewindableSols = (sess: Session): number[] =>
  Object.keys(sess.snapshots).map(Number).filter(n => n < sess.state.sol || sess.state.failed).sort((a, b) => b - a);

export function rewind(sess: Session, sol: number): boolean {
  const snap = sess.snapshots[sol];
  if (!snap) return false;
  const from = sess.state;
  sess.branches.push({ fromSol: from.sol, toSol: sol, history: from.history.filter(h => h.sol >= sol), decisions: from.decisions.filter(d => d.sol >= sol) });
  if (sess.branches.length > 12) sess.branches.shift();
  sess.state = clone(JSON.parse(snap));
  for (const k of Object.keys(sess.snapshots)) if (Number(k) > sol) delete sess.snapshots[Number(k)];
  return true;
}

// ---------- persistence ----------
export const SAVE_KEY = 'mrp.save.v1';
export const serialize = (sess: Session): string => JSON.stringify(sess);
export function deserialize(raw: string): Session | null {
  try {
    const d = JSON.parse(raw);
    if (!d?.state || d.state.version !== 1 || typeof d.snapshots !== 'object') return null;
    return d as Session;
  } catch { return null; }
}
export function saveToStorage(sess: Session, store: Pick<Storage, 'setItem'> = localStorage): boolean {
  try { store.setItem(SAVE_KEY, serialize(sess)); return true; } catch { return false; }
}
export function loadFromStorage(store: Pick<Storage, 'getItem'> = localStorage): Session | null {
  try { const raw = store.getItem(SAVE_KEY); return raw ? deserialize(raw) : null; } catch { return null; }
}
