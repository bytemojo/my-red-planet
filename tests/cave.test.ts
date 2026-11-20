import { describe, expect, it } from 'vitest';
import { CAVE, buildCave, cavePose } from '../src/game/cave';
import { CLICK_BOXES, CLICK_PAD, LANDMARKS, T, W, H, ZONES, buildLayout, objectHit, PLAYER_START } from '../src/game/layout';
import { pathToClosestReachable } from '../src/game/pathfinding';
import { CAVE_LOCKED_TEXT, CAVE_LOCKED_TITLE } from '../src/story/cave';

type Rec = { k: string; a: number[] };
function fakeScene() {
  const gfx: { depth: number; blend: number; ops: Rec[] }[] = [];
  const make = () => {
    const g = { depth: 0, blend: 0, ops: [] as Rec[] } as any;
    const proxy: any = new Proxy(g, { get: (t, p: string) => p in t ? t[p]
      : p === 'setDepth' ? (d: number) => { t.depth = d; return proxy; } : p === 'setBlendMode' ? (b: number) => { t.blend = b; return proxy; } : p === 'clear' ? () => { t.ops.length = 0; return proxy; }
      : (...a: number[]) => { t.ops.push({ k: p, a }); return proxy; } });
    gfx.push(g); return proxy;
  };
  return { scene: { add: { graphics: make } } as any, gfx };
}

describe('Step 28e: the cave entrance', () => {
  it('locked text is exactly the specified line and the card title is set', () => {
    expect(CAVE_LOCKED_TEXT).toBe('Keep playing to unlock cave exploration.');
    expect(CAVE_LOCKED_TITLE.length).toBeGreaterThan(0);
  });
  it('art box = click box = tiles x38-40, y24-26, inside the cave zone', () => {
    expect(CLICK_BOXES.cave).toEqual([[38, 24, 3, 3]]);
    expect([CAVE.x / T, CAVE.y / T, CAVE.w / T, CAVE.h / T]).toEqual([38, 24, 3, 3]);
    expect(CAVE.x).toBeGreaterThanOrEqual(ZONES.cave.x0 * T); expect(CAVE.x + CAVE.w).toBeLessThanOrEqual((ZONES.cave.x1 + 1) * T);
    expect(ZONES.cave.inside).toBe(false);
  });
  it('only the cave itself is clickable, not the ground beside it', () => {
    expect(objectHit('cave', 39.5 * T, 25 * T)).toBe(true);
    expect(objectHit('cave', CAVE.x - CLICK_PAD - 4, 25 * T)).toBe(false);
    expect(objectHit('cave', 39.5 * T, CAVE.y + CAVE.h + CLICK_PAD + 4)).toBe(false);
  });
  it('the rock body is solid (no walking through the cave) and the mouth apron stays reachable from the base', () => {
    const L: any = buildLayout();
    for (let y = 24; y <= 25; y++) for (let x = 38; x <= 40; x++) expect(L.blocked[y][x]).toBe(true);
    const isBlocked = (x: number, y: number) => L.blocked[y][x];
    const lm = LANDMARKS.find(l => l.id === 'cave_mouth')!;
    const r = pathToClosestReachable(W, H, PLAYER_START, { x: Math.floor(lm.stand[0]), y: Math.floor(lm.stand[1]) }, isBlocked);
    expect(r.reached).toBe(true);
  });
  it('the glow breathes slowly, never goes dark or bright, and is steady with reduced motion', () => {
    let min = 9, max = -9; for (let t = 0; t < 20000; t += 50) { const g = cavePose(t).glow; min = Math.min(min, g); max = Math.max(max, g); }
    expect(min).toBeGreaterThanOrEqual(0.2); expect(max).toBeLessThanOrEqual(0.85); expect(max - min).toBeGreaterThan(0.4);
    expect(cavePose(0, true)).toEqual(cavePose(99999, true));
  });
  it('builds a static layer plus an additive glow layer, and redraws only when the glow changes', () => {
    const { scene, gfx } = fakeScene(); const art = buildCave(scene);
    expect(gfx.length).toBe(2); expect(gfx[0].depth).toBe(CAVE.depth); expect(gfx[1].blend).toBe(1);
    expect(gfx[0].ops.length).toBeGreaterThan(60);                       // a detailed pixel build, not a blob
    art.update(0); const n = gfx[1].ops.length; expect(n).toBeGreaterThan(0);
    art.update(0); expect(gfx[1].ops.length).toBe(n);                    // same pose: no redraw
    const nStatic = gfx[0].ops.length; art.update(2000); art.update(4000); expect(gfx[0].ops.length).toBe(nStatic); // static art is never redrawn
  });
  it('uses the amber hazard colour and the cyan glow colour from the game palette', () => {
    const { scene, gfx } = fakeScene(); const art = buildCave(scene); art.update(1000);
    expect(gfx[0].ops.some(o => o.k === 'fillStyle' && o.a[0] === 0xffb340)).toBe(true);
    expect(gfx[1].ops.some(o => o.k === 'fillStyle' && o.a[0] === 0x39d9ff)).toBe(true);
  });
});
