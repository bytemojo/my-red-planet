// Step 28c: the parked, BROKEN Mars rover (tiles x33-35, y21-22, zone 'rover'). Original design, not a copy of any real rover:
// six wheels on a rocker-bogie style linkage, an instrument mast with a camera head that idly turns, a drooping arm with a tool turret,
// a dusty solar panel and a blinking amber fault light. The middle wheel on the near side is cracked and sits low (that is the fault).
// Static parts are drawn once; only the camera head and the fault light redraw (about 10 times a second). Metal and glass only.
import type Phaser from 'phaser';

const T = 32;
export const ROVER = { x: 33 * T, y: 21 * T, w: 3 * T, h: 2 * T, depth: 23 * T } as const;

export interface RoverPose { /** -1 (looking left) .. 1 (looking right), eased with a rest at each side */ head: number; /** amber fault light on this instant */ faultOn: boolean; /** 0..1 glow strength */ glow: number }
/** Pure animation: the camera head turns slowly, the fault light blinks. `reduced` = a still pose with the light steady. */
export function roverPose(nowMs: number, reduced = false): RoverPose {
  if (reduced) return { head: 0, faultOn: true, glow: 0.6 };
  const head = Math.max(-1, Math.min(1, 1.7 * Math.sin(nowMs / 2600)));
  const ph = (nowMs % 1100) / 1100;
  return { head, faultOn: ph < 0.45, glow: ph < 0.45 ? 1 - ph / 0.45 * 0.4 : 0 };
}

export interface RoverArt { /** Cheap to call every frame. */ update(nowMs: number, reduced?: boolean): void }

