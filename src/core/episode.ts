// Episode 1 "The Storm": rules only (pure, no Phaser/DOM, unit-tested in tests/episode.test.ts).
// Sol 1 = prep day. Sols 2-4 = locked inside during a radiation storm that coincides with a regional dust storm.
// Sol 5 = clean up, then results. Every decision and its consequences are written to ep.tree for the debrief.
import { EP } from './constants';
import { envForSol } from './env';
import { hash01 } from './rng';
import { clamp, addLog } from './util';
import { teamMorale } from './crewlife';
import { gymNight, outsideDrainFactor } from './gym';
import type { Alert, Env, EpisodeResult, EpisodeState, GameState, SystemId, TreeNode } from './types';

export const SYSTEMS: SystemId[] = ['air', 'water', 'plants', 'comms', 'solar'];
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

// Space-weather alert (a game model inspired by the real DONKI flare). The flare class sets how bad the peak gets.
export function alertLevel(sol: number, hour: number, classType = 'X'): Alert {
  const top: Alert = classType.startsWith('X') ? 'storm' : classType.startsWith('M') ? 'high' : 'elevated';
  if (sol <= 1) return hour < 13 ? 'low' : hour < 17 ? 'elevated' : top === 'elevated' ? 'elevated' : 'high';
  if (isStormSol(sol)) return hash01(sol * 97 + Math.floor(hour)) > 0.55 && top !== 'high' ? top : top === 'elevated' ? 'elevated' : 'high';
  return 'low';
}
export const alertFor = (s: GameState): Alert => (s.ep ? alertLevel(s.sol, s.hour, s.ep.sun.classType) : 'low');
export const ALERT_LABEL: Record<Alert, string> = { low: 'LOW', elevated: 'ELEVATED', high: 'HIGH', storm: 'STORM' };

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
    case 'check': return { title: `CHECK ALL CORE SYSTEMS (${ep.checked.length}/5)`, detail: `Still to check: ${SYSTEMS.filter(x => !ep.checked.includes(x)).map(x => SYSTEM_NAME[x]).join(', ')}. The solar panels are outside: put on your suit at the rack first.` };
    case 'prep': return { title: 'GET READY FOR THE STORM', detail: 'Water the plants and feed the crew. The storm arrives this evening.' };
    case 'storm': return { title: `SURVIVE THE STORM (SOL ${s.sol - 1} OF 3)`, detail: 'The airlock is sealed. Keep power up, water the plants, feed the crew, and exercise once or twice in the gym.' };
    case 'after': return { title: 'AFTER THE STORM', detail: `${ep.panelsCleaned ? '✓' : '•'} Clean the solar panels (outside, suit on)   ${ep.wateringFixed ? '✓' : '•'} Repair the watering system (farm pump)` };
    default: return { title: 'MISSION COMPLETE', detail: 'See your results.' };
  }
}

export function checkSystem(s: GameState, sys: SystemId): boolean {
  const ep = s.ep; if (!ep || ep.checked.includes(sys) || (ep.phase !== 'check' && ep.phase !== 'prep' && ep.phase !== 'call')) return false;
  ep.checked.push(sys);
  if (ep.phase === 'check' && ep.checked.length === SYSTEMS.length) {
    ep.phase = 'prep';
    addNode(s, { kind: 'choice', text: 'You checked every core system before the storm.', tone: 'good', tag: 'check' });
  }
  return true;
}

// ---------- hourly tick (called from advance) ----------
export function episodeTick(s: GameState, hours: number): void {
  const ep = s.ep; if (!ep) return;
  if (s.outside) {
    if (!s.suitOn) { s.flags.tmp_passout = 'suit'; return; }
    s.health = clamp(s.health - EP.HEALTH_DRAIN[alertFor(s)] * outsideDrainFactor(s.health) * hours, 0, 100);
    if (s.health <= 0) s.flags.tmp_passout = 'health';
  }
  if (s.pending) return;
  if (s.sol === 1 && s.hour >= EP.STORM_CALL_HOUR && ep.stormCall === null) { s.pending = { kind: 'event', id: 'storm_call' }; return; }
  if (ep.phase === 'storm' && s.res.power < 20 && !s.flags.tmp_power_fault) { s.flags.tmp_power_fault = true; s.pending = { kind: 'event', id: 'power_fault' }; }
}

