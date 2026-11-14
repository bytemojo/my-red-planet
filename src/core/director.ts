import { BEATS } from '../story/beats';
import { EVENTS } from '../story/events';
import { EP_BEATS, EP_EVENTS } from '../story/episode1';
import { envFor, onResolve } from './episode';
import { EP } from './constants';
import { rngFor } from './rng';
import { applyEffect } from './effects';
import { addLog } from './util';
import type { Choice, GameState } from './types';

export interface PendingView {
  kind: 'beat' | 'event'; id: string; title: string; speaker: string; lines: string[]; realData: boolean;
  choices: { id: string; label: string; hint?: string; disabled: boolean }[]; learnId?: string;
  timer?: { seconds: number; timeoutChoice: string; askChoice?: string }; // a timed decision (the Storm Call)
}

// Beats first (scripted story), otherwise nothing. Events are rolled once each morning in rollEvent().
// Episode 1 uses its own story content; the open campaign uses the original beats and events.
const beatsFor = (s: GameState) => (s.ep ? EP_BEATS : BEATS);
const eventsFor = (s: GameState) => (s.ep ? EP_EVENTS : EVENTS);
export const eventById = (id: string) => EVENTS.find(e => e.id === id) ?? EP_EVENTS.find(e => e.id === id);

export function poll(s: GameState): void {
  if (s.pending) return;
  const b = beatsFor(s).find(x => !s.seenBeats.includes(x.id) && x.when(s));
  if (b) { s.pending = { kind: 'beat', id: b.id }; return; }
  // Episode decision cards are queued after scripted beats, so a beat never swallows one.
  if (s.ep) { const env = envFor(s); const e = EP_EVENTS.find(x => x.weight(s, env) >= 100); if (e) s.pending = { kind: 'event', id: e.id }; }
}

export function rollEvent(s: GameState): void {
  if (s.pending) return;
  const env = envFor(s);
  const weights = eventsFor(s).map(e => ({ e, w: e.weight(s, env) })).filter(x => x.w > 0);
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
  const env = envFor(s);
  if (s.pending.kind === 'beat') {
    const b = beatsFor(s).find(x => x.id === s.pending!.id);
    if (!b) return null;
    return { kind: 'beat', id: b.id, title: '', speaker: b.speaker, lines: b.lines, realData: false,
      choices: (b.choices ?? []).map(c => ({ id: c.id, label: c.label, hint: c.hint, disabled: c.requires ? !c.requires(s) : false })) };
  }
  const e = eventById(s.pending.id);
  if (!e) return null;
  return { kind: 'event', id: e.id, title: e.title, speaker: e.speaker, lines: [e.text(s, env)], realData: e.journal.realData, learnId: e.journal.learnId,
    timer: e.id === 'storm_call' ? { seconds: EP.CALL_SECONDS, timeoutChoice: 'wait', askChoice: 'ask' } : undefined,
    choices: e.choices.map(c => ({ id: c.id, label: c.label, hint: c.hint, disabled: c.requires ? !c.requires(s) : false })) };
}

// Apply the player's decision. Records it, writes the journal (events), clears pending.
export function resolve(s: GameState, choiceId = 'continue'): boolean {
  const p = s.pending;
  if (!p) return false;
  const env = envFor(s);
  let choice: Choice | undefined;
  if (p.kind === 'beat') {
    const b = beatsFor(s).find(x => x.id === p.id);
    if (!b) { s.pending = null; return false; }
    choice = b.choices?.find(c => c.id === choiceId);
    if (b.choices && !choice) return false;
    if (choice?.requires && !choice.requires(s)) return false;
    applyEffect(s, b.effects);
    applyEffect(s, choice?.effects);
    s.seenBeats.push(b.id);
    if (choice) s.decisions.push({ sol: s.sol, sourceId: b.id, optionId: choice.id, label: choice.label });
    s.pending = null; onResolve(s, 'beat', b.id, choice?.id ?? 'continue');
    return true;
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
    s.pending = null; onResolve(s, 'event', e.id, choice.id);
    return true;
  }
  s.pending = null;
  return true;
}
