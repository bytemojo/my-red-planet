// Step 13a: the automatic watering pump on the indoor farm's west wall. Two art states (the repair pattern):
// BROKEN = amber blinking light, hanging cable, cracked screen; REPAIRED = steady cyan light, clean screen, flow bar.
// A progress ring above the pump fills while the explorer kneels and works. Original pixel art, metal and plastic only.
import type Phaser from 'phaser';

const T = 32;
export const PUMP = { wallX: 4, y: 5, zone: 'pump', label: 'Water Pump' } as const;
/** Interaction zone in tiles (floor tiles east of the wall unit). */
export const PUMP_ZONE = { x0: 5, y0: 5, x1: 5, y1: 6, label: PUMP.label, inside: true } as const;
/** Where the explorer stands (tile units) and in world pixels. The pump is on the west wall, so the explorer faces left. */
export const PUMP_MARKER: [number, number] = [5.55, 5.65];
export const pumpStand = () => ({ x: PUMP_MARKER[0] * T, y: PUMP_MARKER[1] * T });

export interface PumpArt {
  /** true = broken art, false = repaired art. Cheap to call every frame. */
  setBroken(broken: boolean): void;
  /** 0..1 fills the progress ring above the pump; null hides it. */
  setRing(p: number | null): void;
  /** Step 15b: 'automatic' = cyan light, pipes flow; 'manual' = pump light off, hose coiled on the floor. Cheap to call every frame. */
  setMode(mode: 'automatic' | 'manual'): void;
  /** Animates the flowing pipes; call every frame with the elapsed ms (does nothing in manual mode). */
  tick(dtms: number): void;
}

