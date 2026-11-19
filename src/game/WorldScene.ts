import Phaser from 'phaser';
import { ACTION_ENERGY, CROPS, type ActionName } from '../core/constants';
import { describePending, poll, resolve } from '../core/director';
import { act, advance, emergencyShipment } from '../core/sim';
import { captureLive, liveSpot, reloadCheckpoint, rewind, rewindableSols, saveCheckpoint, saveToStorage, sleep, type Session } from '../core/session';
import { FAILURE_CAUSES, FAILURE_TITLES, WARNING_LINES, causeFromLegacy, evaluateFailures, suitRefillShows, FAILURE_ICON, failureTips, newWarnings, restoreAfterFailure, type FailureId } from '../core/failure';
import { alertFor, lockedIn, SYSTEMS } from '../core/episode';
import { pumpRunning, pumpUsable, waterMeLabel, wateringModeProblem } from '../core/watering';
import { ACTION_DEFS, ActionRunner, RACK_RULE, buildTimeline, type ActionFrame } from '../core/actions';
import { buildPump, pumpStand, type PumpArt } from './pump';
import { buildLever, leverStand, type LeverArt } from './lever';
import { buildIceSheet, ICE_MARKER, INTAKE_MARKER, type IceArt } from './icesheet';
import { ICE_COLLECTED, iceProblem, pourProblem, waterMakerOff } from '../core/icerun';
import { pickLifeSupportState } from '../core/lifesupport';
import { GAME_TABLES, WIKI_MARKER, buildRecRoom, podBay, podStand, recStand, stepPodSleep, tableMarker, type PodArt } from './recroom';
import { podSleep, sleepRefusal } from '../core/sleeppod';
import { MACHINE_STAND, buildRepairArt, type RepairArt } from './repairs';
import { dishProblem, isDishBroken } from '../core/dish';
import { stockOf } from '../core/inventory';
import { emptyHands, pickUp, putDown, plantProblem, wateringProblem, pumpProblem, machineProblem, brokenKitchenMachine, isBroken, MACHINE_NAMES, type MachineId, harvestProblem, readyBeds, HARVEST_NEED_FREE_HANDS, STORE_ONLY_FOOD_BIN, NEED_SPRINKLER_MSG, PROP_NAMES, type Hands } from '../core/inventory';
import { drawPlayer, playAction, stepAction } from './actions';
import { playCooking } from './kitchen-actions';
import { PROP_RACKS, buildPropRacks, rackByZone, rackMarker, rackStand, rackZone, type RackArt } from './racks';
import { STORAGE_BINS, binIndex, binStand, storageArt } from './storage';
import { BAY } from './quarters';
import { FARM_BEDS, MARKERS, roomAt, ZONES, bedStand, binZoneId, objectHit } from './layout';
import { BIN_IDS, binView, unlockedCrops } from '../core/inventory';
import { allCropsUnlocked } from '../story/aoki';
import { ICON } from '../ui/icons';
import { glowingObjects, glowAlpha, GLOW_OBJECTS } from './glow';
import { sparkle, waterDroplets, dustPuff, prefersReducedMotion } from './effects';
import { openWiki, showDebrief } from '../ui/episode';
import { openCheckers } from '../ui/checkers';
import { openChess } from '../ui/chess';
import { gameReward, gameRefusal } from '../core/games';
import { H, T, W, buildWorld, world } from './world';
import { pathToClosestReachable } from './pathfinding';
import { isNearSolarPanelTile, isSolarPanelTile } from './solar-panel-layout';
import { PLAYER_ACT, buildPlayerSheet, frameName, lookToSpec } from './sprites';
import { actFrameName } from './pixelart';
import { currentLook } from '../ui/creator';
import { envForSol } from '../core/env';
import { CREW_IDS } from '../core/crewlife';
import { CREW_LIFE, FAIL } from '../core/constants';
import { SPACE_MEALS } from '../core/meals';
import type { Dir } from './pixelart';
import { clamp, $, UI, flashMeter, warnFlash, head, optCard, overlay, runPending, showReport, showSimple, showStageResult, stageScore, toast, noticeCard, journalHtml, esc, chip } from '../ui/ui';
import { objectiveZones, pickRadarTarget } from '../core/radar';
import { refreshHud, initHud, updateRadar, promptInfo, promptHtml } from '../ui/hud';
import { openBath, openCave, openComms, openControl, openCrew, openFarm, openGym, openKitchen, openLab, openLs, openPumpMode, openRover, openSeedPicker, openSolar, type Host } from '../ui/panels';
import { playWorkout } from '../ui/gym';
import type { Machine } from '../core/gym';
import { recordRun, updateAwards } from '../ui/menu';
import { music, sfx, settings } from '../ui/audio';
import { runQuizCall } from '../ui/quiz';
import { callerToday, callLine } from '../core/quiz';
import { bankFor, hasBank } from '../story/quizbank';
import { CREW } from '../story/crew';
import type { CropId, GameState } from '../core/types';

const HOURS_PER_SEC = 0.1; // one Sol = 240 real seconds. Tune for pacing.

export const keys: Record<string, boolean> = {};
export const joy = { id: null as number | null, ox: 0, oy: 0, x: 0, y: 0 };

export class WorldScene extends Phaser.Scene {
  sess!: Session; curZone: string | null = null; busy = false; gen = 0; again = false; lastStage = 1; finalShown = false; hudT = 0; syncT = 0; anim = 0;
  moveTarget: Phaser.Math.Vector2 | null = null; movePath: Phaser.Math.Vector2[] = []; autoActZone: string | null = null;
  facing: Dir = 'down'; flip = false; acting: { frame: string; frames?: string[]; pose?: { name: 'pull' | 'kneel'; count: number; ms: number }; until: number; then?: () => void } | null = null;
  onMenu: () => void = () => {};
  onReplay: () => void = () => {};
  sealT = 0; alarmT = 0;
  // Action system (src/core/actions.ts + src/game/actions.ts): runner, held prop, current pose frame
  action = new ActionRunner(); held: Hands = emptyHands(); actFrame: ActionFrame | null = null;
  // Step 24i: the sleep pod. 'in' = climbing in / asleep (until the Sol report is closed), 'out' = waking and climbing out. podClimb 0 (at the pod) .. 1 (in the bay).
  podPhase: 'none' | 'in' | 'out' = 'none'; podClimb = 0; podSleeper: Phaser.GameObjects.Sprite | null = null; podZ: Phaser.GameObjects.Text | null = null;
  actFace: 'left' | 'right' = 'right'; actStand: { x: number; y: number } | null = null; heldSprite: Phaser.GameObjects.Image | null = null; racks!: RackArt; pumpArt?: PumpArt; leverArt?: LeverArt; iceArt?: IceArt; podArt?: PodArt; repairArt?: RepairArt; ringFn: (p: number | null) => void = () => {}; repairMs = -1; repairBeat = 1; sparkT = 0;
  constructor() { super('World'); }

  state = () => this.sess.state;

  create() {
    initHud();
    const ctx = { clamp, state: () => scene.sess?.state, S: { get farm() { return scene.sess?.state.farm ?? 'dim'; }, get eff() { return clamp(1 - 0.6 * (scene.sess?.state.panelDust ?? 0.1), 0, 1); } } };
    const scene = this;
    buildWorld(this, ctx);
    this.racks = buildPropRacks(this); this.pumpArt = buildPump(this); this.leverArt = buildLever(this); this.iceArt = buildIceSheet(this); this.podArt = buildRecRoom(this); this.repairArt = buildRepairArt(this);
    this.game.registry.set('ready', true);
    const sess = this.game.registry.get('sess') as Session | undefined;
    if (sess) this.loadSession(sess);
  }

  loadSession(sess: Session) {
    buildPlayerSheet(this, lookToSpec(currentLook())); world.player.setTexture('player', 'in_down_stand'); // the character creator's look
    this.sess = sess; const s = sess.state; this.gen++; this.busy = false; // a new session cancels any story loop still awaiting on the old one (Step 23b)
    this.lastStage = s.stage; this.finalShown = s.ep ? s.ep.phase === 'done' && !(s.flags.ice_delivered && !s.seenBeats.includes('captain_line')) : s.campaignComplete; // Step 21c: a save made between the delivery and the captain line still plays it before the mission screen
    UI.stack.slice().forEach(id => { if (id !== 'opening') UI.close(id); }); $('#toasts').innerHTML = ''; // keep the backstory card if it is already up
    this.resetPlayer(false);
    const spot = liveSpot(sess); // Step 24a: CONTINUE puts the player back exactly where and how they stopped
    if (spot) { world.player.x = spot.x; world.player.y = spot.y; if (spot.held.item) { this.held = { item: spot.held.item as never, crop: (spot.held.crop ?? null) as never }; } }
    world.sync(); refreshHud(s); updateRadar(world.player.x / T, world.player.y / T, this.radarPick(s));
    this.cameras.main.centerOn(world.player.x, world.player.y);
    this.time.delayedCall(250, () => void this.afterAction(true));
  }

