import { ICON } from './icons';
// Step 6c: the farm panel is read-only; planting, watering and harvesting are animated in the world.
import { $, UI, toast, bindLearning, clamp, chip, crewPortrait, esc, head, journalHtml, learnButton, optCard, overlay, pips, vbar, levelClass } from './ui';
import { sfx } from './audio';
import { arrows } from './hud';
import { ACTION_ENERGY, BUILDINGS, CAVE_MAX, CREW_LIFE, CROPS, FARM, LS } from '../core/constants';
import { rates, solarEfficiency } from '../core/sim';
import { envForSol } from '../core/env';
import { CREW, hungryRefusal } from '../story/crew';
import { BOTANIST, isHungry, mood } from '../core/crewlife';
import { showStartQuiz } from '../core/quiz';
import { hasBank } from '../story/quizbank';
import { AOKI_ENERGY_NOTE, AOKI_TOPICS, aokiChoice, aokiHint, aokiHeartEarnedToday, aokiTopic } from '../story/aoki';
import { SYSTEM_NAME, lockedIn } from '../core/episode';
import { openWiki, staticText } from './episode';
import { openJournal } from './journal';
import { ACTION_ENERGY as AE, EP } from '../core/constants';
import type { SystemId } from '../core/types';
import { GYM, MACHINES, workoutsToday, type Machine } from '../core/gym';
import { alertFor, ALERT_LABEL } from '../core/episode';
import { RATION_SOLS_START } from '../core/constants';
import { nowNext, systemCards } from '../story/controlcards';
import { foodSolsText, rationSolsLeft, FOOD_PORTIONS, LOCKED_CROP_MSG, METHOD_LABEL, PRODUCE_ITEMS, SPACE_MEALS, foodItem, foodStock, isFoodUnlocked, trayProblem, trayTotals, type FoodItem } from '../core/meals';
import { foodPixels, type FoodSize } from '../game/pixelart';

// Episode 1: a "check this system" button until it has been checked.
const checkBtn = (s: GameState, sys: SystemId) => {
  if (!s.ep) return '';
  if (s.ep.checked.includes(sys)) return `<span class="badge">${esc(SYSTEM_NAME[sys].toUpperCase())} CHECKED ✓</span>`;
  return ['call', 'check', 'prep'].includes(s.ep.phase) ? `<button class="holo-btn small amber" data-do="check|${sys}">✓ CHECK ${esc(SYSTEM_NAME[sys].toUpperCase())}</button>` : '';
};
// Earth is about 6 months away by ship: 182.6 days / 1.0275 days per sol (a sol is 24 h 39 min) = about 178 sols.
const SHIP_SOLS = Math.round(182.6 / 1.0275);
import type { ActionName } from '../core/constants';
import type { CrewId, CropId, GameState } from '../core/types';

// What the panels need from the game. WorldScene implements this.
export interface Host {
  state(): GameState;
  quiz(crew: CrewId): void;                                        // Step 27d: START QUIZ (opens the quiz screen, records the result)
  run(name: ActionName, arg?: Record<string, string>): void;       // does the action, toasts, effects, pending beats
  set(what: 'farm' | 'ls', value: string): void;
  rest(): void; rewind(sol: number): void; compare(): void; save(): void; menu(): void;
  branches(): number; rewindable(): number[];
  workout(machine: Machine): void;                                  // plays the workout mini-game, animates, then runs it
}
type Draw = () => string;
function panel(id: string, host: Host, draw: Draw, onDo: (cmd: string[]) => void): void {
  const el = overlay(id, '');
  // Step 24c: re-rendering must never throw the player back to the top: remember the scroll of the panel and its body, and the focused button.
  const SCROLLERS = ['.panel-body', '.holo-panel'];
  const render = () => {
    const saved = [el.scrollTop, ...SCROLLERS.map(q => (el.querySelector(q) as HTMLElement | null)?.scrollTop ?? 0)];
    const focusKey = (document.activeElement as HTMLElement | null)?.dataset?.do ?? null;
    el.innerHTML = draw();
    el.scrollTop = saved[0]; SCROLLERS.forEach((q, i) => { const n = el.querySelector(q) as HTMLElement | null; if (n) n.scrollTop = saved[i + 1]; });
    if (focusKey) (el.querySelector(`[data-do="${focusKey}"]`) as HTMLElement | null)?.focus({ preventScroll: true });
    el.querySelectorAll('[data-close]').forEach(b => ((b as HTMLElement).onclick = () => { sfx.click(); UI.close(id); }));
    el.querySelectorAll('[data-do]').forEach(b => ((b as HTMLElement).onclick = () => { sfx.click(); onDo((b as HTMLElement).dataset.do!.split('|')); render(); }));
    bindLearning(el);
  };
  render();
}
const cost = (n: number) => chip('bulb', `−${n}`, 'n');
const MOOD_WORD = { happy: 'cheerful', neutral: 'okay', sad: 'feeling low' } as const;
const moodChip = (s: GameState, id: CrewId) => { const c = s.crew[id], m = mood(c); return chip('crew', MOOD_WORD[m], m === 'happy' ? 'g' : m === 'sad' ? 'r' : 'n') + (isHungry(s, c) ? chip('food', 'hungry', 'r') : ''); };
const costRes = (c: Partial<Record<string, number>>) => Object.entries(c).map(([k, v]) => chip(k === 'o2' ? 'o2' : k, `−${v}`, 'b')).join('');

