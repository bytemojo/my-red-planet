// WORLD ACTION RUNNER (pure logic: no Phaser, no DOM).
//
// Owner rule: every physical action is animated in the world. The player walks to the object, the
// character plays a pose sequence, and the game effect happens at ONE exact moment: the "beat"
// (the water hits the soil, the part clicks in). This file owns the rules; src/game/actions.ts only
// draws them. Lifecycle of one action:
//
//   start() -> 'walking' (player walks to the stand-point, input locked)
//           -> arrive() -> 'posing' (frames play; onBeat fires exactly once; onDone fires exactly once)
//           -> 'idle'   (input unlocked again)
//
// It ALWAYS unlocks: walking has a timeout (abort, no effect), and finish()/abort() can be called from
// anywhere (a panel closing, a checkpoint reload). finish() never skips the effect: if the beat has not
// happened yet it fires it first, so game state and picture can never disagree.
import type { GameState } from './types';
import type { PropId } from './inventory';

export type ActionPose = 'reach' | 'crouch' | 'pour' | 'kneel' | 'pull' | 'carry' | 'suitup' | 'sleep';
export type ActionId = 'ice_chip' | 'ice_pour' | 'pull_bands' | 'pick_up' | 'put_down' | 'cook_ready' | 'cook_hydrate' | 'cook_heat' | 'serve_tray' | 'open_bin' | 'use_screen' | 'sit_play' | 'plant_seed' | 'water_bed' | 'harvest_crop' | 'store_crop' | 'suit_up' | 'suit_off' | 'repair_pump' | 'pump_mode' | 'panel_lever' | 'pod_sleep' | 'clean_panels' | 'repair_machine' | 'repair_dish';

/** One drawn frame of a pose, held for `ms` milliseconds. */
export interface PoseStep { pose: ActionPose; frame: number; ms: number }
export interface ActionDef {
  id: ActionId; label: string;
  steps: PoseStep[];
  beatStep: number;   // the beat fires when this step STARTS (so the picture and the effect line up)
  energy: number;     // charged at the beat, never before
}

const seq = (pose: ActionPose, ms: number[]): PoseStep[] => ms.map((m, frame) => ({ pose, frame, ms: m }));