  /** Step 24a: save everything (state + where the player stands + what they hold). Used by pause, tab hide, the 20 s timer and menu exits. */
  autosave(): boolean {
    if (!this.sess) return false;
    if (!this.actFrame && !this.action.locked) captureLive(this.sess, world.player.x, world.player.y, this.held); // never capture mid-animation
    return saveToStorage(this.sess);
  }

  resetPlayer(tow: boolean) {
    this.moveTarget = null; this.movePath = []; this.autoActZone = null;
    this.action.forceUnlock(); this.actFrame = null; this.held = emptyHands(); this.heldSprite?.setVisible(false); // a world reset always frees the hands and the controls
    if (this.sess && this.state().flags.tray_ready) pickUp(this.held, 'tray'); // a prepared tray is never lost by a reload
    if (this.sess && this.state().ep?.phase === 'ice' && this.state().flags[ICE_COLLECTED]) pickUp(this.held, 'ice_sample'); // neither is a full ice container
    world.player.x = 16 * T; world.player.y = tow ? 17.2 * T : 14.5 * T; if (this.sess) this.sess.state.outside = false;
  }
  blockedAt(px: number, py: number) { const tx = Math.floor(px / T), ty = Math.floor(py / T); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true;
    if (ty >= 18 && tx >= 15 && tx <= 16 && this.sess && lockedIn(this.state())) { if (performance.now() - this.sealT > 2500) { this.sealT = performance.now(); toast('<b>Airlock sealed.</b> It opens when the storm has passed.', { kind: 'warn' }); sfx.warn(); } return true; } // storm lock
    return world.blocked[ty][tx]; }
  hit(x: number, y: number) { return this.blockedAt(x - 6, y - 3) || this.blockedAt(x + 6, y - 3) || this.blockedAt(x - 6, y + 1) || this.blockedAt(x + 6, y + 1); }

  // ----- Host: what panels can ask the game to do -----
  host: Host = {
    state: () => this.state(),
    run: (name, arg) => void this.run(name, arg),
    set: (what, value) => { const s = this.state(); if (what === 'farm') s.farm = value as GameState['farm']; else s.ls = value as GameState['ls']; sfx.click(); this.refresh(); },
    rest: () => void this.sleepFlow(), rewind: sol => void this.doRewind(sol), compare: () => this.compare(), save: () => { toast(this.autosave() ? 'Game saved.' : 'Could not save.', { kind: this.autosave() ? 'good' : 'bad' }); },
    menu: () => { this.autosave(); this.onMenu(); }, branches: () => this.sess.branches.length, rewindable: () => rewindableSols(this.sess),
    workout: m => void this.doWorkout(m),
    quiz: crew => void runQuizCall(this.state(), crew, bankFor(crew), settings.name, () => { this.autosave(); this.refresh(); }),
  };

  lastDust = -1;
  refresh() { world.sync(); const s = this.state(), pd = s.panelDust; if (pd !== this.lastDust) { this.lastDust = pd; world.dust(); } refreshHud(s); updateRadar(world.player.x / T, world.player.y / T, this.radarPick(s)); }

  async run(name: ActionName, arg?: Record<string, string>): Promise<boolean> {
    if (name === 'cook_serve' && this.held.item) { toast('Put your item down first.', { kind: 'warn' }); sfx.warn(); return false; } // the tray needs free hands
    const s = this.state(), before = { ...s.res }, e0 = s.energy;
    const epBefore = s.ep ? `${s.ep.phase}|${s.ep.checked.length}|${s.ep.wateringFixed}|${s.ep.panelsCleaned}` : '';
    const open0 = unlockedCrops(s), r = act(s, name, arg as never);
    if (r.ok && s.ep && epBefore !== `${s.ep.phase}|${s.ep.checked.length}|${s.ep.wateringFixed}|${s.ep.panelsCleaned}`) saveCheckpoint(this.sess); // an objective moved on
    const kind = r.ok ? 'good' : 'bad';
    if (r.ok && name === 'cook_serve') await new Promise<void>(resolve => {
      const tray: string[] = JSON.parse(arg?.tray ?? '[]');
      playCooking(this, tray, () => {
        // Step 2d: the tray stays in the player's hands until it is handed through the meal hatch.
        pickUp(this.held, 'tray'); world.pop(world.player.x, world.player.y - 48, 'CARRY IT TO THE HATCH', '#8cffc6');
        resolve();
      });
    });
    if (r.ok && name === 'clean_panels') { world.clean(); this.lastDust = s.panelDust; }
    if (r.ok && name === 'talk' && arg?.crew) world.crew.react(arg.crew, 'heart');
    if (r.ok) { ({ plant: sfx.plant, water: sfx.water, harvest: sfx.harvest, clean_panels: sfx.ok } as Record<string, () => void>)[name]?.() ?? sfx.ok(); world.pop(world.player.x, world.player.y - 40, r.msg.length < 24 ? r.msg : '✓', '#8cffc6'); }
    else sfx.warn();
    if (!r.ok && name === 'talk' && /intercom chats/.test(r.msg)) noticeCard(r.msg, 'The crew needs rest'); else toast(esc(r.msg), { kind });
    if (r.ok) { const fresh = unlockedCrops(s).filter(c => !open0.includes(c)); if (fresh.length) { sfx.ok(); toast(`🔓 <b>New seeds unlocked: ${fresh.map(c => esc(CROPS[c].name)).join(', ')}.</b> Take a packet from the seed drawer in the storage room.`, { kind: 'good', ms: 6000 }); } if (allCropsUnlocked(s) && open0.length < unlockedCrops(s).length) toast('★ Bonus star earned: <b>Unlock all crops</b>', { kind: 'good', ms: 5000 }); }
    for (const k of ['o2', 'water', 'food', 'power'] as const) if (Math.abs(s.res[k] - before[k]) > 0.5) flashMeter(k);
    if (s.energy < e0) world.pop(world.player.x + 14, world.player.y - 24, `−${Math.round(e0 - s.energy)}⚡`, '#ffb340');
    this.refresh();
    if (r.ok) await this.afterAction();
    return r.ok;
  }

  // Show pending story beats/events one at a time, then stage results and awards.
  async afterAction(first = false) {
    const s = this.state();
    if (this.busy) { if (first) this.again = true; return; } // Step 23b: never two story loops at once; a 'first' request waits for the running one and then runs
    const gen = this.gen, wasBusy = this.busy; this.busy = true;
    try {
      poll(s); this.refresh();
      if (first && s.lastReport && s.sol > 1 && !UI.stack.includes('report')) await showReport(s);
      this.dailyCall(s); // Step 27d: one crew call per Sol (a toast only; the quiz never blocks the story)
      let guard = 0;
      while (s.pending && guard++ < 6 && gen === this.gen) {
        const v = describePending(s); if (!v) break;
        const choice = await runPending(v, !!s.flags.quarantine_over);
        if (gen !== this.gen) return; // the session was replaced while the card was open: drop the stale choice
        resolve(s, choice); poll(s); this.refresh();
        if (s.ep) saveCheckpoint(this.sess);
      }
      if (s.ep?.phase === 'done' && !this.finalShown) { this.finalShown = true; this.autosave(); recordRun(s.ep.result?.score ?? 0, s.sol); for (const n of updateAwards(s)) toast(`★ New award: <b>${esc(n)}</b>`, { kind: 'good', ms: 4500 }); showDebrief(s, () => this.onReplay(), () => this.host.menu()); return; }
      for (;;) {
        if (s.stage > this.lastStage) { const fin = this.lastStage; this.lastStage++; recordRun(stageScore(s).score, s.sol); await showStageResult(s, fin); }
        else if (s.campaignComplete && !this.finalShown) { this.finalShown = true; recordRun(stageScore(s).score, s.sol); await showStageResult(s, s.stage); }
        else break;
        poll(s); while (s.pending) { const v = describePending(s); if (!v) break; resolve(s, await runPending(v, !!s.flags.quarantine_over)); poll(s); }
      }
      for (const n of updateAwards(s)) toast(`★ New award: <b>${esc(n)}</b>`, { kind: 'good', ms: 4500 });
    } finally { if (gen === this.gen) { this.busy = wasBusy; this.refresh(); if (!wasBusy && this.again) { this.again = false; void this.afterAction(true); } } }
  }

