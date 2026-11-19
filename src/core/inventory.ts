// Held items: the explorer carries at most ONE prop at a time (owner's Step 3 rule, started here
// because the action system needs it). Pure TypeScript, no Phaser, no DOM.
// Runtime-only for now: the held prop is not part of GameState, so it is not saved or rewound;
// resetting the player (new Sol, checkpoint reload) simply empties the hands.

export const PROP_IDS = ['tray', 'sprinkler', 'seed_packet', 'spare_part', 'ice_sample', 'harvest'] as const;
export type PropId = (typeof PROP_IDS)[number];

export const PROP_NAMES: Record<PropId, string> = {
  tray: 'Meal tray', sprinkler: 'Watering sprinkler', seed_packet: 'Seed packet', spare_part: 'Spare part', ice_sample: 'Ice sample', harvest: 'Harvested crop',
};

export interface Hands { item: PropId | null; crop?: CropId | null } // crop: which seeds the packet holds (Step 3c)
export const emptyHands = (): Hands => ({ item: null, crop: null });

export interface HandsResult { ok: boolean; msg: string }

/** Pick a prop up. Refused (nothing changes) if the hands are already full. */
export function pickUp(h: Hands, item: PropId, crop: CropId | null = null): HandsResult {
  if (h.item) return { ok: false, msg: h.item === item ? `You are already holding the ${PROP_NAMES[item].toLowerCase()}.` : 'Put your item down first.' };
  h.item = item; h.crop = item === 'seed_packet' || item === 'harvest' ? crop : null; return { ok: true, msg: `You picked up the ${PROP_NAMES[item].toLowerCase()}.` };
}

/** Put the held prop down. `expect` (optional) makes sure it is put back where it belongs. */
export function putDown(h: Hands, expect?: PropId): HandsResult {
  if (!h.item) return { ok: false, msg: 'Your hands are empty.' };
  if (expect && h.item !== expect) return { ok: false, msg: 'That is not where this item goes.' };
  const was = h.item; h.item = null; h.crop = null; return { ok: true, msg: `You put the ${PROP_NAMES[was].toLowerCase()} back.` };
}

// ---------- Step 3b: storage bins. READ-ONLY stock counts for the storage wall screen. ----------
// Nothing here changes game state. Counts come from real state (meal stock, planted beds, suit air);
// spare parts and water filters are small game-design stocks kept in flags (defaults below, never NASA data).
import { ACTION_ENERGY, CROPS, K } from './constants';
import { SPACE_MEALS, mealStock } from './meals';
import type { CropId, GameState } from './types';

export const BIN_IDS = ['food', 'seeds', 'tools', 'parts', 'filters', 'eva'] as const;
export type BinId = (typeof BIN_IDS)[number];
export const BIN_TITLES: Record<BinId, string> = { food: 'NASA FOOD', seeds: 'SEEDS', tools: 'TOOLS', parts: 'SPARE PARTS', filters: 'WATER FILTERS', eva: 'EVA GEAR' };
export const STOCK_DEFAULTS = { parts: 3, filters: 2 } as const;

export const stockOf = (s: Pick<GameState, 'flags'>, key: keyof typeof STOCK_DEFAULTS): number =>
  Math.max(0, Math.floor(Number(s.flags[`stock_${key}`] ?? STOCK_DEFAULTS[key])));

export interface BinLine { label: string; count: number; unit: string }
export interface BinView { id: BinId; title: string; lines: BinLine[]; total: number }

