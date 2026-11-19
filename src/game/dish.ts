// Step 26c: the outdoor satellite dish (tiles x40-41, y8-9 on the rock; you work it from the strip south of it, zone 'dish').
// Original pixel art, metal only: pad, bolted flange, mast with struts, equipment box with lights, cable, side antenna, ribbed bowl,
// feed horn on an arm, status lights. WORKING = the bowl turns slowly around the mast (core/dish.ts dishSpin), steady lights.
// BROKEN = the bowl droops and stops, one rib is snapped, the arm hangs bent, a cable sparks, amber light blinks (the Step 14 art states).
import type Phaser from 'phaser';
import { dishSpin } from '../core/dish';

const T = 32;
const CX = 41 * T, CY = 8 * T - 34;   // pivot of the bowl, on top of the mast
const DEPTH = 10 * T;

export interface DishArt { /** Cheap to call every frame. */ update(broken: boolean, nowMs: number, reduced?: boolean): void }

const ell = (cx: number, cy: number, rx: number, ry: number, rot = 0, n = 28) => {
  const c = Math.cos(rot), s = Math.sin(rot), pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry; pts.push({ x: cx + x * c - y * s, y: cy + x * s + y * c }); }
  return pts;
};

export function buildDish(scene: Phaser.Scene): DishArt {
  const st = scene.add.graphics().setDepth(DEPTH);
  const X = 40 * T, Y = 8 * T;
  // pad (rock-set metal plate) with front lip and bolts
  st.fillStyle(0x3a4a6c, 1); st.fillRect(X + 2, Y + 36, 60, 12);
  st.fillStyle(0x6a7a99, 1); st.fillRect(X + 2, Y - 2, 60, 40); st.lineStyle(1, 0xffffff, 0.22); st.strokeRect(X + 2.5, Y - 1.5, 59, 39);
  st.fillStyle(0x7f8fae, 1); st.fillRect(X + 4, Y, 56, 2);
  for (const [bx, by] of [[X + 5, Y + 2], [X + 56, Y + 2], [X + 5, Y + 31], [X + 56, Y + 31]]) { st.fillStyle(0x24365a, 1); st.fillRect(bx, by, 3, 3); st.fillStyle(0xe3ecff, 0.8); st.fillRect(bx, by, 1, 1); }
  // equipment box (left) with vents and a conduit up to the mast
  st.fillStyle(0x24365a, 1); st.fillRect(X + 6, Y + 14, 22, 20); st.fillStyle(0x93a8cc, 1); st.fillRect(X + 7, Y + 15, 20, 18);
  st.fillStyle(0x0c1830, 1); for (let i = 0; i < 3; i++) st.fillRect(X + 9, Y + 25 + i * 3, 10, 1);
  st.fillStyle(0xd7e2f5, 0.9); st.fillRect(X + 7, Y + 15, 20, 1);
  st.fillStyle(0x6f7f9c, 1); st.fillRect(X + 18, Y + 6, 2, 9); st.fillRect(X + 18, Y + 6, 12, 2);
  // mast: flange, tapered column with ring joints, two diagonal struts
  st.fillStyle(0x24365a, 1); st.fillRect(CX - 9, Y + 2, 18, 6); st.fillStyle(0x8d99b3, 1); st.fillRect(CX - 8, Y + 2, 16, 2);
  st.fillStyle(0x2a3550, 1); st.fillRect(CX - 4, CY + 8, 8, Y - CY - 2); st.fillStyle(0x93a8cc, 1); st.fillRect(CX - 4, CY + 8, 2, Y - CY - 2);
  for (const ry of [CY + 18, CY + 30]) { st.fillStyle(0x24365a, 1); st.fillRect(CX - 5, ry, 10, 2); }
  st.lineStyle(2, 0x6f7f9c, 1); st.beginPath(); st.moveTo(CX - 4, Y - 14); st.lineTo(CX - 14, Y + 2); st.moveTo(CX + 4, Y - 14); st.lineTo(CX + 14, Y + 2); st.strokePath();
  // small side antenna (whip) on the right of the pad
  st.fillStyle(0x24365a, 1); st.fillRect(X + 48, Y + 16, 8, 14); st.fillStyle(0x93a8cc, 1); st.fillRect(X + 49, Y + 17, 6, 12);
  st.lineStyle(1, 0xc9d5ea, 1); st.beginPath(); st.moveTo(X + 52, Y + 16); st.lineTo(X + 52, Y - 26); st.strokePath();
  st.fillStyle(0x24365a, 1); st.fillRect(X + 50, Y - 14, 5, 2);

  const d = scene.add.graphics().setDepth(DEPTH + 1);
  return {
    update(broken, now, reduced = false) {
      d.clear();
      const blink = reduced ? true : Math.floor(now / 400) % 2 === 0;
      // equipment lights + antenna tip
      d.fillStyle(broken ? 0xffb340 : 0x4dffb0, broken ? (blink ? 1 : 0.2) : 1); d.fillRect(X + 22, Y + 17, 4, 3);
      d.fillStyle(broken ? 0x5a3a10 : 0x39d9ff, 1); d.fillRect(X + 22, Y + 22, 4, 3);
      d.fillStyle(0xff5a6e, Math.floor(now / 520) % 2 === 0 || reduced ? 1 : 0.2); d.fillCircle(X + 52, Y - 27, 2);
      if (!broken) {
        const { face, swing } = dishSpin(now, reduced), rx = 24 * face, ry = 17;
        const ox = swing * 5;                                   // the bowl shifts a little as it turns
        // back shell, then the bowl, inner dish, ribs
        d.fillStyle(0x6a7a99, 1); d.fillPoints(ell(CX + ox - 2, CY + 3, rx, ry), true);
        d.fillStyle(0xe9f0ff, 1); d.fillPoints(ell(CX + ox, CY, rx, ry), true);
        d.fillStyle(0x93a8cc, 1); d.fillPoints(ell(CX + ox + swing * 3, CY + 2, rx * 0.68, ry * 0.68), true);
        d.lineStyle(1, 0x6f86ad, 0.9);
        for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + 0.3; d.beginPath(); d.moveTo(CX + ox + swing * 3, CY + 2); d.lineTo(CX + ox + Math.cos(a) * rx, CY + Math.sin(a) * ry); d.strokePath(); }
        d.lineStyle(1, 0xffffff, 0.55); d.strokeEllipse(CX + ox, CY, rx * 2, ry * 2);
        // feed horn on a thin arm from the lower rim to the focus (sits in front of the bowl)
        const fx = CX + ox + swing * 12, fy = CY - 4;
        d.lineStyle(2, 0x5f6f8e, 1); d.beginPath(); d.moveTo(CX + ox - rx * 0.5, CY + ry * 0.9); d.lineTo(fx, fy); d.moveTo(CX + ox + rx * 0.5, CY + ry * 0.9); d.lineTo(fx, fy); d.strokePath();
        d.fillStyle(0x24365a, 1); d.fillRect(fx - 3, fy - 4, 6, 6); d.fillStyle(0x8ceaff, 1); d.fillRect(fx - 1, fy - 2, 2, 2);
        d.fillStyle(0xe3ecff, 0.8); d.fillRect(CX + ox - rx + 4, CY - 6, 3, 2); // glint
        d.fillStyle(0x24365a, 1); d.fillCircle(CX, CY + 1, 3); d.fillStyle(0xb9c3d9, 1); d.fillCircle(CX, CY, 2); // hub bolt
      } else {
        // drooping bowl, tilted down to the left; snapped rib; bent arm; sparking cable
        const rot = -0.7;
        d.fillStyle(0x6a7a99, 1); d.fillPoints(ell(CX - 3, CY + 8, 24, 15, rot), true);
        d.fillStyle(0xb9c3d9, 1); d.fillPoints(ell(CX - 5, CY + 5, 24, 15, rot), true);
        d.fillStyle(0x6a7a99, 1); d.fillPoints(ell(CX - 3, CY + 7, 15, 9, rot), true);
        d.lineStyle(2, 0x1a2238, 1); d.beginPath(); d.moveTo(CX - 20, CY - 6); d.lineTo(CX - 8, CY + 6); d.lineTo(CX - 18, CY + 14); d.strokePath(); // crack
        d.lineStyle(2, 0x8a96b3, 1); d.beginPath(); d.moveTo(CX + 8, CY - 8); d.lineTo(CX + 20, CY - 20); d.lineTo(CX + 18, CY - 8); d.strokePath(); // bent arm
        d.fillStyle(0xffb340, blink ? 1 : 0.15); d.fillCircle(CX + 20, CY - 21, 3);
        d.lineStyle(1, 0xffb340, 0.9); d.beginPath(); d.moveTo(CX + 8, CY + 18); d.lineTo(CX + 14, CY + 30); d.lineTo(CX + 22, CY + 36); d.strokePath();
        if (!reduced && Math.floor(now / 170) % 5 === 0) { d.fillStyle(0xfff0a0, 1); d.fillRect(CX + 21, CY + 35, 2, 2); d.fillRect(CX + 24, CY + 33, 1, 1); } // spark
        d.fillStyle(0x24365a, 1); d.fillCircle(CX, CY + 2, 3);
      }
    },
  };
}
