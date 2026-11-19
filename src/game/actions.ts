// IN-WORLD ACTIONS (Phaser side of src/core/actions.ts).
//
// HOW TO ADD AN ANIMATED INTERACTION
//   1. In src/core/actions.ts add an ActionDef (pose frames, the beat, the energy cost).
//   2. Call playAction(scene, 'my_action', { stand, face, onBeat, onDone }) from the interaction.
//        stand   world-pixel point the explorer walks to (beside the object)
//        face    'left' | 'right' : which way the object is
//        onBeat  the game effect (water leaves the can, the part clicks in). Fires exactly once, at the
//                beat frame, and ONLY then: change core state here, never before.
//        onDone  runs after the last frame, input already unlocked (open a panel, chain the next action)
//        onAbort the walk failed or timed out; nothing happened and input is unlocked
//   3. The runner locks movement input from the first step of the walk until onDone/onAbort and it ALWAYS
//      unlocks (walk timeout, finish(), forceUnlock() on resets). prefers-reduced-motion shortens every
//      frame but never skips the beat.
// Held props: scene.held (src/core/inventory.ts) holds at most one prop; drawPlayer() shows it in the hand.
import Phaser from 'phaser';
import { ACTION_DEFS, applyActionBeat, canStartAction, type ActionId } from '../core/actions';
import { ACTION_TILT, actFrameName, carryFrameName, harvestFrameName, type ActionPoseName } from './pixelart';
import { FRAME_HANDS, PLAYER_ACT, PROP_GRIPS, PX, frameName } from './sprites';
import { prefersReducedMotion } from './effects';
import { world } from './world';
import { toast } from '../ui/ui';
import { sfx } from '../ui/audio';
import type { WorldScene } from './WorldScene';

export interface PlayOpts { stand: { x: number; y: number }; face: 'left' | 'right'; onBeat?: () => void; onDone?: () => void; onAbort?: () => void }

// Poses drawn from the side (facing right). They are mirrored when the object is on the left.
const SIDE_POSES = new Set<string>(['reach', 'crouch', 'pour', 'kneel', 'pull']);

/** Start an action: walk to `stand`, play the poses, fire `onBeat` at the beat, then `onDone`. Returns false if it could not start. */
export function playAction(scene: WorldScene, id: ActionId, opts: PlayOpts): boolean {
  const def = ACTION_DEFS[id], s = scene.state();
  if (scene.action.locked || scene.acting || scene.busy) return false;
  const can = canStartAction(s, def);
  if (!can.ok) { toast(can.msg, { kind: 'warn' }); sfx.warn(); return false; }
  const started = scene.action.start(def, {
    onBeat: () => {
      const r = applyActionBeat(s, def); // the core change happens HERE and nowhere earlier
      if (r.spent > 0) world.pop(world.player.x + 14, world.player.y - 24, `−${r.spent}⚡`, '#ffb340');
      opts.onBeat?.(); scene.refresh();
    },
    onDone: () => { scene.actFrame = null; opts.onDone?.(); },
    onAbort: () => { scene.actFrame = null; opts.onAbort?.(); },
  }, prefersReducedMotion());
  if (!started) return false;
  scene.actFace = opts.face; scene.actStand = opts.stand;
  const reached = scene.walkToPoint(new Phaser.Math.Vector2(opts.stand.x, opts.stand.y), null, s);
  if (!reached) { scene.action.abort(); toast("I can't reach that from here.", { kind: 'warn' }); return false; }
  return true;
}

/** Call once per frame, AFTER movement. Detects arrival, advances the pose sequence, handles timeouts. */
export function stepAction(scene: WorldScene, dtMs: number) {
  const a = scene.action;
  if (a.phase === 'walking') {
    if (a.walkTick(dtMs) === 'timeout') { scene.moveTarget = null; scene.movePath = []; toast("I can't reach that from here.", { kind: 'warn' }); return; }
    if (!scene.moveTarget && !scene.movePath.length) {
      const p = world.player, st = scene.actStand;
      if (st && Math.hypot(p.x - st.x, p.y - st.y) < 14) { p.x = st.x; p.y = st.y; } // settle exactly on the stand-point
      scene.facing = 'side'; scene.flip = scene.actFace === 'left'; a.arrive();
    }
  }
  scene.actFrame = a.phase === 'posing' ? a.tick(dtMs) : null;
}

/** Choose and draw the player's frame (walk, old-style `acting` pose, action pose, or carrying) and the held prop. */
export function drawPlayer(scene: WorldScene, t: number, suited: boolean, walkPose: 'step1' | 'stand' | 'step2') {
  const p = world.player, prefix = suited && !(scene.action.phase === 'posing' && scene.actFrame?.pose === 'suitup') ? 'ev_' : 'in_';
  let tex = 'player', frame: string, flipX = false, handKey: string | null = null;
  if (scene.acting?.pose) { const a = scene.acting.pose; tex = PLAYER_ACT; frame = prefix + actFrameName(a.name as ActionPoseName, Math.floor(t / a.ms) % a.count); flipX = scene.flip; }
  else if (scene.acting) frame = scene.acting.frames ? scene.acting.frames[Math.floor(t / 160) % scene.acting.frames.length] : scene.acting.frame;
  else if (scene.action.phase === 'posing' && scene.actFrame) {
    const f = scene.actFrame; tex = PLAYER_ACT; handKey = actFrameName(f.pose as ActionPoseName, f.frame); frame = prefix + handKey;
    flipX = SIDE_POSES.has(f.pose) && scene.flip;
  } else if (scene.held.item) {
    tex = PLAYER_ACT; handKey = carryFrameName(scene.facing, walkPose); frame = prefix + handKey; flipX = scene.facing === 'side' && scene.flip;
  } else { frame = prefix + frameName(scene.facing, walkPose); flipX = scene.facing === 'side' && scene.flip; }
  if (p.texture.key !== tex) p.setTexture(tex, frame); else p.setFrame(frame);
  p.setFlipX(flipX);
  drawHeld(scene, handKey, flipX);
}

// The held prop sits in the hand of whatever frame is showing, tilted while pouring.
function drawHeld(scene: WorldScene, handKey: string | null, flipX: boolean) {
  const item = scene.held.item, p = world.player;
  let spr = scene.heldSprite;
  if (!item || !handKey) { spr?.setVisible(false); return; }
  if (!spr) spr = scene.heldSprite = scene.add.image(0, 0, 'props', item);
  const crop = item === 'harvest' ? scene.held.crop : null; // Step 6c: a carried harvest shows its own crop sprite
  if (crop) { if (spr.texture.key !== harvestFrameName(crop)) spr.setTexture(harvestFrameName(crop)); spr.setOrigin(0.5, 0.5); }
  else { if (spr.texture.key !== 'props') spr.setTexture('props'); spr.setFrame(item); const grip = PROP_GRIPS[item] ?? [spr.width / 2, spr.height / 2]; spr.setOrigin(grip[0] / spr.width, grip[1] / spr.height); }
  const hand = FRAME_HANDS[handKey] ?? [8, 18], sx = flipX ? -1 : 1;
  const m = /^act_([a-z]+)_(\d+)$/.exec(handKey), tilt = m ? (ACTION_TILT[m[1] as ActionPoseName]?.[Number(m[2])] ?? 0) : 0;
  spr.setPosition(p.x + (hand[0] - 8) * PX * sx, p.y + (hand[1] - 26) * PX).setFlipX(flipX).setAngle(tilt * sx).setDepth(p.y + 0.6).setVisible(true);
}
