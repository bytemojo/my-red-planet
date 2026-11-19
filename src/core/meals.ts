import { CREW_LIFE, CROPS, RATION_SOLS_PER_TRAY, RATION_SOLS_START } from './constants';
import { serveMeal } from './crewlife';
import { clamp } from './util';
import type { CropId, GameState, MealRecord } from './types';

// ---------- Step 9a: ONE food item type for NASA meals and greenhouse produce ----------
export type FoodMethod = 'READY_TO_EAT' | 'HYDRATE' | 'HEAT' | 'FARM_PRODUCE';
export type FoodCategory = 'space-meal' | 'farm-produce';
export interface FoodItem {
  id: string; name: string; category: FoodCategory; method: FoodMethod;
  water: number; power: number; minutes: number;
  /** Starting stock. Space meals: packs in the lockers. Produce: 0, because produce stock is the harvested count. */
  stock: number;
  cropId?: CropId;
  /** Flag that must be set before the item can be cooked (crops the botanist has not unlocked yet). */
  unlockFlag?: string;
}
export const FOOD_PORTIONS = 5;
/** The exact words the menu shows for a locked crop (Step 9c reuses this). */
export const LOCKED_CROP_MSG = 'Build your relationship with Dr Aoki, the Botanist, to unlock this crop.';
/** Text shown on cards and used by the cooking animations (core/actions.ts cookActionPlan). */
export const METHOD_LABEL: Record<FoodMethod, string> = { READY_TO_EAT: 'READY TO EAT', HYDRATE: 'HYDRATE', HEAT: 'HEAT', FARM_PRODUCE: 'FARM PRODUCE' };

const meal = (id: string, name: string, method: FoodMethod, water: number, power: number, minutes: number, stock: number): FoodItem =>
  ({ id, name, category: 'space-meal', method, water, power, minutes, stock });
export const NASA_MEALS: readonly FoodItem[] = [
  meal('almonds', 'Almonds & dried fruit', 'READY_TO_EAT', 0, 0, 0, 12),
  meal('eggs', 'Scrambled eggs', 'HYDRATE', 0.2, 0, 4, 8),
  meal('chicken', 'Chicken & rice', 'HEAT', 0, 3, 5, 10),
  meal('beef', 'Beef brisket', 'HEAT', 0, 3, 5, 6),
  meal('oatmeal', 'Oatmeal with blueberries', 'HYDRATE', 0.15, 0, 3, 9),
  meal('mac', 'Macaroni & cheese', 'HEAT', 0, 2, 4, 7),
  meal('tortilla', 'Flour tortillas', 'READY_TO_EAT', 0, 0, 0, 15),
  meal('soup', 'Vegetable soup', 'HYDRATE', 0.25, 0, 4, 8),
];

/** Produce needs a little water to wash or boil and a little prep time; only the starchy crops use a little power. Stock = harvested count. */
const PRODUCE_PREP: Record<CropId, { water: number; power: number; minutes: number }> = {
  lettuce: { water: 0.05, power: 0, minutes: 2 }, potato: { water: 0.1, power: 1, minutes: 4 }, bean: { water: 0.1, power: 1, minutes: 3 },
  tomato: { water: 0.05, power: 0, minutes: 2 }, carrot: { water: 0.05, power: 0, minutes: 2 }, spinach: { water: 0.05, power: 0, minutes: 2 },
  wheat: { water: 0.1, power: 1, minutes: 4 },
};
const STARTER_PRODUCE: readonly CropId[] = ['lettuce', 'potato', 'bean'];     // same three as inventory.ts STARTER_CROPS
export const PRODUCE_ITEMS: readonly FoodItem[] = (['lettuce', 'potato', 'bean', 'tomato', 'carrot', 'spinach', 'wheat'] as const).map(c => ({
  id: c, name: CROPS[c].name, category: 'farm-produce' as const, method: 'FARM_PRODUCE' as const, ...PRODUCE_PREP[c], stock: 0, cropId: c,
  ...(STARTER_PRODUCE.includes(c) ? {} : { unlockFlag: `unlock_${c}` }),
}));
export const FOOD_ITEMS: readonly FoodItem[] = [...NASA_MEALS, ...PRODUCE_ITEMS];
export const foodItem = (id: unknown): FoodItem | undefined => typeof id === 'string' ? FOOD_ITEMS.find(f => f.id === id) : undefined;

