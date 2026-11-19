import { describe, expect, it } from 'vitest';
import { act, newGame } from '../src/core/sim';
import type { GameState } from '../src/core/types';
import { RATION_SOLS_START } from '../src/core/constants';
import { FOOD_ITEMS, LOCKED_CROP_MSG, NASA_MEALS, PRODUCE_ITEMS, SPACE_MEALS, addProduce, cookServe, foodItem, produceStock, trayProblem, serveTray, rationSols, rationSolsLeft, useRation, foodSolsText } from '../src/core/meals';

describe('Episode 1 kitchen tray', () => {
  it('charges hydration, heater power, energy and limited NASA meal stock only for a full five-portion tray', () => {
    const s = newGame(7, { mode: 'storm' });
    s.crew.reyes.hunger = 80;
    const before = { water: s.res.water, power: s.res.power, energy: s.energy };
    const tray = ['eggs', 'oatmeal', 'soup', 'chicken', 'mac'];
    expect(act(s, 'cook_serve', { tray: JSON.stringify(tray) }).ok).toBe(true);
    expect(s.res.water).toBeCloseTo(before.water - 0.6);
    expect(s.res.power).toBe(before.power - 5);
    expect(s.energy).toBe(before.energy - 6);
    expect(s.flags.meal_eggs).toBe(7);
    // Step 2d: preparing the tray feeds nobody. Feeding waits for the serve beat at the hatch.
    expect(s.flags.tray_ready).toBe(1);
    expect(s.crew.reyes.hunger).toBe(80);
    expect(act(s, 'serve_tray').ok).toBe(true);
    expect(s.crew.reyes.hunger).toBe(0);
    expect(s.health).toBe(100);
  });

  it('does not feed, change health or count a meal before the serve beat, and keeps the tray if interrupted', () => {
    const s = newGame(9, { mode: 'storm' });
    s.crew.reyes.hunger = 80; s.health = 90;
    const served = Number(s.flags.meals_served || 0);
    expect(act(s, 'serve_tray').ok).toBe(false);                       // no tray yet
    const tray = ['almonds', 'tortilla', 'eggs', 'chicken', 'mac'];
    const water = s.res.water, power = s.res.power;
    expect(act(s, 'cook_serve', { tray: JSON.stringify(tray) }).ok).toBe(true);
    expect(s.res.water).toBeLessThan(water); expect(s.res.power).toBeLessThan(power);   // spent at confirm
    expect(s.crew.reyes.hunger).toBe(80); expect(s.health).toBe(90); expect(Number(s.flags.meals_served || 0)).toBe(served);
    // interrupted: wait, do other things; resources stay spent and the tray is still waiting
    const spentWater = s.res.water, spentPower = s.res.power;
    expect(act(s, 'cook_serve', { tray: JSON.stringify(tray) }).ok).toBe(false);       // cannot cook a second tray
    expect(s.res.water).toBe(spentWater); expect(s.res.power).toBe(spentPower);
    expect(s.flags.tray_ready).toBe(1);
    expect(act(s, 'serve_tray').ok).toBe(true);                         // the serve beat
    expect(s.crew.reyes.hunger).toBe(0); expect(s.health).toBe(93); expect(Number(s.flags.meals_served)).toBe(served + 1);
    expect(s.flags.tray_ready).toBe(0);
    expect(act(s, 'serve_tray').ok).toBe(false);                        // cannot serve the same tray twice
  });

  it('does not spend supplies if the tray is incomplete or the heater cannot be powered', () => {
    const s = newGame(8, { mode: 'storm' });
    s.crew.reyes.hunger = 80;
    expect(act(s, 'cook_serve', { tray: JSON.stringify(['chicken']) }).ok).toBe(false);
    expect(s.flags.meal_chicken).toBeUndefined();
    s.res.power = 1;
    expect(act(s, 'cook_serve', { tray: JSON.stringify(['chicken', 'chicken', 'chicken', 'chicken', 'chicken']) }).msg).toMatch(/power/i);
    expect(s.flags.meal_chicken).toBeUndefined();
    expect(act(s, 'cook_serve', { tray: '{}' }).ok).toBe(false);
    expect(s.flags.meal_chicken).toBeUndefined();
  });
});

