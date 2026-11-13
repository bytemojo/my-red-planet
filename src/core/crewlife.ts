// Crew wellbeing (morale, hunger) and what each crew member is doing at a given hour.
// Pure: no Phaser, no DOM. The world layer reads these to choose animations and bubbles.
import { CREW_LIFE as C } from './constants';
import { clamp } from './util';
import type { CrewId, CrewState, GameState } from './types';

export const CREW_IDS: CrewId[] = ['reyes', 'aiko', 'david', 'sofia'];
export type Mood = 'sad' | 'neutral' | 'happy';

export const newCrewState = (): CrewState => ({ friendship: 0, met: false, morale: C.MORALE_START, hunger: C.HUNGER_START });
// Hunger only matters while the crew is quarantined; once well again they cook for themselves.
export const crewNeedsCare = (s: GameState) => !s.flags.quarantine_over;

export function mood(c: CrewState): Mood {
  return c.morale < C.SAD_BELOW ? 'sad' : c.morale >= C.HAPPY_FROM ? 'happy' : 'neutral';
}
export const isHungry = (s: GameState, c: CrewState) => crewNeedsCare(s) && c.hunger >= C.HUNGRY_AT;
export const teamMorale = (s: GameState) => Math.round(CREW_IDS.reduce((a, id) => a + s.crew[id].morale, 0) / CREW_IDS.length);

// Called from advance() for every simulation step.
export function crewTick(s: GameState, hours: number): void {
  if (!crewNeedsCare(s)) return;
  for (const id of CREW_IDS) {
    const c = s.crew[id];
    c.hunger = clamp(c.hunger + C.HUNGER_RATE * hours, 0, 100);
    if (c.hunger >= 100) c.morale = clamp(c.morale - C.STARVING_DROP * hours, 0, 100);
  }
}

// Called from endSol() BEFORE the Sol's tmp_ flags are cleared (it reads tmp_talk_<id>).
export function crewOvernight(s: GameState): void {
  for (const id of CREW_IDS) {
    const c = s.crew[id];
    if (!s.flags[`tmp_talk_${id}`]) c.morale = clamp(c.morale - C.NO_TALK_DROP, 0, 100);
    if (!crewNeedsCare(s)) { c.hunger = 0; continue; }
    if (c.hunger >= C.HUNGRY_AT) c.morale = clamp(c.morale - C.WENT_HUNGRY_DROP, 0, 100);
    c.hunger = clamp(Math.max(c.hunger, C.OVERNIGHT_HUNGER), 0, 100);
  }
}

// Talking cheers people up. The first chat of the Sol counts most.
export function crewTalked(s: GameState, id: CrewId, firstToday: boolean): void {
  const c = s.crew[id];
  c.morale = clamp(c.morale + (firstToday ? C.TALK_FIRST : C.TALK_AGAIN), 0, 100);
}

// Serve a meal through the quarantine hatch. Returns who was fed (empty = nothing happened).
export function serveMeal(s: GameState): CrewId[] {
  const fed: CrewId[] = [];
  for (const id of CREW_IDS) {
    const c = s.crew[id];
    if (c.hunger < C.PECKISH_AT) continue;
    if (c.hunger >= C.HUNGRY_AT) c.morale = clamp(c.morale + C.FED_BOOST, 0, 100);
    c.hunger = 0; fed.push(id);
  }
  return fed;
}

// ---------- what are they doing right now? ----------
export type Activity = 'wander' | 'pace' | 'stand' | 'lie' | 'nap' | 'write' | 'read' | 'sleep';
export const LAMP_ACTIVITIES: Activity[] = ['write', 'read'];
export const BED_ACTIVITIES: Activity[] = ['lie', 'nap', 'sleep'];
export const isNight = (hour: number) => hour >= 21.5 || hour < 6.5;
export const isEvening = (hour: number) => hour >= 18 && !isNight(hour);
// The desk lamp is on when someone reads or writes after sunset.
export const lampOn = (hour: number, a: Activity) => (hour >= 18 || hour < 6.5) && LAMP_ACTIVITIES.includes(a);

export function activityWeights(hour: number, c: CrewState, hungry: boolean): [Activity, number][] {
  if (isNight(hour)) return hour >= 23 ? [['sleep', 4], ['read', 1]] : [['sleep', 2], ['read', 2]];
  if (hungry) return [['pace', 6], ['wander', 2], ['stand', 1]];  // hungry crew move about more
  const m = mood(c);
  if (isEvening(hour)) return [['read', 3], ['write', 2], ['lie', 1], ['wander', 1]];
  // They are sick: lots of rest. Sad crew rest even more; happy crew potter about.
  return m === 'sad' ? [['lie', 4], ['nap', 2], ['stand', 1], ['write', 1]]
    : m === 'happy' ? [['wander', 4], ['write', 3], ['stand', 1], ['lie', 1]]
    : [['wander', 2], ['write', 2], ['lie', 2], ['nap', 1], ['stand', 1]];
}
// r in [0,1). Deterministic for a given r so it can be tested.
export function pickActivity(hour: number, c: CrewState, hungry: boolean, r: number): Activity {
  const w = activityWeights(hour, c, hungry);
  let t = r * w.reduce((a, [, n]) => a + n, 0);
  for (const [act, n] of w) { t -= n; if (t < 0) return act; }
  return w[w.length - 1][0];
}
// How long (real seconds) to keep doing it before choosing again.
export const activitySeconds = (a: Activity, r: number) =>
  ({ wander: 4, pace: 2.5, stand: 3, lie: 10, nap: 14, write: 9, read: 10, sleep: 20 }[a]) * (0.7 + 0.6 * r);
