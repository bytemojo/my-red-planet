import { CREW_LIFE } from './constants';
import { serveMeal } from './crewlife';
import { clamp } from './util';
import type { GameState } from './types';

export const SPACE_MEALS = [
  { id: 'almonds', name: 'Almonds & dried fruit', method: 'READY TO EAT', water: 0, power: 0, minutes: 0, stock: 12, icon: '🥜' },
  { id: 'eggs', name: 'Scrambled eggs', method: 'HYDRATE', water: 0.2, power: 0, minutes: 4, stock: 8, icon: '🍳' },
  { id: 'chicken', name: 'Chicken & rice', method: 'HEAT', water: 0, power: 3, minutes: 5, stock: 10, icon: '🍚' },
  { id: 'beef', name: 'Beef brisket', method: 'HEAT', water: 0, power: 3, minutes: 5, stock: 6, icon: '🥩' },
  { id: 'oatmeal', name: 'Oatmeal with blueberries', method: 'HYDRATE', water: 0.15, power: 0, minutes: 3, stock: 9, icon: '🫐' },
  { id: 'mac', name: 'Macaroni & cheese', method: 'HEAT', water: 0, power: 2, minutes: 4, stock: 7, icon: '🧀' },
  { id: 'tortilla', name: 'Flour tortillas', method: 'READY TO EAT', water: 0, power: 0, minutes: 0, stock: 15, icon: '🫓' },
  { id: 'soup', name: 'Vegetable soup', method: 'HYDRATE', water: 0.25, power: 0, minutes: 4, stock: 8, icon: '🥣' },
] as const;
export type MealId = typeof SPACE_MEALS[number]['id'];
export const mealStock = (s: GameState, id: MealId) => Number(s.flags[`meal_${id}`] ?? SPACE_MEALS.find(m => m.id === id)!.stock);

export function cookServe(s: GameState, selection: string[]): { ok: boolean; msg: string } {
  if (!s.ep || s.flags.quarantine_over) return { ok: false, msg: 'The crew is not waiting at the quarantine hatch.' };
  if (selection.length !== 5) return { ok: false, msg: 'Choose exactly five portions for the crew and you.' };
  const counts = new Map<string, number>();
  for (const id of selection) counts.set(id, (counts.get(id) ?? 0) + 1);
  const meals = [...counts].map(([id, count]) => ({ meal: SPACE_MEALS.find(m => m.id === id), count }));
  if (meals.some(x => !x.meal)) return { ok: false, msg: 'That meal is not on the menu.' };
  for (const { meal, count } of meals) if (meal && mealStock(s, meal.id) < count) return { ok: false, msg: `Not enough ${meal.name} left.` };
  const water = meals.reduce((n, x) => n + (x.meal?.water ?? 0) * x.count, 0);
  const power = meals.reduce((n, x) => n + (x.meal?.power ?? 0) * x.count, 0);
  if (s.res.water < water) return { ok: false, msg: 'Not enough water to hydrate the tray.' };
  if (s.res.power < power) return { ok: false, msg: 'Not enough station power to heat the tray.' };
  if (!Object.values(s.crew).some(c => c.hunger >= CREW_LIFE.PECKISH_AT)) return { ok: false, msg: 'Nobody is hungry right now.' };
  meals.forEach(({ meal, count }) => { if (meal) s.flags[`meal_${meal.id}`] = mealStock(s, meal.id) - count; });
  s.res.water = clamp(s.res.water - water, 0, 100); s.res.power = clamp(s.res.power - power, 0, 100);
  const fed = serveMeal(s); s.health = clamp(s.health + 3, 0, 100);
  s.flags.meals_served = Number(s.flags.meals_served || 0) + 1;
  return { ok: true, msg: `Prepared five portions and served ${fed.length} crew members. The heater used ${power} power.` };
}