/** Legacy view for the existing kitchen panel, cook animations and food bin: the 8 NASA meals with display method text and an icon (icons go in Step 9b). */
const MEAL_ICON: Record<string, string> = { almonds: '🥜', eggs: '🍳', chicken: '🍚', beef: '🥩', oatmeal: '🫐', mac: '🧀', tortilla: '🫓', soup: '🥣' };
export type MealId = 'almonds' | 'eggs' | 'chicken' | 'beef' | 'oatmeal' | 'mac' | 'tortilla' | 'soup';
export type SpaceMeal = Omit<FoodItem, 'id' | 'method'> & { id: MealId; method: string; icon: string };
export const SPACE_MEALS: readonly SpaceMeal[] = NASA_MEALS.map(m => ({ ...m, id: m.id as MealId, method: METHOD_LABEL[m.method], icon: MEAL_ICON[m.id] }));

type Flags = Pick<GameState, 'flags'>;
/** Flag that holds the remaining count: meal_<id> for packs (default = starting stock), produce_<crop> for harvested produce (default 0). */
export const stockKey = (f: FoodItem) => f.category === 'farm-produce' ? `produce_${f.id}` : `meal_${f.id}`;
export const foodStock = (s: Flags, f: FoodItem): number => Math.max(0, Number(s.flags[stockKey(f)] ?? f.stock) || 0);
export const mealStock = (s: Flags, id: MealId) => foodStock(s, foodItem(id)!);
export const produceStock = (s: Flags, crop: CropId) => foodStock(s, foodItem(crop)!);
/** Called when a crop is harvested and stored (hooked into the harvest in a later step). */
export const addProduce = (s: Flags, crop: CropId, n = 1) => { s.flags[`produce_${crop}`] = produceStock(s, crop) + Math.max(0, Math.floor(n)); };
export const isFoodUnlocked = (s: Flags, f: FoodItem) => !f.unlockFlag || !!s.flags[f.unlockFlag];

export interface TrayTotals { water: number; power: number; minutes: number }
/** Totals for a tray of known item ids (unknown ids count as zero). */
export function trayTotals(selection: readonly string[]): TrayTotals {
  return selection.reduce((t, id) => { const f = foodItem(id); return f ? { water: t.water + f.water, power: t.power + f.power, minutes: t.minutes + f.minutes } : t; }, { water: 0, power: 0, minutes: 0 });
}

/** Why this tray cannot be prepared right now (null = it can). Pure: changes nothing. Any mix of items is allowed. */
export function trayProblem(s: GameState, selection: unknown): string | null {
  if (s.flags.tray_ready) return 'Deliver the tray you are already carrying to the meal hatch first.';
  if (!s.ep || s.flags.quarantine_over) return 'The crew is not waiting at the quarantine hatch.';
  if (!Array.isArray(selection) || selection.length !== FOOD_PORTIONS || selection.some(id => typeof id !== 'string')) return 'Choose exactly five portions for the crew and you.';
  const items = (selection as string[]).map(foodItem);
  if (items.some(f => !f)) return 'That item is not on the menu.';
  const counts = new Map<FoodItem, number>();
  for (const f of items as FoodItem[]) counts.set(f, (counts.get(f) ?? 0) + 1);
  for (const [f] of counts) if (!isFoodUnlocked(s, f)) return LOCKED_CROP_MSG;
  for (const [f, n] of counts) if (foodStock(s, f) < n) return f.category === 'farm-produce' ? `Not enough ${f.name} harvested yet.` : `Not enough ${f.name} left.`;
  const t = trayTotals(selection as string[]);
  if (s.res.water < t.water) return 'Not enough water to hydrate the tray.';
  if (s.res.power < t.power) return 'Not enough station power to heat the tray.';
  if (!Object.values(s.crew).some(c => c.hunger >= CREW_LIFE.PECKISH_AT)) return 'Nobody is hungry right now.';
  return null;
}

/** Step 2d + 9a: COOK & SERVE only PREPARES the tray (validates, then spends stock/water/power). Nobody is fed until serveTray(). Nothing is spent unless the whole tray is valid. */
export function cookServe(s: GameState, selection: string[]): { ok: boolean; msg: string } {
  const problem = trayProblem(s, selection);
  if (problem) return { ok: false, msg: problem };
  const t = trayTotals(selection);
  for (const id of selection) { const f = foodItem(id)!; s.flags[stockKey(f)] = foodStock(s, f) - 1; }
  s.res.water = clamp(s.res.water - t.water, 0, 100); s.res.power = clamp(s.res.power - t.power, 0, 100);
  s.flags.tray_ready = 1; s.flags.tray_power = t.power; s.flags.tray_items = selection.join(',');
  return { ok: true, msg: `Tray ready: five portions (4 crew + you). The heater used ${t.power} power. Carry it to the meal hatch.` };
}

