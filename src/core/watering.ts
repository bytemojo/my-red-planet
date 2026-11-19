// Step 15a: watering mode (pure logic, no Phaser/DOM). Episode 1 only; the open campaign keeps its once-a-day watering.
//   automatic: the pump runs, plants stay watered, but it draws a lot of power (can trip the low-battery warning).
//   manual: the pump and non-essentials are off in the storm; the player waters every bed in the MORNING and the EVENING.
import { EP } from './constants';
import type { GameState, Plot, WateringMode } from './types';

export const WATERING_MODES: WateringMode[] = ['automatic', 'manual'];
export type WaterSlot = 'am' | 'pm';

/** Which watering round the clock is in right now: before WATER_PM_HOUR is the morning round, from then on the evening round. */
export function slotNow(s: GameState): WaterSlot { return s.hour < EP.WATER_PM_HOUR ? 'am' : 'pm'; }

/** The pump can run before the storm damages it, and again once the player has repaired it after the storm. */
export function pumpUsable(s: GameState): boolean {
  const ep = s.ep; if (!ep) return false;
  return ep.phase === 'after' || ep.phase === 'done' ? ep.wateringFixed : true;
}
/** True when the pump is switched on AND able to run: the beds water themselves. */
export function pumpRunning(s: GameState): boolean { return !!s.ep && s.wateringMode === 'automatic' && pumpUsable(s); }

/** Extra (or saved) power load in the same units as K.BASE_POWER: the pump costs power, switching to manual during the storm saves some. */
export function wateringLoad(s: GameState): number {
  if (!s.ep) return 0;
  if (pumpRunning(s)) return EP.PUMP_POWER;
  if (s.wateringMode === 'manual' && s.ep.phase === 'storm') return -EP.NONESSENTIAL_POWER;
  return 0;
}

/** Can this bed take a hand watering right now? (manual mode: once per round; the open campaign: once per day) */
export function alreadyWatered(s: GameState, p: Plot): boolean {
  if (!s.ep) return p.watered;
  return slotNow(s) === 'am' ? !!p.wateredAm : !!p.wateredPm;
}
export function markWatered(s: GameState, p: Plot): void {
  p.watered = true;
  if (s.ep) { if (slotNow(s) === 'am') p.wateredAm = true; else p.wateredPm = true; }
}
export function clearWatered(p: Plot): void { p.watered = false; p.wateredAm = false; p.wateredPm = false; }
/** How many of today's two rounds this bed missed (0-2). Only meaningful in manual mode. */
export function missedRounds(p: Plot): number { return (p.wateredAm ? 0 : 1) + (p.wateredPm ? 0 : 1); }

/** Why the player cannot choose this mode right now, or null. */
export function wateringModeProblem(s: GameState, mode: WateringMode): string | null {
  if (!s.ep) return 'The watering pump belongs to the storm mission.';
  if (!WATERING_MODES.includes(mode)) return 'Pick automatic or manual.';
  if (mode === 'automatic' && !pumpUsable(s)) return 'The watering pump is broken. Repair it first.';
  return null;
}

/** Step 15b: the HUD chip. 'MORNING' / 'EVENING' only in MANUAL mode (Episode) while a planted bed still waits for this round; otherwise null. */
export function waterMeLabel(s: GameState): 'MORNING' | 'EVENING' | null {
  if (!s.ep || s.wateringMode !== 'manual') return null;
  if (!s.plots.some(p => p.crop && !alreadyWatered(s, p))) return null;
  return slotNow(s) === 'am' ? 'MORNING' : 'EVENING';
}
