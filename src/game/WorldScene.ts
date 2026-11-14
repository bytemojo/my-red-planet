import Phaser from 'phaser';
import { ACTION_ENERGY, CROPS, type ActionName } from '../core/constants';
import { describePending, poll, resolve } from '../core/director';
import { act, advance, emergencyShipment } from '../core/sim';
import { reloadCheckpoint, rewind, rewindableSols, saveCheckpoint, saveToStorage, sleep, type Session } from '../core/session';
import { alertFor, lockedIn, SYSTEMS } from '../core/episode';
import { showDebrief } from '../ui/episode';
import { H, T, W, buildWorld, world } from './world';
import { buildPlayerSheet, frameName, lookToSpec } from './sprites';
import { currentLook } from '../ui/creator';
import { envForSol } from '../core/env';
import { CREW_IDS } from '../core/crewlife';
import { CREW_LIFE } from '../core/constants';
import type { Dir } from './pixelart';
import { clamp, $, UI, flashMeter, head, optCard, overlay, runPending, showReport, showSimple, showStageResult, stageScore, toast, journalHtml, esc, chip } from '../ui/ui';
import { refreshHud, initHud } from '../ui/hud';
import { openBath, openCave, openComms, openControl, openCrew, openFarm, openGym, openLab, openLs, openRover, openSolar, openSuit, type Host } from '../ui/panels';
import { playWorkout } from '../ui/gym';
import type { Machine } from '../core/gym';
import { recordRun, updateAwards } from '../ui/menu';
import { sfx } from '../ui/audio';
import { CREW } from '../story/crew';
import type { GameState } from '../core/types';

const HOURS_PER_SEC = 0.1; // one Sol = 240 real seconds. Tune for pacing.
type Zone = { x0: number; y0: number; x1: number; y1: number; label: string; inside: boolean };
const ZONES: Record<string, Zone> = {
  farm: { x0: 5, y0: 3, x1: 13, y1: 8, label: 'Check Farm', inside: true }, ls: { x0: 18, y0: 3, x1: 28, y1: 8, label: 'Check Air & Water', inside: true },
  comms: { x0: 18, y0: 13, x1: 28, y1: 17, label: 'Check Comms', inside: true }, control: { x0: 14, y0: 3, x1: 17, y1: 7, label: 'Open Control', inside: true },
  sick: { x0: 8, y0: 11, x1: 9, y1: 11, label: 'Use Intercom', inside: true },
  hatch: { x0: 11, y0: 11, x1: 12, y1: 11, label: 'Serve a Meal', inside: true },
  suit: { x0: 15, y0: 16, x1: 16, y1: 16, label: 'Suit Rack', inside: true },
  solar: { x0: 9, y0: 20, x1: 30, y1: 27, label: 'Check Solar', inside: false }, rover: { x0: 30, y0: 19, x1: 37, y1: 24, label: 'Use Rover', inside: false },
  cave: { x0: 37, y0: 23, x1: 41, y1: 27, label: 'Enter Cave', inside: false },
  bands: { x0: 30, y0: 4, x1: 31, y1: 5, label: 'Resistance Bands', inside: true },
  bike: { x0: 33, y0: 5, x1: 34, y1: 6, label: 'Cycle Ergometer', inside: true },
  rower: { x0: 36, y0: 4, x1: 38, y1: 6, label: 'Rowing Machine', inside: true },
  lab: { x0: 30, y0: 14, x1: 34, y1: 15, label: 'Science Lab', inside: true },
  bath: { x0: 36, y0: 13, x1: 38, y1: 15, label: 'Bathroom', inside: true },
};
const MARKERS: Record<string, [number, number]> = { farm: [9.5, 5.6], ls: [22.5, 6], comms: [22.5, 14.6], solar: [19, 24.6], control: [16, 4.5], rover: [34.5, 23], cave: [39, 25.5], bands: [31, 5.3], bike: [33.9, 5.9], rower: [37, 5.9], lab: [32, 14.8], bath: [37.5, 14.8], sick: [8.5, 11.7], hatch: [11.5, 11.7], suit: [16, 16.6] };

