import { ACTION_ENERGY, BUILDINGS, CAVE_MAX, CROPS, DAY_END, DAY_START, FARM, K, LS, SELF_SUFFICIENT_GOAL, STAGES, ActionName } from './constants';
import { envForSol, forecastLabel } from './env';
import { clamp, caveTotal, flagNum, hasBuilding, addLog } from './util';
import { poll, rollEvent } from './director';
import { talkLine } from '../story/crew';
import { unlockDiscovery } from '../story/discoveries';
import { CAVERN_NEEDED } from './constants';
import type { CropId, CrewId, DailyReport, Env, GameState, Plot, ResKey } from './types';

// NOTE: functions here MUTATE the GameState you pass in. State is plain JSON; clone with JSON.parse(JSON.stringify()).
export function newGame(seed = 1): GameState {
  const plots: Plot[] = ['p0', 'p1', 'p2', 'p3'].map(id => ({ id, crop: null, growth: 0, watered: false }));
  const crew = { reyes: { friendship: 0, met: false }, aiko: { friendship: 0, met: false }, david: { friendship: 0, met: false }, sofia: { friendship: 0, met: false } };
  const s: GameState = {
    version: 1, seed, sol: 1, hour: DAY_START, energy: 100,
    res: { o2: 78, food: 72, water: 66, power: 80 }, suit: 100, rad: 100, outside: false,
    farm: 'dim', ls: 'bal', panelDust: 0.1, plots, buildings: [], stage: 1, crew, flags: {},
    seenBeats: [], discovered: [], pending: null, lastEventSol: 0,
    cave: { explore: 0, excavate: 0, pressurize: 0, shield: 0 },
    solsSinceShipment: 0, bestSelfSufficient: 0, shipmentArrivesSol: 0, campaignComplete: false,
    decisions: [], journal: [], history: [], log: [], lastReport: null, failed: null,
  };
  poll(s);
  return s;
}

// ---------- power and rates ----------
export function solarEfficiency(s: GameState, env: Env): number {
  const base = K.SOLAR_BASE_EFF + (hasBuilding(s, 'solar_2') ? 0.15 : 0);
  return base * (1 - 0.45 * s.panelDust) * (1 - 0.5 * env.dust);
}
export function solarGen(s: GameState, env: Env, hour = s.hour): number {
  const sun = hour >= 6 && hour <= 18 ? Math.sin((Math.PI * (hour - 6)) / 12) : 0;
  return K.SOLAR_PEAK * solarEfficiency(s, env) * sun;
}
export interface Rates { gen: number; load: number; on: boolean; power: number; o2: number; water: number; food: number }
export function rates(s: GameState, env: Env = envForSol(s.sol)): Rates {
  const f = FARM[s.farm], l = LS[s.ls];
  const gen = solarGen(s, env);
  const load = K.BASE_POWER + f.power + K.LS_POWER + K.COMMS_POWER + (s.flags.tmp_heating ? 0.8 : 0);
  const on = s.res.power > 0.01 || gen >= load;
  const waterUse = K.WATER_USE * (hasBuilding(s, 'recycler') ? 0.7 : 1);
  return {
    gen, load, on, power: gen - load,
    o2: -K.O2_USE + (on ? K.OXMAX * l.ox : 0),
    water: -waterUse + (on ? -f.water + K.WMAX * (1 - l.ox) : 0),
    food: -K.FOOD_USE,
  };
}

export interface AdvanceResult { dayOver: boolean; blackout: boolean }
// Move the clock forward. Call from the game loop with small dt (hours).
export function advance(s: GameState, dtHours: number): AdvanceResult {
  const out: AdvanceResult = { dayOver: false, blackout: false };
  let left = dtHours;
  while (left > 1e-6 && !out.dayOver) {
    const step = Math.min(0.25, left);
    left -= step;
    const env = envForSol(s.sol);
    const r = rates(s, env);
    (['o2', 'water', 'food'] as ResKey[]).forEach(k => { s.res[k] = clamp(s.res[k] + r[k] * step, 0, 100); });
    s.res.power = clamp(s.res.power + r.power * step, 0, 100);
    if (s.outside) {
      s.suit = clamp(s.suit - K.SUIT_USE * step, 0, 100);
      const mult = env.flare && !s.flags.tmp_delay_outdoor ? env.flare.mult : 1;
      const shield = hasBuilding(s, 'shelter') ? 0.5 : 1;
      s.rad = clamp(s.rad - K.RAD_USE * mult * shield * step, 0, 100);
      if (s.suit <= 0) { blackout(s); out.blackout = true; }
    } else {
      s.suit = clamp(s.suit + K.SUIT_REFILL * step, 0, 100);
    }
    s.hour += step;
    if (!s.failed && !s.flags.tmp_failed_snooze) for (const k of ['o2', 'water', 'food'] as ResKey[]) if (s.res[k] <= 0) { s.failed = k; break; }
    if (s.hour >= DAY_END) { s.hour = DAY_END; out.dayOver = true; }
  }
  return out;
}

