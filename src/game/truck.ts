// Step 28g: the Mars truck art. Original Humvee-style design, metal and glass only: a boxy amber body, cab with glass, short hood, roof rack,
// a small roof solar panel, whip antenna, rear cargo bed with metal crates, big knobby oversized tyres, headlights that glow at night.
// Local drawing coords: (0,0) = ground centre under the truck, the front faces +x. setPlacement() moves it and flips it for facing left.
// Layers: STATIC body (drawn once), DYNAMIC (wheels, panel shimmer, dust puffs), GLOW (additive: headlights + panel sheen).
// States: parked idle = the roof panel shimmers; driving = wheels turn and dust puffs trail behind. Reduced motion = still wheels, no puffs, steady panel.
import type Phaser from 'phaser';

const T = 32;
/** Where the truck is parked at the start: the middle of the truck bay pad (tiles x32-37, y30-33). */
export const TRUCK_PARK = { x: 34.5 * T, y: 32 * T } as const;
export const TRUCK_SIZE = { w: 96, h: 70 } as const;   // body + antenna, in px
export const WHEEL_X = [-29, 29] as const, WHEEL_R = 13, WHEEL_Y = -13;
export const WHEEL_RAD_PER_S = 7;                        // wheels turn this fast while driving

export interface TruckPose { /** 0..1 position of the sheen sweeping over the roof panel (steady 0.5 when reduced) */ shimmer: number; /** dust puffs behind the truck (empty unless driving) */ puffs: { x: number; y: number; r: number; a: number }[] }
/** Pure animation. Puffs rise and fade behind the rear tyre; none when parked or with reduced motion. */
export function truckPose(nowMs: number, driving: boolean, reduced = false): TruckPose {
  if (reduced) return { shimmer: 0.5, puffs: [] };
  const shimmer = (nowMs % 2400) / 2400;
  const puffs: TruckPose['puffs'] = [];
  if (driving) for (let i = 0; i < 6; i++) { const ph = ((nowMs / 700) + i / 6) % 1; puffs.push({ x: -44 - ph * 30, y: -3 - ph * 12 - (i % 2) * 3, r: 3 + ph * 7, a: 0.5 * (1 - ph) }); }
  return { shimmer, puffs };
}
/** Pure: the wheel angle after dt seconds (only turns while driving). */
export const stepWheel = (angle: number, dtS: number, driving: boolean): number => driving ? (angle + WHEEL_RAD_PER_S * dtS) % (Math.PI * 2) : angle;

export interface TruckDraw { driving: boolean; /** 0..1 night-light strength (core daylight().lamp) */ lamp: number; reduced?: boolean }
export interface TruckArt {
  /** Move the truck (feet position in world px) and set which way it faces. Depth follows y so the player sorts correctly. */
  setPlacement(x: number, y: number, facing: 1 | -1): void;
  /** Cheap to call every frame. */
  update(nowMs: number, d: TruckDraw): void;
}

