import { ICON } from './icons';
import { sfx } from './audio';
import type { PendingView } from '../core/director';
import type { CrewId, GameState } from '../core/types';
import { CREW } from '../story/crew';
import { STAGES } from '../core/constants';
import { LEARNING } from '../story/learning';
import { settings } from './audio';

const withName = (t: string) => t.replace(/\{name\}/g, settings.name || 'Rookie');

export const $ = (s: string, r: ParentNode = document) => r.querySelector(s) as HTMLElement;
export const esc = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// ---------- overlay stack (same pattern as the legacy prototype) ----------
export const UI = {
  stack: [] as string[],
  open(id: string) { if (!this.stack.includes(id)) this.stack.push(id); },
  close(id: string) { this.stack = this.stack.filter(x => x !== id); document.getElementById(id)?.remove(); },
  blocking() { return this.stack.length > 0; },
};
export const isBlocking = () => UI.blocking();
export function overlay(id: string, html: string, cls = ''): HTMLElement {
  UI.close(id);
  const el = document.createElement('div');
  el.id = id; el.className = 'overlay ' + cls; el.innerHTML = html;
  $('#overlays').appendChild(el); UI.open(id);
  el.querySelectorAll('[data-close]').forEach(b => ((b as HTMLElement).onclick = () => { sfx.click(); UI.close(id); }));
  return el;
}
export function toast(html: string, o: { kind?: string; ms?: number } = {}) {
  const el = document.createElement('div'); el.className = 'toast ' + (o.kind || ''); el.innerHTML = html;
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), o.ms ?? 2800);
}
export const head = (ic: string, title: string, close = true) =>
  `<div class="panel-head"><span class="hico">${ICON[ic] ?? ''}</span><h2>${esc(title)}</h2>${close ? '<button class="close-x" data-close aria-label="Close">×</button>' : ''}</div>`;

