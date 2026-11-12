import type { CropId, FarmLight, LsMode, ResKey } from './types';

export const DAY_START = 6;      // wake-up hour
export const DAY_END = 24;       // forced sleep
export const MAX_SNAPSHOTS = 60; // rewind window, in Sols (storage cap, see docs/DESIGN.md)

// Simplified game units, NOT real engineering values. Rates are "% per in-game hour".
export const K = {
  OXMAX: 4.0, WMAX: 3.2, SOLAR_PEAK: 20, BASE_POWER: 1.0, LS_POWER: 1.6, COMMS_POWER: 0.2,
  O2_USE: 2.0, WATER_USE: 1.2, FOOD_USE: 0.6, SUIT_USE: 10, SUIT_REFILL: 25, RAD_USE: 1.0,
  SOLAR_BASE_EFF: 0.62, PLOT_WATER: 1.5,
};

export const FARM: Record<FarmLight, { name: string; power: number; water: number; growth: number; why: string }> = {
  bright: { name: 'Bright grow-lights', power: 1.4, water: 0.6, growth: 1.0, why: 'Plants grow faster, but lights are hungry for electricity.' },
  dim: { name: 'Dim grow-lights', power: 0.6, water: 0.3, growth: 0.6, why: 'Plants grow slower, but the battery lasts longer.' },
};
export const LS: Record<LsMode, { name: string; ox: number; why: string }> = {
  oxy: { name: 'Oxygen first', ox: 0.9, why: 'Most power makes air. Water gets only a trickle.' },
  bal: { name: 'Balanced', ox: 0.5, why: 'Power is split evenly. Nothing is great, nothing runs out fast.' },
  wat: { name: 'Water first', ox: 0.15, why: 'Most power melts ice for water. The air slowly shrinks.' },
};

export const CROPS: Record<CropId, { name: string; sols: number; food: number }> = {
  lettuce: { name: 'Lettuce', sols: 2, food: 10 },
  tomato: { name: 'Tomatoes', sols: 3, food: 14 },
  bean: { name: 'Beans', sols: 3, food: 16 },
  potato: { name: 'Potatoes', sols: 4, food: 24 },
};

// Every action costs player energy (Stardew-style). Energy refills when you sleep.
export const ACTION_ENERGY = {
  plant: 3, water: 4, harvest: 3, clean_panels: 12, talk: 1, build: 15, explore: 20,
  cave_explore: 20, cave_excavate: 25, cave_pressurize: 15, cave_shield: 15, request_shipment: 5,
} as const;
export type ActionName = keyof typeof ACTION_ENERGY;

export const BUILDINGS: Record<string, { name: string; stage: number; cost: Partial<Record<ResKey, number>>; why: string }> = {
  greenhouse_2: { name: 'Greenhouse Annex', stage: 2, cost: { power: 8, water: 8 }, why: 'One more grow bed for crops.' },
  solar_2: { name: 'Second Solar Array', stage: 3, cost: { power: 6 }, why: 'More electricity from the same sunshine.' },
  recycler: { name: 'Water Recycler', stage: 3, cost: { power: 8 }, why: 'Cleans used water so less is wasted.' },
  shelter: { name: 'Radiation Shelter', stage: 3, cost: { power: 8 }, why: 'Thick walls to hide behind during solar storms.' },
  rover_bay: { name: 'Rover Bay', stage: 4, cost: { power: 12 }, why: 'Repair the rover to explore the surface.' },
};

export const CAVE_MAX = 3;       // per verb
export const CAVERN_NEEDED = 8;  // total verb levels (each verb >= 1) to open the cavern with water
export const SELF_SUFFICIENT_GOAL = 10; // Sols without an Earth shipment to finish the campaign

export const STAGES = [
  { id: 1, title: 'First Days on Mars', objective: 'Keep air, water, food and power up. Plant and harvest your first crop.', learnId: 'space_crops' },
  { id: 2, title: 'The Greenhouse', objective: 'Grow more food than you eat. Build the Greenhouse Annex.', learnId: 'space_crops' },
  { id: 3, title: 'Power and Infrastructure', objective: 'Build a Second Solar Array and a Water Recycler.', learnId: 'mars_dust' },
  { id: 4, title: 'Surface Exploration', objective: 'Build the Rover Bay and make two rover trips.', learnId: 'mars_resources' },
  { id: 5, title: 'The Cave', objective: 'Explore, excavate, pressurize and shield the candidate cave.', learnId: 'mars_caves' },
  { id: 6, title: 'A Sustainable Colony', objective: `Go ${SELF_SUFFICIENT_GOAL} Sols without an Earth shipment.`, learnId: 'mars_resources' },
];
