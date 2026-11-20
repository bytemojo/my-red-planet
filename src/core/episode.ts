// Episode 1 "The Storm": rules only (pure, no Phaser/DOM, unit-tested in tests/episode.test.ts).
// Sol 1 = prep day. Sols 2-4 = locked inside during a radiation storm that coincides with a regional dust storm.
// Sol 5 = clean up, then results. Every decision and its consequences are written to ep.tree for the debrief.
import { CREW_LIFE, EP } from './constants';
import { envForSol } from './env';
import { hash01 } from './rng';
import { scriptedAlert } from '../story/alert';
import { clamp, addLog } from './util';
import { teamMorale } from './crewlife';
import { gymNight, outsideDrainFactor } from './gym';
import { missedRounds, pumpRunning } from './watering';
import type { Alert, Env, EpisodeResult, EpisodeState, GameState, SystemId, TreeNode } from './types';

import { SYSTEMS } from './episode-systems';
import { ICE_COLLECTED, ICE_DELIVERED, ICE_OBJECTIVE, ICE_TASKS, WATER_MAKER_OFF } from './icerun';
import { DISH_BROKEN_FLAG, FAULT_FLAG, chooseDish, dishChoice, raiseDish, waterLossPerNight, type DishBranch } from './dish';
export { SYSTEMS };
export const SYSTEM_NAME: Record<SystemId, string> = { air: 'air', water: 'water', plants: 'plants', comms: 'comms', solar: 'solar panels' };
// The storm in this episode is modelled on a real flare in NASA's DONKI catalogue (verified 2026-11-14, see docs/NASA_SOURCES.md).
export const ARCHIVED_SUN = { source: 'archived' as const, flrID: '2024-10-03T12:08:00-FLR-001', classType: 'X9.0', date: '2024-10-03' };

export function newEpisodeState(sun: EpisodeState['sun'] = ARCHIVED_SUN, quick = false): EpisodeState {
  return {
    id: 'storm', phase: quick ? 'prep' : 'call', checked: quick ? [...SYSTEMS] : [], call: quick ? 'answered' : 'ringing',
    stormCall: null, panelsStowed: false, panelDamage: 0, shield: null, wateringFixed: false, panelsCleaned: false,
    tree: [], result: null, passOuts: 0, sun, quick,
  };
}

// ---------- environment (pure function of the Sol number; rewind never changes it) ----------
export const isStormSol = (sol: number) => EP.STORM_SOLS.includes(sol);
export function episodeEnv(sol: number): Env {
  const dust = sol <= 1 ? 0.3 : sol === 2 ? 0.9 : sol === 3 ? 0.8 : sol === 4 ? 0.6 : 0.25;
  return { sol, dust, tempC: isStormSol(sol) ? -48 : -62, windMs: isStormSol(sol) ? 22 : 8, flare: null, globalStorm: false };
}
export const envFor = (s: GameState): Env => (s.ep ? episodeEnv(s.sol) : envForSol(s.sol));

// Space-weather alert (Step 16c): comes ONLY from the authored table in src/story/alert.ts. It never reads live NASA data.
export const alertLevel = (sol: number, hour: number): Alert => scriptedAlert(sol, hour);
export const alertFor = (s: GameState): Alert => (s.ep ? scriptedAlert(s.sol, s.hour) : 'low');
export const ALERT_LABEL: Record<Alert, string> = { low: 'LOW', elevated: 'ELEVATED', high: 'HIGH', storm: 'STORM' };

// ---------- mission diary (auto journal entries, first person, no dates or Sol numbers) ----------
export const DIARY_LEARN: Record<string, string> = { call: 'hebrus', checks: 'water_recycling', storm_call: 'mars_dust', dish: 'comms_delay', storm_over: 'space_radiation', panels: 'nuclear_power', watering: 'space_crops', water_off: 'water_recycling', done: 'donki_live' };
export function diary(s: GameState, key: string, text: string): void {
  const id = `diary:${key}`;
  if (s.journal.some(j => j.id === id)) return; // exactly one entry per objective
  s.journal.push({ id, sol: s.sol, title: 'Mission diary', happened: text, decision: '', why: '', science: '', learnId: DIARY_LEARN[key], realData: false, kind: 'mission' });
}

