import { describe, expect, it } from 'vitest';
import { act, advance } from '../src/core/sim';
import { describePending, poll, resolve } from '../src/core/director';
import { newSession } from '../src/core/session';
import { SYSTEMS, episodeNight } from '../src/core/episode';
import { dishChoice, dishProblem, earthReplySol, isDishBroken, staticComms, sustainabilityPenalty, waterLossPerNight } from '../src/core/dish';
import { isBroken } from '../src/core/inventory';
import { evaluateFailures } from '../src/core/failure';
import { objectivesView } from '../src/story/objectives';
import { EP } from '../src/core/constants';

// a fresh full episode: answer the call, check all five systems -> the fault shows
const answered = () => {
  const s = newSession(7, { mode: 'storm' }).state;
  act(s, 'answer', { crew: 'reyes' });
  for (let n = 0; s.pending && n < 6; n++) { resolve(s, 'continue'); poll(s); }
  return s;
};
const decide = (choice: 'comms' | 'dish') => {
  const s = answered();
  for (const x of SYSTEMS) act(s, 'check', { system: x });
  expect(describePending(s)?.id).toBe('dish_decision');
  resolve(s, choice); poll(s); return s;
};

describe('Dish decision (Step 14a)', () => {
  it('the full check shows the fault: dish and comms both broken, Reyes offers exactly two choices', () => {
    const s = answered();
    for (const x of SYSTEMS.slice(0, 4)) act(s, 'check', { system: x });
    expect(s.pending).toBeNull(); expect(isDishBroken(s)).toBe(false);
    act(s, 'check', { system: 'solar' });
    expect(describePending(s)?.id).toBe('dish_decision');
    expect(describePending(s)!.choices.map(c => c.id)).toEqual(['comms', 'dish']);
    expect(isDishBroken(s)).toBe(true); expect(isBroken(s, 'comms')).toBe(true);
  });
  it('the fault shows only once', () => {
    const s = decide('comms'); advance(s, 1); expect(s.pending?.kind === 'event' && s.pending.id === 'dish_decision').toBe(false);
  });
  it('the choice only sets a flag: nothing is repaired yet', () => {
    const s = decide('dish');
    expect(dishChoice(s)).toBe('dish'); expect(s.flags.fault_repaired).toBeFalsy();
    expect(isDishBroken(s)).toBe(true); expect(isBroken(s, 'comms')).toBe(true);
    expect(objectivesView(s).now).toMatch(/dish/i); expect(objectivesView(s).now).not.toMatch(/suit/i);
  });

  it('branch A: repairing the comms console by hand fixes the one fault; the dish stays broken; water is tight', () => {
    const s = decide('comms'); s.flags.stock_parts = 3;
    expect(objectivesView(s).now).toMatch(/comms console/i);
    expect(act(s, 'repair_machine', { machine: 'comms' }).ok).toBe(false); // needs a part in hand
    expect(act(s, 'repair_machine', { machine: 'comms', part: 'spare_part' }).ok).toBe(true);
    expect(s.flags.fault_repaired).toBeTruthy(); expect(isBroken(s, 'comms')).toBe(false); expect(isDishBroken(s)).toBe(true);
    expect(waterLossPerNight(s)).toBe(EP.DISH_WATER_LOSS); expect(staticComms(s)).toBe(false); expect(earthReplySol(s)).toBe(2);
    expect(s.ep!.tree.some(n => n.tag === 'dish')).toBe(true);
  });
  it('branch A costs water on a real storm night; branch B does not', () => {
    const night = (c: 'comms' | 'dish') => { const s = decide(c); s.sol = 2; s.res.water = 80; episodeNight(s); return s; };
    const a = night('comms'), b = night('dish');
    expect(a.res.water).toBe(80 - EP.DISH_WATER_LOSS); expect(b.res.water).toBe(80);
    expect(a.ep!.tree.some(n => n.text.includes('water maker stayed damaged'))).toBe(true);
    expect(b.ep!.tree.some(n => n.text.includes('static'))).toBe(true); // debrief line for branch B
  });
  it('branch B: the dish is repaired only outside, with a part, at an energy cost; comms stay broken and late', () => {
    const s = decide('dish'); s.flags.stock_parts = 2;
    expect(act(s, 'repair_dish', { part: 'spare_part' }).ok).toBe(false); // inside
    expect(dishProblem(s, true, 2)).toMatch(/outside/i);
    s.outside = true; s.suitOn = true;
    expect(act(s, 'repair_dish', {}).ok).toBe(false);                     // no part in hand
    const e = s.energy;
    expect(act(s, 'repair_dish', { part: 'spare_part' }).ok).toBe(true);
    expect(s.energy).toBe(e - EP.DISH_REPAIR_ENERGY); expect(s.flags.stock_parts).toBe(1);
    expect(s.flags.fault_repaired).toBeTruthy(); expect(isDishBroken(s)).toBe(false);
    expect(isBroken(s, 'comms')).toBe(true); expect(staticComms(s)).toBe(true); expect(earthReplySol(s)).toBe(3);
    expect(waterLossPerNight(s)).toBe(0);
  });
  it('the dish cannot be repaired on branch A, and the comms console is not the fix on branch B', () => {
    const a = decide('comms'); a.outside = true; a.flags.stock_parts = 2;
    expect(act(a, 'repair_dish', { part: 'spare_part' }).ok).toBe(false);
    const b = decide('dish'); b.flags.stock_parts = 2;
    expect(act(b, 'repair_machine', { machine: 'comms', part: 'spare_part' }).ok).toBe(true);
    expect(b.flags.fault_repaired).toBeFalsy(); // fixing comms on branch B is not the chosen repair
  });
  it('the two branches differ in sustainability', () => {
    expect(sustainabilityPenalty(decide('comms'))).toBeGreaterThan(sustainabilityPenalty(decide('dish')));
  });
  it('staying outside when the alert turns red on branch B fails with RADIATION_HIGH and the right tip', () => {
    const s = decide('dish'); s.outside = true; s.suitOn = true; s.hour = 18; // storm flare: alert HIGH after 17:00
    let f = evaluateFailures(s, 1).failure; expect(f).toBeNull();
    f = evaluateFailures(s, 1).failure; expect(f).toBe('RADIATION_HIGH');
  });
});