describe('Step 9a: one food item type', () => {
  const hungry = (seed = 11) => { const s = newGame(seed, { mode: 'storm' }); s.crew.reyes.hunger = 80; return s; };
  const snap = (s: ReturnType<typeof newGame>) => JSON.stringify({ f: s.flags, r: s.res, e: s.energy });

  it('keeps the 8 NASA meals exactly', () => {
    const rows = NASA_MEALS.map(m => [m.id, m.method, m.water, m.power, m.minutes, m.stock]);
    expect(rows).toEqual([
      ['almonds', 'READY_TO_EAT', 0, 0, 0, 12], ['eggs', 'HYDRATE', 0.2, 0, 4, 8], ['chicken', 'HEAT', 0, 3, 5, 10], ['beef', 'HEAT', 0, 3, 5, 6],
      ['oatmeal', 'HYDRATE', 0.15, 0, 3, 9], ['mac', 'HEAT', 0, 2, 4, 7], ['tortilla', 'READY_TO_EAT', 0, 0, 0, 15], ['soup', 'HYDRATE', 0.25, 0, 4, 8],
    ]);
    expect(NASA_MEALS.every(m => m.category === 'space-meal')).toBe(true);
    expect(SPACE_MEALS.map(m => m.method)).toContain('READY TO EAT');      // legacy display view still feeds the panel and the cook animations
  });

  it('has 7 produce items; lettuce, potato, bean open, the other four locked behind unlock_<crop>', () => {
    expect(PRODUCE_ITEMS.map(p => p.id)).toEqual(['lettuce', 'potato', 'bean', 'tomato', 'carrot', 'spinach', 'wheat']);
    for (const p of PRODUCE_ITEMS) { expect(p.category).toBe('farm-produce'); expect(p.method).toBe('FARM_PRODUCE'); expect(p.cropId).toBe(p.id); expect(p.stock).toBe(0); expect(p.water).toBeGreaterThan(0); expect(p.power).toBeLessThanOrEqual(1); expect(p.minutes).toBeGreaterThan(0); }
    expect(PRODUCE_ITEMS.filter(p => !p.unlockFlag).map(p => p.id)).toEqual(['lettuce', 'potato', 'bean']);
    expect(PRODUCE_ITEMS.filter(p => p.unlockFlag).map(p => p.unlockFlag)).toEqual(['unlock_tomato', 'unlock_carrot', 'unlock_spinach', 'unlock_wheat']);
    expect(new Set(FOOD_ITEMS.map(f => f.id)).size).toBe(FOOD_ITEMS.length);
  });

  it('produce stock is the harvested count', () => {
    const s = hungry();
    expect(produceStock(s, 'lettuce')).toBe(0);
    addProduce(s, 'lettuce', 2); addProduce(s, 'lettuce');
    expect(produceStock(s, 'lettuce')).toBe(3);
  });

  it('cooks a mixed tray of NASA meals and produce: deducts exactly stock, water and power, then feeds only at the serve beat', () => {
    const s = hungry(); addProduce(s, 'lettuce', 2); addProduce(s, 'potato', 1);
    const w = s.res.water, p = s.res.power;
    const tray = ['eggs', 'chicken', 'lettuce', 'lettuce', 'potato'];
    expect(act(s, 'cook_serve', { tray: JSON.stringify(tray) }).ok).toBe(true);
    expect(s.flags.meal_eggs).toBe(7); expect(s.flags.meal_chicken).toBe(9);
    expect(produceStock(s, 'lettuce')).toBe(0); expect(produceStock(s, 'potato')).toBe(0);
    expect(s.res.water).toBeCloseTo(w - (0.2 + 0.05 + 0.05 + 0.1)); expect(s.res.power).toBeCloseTo(p - (3 + 1));
    expect(s.crew.reyes.hunger).toBe(80);
    expect(act(s, 'serve_tray').ok).toBe(true); expect(s.crew.reyes.hunger).toBe(0);
  });

  it('a produce-only tray works (five harvested portions across unlocked crops)', () => {
    const s = hungry(); addProduce(s, 'lettuce', 2); addProduce(s, 'bean', 2); addProduce(s, 'potato', 1);
    expect(cookServe(s, ['lettuce', 'lettuce', 'bean', 'bean', 'potato']).ok).toBe(true);
    expect(s.flags.tray_ready).toBe(1);
    for (const c of ['lettuce', 'bean', 'potato'] as const) expect(produceStock(s, c)).toBe(0);
    expect(s.flags.meal_almonds).toBeUndefined();                          // NASA stock untouched
  });

  it('any combination is allowed, including five of one item', () => {
    const s = hungry();
    expect(cookServe(s, ['almonds', 'almonds', 'almonds', 'almonds', 'almonds']).ok).toBe(true);
    expect(s.flags.meal_almonds).toBe(7);
  });

  it('rejects not enough stock (NASA and produce) with no deduction', () => {
    const s = hungry(); addProduce(s, 'lettuce', 1); s.flags.meal_beef = 1;
    const before = snap(s);
    expect(cookServe(s, ['beef', 'beef', 'almonds', 'almonds', 'almonds']).msg).toMatch(/Beef brisket/);
    expect(cookServe(s, ['lettuce', 'lettuce', 'almonds', 'almonds', 'almonds']).msg).toMatch(/Lettuce.*harvested/);
    expect(cookServe(s, ['potato', 'almonds', 'almonds', 'almonds', 'almonds']).ok).toBe(false);   // none harvested
    expect(snap(s)).toBe(before);
  });

  it('rejects not enough water or power with no deduction', () => {
    const s = hungry(); addProduce(s, 'potato', 3); addProduce(s, 'bean', 2);
    s.res.water = 0.1;
    let before = snap(s);
    expect(cookServe(s, ['soup', 'almonds', 'almonds', 'almonds', 'almonds']).msg).toMatch(/water/i);
    expect(cookServe(s, ['lettuce', 'potato', 'potato', 'potato', 'bean']).ok).toBe(false);
    expect(snap(s)).toBe(before);
    s.res.water = 50; s.res.power = 2;                                          // produce heat: 3 potatoes + 2 beans = 5 power
    before = snap(s);
    expect(cookServe(s, ['potato', 'potato', 'potato', 'bean', 'bean']).msg).toMatch(/power/i);
    expect(snap(s)).toBe(before);
  });

  it('rejects locked produce, with the exact Aoki message, even with harvested stock, and accepts it once unlocked', () => {
    const s = hungry(); addProduce(s, 'tomato', 2); for (const c of ['carrot', 'spinach', 'wheat'] as const) addProduce(s, c, 1);
    const before = snap(s);
    const r = cookServe(s, ['tomato', 'tomato', 'almonds', 'almonds', 'almonds']);
    expect(r.ok).toBe(false); expect(r.msg).toBe(LOCKED_CROP_MSG);
    expect(LOCKED_CROP_MSG).toBe('Build your relationship with Dr Aoki, the Botanist, to unlock this crop.');
    for (const c of ['carrot', 'spinach', 'wheat']) { expect(trayProblem(s, [c, 'almonds', 'almonds', 'almonds', 'almonds'])).toBe(LOCKED_CROP_MSG); }
    expect(act(s, 'cook_serve', { tray: JSON.stringify(['tomato', 'almonds', 'almonds', 'almonds', 'almonds']) }).ok).toBe(false);
    expect(snap(s)).toBe(before);
    s.flags.unlock_tomato = 1;
    expect(cookServe(s, ['tomato', 'tomato', 'almonds', 'almonds', 'almonds']).ok).toBe(true);
    expect(produceStock(s, 'tomato')).toBe(0);
  });

  it('invalid trays change nothing: wrong size, unknown id, non-strings, tray already carried, nobody hungry', () => {
    const s = hungry(); addProduce(s, 'lettuce', 5);
    const before = snap(s);
    for (const bad of [[], ['lettuce'], ['lettuce', 'lettuce', 'lettuce', 'lettuce', 'lettuce', 'lettuce'], ['lettuce', 'lettuce', 'lettuce', 'lettuce', 'pizza'], ['lettuce', 'lettuce', 'lettuce', 'lettuce', 7 as unknown as string]])
      expect(cookServe(s, bad).ok).toBe(false);
    expect(trayProblem(s, 'lettuce')).toMatch(/five/);
    expect(snap(s)).toBe(before);
    expect(cookServe(s, ['lettuce', 'lettuce', 'lettuce', 'lettuce', 'lettuce']).ok).toBe(true);
    const mid = snap(s);
    expect(cookServe(s, ['almonds', 'almonds', 'almonds', 'almonds', 'almonds']).ok).toBe(false);   // first tray not served yet
    expect(snap(s)).toBe(mid);
    const calm = newGame(12, { mode: 'storm' }); Object.values(calm.crew).forEach(c => { c.hunger = 0; });
    expect(trayProblem(calm, ['almonds', 'almonds', 'almonds', 'almonds', 'almonds'])).toMatch(/hungry/i);
  });

  it('foodItem finds meals and produce and ignores junk', () => {
    expect(foodItem('eggs')?.category).toBe('space-meal'); expect(foodItem('wheat')?.cropId).toBe('wheat');
    expect(foodItem('nope')).toBeUndefined(); expect(foodItem(5)).toBeUndefined();
  });
});

