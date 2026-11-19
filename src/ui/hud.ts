import { foodSolsText, rationSolsLeft } from '../core/meals';
import { RATION_SOLS_START } from '../core/constants';
import { ICON } from './icons';
import { $, bindLearning, clamp, learnButton, levelClass } from './ui';
import { rates, solarEfficiency } from '../core/sim';
import { envForSol } from '../core/env';
import { STAGES, CROPS } from '../core/constants';
import type { GameState } from '../core/types';
import { objective, objectiveTasks } from '../core/episode';
import { tankLevel } from '../core/failure';
import { pumpUsable, waterMeLabel } from '../core/watering';
import { refreshEpHud, ringUpdate } from './episode';
import { objectivesView } from '../story/objectives';
import { ACTION_ENERGY, EP } from '../core/constants';
import { dishChoice, isDishBroken } from '../core/dish';
import { MACHINES } from '../core/gym';
import { RADAR_BOUNDS, type RadarPick } from '../core/radar';
import { MACHINE_NAMES, PROP_NAMES, brokenKitchenMachine, isBroken, readyBeds, type Hands } from '../core/inventory';

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
export function updateRadar(x: number, y: number, pick: RadarPick | null) {
  const player = $('#radar-player');
  player.style.left = `${clamp((x - RADAR_BOUNDS.minX) / (RADAR_BOUNDS.maxX - RADAR_BOUNDS.minX), 0, 1) * 100}%`;
  player.style.top = `${clamp((y - RADAR_BOUNDS.minY) / (RADAR_BOUNDS.maxY - RADAR_BOUNDS.minY), 0, 1) * 100}%`;
  // Step 24g: one blinking dot on the NEXT nearest objective, plus an arrow at the radar edge when it is far away.
  const dot = $('#radar-target'), edge = $('#radar-edge');
  dot.classList.toggle('on', !!pick);
  edge.classList.toggle('on', !!pick?.far);
  if (!pick) return;
  dot.style.left = `${pick.fx * 100}%`; dot.style.top = `${pick.fy * 100}%`; dot.dataset.zone = pick.zone;
  edge.style.left = `${50 + Math.cos(pick.angle) * 41}%`; edge.style.top = `${50 + Math.sin(pick.angle) * 41}%`;
  edge.style.transform = `translate(-50%,-50%) rotate(${pick.angle}rad)`;
}
const setBar = (el: Element, v: number, cls: string) => { el.classList.remove('warn', 'crit'); if (cls) el.classList.add(cls); (el.querySelector('.bar i') as HTMLElement).style.width = clamp(v, 0, 100) + '%'; };
export function fmtClock(h: number) { const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 6) * 10, ap = hh >= 12 ? 'PM' : 'AM'; let d = hh % 12; if (d === 0) d = 12; return `${d}:${String(mm).padStart(2, '0')} ${ap}`; }

// The HUD refreshes 5 times a second. Only touch the DOM when the content changes, otherwise buttons inside
// (like the learn-more ⌕) are replaced between press and release and a player's click is lost.
const lastHtml: Record<string, string> = {};
function setHtml(sel: string, html: string): boolean { if (lastHtml[sel] === html) return false; lastHtml[sel] = html; $(sel).innerHTML = html; return true; }