export const keys: Record<string, boolean> = {};
export const joy = { id: null as number | null, ox: 0, oy: 0, x: 0, y: 0 };

export class WorldScene extends Phaser.Scene {
  sess!: Session; curZone: string | null = null; busy = false; lastStage = 1; finalShown = false; hudT = 0; syncT = 0; anim = 0;
  moveTarget: Phaser.Math.Vector2 | null = null; autoActZone: string | null = null;
  facing: Dir = 'down'; flip = false; acting: { frame: string; frames?: string[]; until: number; then?: () => void } | null = null;
  onMenu: () => void = () => {};
  onReplay: () => void = () => {};
  sealT = 0; alarmT = 0;
  constructor() { super('World'); }

  state = () => this.sess.state;

  create() {
    initHud();
    const ctx = { clamp, state: () => scene.sess?.state, S: { get farm() { return scene.sess?.state.farm ?? 'dim'; }, get eff() { return clamp(1 - 0.6 * (scene.sess?.state.panelDust ?? 0.1), 0, 1); } } };
    const scene = this;
    buildWorld(this, ctx);
    this.game.registry.set('ready', true);
    const sess = this.game.registry.get('sess') as Session | undefined;
    if (sess) this.loadSession(sess);
  }

  loadSession(sess: Session) {
    buildPlayerSheet(this, lookToSpec(currentLook())); world.player.setTexture('player', 'in_down_stand'); // the character creator's look
    this.sess = sess; const s = sess.state;
    this.lastStage = s.stage; this.finalShown = s.ep ? s.ep.phase === 'done' : s.campaignComplete;
    UI.stack.slice().forEach(id => { if (id !== 'opening') UI.close(id); }); $('#toasts').innerHTML = ''; // keep the backstory card if it is already up
    this.resetPlayer(false); world.sync(); refreshHud(s);
    this.cameras.main.centerOn(world.player.x, world.player.y);
    this.time.delayedCall(250, () => void this.afterAction(true));
  }

  resetPlayer(tow: boolean) { world.player.x = 16 * T; world.player.y = tow ? 17.2 * T : 14.5 * T; if (this.sess) this.sess.state.outside = false; }
  blockedAt(px: number, py: number) { const tx = Math.floor(px / T), ty = Math.floor(py / T); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true;
    if (ty >= 18 && tx >= 15 && tx <= 16 && this.sess && lockedIn(this.state())) { if (performance.now() - this.sealT > 2500) { this.sealT = performance.now(); toast('<b>Airlock sealed.</b> It opens when the storm has passed.', { kind: 'warn' }); sfx.warn(); } return true; } // storm lock
    return world.blocked[ty][tx]; }
  hit(x: number, y: number) { return this.blockedAt(x - 6, y - 3) || this.blockedAt(x + 6, y - 3) || this.blockedAt(x - 6, y + 1) || this.blockedAt(x + 6, y + 1); }

  // ----- Host: what panels can ask the game to do -----
  host: Host = {
    state: () => this.state(),
    run: (name, arg) => void this.run(name, arg),
    set: (what, value) => { const s = this.state(); if (what === 'farm') s.farm = value as GameState['farm']; else s.ls = value as GameState['ls']; sfx.click(); this.refresh(); },
    rest: () => void this.sleepFlow(), rewind: sol => void this.doRewind(sol), compare: () => this.compare(), save: () => { toast(saveToStorage(this.sess) ? 'Game saved.' : 'Could not save.', { kind: saveToStorage(this.sess) ? 'good' : 'bad' }); },
    menu: () => { saveToStorage(this.sess); this.onMenu(); }, branches: () => this.sess.branches.length, rewindable: () => rewindableSols(this.sess),
    workout: m => void this.doWorkout(m),
  };

  lastDust = -1;
  refresh() { world.sync(); const pd = this.state().panelDust; if (pd !== this.lastDust) { this.lastDust = pd; world.dust(); } refreshHud(this.state()); }