export function binView(s: GameState, id: BinId): BinView {
  let lines: BinLine[] = [];
  if (id === 'food') lines = SPACE_MEALS.map(m => ({ label: m.name, count: mealStock(s, m.id), unit: 'packs' }));
  else if (id === 'seeds') lines = (Object.keys(CROPS) as (keyof typeof CROPS)[]).map(c => ({ label: CROPS[c].name, count: s.plots.filter(p => p.crop === c).length, unit: 'growing now' }));
  else if (id === 'tools') lines = [{ label: 'Watering sprinkler', count: 1, unit: 'on station' }];
  else if (id === 'parts') lines = [{ label: 'Spare parts', count: stockOf(s, 'parts'), unit: 'in bin' }];
  else if (id === 'filters') lines = [{ label: 'Water filters', count: stockOf(s, 'filters'), unit: 'in bin' }];
  else lines = [{ label: 'EVA suit', count: 1, unit: 'on the rack' }, { label: 'Suit air tank', count: Math.round(Math.min(100, Math.max(0, s.suit))), unit: '% full' }];
  return { id, title: BIN_TITLES[id], lines, total: id === 'food' ? lines.reduce((a, l) => a + l.count, 0) : lines[0]?.count ?? 0 };
}

// ---------- Step 13a: repairing the watering pump (the repair pattern) ----------
export const NEED_PART_MSG = 'Hold a spare part first. Take one from the spare parts bin in the storage room.';
export const NO_PARTS_MSG = 'There are no spare parts left in the bin.';
export const PUMP_REPAIR_ENERGY = ACTION_ENERGY.repair_watering;
/** Why the pump cannot be repaired right now (null = can). Pure; the scene calls it before the animation and again at the beat. */
export function pumpProblem(s: Pick<GameState, 'ep' | 'energy' | 'flags'>, h: Hands): string | null {
  if (!s.ep) return 'Nothing to repair.';
  if (s.ep.wateringFixed) return 'The watering pump already works.';
  if (s.ep.phase !== 'after') return 'The pump cannot be fixed until the storm is over.';
  if (h.item !== 'spare_part') return stockOf(s, 'parts') < 1 ? NO_PARTS_MSG : NEED_PART_MSG;
  if (stockOf(s, 'parts') < 1) return NO_PARTS_MSG;
  if (s.energy < PUMP_REPAIR_ENERGY) return 'You are too tired to repair it. Sleep to get your energy back.';
  return null;
}

// ---------- Step 13b: breakable machines (comms console, microwave, electric heater) ----------
// A machine is broken while flags.broken_<id> is set. NOTHING sets it yet: Step 14 (the dish decision) breaks the comms console;
// until then these machines only show their repaired art. Breaking one has no other gameplay effect in this step.
export const MACHINE_IDS = ['comms', 'microwave', 'heater'] as const;
export type MachineId = (typeof MACHINE_IDS)[number];
export const MACHINE_NAMES: Record<MachineId, string> = { comms: 'Comms console', microwave: 'Microwave', heater: 'Electric heater' };
export const isMachineId = (x: unknown): x is MachineId => (MACHINE_IDS as readonly string[]).includes(x as string);
export const isBroken = (s: Pick<GameState, 'flags'>, id: MachineId): boolean => !!s.flags[`broken_${id}`];
export const breakMachine = (s: Pick<GameState, 'flags'>, id: MachineId) => { s.flags[`broken_${id}`] = 1; };
export const fixMachine = (s: Pick<GameState, 'flags'>, id: MachineId) => { s.flags[`broken_${id}`] = 0; };
export const MACHINE_REPAIR_ENERGY = ACTION_ENERGY.repair_machine;
/** Why this machine cannot be repaired right now (null = can). Pure; the scene checks before the animation and again at the beat. */
export function machineProblem(s: Pick<GameState, 'energy' | 'flags'>, h: Hands, id: MachineId): string | null {
  if (!isBroken(s, id)) return `The ${MACHINE_NAMES[id].toLowerCase()} already works.`;
  if (h.item !== 'spare_part') return stockOf(s, 'parts') < 1 ? NO_PARTS_MSG : NEED_PART_MSG;
  if (stockOf(s, 'parts') < 1) return NO_PARTS_MSG;
  if (s.energy < MACHINE_REPAIR_ENERGY) return 'You are too tired to repair it. Sleep to get your energy back.';
  return null;
}
/** Which broken kitchen appliance a spare part goes into first (microwave, then heater), or null. */
export const brokenKitchenMachine = (s: Pick<GameState, 'flags'>): MachineId | null => isBroken(s, 'microwave') ? 'microwave' : isBroken(s, 'heater') ? 'heater' : null;

