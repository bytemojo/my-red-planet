// Mars day and night drawn in Phaser. The tint maths lives in skytint.ts (pure, tested).
import Phaser from 'phaser';
import { nightness, skyTint } from './skytint';
import { createGlowTexture } from './sprites';
export { skyTint, nightness };

const T = 32;
export interface DayNight { update(hour: number, dust: number, t: number, extra: { playerOut: boolean; px: number; py: number; roverBay: boolean }): void }
export function buildDayNight(scene: Phaser.Scene, W: number, H: number): DayNight {
  createGlowTexture(scene);
  const out = scene.add.graphics().setDepth(9500), inn = scene.add.graphics().setDepth(9500);
  const B = { x0: 4 * T, y0: 2 * T - 14, x1: 30 * T, y1: 19 * T }; // the habitat, including its wall tops
  const lights: { img: Phaser.GameObjects.Image; inside: boolean; blink?: number; roverBay?: boolean }[] = [];
  const light = (x: number, y: number, tint: number, scale: number, inside = false, blink?: number, roverBay = false) =>
    lights.push({ img: scene.add.image(x, y, 'glow').setTint(tint).setScale(scale).setBlendMode(Phaser.BlendModes.ADD).setDepth(9510).setAlpha(0), inside, blink, roverBay });
  // outdoor lights next to equipment: airlock, comms dish, solar farm, rover bay
  light(16 * T, 19.2 * T, 0xffc46b, 1.6); light(32 * T, 7.4 * T, 0xff5a6e, 0.5, false, 520); light(32 * T, 9.6 * T, 0x9fd8ff, 1.1);
  light(9.2 * T, 21.2 * T, 0xffd79a, 1.3); light(29.8 * T, 21.2 * T, 0xffd79a, 1.3); light(19.5 * T, 28 * T, 0xffd79a, 1.2);
  light(34.5 * T, 20.6 * T, 0xffd79a, 1.3, false, undefined, true);
  // inside: machines and screens keep glowing at night
  light(9.5 * T, 5 * T, 0xff4fd8, 2.2, true); light(20.5 * T, 4 * T, 0x46d8ff, 1.3, true); light(25.5 * T, 4 * T, 0x4c8eff, 1.3, true);
  light(23 * T, 15.2 * T, 0x39d9ff, 1.8, true); light(16 * T, 2.6 * T, 0x39d9ff, 1.1, true);
  const helmet = scene.add.image(0, 0, 'glow').setTint(0xbfe3ff).setScale(1.1).setBlendMode(Phaser.BlendModes.ADD).setDepth(9510).setAlpha(0);
  let last = '';
  return {
    update(hour, dust, t, extra) {
      const key = `${Math.round(hour * 20)}|${Math.round(dust * 50)}`;
      if (key !== last) {
        last = key;
        const o = skyTint(hour, dust, false), i = skyTint(hour, dust, true);
        out.clear(); out.fillStyle(o.color, o.alpha);
        out.fillRect(0, 0, W * T, B.y0); out.fillRect(0, B.y1, W * T, H * T - B.y1); out.fillRect(0, B.y0, B.x0, B.y1 - B.y0); out.fillRect(B.x1, B.y0, W * T - B.x1, B.y1 - B.y0);
        inn.clear(); inn.fillStyle(i.color, i.alpha); inn.fillRect(B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0);
      }
      const n = nightness(hour);
      for (const l of lights) {
        const on = !l.roverBay || extra.roverBay;
        const b = l.blink ? (Math.sin(t / l.blink) > 0 ? 1 : 0.25) : 1;
        l.img.setAlpha(on ? n * (l.inside ? 0.3 : 0.55) * b : 0);
      }
      helmet.setPosition(extra.px, extra.py - 34).setAlpha(extra.playerOut ? n * 0.28 : 0);
    },
  };
}
