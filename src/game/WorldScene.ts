import Phaser from 'phaser';
import { ACTION_ENERGY, BUILDINGS, CAVE_MAX, CROPS, FARM, LS } from '../core/constants';
import { describePending, poll, resolve } from '../core/director';
import { act, advance, emergencyShipment } from '../core/sim';
import { loadFromStorage, newSession, rewind, rewindableSols, saveToStorage, sleep, type Session } from '../core/session';
import { CREW } from '../story/crew';
import type { CropId, CrewId } from '../core/types';
import { BUILDING_SLOTS, CREW_SPOTS, H, OBJECTS, TILE, W, isBlocked, isOutside, kindAt, type Obj } from './map';
import { isBlocking, showJournal, showMenu, showMessage, showPending, showReport, toast, updateHud } from '../ui/ui';

const HOURS_PER_SEC = 0.1; // one Sol = 240 real seconds of daytime+night. Tune for pacing.
const SPEED = 62;
type Dir = 'down' | 'up' | 'left' | 'right';

export class WorldScene extends Phaser.Scene {
  sess!: Session;
  player!: Phaser.GameObjects.Sprite;
  dir: Dir = 'down';
  tiles = new Map<string, Phaser.GameObjects.Image>();
  objSprites = new Map<string, Phaser.GameObjects.Image>();
  cropSprites = new Map<string, Phaser.GameObjects.Image>();
  slotSprites = new Map<string, Phaser.GameObjects.Image>();
  npcs = new Map<string, Phaser.GameObjects.Sprite>();
  tint!: Phaser.GameObjects.Rectangle;
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  busy = false; syncTimer = 0; autosaveSol = 0; prompt!: Phaser.GameObjects.Text;

  constructor() { super('World'); }
  preload() { this.load.atlas('atlas', 'assets/atlas.png', 'assets/atlas.json'); }

