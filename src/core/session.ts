import { MAX_SNAPSHOTS } from './constants';
import { SAVE_VERSION, endSol, newGame, type NewGameOpts } from './sim';
import { CREW_IDS, newCrewState } from './crewlife';
import { newQuizState } from './quiz';
import type { DailyReport, Decision, GameState, SolSummary } from './types';

// Upgrade an older state in place. Returns null if it cannot be read safely.
export function migrateState(s: GameState | null | undefined): GameState | null {
  if (!s || typeof s !== 'object' || typeof s.version !== 'number') return null;
  if (s.version > SAVE_VERSION) return null;
  if (s.version < 2) { // v1 -> v2: crew gained morale and hunger
    for (const id of CREW_IDS) s.crew[id] = { ...newCrewState(), ...(s.crew?.[id] ?? {}) };
    s.version = 2;
  }
  if (s.version < 3) { // v2 -> v3: Episode 1, suit rack, player health
    s.ep = s.ep ?? null; s.suitOn = s.suitOn ?? false; s.health = s.health ?? 100;
    s.version = 3;
  }
  if (s.version < 4) { // v3 -> v4: persistent crew conversations
    s.crewChats = s.crewChats ?? {};
    s.version = 4;
  }
  if (s.version < 5) { // v4 -> v5: meal variety memory
    s.recentMeals = s.recentMeals ?? [];
    s.version = 5;
  }
  if (s.version < 6) { // v5 -> v6: watering mode. A repaired pump meant automatic watering before, so keep that for old saves.
    s.wateringMode = s.ep?.wateringFixed ? 'automatic' : 'manual';
    s.version = 6;
  }
  if (s.version < 7) { // v6 -> v7: crew quiz progress
    s.quiz = s.quiz ?? newQuizState();
    s.version = 7;
  }
  return s;
}

// A Session wraps the live state with the rewind timeline. Rewind restores the MORNING of an earlier Sol.
// NASA-derived environment is a pure function of the Sol number (see env.ts), so it is never rewritten.
export interface Branch { fromSol: number; toSol: number; history: SolSummary[]; decisions: Decision[] }
/** Step 24a: where the player stood and what they held when the game was last saved, so CONTINUE resumes exactly there (checkpoints are for failures only). */
export interface LiveSpot { x: number; y: number; held: { item: string | null; crop?: string | null } }
export interface Session { state: GameState; snapshots: Record<number, string>; branches: Branch[]; checkpoint?: string; live?: LiveSpot }
/** Remember the live spot on the session (pure). Ignores bad numbers. */
export function captureLive(sess: Session, x: number, y: number, held: { item: string | null; crop?: string | null }): void {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  sess.live = { x, y, held: { item: held.item ?? null, crop: held.crop ?? null } };
}
/** The saved spot if it is valid, else null. */
export function liveSpot(sess: Session): LiveSpot | null {
  const l = sess.live; if (!l || !Number.isFinite(l.x) || !Number.isFinite(l.y) || typeof l.held !== 'object' || !l.held) return null;
  return l;
}

const clone = (s: GameState): GameState => JSON.parse(JSON.stringify(s));

export function snapshot(sess: Session): void {
  sess.snapshots[sess.state.sol] = JSON.stringify(sess.state);
  const sols = Object.keys(sess.snapshots).map(Number).sort((a, b) => a - b);
  while (sols.length > MAX_SNAPSHOTS) delete sess.snapshots[sols.shift()!];
}
export function newSession(seed = 1, opts: NewGameOpts = {}): Session {
  const sess: Session = { state: newGame(seed, opts), snapshots: {}, branches: [] };
  snapshot(sess); saveCheckpoint(sess);
  return sess;
}
// Checkpoint: saved at the start of every Sol and after each objective. Passing out reloads it.
export function saveCheckpoint(sess: Session): void { sess.checkpoint = JSON.stringify(sess.state); }
export function reloadCheckpoint(sess: Session): boolean {
  if (!sess.checkpoint) return false;
  const passOuts = (sess.state.ep?.passOuts ?? 0) + 1;
  const st = migrateState(JSON.parse(sess.checkpoint)); if (!st) return false;
  sess.state = st; if (st.ep) st.ep.passOuts = passOuts; st.outside = false; st.suit = 100;
  return true;
}
export function sleep(sess: Session): DailyReport {
  const report = endSol(sess.state);
  snapshot(sess); saveCheckpoint(sess);
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
  sess.state = migrateState(clone(JSON.parse(snap))) ?? sess.state;
  for (const k of Object.keys(sess.snapshots)) if (Number(k) > sol) delete sess.snapshots[Number(k)];
  return true;
}

// ---------- persistence ----------
export const SAVE_KEY = 'mrp.save.v1';
export const serialize = (sess: Session): string => JSON.stringify(sess);
export function deserialize(raw: string): Session | null {
  try {
    const d = JSON.parse(raw);
    if (!d?.state || typeof d.snapshots !== 'object' || !migrateState(d.state)) return null;
    // Snapshots are stored as strings; upgrade each one so rewinding into an old Sol stays safe.
    for (const k of Object.keys(d.snapshots)) {
      const m = migrateState(JSON.parse(d.snapshots[k]));
      if (m) d.snapshots[k] = JSON.stringify(m); else delete d.snapshots[k];
    }
    if (!Array.isArray(d.branches)) d.branches = [];
    return d as Session;
  } catch { return null; }
}
export function saveToStorage(sess: Session, store: Pick<Storage, 'setItem'> = localStorage): boolean {
  try { store.setItem(SAVE_KEY, serialize(sess)); return true; } catch { return false; }
}
export function loadFromStorage(store: Pick<Storage, 'getItem'> = localStorage): Session | null {
  try { const raw = store.getItem(SAVE_KEY); return raw ? deserialize(raw) : null; } catch { return null; }
}