// ---------- small visual helpers ----------
export const pips = (v: number, max: number, cls: string, total = 5) => {
  const n = clamp(Math.round((v / max) * total), v > 0 ? 1 : 0, total);
  return `<span class="pips ${cls}">${Array.from({ length: total }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
};
export const chip = (ic: string, text: string, cls = 'n') => `<span class="fxc ${cls}"><span class="fi">${ICON[ic] ?? ''}</span><span>${esc(text)}</span></span>`;
export const vbar = (ic: string, frac: number, cls: string, right = '') =>
  `<div class="vrow"><span class="vi">${ICON[ic] ?? ''}</span><div class="bigbar"><i class="${cls}" style="width:${clamp(frac, 0, 1) * 100}%"></i></div><b>${right}</b></div>`;
export const optCard = (key: string, ic: string, name: string, active: boolean, fx: string, disabled = false, why = '') =>
  `<button class="opt big ${active ? 'active' : ''}" data-do="${esc(key)}" ${disabled ? 'disabled' : ''}><span class="oico">${ICON[ic] ?? ''}</span><span class="obody"><span class="opt-top"><b>${esc(name)}</b>${active ? '<span class="badge">ON</span>' : ''}</span>${why ? `<span class="why">${esc(why)}</span>` : ''}<span class="fx">${fx}</span></span></button>`;
export const levelClass = (v: number) => (v < 20 ? 'crit' : v < 40 ? 'warn' : '');
export const learnButton = (id?: string) => id ? `<button class="learn-btn" data-learn="${esc(id)}" aria-label="Learn more from NASA">⌕</button>` : '';
export function openLearning(id: string) { const l = LEARNING[id]; if (!l) return; overlay('learn', `<div class="holo-panel learn-card">${head('bulb', l.title)}<div class="panel-body"><p><b>Did you know?</b> ${esc(l.learned)}</p><p class="why">${esc(l.detail)}</p><a class="holo-btn small amber" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">READ THE NASA SOURCE ↗</a><p class="src-line">${esc(l.sourceTitle)}${l.note ? ` · ${esc(l.note)}` : ''}</p></div></div>`); }
export function bindLearning(root: ParentNode = document) { root.querySelectorAll('[data-learn]').forEach(el => ((el as HTMLElement).onclick = () => { sfx.click(); openLearning((el as HTMLElement).dataset.learn!); })); }

// ---------- dialogue with portrait (beats and events) ----------
const NAMES: Record<string, string> = { reyes: 'CAPT. REYES', aiko: 'AIKO TANAKA', david: 'DAVID OKAFOR', sofia: 'DR. SILVA', system: 'MISSION CONTROL' };
export const speakerName = (id: string) => NAMES[id] ?? id.toUpperCase();
export const crewPortrait = (id: CrewId, className = 'crew-avatar') =>
  `<img class="${className}" src="/crew/${id}.png" alt="${esc(CREW[id].name)}">`;

export function runPending(v: PendingView): Promise<string> {
  return new Promise(resolve => {
    const portraitId = Object.prototype.hasOwnProperty.call(CREW, v.speaker) ? v.speaker as CrewId : null;
    const place = v.speaker === 'reyes' ? 'QUARANTINE BAY' : v.speaker === 'system' ? '' : 'SICK BAY';
    const portrait = portraitId ? `<img class="dlg-cutout" src="/crew/${portraitId}.png" alt="">` : '';
    const boxClass = portraitId ? 'dlg-box dlg-box-character' : 'holo-panel dlg-box dlg-box-system';
    const el = overlay('dlg', `<div class="dlg-stage ${portraitId ? 'with-portrait' : ''}">${portrait}
      <div class="${boxClass}"><div class="dlg-main"><div class="dlg-name" id="dlg-name"></div><div class="dlg-text" id="dlg-text" aria-live="polite"></div><div class="dlg-actions" id="dlg-actions"></div></div></div></div>`, 'dialogue-overlay');
    const name = $('#dlg-name', el), tx = $('#dlg-text', el), actions = $('#dlg-actions', el);
    name.innerHTML = `${esc(speakerName(v.speaker))}${place ? ' · ' + place : ''}${v.title ? ' · ' + esc(v.title) : ''}${v.realData ? ' <span class="tag emb">REAL DATA</span>' : ''}${learnButton(v.learnId)}`; bindLearning(el);
    let i = 0, timer = 0, full = '', countdown = 0;
    const finish = (id: string) => { clearInterval(timer); clearInterval(countdown); UI.close('dlg'); runPending.next = null; resolve(id); };
    // A timed decision (the Storm Call): countdown bar, a pause for young players, timeout = the default choice.
    const startTimer = () => {
      const tm = v.timer!; let left = tm.seconds, paused = false;
      const box = document.createElement('div'); box.className = 'tcount'; box.innerHTML = `<span id="tc-n">${left}</span><div class="tbar"><i style="width:100%"></i></div><button id="tc-pause" type="button">TAKE YOUR TIME</button>`;
      actions.parentElement!.insertBefore(box, actions);
      const bar = box.querySelector('.tbar i') as HTMLElement, n = box.querySelector('#tc-n') as HTMLElement;
      (box.querySelector('#tc-pause') as HTMLElement).onclick = () => { paused = !paused; box.classList.toggle('paused', paused); (box.querySelector('#tc-pause') as HTMLElement).textContent = paused ? 'RESUME TIMER' : 'TAKE YOUR TIME'; };
      countdown = window.setInterval(() => { if (paused) return; left -= 0.1; if (left <= 3.05 && Math.abs(left % 1) < 0.1) sfx.tick(); n.textContent = String(Math.max(0, Math.ceil(left))); bar.style.width = `${Math.max(0, left / tm.seconds) * 100}%`; if (left <= 0) { sfx.warn(); finish(tm.timeoutChoice); } }, 100);
    };
    const show = () => {
      full = withName(v.lines[i]); tx.textContent = ''; let n = 0; clearInterval(timer);
      timer = window.setInterval(() => { n += 2; tx.textContent = full.slice(0, n); if (n % 8 === 0) sfx.blip(); if (n >= full.length) { clearInterval(timer); tx.textContent = full; } }, 22);
      const last = i >= v.lines.length - 1;
      actions.innerHTML = '';
      if (!last) actions.innerHTML = `<button class="skip" id="dlg-skip">Skip</button><button class="holo-btn small amber" id="dlg-next">NEXT ▸</button>`;
      else if (v.choices.length) { actions.innerHTML = `<div class="optlist" style="width:100%">${v.choices.filter(c => c.id !== v.timer?.timeoutChoice).map(c => `<button class="opt" data-choice="${esc(c.id)}" ${c.disabled ? 'disabled' : ''}><span class="opt-top"><b>${esc(c.label)}</b></span>${c.hint ? `<span class="why">${esc(c.hint)}</span>` : ''}</button>`).join('')}</div>`; if (v.timer && !countdown) startTimer(); }
      else actions.innerHTML = `<span></span><button class="holo-btn small amber" id="dlg-next">GOT IT ▸</button>`;
      actions.querySelectorAll('[data-choice]').forEach(b => ((b as HTMLElement).onclick = () => {
        const id = (b as HTMLElement).dataset.choice!;
        if (v.timer && id === v.timer.askChoice) { // Ask Earth: the message goes out, the clock keeps running, no answer comes in time
          sfx.click(); (b as HTMLElement).setAttribute('disabled', ''); (b as HTMLElement).insertAdjacentHTML('beforeend', '<span class="sent">Message sent. A reply takes 3 to 22 minutes each way…</span>');
          const tm = v.timer; v.timer = { ...tm, timeoutChoice: id }; return;
        }
        sfx.ok(); finish(id); }));
      const nx = actions.querySelector('#dlg-next') as HTMLElement | null; if (nx) nx.onclick = next;
      const sk = actions.querySelector('#dlg-skip') as HTMLElement | null; if (sk) sk.onclick = () => { i = v.lines.length - 1; clearInterval(timer); show(); tx.textContent = full; };
    };
    const next = () => {
      if (tx.textContent!.length < full.length) { clearInterval(timer); tx.textContent = full; return; }
      sfx.click(); i++;
      if (i >= v.lines.length) finish('continue'); else show();
    };
    runPending.next = () => { if (!v.choices.length || i < v.lines.length - 1) next(); };
    show();
  });
}
runPending.next = null as null | (() => void);

// ---------- report, journal, result ----------
export function showReport(s: GameState): Promise<void> {
  const r = s.lastReport; if (!r) return Promise.resolve();
  return new Promise(res => {
    const el = overlay('report', `<div class="holo-panel">${head('sun', `MY LITTLE RED PLANET · SOL ${String(r.sol).padStart(3, '0')}`, false)}<div class="panel-body">
      <p class="line" style="margin:0;font-size:20px">Good morning, Commander.</p>
      <div class="optlist">${r.lines.map(l => `<div class="msg2"><span class="face">${ICON.ping}</span><span>${esc(l)}</span></div>`).join('')}</div>
      <div class="fact">${ICON.bulb}<span><b>Today's mission:</b> ${esc(r.mission)}</span>${learnButton(STAGES[s.stage - 1]?.learnId)}</div>
      <div class="row" style="justify-content:flex-end"><button class="holo-btn small amber" id="rep-go">START THE DAY ▸</button></div></div></div>`);
    bindLearning(el); $('#rep-go', el).onclick = () => { sfx.ok(); UI.close('report'); res(); };
  });
}
export function journalHtml(s: GameState): string {
  if (!s.journal.length) return '<p class="why">Nothing yet. Decisions and discoveries are written here as you play.</p>';
  return [...s.journal].reverse().map(j => `<div class="card"><h3>Sol ${j.sol} · ${esc(j.title)} <span class="tag ${j.realData ? 'emb' : 'arch'}">${j.realData ? 'REAL DATA' : 'GAME'}</span>${learnButton(j.learnId)}</h3>
    <p>${esc(j.happened)}</p><p><b>You:</b> ${esc(j.decision)}</p><p><b>Why it mattered:</b> ${esc(j.why)}</p><p><b>The science:</b> ${esc(j.science)}</p>${j.sourceId ? `<p class="src-line">Source: ${esc(j.sourceId)}</p>` : ''}</div>`).join('');
}
export function stageScore(s: GameState) {
  const avg = (s.res.o2 + s.res.food + s.res.water + s.res.power) / 4;
  const friends = Object.values(s.crew).reduce((a, c) => a + c.friendship, 0);
  const tows = Number(s.flags.blackouts || 0), ships = Number(s.flags.shipments || 0);
  const score = Math.max(100, 600 + Math.round(avg * 4) + Math.round(s.rad * 2) + friends * 10 + s.solsSinceShipment * 20 - tows * 100 - ships * 100);
  return { avg, friends, tows, ships, score, stars: score >= 1400 ? 3 : score >= 1100 ? 2 : 1 };
}
export function showStageResult(s: GameState, finished: number): Promise<void> {
  const r = stageScore(s), st = STAGES[finished - 1], last = s.campaignComplete;
  sfx.win();
  return new Promise(res => {
    const el = overlay('result', `<div class="holo-panel"><div class="panel-head"><h2>Stage ${finished} complete</h2></div><div class="panel-body">
      <p class="res-title">${esc(st.title.toUpperCase())}</p>
      <div class="stars" aria-label="${r.stars} of 3 stars">${'★'.repeat(r.stars)}<span style="opacity:.25">${'★'.repeat(3 - r.stars)}</span></div><div class="score">${r.score}</div>
      <div><div class="bd"><span>Average supplies left</span><span>${Math.round(r.avg)}%</span></div><div class="bd"><span>Radiation allowance left</span><span>${Math.round(s.rad)}%</span></div>
      <div class="bd"><span>Sols without an Earth shipment</span><span>${s.solsSinceShipment}</span></div><div class="bd"><span>Crew friendship</span><span>${r.friends}</span></div><div class="bd"><span>Suit blackouts</span><span>${r.tows}</span></div></div>
      ${last ? '<div class="card won"><h3>Campaign complete</h3><p>The colony is yours. Keep building in sandbox mode.</p></div>' : `<div class="card"><h3>Next: ${esc(STAGES[finished].title)} ${learnButton(STAGES[finished].learnId)}</h3><p>${esc(STAGES[finished].objective)}</p></div>`}
      <div class="row" style="justify-content:flex-end"><button class="holo-btn small amber" id="r-go">KEEP EXPLORING ▸</button></div></div></div>`);
    bindLearning(el); $('#r-go', el).onclick = () => { sfx.click(); UI.close('result'); res(); };
  });
}
export function flashMeter(k: string) {
  const el = document.querySelector(`.meter[data-m="${k}"]`); if (!el) return;
  el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 400);
}
export const showSimple = (ic: string, title: string, bodyHtml: string): HTMLElement => overlay('simple', `<div class="holo-panel">${head(ic, title)}<div class="panel-body">${bodyHtml}</div></div>`);
