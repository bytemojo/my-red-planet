import { describe, expect, it } from 'vitest';
import { ROVER, buildRover, roverPose } from '../src/game/rover';
import { ZONES, T } from '../src/game/layout';

type Rec = { k: string; a: number[] };
function fakeScene() {
  const gfx: { depth: number; ops: Rec[] }[] = [];
  const make = () => {
    const g = { depth: 0, ops: [] as Rec[] } as any;
    const proxy: any = new Proxy(g, { get: (t, p: string) => p in t ? t[p]
      : p === 'setDepth' ? (d: number) => { t.depth = d; return proxy; } : p === 'setBlendMode' ? () => proxy : p === 'clear' ? () => { t.ops.length = 0; return proxy; }
      : (...a: number[]) => { t.ops.push({ k: p, a }); return proxy; } });
    gfx.push(g); return proxy;
  };
  return { scene: { add: { graphics: make } } as any, gfx };
}

describe('Step 28c: the parked broken rover', () => {
  it('sits on the rover zone (tiles x33-35, y21-22), inside the zone rectangle', () => {
    expect(ROVER.x).toBe(33 * T); expect(ROVER.y).toBe(21 * T); expect(ROVER.w).toBe(3 * T); expect(ROVER.h).toBe(2 * T);
    expect(ROVER.x).toBeGreaterThanOrEqual(ZONES.rover.x0 * T); expect(ROVER.x + ROVER.w).toBeLessThanOrEqual((ZONES.rover.x1 + 1) * T);
  });
  it('camera head turns both ways, slowly, and rests at each side', () => {
    let min = 9, max = -9, rest = 0; for (let t = 0; t < 20000; t += 50) { const h = roverPose(t).head; min = Math.min(min, h); max = Math.max(max, h); if (Math.abs(h) === 1) rest++; }
    expect(min).toBe(-1); expect(max).toBe(1); expect(rest).toBeGreaterThan(10);
    for (let t = 0; t < 20000; t += 50) expect(Math.abs(roverPose(t + 50).head - roverPose(t).head)).toBeLessThan(0.1); // smooth, never a jump
  });
  it('the amber fault light blinks (on and off) about once a second, and glow is 0 when off', () => {
    let on = 0, off = 0; for (let t = 0; t < 5500; t += 25) { const p = roverPose(t); if (p.faultOn) { on++; expect(p.glow).toBeGreaterThan(0); } else { off++; expect(p.glow).toBe(0); } }
    expect(on).toBeGreaterThan(40); expect(off).toBeGreaterThan(40);
  });
  it('reduced motion gives one still pose with the light steady on', () => {
    expect(roverPose(0, true)).toEqual(roverPose(99999, true)); expect(roverPose(0, true).faultOn).toBe(true); expect(roverPose(0, true).head).toBe(0);
  });
  it('draws six wheels, a mast, a solar panel and an arm: the static layer is detailed, all inside the rover footprint (plus mast/antenna above)', () => {
    const { scene, gfx } = fakeScene(); const art = buildRover(scene); art.update(0);
    const st = gfx[0]; expect(st.depth).toBe(ROVER.depth);
    const circles = st.ops.filter(o => o.k === 'fillCircle' && o.a[2] >= 7 && o.a[2] <= 11); expect(circles.length).toBeGreaterThanOrEqual(6); // 3 near + 3 far wheel tyres
    expect(st.ops.length).toBeGreaterThan(120);
    for (const o of st.ops) {
      const xs = o.k === 'lineBetween' ? [o.a[0], o.a[2]] : o.k === 'fillStyle' || o.k === 'lineStyle' ? [] : [o.a[0]];
      const ys = o.k === 'lineBetween' ? [o.a[1], o.a[3]] : o.k === 'fillStyle' || o.k === 'lineStyle' ? [] : [o.a[1]];
      xs.forEach(x => { expect(x).toBeGreaterThanOrEqual(ROVER.x - 6); expect(x).toBeLessThanOrEqual(ROVER.x + ROVER.w + 8); });
      ys.forEach(y => { expect(y).toBeGreaterThanOrEqual(ROVER.y - 30); expect(y).toBeLessThanOrEqual(ROVER.y + ROVER.h + 6); });
    }
  });
  it('the dynamic layer redraws only when the pose changes (cheap per frame) and the light glow is additive on top', () => {
    const { scene, gfx } = fakeScene(); const art = buildRover(scene); art.update(0, true); const n = gfx[1].ops.length; expect(n).toBeGreaterThan(5);
    art.update(10, true); expect(gfx[1].ops.length).toBe(n);       // same pose: no redraw
    art.update(1300, false); expect(gfx[1].ops.length).toBeGreaterThan(0); expect(gfx[2].depth).toBeGreaterThan(gfx[1].depth);
  });
});
