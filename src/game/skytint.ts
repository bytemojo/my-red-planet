// Pure sky tint maths for Mars day and night (no Phaser) so it can be unit-tested.
// Mars sunsets look blue near the Sun because fine dust scatters blue light forward, so dusk here is blue, not orange.
// Night is a deep blue-violet. Dusty days are dimmer and orange-brown.
type Key = [hour: number, color: number, alpha: number];
const OUT: Key[] = [
  [0, 0x0a0d2c, 0.62], [5.5, 0x0a0d2c, 0.62], [6.5, 0x5a3050, 0.3], [8, 0x000000, 0], [16.5, 0x000000, 0],
  [18, 0x2c3f9c, 0.24], [19.5, 0x141a4a, 0.48], [21, 0x0a0d2c, 0.62], [24, 0x0a0d2c, 0.62],
];
const mix = (a: number, b: number, t: number) => {
  const c = (s: number) => Math.round(((a >> s) & 255) + ((((b >> s) & 255) - ((a >> s) & 255)) * t));
  return (c(16) << 16) | (c(8) << 8) | c(0);
};
export interface Tint { color: number; alpha: number }
// dust: 0..1 from envForSol (0.55+ is a dust front)
export function skyTint(hour: number, dust: number, indoors: boolean): Tint {
  const h = ((hour % 24) + 24) % 24;
  let i = OUT.findIndex(k => k[0] > h); if (i <= 0) i = 1;
  const [h0, c0, a0] = OUT[i - 1], [h1, c1, a1] = OUT[i], f = (h - h0) / (h1 - h0 || 1);
  let color = a0 === 0 ? c1 : a1 === 0 ? c0 : mix(c0, c1, f), alpha = a0 + (a1 - a0) * f;
  const d = Math.max(0, dust - 0.35) * 0.9; // dust storms: dim, orange-brown daylight
  if (d > 0) { const t = Math.min(1, d / Math.max(alpha + d, 0.001)); color = mix(color, 0x6b3a1a, t); alpha = Math.min(0.7, alpha + d * 0.45); }
  if (indoors) alpha *= 0.4; // habitat lights stay on inside
  return { color, alpha };
}
export const nightness = (hour: number) => Math.min(1, skyTint(hour, 0, false).alpha / 0.62);

