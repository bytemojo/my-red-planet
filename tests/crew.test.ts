import { describe, expect, it } from 'vitest';
import { SAVE_VERSION, act, advance, endSol, newGame } from '../src/core/sim';
import { describePending, resolve } from '../src/core/director';
import { CREW_IDS, activityWeights, isHungry, lampOn, mood, pickActivity, teamMorale } from '../src/core/crewlife';
import { CREW_LIFE } from '../src/core/constants';
import { deserialize, newSession, rewind, serialize, sleep } from '../src/core/session';
import type { GameState } from '../src/core/types';

const dismissAll = (s: GameState) => { let n = 0; while (s.pending && n++ < 5) { const v = describePending(s)!; resolve(s, v.choices[0]?.id ?? 'continue'); } };
const fresh = () => { const s = newGame(1); dismissAll(s); return s; };

describe('crew morale', () => {
  it('starts neutral and a first chat of the Sol makes them happy', () => {
    const s = fresh(); s.crew.aiko.morale = CREW_LIFE.MORALE_START;
    expect(mood(s.crew.aiko)).toBe('neutral');
    expect(act(s, 'talk', { crew: 'aiko' }).ok).toBe(true);
    expect(s.crew.aiko.morale).toBe(CREW_LIFE.MORALE_START + CREW_LIFE.TALK_FIRST);
    expect(mood(s.crew.aiko)).toBe('happy');
  });
  it('a second chat the same Sol helps a little, not a lot', () => {
    const s = fresh(); act(s, 'talk', { crew: 'david' }); const m = s.crew.david.morale;
    act(s, 'talk', { crew: 'david' });
    expect(s.crew.david.morale).toBe(m + CREW_LIFE.TALK_AGAIN);
  });
  it('drops overnight for anyone you did not talk to, and not for those you did', () => {
    const s = fresh(); for (const id of CREW_IDS) { s.crew[id].morale = 50; s.crew[id].hunger = 0; }
    act(s, 'talk', { crew: 'sofia' });
    endSol(s);
    expect(s.crew.sofia.morale).toBe(50 + CREW_LIFE.TALK_FIRST);
    expect(s.crew.reyes.morale).toBe(50 - CREW_LIFE.NO_TALK_DROP);
  });
  it('more chats over several Sols means a happier crew than none', () => {
    const talky = fresh(), quiet = fresh();
    for (let d = 0; d < 3; d++) {
      for (const s of [talky, quiet]) { for (const id of CREW_IDS) s.crew[id].hunger = 0; }
      for (const id of CREW_IDS) act(talky, 'talk', { crew: id });
      endSol(talky); endSol(quiet); dismissAll(talky); dismissAll(quiet);
    }
    expect(teamMorale(talky)).toBeGreaterThan(teamMorale(quiet));
    expect(mood(quiet.crew.reyes)).toBe('sad');
  });
  it('saves each chosen intercom reply and keeps it after leaving and loading the chat', () => {
    const sess = newSession(9); dismissAll(sess.state);
    act(sess.state, 'talk', { crew: 'david', choice: '1' });
    act(sess.state, 'talk', { crew: 'sofia', choice: '0' });
    const loaded = deserialize(serialize(sess))!;
    expect(loaded.state.crewChats.david).toEqual({ sol: 1, choice: 1 });
    expect(loaded.state.crewChats.sofia).toEqual({ sol: 1, choice: 0 });
  });
  it('rejects invalid reply choices without spending energy', () => {
    const s = fresh(), energy = s.energy;
    expect(act(s, 'talk', { crew: 'david', choice: '2' }).ok).toBe(false);
    expect(s.energy).toBe(energy);
    expect(s.crewChats.david).toBeUndefined();
  });
});