// ---------- Indoor Farm ----------
export function openFarm(host: Host) {
  panel('inspect', host, () => {
    const s = host.state();
    const beds = s.plots.map((p, i) => { // Step 6c: READ-ONLY. Planting, watering and harvesting are done in the world, with animations.
      if (!p.crop) return `<div class="srow"><span class="vi">${ICON.farm}</span><b>Bed ${i + 1}: empty</b><span class="badge">HOLD A SEED PACKET</span></div>`;
      const need = CROPS[p.crop].sols, ready = p.growth >= need, left = Math.max(0, Math.ceil(need - p.growth));
      const state = ready ? `<span class="badge">READY TO PICK</span>` : p.watered ? `<span class="badge">WATERED</span>` : `<span class="badge">NEEDS WATER</span>`;
      const health = s.ep ? `<div class="sbar" title="plant health"><i class="en ${(p.health ?? 80) < 40 ? 'r' : 'g'}" style="width:${p.health ?? 80}%"></i></div>` : '';
      const expect = ready ? `Harvest now: +${CROPS[p.crop].food} food` : `Expected harvest: +${CROPS[p.crop].food} food in ${left} Sol${left === 1 ? '' : 's'}`;
      return `<div class="srow"><span class="vi">${ICON.farm}</span><span><b>Bed ${i + 1}: ${CROPS[p.crop].name}</b>${s.ep ? ` <small>health ${Math.round(p.health ?? 80)}</small>` : ''}<div class="sbar"><i class="en ${ready ? 'g' : 'b'}" style="width:${clamp(p.growth / need, 0, 1) * 100}%"></i></div>${health}<small>${expect}</small></span>${state}</div>`;
    }).join('');
    const lightKeys = (s.ep ? ['bright', 'dim', 'off'] : ['bright', 'dim']) as (keyof typeof FARM)[];
    const lights = lightKeys.map(k => optCard(`lights|${k}`, k === 'bright' ? 'sun' : k === 'dim' ? 'sundim' : 'moon', FARM[k].name, s.farm === k,
      `${chip('power', `−${FARM[k].power}/h`, 'b')}${chip('water', `−${FARM[k].water}/h`, 'b')}${chip('farm', k === 'off' ? 'plants weaken' : `grows ×${FARM[k].growth}`, k === 'off' ? 'r' : 'g')}`, false, FARM[k].why)).join('');
    const pump = s.ep ? (s.ep.wateringFixed ? `<div class="fact">${ICON.water}<span>Automatic watering is working again.</span></div>` : s.ep.phase === 'after' ? `<div class="fact">${ICON.water}<span>The watering pump is broken. Take a spare part from the storage room, then kneel at the pump on the west wall to repair it.</span></div>` : `<div class="fact">${ICON.water}<span>The automatic watering pump is broken. Water each bed by hand every Sol until it can be repaired after the storm.</span></div>`) : '';
    return `<div class="holo-panel">${head('farm', 'Indoor Farm')}<div class="panel-body"><div class="row">${checkBtn(s, 'plants')}</div><div class="legend">${cost(ACTION_ENERGY.plant)} plant · ${cost(ACTION_ENERGY.water)} water · ${cost(ACTION_ENERGY.harvest)} harvest · your energy</div>${beds}${pump}<h4>Grow-lights</h4><div class="optlist">${lights}</div></div></div>`;
  }, c => {
    if (c[0] === 'lights') host.set('farm', c[1]);
    else if (c[0] === 'check') host.run('check', { system: c[1] });
  });
}

// ---------- Air & Water ----------
export function openLs(host: Host) {
  panel('inspect', host, () => {
    const s = host.state(), r = rates(s);
    const cards = (Object.keys(LS) as (keyof typeof LS)[]).map(k => optCard(`ls|${k}`, 'ls', LS[k].name, s.ls === k,
      `${chip('o2', `air ${LS[k].ox >= 0.8 ? '▲▲' : LS[k].ox >= 0.4 ? '▲' : '▼'}`, LS[k].ox >= 0.4 ? 'g' : 'b')}${chip('water', `water ${LS[k].ox <= 0.2 ? '▲▲' : LS[k].ox <= 0.5 ? '▲' : '▼'}`, LS[k].ox <= 0.5 ? 'g' : 'b')}`, false, LS[k].why)).join('');
    const a1 = arrows(r.o2), a2 = arrows(r.water);
    return `<div class="holo-panel">${head('ls', 'Air & Water Maker')}<div class="panel-body"><div class="row">${checkBtn(s, 'air')}${checkBtn(s, 'water')}</div><p class="why">All the power you have must be shared. Pick where it goes.</p>
      ${vbar('o2', s.res.o2 / 100, levelClass(s.res.o2) === 'crit' ? 'r' : 'n', `<span class="rtrend ${a1.c}">${a1.t}</span>`)}${vbar('water', s.res.water / 100, levelClass(s.res.water) === 'crit' ? 'r' : 'n', `<span class="rtrend ${a2.c}">${a2.t}</span>`)}
      <div class="optlist cols3">${cards}</div>${s.buildings.includes('recycler') ? '<div class="fact">' + ICON.ls + '<span>The Water Recycler is saving you water.</span></div>' : ''}</div></div>`;
  }, c => { if (c[0] === 'ls') host.set('ls', c[1]); else if (c[0] === 'check') host.run('check', { system: c[1] }); });
}

