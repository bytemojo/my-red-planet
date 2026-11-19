import { describe, expect, it } from 'vitest';
import { PROP_IDS, PROP_NAMES, emptyHands, pickUp, putDown, pumpProblem, NEED_PART_MSG, NO_PARTS_MSG, MACHINE_IDS, isBroken, breakMachine, machineProblem, brokenKitchenMachine, type Hands } from '../src/core/inventory';
import { ACTION_ENERGY } from '../src/core/constants';
import { PROP_RACKS, rackByZone, rackMarker, rackStand, rackZone } from '../src/game/racks';
import { PROP_ART } from '../src/game/pixelart';

describe('one held item at a time', () => {
  it('starts empty-handed', () => { expect(emptyHands().item).toBeNull(); });
  it('picks one item up', () => {
    const h = emptyHands(), r = pickUp(h, 'sprinkler');
    expect(r.ok).toBe(true); expect(h.item).toBe('sprinkler');
  });
  it('refuses a second item and tells the player to put the first one down', () => {
    const h = emptyHands(); pickUp(h, 'sprinkler');
    const r = pickUp(h, 'seed_packet');
    expect(r.ok).toBe(false); expect(r.msg).toBe('Put your item down first.'); expect(h.item).toBe('sprinkler'); // nothing changed
  });
  it('picking up the same item twice is also refused', () => {
    const h = emptyHands(); pickUp(h, 'tray'); expect(pickUp(h, 'tray').ok).toBe(false); expect(h.item).toBe('tray');
  });
  it('puts it down and can then pick something else', () => {
    const h = emptyHands(); pickUp(h, 'spare_part');
    expect(putDown(h, 'spare_part').ok).toBe(true); expect(h.item).toBeNull();
    expect(pickUp(h, 'ice_sample').ok).toBe(true); expect(h.item).toBe('ice_sample');
  });
  it('cannot put down nothing, and cannot put an item on the wrong rack', () => {
    const h = emptyHands(); expect(putDown(h).ok).toBe(false);
    pickUp(h, 'sprinkler'); expect(putDown(h, 'seed_packet').ok).toBe(false); expect(h.item).toBe('sprinkler');
  });
  it('every prop has a name and drawn art', () => {
    expect(PROP_IDS.length).toBeGreaterThanOrEqual(5);
    for (const id of PROP_IDS) { expect(PROP_NAMES[id].length).toBeGreaterThan(2); expect(PROP_ART[id].rows.length).toBeGreaterThan(4); }
  });
});

describe('prop racks (data)', () => {
  it('there are three racks giving three different props', () => {
    expect(PROP_RACKS.length).toBe(3); expect(new Set(PROP_RACKS.map(r => r.item)).size).toBe(3);
    for (const r of PROP_RACKS) expect(PROP_IDS).toContain(r.item);
  });
  it('zones are unique, never overlap each other, and are found by zone id', () => {
    expect(new Set(PROP_RACKS.map(r => r.zone)).size).toBe(PROP_RACKS.length);
    const z = PROP_RACKS.map(rackZone);
    for (let i = 0; i < z.length; i++) for (let j = i + 1; j < z.length; j++) {
      const a = z[i], b = z[j], overlap = a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1; expect(overlap).toBe(false);
    }
    for (const r of PROP_RACKS) expect(rackByZone(r.zone)).toBe(r);
  });
  it('the stand-point is on the floor tile next to the rack, inside its zone', () => {
    for (const r of PROP_RACKS) {
      const st = rackStand(r), tx = Math.floor(st.x / 32), ty = Math.floor(st.y / 32), z = rackZone(r);
      if (r.wall === 'north' || r.wall === 'stand') { expect(tx).toBe(r.wallX); expect(ty).toBe(r.y + 1); } else { expect(tx).toBe(r.wallX + 1); expect(ty).toBe(r.y); }
      expect(tx >= z.x0 && tx <= z.x1 && ty >= z.y0 && ty <= z.y1).toBe(true);
      expect(rackMarker(r)[0] * 32).toBeCloseTo(st.x, 5);
    }
  });
});

import { BIN_IDS, binView, stockOf, unlockedCrops, plantProblem, NEED_PACKET_MSG, wateringProblem, NEED_SPRINKLER_MSG, harvestProblem, readyBeds, HARVEST_NEED_FREE_HANDS } from '../src/core/inventory';
import { newGame, act } from '../src/core/sim';
import { ACTION_DEFS } from '../src/core/actions';

