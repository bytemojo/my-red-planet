import { ICON } from './icons';
import { $, UI, bindLearning, clamp, chip, esc, head, journalHtml, optCard, overlay, pips, vbar, levelClass } from './ui';
import { sfx } from './audio';
import { arrows } from './hud';
import { ACTION_ENERGY, BUILDINGS, CAVE_MAX, CROPS, FARM, LS } from '../core/constants';
import { rates, solarEfficiency } from '../core/sim';
import { envForSol } from '../core/env';
import { CREW } from '../story/crew';
import type { ActionName } from '../core/constants';
import type { CrewId, CropId, GameState } from '../core/types';

// What the panels need from the game. WorldScene implements this.
export interface Host {
  state(): GameState;
  run(name: ActionName, arg?: Record<string, string>): void;       // does the action, toasts, effects, pending beats
  set(what: 'farm' | 'ls', value: string): void;
  rest(): void; rewind(sol: number): void; compare(): void; save(): void; menu(): void;
  branches(): number; rewindable(): number[];
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
      return `<div class="srow ${ready ? '' : ''}"><span class="vi">${ICON.farm}</span><span><b>Bed ${i + 1}: ${CROPS[p.crop].name}</b><div class="sbar"><i class="en ${ready ? 'g' : 'b'}" style="width:${clamp(p.growth / need, 0, 1) * 100}%"></i></div></span>${btn}</div>`;
    }).join('');
    const lights = (['bright', 'dim'] as const).map(k => optCard(`lights|${k}`, k === 'bright' ? 'sun' : 'sundim', FARM[k].name, s.farm === k,
      `${chip('power', `−${FARM[k].power}/h`, 'b')}${chip('water', `−${FARM[k].water}/h`, 'b')}${chip('farm', `grows ×${FARM[k].growth}`, 'g')}`, false, FARM[k].why)).join('');
    return `<div class="holo-panel">${head('farm', 'Indoor Farm')}<div class="panel-body"><div class="legend">${cost(ACTION_ENERGY.plant)} plant · ${cost(ACTION_ENERGY.water)} water · ${cost(ACTION_ENERGY.harvest)} harvest · your energy</div>${beds}<h4>Grow-lights</h4><div class="optlist">${lights}</div></div></div>`;
  }, c => {
    if (c[0] === 'choose') choosing = c[1]; else if (c[0] === 'cancel') choosing = null;
    else if (c[0] === 'plant') { host.run('plant', { plot: c[1], crop: c[2] }); choosing = null; }
    else if (c[0] === 'water') host.run('water', { plot: c[1] });
    else if (c[0] === 'harvest') host.run('harvest', { plot: c[1] });
    else if (c[0] === 'lights') host.set('farm', c[1]);
  });
}

// ---------- Air & Water ----------
export function openLs(host: Host) {
  panel('inspect', host, () => {
    const s = host.state(), r = rates(s);
    const cards = (Object.keys(LS) as (keyof typeof LS)[]).map(k => optCard(`ls|${k}`, 'ls', LS[k].name, s.ls === k,
      `${chip('o2', `air ${LS[k].ox >= 0.8 ? '▲▲' : LS[k].ox >= 0.4 ? '▲' : '▼'}`, LS[k].ox >= 0.4 ? 'g' : 'b')}${chip('water', `water ${LS[k].ox <= 0.2 ? '▲▲' : LS[k].ox <= 0.5 ? '▲' : '▼'}`, LS[k].ox <= 0.5 ? 'g' : 'b')}`, false, LS[k].why)).join('');
    const a1 = arrows(r.o2), a2 = arrows(r.water);
    return `<div class="holo-panel">${head('ls', 'Air & Water Maker')}<div class="panel-body"><p class="why">All the power you have must be shared. Pick where it goes.</p>
      ${vbar('o2', s.res.o2 / 100, levelClass(s.res.o2) === 'crit' ? 'r' : 'n', `<span class="rtrend ${a1.c}">${a1.t}</span>`)}${vbar('water', s.res.water / 100, levelClass(s.res.water) === 'crit' ? 'r' : 'n', `<span class="rtrend ${a2.c}">${a2.t}</span>`)}
      <div class="optlist cols3">${cards}</div>${s.buildings.includes('recycler') ? '<div class="fact">' + ICON.ls + '<span>The Water Recycler is saving you water.</span></div>' : ''}</div></div>`;
  }, c => { if (c[0] === 'ls') host.set('ls', c[1]); });
}

// ---------- Comms / Earth ----------
export function openComms(host: Host) {
  panel('inspect', host, () => {
    const s = host.state(), enRoute = s.shipmentArrivesSol > s.sol;
    return `<div class="holo-panel">${head('dish', 'Comms Link')}<div class="panel-body">
      <div class="link"><span class="planet"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="#2f7be0"/><path d="M16 22c6-7 13-5 15 2s-6 8-8 14-10-2-7-16z" fill="#4dbb6a"/></svg></span><div class="track ${enRoute ? 'pend' : 'ok'}"><i style="width:100%"></i></div><span class="planet"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="#c1502e"/><circle cx="22" cy="24" r="5" fill="#9a3a20"/><circle cx="40" cy="40" r="7" fill="#9a3a20"/></svg></span></div>
      <p class="why">A radio message takes about 3 to 22 minutes each way. Supplies take a whole Sol. Earth cannot rescue you quickly.</p>
      ${vbar('earth', clamp(s.solsSinceShipment / 10, 0, 1), 'g', `${s.solsSinceShipment}/10 Sols`)}
      <div class="optlist">${optCard('ship', 'door', enRoute ? 'Shipment on its way' : 'Request supply shipment', false, `${cost(ACTION_ENERGY.request_shipment)}${chip('hourglass', 'lands tomorrow', 'n')}${chip('earth', 'resets your streak', 'r')}`, enRoute, 'A safety net. But the goal is to need Earth less.')}</div></div></div>`;
  }, c => { if (c[0] === 'ship') host.run('request_shipment'); });
}