export function buildTruck(scene: Phaser.Scene): TruckArt {
  const st = scene.add.graphics(), dy = scene.add.graphics(), glow = scene.add.graphics().setBlendMode(1 as unknown as Phaser.BlendModes); // ADD
  const layers = [st, dy, glow];
  const R = (x: number, y: number, w: number, h: number, c: number, a = 1) => { st.fillStyle(c, a); st.fillRect(x, y, w, h); };
  // ground shadow
  st.fillStyle(0x000000, 0.3); st.fillEllipse(0, -1, 108, 12);
  // cargo bed (rear, left): dark floor, ribbed side, two metal crates with straps
  R(-48, -26, 34, 14, 0x3b4560); R(-48, -26, 34, 2, 0x8d99b3); for (let i = 0; i < 6; i++) R(-46 + i * 6, -24, 1, 10, 0x24365a);
  R(-44, -36, 14, 12, 0x6f7f9c); R(-44, -36, 14, 2, 0xc9d5ea); R(-44, -26, 14, 2, 0x24365a); R(-38, -36, 2, 12, 0xffb340);
  R(-28, -32, 12, 8, 0x93a8cc); R(-28, -32, 12, 2, 0xe3ecff); R(-28, -26, 12, 2, 0x24365a); R(-23, -32, 2, 8, 0x24365a);
  // body: lower hull (shadow edge, main amber panel, lit top edge, dark rocker)
  R(-14, -26, 62, 16, 0x7a3f12); R(-14, -26, 62, 12, 0xd9822b); R(-14, -26, 62, 2, 0xf2b45c); R(-14, -16, 62, 2, 0xa8601d);
  R(-14, -12, 62, 3, 0x24365a);                                      // rocker guard
  R(-14, -24, 2, 12, 0xf2b45c); R(46, -24, 2, 12, 0x8a4a14);         // lit rear edge, shaded front edge
  for (const sx of [6, 22, 36]) R(sx, -24, 1, 10, 0xa8601d, 0.9);    // panel seams
  R(10, -21, 6, 2, 0x24100a); R(11, -20, 4, 1, 0xf2b45c);            // door handle
  // hood (front): short and boxy with vents
  R(30, -32, 18, 8, 0xd9822b); R(30, -32, 18, 2, 0xf2b45c); R(30, -26, 18, 2, 0xa8601d);
  for (let i = 0; i < 3; i++) R(34 + i * 4, -30, 2, 3, 0x7a3f12);
  // cab: pillars, windscreen and side windows (cyan-tinted glass), roof
  R(-10, -46, 42, 22, 0xd9822b); R(-10, -46, 42, 2, 0xf2b45c); R(-10, -46, 2, 22, 0xf2b45c); R(30, -44, 2, 20, 0x8a4a14);
  R(-6, -42, 14, 12, 0x24365a); R(-5, -41, 12, 10, 0x2a8fb0); R(-5, -41, 12, 2, 0x8ceaff); R(-5, -39, 3, 8, 0x5fc7e3);   // rear window
  R(11, -42, 15, 12, 0x24365a); R(12, -41, 13, 10, 0x2a8fb0); R(12, -41, 13, 2, 0x8ceaff); R(13, -39, 3, 8, 0x5fc7e3);    // door window
  R(26, -42, 5, 12, 0x24365a); R(27, -41, 3, 10, 0x2a8fb0);                                                               // windscreen edge
  // roof rack: rails on posts, with cross bars
  for (const px of [-8, 8, 28]) R(px, -50, 2, 5, 0x56627c);
  R(-9, -52, 40, 2, 0x8d99b3); R(-9, -52, 40, 1, 0xe3ecff); for (const px of [0, 14, 24]) R(px, -53, 2, 3, 0x6f7f9c);
  // whip antenna on the rear of the roof with a tiny base
  R(-12, -52, 5, 3, 0x24365a); R(-11, -70, 1, 18, 0xc9d5ea); R(-12, -72, 3, 3, 0xff5a4a);
  // roof solar panel (static frame; the sheen is dynamic)
  R(-4, -57, 30, 6, 0x24365a); R(-3, -56, 28, 4, 0x1a2a55); for (let i = 1; i < 6; i++) R(-3 + i * 4.6, -56, 1, 4, 0x39528a); R(-3, -54, 28, 1, 0x39528a);
  // bumpers, grille, winch plate
  R(44, -18, 6, 8, 0x24365a); R(44, -18, 6, 2, 0x8d99b3); R(46, -26, 3, 8, 0x3b4560); for (let i = 0; i < 3; i++) R(46, -25 + i * 2.5, 3, 1, 0x0c1830);
  R(-50, -16, 4, 6, 0x24365a); R(-50, -16, 4, 2, 0x8d99b3);
  // lamps: front headlight housing and rear tail light
  R(45, -27, 4, 5, 0x24365a); R(46, -26, 3, 3, 0xfff3c9);
  R(-50, -24, 3, 4, 0x24365a); R(-49, -23, 2, 2, 0xff5a4a);
  // wheel arches (dark half discs the tyres sit in)
  for (const wx of WHEEL_X) { st.fillStyle(0x24100a, 1); st.fillCircle(wx, WHEEL_Y, WHEEL_R + 3); }

  let angle = 0, lastMs = -1, lastKey = '', px = TRUCK_PARK.x, py = TRUCK_PARK.y, facing: 1 | -1 = 1;
  const place = () => { layers.forEach((g, i) => { g.setPosition(px, py); g.setScale(facing, 1); g.setDepth(py + i); }); };
  place();
  const wheel = (g: Phaser.GameObjects.Graphics, wx: number) => {
    g.fillStyle(0x0d0a08, 1); g.fillCircle(wx, WHEEL_Y, WHEEL_R);                       // tyre
    for (let k = 0; k < 12; k++) { const a = angle + (k * Math.PI) / 6, cx = wx + Math.cos(a) * (WHEEL_R - 1), cy = WHEEL_Y + Math.sin(a) * (WHEEL_R - 1); g.fillStyle(0x3b3530, 1); g.fillRect(cx - 2.5, cy - 2.5, 5, 5); g.fillStyle(0x6b6258, 1); g.fillRect(cx - 2.5, cy - 2.5, 5, 1); } // knobby treads
    g.fillStyle(0x1a1512, 1); g.fillCircle(wx, WHEEL_Y, WHEEL_R - 5);                    // sidewall
    g.fillStyle(0x56627c, 1); g.fillCircle(wx, WHEEL_Y, 5); g.fillStyle(0x93a8cc, 1); g.fillCircle(wx, WHEEL_Y, 2.4);   // hub
    for (let k = 0; k < 5; k++) { const a = angle + (k * Math.PI * 2) / 5; g.fillStyle(0xe3ecff, 1); g.fillRect(wx + Math.cos(a) * 3.6 - 0.5, WHEEL_Y + Math.sin(a) * 3.6 - 0.5, 1.5, 1.5); }  // turning bolts
  };
  return {
    setPlacement(x, y, f) { px = x; py = y; facing = f; place(); },
    update(nowMs, d) {
      const dt = lastMs < 0 ? 0 : Math.min(0.1, (nowMs - lastMs) / 1000); lastMs = nowMs;
      if (!d.reduced) angle = stepWheel(angle, dt, d.driving);
      const p = truckPose(nowMs, d.driving, d.reduced);
      const key = `${d.driving ? Math.round(angle * 10) : 'p'}|${Math.round(p.shimmer * 24)}|${Math.round(d.lamp * 8)}|${p.puffs.length ? Math.round(nowMs / 60) : 0}`;
      if (key === lastKey) return; lastKey = key;
      dy.clear(); glow.clear();
      for (const wx of WHEEL_X) wheel(dy, wx);
      // roof panel sheen: a bright diagonal band sweeping left to right
      const sx = -3 + p.shimmer * 28; dy.fillStyle(0x8ceaff, 0.55); dy.fillRect(sx, -56, 3, 4); dy.fillStyle(0xffffff, 0.35); dy.fillRect(sx + 1, -56, 1, 4);
      for (const q of p.puffs) { dy.fillStyle(0xb5693f, q.a); dy.fillCircle(q.x, q.y, q.r); dy.fillStyle(0xd9a070, q.a * 0.5); dy.fillCircle(q.x + 1, q.y - 1, q.r * 0.6); }
      // headlights at night: a warm bulb glow and a soft cone on the ground ahead (additive); the roof panel catches a little light by day
      if (d.lamp > 0.02) {
        glow.fillStyle(0xfff3c9, 0.5 * d.lamp); glow.fillCircle(48, -24, 6); glow.fillStyle(0xfff3c9, 0.25 * d.lamp); glow.fillEllipse(68, -8, 56, 16);
        glow.fillStyle(0xfff3c9, 0.12 * d.lamp); glow.fillEllipse(84, -6, 70, 22); glow.fillStyle(0xff5a4a, 0.4 * d.lamp); glow.fillCircle(-49, -22, 4);
      }
    },
  };
}