// ---------- Step 12b: the objective drop-down shows exactly NOW, NEXT, STORM PLAN, BONUS STARS ----------
let lastEp: GameState | null = null;
const bonusExt = () => { try { return { wikiRead: sessionStorage.getItem('ep1_wiki_read') === '1', shared: sessionStorage.getItem('ep1_shared') === '1' }; } catch { return {}; } };
export function renderObjectives(s: GameState): void {
  lastEp = s;
  const v = objectivesView(s, bonusExt()), row = (done: boolean, label: string, star = false, opt = false) => `<div class="obj-task ${star ? 'obj-bonus' : ''} ${done ? 'done' : ''}"><span class="obj-check" aria-hidden="true">${star ? (done ? '★' : '☆') : done ? '✓' : '○'}</span><span>${label}${opt ? ' <small>(optional)</small>' : ''}</span></div>`;
  $('#chips').classList.add('task-list');
  setHtml('#chips', `<div class="obj-sec obj-now"><div class="obj-bonus-title">NOW</div><p>${v.now}</p></div>`
    + `<div class="obj-sec"><div class="obj-bonus-title">NEXT</div><p>${v.next ?? 'Nothing yet. Keep an eye on your meters.'}</p></div>`
    + `<div class="obj-sec"><div class="obj-bonus-title">STORM PLAN</div>${v.plan.map(p => row(p.done, p.label, false, !p.required)).join('')}</div>`
    + `<div class="obj-sec"><div class="obj-bonus-title">BONUS STARS</div>${v.stars.map(t => row(t.done, t.label, true)).join('')}</div>`);
  if (setHtml('#obj-hint', learnButton('donki_live'))) bindLearning($('#obj-hint'));
}
/** Re-draws the drop-down right away (journal note saved, wiki link opened) without waiting for the next refresh. */
export const refreshObjectives = () => { if (lastEp?.ep) renderObjectives(lastEp); };