// ---------- Comms / Earth ----------
export function openComms(host: Host) {
  panel('inspect', host, () => {
    const s = host.state(), enRoute = s.shipmentArrivesSol > s.sol;
    if (s.ep && lockedIn(s)) return `<div class="holo-panel">${head('dish', 'Comms Link')}<div class="panel-body"><p class="why">The storm is blocking the uplink to Earth. Only static gets through.</p><div class="static" id="static-box">${esc(staticText(s.sol))}</div><div class="row"><button class="holo-btn small amber" data-do="listen">LISTEN AGAIN</button></div><p class="why">Next supply ship from Earth: about ${SHIP_SOLS} sols away (a 6-month trip). ${learnButton('comms_delay')}</p></div></div>`;
    if (s.ep) return `<div class="holo-panel">${head('dish', 'Comms Link')}<div class="panel-body">${s.flags.broken_comms ? '<p class="why"><b>The comms console is broken.</b> Carry a spare part from the storage room to this console and repair it by hand.</p>' : ''}<div class="row">${checkBtn(s, 'comms')}</div>
      <p class="why">A radio message takes between 3 and 22 minutes each way, so Earth cannot answer quickly. ${learnButton('comms_delay')}</p>
      <div class="fact">${ICON.earth}<span>Next supply ship from Earth: about <b>${SHIP_SOLS} sols</b> away. A trip to Mars takes about six months, and a sol is 24 hours 39 minutes.</span></div></div></div>`;
    return `<div class="holo-panel">${head('dish', 'Comms Link')}<div class="panel-body">
      <div class="link"><span class="planet"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="#2f7be0"/><path d="M16 22c6-7 13-5 15 2s-6 8-8 14-10-2-7-16z" fill="#4dbb6a"/></svg></span><div class="track ${enRoute ? 'pend' : 'ok'}"><i style="width:100%"></i></div><span class="planet"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="#c1502e"/><circle cx="22" cy="24" r="5" fill="#9a3a20"/><circle cx="40" cy="40" r="7" fill="#9a3a20"/></svg></span></div>
      <p class="why">A radio message takes about 3 to 22 minutes each way. Supplies take a whole Sol. Earth cannot rescue you quickly.</p>
      ${vbar('earth', clamp(s.solsSinceShipment / 10, 0, 1), 'g', `${s.solsSinceShipment}/10 Sols`)}
      <div class="optlist">${optCard('ship', 'door', enRoute ? 'Shipment on its way' : 'Request supply shipment', false, `${cost(ACTION_ENERGY.request_shipment)}${chip('hourglass', 'lands tomorrow', 'n')}${chip('earth', 'resets your streak', 'r')}`, enRoute, 'A safety net. But the goal is to need Earth less.')}</div></div></div>`;
  }, c => { if (c[0] === 'ship') host.run('request_shipment'); else if (c[0] === 'check') host.run('check', { system: c[1] }); else if (c[0] === 'listen') sfx.static(); });
}

// ---------- Solar ----------
export function openSolar(host: Host) {
  panel('inspect', host, () => {
    const s = host.state(), env = envForSol(s.sol), eff = solarEfficiency(s, env), ep = s.ep;
    if (ep) {
      const inStorm = ep.phase === 'storm' || (ep.phase === 'prep' && ep.stormCall);
      const toggle = ''; // Step 16a: stowing and deploying is done at the panel lever in the Control Module, not from this panel
      const clean = ''; // Step 16b: cleaning is done by hand at the panels (animated), not from this panel
      return `<div class="holo-panel">${head('panel', 'Solar Farm')}<div class="panel-body"><div class="row">${checkBtn(s, 'solar')}</div>
        ${vbar('dust', s.panelDust, s.panelDust > 0.6 ? 'r' : s.panelDust > 0.3 ? 'b' : 'g', `${Math.round(s.panelDust * 100)}% dusty`)}${vbar('panel', 1 - ep.panelDamage, ep.panelDamage > 0.3 ? 'r' : 'g', `${Math.round((1 - ep.panelDamage) * 100)}% panel health`)}${vbar('sun', clamp(eff, 0, 1), eff < 0.35 ? 'r' : 'g', ep.panelsStowed ? 'STOWED: 0% output' : `${Math.round(eff * 100)}% output`)}
        <p class="why">${ep.phase === 'after' || ep.phase === 'done' ? 'The storm has passed. Stowed panels: pull the lever in the Control Module. Panels left out: go to them outside and dig out the dust by hand.' : inStorm ? 'The dust storm is here. Stowed panels are safe but make nothing; panels left out make some power and get buried a little more each night. The panel lever is in the Control Module.' : 'The panels are dusty, but Reyes says to leave cleaning until after the storm. Decide tonight whether to stow them.'}</p>
        <div class="optlist">${toggle}${clean}</div></div></div>`;
    }
    return `<div class="holo-panel">${head('panel', 'Solar Farm')}<div class="panel-body">
      ${vbar('dust', s.panelDust, s.panelDust > 0.6 ? 'r' : s.panelDust > 0.3 ? 'b' : 'g', `${Math.round(s.panelDust * 100)}% dusty`)}${vbar('sun', clamp(eff, 0, 1), eff < 0.35 ? 'r' : 'g', `${Math.round(eff * 100)}% output`)}
      <p class="why">Dust blocks sunlight and builds up every Sol. Wipe the panels to get your power back.</p>
      <div class="optlist">${optCard('clean', 'sparkle', 'Wipe the panels', false, `${cost(ACTION_ENERGY.clean_panels)}${chip('power', 'more power', 'g')}`, false, 'Takes real effort, so choose when to do it.')}</div></div></div>`;
  }, c => { if (c[0] === 'clean') host.run('clean_panels'); else if (c[0] === 'check') host.run('check', { system: c[1] }); else if (c[0] === 'panels') host.run('panels'); });
}

