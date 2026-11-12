import Phaser from 'phaser';
import { ACTION_ENERGY, CROPS, type ActionName } from '../core/constants';
import { describePending, poll, resolve } from '../core/director';
import { act, advance, emergencyShipment } from '../core/sim';
import { rewind, rewindableSols, saveToStorage, sleep, type Session } from '../core/session';
import { H, T, W, buildWorld, world } from './world';
import { clamp, $, UI, flashMeter, head, optCard, overlay, runPending, showReport, showSimple, showStageResult, stageScore, toast, journalHtml, esc, chip } from '../ui/ui';
import { refreshHud, initHud } from '../ui/hud';
import { openCave, openComms, openControl, openCrew, openFarm, openLs, openRover, openSolar, type Host } from '../ui/panels';
import { recordRun, updateAwards } from '../ui/menu';
import { sfx } from '../ui/audio';
import { CREW } from '../story/crew';
import type { GameState } from '../core/types';

const HOURS_PER_SEC = 0.1; // one Sol = 240 real seconds. Tune for pacing.
type Zone = { x0: number; y0: number; x1: number; y1: number; label: string; inside: boolean };
const ZONES: Record<string, Zone> = {
  farm: { x0: 5, y0: 3, x1: 13, y1: 8, label: 'Check Farm', inside: true }, ls: { x0: 18, y0: 3, x1: 28, y1: 8, label: 'Check Air & Water', inside: true },
  comms: { x0: 18, y0: 13, x1: 28, y1: 17, label: 'Check Comms', inside: true }, control: { x0: 14, y0: 3, x1: 17, y1: 7, label: 'Open Control', inside: true },
  sick: { x0: 5, y0: 10, x1: 13, y1: 11, label: 'Call the Crew', inside: true },
  solar: { x0: 9, y0: 20, x1: 30, y1: 27, label: 'Check Solar', inside: false }, rover: { x0: 30, y0: 19, x1: 37, y1: 24, label: 'Use Rover', inside: false },
  cave: { x0: 32, y0: 3, x1: 38, y1: 7, label: 'Enter Cave', inside: false },
};
const MARKERS: Record<string, [number, number]> = { farm: [9.5, 5.6], ls: [22.5, 6], comms: [22.5, 14.6], solar: [19, 24.6], control: [16, 4.5], rover: [34.5, 23], cave: [35, 5.5], sick: [9.5, 10.5] };

export const keys: Record<string, boolean> = {};
export const joy = { id: null as number | null, ox: 0, oy: 0, x: 0, y: 0 };

