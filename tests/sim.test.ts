import { describe, expect, it } from 'vitest';
import { act, advance, emergencyShipment, endSol, newGame, rates } from '../src/core/sim';
import { envForSol } from '../src/core/env';
import { describePending, poll, resolve } from '../src/core/director';
import { migrateState, deserialize, newSession, rewind, serialize, sleep, loadFromStorage, saveToStorage } from '../src/core/session';
import { EVENTS } from '../src/story/events';
import manifest from '../src/data/manifest.json';
import { CROPS } from '../src/core/constants';
import { unlockedCrops } from '../src/core/inventory';
import type { CropId, GameState } from '../src/core/types';

const dismissAll = (s: GameState) => { let n = 0; while (s.pending && n++ < 5) { const v = describePending(s)!; resolve(s, v.choices[0]?.id ?? 'continue'); } };
function runSol(s: GameState) { let r; do { r = advance(s, 0.25); } while (!r.dayOver); endSol(s); }

describe('simulation balance', () => {
  it('an unattended colony lasts a few Sols, then starves (not instantly)', () => {
    const s = newGame(1); let sols = 0;
    while (!s.failed && sols < 20) { dismissAll(s); runSol(s); sols++; }
    expect(sols).toBeGreaterThanOrEqual(3);
    expect(s.failed).toBe('food');
  });
  it('a player who plants and waters every Sol survives 12 Sols with no shipment', () => {
    const s = newGame(1); dismissAll(s);
    for (let day = 0; day < 12 && !s.failed; day++) {
      dismissAll(s);
      for (const p of s.plots) {
        if (!p.crop) act(s, 'plant', { plot: p.id, crop: 'lettuce' , packet: 'lettuce' });
        if (p.crop && p.growth >= 2) act(s, 'harvest', { plot: p.id });
        if (p.crop) act(s, 'water', { plot: p.id, tool: 'sprinkler' });
      }
      s.outside = true; act(s, 'clean_panels'); s.outside = false;
      runSol(s);
    }
    expect(s.failed).toBeNull();
    expect(s.sol).toBeGreaterThanOrEqual(13);
  });
  it('dust and dirty panels reduce solar power', () => {
    const s = newGame(1); s.hour = 12;
    const clean = rates(s, { ...envForSol(1), dust: 0 }).gen;
    const dusty = rates(s, { ...envForSol(1), dust: 0.8 }).gen;
    expect(dusty).toBeLessThan(clean * 0.7);
  });
  it('emergency shipment resets the sustainability streak', () => {
    const s = newGame(1); s.solsSinceShipment = 7; s.res.food = 0; s.failed = 'food';
    emergencyShipment(s);
    expect(s.solsSinceShipment).toBe(0); expect(s.failed).toBeNull(); expect(s.res.food).toBeGreaterThan(20);
  });
});

describe('energy', () => {
  it('actions cost energy and fail at zero', () => {
    const s = newGame(1); dismissAll(s);
    act(s, 'plant', { plot: 'p0', crop: 'lettuce' , packet: 'lettuce' });
    expect(s.energy).toBe(97);
    s.energy = 1;
    expect(act(s, 'water', { plot: 'p0', tool: 'sprinkler' }).ok).toBe(false);
  });
  it('watering REQUIRES the sprinkler (Step 6b): no tool, no water spent, bed stays dry; with it the tank drops', () => {
    const s = newGame(1); dismissAll(s); act(s, 'plant', { plot: 'p0', crop: 'lettuce', packet: 'lettuce' });
    const w = s.res.water, en = s.energy;
    const bad = act(s, 'water', { plot: 'p0' }); expect(bad.ok).toBe(false); expect(bad.msg).toMatch(/sprinkler/i);
    expect(s.res.water).toBe(w); expect(s.energy).toBe(en); expect(s.plots[0].watered).toBe(false);
    expect(act(s, 'water', { plot: 'p0', tool: 'spare_part' }).ok).toBe(false);
    expect(act(s, 'water', { plot: 'p0', tool: 'sprinkler' }).ok).toBe(true); expect(s.plots[0].watered).toBe(true); expect(s.res.water).toBeLessThan(w); expect(s.energy).toBeLessThan(en);
  });
  it('records an optional learning note when the player first plans a crop', () => {
    const s = newGame(1); dismissAll(s);
    act(s, 'plant', { plot: 'p0', crop: 'potato' , packet: 'potato' });
    const lesson = s.journal.find(j => j.id === 'lesson:crop-planning');
    expect(lesson?.learnId).toBe('space_crops');
    expect(lesson?.decision).toContain('4 Sols');
  });
  it('sleeping late restores less energy', () => {
    const s = newGame(1); dismissAll(s); s.hour = 23; endSol(s); expect(s.energy).toBe(80);
  });
});