// ---------- Rover and cave ----------
export function openRover(host: Host) {
  panel('inspect', host, () => {
    const s = host.state(), wind = envForSol(s.sol).windMs >= 18;
    return `<div class="holo-panel">${head('base', 'Rover')}<div class="panel-body"><p class="why">Rover trips: ${Number(s.flags.trips || 0)} so far. ${wind ? 'Strong wind today makes a trip harder.' : 'Calm weather.'}</p>
      <div class="optlist">${optCard('go', 'base', 'Drive out and explore', false, `${cost(ACTION_ENERGY.explore + (wind ? 10 : 0))}${chip('power', '−6', 'b')}${chip('sparkle', 'may find something', 'g')}`)}</div></div></div>`;
  }, c => { if (c[0] === 'go') host.run('explore'); });
}
export function openCave(host: Host) {
  const info: Record<string, [string, string, Record<string, number>]> = {
    explore: ['Explore', 'Scout deeper into the candidate cave.', {}], excavate: ['Excavate', 'Dig the tunnel wider.', { power: 10 }],
    pressurize: ['Pressurize', 'Fill it with breathable air.', { o2: 10, power: 8 }], shield: ['Shield', 'Rock and ice stop radiation.', { power: 6, water: 5 }],
  };
  panel('inspect', host, () => {
    const s = host.state();
    const cards = (Object.keys(info) as (keyof typeof info)[]).map(k => optCard(`cave|${k}`, k === 'explore' ? 'base' : k === 'excavate' ? 'door' : k === 'pressurize' ? 'o2' : 'rad', info[k][0], false,
      `${cost(ACTION_ENERGY[('cave_' + k) as ActionName])}${costRes(info[k][2])}${pips(s.cave[k as keyof typeof s.cave], CAVE_MAX, 'g', CAVE_MAX)}`, s.cave[k as keyof typeof s.cave] >= CAVE_MAX, info[k][1])).join('');
    return `<div class="holo-panel">${head('base', 'The Candidate Cave')}<div class="panel-body"><p class="why">Orbiters spotted this pit. Nobody has confirmed what is inside. ${s.flags.cavern_water ? 'You opened the cavern. It has water ice!' : 'Work on all four to open it up.'}</p><div class="optlist">${cards}</div></div></div>`;
  }, c => { if (c[0] === 'cave') host.run(('cave_' + c[1]) as ActionName); });
}

// ---------- Crew (sick bay intercom / quarters) ----------
// Food pictures for the menu: the generated pixel art drawn onto a canvas once, then reused as data URLs (Step 9b art, Step 9c menu).
const FOOD_URLS = new Map<string, string>();
function foodImg(id: string, size: FoodSize): string {
  const key = `${size}_${id}`; let url = FOOD_URLS.get(key);
  if (!url) {
    const p = foodPixels(id, size), c = document.createElement('canvas'); c.width = p.w; c.height = p.h;
    const ctx = c.getContext('2d')!, img = ctx.createImageData(p.w, p.h);
    p.px.forEach((v, i) => { if (v === -1) return; img.data[i * 4] = (v >> 16) & 255; img.data[i * 4 + 1] = (v >> 8) & 255; img.data[i * 4 + 2] = v & 255; img.data[i * 4 + 3] = 255; });
    ctx.putImageData(img, 0, 0); url = c.toDataURL(); FOOD_URLS.set(key, url);
  }
  return url;
}
const PADLOCK_OPEN = '<svg class="lock-ico open" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="8" rx="1.5" fill="#8cffc6" stroke="#1c1022"/><path d="M5 5V3.5a3 3 0 0 1 6 0" fill="none" stroke="#bfeaff" stroke-width="1.6"/><rect x="7.2" y="10" width="1.6" height="3" fill="#1c1022"/></svg>';
const PADLOCK = '<svg class="lock-ico" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="8" rx="1.5" fill="#ffd24a" stroke="#1c1022"/><path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="#bfeaff" stroke-width="1.6"/><rect x="7.2" y="10" width="1.6" height="3" fill="#1c1022"/></svg>';
const METHOD_CLASS: Record<string, string> = { READY_TO_EAT: 'ready', HYDRATE: 'hydrate', HEAT: 'heat', FARM_PRODUCE: 'farm' };