  async run(name: ActionName, arg?: Record<string, string>) {
    const s = this.state(), before = { ...s.res }, e0 = s.energy;
    const epBefore = s.ep ? `${s.ep.phase}|${s.ep.checked.length}|${s.ep.wateringFixed}|${s.ep.panelsCleaned}` : '';
    const r = act(s, name, arg as never);
    if (r.ok && s.ep && epBefore !== `${s.ep.phase}|${s.ep.checked.length}|${s.ep.wateringFixed}|${s.ep.panelsCleaned}`) saveCheckpoint(this.sess); // an objective moved on
    const kind = r.ok ? 'good' : 'bad';
    if (r.ok && name === 'clean_panels') { world.clean(); this.lastDust = s.panelDust; }
    if (r.ok && name === 'talk' && arg?.crew) world.crew.react(arg.crew, 'heart');
    if (r.ok) { ({ plant: sfx.plant, water: sfx.water, harvest: sfx.harvest, clean_panels: sfx.ok } as Record<string, () => void>)[name]?.() ?? sfx.ok(); world.pop(world.player.x, world.player.y - 40, r.msg.length < 24 ? r.msg : '✓', '#8cffc6'); }
    else sfx.warn();
    toast(esc(r.msg), { kind });
    for (const k of ['o2', 'water', 'food', 'power'] as const) if (Math.abs(s.res[k] - before[k]) > 0.5) flashMeter(k);
    if (s.energy < e0) world.pop(world.player.x + 14, world.player.y - 24, `−${Math.round(e0 - s.energy)}⚡`, '#ffb340');
    this.refresh();
    if (r.ok) await this.afterAction();
  }

  // Show pending story beats/events one at a time, then stage results and awards.
  async afterAction(first = false) {
    const s = this.state();
    if (this.busy && !first) return;
    const wasBusy = this.busy; this.busy = true;
    try {
      poll(s); this.refresh();
      if (first && s.lastReport && s.sol > 1 && !UI.stack.includes('report')) await showReport(s);
      let guard = 0;
      while (s.pending && guard++ < 6) {
        const v = describePending(s); if (!v) break;
        const choice = await runPending(v);
        resolve(s, choice); poll(s); this.refresh();
        if (s.ep) saveCheckpoint(this.sess);
      }
      if (s.ep?.phase === 'done' && !this.finalShown) { this.finalShown = true; saveToStorage(this.sess); recordRun(s.ep.result?.score ?? 0, s.sol); for (const n of updateAwards(s)) toast(`★ New award: <b>${esc(n)}</b>`, { kind: 'good', ms: 4500 }); showDebrief(s, () => this.onReplay(), () => this.host.menu()); return; }
      for (;;) {
        if (s.stage > this.lastStage) { const fin = this.lastStage; this.lastStage++; recordRun(stageScore(s).score, s.sol); await showStageResult(s, fin); }
        else if (s.campaignComplete && !this.finalShown) { this.finalShown = true; recordRun(stageScore(s).score, s.sol); await showStageResult(s, s.stage); }
        else break;
        poll(s); while (s.pending) { const v = describePending(s); if (!v) break; resolve(s, await runPending(v)); poll(s); }
      }
      for (const n of updateAwards(s)) toast(`★ New award: <b>${esc(n)}</b>`, { kind: 'good', ms: 4500 });
    } finally { this.busy = wasBusy; this.refresh(); }
  }

  async sleepFlow() {
    if (this.busy && UI.stack.length === 0 && this.state().hour < 24) return;
    this.busy = true;
    try {
      sleep(this.sess); this.resetPlayer(false); world.sync();
      saveToStorage(this.sess); this.refresh(); sfx.ok();
      await showReport(this.state());
    } finally { this.busy = false; }
    await this.afterAction();
  }

  async doRewind(sol: number) {
    if (!rewind(this.sess, sol)) return;
    this.lastStage = this.state().stage; this.resetPlayer(false); this.refresh();
    toast(`Back to the morning of Sol ${sol}. The weather and NASA events will repeat, but your choices can change.`, { kind: 'good', ms: 5000 });
    await this.afterAction(true);
  }