export const ACTION_DEFS: Record<ActionId, ActionDef> = {
  // Proof 1: the resistance bands. A kneel-and-pull wind-up before the workout panel opens.
  // The workout itself still charges its own energy (core/gym.ts), so this wind-up is free.
  pull_bands: { id: 'pull_bands', label: 'Pull the bands', steps: seq('pull', [160, 160, 220, 260, 160]), beatStep: 2, energy: 0 },
  // Proof 2: lift a prop off a rack, or put it back. The hands change at the beat (frame 3, hand at the item).
  pick_up: { id: 'pick_up', label: 'Pick up', steps: seq('reach', [150, 150, 180, 240, 200]), beatStep: 3, energy: 1 },
  put_down: { id: 'put_down', label: 'Put back', steps: seq('reach', [150, 150, 180, 240, 200]), beatStep: 3, energy: 0 },
  // Step 2c: one cooking animation per method. Energy and resources are already paid when COOK & SERVE is
  // confirmed (core/meals.ts), so these are free; the beat only drives the picture (pack out, water in, door shut).
  cook_ready: { id: 'cook_ready', label: 'Take a ready-to-eat pack', steps: seq('reach', [150, 150, 170, 230, 160]), beatStep: 3, energy: 0 },
  cook_hydrate: { id: 'cook_hydrate', label: 'Hydrate a pouch', steps: seq('pour', [160, 200, 260, 260, 200]), beatStep: 2, energy: 0 },
  cook_heat: { id: 'cook_heat', label: 'Heat a pouch', steps: seq('reach', [170, 170, 220, 520, 300]), beatStep: 2, energy: 0 },
  // Step 2d: hand the tray through the meal hatch. Feeding happens at THIS beat, not before (core/meals.ts serveTray).
  // Step 3b: reach to a storage bin; the lid pops at the beat, then the wall screen shows what it holds (free, read-only).
  sit_play: { id: 'sit_play', label: 'Sit down to play', steps: seq('crouch', [200, 260, 300, 240]), beatStep: 2, energy: 0 },
  use_screen: { id: 'use_screen', label: 'Use the screen', steps: seq('reach', [150, 150, 180, 240, 200]), beatStep: 3, energy: 0 },
  open_bin: { id: 'open_bin', label: 'Open the bin', steps: seq('reach', [150, 150, 180, 240, 200]), beatStep: 3, energy: 0 },
  // Step 6a: crouch at a bed; the soil mound appears and the packet leaves the hands at the beat. The 3 energy is charged by act('plant') at that beat.
  plant_seed: { id: 'plant_seed', label: 'Plant the seeds', steps: seq('crouch', [170, 200, 260, 300, 220]), beatStep: 3, energy: 0 },
  // Step 6b: tilt the sprinkler over a bed; droplets, the soil darkens and the water tank drops at the beat. act('water') charges the 4 energy and the water there.
  water_bed: { id: 'water_bed', label: 'Water the bed', steps: seq('pour', [170, 220, 320, 300, 220]), beatStep: 2, energy: 0 },
  // Step 6c: reach out and pull the ripe crop; the bed empties, the crop is in the hands and act('harvest') charges energy and adds the food at the beat.
  harvest_crop: { id: 'harvest_crop', label: 'Harvest the crop', steps: seq('reach', [160, 200, 240, 300, 220]), beatStep: 3, energy: 0 },
  // Step 6c: reach into the food bin; the lid pops and the crop leaves the hands at the beat (free).
  store_crop: { id: 'store_crop', label: 'Store the crop', steps: seq('reach', [150, 150, 180, 260, 220]), beatStep: 3, energy: 0 },
  serve_tray: { id: 'serve_tray', label: 'Serve the tray', steps: seq('reach', [180, 200, 220, 320, 260]), beatStep: 3, energy: 0 },
  // Step 8b: the suit rack. suit_up plays the 'suitup' frames 0..4 (flight suit -> EVA suit); the suit goes on at the beat (frame 3, boots sealed).
  // suit_off plays the same frames backwards (EVA -> flight suit). act('suit') charges its 1 energy at the beat; the def itself is free.
  // Step 13a: the repair pattern. Kneel at the machine, cyan sparks (never fire) while a progress ring fills; the beat is the LAST step,
  // so the part is used and the art switches BROKEN -> REPAIRED only when the ring is full. act('repair_watering') charges the energy + the part there.
  // Step 15b: reach to the pump control and press it; act('watering_mode') switches automatic/manual at the beat (free).
  // Step 16a: pull the panel lever. act('panels') flips stowed/out and spends its energy at the beat (so the def itself costs nothing).
  // Step 16b: dig the dust off the panels. act('clean_panels') spends its energy at the beat (buried panels cost more there).
  clean_panels: { id: 'clean_panels', label: 'Clean the panels', steps: [0, 1, 2, 3, 2, 3, 2, 3].map((frame, i) => ({ pose: 'kneel' as const, frame, ms: [240, 380, 380, 380, 380, 380, 380, 300][i] })), beatStep: 7, energy: 0 },
  // Step 17a: the sleep pod. Reach to open the lid, slump and lie down, lid closes; the Sol passes at the beat (existing sleep()/endSol logic).
  pod_sleep: { id: 'pod_sleep', label: 'Sleep in the pod', steps: [
    { pose: 'reach', frame: 1, ms: 260 }, { pose: 'reach', frame: 2, ms: 300 }, { pose: 'sleep', frame: 0, ms: 320 },
    { pose: 'sleep', frame: 1, ms: 320 }, { pose: 'sleep', frame: 2, ms: 520 }, { pose: 'sleep', frame: 3, ms: 1100 },
  ], beatStep: 5, energy: 0 },
  panel_lever: { id: 'panel_lever', label: 'Pull the panel lever', steps: seq('reach', [160, 200, 240, 320, 220]), beatStep: 3, energy: 0 },
  pump_mode: { id: 'pump_mode', label: 'Set the pump', steps: seq('reach', [160, 180, 220, 300, 200]), beatStep: 3, energy: 0 },
  repair_pump: { id: 'repair_pump', label: 'Repair the pump', steps: [0, 1, 2, 3, 2, 3, 2, 3].map((frame, i) => ({ pose: 'kneel' as const, frame, ms: [240, 420, 420, 420, 420, 420, 420, 300][i] })), beatStep: 7, energy: 0 },
  // Step 13b: the same kneel-and-spark repair for the comms console, microwave and heater.
  repair_machine: { id: 'repair_machine', label: 'Repair the machine', steps: [0, 1, 2, 3, 2, 3, 2, 3].map((frame, i) => ({ pose: 'kneel' as const, frame, ms: [240, 420, 420, 420, 420, 420, 420, 300][i] })), beatStep: 7, energy: 0 },
  // Step 14c: branch B, the same kneel-and-spark repair, outside at the dish. act('repair_dish') charges EP.DISH_REPAIR_ENERGY and one part at the beat.
  repair_dish: { id: 'repair_dish', label: 'Repair the dish', steps: [0, 1, 2, 3, 2, 3, 2, 3].map((frame, i) => ({ pose: 'kneel' as const, frame, ms: [240, 420, 420, 420, 420, 420, 420, 300][i] })), beatStep: 7, energy: 0 },
  // Step 21b: the ice run. ice_chip = kneel and chip at the candidate ice sheet (cyan shards, no heat); act('ice_chip') spends energy + suit air at the LAST step.
  // ice_pour = reach and tip the container into the water-maker intake; act('ice_pour') restarts the water maker at the beat.
  ice_chip: { id: 'ice_chip', label: 'Chip the ice', steps: [0, 1, 2, 3, 2, 3, 2, 3].map((frame, i) => ({ pose: 'kneel' as const, frame, ms: [240, 380, 380, 380, 380, 380, 380, 300][i] })), beatStep: 7, energy: 0 },
  ice_pour: { id: 'ice_pour', label: 'Pour the ice in', steps: seq('reach', [160, 200, 240, 340, 240]), beatStep: 3, energy: 0 },
  suit_up: { id: 'suit_up', label: 'Put on the suit', steps: seq('suitup', [220, 260, 300, 320, 260]), beatStep: 3, energy: 0 },
  suit_off: { id: 'suit_off', label: 'Take off the suit', steps: [4, 3, 2, 1, 0].map((frame, i) => ({ pose: 'suitup' as const, frame, ms: [220, 260, 300, 280, 240][i] })), beatStep: 3, energy: 0 },
};