// ---------- Step 24l: the ration pool, in Sols ----------
/** Ration days left (can be x.5). Saved in flags, so old saves simply start at 180. */
export const rationSols = (s: GameState): number => { const v = Number(s.flags.ration_sols); return Number.isFinite(v) && s.flags.ration_sols !== undefined ? Math.max(0, v) : RATION_SOLS_START; };
/** What the player sees: whole Sols, rounded down, never negative. */
export const rationSolsLeft = (s: GameState): number => Math.floor(rationSols(s));
/** One served tray uses half a ration day. A Sol that passes with no tray served uses nothing. */
export const useRation = (s: GameState): void => { s.flags.ration_sols = Math.max(0, rationSols(s) - RATION_SOLS_PER_TRAY); };
export const foodSolsText = (s: GameState): string => `FOOD: ${rationSolsLeft(s)} Sols left`;

/** The serve beat at the hatch: only now do hunger, morale, meal history and player health change. */
export function serveTray(s: GameState): { ok: boolean; msg: string; fed: number } {
  if (!s.flags.tray_ready) return { ok: false, msg: 'There is no prepared tray to deliver.', fed: 0 };
  if (!s.ep || s.flags.quarantine_over) return { ok: false, msg: 'The crew is not waiting at the quarantine hatch.', fed: 0 };
  const items = String(s.flags.tray_items || '').split(',').filter(Boolean);
  s.flags.player_hunger = 0;                                              // Step 11b: you eat your portion too
  const fed = serveMeal(s); s.health = clamp(s.health + 3, 0, 100);
  const v = items.length ? recordTray(s, items) : 'neutral';
  for (const id of fed) s.crew[id].morale = clamp(s.crew[id].morale + (v === 'varied' ? VARIETY_BONUS : v === 'repeated' ? -VARIETY_PENALTY : 0), 0, 100);
  s.flags.meals_served = Number(s.flags.meals_served || 0) + 1; s.flags.tray_ready = 0; useRation(s);
  const extra = v === 'repeated' ? ' ' + REPEAT_MSG : v === 'varied' ? ' ' + VARIED_MSG : '';
  return { ok: true, msg: `Tray delivered. ${fed.length} crew member${fed.length === 1 ? '' : 's'} fed.${extra}`, fed: fed.length };
}

// ---------- Step 11a: meal variety rule ----------
export const MEAL_MEMORY_SOLS = 3;        // the last 3 Sols of trays are remembered
export const DOMINANT_SHARE = 0.5;        // one item making up half or more of the recent portions counts as "repeated"
export const VARIETY_BONUS = 2;           // extra morale for each fed crew member after a varied tray
export const VARIETY_PENALTY = 3;         // small morale loss after a repeated tray (never fatal: feeding itself still helps)
export const REPEAT_MSG = 'The crew liked the food, but they have eaten this meal several times.';
export const VARIED_MSG = 'Everyone enjoyed the variety. Morale is up.';
export type Variety = 'varied' | 'repeated' | 'neutral';

const sameTray = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

/** Pure: judges the newest tray (the last record) against the remembered ones. */
export function judgeVariety(recent: MealRecord[]): Variety {
  const cur = recent[recent.length - 1];
  if (!cur) return 'neutral';
  if (recent.length >= 2) {
    const counts: Record<string, number> = {}; let total = 0;
    for (const r of recent) for (const id of r.itemIds) { counts[id] = (counts[id] ?? 0) + 1; total++; }
    const top = Math.max(...Object.values(counts));
    if (top / total >= DOMINANT_SHARE || recent.filter(r => sameTray(r.itemIds, cur.itemIds)).length >= 2) return 'repeated';
  }
  return new Set(cur.itemIds).size >= 3 ? 'varied' : 'neutral';
}

/** Remembers a served tray (keeps only the last MEAL_MEMORY_SOLS Sols) and returns how varied the recent trays are. */
export function recordTray(s: GameState, itemIds: string[]): Variety {
  s.recentMeals = (s.recentMeals ?? []).filter(r => r.sol > s.sol - MEAL_MEMORY_SOLS);
  s.recentMeals.push({ sol: s.sol, itemIds: [...itemIds] });
  return judgeVariety(s.recentMeals);
}