  compare() {
    const b = this.sess.branches.at(-1); if (!b) return;
    const now = this.state().decisions.filter(d => d.sol >= b.toSol);
    const list = (ds: { sol: number; label: string }[]) => ds.length ? ds.map(d => `<div class="bd"><span>Sol ${d.sol}</span><span>${esc(d.label)}</span></div>`).join('') : '<p class="why">No decisions.</p>';
    showSimple('hourglass', 'Two timelines', `<div class="card"><h3>Old timeline (left at Sol ${b.fromSol})</h3>${list(b.decisions)}</div><div class="card won"><h3>This timeline so far</h3>${list(now)}</div>`);
  }

  // Episode 1: passing out never kills you. The game reloads the last checkpoint (start of the Sol or last objective).
  async passOut(kind: string) {
    const s = this.state(); if (this.busy) return; this.busy = true; delete s.flags.tmp_passout; sfx.warn();
    const why = kind === 'suit' ? 'You forgot your suit! Mars air is far too thin to breathe.' : kind === 'health' ? 'The radiation got to you. When the space weather alert is HIGH, run inside!' : 'Your suit ran out of air.';
    const el = overlay('fail', `<div class="holo-panel">${head('suit', 'You passed out', false)}<div class="panel-body"><div class="failico">!</div><p class="line">${why}</p><p class="why">Captain Reyes talked you through getting back inside. You restart from your last checkpoint. Nobody dies on this crew.${kind === 'suit' ? ' Tip: the suit rack is in the hallway, right before the airlock.' : ''}</p><div class="row" style="justify-content:flex-end"><button class="holo-btn small amber" id="po-go">BACK TO THE CHECKPOINT ▸</button></div></div></div>`);
    await new Promise<void>(res => { $('#po-go', el).onclick = () => { sfx.click(); UI.close('fail'); res(); }; });
    reloadCheckpoint(this.sess); this.resetPlayer(false); this.busy = false; this.refresh(); saveToStorage(this.sess);
    await this.afterAction(true);
  }

  async failFlow() {
    const s = this.state(); if (this.busy || !s.failed) return; this.busy = true;
    const what = { o2: 'air', water: 'water', food: 'food', power: 'power' }[s.failed];
    const el = overlay('fail', `<div class="holo-panel">${head('rad', 'Colony in trouble', false)}<div class="panel-body"><div class="failico">${'!'}</div><p class="res-title bad">OUT OF ${what.toUpperCase()}!</p><p class="why" style="text-align:center">That is how Mars works. Try a different plan.</p>
      <div class="optlist">${optCard('rewind', 'hourglass', 'Use the Time Machine', false, '', false, 'Go back and choose differently.')}${optCard('ship', 'door', 'Call an emergency shipment', false, chip('earth', 'resets your streak', 'r'), false, 'Earth sends supplies right away.')}${optCard('keep', 'base', 'Keep going', false, '', false, 'Try to recover on your own.')}</div></div></div>`);
    el.querySelectorAll('[data-do]').forEach(b => ((b as HTMLElement).onclick = () => {
      const k = (b as HTMLElement).dataset.do; UI.close('fail'); sfx.click();
      if (k === 'ship') { emergencyShipment(s); this.refresh(); } else if (k === 'keep') { s.failed = null; s.flags.tmp_failed_snooze = true; } else { s.failed = null; this.busy = false; openControl(this.host, 'time'); return; }
      this.busy = false;
    }));
  }

