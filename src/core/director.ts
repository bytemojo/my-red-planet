import { BEATS } from '../story/beats';
import { EVENTS, eventById } from '../story/events';
import { envForSol } from './env';
import { rngFor } from './rng';
import { applyEffect } from './effects';
import { addLog } from './util';
import type { Choice, GameState } from './types';

export interface PendingView {
  kind: 'beat' | 'event'; id: string; title: string; speaker: string; lines: string[]; realData: boolean;
  choices: { id: string; label: string; hint?: string; disabled: boolean }[]; learnId?: string;
}

// Beats first (scripted story), otherwise nothing. Events are rolled once each morning in rollEvent().
export function poll(s: GameState): void {
  if (s.pending) return;
  const b = BEATS.find(x => !s.seenBeats.includes(x.id) && x.when(s));
  if (b) s.pending = { kind: 'beat', id: b.id };
}

export function rollEvent(s: GameState): void {
  if (s.pending) return;
  const env = envForSol(s.sol);
  const weights = EVENTS.map(e => ({ e, w: e.weight(s, env) })).filter(x => x.w > 0);
  if (!weights.length) return;
  const forced = weights.find(x => x.w >= 100);
  const rng = rngFor(s.seed, s.sol);
  if (!forced && (s.sol < 3 || s.sol - s.lastEventSol < 2 || rng() > 0.8)) return;
  const pick = forced ?? (() => {
    let t = rng() * weights.reduce((a, x) => a + x.w, 0);
    for (const x of weights) { t -= x.w; if (t <= 0) return x; }
    return weights[0];
  })();
  s.pending = { kind: 'event', id: pick.e.id };
}

export function describePending(s: GameState): PendingView | null {
  if (!s.pending) return null;
  const env = envForSol(s.sol);
  if (s.pending.kind === 'beat') {
    const b = BEATS.find(x => x.id === s.pending!.id);
    if (!b) return null;
    return { kind: 'beat', id: b.id, title: '', speaker: b.speaker, lines: b.lines, realData: false,
      choices: (b.choices ?? []).map(c => ({ id: c.id, label: c.label, hint: c.hint, disabled: c.requires ? !c.requires(s) : false })) };
  }
  const e = eventById(s.pending.id);
  if (!e) return null;
  return { kind: 'event', id: e.id, title: e.title, speaker: e.speaker, lines: [e.text(s, env)], realData: e.journal.realData, learnId: e.journal.learnId,
    choices: e.choices.map(c => ({ id: c.id, label: c.label, hint: c.hint, disabled: c.requires ? !c.requires(s) : false })) };
}

// Apply the player's decision. Records it, writes the journal (events), clears pending.
export function resolve(s: GameState, choiceId = 'continue'): boolean {
  const p = s.pending;
  if (!p) return false;
  const env = envForSol(s.sol);
  let choice: Choice | undefined;
  if (p.kind === 'beat') {
    const b = BEATS.find(x => x.id === p.id);
    if (!b) { s.pending = null; return false; }
    choice = b.choices?.find(c => c.id === choiceId);
    if (b.choices && !choice) return false;
    if (choice?.requires && !choice.requires(s)) return false;
    applyEffect(s, b.effects);
    applyEffect(s, choice?.effects);
    s.seenBeats.push(b.id);
    if (choice) s.decisions.push({ sol: s.sol, sourceId: b.id, optionId: choice.id, label: choice.label });
  } else {
    const e = eventById(p.id);
    if (!e) { s.pending = null; return false; }
    choice = e.choices.find(c => c.id === choiceId);
    if (!choice || (choice.requires && !choice.requires(s))) return false;
    applyEffect(s, choice.effects);
    s.decisions.push({ sol: s.sol, sourceId: e.id, optionId: choice.id, label: choice.label });
    s.lastEventSol = s.sol;
    const src = e.journal.sourceId === '@flare' ? env.flare?.id : e.journal.sourceId;
    s.journal.push({ id: `${e.id}@${s.sol}`, sol: s.sol, title: e.title, happened: e.text(s, env).replace(/^[^:"]{1,48}: /, ''),
      decision: choice.label, why: e.journal.why, science: e.journal.science, sourceId: src, learnId: e.journal.learnId, realData: e.journal.realData, kind: 'event' });
    addLog(s, 'EVENT', `${e.title}: ${choice.label}`);
  }
  s.pending = null;
  return true;
}
