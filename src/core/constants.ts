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

// `unlock` is the flag that makes a crop available (core/inventory.ts unlockedCrops, farm menu, sim plant). Tomato keeps its older tomato_unlocked flag.
export const CROPS: Record<CropId, { name: string; sols: number; food: number; unlock?: string }> = {
  lettuce: { name: 'Lettuce', sols: 2, food: 10 },
  tomato: { name: 'Tomatoes', sols: 3, food: 14 },
  bean: { name: 'Beans', sols: 3, food: 16 },
  potato: { name: 'Potatoes', sols: 4, food: 24 },
  spinach: { name: 'Spinach', sols: 2, food: 11, unlock: 'unlock_spinach' },
  carrot: { name: 'Carrots', sols: 3, food: 15, unlock: 'unlock_carrot' },
  wheat: { name: 'Wheat', sols: 5, food: 26, unlock: 'unlock_wheat' },
};

// Every action costs player energy (Stardew-style). Energy refills when you sleep.
export const ACTION_ENERGY = {
  plant: 3, water: 4, harvest: 3, clean_panels: 12, talk: 1, build: 15, explore: 20,
  cave_explore: 20, cave_excavate: 25, cave_pressurize: 15, cave_shield: 15, request_shipment: 5, feed: 6,
  check: 1, suit: 1, answer: 0, panels: 4, repair_watering: 12, repair_machine: 10, repair_dish: 12, fix_panels: 18, ice_chip: 8, ice_pour: 0,
  workout: 0, study_plants: 8, cook_serve: 6, serve_tray: 0, aoki_talk: 3, watering_mode: 0, // workout energy depends on the machine (core/gym.ts)
} as const;

// Episode 1 "The Storm". Simplified game units (a game model, not engineering data), tuned so that
// no choice is free: stowing panels saves them but drains the battery; leaving them out keeps some power but risks burial.
export const EP = {
  START_HOUR: 8, STORM_CALL_HOUR: 19, STORM_SOLS: [2, 3, 4], AFTER_SOL: 5,
  ICE_ENERGY: 8, ICE_AIR: 10,    // Step 21b: chipping ice costs energy and suit air (air only if the suit is on)
  ICE_WATER: 25,                 // Step 21a: water restored when the ice container is poured in
  CALL_SECONDS: 90,              // the Storm Call countdown (at least 90 s: kids need time to read and think)
  CHATS_PER_SOL: 2,              // intercom chats per Sol (the crew is sick and needs rest)
  POWER_SCALE: 0.3,              // the base battery is large: power % moves at 30% of the campaign rate
  SCAR: 0.4,                     // share of burial damage that stays after the panels are dug out (scratched for good)
  BURY: { 2: 0.45, 3: 0.15, 4: 0.05 } as Record<number, number>, // panel damage per storm night if left out
  HEALTH_DRAIN: { low: 0, elevated: 2, high: 9, storm: 16 } as Record<string, number>, // = ALERT_DRAIN in src/story/alert.ts (a test keeps them equal) // per hour outside
  PLAYER_HUNGER_START: 20, PLAYER_HUNGER_RATE: 5, PLAYER_HUNGRY_AT: 50, PLAYER_FED_AT: 25, // Step 11b: your own hunger (0 fed .. 100 starving), same pace as the crew's
  HUNGER_HEALTH_DRAIN: 2,        // health lost per game hour while you are hungry (slow: one skipped meal never fails)
  FED_HEALTH_REGEN: 1.5,         // health regained per game hour inside once you are fed
  NO_SUIT_DRAIN: 30,             // Step 8c: health lost per game hour outside WITHOUT the suit (about 25 real seconds from full health to critical)
  WATER_WALL: { water: 15, power: 6 },
  DISH_WATER_LOSS: 4,            // Step 14a branch A (comms repaired, water maker left damaged): water lost each storm night
  DISH_REPAIR_ENERGY: 12,        // Step 14a branch B: energy to repair the dish
  DISH_SUSTAIN: { comms: 8, dish: 4 }, // sustainability points lost by branch (read by the score in Step 22)
  PUMP_POWER: 2.4,               // Step 15a: extra power load while the pump waters automatically
  NONESSENTIAL_POWER: 0.8,       // Step 15a: load saved in the storm when the player waters by hand (pump and non-essentials off)
  WATER_PM_HOUR: 15,             // Step 15a: the evening watering round starts at 3 PM
  DRY_PLANT: 20, LIGHTS_OFF_PLANT: 6, GROW_PLANT: 5,
};

// Step 7a: when a bad state becomes a FAILURE (src/core/failure.ts). Low morale / health first gives a WARNING; failure needs a SUSTAINED critical state.
// Simplified game units, tuned for feel. One missed meal can never reach these on its own (tested).
// Step 24l: the long-run food supply is counted in DAYS (Sols), never in portions. 180 Sols = 6 months, 2 meals a day for 5 people.
export const RATION_SOLS_START = 180;
export const RATION_SOLS_PER_TRAY = 0.5; // every served tray uses half a ration day (2 trays = 1 Sol of food)
export const FAIL = {
  HEALTH_WARN: 40, HEALTH_CRITICAL: 15,   // player health: warning at or below WARN, critical at or below CRITICAL (0 is always a failure)
  MORALE_WARN: 30, MORALE_CRITICAL: 10,   // team morale (average of the crew)
  CRITICAL_HOURS: 3,                      // game hours at or below critical before it is a failure
  RADIATION_HOURS: 2,                     // game hours outside while the Solar Alert is HIGH or STORM before it is a failure
  RESOURCE_WARN: 15,                      // air / water / food at or below this: warning (0 = failure)
  NO_SUIT_SAFE_HEALTH: 60,                // Step 24j: after a NO_SUIT fade the player lands at the airlock with at least this much health
  NO_SUIT_GLITCH_MS: 3000,                // Step 24j: the screen glitches in and out for exactly this long
  SUIT_AIR_WARN: 25,                      // suit air at or below this while outside: warning (0 = failure)
} as const;

// Crew wellbeing while they are quarantined. Simplified game units, tuned for feel, not real nutrition data.
// Meals come out of the shared food store (already counted in K.FOOD_USE), so feeding costs the player's energy, not extra food.
export const CREW_LIFE = {
  MORALE_START: 50, HUNGER_START: 20,
  TALK_FIRST: 15,      // first chat with someone each Sol
  TALK_AGAIN: 4,       // later chats the same Sol
  NO_TALK_DROP: 8,     // morale lost overnight if you never talked to them that Sol
  HUNGER_RATE: 5,      // hunger per awake in-game hour (hungry about 6 hours after a meal)
  HUNGRY_MORALE_DRAIN: 0.25, // morale lost per awake hour by a crew member who is hungry and unfed
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