  // ----- interaction -----
  doAct() {
    const z = this.curZone; if (!z || UI.blocking() || this.busy) return; sfx.click();
    const h = this.host;
    ({ farm: () => openFarm(h), ls: () => openLs(h), comms: () => openComms(h), solar: () => openSolar(h), control: () => openControl(h), sick: () => openCrew(h), hatch: () => this.serveMeal(), suit: () => openSuit(h), bands: () => openGym(h, 'bands'), bike: () => openGym(h, 'bike'), rower: () => openGym(h, 'rower'), lab: () => openLab(h), bath: () => openBath(h), rover: () => openRover(h), cave: () => openCave(h) } as Record<string, () => void>)[z]?.();
  }
  // A workout: the rhythm mini-game (skippable), then the explorer is shown on the machine, then the result.
  async doWorkout(m: Machine) {
    const s = this.state(); if (this.busy) return;
    const done = await playWorkout(m); if (!done) return;
    const spot: Record<Machine, [number, number]> = { bands: [31, 4.8], bike: [33.9, 5.5], rower: [37.2, 5.3] };
    const p = world.player; p.x = spot[m][0] * T; p.y = spot[m][1] * T; this.facing = 'up';
    if (m === 'rower') world.wing.setRower(true); if (m === 'bike') world.wing.spin(true); if (m === 'bands') world.wing.setBands(true);
    this.acting = { frame: 'in_up_stand', frames: m === 'rower' ? ['in_side_step1', 'in_side_stand', 'in_side_step2', 'in_side_stand'] : ['in_up_step1', 'in_up_stand', 'in_up_step2', 'in_up_stand'], until: performance.now() + 1800,
      then: () => { world.wing.setRower(false); world.wing.spin(false); world.wing.setBands(false); void this.run('workout', { machine: m }); void s; } };
  }
  // Serving a meal is done by hand: the explorer lifts the tray to the hatch, then the crew react.
  serveMeal() {
    const s = this.state(), p = world.player;
    if (s.flags.quarantine_over || !CREW_IDS.some(id => s.crew[id].hunger >= CREW_LIFE.PECKISH_AT) || s.res.food < CREW_LIFE.FOOD_NEEDED || s.energy < ACTION_ENERGY.feed) { void this.run('feed'); return; }
    p.x = 11.5 * T; this.facing = 'up';
    const wasHungry = CREW_IDS.filter(id => s.crew[id].hunger >= CREW_LIFE.PECKISH_AT);
    this.acting = { frame: 'in_tray', until: performance.now() + 1300, then: () => { void this.run('feed').then(() => { for (const id of wasHungry) if (s.crew[id].hunger === 0) world.crew.react(id, 'heart'); }); } };
  }
  // Called from the DOM stage so mouse, phone and tablet taps all share one
  // click-to-walk path. Tapping a marked station walks there, then opens it.
  tapAt(clientX: number, clientY: number, bounds: DOMRect) {
    if (UI.blocking() || this.busy || !world.ready) return;
    const cam = this.cameras.main;
    const sx = (clientX - bounds.left) * cam.width / bounds.width;
    const sy = (clientY - bounds.top) * cam.height / bounds.height;
    const point = cam.getWorldPoint(sx, sy);
    const tx = Math.floor(point.x / T), ty = Math.floor(point.y / T);
    const s = this.state();
    for (const k of Object.keys(ZONES)) {
      const z = ZONES[k];
      if (tx >= z.x0 && tx <= z.x1 && ty >= z.y0 && ty <= z.y1 && this.zoneOk(k, s, s.outside === false)) {
        const [mx, my] = MARKERS[k]; this.moveTarget = new Phaser.Math.Vector2(mx * T, my * T); this.autoActZone = k; sfx.click(); return;
      }
    }
    this.moveTarget = new Phaser.Math.Vector2(point.x, point.y); this.autoActZone = null; sfx.click();
  }
  zoneOk(k: string, s: GameState, ins: boolean) {
    const q = ZONES[k]; if (q.inside !== ins) return false;
    if (k === 'rover') return s.buildings.includes('rover_bay'); if (k === 'cave') return !!s.flags.cave_unlocked; if (k === 'hatch') return !s.flags.quarantine_over; if (['suit', 'bands', 'bike', 'rower', 'lab', 'bath'].includes(k)) return !!s.ep; return true;
  }
  setPrompt(z: string | null) {
    const act = $('#act') as HTMLButtonElement;
    if (z === this.curZone && !UI.blocking()) return; this.curZone = z;
    if (!z || UI.blocking()) { act.hidden = true; return; }
    act.hidden = false; act.innerHTML = `<kbd>E</kbd><span>${ZONES[z].label}</span>`;
  }
  guide(s: GameState): string | null {
    if (s.ep) {
      const ep = s.ep, dry = s.plots.some(p => p.crop && !p.watered && s.hour < 21), hungry = CREW_IDS.some(id => s.crew[id].hunger >= CREW_LIFE.HUNGRY_AT) && s.res.food >= CREW_LIFE.FOOD_NEEDED;
      const out = (z: string) => (s.suitOn || s.outside ? z : 'suit');
      if (ep.phase === 'call') return 'sick';
      if (ep.phase === 'check') { const nx = SYSTEMS.find(x => !ep.checked.includes(x)); return nx === 'air' || nx === 'water' ? 'ls' : nx === 'plants' ? 'farm' : nx === 'comms' ? 'comms' : nx === 'solar' ? out('solar') : null; }
      if (ep.phase === 'after') return !ep.panelsCleaned ? out('solar') : !ep.wateringFixed ? 'farm' : null;
      if (ep.phase === 'done') return null;
      return hungry ? 'hatch' : dry ? 'farm' : null;
    }
    if (s.plots.some(p => p.crop && p.growth >= CROPS[p.crop].sols)) return 'farm';
    if (!s.plots.some(p => p.crop)) return 'farm';
    if (!s.flags.quarantine_over && CREW_IDS.some(id => s.crew[id].hunger >= CREW_LIFE.HUNGRY_AT) && s.res.food >= CREW_LIFE.FOOD_NEEDED) return 'hatch';
    if (s.panelDust > 0.6) return 'solar';
    if (s.buildings.includes('rover_bay') && Number(s.flags.trips || 0) < 2) return 'rover';
    if (s.flags.cave_unlocked && !s.flags.cavern_water) return 'cave';
    if (s.energy < 15) return 'control';
    return null;
  }

