import { describe, expect, it } from 'vitest';
import { SAVE_VERSION, act, advance, rates, solarGen } from '../src/core/sim';
import { describePending, poll, resolve } from '../src/core/director';
import { deliverIce, alertFor, alertLevel, episodeEnv, objective, objectiveTasks, SYSTEMS } from '../src/core/episode';
import { deserialize, newSession, reloadCheckpoint, serialize, sleep, type Session } from '../src/core/session';
import { EP, FAIL, K } from '../src/core/constants';
import { evaluateFailures, tankLevel } from '../src/core/failure';
import type { GameState } from '../src/core/types';
import { ACTION_DEFS, buildTimeline } from '../src/core/actions';
import { ALERT_DRAIN, ALERT_SCRIPT, scriptedAlert } from '../src/story/alert';

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
// quick starts are pre-checked, so the dish decision (Step 14a) shows first: answer it, then wait for the Storm Call
const toStormCall = (s: GameState) => { while (!s.pending) advance(s, 0.25); if (s.pending.id === 'dish_decision') { resolve(s, 'comms'); poll(s); } while (!s.pending) advance(s, 0.25); };

describe('Episode 1 opening', () => {
  it('starts on Sol 1 at half power with the intercom ringing and seedlings in the beds', () => {
    const s = newSession(1, { mode: 'storm' }).state;
    expect(s.ep?.phase).toBe('call'); expect(s.ep?.call).toBe('ringing');
    expect(s.res.power).toBe(50); expect(s.pending).toBeNull();
    expect(s.plots.every(p => p.crop)).toBe(true);
    expect(objective(s).title).toBe('TALK TO CAPTAIN REYES');
  });
  it('shows a phase-specific checklist and marks each checked system complete', () => {
    const sess = newSession(2, { mode: 'storm' }), s = sess.state;
    expect(objectiveTasks(s)).toEqual([{ label: 'Answer Captain Reyes at the hallway intercom', done: false }]);
    act(s, 'answer', { crew: 'reyes' }); story(sess);
    for (const sys of SYSTEMS.slice(0, 2)) act(s, 'check', { system: sys });
    expect(objectiveTasks(s).filter(t => t.done).map(t => t.label)).toEqual(['Check air', 'Check water']);
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
    toStormCall(s);
    expect(s.pending?.id).toBe('storm_call');
    expect(describePending(s)?.timer?.seconds).toBe(EP.CALL_SECONDS);
  });
  it('stowing makes no solar power; leaving them out still makes some', () => {
    const a = quick(), b = quick();
    for (const [sess, pick] of [[a, 'stow'], [b, 'out']] as const) { const s = sess.state; toStormCall(s); resolve(s, pick); if (pick === 'stow') act(s, 'panels'); /* Step 16a: the lever, not the choice, stows */ s.sol = 2; s.hour = 12; }
    expect(solarGen(a.state, episodeEnv(2))).toBe(0);
    expect(solarGen(b.state, episodeEnv(2))).toBeGreaterThan(0);
  });
  it('neither choice is free: stowing costs power, leaving them out costs the panels', () => {
    const run = (pick: string) => {
      const sess = quick();
      const lever = (s: GameState) => { if (pick === 'stow' && s.ep!.stormCall && !s.ep!.panelsStowed) act(s, 'panels'); };
      playSol(sess, { storm_call: pick, radiation_peak: 'water_wall' }, lever); // Sol 1 -> 2
      playSol(sess, { radiation_peak: 'water_wall', power_fault: 'manual_air' }, lever); // Sol 2 (worst night) -> 3
      return sess.state;
    };
    const stow = run('stow'), out = run('out');
    expect(stow.ep!.panelDamage).toBe(0);
    expect(out.ep!.panelDamage).toBeGreaterThanOrEqual(EP.BURY[2]);
    expect(stow.res.power).toBeLessThan(out.res.power);
  });
  it('asking Earth: the answer arrives only after the storm has hit (communication delay)', () => {
    const sess = quick(), s = sess.state;
    toStormCall(s);
    resolve(s, 'ask');
    expect(s.ep?.panelsStowed).toBe(false);
    expect(s.seenBeats).not.toContain('earth_reply');
    playSol(sess, { radiation_peak: 'corner' });
    expect(s.seenBeats).toContain('earth_reply');
  });
});

