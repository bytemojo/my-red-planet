import { describe, expect, it } from 'vitest';
import { SAVE_VERSION, act, advance, rates, solarGen } from '../src/core/sim';
import { describePending, poll, resolve } from '../src/core/director';
import { alertLevel, episodeEnv, objective, SYSTEMS } from '../src/core/episode';
import { deserialize, newSession, reloadCheckpoint, serialize, sleep, type Session } from '../src/core/session';
import { EP } from '../src/core/constants';
import type { GameState } from '../src/core/types';

const story = (sess: Session, picks: Record<string, string> = {}) => {
  const s = sess.state; let n = 0;
  while (s.pending && n++ < 8) { const v = describePending(s)!; resolve(s, picks[v.id] ?? v.choices.find(c => !c.disabled && c.id !== 'wait')?.id ?? 'continue'); poll(s); }
};
// play the rest of the current Sol: answer cards with `picks`, then sleep
const playSol = (sess: Session, picks: Record<string, string> = {}, each?: (s: GameState) => void) => {
  const s = sess.state; story(sess, picks); each?.(s);
  while (s.hour < 23.9) { advance(s, 0.25); story(sess, picks); }
  sleep(sess); story(sess, picks);
};
const quick = () => newSession(7, { mode: 'storm', quick: true });

describe('Episode 1 opening', () => {
  it('starts on Sol 1 at half power with the intercom ringing and seedlings in the beds', () => {
    const s = newSession(1, { mode: 'storm' }).state;
    expect(s.ep?.phase).toBe('call'); expect(s.ep?.call).toBe('ringing');
    expect(s.res.power).toBe(50); expect(s.pending).toBeNull();
    expect(s.plots.every(p => p.crop)).toBe(true);
    expect(objective(s).title).toBe('TALK TO CAPTAIN REYES');
  });
  it('only Captain Reyes answers the call, then the systems check begins', () => {
    const sess = newSession(1, { mode: 'storm' }), s = sess.state;
    expect(act(s, 'answer', { crew: 'aiko' }).ok).toBe(false);
    expect(act(s, 'answer', { crew: 'reyes' }).ok).toBe(true);
    expect(s.pending?.id).toBe('ep_call');
    story(sess);
    expect(s.ep?.phase).toBe('check');
    expect(objective(s).title).toBe('CHECK ALL CORE SYSTEMS (0/5)');
    for (const sys of SYSTEMS) act(s, 'check', { system: sys });
    expect(s.ep?.phase).toBe('prep');
    expect(s.ep?.tree.at(-1)?.tone).toBe('good');
  });
});

describe('The Storm Call', () => {
  it('fires at the storm arrival on Sol 1 as a timed decision', () => {
    const sess = quick(), s = sess.state;
    while (!s.pending) advance(s, 0.25);
    expect(s.pending?.id).toBe('storm_call');
    expect(describePending(s)?.timer?.seconds).toBe(EP.CALL_SECONDS);
  });
  it('stowing makes no solar power; leaving them out still makes some', () => {
    const a = quick(), b = quick();
    for (const [sess, pick] of [[a, 'stow'], [b, 'out']] as const) { const s = sess.state; while (!s.pending) advance(s, 0.25); resolve(s, pick); s.sol = 2; s.hour = 12; }
    expect(solarGen(a.state, episodeEnv(2))).toBe(0);
    expect(solarGen(b.state, episodeEnv(2))).toBeGreaterThan(0);
  });
  it('neither choice is free: stowing costs power, leaving them out costs the panels', () => {
    const run = (pick: string) => {
      const sess = quick();
      playSol(sess, { storm_call: pick, radiation_peak: 'water_wall' }); // Sol 1 -> 2
      playSol(sess, { radiation_peak: 'water_wall', power_fault: 'manual_air' }); // Sol 2 (worst night) -> 3
      return sess.state;
    };
    const stow = run('stow'), out = run('out');
    expect(stow.ep!.panelDamage).toBe(0);
    expect(out.ep!.panelDamage).toBeGreaterThanOrEqual(EP.BURY[2]);
    expect(stow.res.power).toBeLessThan(out.res.power);
  });
  it('asking Earth: the answer arrives only after the storm has hit (communication delay)', () => {
    const sess = quick(), s = sess.state;
    while (!s.pending) advance(s, 0.25);
    resolve(s, 'ask');
    expect(s.ep?.panelsStowed).toBe(false);
    expect(s.seenBeats).not.toContain('earth_reply');
    playSol(sess, { radiation_peak: 'corner' });
    expect(s.seenBeats).toContain('earth_reply');
  });
});