export function openKitchen(host: Host) {
  const tray: string[] = []; let note = '';
  const card = (s: GameState, f: FoodItem) => {
    const inTray = tray.filter(id => id === f.id).length, left = foodStock(s, f), locked = !isFoodUnlocked(s, f), produce = f.category === 'farm-produce';
    const cost = `${f.water ? `Water ${Math.round(f.water * 1000)} ml` : ''}${f.water && f.power ? ' · ' : ''}${f.power ? `Power ${f.power}` : ''}${!f.water && !f.power ? 'No water or power' : ''} · ${f.minutes ? `${f.minutes} min` : 'instant'}`;
    const art = `<img class="food-art" src="${foodImg(f.id, 'card')}" width="64" height="64" alt="" />`;
    if (locked) return `<button class="meal-card locked" data-do="locked|${f.id}" aria-label="${esc(f.name)} is locked. ${esc(LOCKED_CROP_MSG)}"><span class="food-art-wrap">${art}${PADLOCK}</span><b>${esc(f.name)}</b><span class="method-badge farm">LOCKED</span><small>Tap to see how to unlock</small></button>`;
    const fresh = !!f.unlockFlag && !s.flags[`seen_${f.unlockFlag}`];                         // Step 10b: first time this crop is seen open -> the padlock opens
    if (fresh) s.flags[`seen_${f.unlockFlag}`] = true;
    return `<div class="meal-card${fresh ? ' just-unlocked' : ''}"><span class="food-art-wrap">${art}${fresh ? PADLOCK_OPEN : ''}</span><b>${esc(f.name)}</b><span class="method-badge ${METHOD_CLASS[f.method]}">${METHOD_LABEL[f.method]}</span><small>${left} ${produce ? 'harvested' : 'left'}</small><small>${cost}</small><div class="meal-qty"><button data-do="remove|${f.id}" ${!inTray ? 'disabled' : ''} aria-label="Remove ${esc(f.name)}">−</button><span>${inTray}</span><button data-do="add|${f.id}" ${left <= inTray || tray.length >= FOOD_PORTIONS ? 'disabled' : ''} aria-label="Add ${esc(f.name)}">+</button></div></div>`;
  };
  panel('inspect', host, () => {
    const s = host.state(), t = trayTotals(tray);
    const slots = Array.from({ length: FOOD_PORTIONS }, (_, i) => tray[i]
      ? `<button class="tray-slot full" data-do="slot|${i}" aria-label="Remove ${esc(foodItem(tray[i])?.name ?? 'item')} from the tray"><img src="${foodImg(tray[i], 'tray')}" width="32" height="32" alt="" /></button>`
      : `<span class="tray-slot" aria-label="Empty slot ${i + 1}"></span>`).join('');
    const problem = tray.length < FOOD_PORTIONS ? `Add ${FOOD_PORTIONS - tray.length} more portion${tray.length === FOOD_PORTIONS - 1 ? '' : 's'} to the tray.` : trayProblem(s, tray) ?? (s.energy < ACTION_ENERGY.cook_serve ? 'Too tired to cook. Rest first.' : '');
    const canCook = !problem;
    const advice = note || problem;
    return `<div class="holo-panel kitchen-panel">${head('food', 'Kitchen · electric preparation')}<div class="panel-body"><div class="mini food-sols"><div class="mt"><span class="mic">${ICON.food}</span><span>${foodSolsText(s)}</span></div><div class="bar"><i style="width:${Math.round(rationSolsLeft(s) / RATION_SOLS_START * 100)}%"></i></div></div><p class="why">Choose five portions. This room uses an electric heater and microwave—no open flame on Mars. When you confirm, you will prepare the tray, carry it to the meal hatch, and deliver it by hand.</p><div class="kitchen-step"><span class="tag emb">1 SELECT</span><span class="tag arch">2 COOK</span><span class="tag live">3 DELIVER</span></div><div class="meal-tray"><b>TRAY ${tray.length}/${FOOD_PORTIONS}</b><div class="five-banner">5 portions = 4 crew + you</div><div class="tray-slots">${slots}</div><small>Total: ${t.water ? `${Math.round(t.water * 1000)} ml water · ` : ''}${t.power} power · ${t.minutes} min</small></div><section class="food-section"><h3 class="food-head">NASA FOOD SUPPLIES</h3><div class="kitchen-grid">${SPACE_MEALS.map(m => card(s, foodItem(m.id)!)).join('')}</div></section><section class="food-section"><h3 class="food-head">GREENHOUSE PRODUCE</h3>${aokiHint(s) ? `<p class="why">${esc(aokiHint(s)!)} Chat with the botanist at the intercom.</p>` : ''}<div class="kitchen-grid">${PRODUCE_ITEMS.map(f => card(s, f)).join('')}</div></section>${advice ? `<p class="why meal-advice" role="status">${esc(advice)}</p>` : ''}<button class="holo-btn primary" data-do="cook" ${canCook ? '' : 'disabled'}>COOK & SERVE ▸</button></div></div>`;
  }, c => {
    note = '';
    if (c[0] === 'add' && tray.length < FOOD_PORTIONS && foodItem(c[1])) tray.push(c[1]);
    else if (c[0] === 'remove') { const i = tray.lastIndexOf(c[1]); if (i >= 0) tray.splice(i, 1); }
    else if (c[0] === 'slot') { const i = Number(c[1]); if (i >= 0 && i < tray.length) tray.splice(i, 1); }
    else if (c[0] === 'locked') note = LOCKED_CROP_MSG;
    else if (c[0] === 'cook' && tray.length === FOOD_PORTIONS) { UI.close('inspect'); host.run('cook_serve', { tray: JSON.stringify(tray) }); }
  });
}

