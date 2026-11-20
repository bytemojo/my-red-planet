import { describe, expect, it } from 'vitest';
import { H, MAP_EDGE, T, W, buildLayout } from '../src/game/layout';
import { CRATERS } from '../src/game/layout';
import { DUST_PUFFS, REGOLITH, TRACKS, craterOps, dustPuff, groundTileOps, hash, patch, regolithAt, rockShadowOps } from '../src/game/ground';

const L = buildLayout();
describe('Step 28b: outdoor ground art (pure)', () => {
  it('is deterministic: the same tile always gives the same drawing', () => {
    expect(groundTileOps(50, 20, 'open', false)).toEqual(groundTileOps(50, 20, 'open', false));
    expect(hash(3, 4, 5)).toBe(hash(3, 4, 5)); expect(patch(10, 12)).toBe(patch(10, 12));
  });
  it('every outdoor tile of the real map draws finite, in-tile commands with sane alpha and a bounded count', () => {
    for (let y = MAP_EDGE; y < H - MAP_EDGE; y++) for (let x = MAP_EDGE; x < W - MAP_EDGE; x++) {
      if (L.inside[y][x]) continue;
      const ops = groundTileOps(x, y, L.terrain[y][x], false);
      expect(ops.length).toBeGreaterThan(0); expect(ops.length).toBeLessThan(40);
      for (const o of ops) {
        expect(o.a).toBeGreaterThanOrEqual(0); expect(o.a).toBeLessThanOrEqual(1);
        const nums = o.k === 'line' ? [o.x1, o.y1, o.x2, o.y2] : [o.x, o.y, o.w, o.h];
        nums.forEach(n => expect(Number.isFinite(n)).toBe(true));
        if (o.k === 'rect') { expect(o.x).toBeGreaterThanOrEqual(x * T - 1); expect(o.x + o.w).toBeLessThanOrEqual((x + 1) * T + 1); expect(o.y).toBeGreaterThanOrEqual(y * T - 1); expect(o.y + o.h).toBeLessThanOrEqual((y + 1) * T + 1); }
      }
    }
  });
  it('the base colour is red or ochre regolith and varies from tile to tile', () => {
    const base = new Set<number>();
    for (let x = 44; x < 60; x++) { const first = groundTileOps(x, 20, 'open', false)[0] as any; expect(REGOLITH).toContain(first.c); base.add(first.c); }
    expect(base.size).toBeGreaterThanOrEqual(3);
    expect(regolithAt(-5)).toBe(REGOLITH[0]); expect(regolithAt(5)).toBe(REGOLITH[REGOLITH.length - 1]);
  });
  it('the truck pad is metal and the dune is lighter than open ground', () => {
    expect((groundTileOps(34, 31, 'pad', false)[0] as any).c).toBe(0x34476b);
    const lum = (c: number) => ((c >> 16) & 255) + ((c >> 8) & 255);
    let dune = 0, open = 0; for (let x = 20; x < 40; x++) { dune += lum((groundTileOps(x, 36, 'dune', false)[0] as any).c); open += lum((groundTileOps(x, 36, 'open', false)[0] as any).c); }
    expect(dune).toBeGreaterThan(open);
    const bowl = (craterOps(8, 31, 3)[3] as any).c; expect(lum(bowl)).toBeLessThan(lum(REGOLITH[0]));
  });
  it('tyre tracks run near the base: tiles on a track path get tread marks, tiles away from it do not', () => {
    const [bx, by] = TRACKS[0][1]; const on = groundTileOps(Math.floor(bx), Math.floor(by) - 2, 'open', true);
    const off = groundTileOps(60, 30, 'open', false);
    const tread = (ops: any[]) => ops.filter(o => o.k === 'rect' && o.c === 0x3a160c && o.a === 0.38).length;
    expect(tread(on)).toBeGreaterThan(0); expect(tread(off)).toBe(0);
  });
  it('rocks get a soft shadow below them', () => {
    const s = rockShadowOps(10, 10, 2)[0] as any; expect(s.k).toBe('ell'); expect(s.a).toBeGreaterThan(0); expect(s.y).toBeGreaterThan(10 * T + T / 2);
  });
  it('dust drift is very slow, stays on the map width, never opaque, and is the same for the same time', () => {
    expect(DUST_PUFFS).toBeGreaterThan(5);
    for (let i = 0; i < DUST_PUFFS; i++) {
      const a = dustPuff(i, 0, W, H), b = dustPuff(i, 10, W, H), c = dustPuff(i, 0, W, H);
      expect(a).toEqual(c); expect(a.a).toBeLessThanOrEqual(0.08); expect(a.a).toBeGreaterThan(0);
      const moved = (b.x - a.x + W * T + 200) % (W * T + 200); expect(moved / 10).toBeLessThanOrEqual(10); // under 10 px per second
      expect(a.x).toBeGreaterThanOrEqual(-100); expect(a.x).toBeLessThanOrEqual(W * T + 100);
      expect(a.y).toBeGreaterThan(0); expect(a.y).toBeLessThan(H * T);
    }
  });
  it('every crater draws smooth ellipses that stay inside the map and are bigger than their bowl', () => {
    for (const [cx, cy, r] of CRATERS) {
      const ops = craterOps(cx, cy, r) as any[]; expect(ops.length).toBeGreaterThanOrEqual(5);
      expect(ops.every(o => o.k === 'ell' && o.a > 0 && o.a <= 1)).toBe(true);
      for (const o of ops) { expect(o.x - o.w / 2).toBeGreaterThan(0); expect(o.x + o.w / 2).toBeLessThan(W * T); expect(o.y - o.h / 2).toBeGreaterThan(0); expect(o.y + o.h / 2).toBeLessThan(H * T); }
      expect(ops[1].w).toBeGreaterThan(ops[3].w);
    }
  });
});
