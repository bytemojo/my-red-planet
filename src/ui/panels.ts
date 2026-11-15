import { ICON } from './icons';
import { $, UI, bindLearning, clamp, chip, crewPortrait, esc, head, journalHtml, learnButton, optCard, overlay, pips, vbar, levelClass } from './ui';
import { sfx } from './audio';
import { arrows } from './hud';
import { ACTION_ENERGY, BUILDINGS, CAVE_MAX, CREW_LIFE, CROPS, FARM, LS } from '../core/constants';
import { rates, solarEfficiency } from '../core/sim';
import { envForSol } from '../core/env';
import { CREW } from '../story/crew';
import { isHungry, mood } from '../core/crewlife';
import { SYSTEM_NAME, lockedIn } from '../core/episode';
import { openWiki, staticText } from './episode';
import { openJournal } from './journal';
import { ACTION_ENERGY as AE, EP } from '../core/constants';
import type { SystemId } from '../core/types';
import { GYM, MACHINES, workoutsToday, type Machine } from '../core/gym';
import { alertFor, ALERT_LABEL } from '../core/episode';
import { mealStock, SPACE_MEALS, type MealId } from '../core/meals';

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
  run(name: ActionName, arg?: Record<string, string>): void;       // does the action, toasts, effects, pending beats
  set(what: 'farm' | 'ls', value: string): void;
  rest(): void; rewind(sol: number): void; compare(): void; save(): void; menu(): void;
  branches(): number; rewindable(): number[];
  workout(machine: Machine): void;                                  // plays the workout mini-game, animates, then runs it
}
type Draw = () => string;
function panel(id: string, host: Host, draw: Draw, onDo: (cmd: string[]) => void): void {
  const el = overlay(id, '');
  const render = () => {
    el.innerHTML = draw();
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
  let choosing: string | null = null;
  panel('inspect', host, () => {
    const s = host.state();
    const beds = s.plots.map((p, i) => {
      if (choosing === p.id) {
        const opts = (Object.keys(CROPS) as CropId[]).filter(c => c !== 'tomato' || s.flags.tomato_unlocked)
          .map(c => `<button class="holo-btn small" data-do="plant|${p.id}|${c}">${CROPS[c].name} · ${CROPS[c].sols} Sols · +${CROPS[c].food}</button>`).join('');
        return `<div class="card"><h3>Bed ${i + 1}: plant what?</h3><div class="row">${opts}<button class="holo-btn small amber" data-do="cancel">Back</button></div></div>`;
      }
      if (!p.crop) return `<div class="srow"><span class="vi">${ICON.farm}</span><b>Bed ${i + 1}: empty</b><button class="holo-btn small" data-do="choose|${p.id}">Plant</button></div>`;
      const need = CROPS[p.crop].sols, ready = p.growth >= need;
      const btn = ready ? `<button class="holo-btn small amber" data-do="harvest|${p.id}">Harvest</button>` : p.watered ? `<span class="badge">WATERED</span>` : `<button class="holo-btn small" data-do="water|${p.id}">Water</button>`;
      const health = s.ep ? `<div class="sbar" title="plant health"><i class="en ${(p.health ?? 80) < 40 ? 'r' : 'g'}" style="width:${p.health ?? 80}%"></i></div>` : '';
      return `<div class="srow"><span class="vi">${ICON.farm}</span><span><b>Bed ${i + 1}: ${CROPS[p.crop].name}</b>${s.ep ? ` <small>health ${Math.round(p.health ?? 80)}</small>` : ''}<div class="sbar"><i class="en ${ready ? 'g' : 'b'}" style="width:${clamp(p.growth / need, 0, 1) * 100}%"></i></div>${health}</span>${btn}</div>`;
    }).join('');
    const lightKeys = (s.ep ? ['bright', 'dim', 'off'] : ['bright', 'dim']) as (keyof typeof FARM)[];
    const lights = lightKeys.map(k => optCard(`lights|${k}`, k === 'bright' ? 'sun' : k === 'dim' ? 'sundim' : 'moon', FARM[k].name, s.farm === k,
      `${chip('power', `−${FARM[k].power}/h`, 'b')}${chip('water', `−${FARM[k].water}/h`, 'b')}${chip('farm', k === 'off' ? 'plants weaken' : `grows ×${FARM[k].growth}`, k === 'off' ? 'r' : 'g')}`, false, FARM[k].why)).join('');
    const pump = s.ep ? (s.ep.wateringFixed ? `<div class="fact">${ICON.water}<span>Automatic watering is working again.</span></div>` : s.ep.phase === 'after' ? `<div class="optlist">${optCard('repairw', 'water', 'Repair the watering pump', false, `${cost(AE.repair_watering)}${chip('power', '−5', 'b')}`, false, 'Needs parts from outside, so it could only be fixed after the storm.')}</div>` : `<div class="fact">${ICON.water}<span>The automatic watering pump is broken. Water each bed by hand every Sol until it can be repaired after the storm.</span></div>`) : '';
    return `<div class="holo-panel">${head('farm', 'Indoor Farm')}<div class="panel-body"><div class="row">${checkBtn(s, 'plants')}</div><div class="legend">${cost(ACTION_ENERGY.plant)} plant · ${cost(ACTION_ENERGY.water)} water · ${cost(ACTION_ENERGY.harvest)} harvest · your energy</div>${beds}${pump}<h4>Grow-lights</h4><div class="optlist">${lights}</div></div></div>`;
  }, c => {
    if (c[0] === 'choose') choosing = c[1]; else if (c[0] === 'cancel') choosing = null;
    else if (c[0] === 'plant') { host.run('plant', { plot: c[1], crop: c[2] }); choosing = null; }
    else if (c[0] === 'water') host.run('water', { plot: c[1] });
    else if (c[0] === 'harvest') host.run('harvest', { plot: c[1] });
    else if (c[0] === 'lights') host.set('farm', c[1]);
    else if (c[0] === 'check') host.run('check', { system: c[1] });
    else if (c[0] === 'repairw') host.run('repair_watering');
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
    if (s.ep) return `<div class="holo-panel">${head('dish', 'Comms Link')}<div class="panel-body"><div class="row">${checkBtn(s, 'comms')}</div>
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
      const toggle = inStorm ? optCard('panels', 'panel', ep.panelsStowed ? 'Put the panels back out' : 'Stow the panels', false, `${cost(AE.panels)}${ep.panelsStowed ? chip('power', 'some power', 'g') + chip('rad', 'dust can bury them', 'r') : chip('power', 'no solar power', 'r') + chip('sparkle', 'panels stay safe', 'g')}`, false, ep.panelsStowed ? 'Deploying during the storm: power now, damage overnight.' : 'Stowing: safe, but the battery must carry everything.') : '';
      const clean = ep.phase === 'after' && !ep.panelsCleaned ? optCard('clean', 'sparkle', ep.panelDamage > 0 ? 'Dig out and clean the panels' : 'Clean the panels', false, `${cost(ep.panelDamage > 0 ? AE.fix_panels : AE.clean_panels)}${chip('power', 'power comes back', 'g')}`, false, ep.panelDamage > 0 ? 'Buried panels take extra work, and some scratches will not come out.' : 'Wipe the dust off to get full sunshine.') : '';
      return `<div class="holo-panel">${head('panel', 'Solar Farm')}<div class="panel-body"><div class="row">${checkBtn(s, 'solar')}</div>
        ${vbar('dust', s.panelDust, s.panelDust > 0.6 ? 'r' : s.panelDust > 0.3 ? 'b' : 'g', `${Math.round(s.panelDust * 100)}% dusty`)}${vbar('panel', 1 - ep.panelDamage, ep.panelDamage > 0.3 ? 'r' : 'g', `${Math.round((1 - ep.panelDamage) * 100)}% panel health`)}${vbar('sun', clamp(eff, 0, 1), eff < 0.35 ? 'r' : 'g', ep.panelsStowed ? 'STOWED: 0% output' : `${Math.round(eff * 100)}% output`)}
        <p class="why">${ep.phase === 'after' || ep.phase === 'done' ? 'The storm has passed. Dig out and clean the panels to get power back.' : inStorm ? 'The dust storm is here. Stowed panels are safe but make nothing; panels left out make some power and get buried a little more each night.' : 'The panels are dusty, but Reyes says to leave cleaning until after the storm. Decide tonight whether to stow them.'}</p>
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
export function openKitchen(host: Host) {
  const tray: MealId[] = [];
  panel('inspect', host, () => {
    const s = host.state(), counts = SPACE_MEALS.map(m => ({ ...m, inTray: tray.filter(id => id === m.id).length }));
    const water = counts.reduce((n, m) => n + m.water * m.inTray, 0), power = counts.reduce((n, m) => n + m.power * m.inTray, 0), minutes = counts.reduce((n, m) => n + m.minutes * m.inTray, 0);
    const crewNeedsFood = Object.values(s.crew).some(c => c.hunger >= CREW_LIFE.PECKISH_AT);
    const canCook = tray.length === 5 && crewNeedsFood && s.res.water >= water && s.res.power >= power && s.energy >= ACTION_ENERGY.cook_serve;
    const advice = !crewNeedsFood ? 'The crew has eaten recently. Come back when someone is hungry.' : tray.length < 5 ? `Add ${5 - tray.length} more portion${tray.length === 4 ? '' : 's'} to the tray.` : s.res.water < water ? 'Not enough water to hydrate this tray.' : s.res.power < power ? 'Not enough station power to heat this tray.' : s.energy < ACTION_ENERGY.cook_serve ? 'Too tired to cook. Rest first.' : '';
    return `<div class="holo-panel kitchen-panel">${head('food', 'Kitchen · NASA food supplies')}<div class="panel-body"><p class="why">Choose five portions for the crew and you. Hydrated food uses water; heated food uses station power. Supplies are limited.</p><div class="kitchen-grid">${counts.map(m => `<div class="meal-card"><div class="meal-icon" aria-hidden="true">${m.icon}</div><b>${m.name}</b><small>${m.method} · ${mealStock(s, m.id)} left</small><small>${m.water ? `Water ${Math.round(m.water * 1000)} ml` : ''}${m.water && m.power ? ' · ' : ''}${m.power ? `Power ${m.power}` : ''}${!m.water && !m.power ? 'No water or power' : ''} · ${m.minutes ? `${m.minutes} min` : 'instant'}</small><div class="meal-qty"><button data-do="remove|${m.id}" ${!m.inTray ? 'disabled' : ''} aria-label="Remove ${m.name}">−</button><span>${m.inTray}</span><button data-do="add|${m.id}" ${mealStock(s, m.id) <= m.inTray || tray.length >= 5 ? 'disabled' : ''} aria-label="Add ${m.name}">+</button></div></div>`).join('')}</div><div class="meal-tray"><b>TRAY ${tray.length}/5</b><span>${tray.map(id => SPACE_MEALS.find(m => m.id === id)?.name).join(' · ') || 'Choose portions above'}</span><small>Total: ${water ? `${Math.round(water * 1000)} ml water · ` : ''}${power} power · ${minutes} min</small></div>${advice ? `<p class="why meal-advice" role="status">${advice}</p>` : ''}<button class="holo-btn primary" data-do="cook" ${canCook ? '' : 'disabled'}>COOK & SERVE</button></div></div>`;
  }, c => {
    if (c[0] === 'add' && tray.length < 5) tray.push(c[1] as MealId);
    else if (c[0] === 'remove') { const i = tray.lastIndexOf(c[1] as MealId); if (i >= 0) tray.splice(i, 1); }
    else if (c[0] === 'cook' && tray.length === 5) { UI.close('inspect'); host.run('cook_serve', { tray: JSON.stringify(tray) }); }
  });
}

export function openCrew(host: Host) {
  let chat: CrewId | null = null;
  panel('inspect', host, () => {
    const s = host.state(), over = !!s.flags.quarantine_over;
    if (s.ep && s.ep.call === 'ringing' && s.ep.phase === 'call') {
      const rows = (Object.keys(CREW) as CrewId[]).map(id => `<div class="crewrow">${crewPortrait(id)}<span><div class="nm">${esc(CREW[id].name)}</div><div class="why">${esc(CREW[id].role)}</div></span><button class="holo-btn small ${id === 'reyes' ? 'amber' : ''}" data-do="answer|${id}">Answer</button></div>`).join('');
      return `<div class="holo-panel">${head('crew', 'Incoming call')}<div class="panel-body"><p class="why">The intercom is ringing. Who is calling?</p>${rows}</div></div>`;
    }
    if (chat) {
      const chatId = chat, c = CREW[chatId], saved = s.crewChats[chatId], hearts = Array.from({ length: 5 }, (_, i) => `<span class="${i < Math.min(5, s.crew[chatId].friendship) ? '' : 'off'}">♥</span>`).join('');
      const messages = !saved
        ? `<div class="chat-bubble them"><b>${esc(c.name)}</b><p>${esc(c.chat.prompt)}</p></div>`
        : `<div class="chat-saved">SAVED CONVERSATION · SOL ${saved.sol}</div><div class="chat-bubble them"><b>${esc(c.name)}</b><p>${esc(c.chat.prompt)}</p></div><div class="chat-bubble me"><p>${esc(c.chat.choices[saved.choice])}</p></div><div class="chat-bubble them"><b>${esc(c.name)}</b><p>${esc(c.chat.replies[saved.choice])}</p>${c.chat.fact ? `<div class="chat-fact">${esc(c.chat.fact)} ${c.chat.learnId ? learnButton(c.chat.learnId) : ''}</div>` : ''}</div>`;
      const choices = !saved
        ? `<div class="chat-choices"><button class="holo-btn" data-do="reply|0">${esc(c.chat.choices[0])}</button><button class="holo-btn" data-do="reply|1">${esc(c.chat.choices[1])}</button></div>`
        : `<button class="holo-btn amber" data-do="back">BACK TO INTERCOM</button>`;
      return `<div class="holo-panel chat-panel">${head('crew', c.name)}<div class="panel-body"><div class="chat-profile">${crewPortrait(chatId)}<span><b>${esc(c.role)}</b><div class="hearts">${hearts}</div></span></div><div class="chat-thread">${messages}</div>${choices}</div></div>`;
    }
    const rows = (Object.keys(CREW) as CrewId[]).map(id => {
      const c = s.crew[id], hearts = Array.from({ length: 5 }, (_, i) => `<span class="${i < Math.min(5, c.friendship) ? '' : 'off'}">♥</span>`).join('');
      return `<div class="crewrow">${crewPortrait(id)}<span><div class="nm">${esc(CREW[id].name)}</div><div class="why">${esc(CREW[id].role)}. ${esc(CREW[id].blurb)}</div><div class="hearts">${hearts}</div><div class="row">${moodChip(s, id)}</div></span><button class="holo-btn small" data-do="talk|${id}">${s.crewChats[id] ? 'Read chat' : 'Message'}</button></div>`;
    }).join('');
    const left = s.ep ? ` Chats left today: <b>${Math.max(0, EP.CHATS_PER_SOL - Number(s.flags.tmp_chats || 0))}</b> of ${EP.CHATS_PER_SOL} (the crew needs rest).` : '';
    return `<div class="holo-panel">${head('crew', over ? 'Crew Quarters' : 'Sick Bay Intercom')}<div class="panel-body"><p class="why">${over ? 'The crew is well again.' : 'Everyone is quarantined. Use the wall intercom to send a message.'} A chat costs ${ACTION_ENERGY.talk} energy and cheers people up. Hungry crew need a meal from the hatch.${left}</p>${rows}</div></div>`;
  }, c => { if (c[0] === 'talk') { chat = c[1] as CrewId; } else if (c[0] === 'reply' && chat) { host.run('talk', { crew: chat, choice: c[1] }); } else if (c[0] === 'back') { chat = null; } else if (c[0] === 'answer') { UI.close('inspect'); host.run('answer', { crew: c[1] }); } });
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

// ---------- Suit rack (Episode 1) ----------
export function openSuit(host: Host) {
  panel('inspect', host, () => {
    const s = host.state();
    return `<div class="holo-panel">${head('suit', 'Suit Rack')}<div class="panel-body"><p class="why">Mars air is far too thin to breathe. Always put the suit on before the airlock, and watch the space weather alert while you are outside.</p>
      <div class="optlist">${optCard('suit', 'suit', s.suitOn ? 'Take the suit off' : 'Put the suit on', s.suitOn, `${cost(AE.suit)}${s.suitOn ? '' : chip('rad', 'outside allowed', 'g')}`, false, s.suitOn ? 'You are wearing the EVA suit.' : 'Needed for the solar farm and anything outside.')}</div></div></div>`;
  }, c => { if (c[0] === 'suit') host.run('suit'); });
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
      body = `<div class="rings">${ring('o2', 'Air', s.res.o2, r.o2)}${ring('food', 'Food', s.res.food, r.food)}${ring('water', 'Water', s.res.water, r.water)}${ring('power', 'Power', s.res.power, r.power)}</div>
        ${vbar('bulb', s.energy / 100, levelClass(s.energy) === 'crit' ? 'r' : 'b', `${Math.round(s.energy)} energy`)}${vbar('rad', s.rad / 100, levelClass(s.rad) === 'crit' ? 'r' : 'g', `${Math.round(s.rad)}% safe`)}
        <div class="advice">${ICON.bulb}<span>${s.res.power < 25 ? 'Power is low. Wipe panels or switch to dim lights.' : s.res.food < 30 ? 'Food is low. Harvest or plant more.' : s.energy < 20 ? 'You are tired. Go and rest.' : 'Looking steady. Keep an eye on the arrows.'}</span></div>`;
    } else if (tab === 'build') {
      const avail = Object.entries(BUILDINGS).filter(([id, b]) => !s.buildings.includes(id) && s.stage >= b.stage);
      body = avail.length ? `<div class="optlist">${avail.map(([id, b]) => optCard(`build|${id}`, 'base', b.name, false, `${cost(ACTION_ENERGY.build)}${costRes(b.cost)}`, false, b.why)).join('')}</div>` : '<p class="why">Nothing to build right now. Reach the next stage to unlock more.</p>';
      if (s.buildings.length) body += `<h4>Built</h4><div class="row">${s.buildings.map(id => `<span class="tag emb">${esc(BUILDINGS[id].name)}</span>`).join('')}</div>`;
    } else if (tab === 'crew') {
      body = (Object.keys(CREW) as CrewId[]).map(id => { const c = s.crew[id]; return `<div class="crewrow">${crewPortrait(id)}<span><div class="nm">${esc(CREW[id].name)}</div><div class="hearts">${Array.from({ length: 5 }, (_, i) => `<span class="${i < Math.min(5, c.friendship) ? '' : 'off'}">♥</span>`).join('')}</div><div class="row">${moodChip(s, id)}</div></span><span></span></div>`; }).join('');
    } else if (tab === 'journal') body = `<div class="row"><button class="holo-btn small amber" data-do="journal">${ICON.doc} MY JOURNAL: PHOTOS, DIARY, NOTES, MAP</button><button class="holo-btn small" data-do="wiki">${ICON.doc} THE NASA WIKI</button></div><h4>Decisions and discoveries</h4>` + journalHtml(s);
    else {
      const sols = host.rewindable();
      body = `<div class="optlist">${optCard('rest', 'moon', 'Rest until morning', false, `${chip('moon', s.hour < 22 ? 'full energy' : 'less rest (late)', 'g')}`, false, 'Ends the Sol. Crops grow while you sleep.')}
        ${optCard('save', 'doc', 'Save game', false, '')}${optCard('menu', 'door', 'Main menu', false, '')}</div>
        <h4>Time Machine: go back to a morning</h4>${sols.length ? `<div class="row">${sols.slice(0, 24).map(n => `<button class="holo-btn small" data-do="rewind|${n}">Sol ${n}</button>`).join('')}</div>` : '<p class="why">No earlier Sols yet.</p>'}
        <p class="why">Rewinding changes your choices, not the weather or NASA events.</p>${host.branches() ? '<button class="holo-btn small amber" data-do="compare">Compare timelines</button>' : ''}`;
    }
    const tabs = TABS.filter(([k]) => !(s.ep && k === 'build')).map(([k, ic, n]) => `<button data-do="tab|${k}" aria-selected="${k === tab}">${ICON[ic]}${n}</button>`).join('');
    return `<div class="holo-panel">${head('gauge', 'Control Module')}<div class="panel-body"><div class="tabs">${tabs}</div>${body}</div></div>`;
  }, c => {
    if (c[0] === 'tab') tab = c[1];
    else if (c[0] === 'build') host.run('build', { building: c[1] });
    else if (c[0] === 'rest') { UI.close('control'); host.rest(); }
    else if (c[0] === 'save') host.save();
    else if (c[0] === 'menu') { UI.close('control'); host.menu(); }
    else if (c[0] === 'rewind') { UI.close('control'); host.rewind(Number(c[1])); }
    else if (c[0] === 'compare') { UI.close('control'); host.compare(); }
    else if (c[0] === 'wiki') openWiki();
    else if (c[0] === 'journal') openJournal(() => host.state(), () => host.save());
  });
}
export { $ };