// Suit blackout consequence: you are towed in, lose energy, power and time.
function blackout(s: GameState): void {
  s.suit = 40; s.outside = false; s.energy = Math.max(0, s.energy - 30);
  s.res.power = clamp(s.res.power - 8, 0, 100);
  s.hour = Math.min(DAY_END - 0.5, s.hour + 3);
  s.flags.blackouts = flagNum(s, 'blackouts') + 1;
  addLog(s, 'SUIT', 'Suit air ran out! You were towed back inside and lost time and energy.');
}

// Emergency fallback when something hits zero: Earth sends supplies, but self-sufficiency resets.
export function emergencyShipment(s: GameState): void {
  for (const k of ['o2', 'water', 'food', 'power'] as ResKey[]) s.res[k] = clamp(s.res[k] + 35, 0, 100);
  s.failed = null; s.solsSinceShipment = 0;
  s.flags.shipments = flagNum(s, 'shipments') + 1;
  addLog(s, 'EARTH', 'Emergency supplies arrived. Your self-sufficiency streak starts over.');
}

// ---------- progression ----------
const stageDone: Record<number, (s: GameState) => boolean> = {
  1: s => !!s.flags.first_harvest,
  2: s => hasBuilding(s, 'greenhouse_2'),
  3: s => hasBuilding(s, 'solar_2') && hasBuilding(s, 'recycler'),
  4: s => flagNum(s, 'trips') >= 2,
  5: s => caveTotal(s) >= CAVERN_NEEDED && s.cave.explore > 0 && s.cave.excavate > 0 && s.cave.pressurize > 0 && s.cave.shield > 0,
  6: s => s.solsSinceShipment >= SELF_SUFFICIENT_GOAL,
};
export function checkProgress(s: GameState): void {
  s.bestSelfSufficient = Math.max(s.bestSelfSufficient, s.solsSinceShipment);
  while (!s.campaignComplete && stageDone[s.stage]?.(s)) {
    const finished = STAGES[s.stage - 1];
    s.journal.push({ id: `mission:${finished.id}`, sol: s.sol, title: `${finished.title} complete`, happened: `You completed this mission: ${finished.objective}`, decision: 'You kept the colony moving forward.', why: 'Each mission builds a skill needed for a sustainable colony.', science: 'Open the magnifying glass only if you want to learn more.', learnId: finished.learnId, realData: false, kind: 'mission' });
    if (s.stage === 6) { s.campaignComplete = true; addLog(s, 'MISSION', 'Campaign complete! Keep building in sandbox mode.'); break; }
    s.stage += 1;
    addLog(s, 'MISSION', `Stage ${s.stage}: ${STAGES[s.stage - 1].title}`);
  }
  poll(s);
}