// ---------- Step 10b: the botanist's optional topics ----------
const heartsHtml = (s: GameState, id: CrewId) => Array.from({ length: 5 }, (_, i) => `<span class="${i < Math.min(5, s.crew[id].friendship) ? '' : 'off'}">♥</span>`).join('');
function aokiTopicList(s: GameState): string {
  const hint = aokiHint(s), c = CREW[BOTANIST];
  const rows = AOKI_TOPICS.map(t => `<button class="holo-btn small aoki-topic ${aokiChoice(s, t.id) !== null ? 'done' : ''}" data-do="topic|${t.id}">${aokiChoice(s, t.id) !== null ? '✓ ' : ''}${esc(t.title)}</button>`).join('');
  return `<div class="aoki-topics"><b>ASK ${esc(c.name.split(' ')[0].toUpperCase())} ABOUT…</b><p class="why">Optional. ${AOKI_ENERGY_NOTE} The first new topic each Sol earns a heart.${aokiHeartEarnedToday(s) ? ' (Today\'s heart is already earned.)' : ''}${hint ? ' ' + esc(hint) : ''}</p><div class="aoki-list">${rows}</div></div>`;
}
function aokiTopicView(s: GameState, topicId: string, note: string): string {
  const t = aokiTopic(topicId)!, c = CREW[BOTANIST], ch = aokiChoice(s, topicId);
  const thread = `<div class="chat-bubble them"><b>${esc(c.name)}</b><p>${esc(t.prompt)}</p></div>` + (ch === null ? '' :
    `<div class="chat-bubble me"><p>${esc(t.choices[ch])}</p></div><div class="chat-bubble them"><b>${esc(c.name)}</b><p>${esc(t.replies[ch])}</p><div class="chat-fact">${esc(t.fact)}</div></div>`);
  const foot = ch === null
    ? `<div class="chat-choices"><button class="holo-btn" data-do="atalk|0">${esc(t.choices[0])}</button><button class="holo-btn" data-do="atalk|1">${esc(t.choices[1])}</button></div><p class="why">${AOKI_ENERGY_NOTE}</p>`
    : `${note ? `<p class="why aoki-note" role="status">${esc(note)}</p>` : ''}<button class="holo-btn amber" data-do="tback">BACK TO TOPICS</button>`;
  return `<div class="holo-panel chat-panel">${head('crew', c.name)}<div class="panel-body"><div class="chat-profile">${crewPortrait(BOTANIST)}<span><b>${esc(t.title)}</b><div class="hearts">${heartsHtml(s, BOTANIST)}</div></span></div><div class="chat-thread">${thread}</div>${foot}</div></div>`;
}
const hungry0 = (s: GameState, id: CrewId) => isHungry(s, s.crew[id]);
// Step 27d: the yellow START QUIZ button, right of the crew name; only today's caller shows it.
const startQuiz = (s: GameState, id: CrewId) => showStartQuiz(s, id, hasBank(id), isHungry(s, s.crew[id])) ? `<button class="qz-start" data-do="quiz|${id}">START QUIZ</button>` : '';
export function openCrew(host: Host) {
  let chat: CrewId | null = null, topic: string | null = null, topicNote = '';
  panel('inspect', host, () => {
    const s = host.state(), over = !!s.flags.quarantine_over;
    if (s.ep && s.ep.call === 'ringing' && s.ep.phase === 'call') {
      const rows = (Object.keys(CREW) as CrewId[]).map(id => `<div class="crewrow">${crewPortrait(id)}<span><div class="nm">${esc(CREW[id].name)}</div><div class="why">${esc(CREW[id].role)}</div></span><button class="holo-btn small ${id === 'reyes' ? 'amber' : ''}" data-do="answer|${id}">Answer</button></div>`).join('');
      return `<div class="holo-panel">${head('crew', 'Incoming call')}<div class="panel-body"><p class="why">The intercom is ringing. Who is calling?</p>${rows}</div></div>`;
    }
    if (chat === BOTANIST && topic && aokiTopic(topic)) return aokiTopicView(s, topic, topicNote);
    if (chat) {
      const chatId = chat, c = CREW[chatId], saved = s.crewChats[chatId], hearts = Array.from({ length: 5 }, (_, i) => `<span class="${i < Math.min(5, s.crew[chatId].friendship) ? '' : 'off'}">♥</span>`).join('');
      const messages = hungry0(s, chatId) && !saved
        ? `<div class="chat-bubble them"><b>${esc(c.name)}</b><p>${esc(hungryRefusal(chatId))}</p></div>`
        : !saved
        ? `<div class="chat-bubble them"><b>${esc(c.name)}</b><p>${esc(c.chat.prompt)}</p></div>`
        : `<div class="chat-saved">SAVED CONVERSATION · SOL ${saved.sol}</div><div class="chat-bubble them"><b>${esc(c.name)}</b><p>${esc(c.chat.prompt)}</p></div><div class="chat-bubble me"><p>${esc(c.chat.choices[saved.choice])}</p></div><div class="chat-bubble them"><b>${esc(c.name)}</b><p>${esc(c.chat.replies[saved.choice])}</p>${c.chat.fact ? `<div class="chat-fact">${esc(c.chat.fact)} ${c.chat.learnId ? learnButton(c.chat.learnId) : ''}</div>` : ''}</div>`;
      const hungry = isHungry(s, s.crew[chatId]);
      const choices = hungry && !saved ? '' : !saved
        ? `<div class="chat-choices"><button class="holo-btn" data-do="reply|0">${esc(c.chat.choices[0])}</button><button class="holo-btn" data-do="reply|1">${esc(c.chat.choices[1])}</button></div>`
        : `<button class="holo-btn amber" data-do="back">BACK TO INTERCOM</button>`;
      return `<div class="holo-panel chat-panel">${head('crew', c.name)}<div class="panel-body"><div class="chat-profile">${crewPortrait(chatId)}<span><b>${esc(c.role)}</b><div class="hearts">${hearts}</div></span>${startQuiz(s, chatId)}</div><div class="chat-thread">${messages}</div>${choices}${chatId === BOTANIST && !isHungry(s, s.crew[chatId]) ? aokiTopicList(s) : ''}${hungry && !saved ? '<button class="holo-btn amber" data-do="back">BACK TO INTERCOM</button>' : ''}</div></div>`;
    }
    const rows = (Object.keys(CREW) as CrewId[]).map(id => {
      const c = s.crew[id], hearts = Array.from({ length: 5 }, (_, i) => `<span class="${i < Math.min(5, c.friendship) ? '' : 'off'}">♥</span>`).join('');
      return `<div class="crewrow">${crewPortrait(id)}<span><div class="nm">${esc(CREW[id].name)}${startQuiz(s, id)}</div><div class="why">${esc(CREW[id].role)}. ${esc(CREW[id].blurb)}</div><div class="hearts">${hearts}</div><div class="row">${moodChip(s, id)}</div></span><button class="holo-btn small" data-do="talk|${id}">${s.crewChats[id] ? 'Read chat' : 'Message'}</button></div>`;
    }).join('');
    const hist = (s.recentMeals ?? []).slice().reverse().map(r => `<li><b>Sol ${r.sol}:</b> ${esc(r.itemIds.map(i => foodItem(i)?.name ?? i).join(', '))}</li>`).join('');
    const meals = `<div class="meal-history"><b>LAST MEALS</b>${hist ? `<ul>${hist}</ul>` : '<p class="why">No trays served yet. Skipped meals make everyone hungrier, slowly.</p>'}</div>`;
    const left = s.ep ? ` Chats left today: <b>${Math.max(0, EP.CHATS_PER_SOL - Number(s.flags.tmp_chats || 0))}</b> of ${EP.CHATS_PER_SOL} (the crew needs rest).` : '';
    return `<div class="holo-panel">${head('crew', over ? 'Crew Quarters' : 'Sick Bay Intercom')}<div class="panel-body"><p class="why">${over ? 'The crew is well again.' : 'Everyone is quarantined. Use the wall intercom to send a message.'} A chat costs ${ACTION_ENERGY.talk} energy and cheers people up. Hungry crew need a meal from the hatch.${left}</p>${rows}${meals}</div></div>`;
  }, c => { if (c[0] === 'talk') { chat = c[1] as CrewId; } else if (c[0] === 'reply' && chat) { host.run('talk', { crew: chat, choice: c[1] }); } else if (c[0] === 'topic' && chat === BOTANIST && aokiTopic(c[1])) { topic = c[1]; topicNote = ''; } else if (c[0] === 'atalk' && chat === BOTANIST && topic) { const h0 = host.state().crew[BOTANIST].friendship; host.run('aoki_talk', { topic, choice: c[1] }); const h1 = host.state().crew[BOTANIST].friendship; topicNote = h1 > h0 ? '♥ +1 heart with ' + CREW[BOTANIST].name.split(' ')[0] + '.' : 'No new heart this time. Come back tomorrow.'; } else if (c[0] === 'tback') { topic = null; } else if (c[0] === 'back') { chat = null; topic = null; } else if (c[0] === 'answer') { UI.close('inspect'); host.run('answer', { crew: c[1] }); } else if (c[0] === 'quiz') { UI.close('inspect'); host.quiz(c[1] as CrewId); } });
}