describe('story and events', () => {
  it('the intro beat fires on Sol 1 and the scripted order proceeds', () => {
    const s = newGame(1);
    expect(s.pending).toEqual({ kind: 'beat', id: 'intro' });
    resolve(s);
    expect(s.seenBeats).toContain('intro');
    runSol(s);
    expect(s.pending?.id).toBe('aiko_seeds');
    resolve(s, 'lettuce');
    expect(s.flags.first_crop).toBe('lettuce');
  });
  it('a flare Sol forces the real-data flare event', () => {
    const s = newGame(1); s.sol = 6; s.seenBeats = ['intro']; s.pending = null;
    dismissAll(s); s.sol = 5; runSol(s);
    expect(s.sol).toBe(6);
    const p = s.pending as GameState['pending'];
    expect(p?.id === 'solar_flare' || p?.kind === 'beat').toBe(true);
  });
  it('resolving an event records the decision and a journal entry with a manifest source', () => {
    const s = newGame(1); s.seenBeats = ['intro', 'aiko_seeds', 'david_panels', 'earth_call'];
    dismissAll(s); s.sol = 5; runSol(s);
    expect(s.pending?.id).toBe('solar_flare');
    resolve(s, 'stay');
    expect(s.decisions.at(-1)?.optionId).toBe('stay');
    const j = s.journal.at(-1)!;
    expect(j.realData).toBe(true);
    expect(manifest.datasets.map(d => d.id)).toContain(j.sourceId);
  });
  it('past choices change future story (risky behaviour makes Reyes notice)', () => {
    const s = newGame(1); s.seenBeats = ['intro']; s.flags.risky = 2; s.pending = null; poll(s);
    dismissAll(s);
    expect(s.seenBeats).toContain('reyes_risk_talk');
  });
});

describe('data integrity', () => {
  it('every real-data event cites a manifest dataset (or @flare)', () => {
    const ids = manifest.datasets.map(d => d.id);
    for (const e of EVENTS.filter(e => e.journal.realData)) expect(e.journal.sourceId === '@flare' || ids.includes(e.journal.sourceId!)).toBe(true);
  });
  it('every flare in the schedule exists in the manifest', () => {
    const ids = manifest.datasets.map(d => d.id);
    for (let sol = 1; sol < 60; sol++) { const f = envForSol(sol).flare; if (f) expect(ids).toContain(f.id); }
  });
  it('environment depends only on the Sol number', () => {
    expect(envForSol(9)).toEqual(envForSol(9));
  });
});

describe('rewind and save', () => {
  it('rewinds to any earlier Sol, restores decisions, and never changes the NASA-derived env', () => {
    const sess = newSession(3); dismissAll(sess.state);
    const envBefore = envForSol(4);
    for (let i = 0; i < 5; i++) { sleep(sess); dismissAll(sess.state); }
    expect(sess.state.sol).toBe(6);
    const ok = rewind(sess, 2);
    expect(ok).toBe(true);
    expect(sess.state.sol).toBe(2);
    expect(sess.branches.length).toBe(1);
    expect(sess.snapshots[4]).toBeUndefined();
    expect(envForSol(4)).toEqual(envBefore);
  });
  it('save round-trips through a storage object', () => {
    const mem: Record<string, string> = {};
    const store = { setItem: (k: string, v: string) => { mem[k] = v; }, getItem: (k: string) => mem[k] ?? null };
    const sess = newSession(5); sleep(sess);
    expect(saveToStorage(sess, store)).toBe(true);
    const back = loadFromStorage(store)!;
    expect(back.state.sol).toBe(2);
    expect(deserialize(serialize(sess))?.state.seed).toBe(5);
    expect(deserialize('garbage')).toBeNull();
  });
});