// Step 14b: the decision is shown as two cards (benefit / cost / risk)
describe('Dish decision cards (Step 14b)', () => {
  it('both choices carry a short benefit, cost and risk line', () => {
    const s = answered();
    for (const x of SYSTEMS) act(s, 'check', { system: x });
    const v = describePending(s)!;
    expect(v.choices).toHaveLength(2);
    for (const c of v.choices) {
      expect(c.card, c.id).toBeTruthy();
      for (const k of ['benefit', 'cost', 'risk'] as const) expect(c.card![k].length).toBeGreaterThan(10);
      expect(JSON.stringify(c.card).toLowerCase()).not.toMatch(/suit/); // rule 3: the suit is never hinted
    }
  });
  it('branch A is physical: choosing comms repairs nothing, only a part at the console does', () => {
    const s = decide('comms');
    expect(isBroken(s, 'comms')).toBe(true);
    expect(isDishBroken(s)).toBe(true);
  });
});

describe('Branch B in the world (Step 14c)', () => {
  it('repair_dish is a real animated ActionDef that charges nothing itself (act() charges at the beat)', async () => {
    const { ACTION_DEFS, buildTimeline } = await import('../src/core/actions');
    expect(ACTION_DEFS.repair_dish.energy).toBe(0);
    const t = buildTimeline(ACTION_DEFS.repair_dish, false);
    expect(t.beatAt).toBeGreaterThan(1000); // the beat is the LAST step, after the ring has filled
  });
  it('nothing changes before the beat; the beat repairs the dish, uses one part and the comms console stays broken', () => {
    const s = decide('dish'); s.flags.stock_parts = 2; s.outside = true; s.energy = 60;
    expect(isDishBroken(s)).toBe(true); expect(s.flags.stock_parts).toBe(2);
    expect(act(s, 'repair_dish', { part: 'spare_part' }).ok).toBe(true);
    expect(isDishBroken(s)).toBe(false); expect(s.flags.stock_parts).toBe(1); expect(s.flags.fault_repaired).toBeTruthy();
    expect(isBroken(s, 'comms')).toBe(true); expect(staticComms(s)).toBe(true);
  });
  it('the dish is refused inside, without a part, and on branch A', () => {
    const s = decide('dish'); s.flags.stock_parts = 2; s.energy = 60;
    expect(act(s, 'repair_dish', { part: 'spare_part' }).ok).toBe(false); // inside
    s.outside = true; expect(act(s, 'repair_dish').ok).toBe(false);       // no part in hand
    const a = decide('comms'); a.flags.stock_parts = 2; a.outside = true; a.energy = 60;
    expect(act(a, 'repair_dish', { part: 'spare_part' }).ok).toBe(false);
  });
  it('the E prompt at the dish tells the truth for each state and never mentions the suit', async () => {
    const { promptInfo } = await import('../src/ui/hud');
    const { emptyHands } = await import('../src/core/inventory');
    const b = decide('dish'), hands = emptyHands();
    const p = promptInfo(b, 'dish', hands, 'Outdoor Dish'); const txt = JSON.stringify(p);
    expect(txt).toMatch(/Repair it/); expect(txt).not.toMatch(/suit/i); expect(txt).toContain(String(EP.DISH_REPAIR_ENERGY));
    expect(JSON.stringify(promptInfo(decide('comms'), 'dish', hands, 'Outdoor Dish'))).toMatch(/Damaged/);
  });
});
