// Step 26d: pure outdoor light for the game hour (no Phaser). Built on skyTint (Mars: blue dusk, deep blue-violet night, dusty days dim and brown).
// Rules: night is noticeably dark but never below NIGHT_FLOOR brightness; INSIDE rooms never change; lamps glow outside only, stronger the darker it is.
import { skyTint } from './skytint';
import { SOLAR_PANEL_ORIGINS } from './solar-panel-layout';

const T = 32;
export const NIGHT_FLOOR = 0.45;          // brightness never drops below this (1 = full daylight)
export const MAX_DARK = 1 - NIGHT_FLOOR;  // the most the outdoor overlay may cover

export interface Daylight { color: number; alpha: number; brightness: number; lamp: number }
/** Outdoor tint overlay for a game hour. lamp 0..1 = how strongly outdoor lights glow (from the hour only, a dusty noon does not light the lamps). */
export function daylight(hour: number, dust = 0): Daylight {
  const t = skyTint(hour, dust, false);
  const alpha = Math.min(t.alpha, MAX_DARK);
  return { color: t.color, alpha, brightness: 1 - alpha, lamp: Math.min(1, skyTint(hour, 0, false).alpha / MAX_DARK) };
}
/** Indoors the light never changes with the hour. */
export const INDOOR_TINT_ALPHA = 0;

export type LampKind = 'solar' | 'dish' | 'corner' | 'post' | 'airlock';
export interface OutdoorLight { id: string; kind: LampKind; x: number; y: number; tint: number; core: number; pool: number; blink?: number; roverBay?: boolean }
/** Every outdoor light as data (pixel position, tint, glow size, soft ground pool size, optional blink period in ms). */
export const OUTDOOR_LIGHTS: readonly OutdoorLight[] = [
  ...SOLAR_PANEL_ORIGINS.map(([tx, ty], i): OutdoorLight => ({ id: `solar_${i}`, kind: 'solar', x: (tx + 1.5) * T, y: (ty + 1) * T, tint: 0x8ceaff, core: 0.55, pool: 1.5 })),
  { id: 'dish_beacon', kind: 'dish', x: 41 * T, y: 7.4 * T, tint: 0xff5a6e, core: 0.5, pool: 0, blink: 520 },
  { id: 'dish_pool', kind: 'dish', x: 41 * T, y: 9.6 * T, tint: 0x9fd8ff, core: 0.6, pool: 2.2 },
  { id: 'corner_nw', kind: 'corner', x: 3.6 * T, y: 1.7 * T, tint: 0xffd79a, core: 0.5, pool: 2.0 },
  { id: 'corner_sw', kind: 'corner', x: 3.6 * T, y: 19.6 * T, tint: 0xffd79a, core: 0.5, pool: 2.0 },
  { id: 'corner_se', kind: 'corner', x: 39.4 * T, y: 19.6 * T, tint: 0xffd79a, core: 0.5, pool: 2.0 },
  { id: 'airlock', kind: 'airlock', x: 16 * T, y: 19.2 * T, tint: 0xffc46b, core: 0.7, pool: 2.4 },
  { id: 'post_w', kind: 'post', x: 9.2 * T, y: 21.2 * T, tint: 0xffd79a, core: 0.6, pool: 2.2 },
  { id: 'post_e', kind: 'post', x: 29.8 * T, y: 21.2 * T, tint: 0xffd79a, core: 0.6, pool: 2.2 },
  { id: 'post_s', kind: 'post', x: 19.5 * T, y: 28 * T, tint: 0xffd79a, core: 0.6, pool: 2.2 },
  { id: 'rover_bay', kind: 'post', x: 34.5 * T, y: 20.6 * T, tint: 0xffd79a, core: 0.6, pool: 2.2, roverBay: true },
];
/** Glow alpha of one light (0 by day). Blinking lights dip to 25%. */
export const lightAlpha = (l: OutdoorLight, lamp: number, tMs: number, kindScale = 0.55): number => lamp * kindScale * (l.blink ? (Math.sin(tMs / l.blink) > 0 ? 1 : 0.25) : 1);