export function buildPump(scene: Phaser.Scene): PumpArt {
  const px = PUMP.wallX * T + 2, py = PUMP.y * T - 6, depth = (PUMP.y + 2) * T + 1;
  const r = (g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, c: number, a = 1) => { g.fillStyle(c, a); g.fillRect(px + x, py + y, w, h); };
  // shared housing: metal case, bolts, intake pipe to the floor
  const base = scene.add.graphics().setDepth(depth);
  r(base, 0, 0, 28, 44, 0x1b2d4c); r(base, 0, 0, 28, 2, 0x8d99b3); r(base, 0, 42, 28, 2, 0x8d99b3); r(base, 0, 0, 2, 44, 0x8d99b3);
  base.lineStyle(1, 0x39d9ff, 0.55); base.strokeRect(px + 0.5, py + 0.5, 27, 43);
  for (const [bx, by] of [[3, 3], [23, 3], [3, 38], [23, 38]]) r(base, bx, by, 2, 2, 0xc9d6ee);
  r(base, 10, 30, 8, 14, 0x5b6b8c); r(base, 9, 36, 10, 3, 0x8d99b3);            // intake pipe + clamp
  scene.add.text(px + 14, py + 8, 'PUMP', { fontFamily: 'Rajdhani, sans-serif', fontSize: '6px', fontStyle: '700', color: '#8ceaff' }).setOrigin(0.5).setDepth(depth + 1).setResolution(2);
  // BROKEN: dead cracked screen, amber light, cable hanging out of the case
  const bad = scene.add.graphics().setDepth(depth + 1);
  const rb = (x: number, y: number, w: number, h: number, c: number, a = 1) => { bad.fillStyle(c, a); bad.fillRect(px + x, py + y, w, h); };
  rb(4, 13, 20, 12, 0x0a0f1c); rb(5, 14, 18, 1, 0x39475f);
  bad.lineStyle(1, 0xffb340, 0.9); bad.beginPath(); bad.moveTo(px + 9, py + 13); bad.lineTo(px + 13, py + 18); bad.lineTo(px + 11, py + 21); bad.lineTo(px + 17, py + 25); bad.strokePath();
  bad.beginPath(); bad.moveTo(px + 13, py + 18); bad.lineTo(px + 20, py + 16); bad.strokePath();
  rb(12, 27, 5, 1, 0xffb340, 0.8);
  bad.lineStyle(2, 0x4a5876, 1); bad.beginPath(); bad.moveTo(px + 22, py + 36); bad.lineTo(px + 25, py + 42); bad.lineTo(px + 23, py + 48); bad.strokePath(); // hanging cable
  rb(21, 48, 4, 3, 0xffb340);
  const badLight = scene.add.circle(px + 22, py + 6, 2.5, 0xffb340, 1).setDepth(depth + 2);
  scene.tweens.add({ targets: badLight, alpha: 0.15, duration: 520, yoyo: true, repeat: -1 });
  // REPAIRED: clean cyan screen with a flow bar, steady cyan light, cable tucked in
  const ok = scene.add.graphics().setDepth(depth + 1);
  const ro = (x: number, y: number, w: number, h: number, c: number, a = 1) => { ok.fillStyle(c, a); ok.fillRect(px + x, py + y, w, h); };
  ro(4, 13, 20, 12, 0x0a1f33); ro(5, 14, 18, 1, 0x8ceaff, 0.7); ro(6, 18, 16, 3, 0x143a56); ro(6, 18, 11, 3, 0x39d9ff); ro(6, 22, 6, 1, 0x4dffb0);
  ro(22, 36, 3, 6, 0x5b6b8c);
  const okLight = scene.add.circle(px + 22, py + 6, 2.5, 0x39d9ff, 1).setDepth(depth + 2);
  const ring = scene.add.graphics().setDepth(depth + 3);
  // pipes run up and down the wall from the pump; dashes flow along them in automatic mode, dull and still in manual mode
  const pipe = scene.add.graphics().setDepth(9 * T + 2), pipeX = px + 11;
  const pipeSpans: [number, number][] = [[3 * T + 6, py], [py + 44, 8 * T + 10]];
  // hose coiled on the floor beside the pump (manual mode)
  const hose = scene.add.graphics().setDepth(7 * T + 24), hx = 5 * T + 16, hy = 7 * T + 14;
  for (const [rx, ry, c] of [[13, 7, 0x2f8f4a], [9, 5, 0x3fb55e], [5, 3, 0x2f8f4a]] as const) { hose.lineStyle(3, c, 1); hose.strokeEllipse(hx, hy, rx * 2, ry * 2); }
  hose.fillStyle(0xffb340, 1); hose.fillRect(hx + 10, hy + 2, 5, 4);
  let broken: boolean | null = null, mode: 'automatic' | 'manual' = 'automatic', flow = 0, pipeDrawn = '';
  const drawPipes = () => {
    const key = `${mode}|${broken}|${mode === 'automatic' && !broken ? Math.floor(flow / 4) : 0}`; if (key === pipeDrawn) return; pipeDrawn = key;
    pipe.clear(); const live = mode === 'automatic' && !broken;
    for (const [y0, y1] of pipeSpans) {
      pipe.fillStyle(live ? 0x1d4663 : 0x3a475f, 1); pipe.fillRect(pipeX, y0, 6, y1 - y0); pipe.fillStyle(0x8d99b3, 1); pipe.fillRect(pipeX, y0, 1, y1 - y0);
      if (live) for (let y = y0 + (flow % 12) - 12; y < y1; y += 12) { const a = Math.max(y0, y), b = Math.min(y1, y + 5); if (b > a) { pipe.fillStyle(0x8ceaff, 0.95); pipe.fillRect(pipeX + 1, a, 4, b - a); } }
    }
  };
  const apply = (b: boolean) => { bad.setVisible(b); badLight.setVisible(b); ok.setVisible(!b); okLight.setVisible(!b); drawPipes(); };
  const applyMode = (m: 'automatic' | 'manual') => { okLight.setFillStyle(m === 'automatic' ? 0x39d9ff : 0x39475f, 1); hose.setVisible(m === 'manual'); drawPipes(); };
  applyMode('automatic');
  apply(true); broken = true;
  return {
    setBroken: b => { if (b === broken) return; broken = b; apply(b); },
    setMode: m => { if (m === mode) return; mode = m; applyMode(m); },
    tick: dtms => { if (mode !== 'automatic' || broken) return; flow += dtms * 0.03; drawPipes(); },
    setRing: p => {
      ring.clear(); if (p === null) return;
      const cx = px + 14, cy = py - 10, rad = 8, a0 = -Math.PI / 2;
      ring.lineStyle(3, 0x143a56, 0.9); ring.beginPath(); ring.arc(cx, cy, rad, 0, Math.PI * 2); ring.strokePath();
      ring.lineStyle(3, 0x8ceaff, 1); ring.beginPath(); ring.arc(cx, cy, rad, a0, a0 + Math.PI * 2 * Math.max(0.001, Math.min(1, p))); ring.strokePath();
    },
  };
}