// ---------- Step 12b: what pressing E does here: name, action, energy cost, why it matters ----------
export interface PromptInfo { name: string; action: string; energy: number | null; why: string }
const P = (name: string, action: string, energy: number | null, why = ''): PromptInfo => ({ name, action, energy, why });
/** Pure. Says only what pressing E really does now. Nothing here hints at the suit (owner rule 3). */
export function promptInfo(s: GameState, zone: string, held: Hands, label: string): PromptInfo {
  const E = ACTION_ENERGY;
  if (zone === 'farm') {
    if (held.item === 'seed_packet' && held.crop) return P('GROW BED', `Plant ${CROPS[held.crop].name}`, E.plant, 'Seeds only grow in an empty bed.');
    if (held.item === 'sprinkler') return P('GROW BED', 'Water the bed', E.water, 'Thirsty plants wilt.');
    if (!held.item && readyBeds(s).length) return P('GROW BED', 'Harvest the ripe crop', E.harvest, 'Ripe crops add to your food.');
    return P('GROW BEDS', 'Check the plants', null, 'See what is growing and what is thirsty.');
  }
  if (zone === 'pod') return P('SLEEP POD', 'Sleep until morning', 0, s.hour < 22 ? 'Full energy. Crops grow overnight.' : 'Late night: less rest.');
  if (zone === 'lever' && s.ep?.phase === 'after') return s.ep.panelsStowed ? P('PANEL LEVER', 'Put the panels out', E.panels, 'Safe from the dust: power comes back.') : P('PANEL LEVER', 'Panels already out', null, 'Go outside and clean them.');
  if (zone === 'lever') return s.ep?.stormCall && s.ep.phase !== 'done' ? P('PANEL LEVER', s.ep.panelsStowed ? 'Put the panels back out' : 'Stow the panels', E.panels, s.ep.panelsStowed ? 'Stowed: safe, but no solar power.' : 'Out: some power, but dust can bury them.') : P('PANEL LEVER', 'Not needed yet', null, 'Used during the storm.');
  if (zone === 'pump' && s.ep && pumpUsable(s)) return P('WATER PUMP', 'Set pump mode', 0, s.wateringMode === 'automatic' ? 'AUTOMATIC. Plants drink by themselves but it uses a lot of power.' : 'MANUAL. Pump off. Water every bed morning and evening.');
  if (zone === 'pump') return P('WATER PUMP', s.ep?.wateringFixed ? 'Working' : 'Repair it', s.ep?.wateringFixed ? null : E.repair_watering, s.ep?.wateringFixed ? '' : held.item === 'spare_part' ? 'Fixing it takes the spare part you hold.' : 'BROKEN. Bring a spare part from storage.');
  if (zone === 'ice') return s.ep?.phase === 'ice' && !s.flags.ice_collected ? P('CANDIDATE ICE SHEET', s.outside ? 'Chip ice into the container' : 'It is outside the base', s.outside ? EP.ICE_ENERGY : null, 'Emergency water for the base.') : P('CANDIDATE ICE SHEET', s.flags.ice_collected ? 'Container is full' : 'Nothing to collect now', null, '');
  if (zone === 'intake' && s.ep?.phase === 'ice') return P('WATER MAKER INTAKE', held.item === 'ice_sample' ? 'Pour the ice in' : 'Needs a container of ice', null, 'The water maker is OFF.');
  if (zone === 'dish') { const fixed = !isDishBroken(s), mine = dishChoice(s) === 'dish'; return P('OUTDOOR DISH', fixed ? 'Working' : mine ? 'Repair it' : 'Damaged', fixed || !mine ? null : EP.DISH_REPAIR_ENERGY, fixed ? '' : !mine ? 'Only one fault can be fixed before the storm.' : held.item === 'spare_part' ? 'Fixing it takes the spare part you hold.' : 'BROKEN. Bring a spare part from storage.'); }
  if (zone.startsWith('rack_')) return P(label.toUpperCase(), held.item ? 'Put it back' : 'Take one', 0, 'You can carry one thing at a time.');
  if (zone.startsWith('bin_')) return P(label.toUpperCase(), held.item === 'harvest' ? 'Store the crop' : 'Open the bin', 0, 'See what is stored.');
  if (zone === 'bands' || zone === 'bike' || zone === 'rower') { const m = MACHINES[zone as 'bands' | 'bike' | 'rower']; return P(m.name.toUpperCase(), 'Work out', m.energy, 'Exercise keeps you healthy.'); }
  if ((zone === 'comms' || zone === 'kitchen') && held.item === 'spare_part') {
    const m = zone === 'comms' ? (isBroken(s, 'comms') ? 'comms' : null) : brokenKitchenMachine(s);
    if (m) return P(MACHINE_NAMES[m].toUpperCase(), 'Repair it', E.repair_machine, 'BROKEN. Fixing it takes the spare part you hold.');
  }
  switch (zone) {
    case 'kitchen': return P('KITCHEN', 'Cook a tray', E.cook_serve, 'Five portions feed the crew and you.');
    case 'hatch': return P('MEAL HATCH', held.item === 'tray' ? 'Hand the tray through' : 'Meal hatch', 0, 'The crew inside is waiting for food.');
    case 'ls': return P('LIFE SUPPORT', 'Check air and water', E.check, 'Air and water keep everyone alive.');
    case 'comms': return P('COMMS', 'Check the link', E.check, 'Your link to Earth.');
    case 'control': return P('CONTROL MODULE', 'Open it', 0, 'Rest here to end the Sol.');
    case 'sick': return P('INTERCOM', 'Talk to the crew', E.talk, 'A chat cheers people up.');
    case 'suit': return P('SUIT RACK', 'Use the rack', E.suit);
    case 'solar': return P('SOLAR PANELS', 'Check the panels', E.check, 'Dust cuts the power.');
    case 'lab': return P('SCIENCE LAB', 'Use the lab', null, '');
    case 'bath': return P('BATHROOM', 'Use it', null, '');
    default: return P(label.toUpperCase(), 'Use', null, '');
  }
}
export const promptHtml = (p: PromptInfo) => `<kbd>E</kbd><span class="act-body"><b>${p.name}</b><span class="act-line">${p.action}${p.energy ? ` · Energy ${p.energy}` : p.energy === 0 ? ' · Free' : ''}</span>${p.why ? `<small>${p.why}</small>` : ''}</span>`;

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
  { const fs = document.getElementById('food-sols-t'), fb = document.querySelector('#food-sols .bar i') as HTMLElement | null; // Step 24l: Sols of food left, never portions
    if (fs) { const t = foodSolsText(s); if (fs.textContent !== t) fs.textContent = t; if (fb) fb.style.width = clamp(rationSolsLeft(s) / RATION_SOLS_START * 100, 0, 100) + '%'; } }
  $('#hud-toggle').classList.toggle('alert', alert);
  const hr = (s.hour % 12) / 12 * 360 - 90, hx = 16 + 7 * Math.cos(hr * Math.PI / 180), hy = 16 + 7 * Math.sin(hr * Math.PI / 180);
  const hh = document.getElementById('hh'); if (hh) { hh.setAttribute('x2', String(hx)); hh.setAttribute('y2', String(hy)); }
  $('#clock').textContent = fmtClock(s.hour); $('#sol').textContent = String(s.sol);
  $('#outside').hidden = !s.outside;
  const wm = waterMeLabel(s), wmEl = document.getElementById('water-me'); // Step 15b: manual mode only
  if (wmEl) { wmEl.hidden = !wm; if (wm) $('#water-me-text').textContent = `WATER ME · ${wm}`; }
  // Step 8d: the oxygen tank meter shows while the suit is worn and the player is outside, and again inside while it refills.
  const worn = s.ep ? s.suitOn : true, tankShown = worn && (s.outside || s.suit < 99.5), tank = $(s.ep ? '#epm-tank' : '#suit-m');
  $('#tank-wrap').hidden = !tankShown || !!s.ep; $('#epm-tank').hidden = !tankShown || !s.ep;
  if (tankShown) { setBar(tank, s.suit, ''); tank.setAttribute('aria-valuenow', String(Math.round(s.suit))); const lv = tankLevel(s.suit); tank.classList.remove('tank-ok', 'tank-mid', 'tank-low', 'refilling'); tank.classList.add('tank-' + lv); if (!s.outside) tank.classList.add('refilling'); $('#suit-v').textContent = String(Math.round(s.suit)); }
  if (s.outside) { setBar($('#rad-m'), s.rad, levelClass(s.rad)); $('#rad-v').textContent = String(Math.round(s.rad)); }
  setBar($('#en-m'), s.energy, levelClass(s.energy)); $('#en-v').textContent = String(Math.round(s.energy));

  refreshEpHud(s); ringUpdate(s);
  if (s.ep) { // Episode 1: the objective comes from the episode rules
    const o = objective(s);
    $('.obj-title').textContent = o.title; $('#obj-count').textContent = `Sol ${s.sol}`;
    renderObjectives(s);
    return;
  }
  // objective = current stage. Chips = quick status of the four systems.
  const st = STAGES[s.stage - 1];
  $('.obj-title').textContent = s.campaignComplete ? 'Sandbox: build your colony' : st.title;
  $('#obj-count').textContent = s.campaignComplete ? '★' : `${s.stage}/${STAGES.length}`;
  const planted = s.plots.filter(p => p.crop).length, ready = s.plots.filter(p => p.crop && p.growth >= CROPS[p.crop].sols).length;
  const chips: [string, string, boolean][] = [['farm', 'Farm', planted > 0 && ready === 0], ['ls', 'Air & Water', r.o2 >= -0.05 && r.water >= -0.5], ['dish', 'Comms', s.solsSinceShipment >= 0], ['panel', 'Solar', solarEfficiency(s, env) > 0.4]];
  $('#chips').classList.remove('task-list');
  setHtml('#chips', chips.map(([ic, n, ok]) => `<span class="sys ${ok ? 'ok' : ''}"><i></i>${ICON[ic]}${n}</span>`).join(''));
  if (setHtml('#obj-hint', `${ICON.bulb}<span>${s.campaignComplete ? 'Keep every system healthy. Nothing is ever free.' : st.objective}</span>${learnButton(st.learnId)}`)) bindLearning($('#obj-hint'));
}