// ---------- Step 3c: which seeds the seed drawer offers ----------
/** Crops the player may take seeds for. Lettuce, potato and beans from the start; the rest only once unlocked
 *  (flag unlock_<crop>, set by the Aoki friendship ladder in Step 10). */
export const STARTER_CROPS: readonly CropId[] = ['lettuce', 'potato', 'bean'];
export const unlockedCrops = (s: Pick<GameState, 'flags'>): CropId[] =>
  (Object.keys(CROPS) as CropId[]).filter(c => STARTER_CROPS.includes(c) || !!s.flags[`unlock_${c}`]);

// ---------- Step 6a: planting needs a seed packet in hand ----------
export const NEED_PACKET_MSG = 'Hold a seed packet first. Take one from the seed drawer in the storage room.';
/** Why the player cannot plant in this bed right now (null = can). Pure; the scene calls it before the animation and again at the beat. */
export function plantProblem(s: Pick<GameState, 'plots' | 'energy' | 'flags'>, h: Hands, plotId: string): string | null {
  if (h.item !== 'seed_packet' || !h.crop) return NEED_PACKET_MSG;
  const p = s.plots.find(x => x.id === plotId);
  if (!p) return 'Pick a bed.';
  if (p.crop) return 'Something is already growing here.';
  const lock = CROPS[h.crop].unlock; if (lock && !s.flags[lock]) return `You do not have ${CROPS[h.crop].name.toLowerCase()} seeds yet.`;
  if (s.energy < ACTION_ENERGY.plant) return 'You are too tired to plant. Sleep to get your energy back.';
  return null;
}


// ---------- Step 6b: watering needs the sprinkler in hand ----------
export const NEED_SPRINKLER_MSG = 'Hold the sprinkler first. Take the water can from its stand next to the grow beds.';
/** Why the player cannot water this bed right now (null = can). Pure; the scene calls it before the animation and again at the beat. */
export function wateringProblem(s: Pick<GameState, 'plots' | 'energy' | 'res'>, h: Hands, plotId: string): string | null {
  if (h.item !== 'sprinkler') return NEED_SPRINKLER_MSG;
  const p = s.plots.find(x => x.id === plotId);
  if (!p) return 'Pick a bed.';
  if (!p.crop) return 'Nothing is growing in this bed yet.';
  if (p.watered) return 'This bed is already watered today.';
  if (s.res.water < K.PLOT_WATER) return 'Not enough water in the tank.';
  if (s.energy < ACTION_ENERGY.water) return 'You are too tired to water. Sleep to get your energy back.';
  return null;
}

// ---------- Step 6c: harvest by reaching, carry the crop to the food bin ----------
export const HARVEST_NEED_FREE_HANDS = 'Put your item down first. Harvesting needs free hands.';
/** Why the player cannot harvest this bed right now (null = can). Pure; the scene calls it before the animation and again at the beat. */
export function harvestProblem(s: Pick<GameState, 'plots' | 'energy'>, h: Hands, plotId: string): string | null {
  if (h.item) return HARVEST_NEED_FREE_HANDS;
  const p = s.plots.find(x => x.id === plotId);
  if (!p) return 'Pick a bed.';
  if (!p.crop) return 'Nothing is growing in this bed.';
  if (p.growth < CROPS[p.crop].sols) return 'Not ready yet.';
  if (s.energy < ACTION_ENERGY.harvest) return 'You are too tired to harvest. Sleep to get your energy back.';
  return null;
}
/** Beds that are ready to pick, in plot order. */
export const readyBeds = (s: Pick<GameState, 'plots'>): number[] => s.plots.map((p, i) => (p.crop && p.growth >= CROPS[p.crop].sols ? i : -1)).filter(i => i >= 0);
export const STORE_ONLY_FOOD_BIN = 'Harvested crops go in the food bin.';