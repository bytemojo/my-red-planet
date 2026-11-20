import { describe, expect, it } from 'vitest';
import { TRUCK_PARK, WHEEL_R, WHEEL_X, buildTruck, stepWheel, truckPose } from '../src/game/truck';
import { LANDMARKS, T } from '../src/game/layout';
import { writeFileSync } from 'node:fs';

type Rec = { k: string; a: number[] };
function fakeScene() {
  const gfx: any[] = [];
  const make = () => {
    const g = { depth: 0, blend: 0, x: 0, y: 0, sx: 1, ops: [] as Rec[] } as any;
    const proxy: any = new Proxy(g, { get: (t, p: string) => p in t ? t[p]
      : p === 'setDepth' ? (d: number) => { t.depth = d; return proxy; } : p === 'setBlendMode' ? (b: number) => { t.blend = b; return proxy; }
      : p === 'setPosition' ? (x: number, y: number) => { t.x = x; t.y = y; return proxy; } : p === 'setScale' ? (sx: number) => { t.sx = sx; return proxy; }
      : p === 'clear' ? () => { t.ops.length = 0; return proxy; } : (...a: number[]) => { t.ops.push({ k: p, a }); return proxy; } });
    gfx.push(g); return proxy;
  };
  return { scene: { add: { graphics: make } } as any, gfx };
}
const hasColor = (g: any, c: number) => g.ops.some((o: Rec) => o.k === 'fillStyle' && o.a[0] === c);

describe('Step 28g: the Mars truck art', () => {
  it('parks on the truck bay pad', () => {
    const bay = LANDMARKS.find(l => l.id === 'truck_bay')!;
    expect(TRUCK_PARK.x).toBeGreaterThan(bay.x0 * T); expect(TRUCK_PARK.x).toBeLessThan((bay.x1 + 1) * T);
    expect(TRUCK_PARK.y).toBeGreaterThan(bay.y0 * T); expect(TRUCK_PARK.y).toBeLessThanOrEqual((bay.y1 + 1) * T);
  });
  it('static body is a detailed build (rack, panel, antenna, glass, lamps) and is drawn once', () => {
    const { scene, gfx } = fakeScene(); const art = buildTruck(scene); const n = gfx[0].ops.length;
    expect(n).toBeGreaterThan(100);
    for (const c of [0xd9822b, 0x2a8fb0, 0x1a2a55, 0xc9d5ea, 0xfff3c9]) expect(hasColor(gfx[0], c), c.toString(16)).toBe(true);
    art.update(0, { driving: false, lamp: 0 }); art.update(5000, { driving: true, lamp: 1 }); expect(gfx[0].ops.length).toBe(n);
  });
  it('placement moves all layers, depth follows y, facing left flips them', () => {
    const { scene, gfx } = fakeScene(); const art = buildTruck(scene);
    art.setPlacement(500, 700, -1);
    for (const g of gfx) { expect([g.x, g.y, g.sx]).toEqual([500, 700, -1]); expect(g.depth).toBeGreaterThanOrEqual(700); expect(g.depth).toBeLessThan(704); }
  });
  it('wheels turn only while driving; dust puffs only while driving; parked idle shimmers the panel', () => {
    expect(stepWheel(0, 0.5, false)).toBe(0); expect(stepWheel(0, 0.5, true)).toBeGreaterThan(0);
    expect(truckPose(1000, false).puffs).toEqual([]); expect(truckPose(1000, true).puffs.length).toBeGreaterThan(3);
    expect(truckPose(0, false).shimmer).not.toBe(truckPose(1200, false).shimmer);
    const { scene, gfx } = fakeScene(); const art = buildTruck(scene);
    art.update(0, { driving: true, lamp: 0 }); art.update(100, { driving: true, lamp: 0 }); const a = JSON.stringify(gfx[1].ops);
    art.update(200, { driving: true, lamp: 0 }); art.update(300, { driving: true, lamp: 0 }); expect(JSON.stringify(gfx[1].ops)).not.toBe(a);   // wheel bolts moved
    const p = fakeScene(); const art2 = buildTruck(p.scene); art2.update(0, { driving: false, lamp: 0 }); art2.update(2000, { driving: false, lamp: 0 });
    expect(JSON.stringify(p.gfx[1].ops).includes('0.55')).toBe(true);                                    // the sheen is drawn while parked
    expect(WHEEL_X.length).toBe(2); expect(WHEEL_R).toBeGreaterThanOrEqual(12);                         // big tyres
  });
  it('headlights glow only when it is dark (additive layer empty in daylight) and reduced motion stops wheels and puffs', () => {
    const { scene, gfx } = fakeScene(); const art = buildTruck(scene);
    expect(gfx[2].blend).toBe(1);
    art.update(0, { driving: false, lamp: 0 }); expect(gfx[2].ops.length).toBe(0);
    art.update(100, { driving: false, lamp: 1 }); expect(hasColor(gfx[2], 0xfff3c9)).toBe(true);
    const r = fakeScene(); const art3 = buildTruck(r.scene);
    art3.update(0, { driving: true, lamp: 0, reduced: true }); const snap = JSON.stringify(r.gfx[1].ops);
    art3.update(500, { driving: true, lamp: 0, reduced: true }); expect(JSON.stringify(r.gfx[1].ops)).toBe(snap); expect(truckPose(500, true, true).puffs).toEqual([]);
  });
  it.skipIf(!process.env.TRUCK_DUMP)('dumps ops for an offline preview', () => {
    const out: any = {};
    for (const [name, d] of Object.entries({ parked: { driving: false, lamp: 0 }, driving: { driving: true, lamp: 0 }, night: { driving: false, lamp: 1 } })) {
      const { scene, gfx } = fakeScene(); const art = buildTruck(scene); art.setPlacement(0, 0, 1);
      for (let t = 0; t <= 900; t += 60) art.update(t + (name === 'parked' ? 600 : 0), d as any);
      out[name] = gfx.map(g => ({ blend: g.blend, ops: g.ops }));
    }
    writeFileSync('/tmp/truck-ops.json', JSON.stringify(out));
  });
});