  // Step 17a: the sleep pod. Walk to it, the lid opens, the explorer lies down, the lid closes, then the existing sleep()/endSol runs (one Sol).
  podAct() {
    const s = this.state(), why = sleepRefusal(s);
    if (why) { toast(`<b>${why}</b>`, { kind: 'warn' }); sfx.warn(); return; }
    playAction(this, 'pod_sleep', { stand: podStand(), face: 'right', onDone: () => { void this.sleepFlow(); } });
  }
  // Step 17b: the NASA WIKI wall screen and the two game tables. Reach (animated), then the existing wiki modal / a coming-soon card. Opening a source link there marks the bonus (sessionStorage).
  wikiAct() {
    playAction(this, 'use_screen', { stand: recStand(WIKI_MARKER), face: 'left', onBeat: () => { sfx.ok(); sparkle(this, world.player.x - 16, world.player.y - 34); }, onDone: () => { if (!UI.blocking() && !this.busy) openWiki(); } });
  }
  tableAct(zone: string) {
    const t = GAME_TABLES.find(g => g.zone === zone); if (!t) return;
    const why = gameRefusal(this.state());
    if (why) { toast(`<b>${why}</b>`, { kind: 'warn' }); sfx.warn(); return; }
    // Sit down (animated), then the board.
    playAction(this, 'sit_play', {
      stand: recStand(tableMarker(t)), face: 'right', onBeat: () => { sfx.ok(); sparkle(this, world.player.x, world.player.y - 34); },
      onDone: () => {
        if (UI.blocking() || this.busy) return;
        void (t.zone === 'checkers' ? openCheckers() : openChess()).then(o => { if (o) this.gameDone(t.zone === 'checkers' ? 'checkers' : 'chess', o); });
      },
    });
  }
  // The game ended: one small morale reward per Sol (core/games.ts), then refresh the HUD and say what happened.
  gameDone(kind: 'checkers' | 'chess', outcome: 'win' | 'loss' | 'draw') {
    const r = gameReward(this.state(), kind, outcome);
    toast(`<b>${r.msg}</b>`, { kind: r.applied ? 'good' : undefined, ms: 3500 }); if (r.applied) sfx.ok();
    this.refresh();
  }
  async sleepFlow() {
    if (this.busy && UI.stack.length === 0 && this.state().hour < 24) return;
    this.busy = true;
    try {
      const r = podSleep(this.sess); if (!r.ok) { toast(`<b>${r.reason}</b>`, { kind: 'warn' }); sfx.warn(); return; }
      this.resetPlayer(false); world.sync();
      if (r.wakeReason) { sfx.alarm(); this.cameras.main.flash(260, 255, 179, 64); this.time.delayedCall(420, () => this.cameras.main.flash(260, 255, 179, 64)); toast(`<b>${r.wakeReason}</b>`, { kind: 'warn', ms: 5000 }); }
      this.autosave(); this.refresh(); sfx.ok();
      await showReport(this.state());
    } finally { this.busy = false; }
    await this.afterAction();
  }

