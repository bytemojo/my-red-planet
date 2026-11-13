// Crew quarters (the quarantined med bay) and the crew's day-to-day life.
// Each crew member has a small room behind a thin divider: bed, desk, lamp, chair, rug and one personal item.
// They choose what to do from src/core/crewlife.ts (pure, tested) and this file only animates it.
import Phaser from 'phaser';
import { CREW_IDS, BED_ACTIVITIES, isHungry, isNight, lampOn, mood, pickActivity, activitySeconds, type Activity } from '../core/crewlife';
import { CREW_LOOKS, frameName } from './sprites';
import type { CrewId, GameState } from '../core/types';

const T = 32;
export const BAY = { x0: 5 * T, y0: 13 * T, x1: 14 * T, y1: 18 * T };
const QW = (BAY.x1 - BAY.x0) / 4; // 72px per room
// Spots inside a room, as [dx from room's left edge, absolute y of the feet].
const SPOT = { window: [40, 446], mid: [46, 492], rug: [52, 522], bedside: [44, 548], chair: [44, 470], bed: [19, 566] } as const;
type SpotName = keyof typeof SPOT;
const WANDER: SpotName[] = ['window', 'mid', 'rug', 'bedside'];
// After the quarantine ends, each person works somewhere in the base during the day (tile units: x0, y0, x1, y1).
const WORK: Record<CrewId, [number, number, number, number]> = {
  reyes: [18.8, 6.6, 27.2, 8.4], aiko: [7.5, 5.6, 11.5, 6.4], david: [19, 10.6, 27, 11.7], sofia: [18.8, 13.6, 27.2, 15.4],
};
const NAMES: Record<CrewId, string> = { reyes: 'REYES', aiko: 'AIKO', david: 'DAVID', sofia: 'SOFIA' };

type Mode = 'walk' | 'idle' | 'bed' | 'chair';
interface Mate {
  id: CrewId; room: number; sprite: Phaser.GameObjects.Sprite; badge: Phaser.GameObjects.Image; lampGlow: Phaser.GameObjects.Image; lampShade: Phaser.GameObjects.Graphics;
  act: Activity; until: number; mode: Mode; path: [number, number][]; dir: 'down' | 'up' | 'side'; flip: boolean; anim: number;
  react: { kind: string; until: number } | null; atWork: boolean;
}
export interface CrewView { update(t: number, dt: number, s: GameState): void; react(id: CrewId, kind: 'heart'): void; positions(): Record<CrewId, { x: number; y: number }> }

const r2 = (g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, c: number, a = 1) => { g.fillStyle(c, a); g.fillRect(Math.round(x), Math.round(y), w, h); };

