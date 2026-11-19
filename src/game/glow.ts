// Step 24k: a LOW meter makes ONLY its own object(s) pulse a soft red glow. The map is data; the pick is a pure function.
import { FAIL } from '../core/constants';
import { BIN_TILE_X, STORAGE } from './layout';
import type { Resources } from '../core/types';

export type MeterId = keyof Resources; // o2 | water | food | power
export interface GlowBox { id: string; label: string; tiles: [number, number, number, number] } // tile rect [x, y, w, h]

/** Every object that can glow, with its footprint in tiles (same boxes as the click boxes). */
export const GLOW_OBJECTS: Record<string, GlowBox> = {
  oxygen_unit: { id: 'oxygen_unit', label: 'Oxygen unit', tiles: [19, 3, 3, 2] },
  water_maker: { id: 'water_maker', label: 'Water maker', tiles: [24, 3, 3, 2] },
  water_pump: { id: 'water_pump', label: 'Water pump', tiles: [4, 5, 1, 2] },
  food_bin: { id: 'food_bin', label: 'NASA food bin', tiles: [BIN_TILE_X(0), STORAGE.y0, 1, 2] },
  power_unit: { id: 'power_unit', label: 'Control module (power)', tiles: [15, 3, 2, 1] }, // there is no separate battery object: the control module is the power unit
};
/** Which low meter lights which object(s). Nothing else ever glows. */
export const METER_GLOW: Record<MeterId, string[]> = {
  water: ['water_maker', 'water_pump'], o2: ['oxygen_unit'], power: ['power_unit'], food: ['food_bin'],
};
export const GLOW_CYCLE_MS = 2000;

/** Meters at or below the warning threshold (same threshold as the failure warning). */
export const lowMeters = (res: Resources): MeterId[] => (Object.keys(METER_GLOW) as MeterId[]).filter(k => res[k] <= FAIL.RESOURCE_WARN);
/** Ids of the objects that should glow right now. */
export const glowingObjects = (res: Resources): string[] => [...new Set(lowMeters(res).flatMap(k => METER_GLOW[k]))];
/** Soft slow pulse 0..1 with a 2 s cycle (constant when reduced motion). */
export const glowAlpha = (tMs: number, reduced = false): number => reduced ? 0.55 : 0.15 + 0.5 * (0.5 - 0.5 * Math.cos((tMs / GLOW_CYCLE_MS) * Math.PI * 2));