// ---------- Gym (Episode 1, pack Steps 5/9) ----------
export function openGym(host: Host, machine: Machine) {
  panel('inspect', host, () => {
    const s = host.state(), n = workoutsToday(s), mc = MACHINES[machine];
    const status = n === 0 ? 'No workout yet today.' : n <= GYM.SWEET_MAX ? `${n} of ${GYM.SWEET_MAX} workouts today: the sweet spot.` : `${n} workouts today: that is too many.`;
    return `<div class="holo-panel">${head('crew', mc.name)}<div class="panel-body"><p class="why">${esc(mc.what)}</p>
      <div class="fact">${ICON.bulb}<span><b>Sweet spot: one or two workouts per Sol.</b> Skip a day and your health drops overnight; train three or more times and it drops too. ${esc(status)}</span>${learnButton('exercise')}</div>
      <p class="why">Space station crews exercise about two hours every day, because without gravity their bones and muscles get weaker. Healthier explorers also handle radiation outside better.</p>
      <div class="optlist">${optCard('go', 'crew', 'Start the workout', false, `${chip('bulb', `−${mc.energy}`, 'n')}${chip('crew', n >= GYM.SWEET_MAX ? 'too much: health −' : `health +${mc.health}`, n >= GYM.SWEET_MAX ? 'r' : 'g')}`, s.energy < mc.energy, s.energy < mc.energy ? 'Too tired. Rest first.' : 'A short rhythm game. You can skip it and get the same result.')}</div></div></div>`;
  }, c => { if (c[0] === 'go') { UI.close('inspect'); host.workout(machine); } });
}

// ---------- Science lab ----------
export function openLab(host: Host) {
  panel('inspect', host, () => {
    const s = host.state(), studied = !!s.flags.tmp_studied, a = alertFor(s);
    return `<div class="holo-panel">${head('farm', 'Science Lab')}<div class="panel-body">
      <div class="optlist">${optCard('study', 'farm', 'Check the plants under the microscope', studied, `${cost(AE.study_plants)}${chip('farm', 'plant health +8', 'g')}`, studied, studied ? 'Done for today.' : 'Spot leaf disease early, before it spreads. Once per Sol.')}</div>
      <h4>Radiation badge reader</h4>
      ${vbar('rad', s.health / 100, s.health < 40 ? 'r' : 'g', `${Math.round(s.health)} health`)}
      <p class="why">Space weather now: <b>${ALERT_LABEL[a]}</b>. In this game the badge counts the radiation you take outside: the higher the alert, the faster it adds up. Stay inside when the alert is HIGH. ${learnButton('space_radiation')}</p>
      <p class="why">NASA's Curiosity rover carries a radiation detector that tells scientists what astronauts would face on Mars. ${learnButton('curiosity_rad')}</p></div></div>`;
  }, c => { if (c[0] === 'study') host.run('study_plants'); });
}

// ---------- Bathroom ----------
export function openBath(host: Host) {
  panel('inspect', host, () => {
    const s = host.state();
    return `<div class="holo-panel">${head('water', 'Bathroom')}<div class="panel-body">
      <p class="why">Nothing goes to waste up here. Water from the sink, the shower and even the toilet goes through the pipes to the Water Recovery System, which cleans it so you can drink it again.</p>
      ${vbar('water', s.res.water / 100, levelClass(s.res.water) === 'crit' ? 'r' : 'g', `${Math.round(s.res.water)}% water in the tank`)}
      <div class="fact">${ICON.water}<span>The real International Space Station now recovers <b>98%</b> of its water, including from sweat and urine. A Mars base has to do the same.</span>${learnButton('water_recycling')}</div></div></div>`;
  }, () => {});
}

