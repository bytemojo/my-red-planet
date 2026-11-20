// KITCHEN COOKING ANIMATIONS (Step 2c). One animation per cooking method, chained with playAction.
// Resources were already paid at COOK & SERVE (core/meals.ts); everything here is the picture only.
import { cookActionPlan, type ActionId } from '../core/actions';
import { SPACE_MEALS } from '../core/meals';
import { playAction } from './actions';
import { world } from './world';
import { steam } from './effects';
import { KITCHEN } from './layout';
import { sfx } from '../ui/audio';
import type { WorldScene } from './WorldScene';

const T = 32;
// Where the explorer stands and which way the appliance is (microwave/heater left, sink right, lockers left).
const STAND: Record<string, { x: number; y: number; face: 'left' | 'right' }> = {
  cook_ready: { x: (KITCHEN.x0 + 0.5) * T, y: 8.6 * T, face: 'left' },
  cook_hydrate: { x: (KITCHEN.x0 + 0.9) * T, y: 8.6 * T, face: 'right' },
  cook_heat: { x: (KITCHEN.x0 + 0.3) * T, y: 8.6 * T, face: 'left' },
};
const popAt = (dx: number, text: string, color: string) => world.pop(world.player.x + dx, world.player.y - 48, text, color);

// What the world shows at the beat of each animation.
const BEAT: Record<string, () => void> = {
  cook_ready: () => { sfx.pickup(); popAt(0, 'PACK ON TRAY', '#8cffc6'); },
  cook_hydrate: () => { sfx.pour(); popAt(0, '💧 WATER IN', '#bfeaff'); },
  cook_heat: () => { sfx.latch(); sfx.microwave(1.2); popAt(0, 'DOOR CLOSED · HEATING', '#ffb340'); },
};
// ...and when the animation is over (bell and steam for heat, shake for hydrate).
const DONE: Record<string, (scene: WorldScene) => void> = {
  cook_ready: () => { sfx.latch(); popAt(0, '✓ READY', '#8cffc6'); },
  cook_hydrate: () => { sfx.latch(); popAt(0, '✓ SHAKEN', '#8cffc6'); },
  cook_heat: scene => { sfx.ding(); window.setTimeout(() => sfx.steam(), 250); const x = world.player.x - 18, y = world.player.y - 40; steam(scene, x, y); window.setTimeout(() => steam(scene, x + 6, y - 4), 350); popAt(0, '🔔 DING · ♨ STEAM', '#bfeaff'); },
};

/** The cooking animations a tray needs, in order, from the meal ids on the tray. */
export function cookPlanForTray(tray: string[]): ActionId[] {
  return cookActionPlan(tray.map(id => SPACE_MEALS.find(m => m.id === id)?.method ?? ''));
}

/** Play every needed animation one after another, then call `done` exactly once (also if one cannot start). */
export function playCooking(scene: WorldScene, tray: string[], done: () => void) {
  const plan = cookPlanForTray(tray); let i = 0, finished = false;
  const end = () => { if (!finished) { finished = true; done(); } };
  const next = () => {
    const id = plan[i++]; if (!id) return end();
    const st = STAND[id];
    const started = playAction(scene, id, { stand: { x: st.x, y: st.y }, face: st.face, onBeat: BEAT[id], onDone: () => { DONE[id](scene); next(); }, onAbort: end });
    if (!started) end(); // never leave the player stuck: skip the picture, the meal is already paid
  };
  next();
}