export const REDUCED_MOTION_SCALE = 0.35;   // prefers-reduced-motion: shorter animations, same logic
export const MIN_STEP_MS = 60;
export const WALK_TIMEOUT_MS = 8000;        // never stay locked forever if the walk gets stuck
export const stepMs = (ms: number, reduced: boolean) => (reduced ? Math.max(MIN_STEP_MS, Math.round(ms * REDUCED_MOTION_SCALE)) : ms);

export interface Timeline { steps: PoseStep[]; beatAt: number; total: number }
export function buildTimeline(def: ActionDef, reduced = false): Timeline {
  const steps = def.steps.map(s => ({ ...s, ms: stepMs(s.ms, reduced) }));
  const beatAt = steps.slice(0, def.beatStep).reduce((a, s) => a + s.ms, 0);
  return { steps, beatAt, total: steps.reduce((a, s) => a + s.ms, 0) };
}

/** Can this action start? (Energy is only CHECKED here; it is charged at the beat.) */
export function canStartAction(s: Pick<GameState, 'energy' | 'pending'>, def: ActionDef): { ok: boolean; msg: string } {
  if (s.pending) return { ok: false, msg: 'Finish the conversation first.' };
  if (s.energy < def.energy) return { ok: false, msg: 'Too tired. Sleep to refill your energy.' };
  return { ok: true, msg: '' };
}
/** The core effect of an action: charge its energy. Called at the beat, and only then. */
export function applyActionBeat(s: Pick<GameState, 'energy'>, def: ActionDef): { ok: boolean; msg: string; spent: number } {
  if (s.energy < def.energy) return { ok: false, msg: 'Too tired. Sleep to refill your energy.', spent: 0 };
  s.energy -= def.energy; return { ok: true, msg: def.label, spent: def.energy };
}

export interface ActionHooks { onBeat?: () => void; onDone?: () => void; onAbort?: () => void }
export interface ActionFrame { pose: ActionPose; frame: number }
export type ActionPhase = 'idle' | 'walking' | 'posing';