describe('The storm Sols', () => {
  it('keeps the radiation preparation prompt in-world while retaining its NASA learning link', () => {
    const s = quick().state;
    s.pending = { kind: 'event', id: 'radiation_peak' };
    const view = describePending(s)!;
    expect(view.lines).toEqual(['The space weather alert goes to its peak tonight. How should we prepare?']);
    expect(view.realData).toBe(true);
    expect(view.learnId).toBe('space_radiation');
  });
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
  it('going outside without the suit drains health (no instant pass-out); NO_SUIT fails at the critical threshold and the checkpoint reloads', () => {
    const sess = quick(), s = sess.state, h0 = s.health;
    s.outside = true; s.suitOn = false; advance(s, 0.25);
    expect(s.flags.tmp_passout).toBeUndefined(); expect(s.health).toBeLessThan(h0);
    expect(evaluateFailures(s, 0.25).failure).toBeNull();
    s.health = FAIL.HEALTH_CRITICAL; expect(evaluateFailures(s, 0.01).failure).toBe('NO_SUIT');
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
    expect(act(s, 'repair_watering').ok).toBe(false); // Step 13a: no spare part in hand
    s.suitOn = true; s.outside = true; s.hour = 9;
    expect(act(s, 'clean_panels').ok).toBe(true);
    s.outside = false;
    expect(act(s, 'repair_watering', { part: 'spare_part' }).msg).toMatch(/repaired/);
    expect(s.ep?.phase).toBe('ice'); expect(s.ep!.result).toBeNull(); // Step 21a: the ice run comes before the debrief
    expect(deliverIce(s)).toBe(true);
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

describe('No suit hints (Step 8a)', () => {
  it('objective and task text never tells the player to wear the suit', () => {
    const sess = quick(), s = sess.state;
    for (const phase of ['call', 'check', 'prep', 'storm', 'after', 'done'] as const) {
      s.ep!.phase = phase;
      const text = [objective(s).title, objective(s).detail, ...(phase === 'done' ? [] : objectiveTasks(s).map(t => t.label))].join(' ');
      expect(text, phase).not.toMatch(/suit|EVA/i);
    }
  });
  it('the suit is never put on by the game: only the rack action sets it', () => {
    const sess = quick(), s = sess.state;
    expect(s.suitOn).toBe(false);
    advance(s, 1);
    expect(s.suitOn).toBe(false);
  });
});

describe('No suit means health drains (Step 8c)', () => {
  it('drains at a steady rate outside without the suit, and stops inside', () => {
    const s = quick().state; s.outside = true; s.suitOn = false; const h0 = s.health;
    advance(s, 0.5); const h1 = s.health; advance(s, 0.5); const h2 = s.health;
    expect(h0 - h1).toBeCloseTo(EP.NO_SUIT_DRAIN * 0.5, 0); expect(h1 - h2).toBeCloseTo(h0 - h1, 0);
    s.outside = false; advance(s, 0.5); expect(s.health).toBeGreaterThanOrEqual(h2);
  });
  it('the player is not failed at once: it takes a few game hours to reach NO_SUIT', () => {
    const s = quick().state; s.outside = true; s.suitOn = false; let h = 0;
    while (!evaluateFailures(s, 0.05).failure && h < 10) { advance(s, 0.05); h += 0.05; }
    expect(evaluateFailures(s, 0).failure).toBe('NO_SUIT'); expect(h).toBeGreaterThan(1); expect(h).toBeLessThan(5);
  });
  it('wearing the suit outside does not use the no-suit drain', () => {
    const s = quick().state; s.outside = true; s.suitOn = true; advance(s, 0.5);
    expect(s.health).toBeGreaterThan(100 - EP.NO_SUIT_DRAIN * 0.5);
  });
});

describe('Oxygen tank (Step 8d)', () => {
  it('drains slowly while outside in the suit, at K.SUIT_USE per game hour', () => {
    const s = quick().state; s.outside = true; s.suitOn = true; s.suit = 100; advance(s, 1);
    expect(100 - s.suit).toBeCloseTo(K.SUIT_USE, 0); expect(s.suit).toBeGreaterThan(80);
  });
  it('does not drain without the suit (health drains instead)', () => {
    const s = quick().state; s.outside = true; s.suitOn = false; s.suit = 100; advance(s, 1); expect(s.suit).toBe(100);
  });
  it('refills only inside, at K.SUIT_REFILL per game hour, and stops at 100', () => {
    const s = quick().state; s.suitOn = true; s.outside = true; s.suit = 40; advance(s, 0.5); expect(s.suit).toBeLessThan(40);
    s.outside = false; s.suit = 40; advance(s, 1); expect(s.suit).toBeCloseTo(40 + K.SUIT_REFILL, 0);
    advance(s, 6); expect(s.suit).toBe(100);
  });
  it('at zero air the failure is SUIT_AIR', () => {
    const s = quick().state; s.outside = true; s.suitOn = true; s.suit = 1; advance(s, 0.5);
    expect(s.suit).toBe(0); expect(evaluateFailures(s, 0).failure).toBe('SUIT_AIR');
  });
  it('the meter colour: blue, amber, then low (red + pulse) below the warning level', () => {
    expect(tankLevel(100)).toBe('ok'); expect(tankLevel(50)).toBe('ok'); expect(tankLevel(49)).toBe('mid');
    expect(tankLevel(FAIL.SUIT_AIR_WARN)).toBe('mid'); expect(tankLevel(FAIL.SUIT_AIR_WARN - 1)).toBe('low');
  });
});

import { BONUS_STARS, FAULT_FLAG, STORM_PLAN, bonusDone, objectivesView } from '../src/story/objectives';
import { BOTANIST } from '../src/core/crewlife';

describe('Step 12a: objectives as data', () => {
  const view = (s: GameState, e = {}) => objectivesView(s, e);
  it('walks the whole sequence: NOW and NEXT move as the plan is completed', () => {
    const s = quick().state; s.pending = null; const ep = s.ep!;
    ep.phase = 'call'; ep.call = 'ringing';
    expect(view(s).now).toMatch(/Reyes/);
    ep.call = 'answered'; ep.phase = 'check'; ep.checked = [];
    expect(view(s).now).toMatch(/Check every core system/);
    expect(view(s).plan.map(p => p.id)).toEqual(['check', 'repair', 'prepare', 'panel', 'storm']);
    ep.checked = [...SYSTEMS]; ep.phase = 'prep';
    expect(view(s).plan[0].done).toBe(true); expect(view(s).now).toMatch(/fault/);
    s.flags[FAULT_FLAG] = true;
    expect(view(s).now).toMatch(/solar panels/);                      // prepare is optional: NOW skips to the next required step
    expect(view(s).next).toBe('Stay inside during the red alert');
    ep.stormCall = 'stow'; ep.phase = 'storm';
    expect(view(s).plan.find(p => p.id === 'panel')!.done).toBe(true);
    expect(view(s).now).toMatch(/stay inside/i);
    ep.phase = 'after';
    expect(view(s).plan.every(p => p.id === 'prepare' || p.done)).toBe(true);
    expect(view(s).now).toMatch(/Clean the solar panels/); expect(view(s).next).toMatch(/pump/);
    ep.phase = 'done'; expect(view(s).now).toMatch(/results/);
  });
  it('marks each step required or optional, and five bonus stars exist', () => {
    expect(STORM_PLAN.map(p => p.required)).toEqual([true, true, false, true, true]);
    expect(BONUS_STARS.map(b => b.label)).toEqual(['Unlock all crops', 'Keep team morale high', 'Write in your journal', 'Read a NASA Wiki source', 'Share the game with a friend']);
  });
  it('no objective text mentions the suit', () => {
    const s = quick().state; s.pending = null; const all: string[] = [];
    for (const ph of ['call', 'check', 'prep', 'storm', 'after', 'done'] as const) { s.ep!.phase = ph; s.ep!.call = 'answered'; const v = view(s); all.push(v.now, v.next ?? '', ...v.plan.map(p => p.label), ...v.stars.map(x => x.label)); }
    all.push(...STORM_PLAN.map(p => p.now));
    expect(all.join(' ')).not.toMatch(/suit|eva|spacesuit/i);
  });
  it('bonus stars tick only on their own conditions', () => {
    const s = quick().state; s.pending = null;
    expect(BONUS_STARS.every(b => !bonusDone(s, b.id))).toBe(true);
    s.crew[BOTANIST].friendship = 5; s.flags.unlock_tomato = s.flags.unlock_carrot = s.flags.unlock_spinach = s.flags.unlock_wheat = true;
    expect(bonusDone(s, 'crops')).toBe(true);
    s.crew[BOTANIST].friendship = 4; expect(bonusDone(s, 'crops')).toBe(false);
    s.notes = [{ id: 'n', text: '  ' }]; expect(bonusDone(s, 'journal')).toBe(false);
    s.notes = [{ id: 'n', text: 'hello' }]; expect(bonusDone(s, 'journal')).toBe(true);
    expect(bonusDone(s, 'wiki')).toBe(false); expect(bonusDone(s, 'wiki', { wikiRead: true })).toBe(true);
    expect(bonusDone(s, 'share', { shared: true })).toBe(true);
    for (const id of ['reyes', 'aiko', 'david', 'sofia'] as const) s.crew[id].morale = 90;
    expect(bonusDone(s, 'morale')).toBe(false);                       // only counts at the end
    s.ep!.phase = 'done'; expect(bonusDone(s, 'morale')).toBe(true);
    for (const id of ['reyes', 'aiko', 'david', 'sofia'] as const) s.crew[id].morale = 40;
    expect(bonusDone(s, 'morale')).toBe(false);
  });
});

describe('Step 16a: the panel lever', () => {
  it('the Storm Call choice is only a plan: panels stay out until the lever is pulled', () => {
    const s = quick().state; toStormCall(s); resolve(s, 'stow');
    expect(s.ep!.stormCall).toBe('stow'); expect(s.ep!.panelsStowed).toBe(false);
    expect(objectiveTasks(s).some(t => /lever/i.test(t.label) && !t.done)).toBe(true);
    const e = s.energy; expect(act(s, 'panels').ok).toBe(true);
    expect(s.ep!.panelsStowed).toBe(true); expect(s.energy).toBeLessThan(e);
    expect(act(s, 'panels').ok).toBe(true); expect(s.ep!.panelsStowed).toBe(false); // pull again to put them back out
  });
  it('the lever is a real animated action (free def, beat after the first pose) and is refused before the Storm Call', () => {
    const d = ACTION_DEFS.panel_lever; expect(d.energy).toBe(0); expect(buildTimeline(d, false).beatAt).toBeGreaterThan(0);
    const s = quick().state; expect(act(s, 'panels').ok).toBe(false);
  });
});

describe('Step 16b: panels never unfold by themselves', () => {
  const afterStorm = (stowed: boolean, damage = 0) => {
    const sess = quick(), s = sess.state; toStormCall(s); resolve(s, 'out');
    s.ep!.phase = 'storm'; s.ep!.panelsStowed = stowed; s.ep!.panelDamage = damage; s.sol = 4; s.hour = 20;
    sleep(sess); s.pending = null; return s;
  };
  it('stowed panels are still stowed when the storm clears, with no solar power until the lever is pulled', () => {
    const s = afterStorm(true);
    expect(s.ep!.phase).toBe('after'); expect(s.ep!.panelsStowed).toBe(true); expect(s.ep!.panelsCleaned).toBe(false);
    expect(objectiveTasks(s).some(t => /lever/i.test(t.label))).toBe(true);
    s.hour = 12; expect(solarGen(s, episodeEnv(s.sol))).toBe(0);
  });
  it('pulling the lever deploys clean panels: power returns and there is no dust damage', () => {
    const s = afterStorm(true), e = s.energy;
    expect(act(s, 'panels').ok).toBe(true);
    expect(s.ep!.panelsStowed).toBe(false); expect(s.ep!.panelsCleaned).toBe(true); expect(s.ep!.panelDamage).toBe(0); expect(s.energy).toBeLessThan(e);
    expect(act(s, 'panels').ok).toBe(false); // after the storm the lever only deploys
  });
  it('panels left out stay dusty and must be dug out by hand outside; the lever refuses', () => {
    const s = afterStorm(false, 0.6);
    expect(s.ep!.panelsStowed).toBe(false); expect(s.ep!.panelsCleaned).toBe(false);
    expect(act(s, 'panels').ok).toBe(false);
    s.outside = true; expect(act(s, 'clean_panels').ok).toBe(true); expect(s.ep!.panelsCleaned).toBe(true);
  });
  it('stowed too late with buried panels: the lever puts them out but they still need digging', () => {
    const s = afterStorm(true, 0.4);
    expect(act(s, 'panels').ok).toBe(true); expect(s.ep!.panelsCleaned).toBe(false);
    s.outside = true; s.energy = 100; expect(act(s, 'clean_panels').ok).toBe(true); expect(s.ep!.panelsCleaned).toBe(true);
  });
});

describe('Step 16c: the scripted Solar Alert ignores live data', () => {
  it('the alert comes from the authored table and the drain table matches the game constants', () => {
    expect(scriptedAlert(1, 9)).toBe('low'); expect(scriptedAlert(1, 15)).toBe('elevated'); expect(scriptedAlert(1, 18)).toBe('high');
    expect(scriptedAlert(2, 4)).toBe('storm'); expect(scriptedAlert(5, 12)).toBe('low');
    for (const sol of Object.keys(ALERT_SCRIPT)) for (let h = 0; h < 24; h += 0.5) expect(alertLevel(Number(sol), h)).toBe(scriptedAlert(Number(sol), h));
    expect(ALERT_DRAIN).toEqual(EP.HEALTH_DRAIN);
  });
  it('changing the live NASA flare class (or its source) does not change the in-game alert or its drain', () => {
    const a = quick().state, b = quick().state;
    b.ep!.sun = { source: 'live', flrID: 'LIVE-FLR-1', classType: 'C1.0', date: '2026-11-17' };
    const c = quick().state; c.ep!.sun = { source: 'live', flrID: 'LIVE-FLR-2', classType: 'X28', date: '2026-11-18' };
    for (const sol of [1, 2, 3, 4, 5]) for (const hour of [2, 9, 14, 20]) {
      for (const s of [a, b, c]) { s.sol = sol; s.hour = hour; }
      expect(alertFor(b)).toBe(alertFor(a)); expect(alertFor(c)).toBe(alertFor(a));
    }
    a.sol = b.sol = 2; a.hour = b.hour = 14; a.outside = b.outside = true; a.suitOn = b.suitOn = true; a.health = b.health = 100;
    advance(a, 1); advance(b, 1); expect(b.health).toBe(a.health);
  });
});


describe('Step 24d: Storm Call timer', () => {
  it('gives at least 90 seconds', () => { expect(EP.CALL_SECONDS).toBeGreaterThanOrEqual(90); });
});
