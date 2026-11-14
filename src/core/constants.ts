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
  off: { name: 'Lights off', power: 0, water: 0, growth: 0, why: 'Saves the most power. Plants stop growing and slowly get weaker.' },
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
  cave_explore: 20, cave_excavate: 25, cave_pressurize: 15, cave_shield: 15, request_shipment: 5, feed: 6,
  check: 1, suit: 1, answer: 0, panels: 4, repair_watering: 12, fix_panels: 18,
  workout: 0, study_plants: 8, // workout energy depends on the machine (core/gym.ts)
} as const;

// Episode 1 "The Storm". Simplified game units (a game model, not engineering data), tuned so that
// no choice is free: stowing panels saves them but drains the battery; leaving them out keeps some power but risks burial.
export const EP = {
  START_HOUR: 8, STORM_CALL_HOUR: 19, STORM_SOLS: [2, 3, 4], AFTER_SOL: 5,
  CALL_SECONDS: 12,              // the Storm Call countdown
  CHATS_PER_SOL: 2,              // intercom chats per Sol (the crew is sick and needs rest)
  POWER_SCALE: 0.3,              // the base battery is large: power % moves at 30% of the campaign rate
  SCAR: 0.4,                     // share of burial damage that stays after the panels are dug out (scratched for good)
  BURY: { 2: 0.45, 3: 0.15, 4: 0.05 } as Record<number, number>, // panel damage per storm night if left out
  HEALTH_DRAIN: { low: 0, elevated: 2, high: 9, storm: 16 } as Record<string, number>, // per hour outside
  WATER_WALL: { water: 15, power: 6 },
  DRY_PLANT: 20, LIGHTS_OFF_PLANT: 6, GROW_PLANT: 5,
};

// Crew wellbeing while they are quarantined. Simplified game units, tuned for feel, not real nutrition data.
// Meals come out of the shared food store (already counted in K.FOOD_USE), so feeding costs the player's energy, not extra food.
export const CREW_LIFE = {
  MORALE_START: 50, HUNGER_START: 20,
  TALK_FIRST: 15,      // first chat with someone each Sol
  TALK_AGAIN: 4,       // later chats the same Sol
  NO_TALK_DROP: 8,     // morale lost overnight if you never talked to them that Sol
  HUNGER_RATE: 5,      // hunger per awake in-game hour (hungry about 6 hours after a meal)
  HUNGRY_AT: 50,       // shows the food thought bubble
  PECKISH_AT: 25,      // the meal hatch only works if someone is at least this hungry
  OVERNIGHT_HUNGER: 30,
  FED_BOOST: 6,        // morale for feeding someone who was hungry
  WENT_HUNGRY_DROP: 6, // morale lost overnight if they went to bed hungry
  STARVING_DROP: 2,    // morale lost per hour at hunger 100
  FOOD_NEEDED: 5,      // the food store must hold at least this much to serve a meal
  SAD_BELOW: 35, HAPPY_FROM: 65,
};
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