  private callSol = 0;
  /** Step 27d: once per Sol, today's caller (rotation in core/quiz.ts) says hello. Declining is free: nothing else happens. */
  dailyCall(s: GameState) {
    if (this.callSol === s.sol) return; const c = callerToday(s, hasBank); if (!c) return;
    this.callSol = s.sol; toast(esc(callLine(CREW[c].name)), { kind: 'good', ms: 7000 }); sfx.ok();
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
  async passOut(kind: string) { // today's pass-out kinds go through the same failure screen
    const s = this.state(); delete s.flags.tmp_passout; await this.failure(causeFromLegacy(kind, s));
  }
  // Step 7b: ONE failure screen for every cause: fade to black, the reason, the tips, then back to the existing checkpoint. Nobody dies.
  async failure(id: FailureId) {
    document.body.classList.remove('no-air');
    const s = this.state(); if (this.busy) return; this.busy = true; delete s.flags.tmp_passout; sfx.warn();
    if (id === 'NO_SUIT') { await this.noSuitFlow(); return; }
    // Step 25c: compact card: icon, cause title, one-sentence reason, the tips in a highlighted box, one button (text from core/failure.ts)
    const tips = failureTips(id).map(t => `<p>${esc(t)}</p>`).join('');
    const el = overlay('fail', `<div class="holo-panel fail-card" role="alertdialog" aria-label="${esc(FAILURE_TITLES[id])}"><div class="panel-body"><span class="fail-ico" aria-hidden="true">${ICON[FAILURE_ICON[id]] ?? '!'}</span><h2>${esc(FAILURE_TITLES[id])}</h2><p class="fail-reason">${esc(FAILURE_CAUSES[id].reason)}</p><div class="fail-tip">${tips}</div><button class="holo-btn small amber" id="po-go">BACK TO THE CHECKPOINT ▸</button></div></div>`, 'fail-fade');
    await new Promise<void>(res => { $('#po-go', el).onclick = () => { sfx.click(); UI.close('fail'); res(); }; });
    restoreAfterFailure(this.sess, id); this.warned = []; this.resetPlayer(false); this.busy = false; this.refresh(); this.autosave();
    await this.afterAction(true);
  }
  // Step 24j: NO_SUIT: the screen glitches for exactly 3 s, the player fades back at the airlock (no checkpoint reload), then the tip card.
  async noSuitFlow() {
    const glitch = document.createElement('div'); glitch.id = 'nosuit-glitch'; glitch.className = 'nosuit-glitch'; glitch.setAttribute('aria-hidden', 'true'); document.body.appendChild(glitch);
    await new Promise<void>(res => setTimeout(res, FAIL.NO_SUIT_GLITCH_MS));
    restoreAfterFailure(this.sess, 'NO_SUIT'); this.warned = []; this.resetPlayer(true);
    glitch.classList.add('out'); setTimeout(() => glitch.remove(), 600);
    this.busy = false; this.refresh(); this.autosave();
    const card = noticeCard(FAILURE_CAUSES.NO_SUIT.tip, 'Back inside'); // the only suit reminder in the game, and only after the failure
    await new Promise<void>(res => { const mo = new MutationObserver(() => { if (!card.isConnected) { mo.disconnect(); res(); } }); mo.observe(document.getElementById('overlays')!, { childList: true }); });
    await this.afterAction(true);
  }
  // Step 7b: which HUD parts flash amber for a warning.
  warnTargets(w: FailureId, s: GameState): string[] {
    if (w === 'PLAYER_HEALTH_LOW') return ['#epm-health']; if (w === 'TEAM_MORALE_LOW') return ['#epm-morale']; if (w === 'SUIT_AIR') return ['#epm-tank', '#suit-m']; if (w === 'RADIATION_HIGH') return ['#rad-m'];
    return (['o2', 'water', 'food'] as const).filter(k => s.res[k] <= FAIL.RESOURCE_WARN).map(k => `.meter[data-m="${k}"]`);
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
    const z = this.curZone; if (!z || UI.blocking() || this.busy || this.acting || this.action.locked) return; sfx.click();
    const h = this.host;
    ({ comms: () => this.commsAct(), dish: () => this.repairDish(), ice: () => this.iceAct(), intake: () => this.intakeAct(), pump: () => this.pumpAct(), lever: () => this.leverAct(), pod: () => this.podAct(), wiki: () => this.wikiAct(), chess: () => this.tableAct('chess'), checkers: () => this.tableAct('checkers'), farm: () => this.farmAct(),  ls: () => openLs(h), solar: () => this.solarAct(h), control: () => openControl(h), sick: () => openCrew(h), kitchen: () => this.kitchenAct(), hatch: () => this.state().ep ? this.hatchAct() : this.serveMeal(), suit: () => this.suitAct(), bands: () => this.pullBands(), bike: () => openGym(h, 'bike'), rower: () => openGym(h, 'rower'), lab: () => openLab(h), bath: () => openBath(h), rover: () => openRover(h), cave: () => openCave(h), ...Object.fromEntries(PROP_RACKS.map(r => [r.zone, () => this.useRack(r.zone)])), ...Object.fromEntries(STORAGE_BINS.map(b => [binZoneId(b.id), () => this.openBin(binZoneId(b.id))])) } as Record<string, () => void>)[z]?.();
  }
  // Step 6a: with a seed packet in hand, E walks to the nearest empty bed and plants it (crouch animation). Otherwise the farm panel opens
  // (water / harvest) and, if a bed is empty, a toast says what to hold.
  farmAct() {
    const s = this.state(), h = this.host, p = world.player;
    const empty = s.plots.map((pl, i) => ({ pl, i })).filter(x => !x.pl.crop && FARM_BEDS[x.i]);
    if (this.held.item === 'seed_packet' && this.held.crop) {
      if (!empty.length) { toast('<b>Every bed is planted.</b> Harvest one first.', { kind: 'warn' }); sfx.warn(); return; }
      const near = empty.map(x => ({ ...x, d: Math.hypot(bedStand(x.i).x - p.x, bedStand(x.i).y - p.y) })).sort((a, b) => a.d - b.d)[0];
      this.plantAt(near.i); return;
    }
    if (this.held.item === 'sprinkler') { // Step 6b: sprinkler in hand -> water the nearest planted bed that is still dry; the sprinkler stays in hand
      const dry = s.plots.map((pl, i) => ({ pl, i })).filter(x => x.pl.crop && !x.pl.watered && FARM_BEDS[x.i]);
      if (!dry.length && readyBeds(s).length) { toast(`<b>Bed ${readyBeds(s)[0] + 1} is ready to harvest.</b> Put the water can back on its stand next to the beds first.`, { kind: 'warn' }); sfx.warn(); return; }
      if (!dry.length) { toast(s.plots.some(x => x.crop) ? '<b>Every planted bed is already watered.</b> Keep the sprinkler for tomorrow, or put it back on its stand next to the beds.' : '<b>Nothing to water yet.</b> Plant a seed first.', { kind: 'warn' }); sfx.warn(); return; }
      const near = dry.map(x => ({ ...x, d: Math.hypot(bedStand(x.i).x - p.x, bedStand(x.i).y - p.y) })).sort((a, b) => a.d - b.d)[0];
      this.waterAt(near.i); return;
    }
    const ready = readyBeds(s); // Step 6c: a ripe bed is harvested by reaching for it; otherwise the farm panel opens (read-only)
    if (ready.length) {
      if (this.held.item) { toast(`<b>${this.held.item === 'harvest' ? STORE_ONLY_FOOD_BIN + ' Carry it to the food bin in the storage room.' : HARVEST_NEED_FREE_HANDS}</b>`, { kind: 'warn' }); sfx.warn(); return; }
      const near = ready.map(k => ({ i: k, d: Math.hypot(bedStand(k).x - p.x, bedStand(k).y - p.y) })).sort((a, b) => a.d - b.d)[0];
      this.harvestAt(near.i); return;
    }
    openFarm(h);
    if (empty.length) toast(`<b>Bed ${empty[0].i + 1} is empty.</b> Take a seed packet from the seed drawer in the storage room, hold it, then press E at the bed.`, { kind: 'warn' });
    const thirsty = s.plots.findIndex(x => x.crop && !x.watered && x.growth < CROPS[x.crop].sols);
    if (thirsty >= 0 && this.held.item !== 'seed_packet') toast(`<b>Bed ${thirsty + 1} needs water.</b> ${NEED_SPRINKLER_MSG} Then press E at the bed.`, { kind: 'warn' });
  }
  plantAt(i: number) {
    const s = this.state(), plot = s.plots[i], crop = this.held.crop; if (!plot || !crop) return;
    const bad = plantProblem(s, this.held, plot.id); if (bad) { toast(`<b>${bad}</b>`, { kind: 'warn' }); sfx.warn(); return; }
    playAction(this, 'plant_seed', {
      stand: bedStand(i), face: 'right',
      onBeat: () => { // the packet leaves the hands and the soil mound appears at this exact moment; act() charges the energy
        if (plantProblem(s, this.held, plot.id)) return;
        void this.run('plant', { plot: plot.id, crop, packet: crop }); // act() runs synchronously inside run()
        if (plot.crop === crop) { putDown(this.held, 'seed_packet'); sparkle(this, world.player.x + 24, world.player.y - 6); } // only if it really went in
      },
    });
  }
  // Step 13a: the repair pattern. Hold a spare part (from storage), kneel at the pump, a ring fills while cyan sparks fly; at the LAST step
  // act('repair_watering') spends the energy and one part, and the art switches BROKEN -> REPAIRED. Nothing changes before that beat.
  // Step 15b: the pump control. Working pump: a two-card menu picks automatic or manual, the explorer walks to the pump, presses the control,
  // and act('watering_mode') switches at the beat (the art follows plot of state: light, hose, flowing pipes). Broken after the storm: repair it.
  // Step 21b: the ice run. Kneel at the candidate ice sheet (outside) and chip ice into a plastic container (cyan shards, no heat);
  // energy + suit air are spent at the LAST step and the full container goes into the hands. Carry it inside and pour it into the water-maker intake.
  iceAct() {
    const s = this.state(), bad = iceProblem(s, this.held.item); if (bad) { toast(`<b>${bad}</b>`, { kind: 'warn' }); sfx.warn(); return; }
    playAction(this, 'ice_chip', {
      stand: { x: ICE_MARKER[0] * T, y: ICE_MARKER[1] * T }, face: 'left',
      onBeat: () => {
        if (iceProblem(s, this.held.item)) return;
        void this.run('ice_chip', { held: this.held.item ?? '' });
        if (s.flags[ICE_COLLECTED]) { pickUp(this.held, 'ice_sample'); sfx.ok(); const p = this.iceArt!.shards(); sparkle(this, p.x, p.y); world.pop(world.player.x, world.player.y - 48, 'ICE COLLECTED', '#8ceaff'); }
      },
    });
  }
  intakeAct() {
    const s = this.state();
    if (s.ep?.phase !== 'ice') { openLs(this.host); return; }
    const bad = pourProblem(s, this.held.item); if (bad) { toast(`<b>${bad}</b>`, { kind: 'warn' }); sfx.warn(); return; }
    playAction(this, 'ice_pour', {
      stand: { x: INTAKE_MARKER[0] * T, y: INTAKE_MARKER[1] * T }, face: 'left',
      onBeat: () => {
        if (pourProblem(s, this.held.item)) return;
        void this.run('ice_pour', { held: this.held.item ?? '' });
        if (s.ep?.phase === 'done') { putDown(this.held, 'ice_sample'); sfx.ok(); sparkle(this, INTAKE_MARKER[0] * T, INTAKE_MARKER[1] * T - 30); world.pop(world.player.x, world.player.y - 48, 'WATER MAKER ON', '#8cffc6'); }
      },
    });
  }
  // Step 16a: the panel lever. Pull it to STOW (or put the panels back OUT). Core flips at the animation beat; the handle and panels follow the state.
  leverAct() {
    const s = this.state();
    const after = s.ep?.phase === 'after';
    if (!s.ep || s.ep.phase === 'done' || (!after && !s.ep.stormCall)) { toast('<b>The panel lever is only needed during the storm.</b>', { kind: 'warn' }); sfx.warn(); return; }
    if (after && !s.ep.panelsStowed) { toast('<b>The panels are already out. Go outside and clean them.</b>', { kind: 'warn' }); sfx.warn(); return; }
    playAction(this, 'panel_lever', {
      stand: leverStand(), face: 'right',
      onBeat: () => { const was = !!s.ep!.panelsStowed; void this.run('panels'); if (!!s.ep!.panelsStowed !== was) { sfx.ok(); world.pop(world.player.x, world.player.y - 48, s.ep!.panelsStowed ? 'Panels stowed' : 'Panels out', s.ep!.panelsStowed ? '#ffb340' : '#8ceaff'); } },
    });
  }
  // Step 16b: panels left out are dug out and cleaned by hand, outside, with a kneel animation. The Solar Farm panel only shows info.
  solarAct(h: Host) {
    const s = this.state();
    if (!s.ep || s.ep.phase !== 'after' || s.ep.panelsCleaned || s.ep.panelsStowed || !s.outside) { openSolar(h); return; }
    playAction(this, 'clean_panels', { stand: { x: MARKERS.solar[0] * T, y: MARKERS.solar[1] * T }, face: 'right', onBeat: () => { void this.run('clean_panels'); } });
  }
  humT = 0;
  /** Low electric hum from the pump while it runs automatically (only when the explorer is in the indoor farm, so it never nags elsewhere). */
  updatePumpHum(dtms: number) {
    const s = this.state(); if (!pumpRunning(s) || roomAt(Math.floor(world.player.x / T), Math.floor(world.player.y / T)) !== 'farm') { this.humT = 0; return; }
    this.humT -= dtms; if (this.humT <= 0) { this.humT = 1400; sfx.hum(); }
  }
  pumpAct() {
    const s = this.state(); if (!s.ep) return;
    if (!pumpUsable(s)) { this.repairPump(); return; }
    openPumpMode(s.wateringMode, mode => this.setPumpMode(mode));
  }
  setPumpMode(mode: 'automatic' | 'manual') {
    const s = this.state(), bad = wateringModeProblem(s, mode); if (bad) { toast(`<b>${bad}</b>`, { kind: 'warn' }); sfx.warn(); return; }
    playAction(this, 'pump_mode', {
      stand: pumpStand(), face: 'left',
      onBeat: () => {
        void this.run('watering_mode', { mode }); // act() runs synchronously inside run()
        if (s.wateringMode === mode) { sfx.ok(); world.pop(world.player.x, world.player.y - 48, mode === 'automatic' ? 'Pump ON' : 'Pump OFF', mode === 'automatic' ? '#8ceaff' : '#ffb340'); }
      },
    });
  }
  repairPump() {
    const s = this.state(), bad = pumpProblem(s, this.held); if (bad) { toast(`<b>${bad}</b>`, { kind: 'warn' }); sfx.warn(); return; }
    const reduced = prefersReducedMotion(); this.repairBeat = Math.max(1, buildTimeline(ACTION_DEFS.repair_pump, reduced).beatAt);
    const end = () => { this.repairMs = -1; this.pumpArt?.setRing(null); };
    this.ringFn = p => this.pumpArt?.setRing(p);
    playAction(this, 'repair_pump', {
      stand: pumpStand(), face: 'left',
      onBeat: () => {
        end(); if (pumpProblem(s, this.held)) return;
        void this.run('repair_watering', { part: 'spare_part' }); // act() runs synchronously inside run()
        if (s.ep?.wateringFixed) { putDown(this.held, 'spare_part'); sfx.ok(); sparkle(this, world.player.x - 22, world.player.y - 24); world.pop(world.player.x, world.player.y - 48, 'Pump repaired', '#8cffc6'); }
      },
      onDone: end, onAbort: end,
    });
    this.repairMs = 0; // the ring starts filling once the explorer has arrived and is kneeling (see update)
  }
  // Step 13b: comms console and kitchen appliances use the same repair pattern. With a spare part in hand and the machine broken, E repairs it;
  // otherwise E opens the normal panel. Nothing breaks these yet (Step 14 breaks the comms console).
  commsAct() { if (this.held.item === 'spare_part' && isBroken(this.state(), 'comms')) this.repairMachine('comms'); else openComms(this.host); }
  // Step 14c: branch B. The dish is outside; hold a spare part, kneel on the rock strip south of it, a ring fills, and at the LAST step
  // act('repair_dish') spends the energy and one part and the dish art goes from BROKEN to working. The comms console stays broken (static, late replies).
  dishRing?: Phaser.GameObjects.Graphics;
  repairDish() {
    const s = this.state(), why = () => dishProblem(s, this.held.item === 'spare_part', stockOf(s, 'parts')), bad = why(); if (bad) { toast(`<b>${bad}</b>`, { kind: 'warn' }); sfx.warn(); return; }
    this.repairBeat = Math.max(1, buildTimeline(ACTION_DEFS.repair_dish, prefersReducedMotion()).beatAt);
    const ring = (this.dishRing ??= this.add.graphics().setDepth(12 * 32));
    const draw = (p: number | null) => { ring.clear(); if (p === null) return; const cx = 40.9 * 32, cy = 10.75 * 32 - 56, a0 = -Math.PI / 2; ring.lineStyle(3, 0x143a56, 0.9); ring.beginPath(); ring.arc(cx, cy, 8, 0, Math.PI * 2); ring.strokePath(); ring.lineStyle(3, 0x8ceaff, 1); ring.beginPath(); ring.arc(cx, cy, 8, a0, a0 + Math.PI * 2 * Math.max(0.001, Math.min(1, p))); ring.strokePath(); };
    const end = () => { this.repairMs = -1; draw(null); };
    this.ringFn = draw;
    playAction(this, 'repair_dish', {
      stand: { x: 40.9 * 32, y: 10.75 * 32 }, face: 'right',
      onBeat: () => {
        end(); if (why()) return;
        void this.run('repair_dish', { part: 'spare_part' }); // act() runs synchronously inside run()
        if (!isDishBroken(s)) { putDown(this.held, 'spare_part'); sfx.ok(); sparkle(this, world.player.x - 22, world.player.y - 24); world.pop(world.player.x, world.player.y - 48, 'Dish repaired', '#8cffc6'); }
      },
      onDone: end, onAbort: end,
    });
    this.repairMs = 0;
  }
  kitchenAct() { const m = this.held.item === 'spare_part' ? brokenKitchenMachine(this.state()) : null; if (m) this.repairMachine(m); else openKitchen(this.host); }
  repairMachine(id: MachineId) {
    const s = this.state(), bad = machineProblem(s, this.held, id); if (bad) { toast(`<b>${bad}</b>`, { kind: 'warn' }); sfx.warn(); return; }
    this.repairBeat = Math.max(1, buildTimeline(ACTION_DEFS.repair_machine, prefersReducedMotion()).beatAt);
    const end = () => { this.repairMs = -1; this.repairArt?.setRing(id, null); };
    this.ringFn = p => this.repairArt?.setRing(id, p);
    const st = MACHINE_STAND[id];
    playAction(this, 'repair_machine', {
      stand: { x: st.x, y: st.y }, face: st.face,
      onBeat: () => {
        end(); if (machineProblem(s, this.held, id)) return;
        void this.run('repair_machine', { machine: id, part: 'spare_part' }); // act() runs synchronously inside run()
        if (!isBroken(s, id)) { putDown(this.held, 'spare_part'); sfx.ok(); sparkle(this, world.player.x - 22, world.player.y - 24); world.pop(world.player.x, world.player.y - 48, `${MACHINE_NAMES[id]} repaired`, '#8cffc6'); }
      },
      onDone: end, onAbort: end,
    });
    this.repairMs = 0;
  }
  // Step 6b: pour from the sprinkler. Droplets, the wet soil and the tank dropping all happen at the beat; act('water') charges the energy there.
  waterAt(i: number) {
    const s = this.state(), plot = s.plots[i]; if (!plot) return;
    const bad = wateringProblem(s, this.held, plot.id); if (bad) { toast(`<b>${bad}</b>`, { kind: 'warn' }); sfx.warn(); return; }
    playAction(this, 'water_bed', {
      stand: bedStand(i), face: 'right',
      onBeat: () => {
        if (wateringProblem(s, this.held, plot.id)) return;
        void this.run('water', { plot: plot.id, tool: 'sprinkler' }); // act() runs synchronously inside run(); the sprinkler stays in hand
        if (plot.watered) { const [bx, by] = FARM_BEDS[i]; waterDroplets(this, (bx + 1) * 32, (by + 0.8) * 32); } // 24f: the drops fall ON the bed, whichever side you stand
      },
    });
  }
  // Step 6c: reach and pull. At the beat the bed empties, the energy is spent, the food stock rises (act('harvest')) and the crop is in the hands.
  harvestAt(i: number) {
    const s = this.state(), plot = s.plots[i]; if (!plot) return;
    const bad = harvestProblem(s, this.held, plot.id); if (bad) { toast(`<b>${bad}</b>`, { kind: 'warn' }); sfx.warn(); return; }
    const crop = plot.crop!;
    playAction(this, 'harvest_crop', {
      stand: bedStand(i), face: 'right',
      onBeat: () => {
        if (harvestProblem(s, this.held, plot.id)) return;
        void this.run('harvest', { plot: plot.id }); // act() runs synchronously inside run()
        if (!plot.crop) { pickUp(this.held, 'harvest', crop); sparkle(this, world.player.x + 24, world.player.y - 10); world.pop(world.player.x, world.player.y - 48, `${CROPS[crop].name} · carry it to the food bin`, '#8cffc6'); }
      },
    });
  }
  // Step 6c: reach into the food bin; the lid pops and the crop leaves the hands at the beat.
  storeCrop(i: number) {
    playAction(this, 'store_crop', {
      stand: binStand(i), face: 'right',
      onBeat: () => { const was = this.held.crop; if (putDown(this.held, 'harvest').ok) { storageArt?.setOpen(i, true); sfx.ok(); sparkle(this, world.player.x, world.player.y - 34); world.pop(world.player.x, world.player.y - 48, `${was ? CROPS[was].name : 'Crop'} stored`, '#8cffc6'); } },
      onDone: () => storageArt?.setOpen(i, false),
      onAbort: () => storageArt?.setOpen(i, false),
    });
  }
  // PROOF 1 of the action system: the explorer kneels and pulls the bands, THEN the workout panel opens.
  pullBands() {
    const h = this.host;
    playAction(this, 'pull_bands', {
      stand: { x: 31 * T, y: 4.8 * T }, face: 'right',
      onBeat: () => { world.wing.setBands(true); sfx.ok(); sparkle(this, world.player.x + 22, world.player.y - 22); },
      onDone: () => { world.wing.setBands(false); if (!UI.blocking() && !this.busy) openGym(h, 'bands'); },
      onAbort: () => world.wing.setBands(false),
    });
  }
  // PROOF 2: take a prop off a rack (or put it back) with a reach animation, then carry it anywhere.
  // One item at a time. The hands change at the animation beat, never before.
  useRack(zone: string, crop: CropId | null = null) {
    const rack = rackByZone(zone); if (!rack) return;
    const rule = RACK_RULE(this.held.item, rack.item);
    if (rule === 'full') { toast('<b>Put your item down first.</b> Your hands are full.', { kind: 'warn' }); sfx.warn(); return; }
    // Seed drawer: choose which UNLOCKED crop's packet to take first (menu only), then reach in.
    if (rack.item === 'seed_packet' && rule === 'pick_up' && !crop) { openSeedPicker(unlockedCrops(this.state()), c => this.useRack(zone, c)); return; }
    playAction(this, rule, {
      stand: rackStand(rack), face: rack.wall === 'west' || !rack.wall ? 'left' : 'right',
      onBeat: () => {
        const r = rule === 'pick_up' ? pickUp(this.held, rack.item, crop) : putDown(this.held, rack.item);
        if (r.ok) { sfx.ok(); sparkle(this, world.player.x - 22, world.player.y - 28); world.pop(world.player.x, world.player.y - 44, rule === 'pick_up' ? (crop ? `${CROPS[crop].name} seeds` : PROP_NAMES[rack.item]) : 'Put back', '#8cffc6'); }
      },
    });
  }
  // Step 3b: walk to a storage bin, reach in (lid pops at the beat), then the wall screen lists what it holds. Read-only.
  openBin(zone: string) {
    const i = binIndex(zone); if (i < 0) return;
    const id = BIN_IDS[i];
    if (this.held.item === 'harvest') { if (id === 'food') this.storeCrop(i); else { toast(`<b>${STORE_ONLY_FOOD_BIN}</b>`, { kind: 'warn' }); sfx.warn(); } return; }
    playAction(this, 'open_bin', {
      stand: binStand(i), face: 'right',
      onBeat: () => { storageArt?.setOpen(i, true); sfx.ok(); sparkle(this, world.player.x, world.player.y - 34); },
      onDone: () => { if (!UI.blocking() && !this.busy) this.showBinScreen(i, id); else storageArt?.setOpen(i, false); },
      onAbort: () => storageArt?.setOpen(i, false),
    });
  }
  showBinScreen(i: number, id: (typeof BIN_IDS)[number]) {
    const v = binView(this.state(), id);
    const rows = v.lines.map(l => `<div class="row" style="justify-content:space-between"><span>${esc(l.label)}</span><b>${l.count} <small>${esc(l.unit)}</small></b></div>`).join('');
    const el = overlay('bin', `<div class="holo-panel">${head('base', 'Storage screen: ' + v.title)}<div class="panel-body">${rows}<p class="why">Read-only list. Close the bin when you are done.</p><div class="row" style="justify-content:flex-end"><button class="holo-btn small" data-close>CLOSE BIN ▸</button></div></div></div>`);
    new MutationObserver((_m, ob) => { if (!el.isConnected) { storageArt?.setOpen(i, false); ob.disconnect(); } }).observe(document.getElementById('overlays')!, { childList: true });
  }
  // A workout: the rhythm mini-game (skippable), then the explorer is shown on the machine, then the result.
  async doWorkout(m: Machine) {
    if (this.busy) return;
    // Step 13c: the explorer stands ON the machine and loops the verb (pull bands, pedal, row) while the small timing bar runs; each good hit flashes.
    const spot: Record<Machine, [number, number]> = { bands: [31, 4.8], bike: [33.9, 5.5], rower: [37.2, 5.3] };
    const p = world.player; p.x = spot[m][0] * T; p.y = spot[m][1] * T; this.facing = m === 'bike' ? 'up' : 'side'; this.flip = m === 'rower';
    const stop = () => { world.wing.setRower(false); world.wing.spin(false); world.wing.setBands(false); };
    if (m === 'rower') world.wing.setRower(true); if (m === 'bike') world.wing.spin(true); if (m === 'bands') world.wing.setBands(true);
    const loop = { frame: 'in_up_stand', ...(m === 'bike' ? { frames: ['in_up_step1', 'in_up_stand', 'in_up_step2', 'in_up_stand'] } : { pose: { name: 'pull' as const, count: 5, ms: m === 'rower' ? 260 : 200 } }) };
    const mine: NonNullable<WorldScene['acting']> = this.acting = { ...loop, until: performance.now() + 120000 }; // a cap, so the controls can never stay locked
    const done = await playWorkout(m, { onHit: () => { sparkle(this, p.x, p.y - 26); world.pop(p.x, p.y - 48, 'GOOD!', '#8cffc6'); p.setTint(0x9ff0ff); this.time.delayedCall(140, () => p.clearTint()); } });
    if (this.acting !== mine) { stop(); return; }
    if (!done) { this.acting = null; stop(); return; }
    mine.until = performance.now() + (m === 'bike' ? 900 : 700);
    mine.then = () => { stop(); void this.run('workout', { machine: m }); };
  }
  // Step 8b: the suit rack. Put on / take off is a physical animation; the suit changes at the beat (act('suit')). Never automatic, never hinted.
  suitAct() {
    const s = this.state(); if (s.outside) return;
    if (this.held.item) { toast('Put your item down first.', { kind: 'warn' }); sfx.warn(); return; }
    const on = s.suitOn, [mx, my] = MARKERS.suit;
    playAction(this, on ? 'suit_off' : 'suit_up', {
      stand: { x: mx * T, y: my * T }, face: 'right',
      onBeat: () => { void this.run('suit'); sfx.ok(); sparkle(this, world.player.x, world.player.y - 20); },
    });
  }
  // Step 2d: the Episode 1 meal hatch. With a prepared tray, the serve animation is the ONLY way the crew gets fed.
  hatchAct() {
    const s = this.state(); if (!s.flags.tray_ready) { openKitchen(this.host); return; }
    if (this.held.item && this.held.item !== 'tray') { toast('Put your item down first.', { kind: 'warn' }); sfx.warn(); return; }
    if (!this.held.item) pickUp(this.held, 'tray');
    const wasHungry = CREW_IDS.filter(id => s.crew[id].hunger >= CREW_LIFE.PECKISH_AT);
    playAction(this, 'serve_tray', {
      stand: { x: 11.5 * T, y: 11.7 * T }, face: 'right',
      onBeat: () => { putDown(this.held, 'tray'); void this.run('serve_tray').then(() => { for (const id of wasHungry) if (s.crew[id].hunger === 0) world.crew.react(id, 'heart'); }); },
    });
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
    if (UI.blocking() || this.busy || !world.ready || this.action.locked) return;
    const cam = this.cameras.main;
    const sx = (clientX - bounds.left) * cam.width / bounds.width;
    const sy = (clientY - bounds.top) * cam.height / bounds.height;
    const point = cam.getWorldPoint(sx, sy);
    const tx = Math.floor(point.x / T), ty = Math.floor(point.y / T);
    const s = this.state();
    for (const k of Object.keys(ZONES)) {
      const z = ZONES[k];
      const hitZone = k === 'solar'
        ? isSolarPanelTile(tx, ty)
        : objectHit(k, point.x, point.y); // Step 24b: only the object itself, never the whole room
      if (hitZone && this.zoneOk(k, s, s.outside === false)) {
        const [mx, my] = MARKERS[k]; this.walkToPoint(new Phaser.Math.Vector2(mx * T, my * T), k, s); sfx.click(); return;
      }
    }
    this.walkToPoint(point, null, s); sfx.click();
  }
  walkToPoint(point: Phaser.Math.Vector2, autoActZone: string | null, s: GameState): boolean {
    const target = {
      x: clamp(Math.floor(point.x / T), 0, W - 1),
      y: clamp(Math.floor(point.y / T), 0, H - 1),
    };
    const start = { x: Math.floor(world.player.x / T), y: Math.floor(world.player.y / T) };
    const path = pathToClosestReachable(W, H, start, target, (x, y) =>
      world.blocked[y][x] || (lockedIn(s) && y >= 18 && x >= 15 && x <= 16),
    );
    const destination = new Phaser.Math.Vector2(
      clamp(point.x, target.x * T + 8, (target.x + 1) * T - 8),
      clamp(point.y, target.y * T + 8, (target.y + 1) * T - 8),
    );
    this.movePath = path.path.map(tile => new Phaser.Math.Vector2((tile.x + 0.5) * T, (tile.y + 0.5) * T));
    if (path.reached && this.movePath.length) this.movePath[this.movePath.length - 1] = destination;
    this.moveTarget = this.movePath.shift() ?? (path.reached ? destination : null);
    this.autoActZone = autoActZone;
    return path.reached;
  }
  zoneOk(k: string, s: GameState, ins: boolean) {
    const q = ZONES[k]; if (q.inside !== ins) return false;
    if (k === 'rover') return s.buildings.includes('rover_bay'); if (k === 'cave') return !!s.flags.cave_unlocked; if (k === 'hatch') return !s.flags.quarantine_over; if (['kitchen', 'suit', 'bands', 'bike', 'rower', 'lab', 'bath', ...PROP_RACKS.map(r => r.zone)].includes(k)) return !!s.ep; return true;
  }
  meterGlows: Record<string, Phaser.GameObjects.Rectangle> = {};
  curLabel = ''; refillT = 0; wasRefilling = false; tankGlow?: Phaser.GameObjects.Arc; coughT = 600; coughLeft = 0; warned: FailureId[] = []; roomLabels?: Phaser.GameObjects.Text[];
  promptLabel(z: string) { return z === 'farm' && this.held.item === 'seed_packet' && this.held.crop ? `Plant ${CROPS[this.held.crop].name} · −${ACTION_ENERGY.plant}⚡` : ZONES[z].label; }
  setPrompt(z: string | null) {
    const act = $('#act') as HTMLButtonElement;
    const label = z ? this.promptLabel(z) : '';
    const info = z ? promptInfo(this.state(), z, this.held, ZONES[z].label) : null, html = info ? promptHtml(info) : '';
    if (z === this.curZone && html === this.curLabel && !UI.blocking()) return; this.curZone = z; this.curLabel = html;
    if (!z || UI.blocking()) { act.hidden = true; return; }
    act.hidden = false; act.innerHTML = html;
  }
  // Step 24g: the radar dot goes to the nearest of the NOW and NEXT objective zones (pure pick in core/radar.ts).
  radarPick(s: GameState) { return pickRadarTarget(objectiveZones(s), MARKERS, { x: world.player.x / T, y: world.player.y / T }); }
  guide(s: GameState): string | null {
    if (s.ep) {
      const ep = s.ep, dry = s.plots.some(p => p.crop && !p.watered && s.hour < 21), hungry = CREW_IDS.some(id => s.crew[id].hunger >= CREW_LIFE.HUNGRY_AT) && s.res.food >= CREW_LIFE.FOOD_NEEDED;
      const out = (z: string) => z;
      if (ep.phase === 'call') return 'sick';
      if (ep.phase === 'check') { const nx = SYSTEMS.find(x => !ep.checked.includes(x)); return nx === 'air' || nx === 'water' ? 'ls' : nx === 'plants' ? 'farm' : nx === 'comms' ? 'comms' : nx === 'solar' ? out('solar') : null; }
      if (ep.phase === 'after') return ep.panelsStowed ? 'lever' : !ep.panelsCleaned ? out('solar') : !ep.wateringFixed ? 'pump' : null;
      if (ep.phase === 'ice') return s.flags[ICE_COLLECTED] ? 'intake' : 'ice';
      if (ep.phase === 'done') return null;
      if (ep.stormCall === 'stow' && !ep.panelsStowed) return 'lever';
      return hungry ? 'kitchen' : dry ? 'farm' : null;
    }
    if (s.plots.some(p => p.crop && p.growth >= CROPS[p.crop].sols)) return 'farm';
    if (!s.plots.some(p => p.crop)) return 'farm';
    if (!s.flags.quarantine_over && CREW_IDS.some(id => s.crew[id].hunger >= CREW_LIFE.HUNGRY_AT) && s.res.food >= CREW_LIFE.FOOD_NEEDED) return 'kitchen';
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
    { const ls = pickLifeSupportState(s); world.lifeArt?.update(ls.o2On, ls.waterOn, s.res.o2, s.res.water, t, prefersReducedMotion()); } // Step 26b
    world.dishArt?.update(isDishBroken(s), t, prefersReducedMotion()); // Step 26c
    // Room names: hidden while you stand in that room, half strength everywhere else.
    this.roomLabels ??= (this.children.list.filter((o: any) => o.getData?.('room')) as Phaser.GameObjects.Text[]).map(o => { o.setScale(0.7); return o; }); // smaller room names
    let here = roomAt(Math.floor(world.player.x / T), Math.floor((world.player.y - 4) / T));
    if (!here && world.player.x >= BAY.x0 && world.player.x < BAY.x1 && world.player.y >= BAY.y0 && world.player.y < BAY.y1) here = 'q_' + CREW_IDS[Math.min(3, Math.floor((world.player.x - BAY.x0) / ((BAY.x1 - BAY.x0) / 4)))];
    for (const o of this.roomLabels) o.setAlpha(o.getData('room') === here ? 0 : 0.45);
    if (this.acting && t >= this.acting.until) { const a = this.acting; this.acting = null; a.then?.(); }
    const blocking = UI.blocking() || this.busy || !!s.failed || !!this.acting;
    let dx = 0, dy = 0;
    if (!blocking) {
      const free = !this.action.locked; // keys and joystick are ignored while an action plays
      if (free && (keys.a || keys.arrowleft)) dx -= 1; if (free && (keys.d || keys.arrowright)) dx += 1; if (free && (keys.w || keys.arrowup)) dy -= 1; if (free && (keys.s || keys.arrowdown)) dy += 1;
      if (free && joy.id !== null && Math.hypot(joy.x, joy.y) > 0.15) { dx += joy.x; dy += joy.y; }
      if (free && (dx !== 0 || dy !== 0) && (this.moveTarget || this.movePath.length)) { this.moveTarget = null; this.movePath = []; this.autoActZone = null; }
      if (this.moveTarget) {
        const ddx = this.moveTarget.x - p.x, ddy = this.moveTarget.y - p.y;
        if (Math.hypot(ddx, ddy) < 8) {
          this.moveTarget = this.movePath.shift() ?? null;
          if (this.moveTarget) { dx += this.moveTarget.x - p.x; dy += this.moveTarget.y - p.y; }
        } else { dx += ddx; dy += ddy; }
      }
      if (this.action.phase === 'posing') { dx = 0; dy = 0; } // standing still while the poses play
      const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
      const sp = s.outside ? 86 : 100; const nx = p.x + dx * sp * dt; if (!this.hit(nx, p.y)) p.x = nx; const ny = p.y + dy * sp * dt; if (!this.hit(p.x, ny)) p.y = ny;
      if (Math.hypot(dx, dy) > 0.1) { this.anim += dt * 8; if (Math.abs(dx) > Math.abs(dy) * 1.2) { this.facing = 'side'; this.flip = dx < 0; } else this.facing = dy < 0 ? 'up' : 'down'; } else this.anim = 0;
      const r = advance(s, dt * HOURS_PER_SEC);
      if (s.flags.tmp_passout) { void this.passOut(String(s.flags.tmp_passout)); return; }
      if (s.ep) { // Step 7b: sustained critical states fail, warnings flash amber and Reyes speaks once
        const chk = evaluateFailures(s, dt * HOURS_PER_SEC);
        if (chk.failure) { void this.failure(chk.failure); return; }
        for (const w of newWarnings(this.warned, chk.warnings)) { warnFlash(this.warnTargets(w, s)); const line = WARNING_LINES[w]; if (line) { toast(`<b>Capt. Reyes (intercom):</b> “${line}”`, { kind: 'warn', ms: 5000 }); sfx.warn(); } }
        this.warned = chk.warnings;
      }
      if (s.pending && !this.busy) { void this.afterAction(); return; }
      if (r.blackout) { this.resetPlayer(true); sfx.warn(); this.refresh(); showSimple('suit', 'Suit blackout!', '<p class="line">Your suit ran out of air. You were towed back inside and lost time, energy and power.</p>'); }
      if (r.dayOver) { void this.sleepFlow(); return; }
      if (s.failed) { void this.failFlow(); return; }
    }
    stepAction(this, Math.min(dtms, 100)); // arrival, poses, beat, unlock (runs even while a panel is open, so it can never stay locked)
    const moving = Math.hypot(dx, dy) > 0.1, step = moving ? [1, 0, 2, 0][Math.floor(this.anim) % 4] : 0;
    const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T), ins = !!(world.inside[ty] && world.inside[ty][tx]);
    if (s.outside === ins) { s.outside = !ins; if (s.outside) { toast('<b>Outside!</b> Watch your meters.', { kind: 'warn' }); sfx.warn(); } else if (s.suitOn) { toast('<b>Inside.</b> Suit refilling.', { kind: 'good' }); sfx.ok(); } refreshHud(s); }
    music.location(s.outside ? 'outdoor' : 'indoor');
    const pose = (['step1', 'stand', 'step2', 'stand'] as const)[step === 0 ? 1 : step === 1 ? 0 : 2];
    const suited = s.ep ? s.suitOn : s.outside;
    drawPlayer(this, t, suited, pose); this.racks?.setHeld(this.held.item);
    this.pumpArt?.setBroken(!!s.ep && !pumpUsable(s)); this.pumpArt?.setMode(s.wateringMode); this.leverArt?.setStowed(!!s.ep?.panelsStowed); this.iceArt?.update(s.ep?.phase === 'ice', !!s.flags[ICE_COLLECTED], waterMakerOff(s), this.time.now); this.pumpArt?.tick(dtms); this.updatePumpHum(dtms); this.racks?.setHighlight(s.ep && s.wateringMode === 'manual' && waterMeLabel(s) && this.held.item !== 'sprinkler' ? 'sprinkler' : null); this.repairArt?.sync(s);
    if (this.repairMs >= 0) { // progress ring + cyan sparks (never fire) while kneeling at the pump
      if (this.action.phase === 'posing') {
        this.repairMs += dtms; this.ringFn(Math.min(1, this.repairMs / this.repairBeat));
        this.sparkT -= dtms; if (this.sparkT <= 0) { this.sparkT = 260; sparkle(this, world.player.x - 20, world.player.y - 10, 0x8ff0ff); }
      } else if (!this.action.locked) { this.repairMs = -1; this.ringFn(null); }
    }
    // Step 8c: outside without the suit the explorer coughs and the screen edge flickers red. No text says why.
    const choking = !!s.ep && s.outside && !s.suitOn;
    document.body.classList.toggle('no-air', choking);
    if (choking) { this.coughT -= dtms; if (this.coughT <= 0) { this.coughT = 1700; this.coughLeft = 380; dustPuff(this, p.x + (this.flip ? -12 : 12), p.y - 36); sfx.cough(); } } else { this.coughT = 600; this.coughLeft = 0; }
    this.coughLeft = Math.max(0, this.coughLeft - dtms);
    // Step 24k: a low meter makes only its own object(s) pulse a soft red glow (slow 2 s cycle); it stops when the meter recovers.
    { const on = s.ep ? glowingObjects(s.res) : [], a = glowAlpha(t, prefersReducedMotion());
      for (const id of on) if (!this.meterGlows[id]) { const [gx, gy, gw, gh] = GLOW_OBJECTS[id].tiles; this.meterGlows[id] = this.add.rectangle(gx * T + (gw * T) / 2, gy * T + (gh * T) / 2, gw * T + 6, gh * T + 6, 0xff2a2a).setBlendMode(Phaser.BlendModes.ADD).setDepth(5000); }
      for (const [id, r] of Object.entries(this.meterGlows)) { r.setVisible(on.includes(id)); if (on.includes(id)) r.setAlpha(a); } }
    // Step 8d: low oxygen: the tank on the suit's back glows red. Inside, a worn suit refills with a hiss, cyan puffs and a chime when full.
    const low = !!s.ep && s.suitOn && s.outside && s.suit < FAIL.SUIT_AIR_WARN;
    if (low && !this.tankGlow) this.tankGlow = this.add.circle(0, 0, 4, 0xff2a2a).setBlendMode(Phaser.BlendModes.ADD);
    if (this.tankGlow) {
      this.tankGlow.setVisible(low);
      if (low) { const back = this.facing === 'up' ? [0, -26] : this.facing === 'side' ? [this.flip ? 9 : -9, -24] : [9, -32]; this.tankGlow.setPosition(p.x + back[0], p.y + back[1]).setDepth(p.y + 0.7).setAlpha(prefersReducedMotion() ? 0.85 : 0.5 + 0.5 * Math.sin(t / 170)); }
    }
    const refilling = suitRefillShows(s);
    if (refilling) { this.refillT -= dtms; if (this.refillT <= 0) { this.refillT = 700; sfx.refill(s.suit); sparkle(this, p.x + (this.flip ? 8 : -8), p.y - 30, 0x8ff0ff); } }
    else { this.refillT = 0; if (this.wasRefilling && s.suitOn && !s.outside) { sfx.ok(); sparkle(this, p.x, p.y - 30, 0xffffff); } }
    this.wasRefilling = refilling;
    p.setAngle(this.coughLeft > 0 && !prefersReducedMotion() ? Math.sin(this.coughLeft / 26) * 7 : 0);
    { // Step 24i: the sleep pod. The lid opens, the explorer climbs in and LIES VISIBLE under the glass-style lid (soft Zzz), the lid closes and the room dims.
      // At wake-up (the Sol report is closed) the room brightens, the lid opens and the explorer climbs out. The real player stays parked at the pod stand
      // (the camera follows it); a separate sleeper sprite does the climbing, so nothing ever vanishes.
      const act = this.action, f = this.actFrame, mine = act.current?.id === 'pod_sleep' && act.phase !== 'idle', lying = !!mine && f?.pose === 'sleep' && f.frame >= 2, rm = prefersReducedMotion();
      const v = stepPodSleep({ phase: this.podPhase, climb: this.podClimb }, { mine, lying, busy: this.busy }, dtms, rm);
      this.podPhase = v.phase; this.podClimb = v.climb;
      const inPod = v.inPod, asleep = v.asleep;
      this.podArt?.setLidTarget(v.lidOpen ? 0 : 1); // open to climb in, shut while asleep, open again to climb out
      const lid = this.podArt?.tick(dtms, rm) ?? 1;
      this.podArt?.setDimTarget(v.dimTarget);
      this.podArt?.setOccupied(asleep && lid > 0.85);
      if (!this.podSleeper) this.podSleeper = this.add.sprite(0, 0, PLAYER_ACT, 'in_' + actFrameName('sleep', 2)).setVisible(false);
      if (!this.podZ) this.podZ = this.add.text(0, 0, 'z Z', { fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontStyle: '700', color: '#cfeaff', stroke: '#0b1428', strokeThickness: 2 }).setOrigin(0.5).setDepth(484).setResolution(2).setVisible(false);
      const sl = this.podSleeper, zz = this.podZ;
      if (inPod) {
        const st = podStand(), c = this.podClimb, e = c * c * (3 - 2 * c), sy = st.y - 26, arc = Math.sin(Math.PI * c) * 12;
        p.setPosition(st.x, st.y); this.moveTarget = null; this.movePath = []; p.setVisible(false); world.shadow.setVisible(false);
        sl.setVisible(true).setTexture(PLAYER_ACT, 'in_' + actFrameName('sleep', Math.floor(t / 1300) % 2 === 0 ? 2 : 3)).setOrigin(0.5, 0.5)
          .setPosition(st.x + (podBay.x - st.x) * e, sy + (podBay.y - sy) * e - arc).setAngle(-90 * e).setScale(1 - 0.2 * e).setDepth(482); // between the pod body (481) and its lid (483)
        const zk = (t / 60) % 16; zz.setVisible(asleep && !rm).setPosition(podBay.x - 20 + Math.sin(t / 500) * 2, podBay.y - 14 - zk).setAlpha(0.9 * (1 - zk / 16));
      } else { sl.setVisible(false); zz.setVisible(false); p.setVisible(true); world.shadow.setVisible(true); }
    }
    p.setDepth(p.y); world.shadow.setPosition(p.x, p.y - 1).setDepth(p.y - 0.5);
    world.crew.update(t, dt, s);
    world.night.update(s.hour, envForSol(s.sol).dust, t, { playerOut: s.outside, px: p.x, py: p.y, roverBay: s.buildings.includes('rover_bay') });
    if (moving && s.outside && !blocking) { world.puff -= dt; if (world.puff <= 0) { world.puff = 0.14; const c = this.add.circle(p.x + (Math.random() * 6 - 3), p.y - 1, 2 + Math.random() * 2, 0xe6a67a, 0.6).setDepth(p.y - 1); this.tweens.add({ targets: c, y: c.y - 8, alpha: 0, scale: 2.2, duration: 600, onComplete: () => c.destroy() }); } }
    let z: string | null = null;
    if (!blocking) for (const k of Object.keys(ZONES)) {
      const q = ZONES[k];
      const inZone = k === 'solar'
        ? isNearSolarPanelTile(tx, ty)
        : tx >= q.x0 && tx <= q.x1 && ty >= q.y0 && ty <= q.y1;
      if (inZone && this.zoneOk(k, s, ins)) { z = k; break; }
    }
    this.setPrompt(z);
    if (z && z === this.autoActZone && !this.moveTarget && !blocking) { this.autoActZone = null; this.doAct(); }
    const a = world.arrow; a.clear(); const g = this.guide(s);
    if (g && !blocking) { let [mx, my] = MARKERS[g]; const needOut = !ZONES[g].inside; if (needOut === ins) { mx = 16; my = 17; } const bob = Math.sin(t / 220) * 5;
      a.fillStyle(0xffb340, 1); a.fillTriangle(mx * T - 9, my * T - 34 + bob, mx * T + 9, my * T - 34 + bob, mx * T, my * T - 18 + bob); a.lineStyle(2, 0xffb340, 0.7); const rr = 14 + ((t / 40) % 20); a.strokeCircle(mx * T, my * T, rr); a.lineStyle(2, 0xffb340, 0.25); a.strokeCircle(mx * T, my * T, rr + 8); }
    this.hudT += dt; if (this.hudT > 0.2) { this.hudT = 0; refreshHud(s); updateRadar(p.x / T, p.y / T, this.radarPick(s)); }
    // Radiation alarm: outside while the space weather alert is HIGH or STORM (the HUD chip also flashes RUN INSIDE!).
    if (s.ep && s.outside && !blocking && ['high', 'storm'].includes(alertFor(s))) { this.alarmT -= dt; if (this.alarmT <= 0) { this.alarmT = 2.5; sfx.alarm(); } } else this.alarmT = 0;
  }
}
export { CREW };
