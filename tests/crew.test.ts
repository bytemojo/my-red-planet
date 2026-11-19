import { describe, expect, it } from 'vitest';
import { SAVE_VERSION, act, advance, endSol, newGame } from '../src/core/sim';
import { describePending, resolve } from '../src/core/director';
import { BOTANIST, CREW_IDS, CROP_UNLOCK_HEARTS, activityWeights, cropsEarned, heartsOf, isHungry, lampOn, mood, nextCropUnlock, pickActivity, syncCropUnlocks, teamMorale } from '../src/core/crewlife';
import { applyEffect } from '../src/core/effects';
import { unlockedCrops } from '../src/core/inventory';
import { LOCKED_CROP_MSG, trayProblem } from '../src/core/meals';
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
    const s = fresh(); for (const id of CREW_IDS) { s.crew[id].morale = 50; s.crew[id].hunger = 0; }
    act(s, 'talk', { crew: 'aiko' }); // talked while fed (24e: hungry crew refuse), so only the hunger penalty applies to Aiko
    for (const id of CREW_IDS) s.crew[id].hunger = 90;
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

describe('Step 10a: crop unlock ladder (botanist hearts)', () => {
  const withHearts = (n: number) => { const s = fresh(); s.crew[BOTANIST].friendship = n; return s; };
  const open = (s: GameState) => [...unlockedCrops(s)].sort();
  it('uses the botanist, with the exact rungs: tomato 2, carrot and spinach 4, wheat 5', () => {
    expect(BOTANIST).toBe('aiko');
    expect(CROP_UNLOCK_HEARTS).toEqual({ tomato: 2, carrot: 4, spinach: 4, wheat: 5 });
  });
  it('starts with lettuce, potato and bean only', () => {
    expect(open(withHearts(0))).toEqual(['bean', 'lettuce', 'potato']);
    expect(open(withHearts(1))).toEqual(['bean', 'lettuce', 'potato']);
  });
  it('opens each rung at its hearts and not before', () => {
    const at = (n: number) => { const s = withHearts(n); syncCropUnlocks(s); return open(s); };
    expect(at(1)).toEqual(['bean', 'lettuce', 'potato']);
    expect(at(2)).toEqual(['bean', 'lettuce', 'potato', 'tomato']);
    expect(at(3)).toEqual(['bean', 'lettuce', 'potato', 'tomato']);
    expect(at(4)).toEqual(['bean', 'carrot', 'lettuce', 'potato', 'spinach', 'tomato']);
    expect(at(5)).toEqual(['bean', 'carrot', 'lettuce', 'potato', 'spinach', 'tomato', 'wheat']);
    expect(at(9)).toEqual(at(5));                                              // hearts cap at five
    expect(heartsOf(withHearts(9), BOTANIST)).toBe(5);
  });
  it('sync reports only the crops that just opened, and does nothing the second time', () => {
    const s = withHearts(4);
    expect(syncCropUnlocks(s).sort()).toEqual(['carrot', 'spinach', 'tomato']);
    expect(syncCropUnlocks(s)).toEqual([]);
    s.crew[BOTANIST].friendship = 5;
    expect(syncCropUnlocks(s)).toEqual(['wheat']);
  });
  it('only the botanist counts: five hearts with the captain opens nothing', () => {
    const s = fresh(); s.crew.reyes.friendship = 5; s.crew.david.friendship = 5; s.crew.sofia.friendship = 5;
    expect(syncCropUnlocks(s)).toEqual([]); expect(cropsEarned(s)).toEqual([]);
  });
  it('real chats earn it: one heart per Sol from a chat, and the crop opens the moment hearts reach the rung', () => {
    const s = fresh();
    act(s, 'talk', { crew: 'aiko' }); expect(heartsOf(s, 'aiko')).toBe(1); expect(open(s)).not.toContain('tomato');
    endSol(s); dismissAll(s);                                                  // the Sol 2 story card may also give a heart
    act(s, 'talk', { crew: 'aiko' });
    expect(heartsOf(s, 'aiko')).toBeGreaterThanOrEqual(2);
    expect(open(s)).toContain('tomato'); expect(s.flags.unlock_tomato).toBe(true); expect(s.flags.tomato_unlocked).toBe(true);
    for (const c of cropsEarned(s)) expect(open(s)).toContain(c);              // flags never lag behind the hearts
  });
  it('a second chat the same Sol gives no heart and so no unlock', () => {
    const s = withHearts(1); act(s, 'talk', { crew: 'aiko' }); act(s, 'talk', { crew: 'aiko' });
    expect(heartsOf(s, 'aiko')).toBe(2);
  });
  it('nextCropUnlock walks the ladder and ends at null', () => {
    const s = withHearts(0);
    expect(nextCropUnlock(s)).toEqual({ hearts: 2, crops: ['tomato'] });
    s.crew.aiko.friendship = 2; syncCropUnlocks(s); expect(nextCropUnlock(s)).toEqual({ hearts: 4, crops: ['carrot', 'spinach'] });
    s.crew.aiko.friendship = 4; syncCropUnlocks(s); expect(nextCropUnlock(s)).toEqual({ hearts: 5, crops: ['wheat'] });
    s.crew.aiko.friendship = 5; syncCropUnlocks(s); expect(nextCropUnlock(s)).toBeNull();
  });
  it('a story effect that gives a heart can unlock, and losing hearts later does not take a crop away', () => {
    const s = withHearts(1);
    applyEffect(s, { friend: { crew: 'aiko', n: 1 } }); expect(open(s)).toContain('tomato');
    applyEffect(s, { friend: { crew: 'aiko', n: -2 } }); expect(heartsOf(s, 'aiko')).toBe(0); expect(open(s)).toContain('tomato');
  });
  it('the kitchen menu follows the same unlock: locked crops are refused, earned crops are accepted', () => {
    const e = newGame(3, { mode: 'storm' }); e.crew.reyes.hunger = 80; e.flags.produce_carrot = 2;
    const tray = ['carrot', 'carrot', 'almonds', 'almonds', 'almonds'];
    expect(trayProblem(e, tray)).toBe(LOCKED_CROP_MSG);
    e.crew.aiko.friendship = 4; syncCropUnlocks(e);
    expect(trayProblem(e, tray)).toBeNull();
  });
  it('saves and loads keep hearts and unlocks together', () => {
    const sess = newSession(4); dismissAll(sess.state); sess.state.crew.aiko.friendship = 5; syncCropUnlocks(sess.state);
    const back = deserialize(serialize(sess))!;
    expect(heartsOf(back.state, 'aiko')).toBe(5); expect(open(back.state)).toContain('wheat');
  });
  it('rewinding to before the hearts were earned also removes the unlock, and it can be earned again', () => {
    const sess = newSession(6); dismissAll(sess.state);
    sleep(sess); dismissAll(sess.state);                                      // snapshot of Sol 2 (no hearts yet)
    const solBefore = sess.state.sol;
    sess.state.crew.aiko.friendship = 4; syncCropUnlocks(sess.state);
    expect(open(sess.state)).toContain('carrot');
    sleep(sess); dismissAll(sess.state);
    expect(rewind(sess, solBefore)).toBe(true);
    expect(heartsOf(sess.state, 'aiko')).toBe(0); expect(open(sess.state)).toEqual(['bean', 'lettuce', 'potato']);
    sess.state.crew.aiko.friendship = 2; syncCropUnlocks(sess.state); expect(open(sess.state)).toContain('tomato'); expect(open(sess.state)).not.toContain('carrot');
  });
  it('an older save with hearts but no flags catches up overnight, and the old tomato flag is adopted', () => {
    const s = withHearts(4); expect(s.flags.unlock_carrot).toBeUndefined();
    endSol(s); expect(open(s)).toEqual(expect.arrayContaining(['carrot', 'spinach', 'tomato']));
    const legacy = fresh(); legacy.flags.tomato_unlocked = true; syncCropUnlocks(legacy);
    expect(open(legacy)).toContain('tomato');
  });
});

