import { CROPS, FARM, LS, STAGES } from '../core/constants';
import type { GameState } from '../core/types';
import type { PendingView } from '../core/director';
import { CREW } from '../story/crew';

export interface ChoiceItem { id: string; label: string; hint?: string; disabled?: boolean }
const $ = (id: string) => document.getElementById(id)!;
let openCount = 0;
export const isBlocking = () => openCount > 0;

function el(tag: string, cls = '', html = ''): HTMLElement { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; }
const esc = (t: string) => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));

function modal(build: (box: HTMLElement, close: (v?: unknown) => void) => void): Promise<unknown> {
  return new Promise(res => {
    openCount++;
    const wrap = el('div', 'modal'), box = el('div', 'box');
    wrap.appendChild(box); $('overlay').appendChild(wrap);
    const close = (v?: unknown) => { wrap.remove(); openCount--; res(v); };
    build(box, close);
  });
}
const btn = (label: string, cb: () => void, cls = 'btn', hint?: string, disabled = false) => {
  const b = el('button', cls, esc(label) + (hint ? `<small>${esc(hint)}</small>` : '')) as HTMLButtonElement;
  b.disabled = disabled; b.onclick = cb; return b;
};

export const toast = (msg: string) => { const t = el('div', 'toast', esc(msg)); $('toasts').appendChild(t); setTimeout(() => t.remove(), 2600); };

export async function showPending(v: PendingView): Promise<string> {
  const who = v.speaker === 'system' ? 'Mission' : CREW[v.speaker as keyof typeof CREW].name;
  let i = 0;
  const r = await modal((box, close) => {
    const head = el('div', 'who', esc(who) + (v.realData ? ' <span class="badge">REAL DATA</span>' : ''));
    const title = v.title ? el('h3', '', esc(v.title)) : null;
    const text = el('p', 'line'); const actions = el('div', 'actions');
    box.append(head); if (title) box.append(title); box.append(text, actions);
    const render = () => {
      text.textContent = v.lines[i]; actions.innerHTML = '';
      if (i < v.lines.length - 1) actions.append(btn('Next', () => { i++; render(); }));
      else if (v.choices.length) v.choices.forEach(c => actions.append(btn(c.label, () => close(c.id), 'btn choice', c.hint, c.disabled)));
      else actions.append(btn('OK', () => close('continue')));
    };
    render();
  });
  return r as string;
}

export function showMessage(title: string, lines: string[], ok = 'OK'): Promise<unknown> {
  return modal((box, close) => { box.append(el('h3', '', esc(title))); lines.forEach(l => box.append(el('p', 'line', esc(l)))); box.append(btn(ok, () => close(), 'btn')); });
}
export function showMenu(title: string, items: ChoiceItem[], cancel = 'Close'): Promise<string | null> {
  return modal((box, close) => {
    box.append(el('h3', '', esc(title)));
    items.forEach(c => box.append(btn(c.label, () => close(c.id), 'btn choice', c.hint, c.disabled)));
    box.append(btn(cancel, () => close(null), 'btn ghost'));
  }) as Promise<string | null>;
}
export function showReport(s: GameState): Promise<unknown> {
  const r = s.lastReport; if (!r) return Promise.resolve();
  return showMessage(`MY RED PLANET: SOL ${String(r.sol).padStart(3, '0')}`, ['Good morning, Commander.', ...r.lines.map(l => '• ' + l), `Today's mission: ${r.mission}`], 'Start the day');
}
export function showJournal(s: GameState): Promise<unknown> {
  return modal((box, close) => {
    box.append(el('h3', '', 'Mission Journal'));
    if (!s.journal.length) box.append(el('p', 'line', 'Nothing yet. Decisions and discoveries will be written here.'));
    [...s.journal].reverse().forEach(j => {
      const d = el('div', 'entry', `<b>Sol ${j.sol}: ${esc(j.title)}</b> ${j.realData ? '<span class="badge">REAL DATA</span>' : '<span class="badge dev">GAME</span>'}
        <p>${esc(j.happened)}</p><p><i>You:</i> ${esc(j.decision)}</p><p><i>Why it mattered:</i> ${esc(j.why)}</p>
        <p><i>The science:</i> ${esc(j.science)}</p>${j.sourceId ? `<p class="src">Source: ${esc(j.sourceId)}</p>` : ''}`);
      box.append(d);
    });
    box.append(btn('Close', () => close(), 'btn ghost'));
  });
}

// ---------- HUD ----------
const bar = (cls: string, label: string, v: number, extra = '') => `<div class="meter ${cls}"><span>${label}</span><i style="width:${Math.round(v)}%"></i><em>${Math.round(v)}${extra}</em></div>`;
export function updateHud(s: GameState): void {
  const hh = Math.floor(s.hour), mm = Math.floor((s.hour - hh) * 60 / 10) * 10;
  const st = STAGES[s.stage - 1];
  $('hud').innerHTML = `
    <div class="top">
      <div class="meters">${bar('o2', 'Air', s.res.o2)}${bar('water', 'Water', s.res.water)}${bar('food', 'Food', s.res.food)}${bar('power', 'Power', s.res.power)}
        ${bar('energy', 'Energy', s.energy)}${s.outside ? bar('suit', 'Suit', s.suit) : ''}${bar('rad', 'Safe', s.rad)}</div>
      <div class="clock">Sol ${s.sol} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}<br/><small>Self-sufficient: ${s.solsSinceShipment} Sols</small></div>
    </div>
    <div class="mission"><b>${esc(st.title)}</b>: ${esc(st.objective)}</div>
    <div class="hint">Move: WASD / arrows · Act: E · Menu: M</div>`;
}
export const settingsLabel = (s: GameState) => `${FARM[s.farm].name} · ${LS[s.ls].name}`;
export const cropName = (id: string) => CROPS[id as keyof typeof CROPS].name;
