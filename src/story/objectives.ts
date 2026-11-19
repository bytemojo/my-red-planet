// Step 12a: Episode 1 objectives as DATA. Pure: no Phaser, no DOM, no sessionStorage (the UI passes `ext` in).
// NOW / NEXT come from the STORM PLAN checklist; BONUS STARS are separate. No text here mentions the suit (owner rule 3).
import { CREW_LIFE } from '../core/constants';
import { FAULT_FLAG, dishChoice } from '../core/dish';
import { ICE_OBJECTIVE } from '../core/icerun';
import { SYSTEMS, SYSTEM_NAME } from '../core/episode';
import { teamMorale } from '../core/crewlife';
import { allCropsUnlocked } from './aoki';
import type { GameState } from '../core/types';

/** Set by the dish decision (Step 14, core/dish.ts) once the one critical fault is repaired. */
export { FAULT_FLAG };

export interface PlanStep { id: 'check' | 'repair' | 'prepare' | 'panel' | 'storm'; label: string; now: string; required: boolean; done: (s: GameState) => boolean }

const cropsWatered = (s: GameState) => { const c = s.plots.filter(p => p.crop); return c.length > 0 && c.every(p => p.watered); };
const hungry = (s: GameState) => !s.flags.quarantine_over && Object.values(s.crew).some(c => c.hunger >= CREW_LIFE.HUNGRY_AT);

/** The STORM PLAN, in order. `required` steps must be done; optional ones help but never block the story. */
export const STORM_PLAN: readonly PlanStep[] = [
  { id: 'check', label: 'Check all five core systems', required: true,
    now: 'Check every core system. The solar panels are outside, through the airlock.', done: s => !!s.ep && s.ep.checked.length >= SYSTEMS.length },
  { id: 'repair', label: 'Repair one critical fault', required: true,
    now: 'One fault can be repaired before the storm. Decide which, then fix it with your own hands.', done: s => !!s.flags[FAULT_FLAG] },
  { id: 'prepare', label: 'Prepare watering and food', required: false,
    now: 'Water the crop beds and feed the crew before the storm arrives.', done: s => !!s.ep && (s.ep.wateringFixed || cropsWatered(s)) && !hungry(s) },
  { id: 'panel', label: 'Choose the solar panel position', required: true,
    now: 'Decide what to do with the solar panels when Captain Reyes calls.', done: s => !!s.ep?.stormCall },
  { id: 'storm', label: 'Stay inside during the red alert', required: true,
    now: 'Keep power up, look after the plants and the crew, and stay inside until the alert ends.', done: s => s.ep?.phase === 'after' || s.ep?.phase === 'done' },
];

export interface BonusStar { id: 'crops' | 'morale' | 'journal' | 'wiki' | 'share'; label: string }
export const BONUS_STARS: readonly BonusStar[] = [
  { id: 'crops', label: 'Unlock all crops' },
  { id: 'morale', label: 'Keep team morale high' },
  { id: 'journal', label: 'Write in your journal' },
  { id: 'wiki', label: 'Read a NASA Wiki source' },
  { id: 'share', label: 'Share the game with a friend' },
];
/** Things only the browser knows (sessionStorage / the share step). The UI fills this in. */
export interface BonusExt { wikiRead?: boolean; shared?: boolean }

/** Pure tick logic for each bonus star. Morale counts only at the end of the episode. */
export function bonusDone(s: GameState, id: BonusStar['id'], ext: BonusExt = {}): boolean {
  switch (id) {
    case 'crops': return allCropsUnlocked(s);
    case 'morale': return s.ep?.phase === 'done' && teamMorale(s) >= CREW_LIFE.HAPPY_FROM;
    case 'journal': return !!s.notes?.some(n => n.text.trim());
    case 'wiki': return !!ext.wikiRead;
    case 'share': return !!ext.shared;
  }
}

export interface ObjectivesView {
  now: string; next: string | null;
  plan: { id: string; label: string; required: boolean; done: boolean }[];
  stars: { id: string; label: string; done: boolean }[];
}

export function objectivesView(s: GameState, ext: BonusExt = {}): ObjectivesView {
  const ep = s.ep;
  const plan = STORM_PLAN.map(p => ({ id: p.id, label: p.label, required: p.required, done: p.done(s) }));
  const stars = BONUS_STARS.map(b => ({ id: b.id, label: b.label, done: bonusDone(s, b.id, ext) }));
  if (!ep) return { now: '', next: null, plan, stars };
  if (ep.phase === 'call' && ep.call !== 'answered') return { now: 'Answer Captain Reyes at the hallway intercom.', next: STORM_PLAN[0].label, plan, stars };
  if (ep.phase === 'done') return { now: 'Review your mission results.', next: null, plan, stars };
  if (ep.phase === 'ice') return { now: ICE_OBJECTIVE.now, next: ICE_OBJECTIVE.next, plan, stars };
  if (ep.phase === 'after') {
    const left = [ep.panelsCleaned ? '' : 'Clean the solar panels', ep.wateringFixed ? '' : 'Repair the watering pump'].filter(Boolean);
    return { now: left[0] ?? 'Finish the clean-up.', next: left[1] ?? null, plan, stars };
  }
  const open = STORM_PLAN.filter(p => !p.done(s));
  const first = open.find(p => p.required) ?? open[0];
  const after = first ? open.filter(p => p !== first) : [];
  const nextStep = after.find(p => p.required) ?? after[0];
  const dishNow = first?.id === 'repair' ? (dishChoice(s) === 'comms' ? 'Fix the comms console. Fetch a spare part from the storage room, walk to the comms console and repair it by hand.' : dishChoice(s) === 'dish' ? 'Fix the dish. Fetch a spare part from the storage room, go outside to the dish and repair it. Be back inside before the alert turns red.' : null) : null;
  const missing = first?.id === 'check' ? ` Still to check: ${SYSTEMS.filter(x => !ep.checked.includes(x)).map(x => SYSTEM_NAME[x]).join(', ')}.` : '';
  return { now: first ? (dishNow ?? first.now) + missing : 'Stay inside and look after the base.', next: nextStep?.label ?? null, plan, stars };
}