// ---------- the decision tree ----------
export function addNode(s: GameState, n: Omit<TreeNode, 'id' | 'sol'>): string {
  const ep = s.ep!; const id = `n${ep.tree.length + 1}`;
  ep.tree.push({ id, sol: s.sol, ...n });
  return id;
}
// The most recent decision of a kind (e.g. the panel decision that was in force when the dust hit).
const lastTagged = (s: GameState, tag: TreeNode['tag']) => s.ep?.tree.filter(n => n.kind === 'choice' && n.tag === tag).at(-1)?.id;

// ---------- objectives ----------
export const lockedIn = (s: GameState) => s.ep?.phase === 'storm';
export function objective(s: GameState): { title: string; detail: string } {
  const ep = s.ep!;
  switch (ep.phase) {
    case 'call': return { title: 'TALK TO CAPTAIN REYES', detail: 'The intercom is ringing. Walk to it in the hallway outside the med bay and press E.' };
    case 'check': return { title: `CHECK ALL CORE SYSTEMS (${ep.checked.length}/5)`, detail: `Still to check: ${SYSTEMS.filter(x => !ep.checked.includes(x)).map(x => SYSTEM_NAME[x]).join(', ')}. The solar panels are outside, through the airlock.` };
    case 'prep': return { title: 'GET READY FOR THE STORM', detail: 'Water the plants and feed the crew. The storm arrives this evening.' };
    case 'storm': return { title: `SURVIVE THE STORM (SOL ${s.sol - 1} OF 3)`, detail: 'The airlock is sealed. Keep power up, water the plants, feed the crew, and exercise once or twice in the gym.' };
    case 'after': return { title: 'AFTER THE STORM', detail: `${ep.panelsCleaned ? '✓' : '•'} Clean the solar panels (outside)   ${ep.wateringFixed ? '✓' : '•'} Repair the watering system (farm pump)` };
    case 'ice': return { title: ICE_OBJECTIVE.title, detail: ICE_OBJECTIVE.detail };
    default: return { title: 'MISSION COMPLETE', detail: 'See your results.' };
  }
}

export interface ObjectiveTask { label: string; done: boolean }
/** A short, phase-specific checklist for the HUD disclosure. */
export function objectiveTasks(s: GameState): ObjectiveTask[] {
  const ep = s.ep!;
  const crops = s.plots.filter(p => p.crop);
  const watered = crops.length > 0 && crops.every(p => p.watered);
  const hungry = !s.flags.quarantine_over && Object.values(s.crew).some(c => c.hunger >= CREW_LIFE.HUNGRY_AT);
  switch (ep.phase) {
    case 'call': return [{ label: 'Answer Captain Reyes at the hallway intercom', done: ep.call === 'answered' }];
    case 'check': return SYSTEMS.map(sys => ({ label: `Check ${SYSTEM_NAME[sys]}`, done: ep.checked.includes(sys) }));
    case 'prep': return [
      { label: 'Water the crop beds by hand', done: ep.wateringFixed || watered },
      { label: 'Feed the crew', done: !hungry },
      { label: 'Make your panel plan when Reyes calls at 7 PM', done: !!ep.stormCall },
      ...(ep.stormCall === 'stow' ? [{ label: 'Pull the panel lever in the Control Module', done: ep.panelsStowed }] : []),
    ];
    case 'storm': return [
      { label: `Stay inside for storm Sol ${Math.min(3, s.sol - 1)} of 3`, done: !s.outside },
      { label: 'Water the crop beds by hand', done: ep.wateringFixed || watered },
      { label: 'Feed the crew before they get hungry', done: !hungry },
      { label: 'Sleep in the sleep pod in the Rec Room to advance the Sol', done: false },
    ];
    case 'after': return [
      ep.panelsStowed ? { label: 'Pull the panel lever to put the stowed panels out', done: false } : { label: 'Clean the solar panels outside', done: ep.panelsCleaned },
      { label: 'Repair the watering pump in the farm', done: ep.wateringFixed },
    ];
    case 'ice': return [{ label: ICE_TASKS[0], done: !!s.flags[ICE_COLLECTED] }, { label: ICE_TASKS[1], done: !!s.flags[ICE_DELIVERED] }];
    case 'done': return [{ label: 'Review your mission results', done: true }];
  }
}