// ---------- Control Module ----------
const ring = (ic: string, nm: string, v: number, rt: number) => {
  const R = 34, C = 2 * Math.PI * R, a = arrows(rt), cls = levelClass(v);
  return `<div class="ring ${cls}"><div class="dial"><svg viewBox="0 0 96 96"><circle class="rt" cx="48" cy="48" r="${R}"/><circle class="rf" cx="48" cy="48" r="${R}" transform="rotate(-90 48 48)" stroke-dasharray="${(clamp(v, 0, 100) / 100) * C} ${C}"/></svg><div class="rc">${ICON[ic]}<b>${Math.round(v)}</b></div></div><div class="rname">${nm}</div><div class="rtrend ${a.c}">${a.t}</div></div>`;
};
const TABS: [string, string, string][] = [['meters', 'gauge', 'Meters'], ['build', 'base', 'Build'], ['crew', 'crew', 'Crew'], ['journal', 'doc', 'Journal'], ['time', 'hourglass', 'Time']];
export function openControl(host: Host, tab = 'meters') {
  panel('control', host, () => {
    const s = host.state(), r = rates(s);
    let body = '';
    if (tab === 'meters') {
      const nn = nowNext(s);
      body = `${nn.now ? `<div class="nn-strip"><div class="nn-now"><span>NOW</span><b>${esc(nn.now)}</b></div>${nn.next ? `<div class="nn-next"><span>NEXT</span><b>${esc(nn.next)}</b></div>` : ''}</div>` : ''}
        <div class="sys-grid">${systemCards(s).map(c => { const a = arrows(c.trend); return `<div class="sys-card ${c.level}"><div class="sys-top"><span class="sys-ico">${ICON[c.icon] ?? ''}</span><span class="sys-title">${esc(c.title)}</span>${c.trend ? `<span class="rtrend ${a.c}">${a.t}</span>` : ''}</div><div class="sys-line">${esc(c.line)}</div><div class="sys-bar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${c.value}" aria-label="${esc(c.title)}"><i style="width:${c.value}%"></i></div></div>`; }).join('')}</div>`;
    } else if (tab === 'build') {
      const avail = Object.entries(BUILDINGS).filter(([id, b]) => !s.buildings.includes(id) && s.stage >= b.stage);
      body = avail.length ? `<div class="optlist">${avail.map(([id, b]) => optCard(`build|${id}`, 'base', b.name, false, `${cost(ACTION_ENERGY.build)}${costRes(b.cost)}`, false, b.why)).join('')}</div>` : '<p class="why">Nothing to build right now. Reach the next stage to unlock more.</p>';
      if (s.buildings.length) body += `<h4>Built</h4><div class="row">${s.buildings.map(id => `<span class="tag emb">${esc(BUILDINGS[id].name)}</span>`).join('')}</div>`;
    } else if (tab === 'crew') {
      body = (Object.keys(CREW) as CrewId[]).map(id => { const c = s.crew[id]; return `<div class="crewrow">${crewPortrait(id)}<span><div class="nm">${esc(CREW[id].name)}</div><div class="hearts">${Array.from({ length: 5 }, (_, i) => `<span class="${i < Math.min(5, c.friendship) ? '' : 'off'}">♥</span>`).join('')}</div><div class="row">${moodChip(s, id)}</div></span><span></span></div>`; }).join('');
    } else if (tab === 'journal') body = `<div class="row"><button class="holo-btn small amber" data-do="journal">${ICON.doc} MY JOURNAL: PHOTOS, DIARY, NOTES, MAP</button><button class="holo-btn small" data-do="wiki">${ICON.doc} THE NASA WIKI</button></div><h4>Decisions and discoveries</h4>` + journalHtml(s);
    else {
      const sols = host.rewindable();
      body = `<p class="why">To end the Sol, walk to the <b>Sleep Pod</b> in the Rec Room (next to Comms) and lie down. Crops grow while you sleep. Going to bed late means less rest.</p><div class="optlist">
        ${optCard('save', 'doc', 'Save game', false, '')}${optCard('menu', 'door', 'Main menu', false, '')}</div>
        <h4>Time Machine: go back to a morning</h4>${sols.length ? `<div class="row">${sols.slice(0, 24).map(n => `<button class="holo-btn small" data-do="rewind|${n}">Sol ${n}</button>`).join('')}</div>` : '<p class="why">No earlier Sols yet.</p>'}
        <p class="why">Rewinding changes your choices, not the weather or NASA events.</p>${host.branches() ? '<button class="holo-btn small amber" data-do="compare">Compare timelines</button>' : ''}`;
    }
    const tabs = TABS.filter(([k]) => !(s.ep && k === 'build')).map(([k, ic, n]) => `<button data-do="tab|${k}" aria-selected="${k === tab}">${ICON[ic]}${n}</button>`).join('');
    return `<div class="holo-panel">${head('gauge', 'Control Module')}<div class="panel-body"><div class="tabs">${tabs}</div>${body}</div></div>`;
  }, c => {
    if (c[0] === 'tab') tab = c[1];
    else if (c[0] === 'build') host.run('build', { building: c[1] });
    else if (c[0] === 'save') host.save();
    else if (c[0] === 'menu') { UI.close('control'); host.menu(); }
    else if (c[0] === 'rewind') { UI.close('control'); host.rewind(Number(c[1])); }
    else if (c[0] === 'compare') { UI.close('control'); host.compare(); }
    else if (c[0] === 'wiki') openWiki();
    else if (c[0] === 'journal') openJournal(() => host.state(), () => host.save());
  });
}
export { $ };

// ---------- Storage: seed drawer picker (Step 3c). Tiny menu: choose which UNLOCKED crop's seed packet to take. ----------
export function openSeedPicker(crops: CropId[], onPick: (c: CropId) => void): void {
  const el = overlay('seedpick', `<div class="holo-panel">${head('farm', 'Seed drawer')}<div class="panel-body"><p class="why">Pick one packet. You can carry one item at a time.</p><div class="optlist">${
    crops.map(c => optCard(c, 'farm', CROPS[c].name + ' seeds', false, chip('farm', `${CROPS[c].sols} sols`, 'g'), false, 'Take this packet.')).join('')}</div></div></div>`);
  el.querySelectorAll('[data-do]').forEach(b => ((b as HTMLElement).onclick = () => { sfx.click(); const c = (b as HTMLElement).dataset.do as CropId; UI.close('seedpick'); onPick(c); }));
}

// ---------- Step 15b: the pump control. A tiny menu (choosing from options); the switch itself is animated in the world. ----------
export function openPumpMode(mode: 'automatic' | 'manual', onPick: (m: 'automatic' | 'manual') => void): void {
  const card = (m: 'automatic' | 'manual', name: string, fx: string, why: string) => optCard(m, 'water', name, mode === m, fx, mode === m, mode === m ? 'Already set.' : why);
  const el = overlay('pumpmode', `<div class="holo-panel">${head('water', 'Water pump control')}<div class="panel-body"><p class="why">Choose how the plants get water. You can change it again later.</p><div class="optlist">${
    card('automatic', 'Automatic', chip('power', 'High power use', 'r'), 'The pump waters every bed. Plants stay watered, but it drains the battery.')}${
    card('manual', 'Manual', chip('water', 'Morning + evening', 'g'), 'Pump off. Take the sprinkler and water every bed each morning AND evening.')}</div></div></div>`);
  el.querySelectorAll('[data-do]').forEach(b => ((b as HTMLElement).onclick = () => { const m = (b as HTMLElement).dataset.do as 'automatic' | 'manual'; if (m === mode) return; sfx.click(); UI.close('pumpmode'); onPick(m); }));
}