// ---------- decisions (called from director.resolve) ----------
export function onResolve(s: GameState, kind: 'beat' | 'event', id: string, choice: string): void {
  const ep = s.ep; if (!ep) return;
  if (id === 'ep_call') { ep.phase = ep.checked.length >= SYSTEMS.length ? 'prep' : 'check'; return; }
  if (id === 'storm_call') {
    ep.stormCall = choice as EpisodeState['stormCall'];
    ep.panelsStowed = choice === 'stow';
    const text = { stow: 'You stowed the solar panels before the dust hit.', out: 'You left the solar panels out to keep some power.', ask: 'You asked Earth what to do, so the panels stayed out while you waited.', wait: 'The timer ran out, so the panels stayed out.' }[choice] ?? '';
    addNode(s, { kind: 'choice', text, tone: choice === 'stow' ? 'mixed' : choice === 'out' ? 'mixed' : 'bad', tag: 'panels' });
    if (ep.phase !== 'storm') ep.phase = 'prep';
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
  s.flags.ep_gym_msg = gymNight(s); // health from the day's workouts (core/gym.ts); shown in the morning report
  // plant health: water and light keep plants healthy
  for (const p of s.plots) {
    if (!p.crop) continue;
    const watered = p.watered || ep.wateringFixed;
    p.health = clamp((p.health ?? 80) + (watered ? 0 : -EP.DRY_PLANT) + (s.farm === 'off' ? -EP.LIGHTS_OFF_PLANT : watered ? EP.GROW_PLANT : 0), 0, 100);
    if (ep.wateringFixed) p.watered = true;
  }
  if (s.sol === 1 && ep.checked.length < SYSTEMS.length) addNode(s, { kind: 'choice', text: `You skipped checking the ${SYSTEMS.filter(x => !ep.checked.includes(x)).map(x => SYSTEM_NAME[x]).join(', ')} before the storm.`, tone: 'bad', tag: 'check' });
  if (!isStormSol(s.sol)) return;
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
    if (ep.panelsStowed) { ep.panelsStowed = false; addNode(s, { kind: 'effect', text: 'The storm cleared. The stowed panels unfolded clean and ready.', tone: 'good' }); }
  }
}

// ---------- after the storm ----------
export function afterStormAction(s: GameState, what: 'clean' | 'water'): { ok: boolean; msg: string; energy: number; power: number } {
  const ep = s.ep!;
  if (what === 'water') { ep.wateringFixed = true; addNode(s, { kind: 'choice', text: 'You repaired the automatic watering system.', tone: 'good' }); }
  else {
    const buried = ep.panelDamage > 0;
    ep.panelsCleaned = true; s.panelDust = 0;
    const scar = Math.round(ep.panelDamage * EP.SCAR * 100) / 100;
    addNode(s, { kind: buried ? 'effect' : 'choice', tone: buried ? 'bad' : 'good', cause: buried ? ep.tree.filter(n => n.text.startsWith('Dust buried')).at(-1)?.id : undefined,
      text: buried ? `You dug the buried panels out (extra work), but some were scratched for good: ${Math.round(scar * 100)}% less solar power from now on.` : 'You cleaned the solar panels. Full sunshine again.' });
    ep.panelDamage = scar;
  }
  maybeFinish(s);
  return { ok: true, msg: what === 'water' ? 'Watering system repaired.' : 'Solar panels cleaned.', energy: 0, power: 0 };
}
export function maybeFinish(s: GameState): boolean {
  const ep = s.ep!;
  if (ep.phase !== 'after' || !ep.wateringFixed || !ep.panelsCleaned) return false;
  ep.phase = 'done'; ep.result = computeResult(s);
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
