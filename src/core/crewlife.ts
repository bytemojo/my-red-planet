// Crew wellbeing (morale, hunger) and what each crew member is doing at a given hour.
// Pure: no Phaser, no DOM. The world layer reads these to choose animations and bubbles.
import { CREW_LIFE as C } from './constants';
import { clamp } from './util';
import type { CropId, CrewId, CrewState, GameState } from './types';

export const CREW_IDS: CrewId[] = ['reyes', 'aiko', 'david', 'sofia'];
export type Mood = 'sad' | 'neutral' | 'happy';

export const newCrewState = (): CrewState => ({ friendship: 0, met: false, morale: C.MORALE_START, hunger: C.HUNGER_START });
// ---------- Step 10a: the crop unlock ladder (reuses the crew hearts = CrewState.friendship, no second system) ----------
/** The botanist who gives the seeds. In the code and the crew list she is Aiko Tanaka (id 'aiko'); the menu text calls the botanist "Dr Aoki". */
export const BOTANIST: CrewId = 'aiko';
export const MAX_HEARTS = 5;
/** Hearts with the botanist needed for each crop. Lettuce, potato and bean need none. */
export const CROP_UNLOCK_HEARTS: Readonly<Partial<Record<CropId, number>>> = { tomato: 2, carrot: 4, spinach: 4, wheat: 5 };
export const heartsOf = (s: Pick<GameState, 'crew'>, id: CrewId): number => Math.min(MAX_HEARTS, Math.max(0, Math.floor(s.crew[id]?.friendship ?? 0)));
const unlockFlag = (c: CropId) => `unlock_${c}`;
/** Crops the botanist's hearts have earned so far, whatever the flags say. */
export const cropsEarned = (s: Pick<GameState, 'crew'>): CropId[] =>
  (Object.keys(CROP_UNLOCK_HEARTS) as CropId[]).filter(c => heartsOf(s, BOTANIST) >= CROP_UNLOCK_HEARTS[c]!);
/**
 * Makes the unlock flags match the hearts and returns the crops that became available just now.
 * An unlock is permanent (a flag in GameState.flags, so saves and rewinds carry it together with the hearts that earned it).
 * Safe to call any time; also adopts the older tomato_unlocked flag so old saves and the campaign story keep working.
 */
export function syncCropUnlocks(s: GameState): CropId[] {
  const fresh: CropId[] = [];
  if (s.flags.tomato_unlocked) s.flags[unlockFlag('tomato')] = true;
  for (const c of cropsEarned(s)) if (!s.flags[unlockFlag(c)]) { s.flags[unlockFlag(c)] = true; fresh.push(c); }
  if (s.flags[unlockFlag('tomato')]) s.flags.tomato_unlocked = true;                // the campaign planting check still reads this flag
  return fresh;
}
/** The next rung of the ladder: how many hearts and which crops. null when every crop is open. */
export function nextCropUnlock(s: GameState): { hearts: number; crops: CropId[] } | null {
  const waiting = (Object.keys(CROP_UNLOCK_HEARTS) as CropId[]).filter(c => !s.flags[unlockFlag(c)]);
  if (!waiting.length) return null;
  const hearts = Math.min(...waiting.map(c => CROP_UNLOCK_HEARTS[c]!));
  return { hearts, crops: waiting.filter(c => CROP_UNLOCK_HEARTS[c] === hearts) };
}

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
    if (c.hunger >= C.HUNGRY_AT) c.morale = clamp(c.morale - C.HUNGRY_MORALE_DRAIN * hours, 0, 100);   // Step 11b: unfed crew slowly lose morale
    if (c.hunger >= 100) c.morale = clamp(c.morale - C.STARVING_DROP * hours, 0, 100);
  }
}

// Called from endSol() BEFORE the Sol's tmp_ flags are cleared (it reads tmp_talk_<id>).
export function crewOvernight(s: GameState): void {
  syncCropUnlocks(s);                                                // catches saves from before the ladder existed
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