describe('crops (Step 5c)', () => {
  const ids: CropId[] = ['lettuce', 'potato', 'bean', 'tomato', 'carrot', 'spinach', 'wheat'];
  it('all 7 crops are defined with sensible growth and food values', () => {
    expect(Object.keys(CROPS).sort()).toEqual([...ids].sort());
    for (const id of ids) { expect(CROPS[id].sols, id).toBeGreaterThanOrEqual(2); expect(CROPS[id].food, id).toBeGreaterThan(0); }
    for (const id of ['carrot', 'spinach', 'wheat'] as const) expect(CROPS[id].unlock).toBe(`unlock_${id}`);
  });
  it('the new crops stay locked until their flag is set, in the seed list and in planting', () => {
    const s = newGame(1); dismissAll(s);
    expect([...unlockedCrops(s)].sort()).toEqual(['bean', 'lettuce', 'potato']);
    const r = act(s, 'plant', { plot: s.plots[0].id, crop: 'carrot' , packet: 'carrot' });
    expect(r.ok).toBe(false); expect(s.plots[0].crop).toBeNull();
    s.flags.unlock_carrot = true;
    expect(act(s, 'plant', { plot: s.plots[0].id, crop: 'carrot' , packet: 'carrot' }).ok).toBe(true);
    expect(s.plots[0].crop).toBe('carrot');
  });
  it('a planted wheat crop and an old save both survive a save/load round trip', () => {
    const s = newGame(1); dismissAll(s); s.flags.unlock_wheat = true;
    act(s, 'plant', { plot: s.plots[0].id, crop: 'wheat' , packet: 'wheat' });
    expect(migrateState(JSON.parse(JSON.stringify(s)))?.plots[0].crop).toBe('wheat');
    const old = newGame(1); expect(migrateState(JSON.parse(JSON.stringify(old)))?.version).toBe(old.version);
  });
});

describe('planting needs a seed packet (Step 6a)', () => {
  it('act plant fails without the matching packet, leaves the bed and energy alone, and works with it', () => {
    const s = newGame(1); dismissAll(s); const p = s.plots[0]; p.crop = null; const e0 = s.energy;
    const no = act(s, 'plant', { plot: p.id, crop: 'lettuce' });
    expect(no.ok).toBe(false); expect(no.msg).toMatch(/seed packet/i); expect(p.crop).toBeNull(); expect(s.energy).toBe(e0);
    expect(act(s, 'plant', { plot: p.id, crop: 'lettuce', packet: 'potato' }).ok).toBe(false); // wrong packet
    const yes = act(s, 'plant', { plot: p.id, crop: 'lettuce', packet: 'lettuce' });
    expect(yes.ok).toBe(true); expect(p.crop).toBe('lettuce'); expect(p.growth).toBe(0); expect(s.energy).toBeLessThan(e0);
  });
});

describe('suit rack rule (Step 8b)', () => {
  it('act(suit) puts the suit on, costs 1 energy, and can only come off inside', () => {
    const s = newSession(7, { mode: 'storm', quick: true }).state; const e0 = s.energy;
    expect(s.suitOn).toBe(false);
    expect(act(s, 'suit').ok).toBe(true); expect(s.suitOn).toBe(true); expect(s.energy).toBe(e0 - 1);
    s.outside = true; expect(act(s, 'suit').ok).toBe(false); expect(s.suitOn).toBe(true);
    s.outside = false; expect(act(s, 'suit').ok).toBe(true); expect(s.suitOn).toBe(false);
  });
});