import { REPEAT_MSG, judgeVariety, recordTray } from '../src/core/meals';
import { deserialize, newSession, serialize } from '../src/core/session';

describe('Step 11a: meal variety rule', () => {
  const serve = (s: ReturnType<typeof newGame>, tray: string[]) => {
    for (const id of ['reyes', 'aiko', 'david', 'sofia'] as const) s.crew[id].hunger = 60;
    s.energy = 100; s.res.water = 100; s.res.power = 100;
    for (const f of FOOD_ITEMS) if (f.category === 'space-meal') s.flags[`meal_${f.id}`] = 99;
    expect(act(s, 'cook_serve', { tray: JSON.stringify(tray) }).ok).toBe(true);
    return act(s, 'serve_tray');
  };
  const set = ['almonds', 'tortilla', 'almonds', 'tortilla', 'almonds'];
  const mixes = [['almonds', 'tortilla', 'eggs', 'chicken', 'mac'], ['soup', 'oatmeal', 'beef', 'almonds', 'tortilla'], ['eggs', 'mac', 'chicken', 'soup', 'oatmeal'], ['beef', 'tortilla', 'oatmeal', 'mac', 'almonds']];
  it('the same tray four times lowers morale versus varied trays, and says so', () => {
    const a = newGame(5, { mode: 'storm' }), b = newGame(5, { mode: 'storm' });
    let msg = '';
    for (let i = 0; i < 4; i++) { msg = serve(a, set).msg; serve(b, mixes[i]); }
    expect(msg).toContain(REPEAT_MSG);
    expect(a.crew.reyes.morale).toBeLessThan(b.crew.reyes.morale);
  });
  it('a varied tray gives a small bonus and never drops morale', () => {
    const s = newGame(5, { mode: 'storm' }); const m0 = s.crew.reyes.morale;
    const r = serve(s, mixes[0]);
    expect(r.msg).toContain('variety'); expect(s.crew.reyes.morale).toBeGreaterThan(m0);
  });
  it('a repeated tray is a small penalty, not harm: a hungry crew still gains morale', () => {
    const s = newGame(5, { mode: 'storm' });
    serve(s, set); serve(s, set); const m = s.crew.reyes.morale; serve(s, set);
    expect(m - s.crew.reyes.morale).toBeLessThanOrEqual(3);
    expect(s.crew.reyes.hunger).toBe(0);
  });
  it('remembers only the last 3 Sols and survives save/load', () => {
    const s = newGame(5, { mode: 'storm' });
    s.sol = 1; recordTray(s, mixes[0]); s.sol = 3; recordTray(s, mixes[1]); s.sol = 5; recordTray(s, mixes[2]);
    expect(s.recentMeals.map(r => r.sol)).toEqual([3, 5]);
    expect(judgeVariety([])).toBe('neutral');
    const sess = newSession(2); sess.state.recentMeals = [{ sol: 1, itemIds: ['eggs'] }];
    expect(deserialize(serialize(sess))!.state.recentMeals).toHaveLength(1);
    const old = JSON.parse(serialize(sess)); delete old.state.recentMeals; old.state.version = 4;
    expect(deserialize(JSON.stringify(old))!.state.recentMeals).toEqual([]);
  });
});

