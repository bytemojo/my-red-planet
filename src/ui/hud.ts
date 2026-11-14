import { ICON } from './icons';
import { $, bindLearning, clamp, learnButton, levelClass } from './ui';
import { rates, solarEfficiency } from '../core/sim';
import { envForSol } from '../core/env';
import { STAGES, CROPS } from '../core/constants';
import type { GameState } from '../core/types';
import { SYSTEMS, objective } from '../core/episode';
import { refreshEpHud, ringUpdate } from './episode';

export const arrows = (r: number) => { const a = Math.abs(r); if (a < 0.05) return { t: '▬', c: 'flat' }; const n = a > 1.2 ? 3 : a > 0.5 ? 2 : 1; return { t: (r > 0 ? '▲' : '▼').repeat(n), c: r > 0 ? 'up' : 'down' }; };
const METERS = ['o2', 'food', 'water', 'power'] as const;
const NAMES: Record<string, string> = { o2: 'Air', food: 'Food', water: 'Water', power: 'Power' };

export function initHud() {
  document.querySelectorAll('[data-ic]').forEach(e => { (e as HTMLElement).innerHTML = ICON[(e as HTMLElement).dataset.ic!] ?? ''; });
  document.querySelectorAll('.meter').forEach(el => {
    const k = (el as HTMLElement).dataset.m!;
    el.innerHTML = `<div class="m-top"><span class="m-ico">${ICON[k]}</span><span class="m-val">0</span></div><div class="bar"><i></i></div><div class="m-rate"></div>`;
  });
}
const setBar = (el: Element, v: number, cls: string) => { el.classList.remove('warn', 'crit'); if (cls) el.classList.add(cls); (el.querySelector('.bar i') as HTMLElement).style.width = clamp(v, 0, 100) + '%'; };
export function fmtClock(h: number) { const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 6) * 10, ap = hh >= 12 ? 'PM' : 'AM'; let d = hh % 12; if (d === 0) d = 12; return `${d}:${String(mm).padStart(2, '0')} ${ap}`; }

export function refreshHud(s: GameState) {
  const r = rates(s), env = envForSol(s.sol);
  const rate: Record<string, number> = { o2: r.o2, food: r.food, water: r.water, power: r.power };
  let alert = false;
  for (const k of METERS) {
    const el = document.querySelector(`.meter[data-m="${k}"]`)!, v = s.res[k], cls = levelClass(v);
    if (cls === 'crit') alert = true;
    setBar(el, v, cls); (el.querySelector('.m-val') as HTMLElement).textContent = String(Math.round(v));
    const a = arrows(rate[k]); const re = el.querySelector('.m-rate') as HTMLElement; re.textContent = a.t; re.className = 'm-rate ' + a.c;
  }
  $('#hud-toggle').classList.toggle('alert', alert);
  const hr = (s.hour % 12) / 12 * 360 - 90, hx = 16 + 7 * Math.cos(hr * Math.PI / 180), hy = 16 + 7 * Math.sin(hr * Math.PI / 180);
  const hh = document.getElementById('hh'); if (hh) { hh.setAttribute('x2', String(hx)); hh.setAttribute('y2', String(hy)); }
  $('#clock').textContent = fmtClock(s.hour); $('#sol').textContent = String(s.sol);
  $('#outside').hidden = !s.outside;
  if (s.outside) { setBar($('#suit-m'), s.suit, levelClass(s.suit)); $('#suit-v').textContent = String(Math.round(s.suit)); setBar($('#rad-m'), s.rad, levelClass(s.rad)); $('#rad-v').textContent = String(Math.round(s.rad)); }
  setBar($('#en-m'), s.energy, levelClass(s.energy)); $('#en-v').textContent = String(Math.round(s.energy));

  refreshEpHud(s); ringUpdate(s);
  if (s.ep) { // Episode 1: the objective comes from the episode rules
    const o = objective(s);
    $('.obj-title').textContent = o.title; $('#obj-count').textContent = `Sol ${s.sol}`;
    const icon: Record<string, string> = { air: 'o2', water: 'water', plants: 'farm', comms: 'dish', solar: 'panel' };
    $('#chips').innerHTML = SYSTEMS.map(k => `<span class="sys ${s.ep!.checked.includes(k) ? 'ok' : ''}"><i></i>${ICON[icon[k]]}${k}</span>`).join('');
    $('#obj-hint').innerHTML = `${ICON.bulb}<span>${o.detail}</span>${learnButton('donki_live')}`;
    bindLearning($('#obj-hint'));
    return;
  }
  // objective = current stage. Chips = quick status of the four systems.
  const st = STAGES[s.stage - 1];
  $('.obj-title').textContent = s.campaignComplete ? 'Sandbox: build your colony' : st.title;
  $('#obj-count').textContent = s.campaignComplete ? '★' : `${s.stage}/${STAGES.length}`;
  const planted = s.plots.filter(p => p.crop).length, ready = s.plots.filter(p => p.crop && p.growth >= CROPS[p.crop].sols).length;
  const chips: [string, string, boolean][] = [['farm', 'Farm', planted > 0 && ready === 0], ['ls', 'Air & Water', r.o2 >= -0.05 && r.water >= -0.5], ['dish', 'Comms', s.solsSinceShipment >= 0], ['panel', 'Solar', solarEfficiency(s, env) > 0.4]];
  $('#chips').innerHTML = chips.map(([ic, n, ok]) => `<span class="sys ${ok ? 'ok' : ''}"><i></i>${ICON[ic]}${n}</span>`).join('');
  $('#obj-hint').innerHTML = `${ICON.bulb}<span>${s.campaignComplete ? 'Keep every system healthy. Nothing is ever free.' : st.objective}</span>${learnButton(st.learnId)}`;
  bindLearning($('#obj-hint'));
}