// ---------- end of day ----------
export function endSol(s: GameState): DailyReport {
  let grew = 0;
  for (const p of s.plots) {
    if (p.crop && p.watered) { p.growth += FARM[s.farm].growth; grew++; }
    p.watered = false;
  }
  const todayEnv = envForSol(s.sol);
  s.panelDust = clamp(s.panelDust + 0.02 + todayEnv.dust * 0.12, 0, 1);
  s.history.push({ sol: s.sol, res: { ...s.res }, decisions: s.decisions.filter(d => d.sol === s.sol).map(d => d.label), note: `${grew} plants grew` });
  const slept = s.hour < 22;
  const arrived = s.shipmentArrivesSol === s.sol + 1;
  s.sol += 1; s.hour = DAY_START; s.outside = false; s.suit = 100;
  s.energy = slept ? 100 : 80;
  s.rad = clamp(s.rad + 5, 0, 100);
  s.solsSinceShipment += 1;
  for (const k of Object.keys(s.flags)) if (k.startsWith('tmp_')) delete s.flags[k];
  if (arrived) { for (const k of ['o2', 'water', 'food', 'power'] as ResKey[]) s.res[k] = clamp(s.res[k] + 25, 0, 100); addLog(s, 'EARTH', 'The supply shipment from Earth has landed.'); }
  checkProgress(s);
  rollEvent(s);
  poll(s);

  const env = envForSol(s.sol), tomorrow = envForSol(s.sol + 1);
  const ready = s.plots.filter(p => p.crop && p.growth >= CROPS[p.crop].sols).length;
  const lines: string[] = [];
  if (grew) lines.push(`${grew} greenhouse plant${grew > 1 ? 's' : ''} grew overnight.`);
  if (ready) lines.push(`${ready} crop${ready > 1 ? 's are' : ' is'} ready to harvest.`);
  if (arrived) lines.push('A supply shipment from Earth has landed.');
  if (env.flare || env.dust > 0.55 || env.windMs >= 18 || env.tempC <= -75) lines.push(`${forecastLabel(env)} is here today.`);
  else if (tomorrow.flare || tomorrow.dust > 0.55) lines.push(`${forecastLabel(tomorrow)} is approaching.`);
  if (s.panelDust > 0.5) lines.push('The solar panels are getting dusty.');
  if (s.pending) lines.push(s.pending.kind === 'beat' ? 'A crew member wants to talk to you.' : 'Something has come up that needs a decision.');
  if (!lines.length) lines.push('A quiet night on Mars. Everything is steady.');
  s.lastReport = { sol: s.sol, lines, mission: STAGES[s.stage - 1].objective };
  return s.lastReport;
}

// ---------- player actions ----------
export interface ActionResult { ok: boolean; msg: string }
const fail = (msg: string): ActionResult => ({ ok: false, msg });
const done = (msg: string): ActionResult => ({ ok: true, msg });