export function checkSystem(s: GameState, sys: SystemId): boolean {
  const ep = s.ep; if (!ep || ep.checked.includes(sys) || (ep.phase !== 'check' && ep.phase !== 'prep' && ep.phase !== 'call')) return false;
  ep.checked.push(sys);
  if (ep.phase === 'check' && ep.checked.length === SYSTEMS.length) {
    ep.phase = 'prep';
    addNode(s, { kind: 'choice', text: 'You checked every core system before the storm.', tone: 'good', tag: 'check' });
    diary(s, 'checks', 'I checked every core system before the storm: air, water, plants, comms and the solar panels.');
    raiseDish(s);
  }
  return true;
}

// ---------- hourly tick (called from advance) ----------
// ---------- Step 11b: your own hunger ----------
export const playerHunger = (s: Pick<GameState, 'flags'>): number => Number(s.flags.player_hunger ?? EP.PLAYER_HUNGER_START);
/** Hunger rises every awake hour. Hungry = health drains slowly (never an instant failure; core/failure.ts needs a sustained critical state). Fed + inside = health slowly recovers. */
export function playerHungerTick(s: GameState, hours: number): void {
  const h = clamp(playerHunger(s) + EP.PLAYER_HUNGER_RATE * hours, 0, 100);
  s.flags.player_hunger = h;
  if (h >= EP.PLAYER_HUNGRY_AT) s.health = clamp(s.health - EP.HUNGER_HEALTH_DRAIN * hours, 0, 100);
  else if (h < EP.PLAYER_FED_AT && !s.outside) s.health = clamp(s.health + EP.FED_HEALTH_REGEN * hours, 0, 100);
}

export function episodeTick(s: GameState, hours: number): void {
  const ep = s.ep; if (!ep) return;
  playerHungerTick(s, hours);
  if (s.outside || s.airExposed) {
    if (!s.suitOn) s.health = clamp(s.health - EP.NO_SUIT_DRAIN * hours, 0, 100); // Step 8c: no instant pass-out; NO_SUIT fails at the critical threshold (core/failure.ts)
    else if (s.outside) {
      s.health = clamp(s.health - EP.HEALTH_DRAIN[alertFor(s)] * outsideDrainFactor(s.health) * hours, 0, 100);
      if (s.health <= 0) s.flags.tmp_passout = 'health';
    }
  }
  if (s.pending) return;
  if (raiseDish(s)) return; // quick start: all systems are pre-checked, so the fault shows on the first tick
  if (s.sol === 1 && s.hour >= EP.STORM_CALL_HOUR && ep.stormCall === null) { s.pending = { kind: 'event', id: 'storm_call' }; return; }
  if (ep.phase === 'storm' && s.res.power < 20 && !s.flags.tmp_power_fault) { s.flags.tmp_power_fault = true; s.pending = { kind: 'event', id: 'power_fault' }; }
}