describe('storage bin stock (Step 3b)', () => {
  it('every bin has a stock view and a free action', () => {
    expect(BIN_IDS.length).toBe(6);
    expect(ACTION_DEFS.open_bin.energy).toBe(0);
  });
  it('food counts come from the real meal stock', () => {
    const s = newGame(1), v = binView(s, 'food');
    expect(v.lines.length).toBe(8); expect(v.total).toBe(12 + 8 + 10 + 6 + 9 + 7 + 15 + 8);
    s.flags.meal_beef = 2; expect(binView(s, 'food').lines.find(l => l.label === 'Beef brisket')!.count).toBe(2);
  });
  it('parts and filters use defaults, then flags, never negative', () => {
    const s = newGame(1); expect(stockOf(s, 'parts')).toBe(3); expect(binView(s, 'filters').total).toBe(2);
    s.flags.stock_parts = 1; expect(binView(s, 'parts').total).toBe(1); s.flags.stock_parts = -4; expect(stockOf(s, 'parts')).toBe(0);
  });
  it('viewing a bin never changes the game state', () => {
    const s = newGame(1), before = JSON.stringify(s); BIN_IDS.forEach(id => binView(s, id)); expect(JSON.stringify(s)).toBe(before);
  });
});

describe('seed drawer (Step 3c)', () => {
  it('offers only unlocked crops', () => {
    const s = newGame(1); expect([...unlockedCrops(s)].sort()).toEqual(['bean', 'lettuce', 'potato']);
    s.flags.unlock_tomato = true; expect(unlockedCrops(s)).toContain('tomato');
  });
  it('the packet remembers its crop and forgets it when put back', () => {
    const h = emptyHands(); expect(pickUp(h, 'seed_packet', 'bean').ok).toBe(true); expect(h.crop).toBe('bean');
    expect(pickUp(h, 'sprinkler').msg).toBe('Put your item down first.'); expect(h.crop).toBe('bean');
    putDown(h, 'seed_packet'); expect(h.item).toBeNull(); expect(h.crop).toBeNull();
  });
  it('wall racks live in the storage room and have unique stand tiles that are not bin tiles (the water can stand is next to the farm, Step 24f)', () => {
    for (const r of PROP_RACKS.filter(x => x.wall !== 'stand')) { const st = rackStand(r), tx = Math.floor(st.x / 32), ty = Math.floor(st.y / 32); expect(tx >= 19 && tx <= 28 && ty >= 19 && ty <= 20).toBe(true); expect(tx < 23 || ty !== 20).toBe(true); }
  });
});

describe('plantProblem (Step 6a)', () => {
  const hold = (item: any, crop: any = null) => ({ item, crop });
  it('explains what is missing, and allows planting only with a packet, an empty bed and energy', () => {
    const s = newGame(1); const bed = s.plots[0]; bed.crop = null; s.plots[1].crop = 'potato';
    expect(plantProblem(s, hold(null), bed.id)).toBe(NEED_PACKET_MSG);
    expect(plantProblem(s, hold('sprinkler'), bed.id)).toBe(NEED_PACKET_MSG);
    expect(plantProblem(s, hold('seed_packet', null), bed.id)).toBe(NEED_PACKET_MSG);
    expect(plantProblem(s, hold('seed_packet', 'lettuce'), 'nope')).toMatch(/bed/i);
    expect(plantProblem(s, hold('seed_packet', 'lettuce'), s.plots[1].id)).toMatch(/already growing/i);
    expect(plantProblem(s, hold('seed_packet', 'wheat'), bed.id)).toMatch(/do not have wheat/i); s.flags.unlock_wheat = true; expect(plantProblem(s, hold('seed_packet', 'wheat'), bed.id)).toBeNull();
    s.energy = 1; expect(plantProblem(s, hold('seed_packet', 'lettuce'), bed.id)).toMatch(/tired/i);
    s.energy = 50; expect(plantProblem(s, hold('seed_packet', 'lettuce'), bed.id)).toBeNull();
  });
});


