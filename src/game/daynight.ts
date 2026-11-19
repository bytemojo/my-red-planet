// Mars day and night drawn in Phaser. The pure maths is in daylight.ts (Step 26d) on top of skytint.ts, both tested.
// OUTSIDE gets the tint (never darker than NIGHT_FLOOR) and glowing lamps with soft ground pools; INSIDE rooms never change.
import Phaser from 'phaser';
import { daylight, OUTDOOR_LIGHTS, lightAlpha } from './daylight';
import { skyTint, nightness } from './skytint';
import { createGlowTexture } from './sprites';
export { skyTint, nightness };

const T = 32;
export interface DayNight { update(hour: number, dust: number, t: number, extra: { playerOut: boolean; px: number; py: number; roverBay: boolean }): void }
export function buildDayNight(scene: Phaser.Scene, W: number, H: number): DayNight {
  createGlowTexture(scene);
  const out = scene.add.graphics().setDepth(9500);
  const B = { x0: 4 * T, y0: 2 * T - 14, x1: 40 * T, y1: 19 * T }; // the habitat including the east wing: this box is never tinted
  const img = (x: number, y: number, tint: number, scale: number) => scene.add.image(x, y, 'glow').setTint(tint).setScale(scale).setBlendMode(Phaser.BlendModes.ADD).setDepth(9510).setAlpha(0);
  const lights = OUTDOOR_LIGHTS.map(l => ({ l, core: img(l.x, l.y, l.tint, l.core), pool: l.pool ? img(l.x, l.y + 6, l.tint, l.pool) : null }));
  const helmet = img(0, 0, 0xbfe3ff, 1.1);
  let last = '';
  return {
    update(hour, dust, t, extra) {
      const key = `${Math.round(hour * 20)}|${Math.round(dust * 50)}`;
      const d = daylight(hour, dust);
      if (key !== last) {
        last = key;
        out.clear(); out.fillStyle(d.color, d.alpha);
        out.fillRect(0, 0, W * T, B.y0); out.fillRect(0, B.y1, W * T, H * T - B.y1); out.fillRect(0, B.y0, B.x0, B.y1 - B.y0); out.fillRect(B.x1, B.y0, W * T - B.x1, B.y1 - B.y0);
      }
      for (const { l, core, pool } of lights) {
        const on = !l.roverBay || extra.roverBay;
        core.setAlpha(on ? lightAlpha(l, d.lamp, t) : 0);
        pool?.setAlpha(on ? lightAlpha(l, d.lamp, t, 0.3) : 0);
      }
      helmet.setPosition(extra.px, extra.py - 34).setAlpha(extra.playerOut ? d.lamp * 0.28 : 0);
    },
  };
}
