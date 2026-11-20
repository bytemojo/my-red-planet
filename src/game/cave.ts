// Step 28e: the cave entrance (tiles x38-40, y24-26, zone 'cave'). Original pixel art, rock and metal only:
// a mound of red rock with a stone arch, a dark opening, a faint cyan glow far inside that slowly breathes,
// loose rocks on the apron and a small metal hazard sign. The static art is drawn once; only the glow redraws (about 5 times a second).
import type Phaser from 'phaser';

const T = 32;
/** The art box is the click box (layout.ts CLICK_BOXES.cave) and the solid rock body is its top two rows (layout.ts block(38,24,3,2)). */
export const CAVE = { x: 38 * T, y: 24 * T, w: 3 * T, h: 3 * T, depth: 27 * T, mouthX: 39.5 * T, mouthY: 25.4 * T } as const;

export interface CavePose { /** 0..1 strength of the faint cyan glow deep inside */ glow: number; /** 0..1 how far the glow light reaches */ reach: number }
/** Pure animation: a slow breath (about 5 s), never fully dark and never bright. `reduced` = a steady glow. */
export function cavePose(nowMs: number, reduced = false): CavePose {
  if (reduced) return { glow: 0.5, reach: 0.5 };
  const ph = (Math.sin(nowMs / 800) + 1) / 2; // 0..1, one breath every ~5 s
  return { glow: 0.25 + 0.55 * ph, reach: 0.3 + 0.5 * ph };
}

export interface CaveArt { /** Cheap to call every frame. */ update(nowMs: number, reduced?: boolean): void }

/** Small stable hash 0..1 so the rock texture never changes between runs. */
const h2 = (a: number, b: number) => { let n = Math.imul(a * 374761393 + b * 668265263, 1274126177); n = (n ^ (n >>> 13)) >>> 0; return n / 4294967296; };