describe('wateringProblem (Step 6b)', () => {
  const hold = (item: any) => ({ item, crop: null });
  it('needs the sprinkler, a planted dry bed, water and energy; the sprinkler is reusable on the next bed', () => {
    const s = newGame(1); const a = s.plots[0], b = s.plots[1]; a.crop = 'lettuce'; a.watered = false; b.crop = 'potato'; b.watered = false; s.plots[2].crop = null;
    expect(wateringProblem(s, hold(null), a.id)).toBe(NEED_SPRINKLER_MSG);
    expect(wateringProblem(s, hold('seed_packet'), a.id)).toBe(NEED_SPRINKLER_MSG);
    expect(wateringProblem(s, hold('sprinkler'), 'nope')).toMatch(/bed/i);
    expect(wateringProblem(s, hold('sprinkler'), s.plots[2].id)).toMatch(/nothing is growing/i);
    a.watered = true; expect(wateringProblem(s, hold('sprinkler'), a.id)).toMatch(/already watered/i);
    expect(wateringProblem(s, hold('sprinkler'), b.id)).toBeNull(); // one pickup, a second bed
    s.res.water = 0; expect(wateringProblem(s, hold('sprinkler'), b.id)).toMatch(/water/i); s.res.water = 50;
    s.energy = 1; expect(wateringProblem(s, hold('sprinkler'), b.id)).toMatch(/tired/i);
  });
  it('has a pour ActionDef whose beat is inside the animation and charges nothing itself', () => {
    const d = ACTION_DEFS.water_bed; expect(d.steps.every(x => x.pose === 'pour')).toBe(true); expect(d.beatStep).toBeGreaterThan(0); expect(d.beatStep).toBeLessThan(d.steps.length); expect(d.energy).toBe(0);
  });
});

describe('harvestProblem (Step 6c)', () => {
  const hold = (item: any, crop: any = null) => ({ item, crop });
  it('needs free hands, a ripe bed and energy; ripe beds are listed', () => {
    const s = newGame(1); const a = s.plots[0], b = s.plots[1]; a.crop = 'lettuce'; a.growth = 0; b.crop = 'potato'; b.growth = 99; s.plots[2].crop = null;
    expect(harvestProblem(s, hold('sprinkler'), b.id)).toBe(HARVEST_NEED_FREE_HANDS);
    expect(harvestProblem(s, hold('harvest', 'potato'), b.id)).toBe(HARVEST_NEED_FREE_HANDS);
    expect(harvestProblem(s, hold(null), 'nope')).toMatch(/bed/i);
    expect(harvestProblem(s, hold(null), s.plots[2].id)).toMatch(/nothing is growing/i);
    expect(harvestProblem(s, hold(null), a.id)).toMatch(/not ready/i);
    expect(readyBeds(s)).toEqual([1]);
    s.energy = 1; expect(harvestProblem(s, hold(null), b.id)).toMatch(/tired/i); s.energy = 50;
    expect(harvestProblem(s, hold(null), b.id)).toBeNull();
  });
  it('a carried harvest fills the hands (and remembers the crop) until it is put down', () => {
    const h = emptyHands(); expect(pickUp(h, 'harvest', 'carrot').ok).toBe(true); expect(h.crop).toBe('carrot');
    expect(pickUp(h, 'sprinkler').ok).toBe(false); expect(putDown(h, 'harvest').ok).toBe(true); expect(h.item).toBeNull(); expect(h.crop).toBeNull();
  });
  it('has reach ActionDefs for harvest and store with the beat inside the animation', () => {
    for (const id of ['harvest_crop', 'store_crop'] as const) { const d = ACTION_DEFS[id]; expect(d.beatStep).toBeGreaterThan(0); expect(d.beatStep).toBeLessThan(d.steps.length); expect(d.energy).toBe(0); }
  });
  it('the real harvest still empties the bed, spends energy and raises food at once (the beat calls act)', () => {
    const s = newGame(1); s.pending = null; const p = s.plots[0]; p.crop = 'lettuce'; p.growth = 99; s.res.food = 10; const en = s.energy;
    expect(act(s, 'harvest', { plot: p.id }).ok).toBe(true); expect(p.crop).toBeNull(); expect(s.res.food).toBeGreaterThan(10); expect(s.energy).toBeLessThan(en);
  });
});
describe('Step 13a: repairing the watering pump', () => {
  const afterStorm = () => { const s = newGame(5, { mode: 'storm' }); s.ep!.phase = 'after'; s.energy = 50; return s; };
  const part: Hands = { item: 'spare_part', crop: null };
  it('needs a spare part in hand, and says where to get one', () => {
    const s = afterStorm();
    expect(pumpProblem(s, emptyHands())).toBe(NEED_PART_MSG);
    expect(act(s, 'repair_watering')).toMatchObject({ ok: false, msg: NEED_PART_MSG });
    expect(s.ep!.wateringFixed).toBe(false); expect(s.energy).toBe(50); expect(stockOf(s, 'parts')).toBe(3);
    expect(pumpProblem(s, part)).toBeNull();
  });
  it('spends energy and exactly one part, and only then is the pump fixed', () => {
    const s = afterStorm();
    expect(act(s, 'repair_watering', { part: 'spare_part' }).ok).toBe(true);
    expect(s.ep!.wateringFixed).toBe(true); expect(s.energy).toBe(50 - ACTION_ENERGY.repair_watering); expect(stockOf(s, 'parts')).toBe(2);
    expect(pumpProblem(s, part)).toMatch(/already works/);
  });
  it('is refused before the storm ends, with no parts, or when too tired', () => {
    const s = afterStorm(); s.ep!.phase = 'storm';
    expect(pumpProblem(s, part)).toMatch(/storm is over/);
    const t = afterStorm(); t.flags.stock_parts = 0;
    expect(pumpProblem(t, part)).toBe(NO_PARTS_MSG); expect(act(t, 'repair_watering', { part: 'spare_part' }).ok).toBe(false);
    const u = afterStorm(); u.energy = 3; expect(pumpProblem(u, part)).toMatch(/too tired/);
  });
  it('the repair_pump ActionDef kneels, is free itself, and its beat is the last step', () => {
    const d = ACTION_DEFS.repair_pump;
    expect(d.steps.every(x => x.pose === 'kneel')).toBe(true); expect(d.energy).toBe(0); expect(d.beatStep).toBe(d.steps.length - 1);
  });
});