describe('Step 24e: hungry crew will not chat', () => {
  it('a hungry crew member refuses and nothing is spent', () => {
    const s = fresh(); s.crew.david.hunger = CREW_LIFE.HUNGRY_AT;
    const e = s.energy, h = s.crew.david.friendship, ch = Number(s.flags.tmp_chats || 0);
    const r = act(s, 'talk', { crew: 'david' });
    expect(r.ok).toBe(false);
    expect(r.msg).toContain('Feed us first?');
    expect(r.msg).toContain('hatch');
    expect(s.energy).toBe(e); expect(s.crew.david.friendship).toBe(h); expect(Number(s.flags.tmp_chats || 0)).toBe(ch);
  });
  it('Aoki topic chats are refused too when she is hungry', () => {
    const s = fresh(); s.crew.aiko.hunger = CREW_LIFE.HUNGRY_AT;
    expect(act(s, 'aoki_talk', { topic: 'x', choice: '0' }).ok).toBe(false);
  });
  it('fed crew talk', () => {
    const s = fresh(); s.crew.david.hunger = CREW_LIFE.HUNGRY_AT - 1;
    expect(act(s, 'talk', { crew: 'david' }).ok).toBe(true);
  });
  it('once well again (quarantine over) hunger no longer blocks chat', () => {
    const s = fresh(); s.crew.david.hunger = 100; s.flags.quarantine_over = true;
    expect(act(s, 'talk', { crew: 'david' }).ok).toBe(true);
  });
});