import { playerHunger } from '../src/core/episode';
import { evaluateFailures } from '../src/core/failure';
import { advance, endSol } from '../src/core/sim';

describe('Step 11b: skipped meals and hunger', () => {
  const hours = (s: ReturnType<typeof newGame>, h: number) => { for (let i = 0; i < h * 4; i++) advance(s, 0.25); };
  it('your hunger rises, health falls slowly after a full skipped day, crew morale falls too', () => {
    const s = newGame(11, { mode: 'storm' }); s.pending = null;
    const m0 = s.crew.reyes.morale; hours(s, 12);
    expect(playerHunger(s)).toBeGreaterThanOrEqual(80);
    expect(s.health).toBeLessThan(100); expect(s.health).toBeGreaterThan(60);   // slow
    expect(s.crew.reyes.morale).toBeLessThan(m0);
  });
  it('one skipped meal (about 6 hours) never fails', () => {
    const s = newGame(12, { mode: 'storm' }); s.pending = null;
    for (let i = 0; i < 24; i++) { advance(s, 0.25); expect(evaluateFailures(s, 0.25).failure).toBeNull(); }
    expect(s.health).toBeGreaterThan(90);
  });
  it('feeding resets hunger and health recovers slowly afterwards', () => {
    const s = newGame(13, { mode: 'storm' }); s.pending = null;
    hours(s, 10); const low = s.health; expect(low).toBeLessThan(100);
    s.energy = 100; s.res.water = 100; s.res.power = 100;
    expect(act(s, 'cook_serve', { tray: JSON.stringify(['almonds', 'tortilla', 'eggs', 'chicken', 'mac']) }).ok).toBe(true);
    expect(act(s, 'serve_tray').ok).toBe(true);
    expect(playerHunger(s)).toBe(0);
    const h1 = s.health; hours(s, 3);
    expect(s.health).toBeGreaterThan(h1);
  });
  it('the last meals are kept for the crew panel', () => {
    const s = newGame(14, { mode: 'storm' }); s.pending = null; s.energy = 100;
    for (const id of ['reyes', 'aiko', 'david', 'sofia'] as const) s.crew[id].hunger = 60;
    act(s, 'cook_serve', { tray: JSON.stringify(['almonds', 'tortilla', 'eggs', 'chicken', 'mac']) }); act(s, 'serve_tray');
    expect(s.recentMeals[0].itemIds).toHaveLength(5);
  });
  it('nothing crashes across a night', () => { const s = newGame(15, { mode: 'storm' }); s.pending = null; endSol(s); expect(playerHunger(s)).toBeGreaterThanOrEqual(30); });
});