export function act(s: GameState, name: ActionName, arg?: { plot?: string; crop?: CropId; crew?: CrewId; building?: string; verb?: string }): ActionResult {
  const cost = ACTION_ENERGY[name];
  const env = envForSol(s.sol);
  if (s.pending) return fail('Finish the conversation first.');
  if (s.energy < cost) return fail('Too tired. Sleep to refill your energy.');
  const outdoorBlocked = s.flags.tmp_delay_outdoor && ['clean_panels', 'explore', 'cave_explore', 'cave_excavate', 'cave_pressurize', 'cave_shield'].includes(name);
  if (outdoorBlocked) return fail('You decided to stay inside today.');
  const spend = () => { s.energy -= cost; };

  switch (name) {
    case 'plant': {
      const p = s.plots.find(x => x.id === arg?.plot);
      if (!p || !arg?.crop) return fail('Pick a plot.');
      if (p.crop) return fail('Something is already growing here.');
      if (arg.crop === 'tomato' && !s.flags.tomato_unlocked) return fail('You do not have tomato seeds yet.');
      p.crop = arg.crop; p.growth = 0; p.watered = false; spend();
      if (!s.flags.crop_lesson) { s.flags.crop_lesson = true; s.journal.push({ id: 'lesson:crop-planning', sol: s.sol, title: 'Crop planning', happened: 'You planted your first crop.', decision: `In this game, ${CROPS[arg.crop].name.toLowerCase()} takes ${CROPS[arg.crop].sols} Sols and gives ${CROPS[arg.crop].food} food.`, why: 'Choose between quick food and a bigger later harvest.', science: 'Crop timings are game balance, not a NASA measurement.', learnId: 'space_crops', realData: false, kind: 'lesson' }); }
      return done(`Planted ${CROPS[arg.crop].name}.`);
    }
    case 'water': {
      const p = s.plots.find(x => x.id === arg?.plot);
      if (!p?.crop) return fail('Nothing to water here.');
      if (p.watered) return fail('Already watered today.');
      if (s.res.water < K.PLOT_WATER) return fail('Not enough water in the tank.');
      s.res.water -= K.PLOT_WATER; p.watered = true; spend();
      return done('Watered.');
    }
    case 'harvest': {
      const p = s.plots.find(x => x.id === arg?.plot);
      if (!p?.crop || p.growth < CROPS[p.crop].sols) return fail('Not ready yet.');
      const c = CROPS[p.crop];
      s.res.food = clamp(s.res.food + c.food, 0, 100);
      p.crop = null; p.growth = 0; p.watered = false; spend();
      s.flags.first_harvest = true;
      unlockDiscovery(s, 'perchlorates');
      checkProgress(s);
      return done(`Harvested ${c.name}: +${c.food} food.`);
    }
    case 'clean_panels':
      if (!s.outside) return fail('Panels are outside. Use the airlock.');
      s.panelDust = 0; spend(); checkProgress(s); return done('Panels are clean and shiny.');
    case 'talk': {
      if (!arg?.crew) return fail('Who?');
      const t = talkLine(s, arg.crew); spend(); checkProgress(s);
      return done(t.line);
    }
    case 'build': {
      const b = arg?.building ? BUILDINGS[arg.building] : undefined;
      if (!b || !arg?.building) return fail('Pick something to build.');
      if (s.flags.tmp_no_build) return fail('You postponed building today.');
      if (hasBuilding(s, arg.building)) return fail('Already built.');
      if (s.stage < b.stage) return fail('Not available yet.');
      for (const [k, v] of Object.entries(b.cost)) if (s.res[k as ResKey] < (v ?? 0)) return fail(`Not enough ${k === 'o2' ? 'air' : k}.`);
      for (const [k, v] of Object.entries(b.cost)) s.res[k as ResKey] -= v ?? 0;
      s.buildings.push(arg.building);
      if (arg.building === 'greenhouse_2') s.plots.push({ id: 'p4', crop: null, growth: 0, watered: false });
      spend(); checkProgress(s); return done(`Built: ${b.name}.`);
    }
    case 'explore': {
      if (!hasBuilding(s, 'rover_bay')) return fail('Repair the rover first.');
      const extra = env.windMs >= 18 ? 10 : 0;
      if (s.energy < cost + extra) return fail('Too tired for a windy trip.');
      s.energy -= cost + extra; s.res.power = clamp(s.res.power - 6, 0, 100);
      const trips = flagNum(s, 'trips') + 1; s.flags.trips = trips;
      const found = ['hellas_pressure', 'lava_tubes', 'hadriacus'][trips - 1];
      if (found) unlockDiscovery(s, found);
      checkProgress(s);
      return done(found ? 'Rover trip complete. You found something!' : 'Rover trip complete. Nothing new this time.');
    }
    case 'cave_explore': case 'cave_excavate': case 'cave_pressurize': case 'cave_shield': {
      if (!s.flags.cave_unlocked) return fail('You have not found the cave yet.');
      if (!s.outside) return fail('The cave is outside. Use the airlock.');
      const verb = name.slice(5) as 'explore' | 'excavate' | 'pressurize' | 'shield';
      if (s.cave[verb] >= CAVE_MAX) return fail('This part is finished.');
      const need: Record<string, Partial<Record<ResKey, number>>> = { explore: {}, excavate: { power: 10 }, pressurize: { o2: 10, power: 8 }, shield: { power: 6, water: 5 } };
      for (const [k, v] of Object.entries(need[verb])) if (s.res[k as ResKey] < (v ?? 0)) return fail(`Not enough ${k === 'o2' ? 'air' : k}.`);
      for (const [k, v] of Object.entries(need[verb])) s.res[k as ResKey] -= v ?? 0;
      s.cave[verb] += 1; spend();
      if (caveTotal(s) >= CAVERN_NEEDED) unlockDiscovery(s, 'cave_ice');
      checkProgress(s);
      return done(`Cave work done: ${verb}.`);
    }
    case 'request_shipment':
      if (s.shipmentArrivesSol > s.sol) return fail('A shipment is already on its way.');
      s.shipmentArrivesSol = s.sol + 1; s.solsSinceShipment = 0;
      s.flags.shipments = flagNum(s, 'shipments') + 1; spend();
      return done('Shipment requested. It lands tomorrow. Your self-sufficiency streak starts over.');
  }
}