export function buildCave(scene: Phaser.Scene): CaveArt {
  const cx = CAVE.mouthX, X0 = CAVE.x, Y0 = CAVE.y;
  const st = scene.add.graphics().setDepth(CAVE.depth);
  const R = (x: number, y: number, w: number, h: number, c: number, a = 1) => { st.fillStyle(c, a); st.fillRect(x, y, w, h); };
  // ground shadow
  st.fillStyle(0x000000, 0.3); st.fillEllipse(cx, Y0 + 2 * T + 4, 140, 16);
  // rock mound: stacked strips that widen toward the ground, lit from the upper left
  const strips = 11, top = Y0 - 10, bottom = Y0 + 2 * T;
  for (let i = 0; i < strips; i++) {
    const y = top + ((bottom - top) / strips) * i, hh = (bottom - top) / strips + 1, hw = 30 + i * 4.4;
    R(cx - hw, y, hw * 2, hh, i % 2 ? 0x6b3a26 : 0x7a4430);
    R(cx - hw, y, 4, hh, 0xb5693f); R(cx - hw + 4, y, 3, hh, 0x8a4b30);       // lit left edge
    R(cx + hw - 6, y, 6, hh, 0x3a1a10); R(cx + hw - 10, y, 4, hh, 0x4d2417);  // shaded right edge
    for (let k = 0; k < 6; k++) { const px = cx - hw + 8 + h2(i, k) * (hw * 2 - 18), py = y + h2(k, i + 9) * hh; R(px, py, 3 + (k % 2) * 2, 2, h2(i, k + 5) > 0.5 ? 0x9a5836 : 0x3a1a10, 0.8); } // speckles and cracks
  }
  // top boulders on the crown
  for (const [bx, by, bw, bh] of [[-26, -8, 20, 12], [-4, -14, 24, 14], [18, -6, 18, 10]] as const) {
    R(cx + bx, top + by + 8, bw, bh, 0x8a4b30); R(cx + bx, top + by + 8, bw, 3, 0xc77a4a); R(cx + bx + bw - 4, top + by + 8, 4, bh, 0x4d2417);
  }
  // dark opening: an arch (ellipse top, straight sides to the ground)
  const oy = Y0 + 30, rx = 21, ry = 22;
  st.fillStyle(0x24100a, 1); st.fillEllipse(cx, oy, rx * 2 + 8, ry * 2 + 8); R(cx - rx - 4, oy, rx * 2 + 8, bottom - oy, 0x24100a);   // dark outline of the hole
  st.fillStyle(0x120806, 1); st.fillEllipse(cx, oy, rx * 2, ry * 2); R(cx - rx, oy, rx * 2, bottom - oy, 0x120806);
  st.fillStyle(0x07040a, 1); st.fillEllipse(cx, oy + 4, rx * 1.4, ry * 1.3); R(cx - rx * 0.7, oy + 4, rx * 1.4, bottom - oy - 4, 0x07040a);
  // stone arch: blocks around the top half of the opening
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI + (i / 10) * Math.PI, bx = cx + Math.cos(a) * (rx + 3), by = oy + Math.sin(a) * (ry + 3);
    R(bx - 4, by - 4, 8, 8, i % 2 ? 0x9a5836 : 0xb5693f); R(bx - 4, by - 4, 8, 2, 0xd98b5a); R(bx - 4, by + 2, 8, 2, 0x4d2417);
  }
  // door posts (stone jambs) down to the ground
  for (const sx of [-rx - 7, rx - 1]) { R(cx + sx, oy, 8, bottom - oy, 0x8a4b30); R(cx + sx, oy, 8, 2, 0xd98b5a); R(cx + sx + (sx < 0 ? 0 : 6), oy, 2, bottom - oy, sx < 0 ? 0xc77a4a : 0x3a1a10); }
  // floor of the entrance: a worn dark path leading in
  R(cx - 14, bottom - 3, 28, 3, 0x3a1a10); R(cx - 10, bottom - 6, 20, 3, 0x24100a);
  // loose rocks on the apron (flat on the ground, with shadows)
  for (const [rx2, ry2, s] of [[-38, 56, 7], [-28, 62, 4], [30, 58, 6], [40, 64, 4], [-6, 66, 3], [14, 68, 5]] as const) {
    st.fillStyle(0x000000, 0.28); st.fillEllipse(cx + rx2 + 1, Y0 + ry2 + s * 0.6, s * 2.2, s * 0.8);
    R(cx + rx2 - s / 2, Y0 + ry2 - s / 2, s, s * 0.75, 0x7a4430); R(cx + rx2 - s / 2, Y0 + ry2 - s / 2, s, 1.5, 0xc77a4a);
  }
  // hazard sign: metal post and an amber triangle (a symbol, no words, so it reads at any size)
  const sx = X0 - 4, sy = Y0 + 2 * T - 6;
  R(sx - 1, sy - 22, 3, 28, 0x56627c); R(sx - 1, sy - 22, 1, 28, 0xc9d5ea); R(sx - 5, sy + 4, 11, 3, 0x24365a);
  st.fillStyle(0x24365a, 1); st.fillTriangle(sx, sy - 40, sx - 15, sy - 14, sx + 15, sy - 14);
  st.fillStyle(0xffb340, 1); st.fillTriangle(sx, sy - 37, sx - 12, sy - 16, sx + 12, sy - 16);
  st.fillStyle(0x24100a, 1); st.fillRect(sx - 1, sy - 31, 3, 9); st.fillRect(sx - 1, sy - 20, 3, 3);
  // glow layers: a faint cyan light far inside, drawn additively
  const glow = scene.add.graphics().setDepth(CAVE.depth + 1).setBlendMode(1 as unknown as Phaser.BlendModes); // ADD
  let last = -1;
  return {
    update(nowMs, reduced = false) {
      const p = cavePose(nowMs, reduced), key = Math.round(p.glow * 12);
      if (key === last) return; last = key;
      glow.clear();
      const gy = oy + 14;
      glow.fillStyle(0x39d9ff, 0.10 * p.glow); glow.fillEllipse(cx, gy, 10 + 22 * p.reach, 8 + 16 * p.reach);
      glow.fillStyle(0x39d9ff, 0.30 * p.glow); glow.fillEllipse(cx, gy, 8, 6);
      glow.fillStyle(0xc8f6ff, 0.45 * p.glow); glow.fillRect(cx - 1, gy - 1, 2, 2);
    },
  };
}