describe('ration pool in Sols (Step 24l)', () => {
  const fresh = () => { const s = newGame(1, { mode: 'storm' }); s.pending = null; return s; };
  const serveOne = (s: GameState) => { s.flags.tray_ready = 1; s.flags.tray_items = 'almonds'; return serveTray(s); };
  it('starts at 180 Sols and the text says Sols, not portions', () => {
    const s = fresh(); expect(rationSolsLeft(s)).toBe(180); expect(RATION_SOLS_START).toBe(180); expect(foodSolsText(s)).toBe('FOOD: 180 Sols left'); expect(foodSolsText(s)).not.toMatch(/portion/i);
  });
  it('two served trays remove exactly 1 Sol; one tray shows the rounded-down whole number', () => {
    const s = fresh(); expect(serveOne(s).ok).toBe(true); expect(rationSols(s)).toBe(179.5); expect(rationSolsLeft(s)).toBe(179);
    expect(serveOne(s).ok).toBe(true); expect(rationSols(s)).toBe(179); expect(foodSolsText(s)).toBe('FOOD: 179 Sols left');
  });
  it('cooking alone and a failed serve use nothing', () => {
    const s = fresh(); expect(serveTray(s).ok).toBe(false); expect(rationSols(s)).toBe(180);
  });
  it('never negative', () => { const s = fresh(); s.flags.ration_sols = 0.5; useRation(s); useRation(s); expect(rationSols(s)).toBe(0); expect(rationSolsLeft(s)).toBe(0); });
  it('a Sol that passes with no meals served keeps the pool', () => { const s = fresh(); endSol(s); expect(rationSolsLeft(s)).toBe(180); });
  it('save/load keeps the pool; an old save without it starts at 180', () => {
    const s = fresh(); serveOne(s); const back = JSON.parse(JSON.stringify(s)) as GameState; expect(rationSols(back)).toBe(179.5);
    delete back.flags.ration_sols; expect(rationSolsLeft(back)).toBe(180);
  });
});