describe('Step 13b: repairing comms, microwave and heater', () => {
  const part = { item: 'spare_part', crop: null } as Hands;
  const fresh = () => { const s = newGame(5, { mode: 'storm' }); s.energy = 50; return s; };
  it('machines start working and breaking is just a flag', () => {
    const s = fresh();
    for (const m of MACHINE_IDS) { expect(isBroken(s, m)).toBe(false); expect(machineProblem(s, part, m)).toMatch(/already works/); }
    breakMachine(s, 'comms'); expect(isBroken(s, 'comms')).toBe(true); expect(isBroken(s, 'microwave')).toBe(false);
  });
  it('needs a part in hand; nothing changes without it', () => {
    const s = fresh(); breakMachine(s, 'microwave');
    expect(machineProblem(s, emptyHands(), 'microwave')).toBe(NEED_PART_MSG);
    expect(act(s, 'repair_machine', { machine: 'microwave' }).ok).toBe(false);
    expect(isBroken(s, 'microwave')).toBe(true); expect(s.energy).toBe(50); expect(stockOf(s, 'parts')).toBe(3);
  });
  it('spends energy and exactly one part, and fixes only the named machine', () => {
    const s = fresh(); breakMachine(s, 'comms'); breakMachine(s, 'heater');
    expect(act(s, 'repair_machine', { machine: 'comms', part: 'spare_part' }).ok).toBe(true);
    expect(isBroken(s, 'comms')).toBe(false); expect(isBroken(s, 'heater')).toBe(true);
    expect(s.energy).toBe(50 - ACTION_ENERGY.repair_machine); expect(stockOf(s, 'parts')).toBe(2);
    expect(brokenKitchenMachine(s)).toBe('heater');
  });
  it('is refused with no parts left or when too tired', () => {
    const s = fresh(); breakMachine(s, 'heater'); s.flags.stock_parts = 0;
    expect(machineProblem(s, part, 'heater')).toBe(NO_PARTS_MSG); expect(act(s, 'repair_machine', { machine: 'heater', part: 'spare_part' }).ok).toBe(false);
    const t = fresh(); breakMachine(t, 'heater'); t.energy = 2; expect(machineProblem(t, part, 'heater')).toMatch(/too tired/);
  });
  it('the repair_machine ActionDef kneels and its beat is the last step', () => {
    const d = ACTION_DEFS.repair_machine; expect(d.steps.every(x => x.pose === 'kneel')).toBe(true); expect(d.beatStep).toBe(d.steps.length - 1);
  });
});