describe('crew hunger and the meal hatch', () => {
  it('hunger rises through the day until they show a food bubble', () => {
    const s = fresh();
    expect(isHungry(s, s.crew.reyes)).toBe(false);
    advance(s, 8);
    expect(isHungry(s, s.crew.reyes)).toBe(true);
  });
  it('serving a meal costs energy, resets hunger and cheers up hungry crew', () => {
    const s = fresh(); for (const id of CREW_IDS) { s.crew[id].hunger = 70; s.crew[id].morale = 40; }
    const e0 = s.energy;
    const r = act(s, 'feed');
    expect(r.ok).toBe(true);
    expect(s.energy).toBe(e0 - 6);
    for (const id of CREW_IDS) { expect(s.crew[id].hunger).toBe(0); expect(s.crew[id].morale).toBe(40 + CREW_LIFE.FED_BOOST); }
  });
  it('cannot serve a meal when nobody is hungry or the food store is empty', () => {
    const s = fresh(); for (const id of CREW_IDS) s.crew[id].hunger = 0;
    expect(act(s, 'feed').ok).toBe(false);
    for (const id of CREW_IDS) s.crew[id].hunger = 80; s.res.food = 2;
    expect(act(s, 'feed').ok).toBe(false);
  });
  it('going to bed hungry lowers morale', () => {
    const s = fresh(); for (const id of CREW_IDS) { s.crew[id].morale = 50; s.crew[id].hunger = 90; }
    act(s, 'talk', { crew: 'aiko' }); // talked, so only the hunger penalty applies to Aiko
    endSol(s);
    expect(s.crew.aiko.morale).toBe(50 + CREW_LIFE.TALK_FIRST - CREW_LIFE.WENT_HUNGRY_DROP);
  });
  it('once the quarantine is over the crew feed themselves', () => {
    const s = fresh(); s.flags.quarantine_over = true; for (const id of CREW_IDS) s.crew[id].hunger = 0;
    advance(s, 10);
    expect(s.crew.aiko.hunger).toBe(0);
    s.crew.aiko.hunger = 90;
    expect(isHungry(s, s.crew.aiko)).toBe(false);
    expect(act(s, 'feed').ok).toBe(false);
  });
});

describe('crew daily routine', () => {
  const c = { friendship: 0, met: true, morale: 50, hunger: 0 };
  it('at night they only sleep or read', () => {
    for (const h of [22, 23.5, 3, 6]) for (let r = 0; r < 1; r += 0.05) expect(['sleep', 'read']).toContain(pickActivity(h, c, false, r));
  });
  it('hungry crew move about more', () => {
    const w = Object.fromEntries(activityWeights(12, c, true));
    expect(w.pace).toBeGreaterThan(0); expect(w.lie ?? 0).toBe(0);
  });
  it('the desk lamp is on only when reading or writing after sunset', () => {
    expect(lampOn(20, 'read')).toBe(true); expect(lampOn(12, 'read')).toBe(false); expect(lampOn(22, 'sleep')).toBe(false);
  });
});

describe('save migration', () => {
  it('upgrades a v1 save (and its rewind snapshots) instead of discarding it', () => {
    const sess = newSession(4); sleep(sess); dismissAll(sess.state);
    const old = JSON.parse(serialize(sess));
    const strip = (st: GameState) => { st.version = 1; delete (st as Partial<GameState>).crewChats; for (const id of CREW_IDS) st.crew[id] = { friendship: 2, met: true } as never; return st; };
    strip(old.state);
    for (const k of Object.keys(old.snapshots)) old.snapshots[k] = JSON.stringify(strip(JSON.parse(old.snapshots[k])));
    const back = deserialize(JSON.stringify(old))!;
    expect(back).not.toBeNull();
    expect(back.state.version).toBe(SAVE_VERSION);
    expect(back.state.crewChats).toEqual({});
    expect(back.state.crew.reyes).toEqual({ friendship: 2, met: true, morale: CREW_LIFE.MORALE_START, hunger: CREW_LIFE.HUNGER_START });
    expect(rewind(back, 1)).toBe(true);
    expect(back.state.crew.aiko.morale).toBe(CREW_LIFE.MORALE_START);
  });
  it('rejects saves from a newer version of the game', () => {
    const sess = newSession(4); const raw = JSON.parse(serialize(sess)); raw.state.version = 99;
    expect(deserialize(JSON.stringify(raw))).toBeNull();
  });
});