export function buildRover(scene: Phaser.Scene): RoverArt {
  const X = ROVER.x, Y = ROVER.y, D = ROVER.depth;
  const st = scene.add.graphics().setDepth(D);
  const R = (x: number, y: number, w: number, h: number, c: number, a = 1) => { st.fillStyle(c, a); st.fillRect(X + x, Y + y, w, h); };
  const C = (x: number, y: number, r: number, c: number, a = 1) => { st.fillStyle(c, a); st.fillCircle(X + x, Y + y, r); };
  const L = (x1: number, y1: number, x2: number, y2: number, w: number, c: number, a = 1) => { st.lineStyle(w, c, a); st.lineBetween(X + x1, Y + y1, X + x2, Y + y2); };
  // ground shadow
  st.fillStyle(0x000000, 0.3); st.fillEllipse(X + 50, Y + 61, 98, 14);
  // far-side wheels (peeking out behind, darker)
  for (const wx of [18, 50, 82]) { C(wx + 5, 47, 8, 0x0d0a08); C(wx + 5, 47, 3, 0x56627c); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; R(wx + 5 + Math.cos(a) * 7 - 1, 47 + Math.sin(a) * 7 - 1, 2, 2, 0x2b221b); } }
  // rocker-bogie linkage (near side): rear bogie, rocker beam, front arm
  L(14, 50, 30, 42, 3, 0x6f7f9c); L(46, 50, 30, 42, 3, 0x6f7f9c); L(30, 42, 56, 36, 3, 0x8d99b3); L(56, 36, 80, 50, 3, 0x6f7f9c);
  for (const [jx, jy] of [[30, 42], [56, 36]]) { C(jx, jy, 3, 0x24365a); C(jx, jy, 1.5, 0xc9d5ea); }
  // chassis: warm electronics box with a lit top deck, side panel seams, vents, a bolted instrument hatch
  R(22, 12, 56, 26, 0x6b665b);                 // underside shadow edge
  R(22, 12, 56, 22, 0xcfc9bb);                 // body
  R(22, 12, 56, 3, 0xf1ece0);                  // lit top edge
  R(22, 31, 56, 3, 0x8f897c);                  // lower trim
  R(22, 12, 2, 22, 0xe6e0d2); R(76, 12, 2, 22, 0x9a9486); // left lit, right shaded
  for (const sx of [38, 56]) R(sx, 15, 1, 16, 0x8f897c, 0.9);                 // panel seams
  for (let i = 0; i < 4; i++) R(26, 20 + i * 3, 9, 1, 0x4a463d);              // vents
  R(60, 18, 12, 9, 0x4a463d); R(61, 19, 10, 7, 0xb9b3a4);                     // instrument hatch
  for (const [bx, by] of [[62, 20], [68, 20], [62, 24], [68, 24]]) R(bx, by, 1, 1, 0x2b2822);
  R(41, 19, 10, 6, 0x24365a); R(42, 20, 8, 4, 0x39d9ff, 0.55);                // small cyan status window
  // dust on the body (it has been parked a long time)
  R(24, 26, 20, 5, 0xc98a5a, 0.35); R(54, 28, 18, 4, 0xc98a5a, 0.3); R(30, 13, 12, 2, 0xe0b080, 0.3);
  // near-side wheels: the middle one is cracked and sits 3 px low
  for (const [wx, wy, broken] of [[14, 50, false], [46, 53, true], [78, 50, false]] as [number, number, boolean][]) {
    C(wx, wy, 11, 0x15110d); C(wx, wy, 8, 0x2b221b);
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; R(wx + Math.cos(a) * 10 - 1, wy + Math.sin(a) * 10 - 1, 2, 2, 0x4a3b30); }   // tread lugs
    C(wx, wy, 4, 0x93a8cc); C(wx, wy, 2, 0x24365a);
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; L(wx, wy, wx + Math.cos(a) * 7, wy + Math.sin(a) * 7, 1, 0x6f7f9c); }
    if (broken) { L(wx + 1, wy - 10, wx + 5, wy - 2, 2, 0x050403); L(wx + 5, wy - 2, wx + 2, wy + 4, 1, 0x050403); R(wx + 7, wy + 6, 4, 3, 0xc98a5a, 0.6); }
    else R(wx - 6, wy + 5, 12, 2, 0xc98a5a, 0.35); // dust on the tyre
  }
  // solar panel: tilted deck on two struts, with a dust film and one cracked cell
  L(30, 12, 26, 6, 2, 0x6f7f9c); L(52, 12, 56, 6, 2, 0x6f7f9c);
  R(22, 1, 40, 6, 0x24365a); R(23, 2, 38, 4, 0x2c4a86);
  for (let i = 1; i < 8; i++) R(23 + i * 4.75, 2, 1, 4, 0x15284d); R(23, 4, 38, 1, 0x15284d);
  R(23, 2, 38, 1, 0x6c93d6, 0.7); R(26, 2, 10, 4, 0xc98a5a, 0.33); R(44, 3, 14, 3, 0xc98a5a, 0.28);
  L(48, 2, 51, 6, 1, 0x050403, 0.8);
  // rear whip antenna with a ball tip
  L(26, 12, 24, -10, 1, 0xc9d5ea); C(24, -11, 2, 0xe3ecff);
  // mast: base ring, pole, cross arm (head sits on top; drawn dynamically)
  R(63, 10, 8, 3, 0x24365a); R(66, -12, 3, 23, 0x93a8cc); R(66, -12, 1, 23, 0xe3ecff, 0.7); R(64, -2, 7, 2, 0x6f7f9c);
  // arm: shoulder, drooping upper arm and forearm, tool turret with a drill bit (it hangs because the joint failed)
  C(78, 24, 4, 0x24365a); C(78, 24, 2, 0xc9d5ea);
  L(78, 24, 88, 29, 4, 0x6f7f9c); L(88, 29, 91, 41, 3, 0x8d99b3); C(88, 29, 3, 0x24365a);
  C(91, 43, 4, 0x24365a); C(91, 43, 2.5, 0xb5c4dc); R(90, 46, 2, 6, 0xc9d5ea); R(90, 51, 2, 1, 0x050403);
  // dynamic layer: camera head and the fault light
  const dy = scene.add.graphics().setDepth(D + 1);
  const glow = scene.add.graphics().setDepth(D + 2).setBlendMode(1 as unknown as Phaser.BlendModes); // ADD
  let last = '';
  return {
    update(nowMs, reduced = false) {
      const p = roverPose(nowMs, reduced);
      const key = `${Math.round(p.head * 6)}|${p.faultOn ? Math.round(p.glow * 5) : -1}`;
      if (key === last) return; last = key;
      dy.clear(); glow.clear();
      // camera head: box on the mast; the two lens eyes slide and close together as it turns (a head seen from the side is narrow)
      const hx = X + 67.5, hy = Y - 18, w = 13 - Math.abs(p.head) * 3;
      dy.fillStyle(0x24365a, 1); dy.fillRect(hx - w / 2 - 1, hy - 1, w + 2, 10);
      dy.fillStyle(0xcfc9bb, 1); dy.fillRect(hx - w / 2, hy, w, 8); dy.fillStyle(0xf1ece0, 1); dy.fillRect(hx - w / 2, hy, w, 1);
      const sep = 4 * (1 - Math.abs(p.head) * 0.5), ex = hx + p.head * 3;
      for (const sx of [ex - sep / 2, ex + sep / 2]) { dy.fillStyle(0x050403, 1); dy.fillCircle(sx, hy + 4, 2); dy.fillStyle(0x39d9ff, 0.9); dy.fillRect(sx - 0.5, hy + 3, 1, 1); }
      dy.fillStyle(0x6f7f9c, 1); dy.fillRect(hx - 1, hy - 4, 2, 4); dy.fillStyle(0xe3ecff, 1); dy.fillRect(hx - 1, hy - 5, 2, 1);
      // fault light on the chassis roof
      const fx = X + 50, fy = Y + 9;
      dy.fillStyle(0x3a2a10, 1); dy.fillRect(fx - 3, fy - 1, 6, 5);
      dy.fillStyle(p.faultOn ? 0xffb340 : 0x6b4a14, 1); dy.fillRect(fx - 2, fy, 4, 3);
      if (p.faultOn) { glow.fillStyle(0xffb340, 0.35 * p.glow); glow.fillCircle(fx, fy + 1, 12); glow.fillStyle(0xffd79a, 0.4 * p.glow); glow.fillCircle(fx, fy + 1, 4); }
    },
  };
}