export class WorldScene extends Phaser.Scene {
  sess!: Session; curZone: string | null = null; busy = false; lastStage = 1; finalShown = false; hudT = 0; syncT = 0; anim = 0;
  onMenu: () => void = () => {};
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
    this.sess = sess; const s = sess.state;
    this.lastStage = s.stage; this.finalShown = s.campaignComplete;
    UI.stack.slice().forEach(id => UI.close(id)); $('#toasts').innerHTML = '';
    this.resetPlayer(false); world.sync(); refreshHud(s);
    world.placeNpcs(!!s.flags.quarantine_over);
    this.cameras.main.centerOn(world.player.x, world.player.y);
    this.time.delayedCall(250, () => void this.afterAction(true));
  }

  resetPlayer(tow: boolean) { world.player.x = 16 * T; world.player.y = tow ? 17.2 * T : 14.5 * T; if (this.sess) this.sess.state.outside = false; }
  blockedAt(px: number, py: number) { const tx = Math.floor(px / T), ty = Math.floor(py / T); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true; return world.blocked[ty][tx]; }
  hit(x: number, y: number) { return this.blockedAt(x - 6, y - 3) || this.blockedAt(x + 6, y - 3) || this.blockedAt(x - 6, y + 1) || this.blockedAt(x + 6, y + 1); }

  // ----- Host: what panels can ask the game to do -----
  host: Host = {
    state: () => this.state(),
    run: (name, arg) => void this.run(name, arg),
    set: (what, value) => { const s = this.state(); if (what === 'farm') s.farm = value as GameState['farm']; else s.ls = value as GameState['ls']; sfx.click(); this.refresh(); },
    rest: () => void this.sleepFlow(), rewind: sol => void this.doRewind(sol), compare: () => this.compare(), save: () => { toast(saveToStorage(this.sess) ? 'Game saved.' : 'Could not save.', { kind: saveToStorage(this.sess) ? 'good' : 'bad' }); },
    menu: () => { saveToStorage(this.sess); this.onMenu(); }, branches: () => this.sess.branches.length, rewindable: () => rewindableSols(this.sess),
  };

  lastDust = -1;
  refresh() { world.sync(); const pd = this.state().panelDust; if (pd !== this.lastDust) { this.lastDust = pd; world.dust(); } world.placeNpcs(!!this.state().flags.quarantine_over); refreshHud(this.state()); }

  async run(name: ActionName, arg?: Record<string, string>) {
    const s = this.state(), before = { ...s.res }, e0 = s.energy;
    const r = act(s, name, arg as never);
    const kind = r.ok ? 'good' : 'bad';
    if (r.ok && name === 'clean_panels') { world.clean(); this.lastDust = s.panelDust; }
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
      }
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
    ({ farm: () => openFarm(h), ls: () => openLs(h), comms: () => openComms(h), solar: () => openSolar(h), control: () => openControl(h), sick: () => openCrew(h), rover: () => openRover(h), cave: () => openCave(h) } as Record<string, () => void>)[z]?.();
  }
  zoneOk(k: string, s: GameState, ins: boolean) {
    const q = ZONES[k]; if (q.inside !== ins) return false;
    if (k === 'rover') return s.buildings.includes('rover_bay'); if (k === 'cave') return !!s.flags.cave_unlocked; return true;
  }
  setPrompt(z: string | null) {
    const act = $('#act') as HTMLButtonElement;
    if (z === this.curZone && !UI.blocking()) return; this.curZone = z;
    if (!z || UI.blocking()) { act.hidden = true; return; }
    act.hidden = false; act.innerHTML = `<kbd>E</kbd><span>${ZONES[z].label}</span>`;
  }
  guide(s: GameState): string | null {
    if (s.plots.some(p => p.crop && p.growth >= CROPS[p.crop].sols)) return 'farm';
    if (!s.plots.some(p => p.crop)) return 'farm';
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
    const blocking = UI.blocking() || this.busy || !!s.failed;
    let dx = 0, dy = 0;
    if (!blocking) {
      if (keys.a || keys.arrowleft) dx -= 1; if (keys.d || keys.arrowright) dx += 1; if (keys.w || keys.arrowup) dy -= 1; if (keys.s || keys.arrowdown) dy += 1;
      if (joy.id !== null && Math.hypot(joy.x, joy.y) > 0.15) { dx += joy.x; dy += joy.y; }
      const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
      const sp = s.outside ? 86 : 100; const nx = p.x + dx * sp * dt; if (!this.hit(nx, p.y)) p.x = nx; const ny = p.y + dy * sp * dt; if (!this.hit(p.x, ny)) p.y = ny;
      if (Math.hypot(dx, dy) > 0.1) { this.anim += dt * 8; if (dx) p.setFlipX(dx < 0); } else this.anim = 0;
      const r = advance(s, dt * HOURS_PER_SEC);
      if (r.blackout) { this.resetPlayer(true); sfx.warn(); this.refresh(); showSimple('suit', 'Suit blackout!', '<p class="line">Your suit ran out of air. You were towed back inside and lost time, energy and power.</p>'); }
      if (r.dayOver) { void this.sleepFlow(); return; }
      if (s.failed) { void this.failFlow(); return; }
    }
    const moving = Math.hypot(dx, dy) > 0.1, step = moving ? [1, 0, 2, 0][Math.floor(this.anim) % 4] : 0;
    const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T), ins = !!(world.inside[ty] && world.inside[ty][tx]);
    if (s.outside === ins) { s.outside = !ins; if (s.outside) { toast('<b>Outside!</b> Watch suit air and radiation.', { kind: 'warn' }); sfx.warn(); } else { toast('<b>Inside.</b> Suit refilling.', { kind: 'good' }); sfx.ok(); } refreshHud(s); }
    p.setTexture((s.outside ? 'as' : 'ah') + step); p.setDepth(p.y); world.shadow.setPosition(p.x, p.y - 1).setDepth(p.y - 0.5);
    if (moving && s.outside && !blocking) { world.puff -= dt; if (world.puff <= 0) { world.puff = 0.14; const c = this.add.circle(p.x + (Math.random() * 6 - 3), p.y - 1, 2 + Math.random() * 2, 0xe6a67a, 0.6).setDepth(p.y - 1); this.tweens.add({ targets: c, y: c.y - 8, alpha: 0, scale: 2.2, duration: 600, onComplete: () => c.destroy() }); } }
    let z: string | null = null;
    if (!blocking) for (const k of Object.keys(ZONES)) { const q = ZONES[k]; if (tx >= q.x0 && tx <= q.x1 && ty >= q.y0 && ty <= q.y1 && this.zoneOk(k, s, ins)) { z = k; break; } }
    this.setPrompt(z);
    const a = world.arrow; a.clear(); const g = this.guide(s);
    if (g && !blocking) { let [mx, my] = MARKERS[g]; const needOut = !ZONES[g].inside; if (needOut === ins) { mx = 16; my = 17; } const bob = Math.sin(t / 220) * 5;
      a.fillStyle(0xffb340, 1); a.fillTriangle(mx * T - 9, my * T - 34 + bob, mx * T + 9, my * T - 34 + bob, mx * T, my * T - 18 + bob); a.lineStyle(2, 0xffb340, 0.7); const rr = 14 + ((t / 40) % 20); a.strokeCircle(mx * T, my * T, rr); a.lineStyle(2, 0xffb340, 0.25); a.strokeCircle(mx * T, my * T, rr + 8); }
    this.hudT += dt; if (this.hudT > 0.2) { this.hudT = 0; refreshHud(s); }
    this.syncT += dt; if (this.syncT > 0.5) { this.syncT = 0; world.placeNpcs(!!s.flags.quarantine_over); }
  }
}
export { CREW };