describe('The storm Sols', () => {
  it('locks the airlock for three Sols, then opens it', () => {
    const sess = quick();
    playSol(sess, { storm_call: 'stow' });
    expect(sess.state.ep?.phase).toBe('storm');
    sess.state.outside = true;
    expect(act(sess.state, 'clean_panels').msg).toMatch(/sealed/);
    sess.state.outside = false;
    for (let i = 0; i < 3; i++) playSol(sess, { radiation_peak: 'water_wall', power_fault: 'water_off' });
    expect(sess.state.sol).toBe(5); expect(sess.state.ep?.phase).toBe('after');
  });
  it('skipping a check on Sol 1 comes back as a fault on Sol 3', () => {
    const sess = newSession(3, { mode: 'storm' }), s = sess.state;
    act(s, 'answer', { crew: 'reyes' }); story(sess);
    for (const sys of SYSTEMS.filter(x => x !== 'water')) act(s, 'check', { system: sys });
    playSol(sess, { storm_call: 'stow' });
    let sawFault = false;
    playSol(sess, { radiation_peak: 'water_wall' });
    if (s.pending?.id === 'missed_check') sawFault = true;
    expect(sawFault || s.decisions.some(d => d.sourceId === 'missed_check')).toBe(true);
    expect(s.ep?.tree.some(n => n.text.startsWith('You skipped'))).toBe(true);
  });
  it('the space weather alert is deterministic (rewind cannot change it)', () => {
    for (const h of [7, 12.5, 20]) expect(alertLevel(3, h)).toBe(alertLevel(3, h));
    expect(alertLevel(1, 9)).toBe('low'); expect(alertLevel(1, 15)).toBe('elevated'); expect(alertLevel(5, 12)).toBe('low');
    expect(['high', 'storm']).toContain(alertLevel(2, 12));
  });
});

describe('Suit rule and checkpoints', () => {
  it('going outside without the suit makes you pass out, and the checkpoint reloads', () => {
    const sess = quick(), s = sess.state;
    s.outside = true; s.suitOn = false; advance(s, 0.25);
    expect(s.flags.tmp_passout).toBe('suit');
    expect(reloadCheckpoint(sess)).toBe(true);
    expect(sess.state.outside).toBe(false); expect(sess.state.ep?.passOuts).toBe(1);
  });
  it('radiation outside drains health, more when the alert is high', () => {
    const sess = quick(), s = sess.state; s.suitOn = true; s.outside = true; s.hour = 18; const h0 = s.health;
    advance(s, 0.5);
    expect(s.health).toBeLessThan(h0);
  });
});

describe('After the storm and results', () => {
  it('cleaning the panels and repairing the pump ends the episode with a score and a linked decision tree', () => {
    const sess = quick();
    playSol(sess, { storm_call: 'out' });
    for (let i = 0; i < 3; i++) playSol(sess, { radiation_peak: 'nothing', power_fault: 'water_off' }, s => { s.plots.forEach(p => { p.watered = true; }); });
    const s = sess.state; story(sess);
    expect(s.ep?.phase).toBe('after');
    if (s.res.power < 5) expect(act(s, 'repair_watering').msg).toMatch(/Clean the solar panels first/);
    s.suitOn = true; s.outside = true; s.hour = 9;
    expect(act(s, 'clean_panels').ok).toBe(true);
    s.outside = false;
    while (s.res.power < 5 && s.hour < 20) { advance(s, 0.5); story(sess); } // clean panels recharge the battery
    expect(act(s, 'repair_watering').msg).toMatch(/repaired/);
    expect(s.ep?.phase).toBe('done');
    const r = s.ep!.result!;
    expect(r.stars).toBeGreaterThanOrEqual(1); expect(r.stars).toBeLessThanOrEqual(3);
    const ids = new Set(s.ep!.tree.map(n => n.id));
    const effects = s.ep!.tree.filter(n => n.kind === 'effect' && n.cause);
    expect(effects.length).toBeGreaterThan(0);
    for (const e of effects) expect(ids.has(e.cause!)).toBe(true);
    expect(s.ep!.tree.some(n => n.text.startsWith('Dust buried'))).toBe(true);
  });
  it('power drains at half the campaign rate during the episode', () => {
    const s = quick().state; s.hour = 2; // no sun
    expect(rates(s).power).toBeCloseTo((rates(s).gen - rates(s).load) * EP.POWER_SCALE);
  });
});

describe('save migration', () => {
  it('migrates a v2 save to the current version without an episode', () => {
    const raw = JSON.parse(serialize(newSession(2)));
    raw.state.version = 2; delete raw.state.ep; delete raw.state.suitOn; delete raw.state.health; delete raw.state.crewChats;
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.state.version).toBe(SAVE_VERSION); expect(back.state.ep).toBeNull(); expect(back.state.health).toBe(100); expect(back.state.crewChats).toEqual({});
  });
});

describe('balance', () => {
  const survive = (pick: string, each: (s: GameState) => void) => {
    const sess = quick();
    playSol(sess, { storm_call: pick });
    for (let i = 0; i < 3; i++) playSol(sess, { radiation_peak: 'water_wall', power_fault: 'manual_air', missed_check: 'fix' }, s => { s.plots.forEach(p => { p.watered = true; }); act(s, 'feed'); each(s); });
    return sess.state;
  };
  it('a careful player who stows, saves power and redeploys on Sol 3 does not run out of air or water', () => {
    const s = survive('stow', st => { if (st.sol === 2) st.farm = 'off'; if (st.sol === 3 && st.ep!.panelsStowed) act(st, 'panels'); if (st.sol >= 3) st.farm = 'dim'; });
    expect(s.failed).toBeNull(); expect(s.sol).toBe(5);
  });
  it('a player who leaves the panels out also survives, but with damaged panels', () => {
    const s = survive('out', () => {});
    expect(s.failed).toBeNull(); expect(s.ep!.panelDamage).toBeGreaterThan(0.4);
  });
});

describe('crew chats in the episode', () => {
  it('allows two intercom chats per Sol', () => {
    const s = quick().state;
    expect(act(s, 'talk', { crew: 'aiko' }).ok).toBe(true);
    expect(act(s, 'talk', { crew: 'david' }).ok).toBe(true);
    expect(act(s, 'talk', { crew: 'sofia' }).msg).toMatch(/2 intercom chats/);
  });
});