// ---------- decisions (called from director.resolve) ----------
export function onResolve(s: GameState, kind: 'beat' | 'event', id: string, choice: string): void {
  const ep = s.ep; if (!ep) return;
  if (id === 'ep_call') { ep.phase = ep.checked.length >= SYSTEMS.length ? 'prep' : 'check'; diary(s, 'call', 'I answered Captain Reyes. The whole crew is sick, so the base is counting on me.'); return; }
  if (id === 'storm_call') {
    ep.stormCall = choice as EpisodeState['stormCall'];
    // Step 16a: the choice is only the PLAN. The panels move when the player pulls the lever (act 'panels'), never by themselves.
    const text = { stow: 'You stowed the solar panels before the dust hit.', out: 'You left the solar panels out to keep some power.', ask: 'You asked Earth what to do, so the panels stayed out while you waited.', wait: 'The timer ran out, so the panels stayed out.' }[choice] ?? '';
    addNode(s, { kind: 'choice', text, tone: choice === 'stow' ? 'mixed' : choice === 'out' ? 'mixed' : 'bad', tag: 'panels' });
    if (ep.phase !== 'storm') ep.phase = 'prep';
    diary(s, 'storm_call', { stow: 'I stowed the solar panels before the dust hit. They stayed safe, but the battery had to carry everything.', out: 'I left the solar panels out to keep some power coming in, even though the dust could bury them.', ask: 'I asked Earth what to do, but the answer was still travelling when the storm hit. Out here we decide for ourselves.', wait: 'I could not decide in time, so the panels stayed out in the dust.' }[choice] ?? 'I made the storm call.');
    return;
  }
  if (id === 'dish_decision') {
    if (choice !== 'comms' && choice !== 'dish') return;
    chooseDish(s, choice);
    addNode(s, { kind: 'choice', tag: 'dish', tone: 'mixed', text: choice === 'comms' ? 'Only one fault could be fixed before the storm: you chose the comms console. Earth stays in reach, but the water maker stays damaged.' : 'Only one fault could be fixed before the storm: you chose the dish and water-maker link. Water is restored, but comms stay unreliable.' });
    diary(s, 'dish', choice === 'comms' ? 'Reyes said we could only fix one fault before the storm. I chose the comms console, so we can still reach Earth, but water will be tight.' : 'Reyes said we could only fix one fault before the storm. I chose the dish and water-maker link, so we have water, but Earth will be hard to hear.');
    return;
  }
  if (id === 'radiation_peak') {
    ep.shield = choice as EpisodeState['shield'];
    const text = { water_wall: 'You pumped water into the walls as a radiation shield (cost water and power).', corner: 'Everyone slept squeezed into the shielded storage corner.', nothing: 'You did not add any shielding for the radiation peak.' }[choice] ?? '';
    addNode(s, { kind: 'choice', text, tone: choice === 'water_wall' ? 'good' : choice === 'corner' ? 'mixed' : 'bad', tag: 'shield' });
    return;
  }
  if (id === 'power_fault') {
    addNode(s, { kind: 'choice', text: choice === 'manual_air' ? 'Battery low: you ran the air maker by hand (cost energy).' : 'Battery low: you let the water maker sleep (cost water).', tone: 'mixed', cause: lastTagged(s, 'panels') });
    return;
  }
  if (id === 'missed_check') {
    const sys = missedSystem(s);
    if (choice === 'patch' && sys) {
      if (sys === 'air') s.res.o2 = clamp(s.res.o2 - 10, 0, 100);
      else if (sys === 'water') s.res.water = clamp(s.res.water - 10, 0, 100);
      else if (sys === 'plants') s.plots.forEach(p => { if (p.crop) p.health = clamp((p.health ?? 80) - 15, 0, 100); });
      else if (sys === 'solar') ep.panelDamage = clamp(ep.panelDamage + 0.1, 0, 1);
      else s.res.power = clamp(s.res.power - 8, 0, 100);
    }
    s.flags.missed_check_done = true;
    addNode(s, { kind: 'effect', text: `A ${sys ? SYSTEM_NAME[sys] : ''} fault nobody checked before the storm broke down. ${choice === 'fix' ? 'Fixing it cost you energy.' : 'Patching it cost supplies.'}`, tone: 'bad', cause: lastTagged(s, 'check') });
  }
}
export const missedSystem = (s: GameState): SystemId | undefined => SYSTEMS.find(x => !s.ep?.checked.includes(x));