  create() {
    this.sess = loadFromStorage() ?? newSession(Math.floor(Math.random() * 99999) + 1);
    const s = this.sess.state;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
      this.tiles.set(`${x},${y}`, this.add.image(x * TILE, y * TILE, 'atlas', this.tileFrame(x, y)).setOrigin(0).setDepth(0));
    for (const o of OBJECTS) if (o.frame) this.objSprites.set(o.id, this.add.image(o.x * TILE, o.y * TILE, 'atlas', o.frame).setOrigin(0).setDepth(2));
    for (const o of OBJECTS) if (o.type === 'plot') {
      this.tiles.get(`${o.x},${o.y}`)?.setFrame('tile_soil');
      this.cropSprites.set(o.id, this.add.image(o.x * TILE, o.y * TILE, 'atlas', 'crop_lettuce_0').setOrigin(0).setDepth(3).setVisible(false));
    }
    for (const [id, b] of Object.entries(BUILDING_SLOTS)) this.slotSprites.set(id, this.add.image(b.x * TILE, b.y * TILE, 'atlas', b.frame).setOrigin(0).setDepth(2).setVisible(false));
    for (const id of Object.keys(CREW)) this.npcs.set(id, this.add.sprite(0, 0, 'atlas', `char_${id}_down_0`).setOrigin(0.5, 1).setDepth(5));
    for (const id of ['player', ...Object.keys(CREW)]) for (const d of ['down', 'up', 'left', 'right'])
      this.anims.create({ key: `${id}_${d}`, frames: [0, 1].map(i => ({ key: 'atlas', frame: `char_${id}_${d}_${i}` })), frameRate: 6, repeat: -1 });
    this.player = this.add.sprite(15.5 * TILE, 14.5 * TILE, 'atlas', 'char_player_down_0').setOrigin(0.5, 1).setDepth(6);
    this.tint = this.add.rectangle(0, 0, W * TILE, H * TILE, 0x000000, 0).setOrigin(0).setDepth(20);
    this.prompt = this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '7px', color: '#fff', backgroundColor: '#000a', padding: { x: 2, y: 1 } }).setDepth(30).setVisible(false);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,M,SPACE') as Record<string, Phaser.Input.Keyboard.Key>;
    this.cameras.main.setBounds(0, 0, W * TILE, H * TILE).startFollow(this.player, true, 0.15, 0.15);
    const fit = () => { const z = Math.max(2, Math.round(Math.min(this.scale.width, this.scale.height) / 240)); this.cameras.main.setZoom(z); };
    this.scale.on('resize', fit); fit();
    this.syncWorld(); updateHud(s);
    this.autosaveSol = s.sol;
    this.time.delayedCall(300, () => void this.afterAction(true));
  }

  tileFrame(x: number, y: number): string {
    const k = kindAt(x, y, this.sess?.state ?? ({ flags: {} } as never));
    if (k === 'ground') return ((x * 7 + y * 13) % 5 === 0) ? 'tile_ground_b' : ((x * 3 + y * 11) % 7 === 0) ? 'tile_ground_dust' : 'tile_ground_a';
    return ({ floor: 'tile_floor', wall: 'tile_wall', glass: 'tile_glass', door: 'tile_door', ridge: 'tile_ridge' } as Record<string, string>)[k];
  }

  // Redraw everything that depends on game state.
  syncWorld() {
    const s = this.sess.state;
    for (let y = 8; y <= 10; y++) for (let x = 5; x <= 13; x++) this.tiles.get(`${x},${y}`)?.setFrame(this.tileFrame(x, y));
    for (const o of OBJECTS) { const spr = this.objSprites.get(o.id); if (spr) spr.setVisible(o.show ? o.show(s) : true); }
    for (const o of OBJECTS) if (o.type === 'plot') {
      const p = s.plots.find(q => q.id === o.id), spr = this.cropSprites.get(o.id)!;
      this.tiles.get(`${o.x},${o.y}`)?.setFrame(p ? (p.watered ? 'tile_soil_wet' : 'tile_soil') : this.tileFrame(o.x, o.y));
      if (p?.crop) { const st = Math.min(3, Math.floor((p.growth / CROPS[p.crop].sols) * 3.999)); spr.setFrame(`crop_${p.crop}_${st}`).setVisible(true); } else spr.setVisible(false);
    }
    for (const [id, spr] of this.slotSprites) spr.setVisible(s.buildings.includes(id));
    for (const [id, spr] of this.npcs) { const spot = CREW_SPOTS[id][s.flags.quarantine_over ? 'free' : 'sick']; spr.setPosition(spot[0] * TILE + 8, spot[1] * TILE + 16); }
    const h = s.hour, night = h < 6.5 || h > 19 ? 0.45 : h > 17.5 ? (h - 17.5) / 1.5 * 0.35 : 0;
    this.tint.setFillStyle(h > 17.5 && h <= 19 ? 0xc24a20 : 0x0a0a30, night);
    updateHud(s);
  }

  canWalk(px: number, py: number): boolean {
    const s = this.sess.state;
    for (const [dx, dy] of [[-4, -3], [4, -3], [-4, 0], [4, 0]]) if (isBlocked(Math.floor((px + dx) / TILE), Math.floor((py + dy) / TILE), s)) return false;
    return true;
  }

  update(_t: number, dtMs: number) {
    const s = this.sess.state, dt = dtMs / 1000;
    if (isBlocking() || this.busy) { this.player.anims.stop(); return; }
    let vx = 0, vy = 0;
    const k = this.keys;
    if (k.A.isDown || k.LEFT.isDown) vx = -1; else if (k.D.isDown || k.RIGHT.isDown) vx = 1;
    if (k.W.isDown || k.UP.isDown) vy = -1; else if (k.S.isDown || k.DOWN.isDown) vy = 1;
    if (vx || vy) {
      const len = Math.hypot(vx, vy), nx = this.player.x + (vx / len) * SPEED * dt, ny = this.player.y + (vy / len) * SPEED * dt;
      if (this.canWalk(nx, this.player.y)) this.player.x = nx;
      if (this.canWalk(this.player.x, ny)) this.player.y = ny;
      this.dir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down');
      this.player.anims.play(`player_${this.dir}`, true);
    } else { this.player.anims.stop(); this.player.setFrame(`char_player_${this.dir}_0`); }
    this.player.setDepth(6 + this.player.y / 1000);
    const out = isOutside(this.player.x / TILE, this.player.y / TILE);
    if (out !== s.outside) { s.outside = out; toast(out ? 'Suit on. Watch your suit air!' : 'Back inside. Suit refilling.'); }

    const r = advance(s, dt * HOURS_PER_SEC);
    if (r.blackout) { this.player.setPosition(15.5 * TILE, 15.5 * TILE); this.syncWorld(); void showMessage('Suit blackout!', ['Your suit ran out of air. You were towed back inside and lost time and energy.']); }
    this.syncTimer += dt;
    if (this.syncTimer > 0.4) { this.syncTimer = 0; this.syncWorld(); }
    if (r.dayOver) { void this.sleepFlow(); return; }
    if (s.failed) { void this.failureFlow(); return; }

    const near = this.nearest();
    this.prompt.setVisible(!!near);
    if (near) this.prompt.setText(`E: ${near.label}`).setPosition(this.player.x - 12, this.player.y - 42);
    if (Phaser.Input.Keyboard.JustDown(k.E) || Phaser.Input.Keyboard.JustDown(k.SPACE)) { if (near) void this.interact(near); }
    if (Phaser.Input.Keyboard.JustDown(k.M)) void this.mainMenu();
  }

  nearest(): Obj | null {
    const s = this.sess.state; let best: Obj | null = null, bd = 28;
    const cands: Obj[] = [...OBJECTS.filter(o => !o.show || o.show(s))];
    if (s.flags.quarantine_over) for (const id of Object.keys(CREW)) { const sp = CREW_SPOTS[id].free; cands.push({ id: `npc:${id}`, type: 'npc', x: sp[0], y: sp[1] - 1, label: `Talk to ${CREW[id as CrewId].name.split(' ')[0]}` }); }
    for (const o of cands) { const d = Math.hypot(o.x * TILE + (o.w ?? 1) * 8 - this.player.x, o.y * TILE + 8 - (this.player.y - 6)); if (d < bd) { bd = d; best = o; } }
    return best;
  }

  async afterAction(first = false) {
    const s = this.sess.state;
    poll(s); this.syncWorld();
    if (first && s.lastReport && s.sol > 1) await showReport(s);
    let guard = 0;
    while (s.pending && guard++ < 4) {
      const v = describePending(s); if (!v) break;
      const choice = await showPending(v);
      resolve(s, choice); poll(s); this.syncWorld();
    }
    this.syncWorld();
  }

  async doAct(name: Parameters<typeof act>[1], arg?: Parameters<typeof act>[2]) {
    const r = act(this.sess.state, name, arg); toast(r.msg);
    await this.afterAction();
    return r;
  }

  async interact(o: Obj) {
    if (this.busy) return; this.busy = true;
    try {
      const s = this.sess.state;
      switch (o.type) {
        case 'plot': {
          const p = s.plots.find(q => q.id === o.id)!;
          if (!p.crop) {
            const items = (Object.keys(CROPS) as CropId[]).filter(c => c !== 'tomato' || s.flags.tomato_unlocked).map(c => ({ id: c, label: CROPS[c].name, hint: `Ready in ${CROPS[c].sols} Sols · +${CROPS[c].food} food` }));
            const c = await showMenu('Plant what?', items, 'Cancel');
            if (c) await this.doAct('plant', { plot: p.id, crop: c as CropId });
          } else if (p.growth >= CROPS[p.crop].sols) await this.doAct('harvest', { plot: p.id });
          else if (!p.watered) await this.doAct('water', { plot: p.id });
          else toast(`${CROPS[p.crop].name}: ${Math.min(p.growth, CROPS[p.crop].sols).toFixed(1)} of ${CROPS[p.crop].sols} Sols`);
          break;
        }
        case 'console': await this.consoleMenu(); break;
        case 'intercom': {
          const c = await showMenu('Call the sick bay', (Object.keys(CREW) as CrewId[]).map(id => ({ id, label: CREW[id].name, hint: CREW[id].role })), 'Hang up');
          if (c) { const r = act(s, 'talk', { crew: c as CrewId }); await showMessage(CREW[c as CrewId].name, [r.msg]); await this.afterAction(); }
          break;
        }
        case 'npc': { const id = o.id.slice(4) as CrewId; const r = act(s, 'talk', { crew: id }); await showMessage(CREW[id].name, [r.msg]); await this.afterAction(); break; }
        case 'bed': { const c = await showMenu('Go to sleep?', [{ id: 'yes', label: 'Sleep until morning', hint: s.hour < 22 ? 'Full energy' : 'Late night: less rest' }], 'Not yet'); if (c) await this.sleepFlow(); break; }
        case 'solar': await this.doAct('clean_panels'); break;
        case 'rover': await this.doAct('explore'); break;
        case 'cave': await this.caveMenu(); break;
      }
    } finally { this.busy = false; }
  }

  async consoleMenu() {
    const s = this.sess.state;
    const c = await showMenu('Control Console', [
      { id: 'farm', label: `Grow-lights: ${FARM[s.farm].name}`, hint: 'Tap to switch' },
      { id: 'ls', label: `Air and water: ${LS[s.ls].name}`, hint: 'Tap to change' },
      { id: 'build', label: 'Build', hint: 'Construct new equipment' },
      { id: 'ship', label: 'Request Earth shipment', hint: 'Safe, but resets your self-sufficiency' },
      { id: 'journal', label: 'Mission Journal' },
    ]);
    if (c === 'farm') { s.farm = s.farm === 'bright' ? 'dim' : 'bright'; toast(FARM[s.farm].why); }
    else if (c === 'ls') {
      const m = await showMenu('Air and water', (Object.keys(LS) as (keyof typeof LS)[]).map(k => ({ id: k, label: LS[k].name, hint: LS[k].why })), 'Back');
      if (m) s.ls = m as keyof typeof LS;
    } else if (c === 'build') await this.buildMenu();
    else if (c === 'ship') await this.doAct('request_shipment');
    else if (c === 'journal') await showJournal(s);
    this.syncWorld();
  }

  async buildMenu() {
    const s = this.sess.state;
    const items = Object.entries(BUILDINGS).filter(([id, b]) => !s.buildings.includes(id) && s.stage >= b.stage)
      .map(([id, b]) => ({ id, label: b.name, hint: `${b.why} Cost: ${Object.entries(b.cost).map(([k, v]) => `${v} ${k === 'o2' ? 'air' : k}`).join(', ')} · ${ACTION_ENERGY.build} energy` }));
    if (!items.length) { toast('Nothing to build right now. Reach the next stage!'); return; }
    const c = await showMenu('Build', items, 'Back');
    if (c) await this.doAct('build', { building: c });
  }

  async caveMenu() {
    const s = this.sess.state;
    const v = (['explore', 'excavate', 'pressurize', 'shield'] as const);
    const hint: Record<string, string> = { explore: 'Scout deeper. Energy only.', excavate: 'Dig it out. Uses power.', pressurize: 'Fill it with air. Uses air and power.', shield: 'Rock and ice against radiation. Uses power and water.' };
    const c = await showMenu('The Cave', v.map(x => ({ id: x, label: `${x[0].toUpperCase() + x.slice(1)} (${s.cave[x]}/${CAVE_MAX})`, hint: hint[x], disabled: s.cave[x] >= CAVE_MAX })), 'Leave');
    if (c) await this.doAct(`cave_${c}` as never);
  }

  async mainMenu() {
    if (this.busy) return; this.busy = true;
    try {
      const s = this.sess.state;
      const c = await showMenu('Menu', [
        { id: 'journal', label: 'Mission Journal' }, { id: 'rewind', label: 'Time Machine', hint: 'Go back to the morning of an earlier Sol' },
        { id: 'compare', label: 'Compare timelines', disabled: !this.sess.branches.length },
        { id: 'save', label: 'Save game' }, { id: 'new', label: 'Start a new game', hint: 'Erases this save' },
      ]);
      if (c === 'journal') await showJournal(s);
      else if (c === 'rewind') await this.rewindMenu();
      else if (c === 'compare') await this.compare();
      else if (c === 'save') toast(saveToStorage(this.sess) ? 'Saved.' : 'Could not save.');
      else if (c === 'new') { localStorage.removeItem('mrp.save.v1'); location.reload(); }
    } finally { this.busy = false; }
  }

  async rewindMenu() {
    const sols = rewindableSols(this.sess);
    if (!sols.length) { toast('Nothing to rewind to yet.'); return; }
    const c = await showMenu('Time Machine: pick a morning', sols.map(n => ({ id: String(n), label: `Morning of Sol ${n}` })), 'Cancel');
    if (c && rewind(this.sess, Number(c))) {
      this.player.setPosition(15.5 * TILE, 15.5 * TILE); this.syncWorld();
      toast(`Back to Sol ${c}. The weather and NASA events will happen again, but your choices can change.`);
      await this.afterAction(true);
    }
  }

  async compare() {
    const b = this.sess.branches.at(-1)!;
    const now = this.sess.state.decisions.filter(d => d.sol >= b.toSol).map(d => `Sol ${d.sol}: ${d.label}`);
    await showMessage('Two timelines', [`Old timeline (left at Sol ${b.fromSol}):`, ...(b.decisions.map(d => `  Sol ${d.sol}: ${d.label}`).length ? b.decisions.map(d => `  Sol ${d.sol}: ${d.label}`) : ['  (no decisions)']),
      'This timeline so far:', ...(now.length ? now.map(x => '  ' + x) : ['  (no decisions yet)'])]);
  }

  async sleepFlow() {
    this.busy = true;
    try {
      sleep(this.sess);
      this.player.setPosition(20.5 * TILE, 14.5 * TILE); this.syncWorld();
      if (this.sess.state.sol !== this.autosaveSol) { saveToStorage(this.sess); this.autosaveSol = this.sess.state.sol; }
      await showReport(this.sess.state);
      await this.afterAction();
    } finally { this.busy = false; }
  }

  async failureFlow() {
    if (this.busy) return; this.busy = true;
    try {
      const s = this.sess.state;
      const what = ({ o2: 'air', water: 'water', food: 'food', power: 'power' } as Record<string, string>)[s.failed!];
      const c = await showMenu(`The colony ran out of ${what}!`, [
        { id: 'rewind', label: 'Use the Time Machine', hint: 'Try a different plan' }, { id: 'ship', label: 'Call for an emergency shipment', hint: 'Resets your self-sufficiency' },
      ], 'Keep going');
      if (c === 'rewind') await this.rewindMenu(); else if (c === 'ship') { emergencyShipment(s); this.syncWorld(); } else { s.failed = null; s.flags.tmp_failed_snooze = true; }
    } finally { this.busy = false; }
  }
}