  update(t: number, dtms: number) {
    if (!world.ready || !this.sess) return;
    const s = this.state(), dt = Math.min(dtms, 100) / 1000, p = world.player;
    world.dyn.forEach((f: (t: number) => void) => f(t));
    if (this.acting && t >= this.acting.until) { const a = this.acting; this.acting = null; a.then?.(); }
    const blocking = UI.blocking() || this.busy || !!s.failed || !!this.acting;
    let dx = 0, dy = 0;
    if (!blocking) {
      if (keys.a || keys.arrowleft) dx -= 1; if (keys.d || keys.arrowright) dx += 1; if (keys.w || keys.arrowup) dy -= 1; if (keys.s || keys.arrowdown) dy += 1;
      if (joy.id !== null && Math.hypot(joy.x, joy.y) > 0.15) { dx += joy.x; dy += joy.y; }
      if (this.moveTarget) {
        const ddx = this.moveTarget.x - p.x, ddy = this.moveTarget.y - p.y;
        if (Math.hypot(ddx, ddy) < 10) { this.moveTarget = null; }
        else { dx += ddx; dy += ddy; }
      }
      const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
      const sp = s.outside ? 86 : 100; const nx = p.x + dx * sp * dt; if (!this.hit(nx, p.y)) p.x = nx; const ny = p.y + dy * sp * dt; if (!this.hit(p.x, ny)) p.y = ny;
      if (Math.hypot(dx, dy) > 0.1) { this.anim += dt * 8; if (Math.abs(dx) > Math.abs(dy) * 1.2) { this.facing = 'side'; this.flip = dx < 0; } else this.facing = dy < 0 ? 'up' : 'down'; } else this.anim = 0;
      const r = advance(s, dt * HOURS_PER_SEC);
      if (s.flags.tmp_passout) { void this.passOut(String(s.flags.tmp_passout)); return; }
      if (s.pending && !this.busy) { void this.afterAction(); return; }
      if (r.blackout) { this.resetPlayer(true); sfx.warn(); this.refresh(); showSimple('suit', 'Suit blackout!', '<p class="line">Your suit ran out of air. You were towed back inside and lost time, energy and power.</p>'); }
      if (r.dayOver) { void this.sleepFlow(); return; }
      if (s.failed) { void this.failFlow(); return; }
    }
    const moving = Math.hypot(dx, dy) > 0.1, step = moving ? [1, 0, 2, 0][Math.floor(this.anim) % 4] : 0;
    const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T), ins = !!(world.inside[ty] && world.inside[ty][tx]);
    if (s.outside === ins) { s.outside = !ins; if (s.outside) { toast('<b>Outside!</b> Watch suit air and radiation.', { kind: 'warn' }); sfx.warn(); } else { toast('<b>Inside.</b> Suit refilling.', { kind: 'good' }); sfx.ok(); } refreshHud(s); }
    const pose = (['step1', 'stand', 'step2', 'stand'] as const)[step === 0 ? 1 : step === 1 ? 0 : 2];
    const suited = s.outside && (s.suitOn || !s.ep);
    if (this.acting) p.setFrame(this.acting.frames ? this.acting.frames[Math.floor(t / 160) % this.acting.frames.length] : this.acting.frame).setFlipX(false); else p.setFrame((suited ? 'ev_' : 'in_') + frameName(this.facing, pose)).setFlipX(this.facing === 'side' && this.flip);
    p.setDepth(p.y); world.shadow.setPosition(p.x, p.y - 1).setDepth(p.y - 0.5);
    world.crew.update(t, dt, s);
    world.night.update(s.hour, envForSol(s.sol).dust, t, { playerOut: s.outside, px: p.x, py: p.y, roverBay: s.buildings.includes('rover_bay') });
    if (moving && s.outside && !blocking) { world.puff -= dt; if (world.puff <= 0) { world.puff = 0.14; const c = this.add.circle(p.x + (Math.random() * 6 - 3), p.y - 1, 2 + Math.random() * 2, 0xe6a67a, 0.6).setDepth(p.y - 1); this.tweens.add({ targets: c, y: c.y - 8, alpha: 0, scale: 2.2, duration: 600, onComplete: () => c.destroy() }); } }
    let z: string | null = null;
    if (!blocking) for (const k of Object.keys(ZONES)) { const q = ZONES[k]; if (tx >= q.x0 && tx <= q.x1 && ty >= q.y0 && ty <= q.y1 && this.zoneOk(k, s, ins)) { z = k; break; } }
    this.setPrompt(z);
    if (z && z === this.autoActZone && !this.moveTarget && !blocking) { this.autoActZone = null; this.doAct(); }
    const a = world.arrow; a.clear(); const g = this.guide(s);
    if (g && !blocking) { let [mx, my] = MARKERS[g]; const needOut = !ZONES[g].inside; if (needOut === ins) { mx = 16; my = 17; } const bob = Math.sin(t / 220) * 5;
      a.fillStyle(0xffb340, 1); a.fillTriangle(mx * T - 9, my * T - 34 + bob, mx * T + 9, my * T - 34 + bob, mx * T, my * T - 18 + bob); a.lineStyle(2, 0xffb340, 0.7); const rr = 14 + ((t / 40) % 20); a.strokeCircle(mx * T, my * T, rr); a.lineStyle(2, 0xffb340, 0.25); a.strokeCircle(mx * T, my * T, rr + 8); }
    this.hudT += dt; if (this.hudT > 0.2) { this.hudT = 0; refreshHud(s); }
    // Radiation alarm: outside while the space weather alert is HIGH or STORM (the HUD chip also flashes RUN INSIDE!).
    if (s.ep && s.outside && !blocking && ['high', 'storm'].includes(alertFor(s))) { this.alarmT -= dt; if (this.alarmT <= 0) { this.alarmT = 2.5; sfx.alarm(); } } else this.alarmT = 0;
  }
}
export { CREW };