export class ActionRunner {
  phase: ActionPhase = 'idle';
  private def: ActionDef | null = null; private hooks: ActionHooks = {}; private tl: Timeline | null = null;
  private t = 0; private walkT = 0; private beatFired = false;
  get locked() { return this.phase !== 'idle'; }
  get current() { return this.def; }
  get beatDone() { return this.beatFired; }

  /** Begin an action. Returns false (and changes nothing) if another action is still running. */
  start(def: ActionDef, hooks: ActionHooks = {}, reduced = false): boolean {
    if (this.locked) return false;
    this.def = def; this.hooks = hooks; this.tl = buildTimeline(def, reduced);
    this.t = 0; this.walkT = 0; this.beatFired = false; this.phase = 'walking'; return true;
  }
  /** The player reached the stand-point: start the pose sequence. */
  arrive() { if (this.phase === 'walking') { this.phase = 'posing'; this.t = 0; } }
  /** Called every frame while walking. Returns 'timeout' (and unlocks, no effect) if the walk takes too long. */
  walkTick(dtMs: number): 'walking' | 'timeout' | 'idle' {
    if (this.phase !== 'walking') return this.phase === 'idle' ? 'idle' : 'walking';
    this.walkT += dtMs;
    if (this.walkT > WALK_TIMEOUT_MS) { this.abort(); return 'timeout'; }
    return 'walking';
  }
  /** Advance the pose sequence. Returns the frame to draw, or null when nothing is playing. */
  tick(dtMs: number): ActionFrame | null {
    if (this.phase !== 'posing' || !this.def || !this.tl) return null;
    this.t += dtMs;
    if (!this.beatFired && this.t >= this.tl.beatAt) this.fireBeat();
    if (this.t >= this.tl.total) { const f = this.frameAt(this.tl.total - 1); this.end(); return f; }
    return this.frameAt(this.t);
  }
  /** Fast-forward to the end. The beat is never skipped. Safe to call from anywhere, any number of times. */
  finish() {
    if (this.phase === 'idle') return;
    if (this.phase === 'walking') { this.abort(); return; }
    if (!this.beatFired) this.fireBeat();
    this.end();
  }
  /** Stop. Before the beat nothing happens; after the beat it behaves like finish(). Always unlocks. */
  abort() {
    if (this.phase === 'idle') return;
    if (this.phase === 'posing' && this.beatFired) { this.end(); return; }
    const h = this.hooks; this.reset(); h.onAbort?.();
  }
  /** Hard reset with NO effect and NO hooks. Only for world resets (new Sol, checkpoint reload, pass-out). */
  forceUnlock() { this.reset(); }
  /** Frame index shown at time t (ms) of the current pose sequence (for drawing and tests). */
  frameAt(t: number): ActionFrame | null {
    if (!this.tl) return null;
    let acc = 0;
    for (const s of this.tl.steps) { acc += s.ms; if (t < acc) return { pose: s.pose, frame: s.frame }; }
    const last = this.tl.steps[this.tl.steps.length - 1]; return last ? { pose: last.pose, frame: last.frame } : null;
  }
  private fireBeat() { if (this.beatFired) return; this.beatFired = true; this.hooks.onBeat?.(); }
  private end() { const h = this.hooks; this.reset(); h.onDone?.(); } // unlock BEFORE onDone so onDone may start the next action
  private reset() { this.phase = 'idle'; this.def = null; this.tl = null; this.hooks = {}; this.t = 0; this.walkT = 0; this.beatFired = false; }
}

/** Which prop a rack hands out is data (src/game/racks.ts); this is the rule for taking/returning it. */
export const RACK_RULE = (held: PropId | null, rackItem: PropId): 'pick_up' | 'put_down' | 'full' => (held === null ? 'pick_up' : held === rackItem ? 'put_down' : 'full');

/** Step 2c: which cooking animations a tray needs. One per method used, always in this order (cold, wet, hot). */
export type CookMethod = 'READY TO EAT' | 'HYDRATE' | 'HEAT';
export const COOK_ACTION: Record<CookMethod, ActionId> = { 'READY TO EAT': 'cook_ready', HYDRATE: 'cook_hydrate', HEAT: 'cook_heat' };
export function cookActionPlan(methods: readonly string[]): ActionId[] {
  return (['READY TO EAT', 'HYDRATE', 'HEAT'] as const).filter(m => methods.includes(m)).map(m => COOK_ACTION[m]);
}