function drawRoom(scene: Phaser.Scene, i: number, id: CrewId) {
  const qx = BAY.x0 + i * QW, look = CREW_LOOKS[id], blanket = look.blanket ?? look.top;
  // rug
  const floor = scene.add.graphics().setDepth(1);
  r2(floor, qx + 32, 478, 32, 48, look.accent, 0.22); r2(floor, qx + 34, 480, 28, 44, look.top, 0.28);
  for (let k = 0; k < 4; k++) r2(floor, qx + 36, 484 + k * 10, 24, 2, 0xffffff, 0.12);
  // bed: metal frame, mattress, pillow, folded blanket at the foot
  const bed = scene.add.graphics().setDepth(498);
  r2(bed, qx + 5, 504, 30, 66, 0x000000, 0.28);
  r2(bed, qx + 4, 498, 30, 70, 0x5d6b88); r2(bed, qx + 6, 500, 26, 66, 0x8d99b3);
  r2(bed, qx + 4, 496, 30, 6, 0xaebbd3); r2(bed, qx + 4, 494, 30, 2, 0xe3ecff);          // headboard
  r2(bed, qx + 7, 504, 24, 60, 0xe8edf5); r2(bed, qx + 29, 504, 2, 60, 0xc4cddd);        // mattress
  r2(bed, qx + 9, 510, 20, 14, 0xffffff); r2(bed, qx + 9, 522, 20, 2, 0xd4dbe8);         // pillow
  r2(bed, qx + 7, 538, 24, 26, blanket); r2(bed, qx + 7, 538, 24, 3, 0xf2f5fa); r2(bed, qx + 7, 548, 24, 2, 0xffffff, 0.35);
  r2(bed, qx + 29, 538, 2, 26, 0x000000, 0.18);
  // desk against the divider, with a notebook
  const desk = scene.add.graphics().setDepth(468);
  r2(desk, qx + 54, 430, 16, 28, 0xdfe6f2); r2(desk, qx + 54, 430, 16, 2, 0xffffff); r2(desk, qx + 54, 458, 16, 10, 0x8d99b3); r2(desk, qx + 54, 466, 16, 2, 0x5d6b88);
  r2(desk, qx + 56, 446, 9, 7, 0xfff6e2); r2(desk, qx + 56, 446, 1, 7, look.accent); r2(desk, qx + 62, 444, 1, 6, 0x31405e);
  // chair (backrest on the left, so the sitter faces the desk)
  const chair = scene.add.graphics().setDepth(466);
  r2(chair, qx + 32, 436, 4, 30, 0x5d6b88); r2(chair, qx + 32, 436, 4, 2, 0xaebbd3);
  r2(chair, qx + 34, 456, 16, 8, 0xaebbd3); r2(chair, qx + 34, 464, 16, 4, 0x5d6b88); r2(chair, qx + 36, 468, 2, 2, 0x2a3550); r2(chair, qx + 46, 468, 2, 2, 0x2a3550);
  // personal item
  const it = scene.add.graphics().setDepth(566);
  if (id === 'reyes') { // a photo of the ocean at home, on the desk
    r2(desk, qx + 56, 434, 9, 9, 0xe9e1cf); r2(desk, qx + 57, 435, 7, 4, 0x4f8fd6); r2(desk, qx + 57, 439, 7, 3, 0xe8cf94);
  } else if (id === 'aiko') { // potted seedling
    r2(it, qx + 58, 558, 10, 8, 0xc06a3e); r2(it, qx + 57, 556, 12, 3, 0xd8834f); r2(it, qx + 62, 548, 2, 8, 0x3a8a35); r2(it, qx + 58, 548, 4, 3, 0x7be88a); r2(it, qx + 63, 545, 5, 3, 0x7be88a);
  } else if (id === 'david') { // toolbox
    r2(it, qx + 56, 556, 14, 10, 0xd0453f); r2(it, qx + 56, 556, 14, 2, 0xf06a60); r2(it, qx + 60, 552, 6, 2, 0x5d6b88); r2(it, qx + 60, 552, 1, 4, 0x5d6b88); r2(it, qx + 65, 552, 1, 4, 0x5d6b88); r2(it, qx + 62, 560, 2, 2, 0xffd84a);
  } else { // a little stack of rock samples
    r2(it, qx + 56, 560, 12, 6, 0x8a5a3c); r2(it, qx + 58, 555, 8, 5, 0xb07a52); r2(it, qx + 60, 551, 5, 4, 0xd9a07a); r2(it, qx + 61, 552, 2, 1, 0xffffff, 0.5);
  }
  // divider to the next room: a thin frosted panel
  if (i < 3) {
    const d = scene.add.graphics().setDepth(417);
    r2(d, qx + QW - 2, 402, 4, 174, 0xc9d4e8); r2(d, qx + QW - 2, 402, 4, 2, 0xffffff); r2(d, qx + QW + 2, 404, 2, 172, 0x000000, 0.25);
    r2(d, qx + QW - 2, 404, 1, 172, 0x39d9ff, 0.35);
  }
  // lamp on the desk (shade colour changes when it is on), plus its glow
  const shade = scene.add.graphics().setDepth(469);
  const glow = scene.add.image(qx + 62, 440, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffc970).setScale(1.25).setDepth(9510).setAlpha(0);
  // name plate on the wall below the room, out of the way of the faces over their heads
  scene.add.text(qx + QW / 2, BAY.y1 + 7, NAMES[id], { fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontStyle: '700', color: '#' + look.accent.toString(16).padStart(6, '0'), stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(9000).setResolution(3).setAlpha(0.95);
  return { glow, shade, qx };
}

function paintLamp(g: Phaser.GameObjects.Graphics, qx: number, on: boolean, accent: number) {
  g.clear();
  r2(g, qx + 62, 438, 6, 3, 0x5d6b88); r2(g, qx + 64, 428, 2, 10, 0x8d99b3);
  r2(g, qx + 59, 424, 10, 6, on ? 0xfff0b8 : accent); r2(g, qx + 59, 424, 10, 2, on ? 0xffffff : 0xffffff, on ? 1 : 0.4);
}

export function buildQuarters(scene: Phaser.Scene): CrewView {
  const mates: Mate[] = CREW_IDS.map((id, i) => {
    const room = drawRoom(scene, i, id);
    const [dx, y] = SPOT.mid;
    const sprite = scene.add.sprite(room.qx + dx, y, `crew_${id}`, 'down_stand').setOrigin(0.5, 1);
    const badge = scene.add.image(0, 0, 'icons', 'mood_neutral').setOrigin(0.5, 1).setDepth(9600);
    paintLamp(room.shade, room.qx, false, CREW_LOOKS[id].accent);
    return { id, room: i, sprite, badge, lampGlow: room.glow, lampShade: room.shade, act: 'stand', until: 0, mode: 'idle', path: [], dir: 'down', flip: false, anim: 0, react: null, atWork: false } as Mate;
  });
  const qx = (m: Mate) => BAY.x0 + m.room * QW;
  const spot = (m: Mate, n: SpotName): [number, number] => [qx(m) + SPOT[n][0], SPOT[n][1]];
  const lampState = new Map<CrewId, boolean>();

  const stand = (m: Mate) => {
    if (m.mode === 'bed') { const [x, y] = spot(m, 'bedside'); m.sprite.setPosition(x, y); }
    if (m.mode === 'chair') { const [x, y] = spot(m, 'mid'); m.sprite.setPosition(x - 2, y - 22); }
    m.mode = 'idle';
  };
  const walkTo = (m: Mate, pts: [number, number][]) => { stand(m); m.path = pts.slice(); m.mode = m.path.length ? 'walk' : 'idle'; };
  const randomWork = (m: Mate): [number, number] => { const [a, b, c, d] = WORK[m.id]; return [(a + Math.random() * (c - a)) * T, (b + Math.random() * (d - b)) * T]; };

  function choose(m: Mate, t: number, s: GameState) {
    const c = s.crew[m.id], hungry = isHungry(s, c), night = isNight(s.hour), working = !!s.flags.quarantine_over && !night;
    m.act = pickActivity(s.hour, c, hungry, Math.random());
    if (working) m.act = Math.random() < 0.7 ? 'wander' : 'stand';
    m.until = t + activitySeconds(m.act, Math.random()) * 1000;
    // Moving between the base and the quarters happens out of sight (the quarters have no door yet).
    if (working !== m.atWork) { m.atWork = working; stand(m); const [x, y] = working ? randomWork(m) : spot(m, 'mid'); m.sprite.setPosition(x, y); }
    if (working) { walkTo(m, m.act === 'wander' ? [randomWork(m)] : []); return; }
    switch (m.act) {
      case 'wander': walkTo(m, [spot(m, WANDER[Math.floor(Math.random() * WANDER.length)])]); break;
      case 'pace': walkTo(m, [spot(m, 'window'), spot(m, 'bedside'), spot(m, 'window'), spot(m, 'bedside')]); break;
      case 'stand': walkTo(m, [spot(m, 'window')]); break;
      case 'write': case 'read': walkTo(m, m.mode === 'chair' ? [] : [spot(m, 'mid'), spot(m, 'chair')]); break;
      default: walkTo(m, m.mode === 'bed' ? [] : [spot(m, 'bedside')]); // lie, nap, sleep
    }
  }

  function arrive(m: Mate) {
    if (m.atWork) { m.mode = 'idle'; m.dir = 'down'; return; }
    if (BED_ACTIVITIES.includes(m.act)) { const [x, y] = spot(m, 'bed'); m.sprite.setPosition(x, y); m.mode = 'bed'; return; }
    if (m.act === 'write' || m.act === 'read') { const [x, y] = spot(m, 'chair'); m.sprite.setPosition(x, y); m.mode = 'chair'; return; }
    m.mode = 'idle'; m.dir = m.act === 'stand' ? 'down' : m.dir; // at the window, they look out at you
  }

  return {
    react(id, kind) { const m = mates.find(x => x.id === id); if (m) m.react = { kind, until: performance.now() + 2600 }; },
    positions() { return Object.fromEntries(mates.map(m => [m.id, { x: m.sprite.x, y: m.sprite.y }])) as Record<CrewId, { x: number; y: number }>; },
    update(t, dt, s) {
      for (const m of mates) {
        const c = s.crew[m.id], hungry = isHungry(s, c);
        const needsNow = (hungry && !['pace', 'wander'].includes(m.act)) || (isNight(s.hour) && !['sleep', 'read'].includes(m.act) && !m.atWork) || (!isNight(s.hour) && m.act === 'sleep');
        if (t > m.until || needsNow) choose(m, t, s);
        // movement
        if (m.mode === 'walk') {
          const [tx, ty] = m.path[0], sp = (m.act === 'pace' ? 46 : m.atWork ? 34 : 26) * dt;
          const dx = tx - m.sprite.x, dy = ty - m.sprite.y, d = Math.hypot(dx, dy);
          if (d <= sp) { m.sprite.setPosition(tx, ty); m.path.shift(); if (!m.path.length) arrive(m); }
          else {
            m.sprite.x += (dx / d) * sp; m.sprite.y += (dy / d) * sp;
            if (Math.abs(dx) > Math.abs(dy)) { m.dir = 'side'; m.flip = dx < 0; } else m.dir = dy < 0 ? 'up' : 'down';
          }
          m.anim += dt * (m.act === 'pace' ? 9 : 6);
        }
        // frame
        let frame: string; let depth = m.sprite.y;
        const slow = Math.floor(t / 1300) % 2 === 0;
        if (m.mode === 'bed') { frame = (m.act === 'lie' ? (slow ? 'lie1' : 'lie2') : (slow ? 'sleep1' : 'sleep2')); depth = 567; m.sprite.setFlipX(false); }
        else if (m.mode === 'chair') { frame = m.act === 'read' ? (Math.floor(t / 3200) % 4 === 0 ? 'read2' : 'read1') : (Math.floor(t / 280) % 2 ? 'write2' : 'write1'); depth = 471; m.sprite.setFlipX(false); }
        else { const step = m.mode === 'walk' ? (['step1', 'stand', 'step2', 'stand'] as const)[Math.floor(m.anim) % 4] : 'stand'; frame = frameName(m.dir, step); m.sprite.setFlipX(m.dir === 'side' && m.flip); }
        m.sprite.setFrame(frame).setDepth(depth);
        // lamp
        const on = !m.atWork && m.mode === 'chair' && lampOn(s.hour, m.act);
        if (lampState.get(m.id) !== on) { lampState.set(m.id, on); paintLamp(m.lampShade, qx(m), on, CREW_LOOKS[m.id].accent); }
        m.lampGlow.setAlpha(on ? 0.75 + 0.05 * Math.sin(t / 400) : 0);
        // badge over the head: reaction > sleeping > hungry > mood
        const asleep = m.mode === 'bed' && m.act !== 'lie';
        const top = m.mode === 'bed' ? 512 : m.mode === 'chair' ? m.sprite.y - 42 : m.sprite.y - 52;
        const bob = Math.sin(t / 380 + m.room) * 1.5;
        let key: string;
        if (m.react && t < m.react.until) key = `bubble_${m.react.kind}`;
        else if (asleep) key = 'mood_zzz';
        else if (hungry) key = 'bubble_food';
        else key = `mood_${mood(c)}`;
        m.badge.setFrame(key).setPosition(m.sprite.x + (asleep ? 8 : 0), top - 2 + bob + (asleep ? -Math.abs(Math.sin(t / 900)) * 4 : 0));
      }
    },
  };
}