// ---------- Solar ----------
export function openSolar(host: Host) {
  panel('inspect', host, () => {
    const s = host.state(), env = envForSol(s.sol), eff = solarEfficiency(s, env);
    return `<div class="holo-panel">${head('panel', 'Solar Farm')}<div class="panel-body">
      ${vbar('dust', s.panelDust, s.panelDust > 0.6 ? 'r' : s.panelDust > 0.3 ? 'b' : 'g', `${Math.round(s.panelDust * 100)}% dusty`)}${vbar('sun', clamp(eff, 0, 1), eff < 0.35 ? 'r' : 'g', `${Math.round(eff * 100)}% output`)}
      <p class="why">Dust blocks sunlight and builds up every Sol. Wipe the panels to get your power back.</p>
      <div class="optlist">${optCard('clean', 'sparkle', 'Wipe the panels', false, `${cost(ACTION_ENERGY.clean_panels)}${chip('power', 'more power', 'g')}`, false, 'Takes real effort, so choose when to do it.')}</div></div></div>`;
  }, c => { if (c[0] === 'clean') host.run('clean_panels'); });
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
export function openCrew(host: Host) {
  panel('inspect', host, () => {
    const s = host.state(), over = !!s.flags.quarantine_over;
    const rows = (Object.keys(CREW) as CrewId[]).map(id => {
      const c = s.crew[id], hearts = Array.from({ length: 5 }, (_, i) => `<span class="${i < Math.min(5, c.friendship) ? '' : 'off'}">♥</span>`).join('');
      return `<div class="crewrow"><span class="face">🧑‍🚀</span><span><div class="nm">${esc(CREW[id].name)}</div><div class="why">${esc(CREW[id].role)}. ${esc(CREW[id].blurb)}</div><div class="hearts">${hearts}</div></span><button class="holo-btn small" data-do="talk|${id}">Talk</button></div>`;
    }).join('');
    return `<div class="holo-panel">${head('crew', over ? 'Crew Quarters' : 'Sick Bay Intercom')}<div class="panel-body"><p class="why">${over ? 'The crew is well again.' : 'Everyone is quarantined. You can talk over the intercom.'} Talking costs ${ACTION_ENERGY.talk} energy. Friends remember how you treat them.</p>${rows}</div></div>`;
  }, c => { if (c[0] === 'talk') host.run('talk', { crew: c[1] }); });
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
      body = (Object.keys(CREW) as CrewId[]).map(id => { const c = s.crew[id]; return `<div class="crewrow"><span class="face">🧑‍🚀</span><span><div class="nm">${esc(CREW[id].name)}</div><div class="hearts">${Array.from({ length: 5 }, (_, i) => `<span class="${i < Math.min(5, c.friendship) ? '' : 'off'}">♥</span>`).join('')}</div></span><span></span></div>`; }).join('');
    } else if (tab === 'journal') body = journalHtml(s);
    else {
      const sols = host.rewindable();
      body = `<div class="optlist">${optCard('rest', 'moon', 'Rest until morning', false, `${chip('moon', s.hour < 22 ? 'full energy' : 'less rest (late)', 'g')}`, false, 'Ends the Sol. Crops grow while you sleep.')}
        ${optCard('save', 'doc', 'Save game', false, '')}${optCard('menu', 'door', 'Main menu', false, '')}</div>
        <h4>Time Machine: go back to a morning</h4>${sols.length ? `<div class="row">${sols.slice(0, 24).map(n => `<button class="holo-btn small" data-do="rewind|${n}">Sol ${n}</button>`).join('')}</div>` : '<p class="why">No earlier Sols yet.</p>'}
        <p class="why">Rewinding changes your choices, not the weather or NASA events.</p>${host.branches() ? '<button class="holo-btn small amber" data-do="compare">Compare timelines</button>' : ''}`;
    }
    const tabs = TABS.map(([k, ic, n]) => `<button data-do="tab|${k}" aria-selected="${k === tab}">${ICON[ic]}${n}</button>`).join('');
    return `<div class="holo-panel">${head('gauge', 'Control Module')}<div class="panel-body"><div class="tabs">${tabs}</div>${body}</div></div>`;
  }, c => {
    if (c[0] === 'tab') tab = c[1];
    else if (c[0] === 'build') host.run('build', { building: c[1] });
    else if (c[0] === 'rest') { UI.close('control'); host.rest(); }
    else if (c[0] === 'save') host.save();
    else if (c[0] === 'menu') { UI.close('control'); host.menu(); }
    else if (c[0] === 'rewind') { UI.close('control'); host.rewind(Number(c[1])); }
    else if (c[0] === 'compare') { UI.close('control'); host.compare(); }
  });
}
export { $ };
