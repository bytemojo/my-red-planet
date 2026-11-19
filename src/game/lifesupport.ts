// Step 26b: the oxygen unit and the water maker (life support room, tiles x19-21 and x24-26, y3-4).
// Original pixel art, metal/glass/plastic only. Same footprints and interaction zones as before (layout.ts / glow.ts / icesheet.ts).
// Two states each: RUNNING (cyan glow, bubbles, spinning fan, steady light) and OFF/BROKEN (dim, amber blink).
// The water-maker intake hopper is drawn by icesheet.ts on top of the recess left at its lower-left corner.
import type Phaser from 'phaser';
import { tankFill } from '../core/lifesupport';

const T = 32;
const TOP = 3 * T - 26;            // top of both machines (matches the old 26 px body height)
const O2_X = 19 * T, WM_X = 24 * T; // left edges, 96 px wide each
const W = 96;
const DEPTH = 5 * T;               // same depth the old bodies used (bottom edge of the machine)

export interface LifeSupportArt {
  /** Cheap to call every frame. o2On / waterOn false = OFF art; waterLevel 0..100 sets the tank; o2Level 0..100 moves the gauge. */
  update(o2On: boolean, waterOn: boolean, o2Level: number, waterLevel: number, nowMs: number, reduced?: boolean): void;
}

const frame = (g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill: number, line = 0x24365a) => {
  g.fillStyle(fill, 1); g.fillRect(x, y, w, h); g.lineStyle(1, line, 1); g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
};
const bolts = (g: Phaser.GameObjects.Graphics, pts: Array<[number, number]>) => { for (const [x, y] of pts) { g.fillStyle(0x24365a, 1); g.fillRect(x, y, 3, 3); g.fillStyle(0xe3ecff, 0.8); g.fillRect(x, y, 1, 1); } };
const pipe = (g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number) => {
  g.fillStyle(0x6f7f9c, 1); g.fillRect(x, y, w, h);
  g.fillStyle(0xd7e2f5, 0.9); if (w >= h) g.fillRect(x, y, w, 1); else g.fillRect(x, y, 1, h);
  g.fillStyle(0x34425e, 1); if (w >= h) g.fillRect(x, y + h - 1, w, 1); else g.fillRect(x + w - 1, y, 1, h);
};
const ring = (g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number) => { g.fillStyle(0x24365a, 1); g.fillRect(x, y, w, h); g.fillStyle(0x9fb3d6, 1); g.fillRect(x, y, w, 1); };