// Player actions during the episode that are decisions worth recording.
export function togglePanels(s: GameState): string {
  const ep = s.ep!; ep.panelsStowed = !ep.panelsStowed;
  addNode(s, { kind: 'choice', text: ep.panelsStowed ? 'You stowed the panels during the storm.' : 'You put the panels back out during the storm.', tone: 'mixed', tag: 'panels' });
  return ep.panelsStowed ? 'Panels stowed: safe, but no solar power.' : 'Panels deployed: some power, but the dust can bury them.';
}

// ---------- end of a Sol (called from endSol BEFORE crops grow and before the Sol number changes) ----------
export function episodeNight(s: GameState): void {
  const ep = s.ep; if (!ep) return;
  s.flags.player_hunger = Math.max(playerHunger(s), CREW_LIFE.OVERNIGHT_HUNGER); // you wake up a little hungry too
  s.flags.ep_gym_msg = gymNight(s); // health from the day's workouts (core/gym.ts); shown in the morning report
  // plant health: water and light keep plants healthy
  for (const p of s.plots) {
    if (!p.crop) continue;
    // Step 15a: automatic = the pump keeps every bed watered; manual = each missed round (morning, evening) costs half a dry day
    const auto = pumpRunning(s);
    const missed = auto ? 0 : missedRounds(p);
    const watered = auto || missed === 0;
    p.health = clamp((p.health ?? 80) - missed * (EP.DRY_PLANT / 2) + (s.farm === 'off' ? -EP.LIGHTS_OFF_PLANT : watered ? EP.GROW_PLANT : 0), 0, 100);
    if (auto) p.watered = true;
  }
  if (s.sol === 1 && ep.checked.length < SYSTEMS.length) addNode(s, { kind: 'choice', text: `You skipped checking the ${SYSTEMS.filter(x => !ep.checked.includes(x)).map(x => SYSTEM_NAME[x]).join(', ')} before the storm.`, tone: 'bad', tag: 'check' });
  if (!isStormSol(s.sol)) return;
  const lost = waterLossPerNight(s);
  if (lost > 0) {
    s.res.water = clamp(s.res.water - lost, 0, 100);
    if (s.sol === 2) addNode(s, { kind: 'effect', tone: 'bad', cause: lastTagged(s, 'dish'), text: 'The water maker stayed damaged because you fixed the comms console first. Water ran lower each night.' });
  } else if (dishChoice(s) === 'dish' && s.sol === 2 && s.flags.broken_comms) addNode(s, { kind: 'effect', tone: 'mixed', cause: lastTagged(s, 'dish'), text: 'The comms console stayed broken because you fixed the dish first. Messages from Earth came in as static, and late.' });
  const callId = lastTagged(s, 'panels');
  // the dust storm at night: panels left out get buried
  const bury = EP.BURY[s.sol] ?? 0;
  if (!ep.panelsStowed && bury > 0) {
    ep.panelDamage = clamp(ep.panelDamage + bury, 0, 1);
    addNode(s, { kind: 'effect', text: `Dust buried the panels overnight: solar power down to ${Math.round((1 - ep.panelDamage) * 100)}% until they are dug out.`, tone: 'bad', cause: callId });
  } else if (ep.panelsStowed && s.sol === 2) {
    addNode(s, { kind: 'effect', text: 'The stowed panels came through the worst night safely, but made no power.', tone: 'mixed', cause: callId });
  }
  // the radiation peak (night of Sol 2)
  if (s.sol === 2) {
    const shieldId = lastTagged(s, 'shield');
    for (const c of Object.values(s.crew)) c.morale = clamp(c.morale + (ep.shield === 'water_wall' ? 4 : ep.shield === 'corner' ? -8 : -15), 0, 100);
    if (ep.shield === 'nothing' || ep.shield === null) s.health = clamp(s.health - 25, 0, 100);
    addNode(s, { kind: 'effect', tone: ep.shield === 'water_wall' ? 'good' : ep.shield === 'corner' ? 'mixed' : 'bad', cause: shieldId,
      text: ep.shield === 'water_wall' ? 'The water walls blocked the radiation peak. Everyone slept safely.' : ep.shield === 'corner' ? 'The crew was safe in the corner, but tired and grumpy.' : 'The radiation peak hit the quarters. Your health and the crew\'s mood dropped.' });
  }
  if (s.res.power <= 1) addNode(s, { kind: 'effect', text: 'The battery ran flat during the storm. The habitat went dark.', tone: 'bad', cause: callId });
}