export function buildLifeSupport(scene: Phaser.Scene): LifeSupportArt {
  // ---------------- static bodies ----------------
  const st = scene.add.graphics().setDepth(DEPTH);

  // OXYGEN UNIT: cabinet, two tall O2 tanks with bands, valves, pipe run, gauge housing, screen housing, vented base
  {
    const X = O2_X, Y = TOP;
    frame(st, X, Y, W, 64, 0xaebbd3, 0x3d4f75);                  // upper back panel
    st.fillStyle(0xc9d5ea, 1); st.fillRect(X + 2, Y + 2, W - 4, 2); // top highlight
    frame(st, X, Y + 64, W, 26, 0x3d4f75, 0x24365a);              // lower cabinet
    for (let i = 0; i < 4; i++) { st.fillStyle(0x0c1830, 1); st.fillRect(X + 8 + i * 8, Y + 72, 5, 12); st.fillStyle(0x5f7fb0, 0.6); st.fillRect(X + 8 + i * 8, Y + 72, 5, 1); } // vents
    st.fillStyle(0x0c1830, 1); st.fillRect(X + 46, Y + 72, 40, 12);  // name plate recess
    // tanks
    for (const tx of [X + 6, X + 26]) {
      st.fillStyle(0x24365a, 1); st.fillRect(tx - 1, Y + 14, 20, 48);           // outline
      st.fillStyle(0x4f7aa0, 1); st.fillRect(tx, Y + 14, 18, 46);               // body
      st.fillStyle(0x7fb0d4, 1); st.fillRect(tx + 2, Y + 14, 4, 46);            // light side
      st.fillStyle(0x2c4a6c, 1); st.fillRect(tx + 13, Y + 14, 5, 46);           // shadow side
      st.fillStyle(0x4f7aa0, 1); st.fillRect(tx + 2, Y + 11, 14, 3); st.fillRect(tx + 4, Y + 9, 10, 2); // domed shoulder
      ring(st, tx, Y + 24, 18, 2); ring(st, tx, Y + 50, 18, 2);                 // bands
      st.fillStyle(0x8d99b3, 1); st.fillRect(tx + 6, Y + 4, 6, 5);              // valve neck
      st.fillStyle(0xffb340, 1); st.fillRect(tx + 4, Y + 2, 10, 2);             // valve wheel
      st.fillStyle(0xe3ecff, 0.8); st.fillRect(tx + 3, Y + 30, 1, 16);          // glint
      st.fillStyle(0xe3ecff, 1); st.fillRect(tx + 6, Y + 36, 6, 1); st.fillRect(tx + 6, Y + 40, 6, 1); st.fillRect(tx + 6, Y + 36, 1, 5); st.fillRect(tx + 11, Y + 36, 1, 5); // tiny "O" marking
    }
    // pipe run from the valves to the control side, with elbow and joint rings
    pipe(st, X + 12, Y + 6, 54, 3); pipe(st, X + 64, Y + 6, 3, 22); pipe(st, X + 32, Y + 6, 3, 4);
    for (const jx of [X + 22, X + 44, X + 64]) ring(st, jx, Y + 5, 2, 5);
    // gauge housing
    st.fillStyle(0x24365a, 1); st.fillCircle(X + 78, Y + 22, 12); st.fillStyle(0x93a8cc, 1); st.fillCircle(X + 78, Y + 22, 10);
    st.fillStyle(0x0c1830, 1); st.fillCircle(X + 78, Y + 22, 8);
    for (let i = 0; i <= 6; i++) { const a = Math.PI * (1.15 + i * 0.12 * 1.2); st.fillStyle(0x8ceaff, 1); st.fillRect(Math.round(X + 78 + Math.cos(a) * 6.5), Math.round(Y + 22 + Math.sin(a) * 6.5), 1, 1); }
    // screen housing
    frame(st, X + 48, Y + 38, 40, 22, 0x24365a, 0x0c1830);
    st.fillStyle(0x0a1a33, 1); st.fillRect(X + 50, Y + 40, 36, 18);
    bolts(st, [[X + 3, Y + 4], [X + 90, Y + 4], [X + 3, Y + 58], [X + 90, Y + 58], [X + 3, Y + 66], [X + 90, Y + 66]]);
    st.fillStyle(0x17243d, 1); st.fillRect(X + 4, Y + 88, 10, 2); st.fillRect(X + 82, Y + 88, 10, 2); // feet
  }

  // WATER MAKER: clear tank with level marks, filter column, pump with fan, pipes, intake recess, vented base
  {
    const X = WM_X, Y = TOP;
    frame(st, X, Y, W, 64, 0xaebbd3, 0x3d4f75);
    st.fillStyle(0xc9d5ea, 1); st.fillRect(X + 2, Y + 2, W - 4, 2);
    frame(st, X, Y + 64, W, 26, 0x3d4f75, 0x24365a);
    // intake recess (icesheet.ts draws the hopper at x+4,y+60 .. 24x28 on top of this)
    st.fillStyle(0x0c1830, 1); st.fillRect(X + 2, Y + 58, 30, 32); st.lineStyle(1, 0x5f7fb0, 1); st.strokeRect(X + 2.5, Y + 58.5, 29, 31);
    for (let i = 0; i < 3; i++) { st.fillStyle(0x0c1830, 1); st.fillRect(X + 38 + i * 8, Y + 74, 5, 11); st.fillStyle(0x5f7fb0, 0.6); st.fillRect(X + 38 + i * 8, Y + 74, 5, 1); } // vents
    st.fillStyle(0x0c1830, 1); st.fillRect(X + 64, Y + 70, 28, 14); // level read-out recess
    // tank frame (glass + water drawn dynamically inside)
    st.fillStyle(0x24365a, 1); st.fillRect(X + 4, Y + 6, 40, 50);
    st.fillStyle(0x10284a, 1); st.fillRect(X + 6, Y + 10, 34, 42);
    st.fillStyle(0x8d99b3, 1); st.fillRect(X + 4, Y + 6, 40, 4); st.fillRect(X + 4, Y + 52, 40, 4); // steel caps
    for (let i = 0; i < 5; i++) { st.fillStyle(0xbfe8ff, i % 2 ? 0.5 : 0.9); st.fillRect(X + 40, Y + 12 + i * 8, i % 2 ? 3 : 4, 1); } // level ticks
    // filter column
    st.fillStyle(0x24365a, 1); st.fillRect(X + 50, Y + 10, 14, 44);
    for (let i = 0; i < 5; i++) { st.fillStyle(i % 2 ? 0x8ccaff : 0x2d7ed8, 1); st.fillRect(X + 52, Y + 12 + i * 8, 10, 7); }
    st.fillStyle(0xe3ecff, 0.7); st.fillRect(X + 53, Y + 12, 1, 38);
    ring(st, X + 49, Y + 8, 16, 3); ring(st, X + 49, Y + 52, 16, 3);
    // pump housing
    st.fillStyle(0x24365a, 1); st.fillRect(X + 70, Y + 24, 22, 22); st.fillStyle(0x6f7f9c, 1); st.fillRect(X + 72, Y + 26, 18, 18); st.fillStyle(0x0c1830, 1); st.fillCircle(X + 81, Y + 35, 7);
    st.fillStyle(0xd7e2f5, 0.9); st.fillRect(X + 72, Y + 26, 18, 1);
    // pipes: tank -> filter -> pump, with a drain run along the bottom
    pipe(st, X + 44, Y + 18, 6, 3); pipe(st, X + 44, Y + 46, 6, 3); pipe(st, X + 64, Y + 20, 22, 3); pipe(st, X + 83, Y + 20, 3, 6); pipe(st, X + 64, Y + 46, 20, 3); pipe(st, X + 83, Y + 44, 3, 5);
    ring(st, X + 66, Y + 19, 2, 5); ring(st, X + 66, Y + 45, 2, 5);
    bolts(st, [[X + 3, Y + 58 - 52], [X + 90, Y + 4], [X + 90, Y + 58], [X + 34, Y + 66], [X + 90, Y + 66]]);
    st.fillStyle(0x17243d, 1); st.fillRect(X + 4, Y + 88, 10, 2); st.fillRect(X + 82, Y + 88, 10, 2);
  }

  // ---------------- dynamic layers ----------------
  const dyn = scene.add.graphics().setDepth(DEPTH + 0.5);
  const glow = scene.add.graphics().setDepth(DEPTH + 0.6).setBlendMode(1 /* ADD */);

  return {
    update(o2On, waterOn, o2Level, waterLevel, now, reduced = false) {
      dyn.clear(); glow.clear();
      const blink = reduced ? true : Math.floor(now / 450) % 2 === 0;

      // ===== OXYGEN UNIT =====
      {
        const X = O2_X, Y = TOP;
        // gas inside the tanks: cyan-teal when running, grey when off; bubbles rise only while running
        for (const tx of [X + 6, X + 26]) {
          dyn.fillStyle(o2On ? 0x5ee7ce : 0x3a4a60, o2On ? 0.22 : 0.3); dyn.fillRect(tx + 2, Y + 28, 14, 20);
          if (o2On && !reduced) for (let i = 0; i < 3; i++) { const a = ((now / 1100 + i / 3 + tx / 97) % 1); dyn.fillStyle(0xd8fff6, 1 - a); dyn.fillRect(tx + 4 + ((i * 5 + Math.floor(a * 3)) % 10), Math.round(Y + 48 - a * 20), 2, 2); }
        }
        // gauge needle: sweeps with the O2 level (0 = left, 100 = right); parked at the left when OFF
        const lv = o2On ? Math.max(0, Math.min(100, o2Level)) / 100 : 0;
        const a = Math.PI * (1.1 + lv * 0.8);
        dyn.lineStyle(1, o2On ? 0x8ceaff : 0xffb340, 1); dyn.beginPath(); dyn.moveTo(X + 78, Y + 22); dyn.lineTo(X + 78 + Math.cos(a) * 7, Y + 22 + Math.sin(a) * 7); dyn.strokePath();
        dyn.fillStyle(0xe3ecff, 1); dyn.fillRect(X + 77, Y + 21, 2, 2);
        // cyan screen: bar trace while running; amber "!" blink while off
        if (o2On) {
          for (let i = 0; i < 9; i++) { const h = 3 + Math.round((reduced ? 0.5 : 0.5 + 0.5 * Math.sin(now / 260 + i * 0.9)) * 9); dyn.fillStyle(0x39d9ff, 0.95); dyn.fillRect(X + 52 + i * 4, Y + 57 - h, 3, h); }
          dyn.fillStyle(0x8ceaff, 0.9); dyn.fillRect(X + 52, Y + 41, 14, 1);
        } else {
          dyn.fillStyle(0xffb340, blink ? 1 : 0.25); dyn.fillRect(X + 66, Y + 42, 4, 9); dyn.fillRect(X + 66, Y + 53, 4, 3);
        }
        // status light + name plate light
        dyn.fillStyle(o2On ? 0x4dffb0 : 0xffb340, o2On || blink ? 1 : 0.25); dyn.fillRect(X + 80, Y + 4, 6, 4);
        dyn.fillStyle(o2On ? 0x39d9ff : 0xffb340, o2On ? 0.9 : (blink ? 0.9 : 0.2)); dyn.fillRect(X + 48, Y + 74, 36, 2);
        if (o2On) { glow.fillStyle(0x39d9ff, 0.10); glow.fillRect(X + 48, Y + 38, 40, 22); glow.fillStyle(0x5ee7ce, 0.06); glow.fillRect(X + 4, Y + 12, 38, 50); }
        else if (blink) { glow.fillStyle(0xffb340, 0.12); glow.fillRect(X + 48, Y + 38, 40, 22); }
      }

      // ===== WATER MAKER =====
      {
        const X = WM_X, Y = TOP;
        // water in the tank: height follows the water meter; wave on the surface; dimmer when OFF
        const fill = tankFill(waterLevel);               // 0..1
        const inner = 42, wh = Math.round(inner * fill), top = Y + 10 + inner - wh;
        if (wh > 0) {
          dyn.fillStyle(waterOn ? 0x2d7ed8 : 0x2a4a78, 1); dyn.fillRect(X + 6, top, 34, wh);
          dyn.fillStyle(waterOn ? 0x4c9cf0 : 0x35598a, 1); dyn.fillRect(X + 6, top, 34, Math.min(wh, 6) > 3 ? 3 : wh);
          const wave = reduced || !waterOn ? 0 : Math.sin(now / 380);
          dyn.fillStyle(0x8ccaff, 0.95); for (let i = 0; i < 34; i += 2) dyn.fillRect(X + 6 + i, top + Math.round(Math.sin(i * 0.5 + now / 380) * (waterOn && !reduced ? 1 : 0)), 2, 1);
          if (waterOn && !reduced) for (let i = 0; i < 3; i++) { const a = ((now / 1300 + i / 3) % 1); const by = Y + 10 + inner - a * wh; if (by > top) { dyn.fillStyle(0xd8f0ff, 1 - a); dyn.fillRect(X + 12 + i * 10 + Math.round(wave * 2), Math.round(by), 2, 2); } }
        }
        dyn.fillStyle(0xe3ecff, 0.55); dyn.fillRect(X + 8, Y + 12, 2, 38); dyn.fillStyle(0xe3ecff, 0.25); dyn.fillRect(X + 12, Y + 12, 1, 20); // glass glints
        // filter column: flowing light bands while running
        if (!waterOn) { dyn.fillStyle(0x0a1a33, 0.5); dyn.fillRect(X + 52, Y + 12, 10, 38); } // filter goes dark when OFF
        if (waterOn && !reduced) { const p = Math.floor((now / 220) % 5); dyn.fillStyle(0xffffff, 0.35); dyn.fillRect(X + 52, Y + 12 + p * 8, 10, 7); }
        // pump fan: four spokes that turn while running, still while OFF
        const ang = waterOn && !reduced ? now / 140 : 0.4;
        dyn.lineStyle(2, waterOn ? 0x8ceaff : 0x5f7fb0, 1);
        for (let i = 0; i < 4; i++) { const b = ang + i * Math.PI / 2; dyn.beginPath(); dyn.moveTo(X + 81, Y + 35); dyn.lineTo(X + 81 + Math.cos(b) * 6, Y + 35 + Math.sin(b) * 6); dyn.strokePath(); }
        dyn.fillStyle(0xe3ecff, 1); dyn.fillRect(X + 80, Y + 34, 2, 2);
        // level read-out strip (0..100 bar) and status light
        dyn.fillStyle(0x0a1a33, 1); dyn.fillRect(X + 66, Y + 72, 24, 4);
        dyn.fillStyle(waterOn ? 0x39d9ff : 0xffb340, 1); dyn.fillRect(X + 66, Y + 72, Math.round(24 * fill), 4);
        dyn.fillStyle(0x8ceaff, 0.8); dyn.fillRect(X + 66, Y + 78, 8, 1);
        dyn.fillStyle(waterOn ? 0x4dffb0 : 0xffb340, waterOn || blink ? 1 : 0.25); dyn.fillRect(X + 84, Y + 58, 6, 4);
        if (waterOn) { glow.fillStyle(0x39d9ff, 0.08); glow.fillRect(X + 6, Y + 10, 34, 42); glow.fillStyle(0x39d9ff, 0.07); glow.fillRect(X + 66, Y + 70, 26, 10); }
        else if (blink) { glow.fillStyle(0xffb340, 0.12); glow.fillRect(X + 66, Y + 70, 26, 10); glow.fillStyle(0xffb340, 0.08); glow.fillRect(X + 70, Y + 24, 22, 22); }
      }
    },
  };
}