// ---------- start of a Sol (called from endSol AFTER the Sol number changes) ----------
export function episodeMorning(s: GameState): void {
  const ep = s.ep; if (!ep) return;
  if (isStormSol(s.sol)) { ep.phase = 'storm'; s.suitOn = false; }
  else if (s.sol >= EP.AFTER_SOL && ep.phase === 'storm') {
    ep.phase = 'after';
    diary(s, 'storm_over', 'I got through three days of storm without stepping outside. I handled my first solar storm.');
    // Step 16b: nothing unfolds by itself. Stowed panels wait for the lever; panels left out must be dug out and cleaned by hand.
    addNode(s, { kind: 'effect', text: ep.panelsStowed ? 'The storm cleared. The panels are still folded away: pull the lever to put them out.' : 'The storm cleared. The panels you left out are covered in dust and need cleaning by hand.', tone: 'mixed' });
  }
}

/** Called when the ONE critical fault has been repaired (comms console for branch A, dish for branch B). */
export function onFaultRepaired(s: GameState, branch: DishBranch): void {
  s.flags[FAULT_FLAG] = 1;
  if (branch === 'dish') s.flags[DISH_BROKEN_FLAG] = 0;
  if (!s.ep) return;
  addNode(s, { kind: 'choice', tone: 'good', cause: lastTagged(s, 'dish'), text: branch === 'comms' ? 'You repaired the comms console by hand.' : 'You repaired the dish by hand.' });
}

// ---------- after the storm ----------
export function afterStormAction(s: GameState, what: 'clean' | 'water'): { ok: boolean; msg: string; energy: number; power: number } {
  const ep = s.ep!;
  if (what === 'water') { ep.wateringFixed = true; s.wateringMode = 'automatic'; addNode(s, { kind: 'choice', text: 'You repaired the automatic watering system.', tone: 'good' }); diary(s, 'watering', 'I fixed the watering pump. The plants can drink on their own again.'); }
  else {
    const buried = ep.panelDamage > 0;
    ep.panelsCleaned = true; s.panelDust = 0;
    const scar = Math.round(ep.panelDamage * EP.SCAR * 100) / 100;
    addNode(s, { kind: buried ? 'effect' : 'choice', tone: buried ? 'bad' : 'good', cause: buried ? ep.tree.filter(n => n.text.startsWith('Dust buried')).at(-1)?.id : undefined,
      text: buried ? `You dug the buried panels out (extra work), but some were scratched for good: ${Math.round(scar * 100)}% less solar power from now on.` : 'You cleaned the solar panels. Full sunshine again.' });
    diary(s, 'panels', buried ? 'I dug the buried solar panels out of the dust. Some were scratched for good, so we will have a little less power from now on.' : 'I cleaned the solar panels and the power came back.');
    ep.panelDamage = scar;
  }
  maybeFinish(s);
  return { ok: true, msg: what === 'water' ? 'Watering system repaired.' : 'Solar panels cleaned.', energy: 0, power: 0 };
}
/** Step 16b: deploying stowed panels at the lever after the storm. Clean panels: power returns with no dust damage. Panels stowed too late may still be buried: those need digging out. */
export function deployAfterStorm(s: GameState): string {
  const ep = s.ep!; ep.panelsStowed = false;
  if (ep.panelDamage > 0) { addNode(s, { kind: 'choice', tone: 'mixed', text: 'You put the panels out, but dust had already buried some. Go outside and dig them out.' }); return 'Panels out. Some are buried: dig them out outside.'; }
  ep.panelsCleaned = true; s.panelDust = 0;
  addNode(s, { kind: 'choice', tone: 'good', text: 'You put the stowed panels back out. They were safe, so there is no dust damage and the power is back.' });
  diary(s, 'panels', 'I put the folded solar panels back out with the lever. They were safe from the dust, so the power came back.');
  maybeFinish(s); return 'Panels out: power is back, no dust damage.';
}
export function maybeFinish(s: GameState): boolean {
  const ep = s.ep!;
  if (ep.phase !== 'after' || !ep.wateringFixed || !ep.panelsCleaned) return false;
  // Step 21a: the clean-up no longer ends the episode. The water maker shuts down and the ice run starts.
  ep.phase = 'ice'; s.flags[WATER_MAKER_OFF] = 1;
  addNode(s, { kind: 'effect', tone: 'bad', text: 'The water maker shut down. Reyes asked you to collect emergency water from the candidate ice sheet.' });
  diary(s, 'water_off', 'The water maker shut down on its own. I need to bring emergency water from the candidate ice sheet.');
  addLog(s, 'WATER', 'The water maker is OFF. Emergency water needed.');
  if (!s.pending) s.pending = { kind: 'event', id: 'water_shutdown' };
  return false;
}
/** The ice container was delivered to the water-maker intake (Step 21b calls this at the animation beat). Ends the episode. */
export function deliverIce(s: GameState): boolean {
  const ep = s.ep; if (!ep || ep.phase !== 'ice') return false;
  s.flags[ICE_DELIVERED] = 1; s.flags[WATER_MAKER_OFF] = 0; s.res.water = clamp(s.res.water + EP.ICE_WATER, 0, 100);
  addNode(s, { kind: 'choice', tone: 'good', text: 'You brought emergency water back from the candidate ice sheet. The water maker is running again.' });
  ep.phase = 'done'; ep.result = computeResult(s);
  diary(s, 'done', 'Mission complete. I kept the base running through the storm, and the crew is getting better.');
  addLog(s, 'MISSION', 'Episode 1 complete.');
  return true;
}

// ---------- scoring ----------
export function plantHealth(s: GameState): number {
  const ps = s.plots.filter(p => p.crop); if (!ps.length) return 0;
  return Math.round(ps.reduce((a, p) => a + (p.health ?? 80), 0) / ps.length);
}
// Base energy = half battery charge + half solar-panel health (permanent scratches from burial count against you).
export const baseEnergy = (s: GameState) => Math.round(0.5 * s.res.power + 50 * (1 - (s.ep?.panelDamage ?? 0)));
export function computeResult(s: GameState): EpisodeResult {
  const morale = teamMorale(s), power = baseEnergy(s), plants = plantHealth(s), health = Math.round(s.health);
  const score = Math.round(0.4 * morale + 0.3 * power + 0.3 * plants);
  const stars = score >= 70 ? 3 : score >= 45 ? 2 : 1;
  const parts: [string, number, string, string][] = [
    ['morale', morale, 'You kept the crew cheerful.', 'Talk to the crew every Sol and feed them before they get hungry.'],
    ['power', power, 'You kept the base energy healthy.', 'Stow the panels before the dust peak, and switch lights off when the battery is low.'],
    ['plants', plants, 'Your plants stayed healthy.', 'Water every bed every Sol. Plants need light too.'],
  ];
  const sorted = [...parts].sort((a, b) => b[1] - a[1]);
  return { morale, power, plants, health, score, stars, best: sorted[0][2], tip: sorted[2][3] };
}
