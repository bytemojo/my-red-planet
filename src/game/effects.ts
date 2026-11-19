// Small reusable pixel effects for in-world actions. Each one is fire-and-forget: it creates a few
// shapes, tweens them, and destroys them. They never touch game state, so they are safe to call
// from any animation beat. With prefers-reduced-motion they use fewer, shorter particles.
import Phaser from 'phaser';

const DEPTH = 9000; // above every world object
export const prefersReducedMotion = (): boolean => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const count = (n: number) => (prefersReducedMotion() ? Math.max(1, Math.ceil(n / 3)) : n);
const dur = (ms: number) => (prefersReducedMotion() ? Math.round(ms * 0.4) : ms);
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const fade = (scene: Phaser.Scene, o: Phaser.GameObjects.GameObject, props: Record<string, unknown>, ms: number, delay = 0) =>
  scene.tweens.add({ targets: o, ...props, duration: dur(ms), delay, ease: 'Cubic.easeOut', onComplete: () => o.destroy() });

/** A puff of Martian dust: tan circles that drift up and spread. */
export function dustPuff(scene: Phaser.Scene, x: number, y: number) {
  for (let i = 0; i < count(6); i++) {
    const c = scene.add.circle(x + rnd(-6, 6), y + rnd(-2, 2), rnd(2, 4), 0xe6a67a, 0.65).setDepth(DEPTH);
    fade(scene, c, { y: c.y - rnd(8, 16), x: c.x + rnd(-10, 10), alpha: 0, scale: 2.4 }, 650);
  }
}
/** Water drops falling from (x, y). */
export function waterDroplets(scene: Phaser.Scene, x: number, y: number) {
  for (let i = 0; i < count(8); i++) {
    const d = scene.add.rectangle(x + rnd(-6, 6), y + rnd(-4, 0), 2, 4, i % 3 ? 0x5ad1ff : 0xcff3ff, 1).setDepth(DEPTH);
    fade(scene, d, { y: d.y + rnd(14, 26), alpha: 0.1 }, 520, i * 40);
  }
}
/** A cyan/white sparkle burst. Used for repairs and ice shards (never fire or heat). */
export function sparkle(scene: Phaser.Scene, x: number, y: number, color = 0x8ff0ff) {
  for (let i = 0; i < count(7); i++) {
    const a = rnd(0, Math.PI * 2), r = rnd(8, 18);
    const s = scene.add.rectangle(x, y, 3, 3, i % 2 ? color : 0xffffff, 1).setDepth(DEPTH).setAngle(45);
    fade(scene, s, { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, alpha: 0, scale: 0.4 }, 520);
  }
}
/** Steam wisps rising from hot food (a microwave bell, a pouch of soup). */
export function steam(scene: Phaser.Scene, x: number, y: number) {
  for (let i = 0; i < count(5); i++) {
    const w = scene.add.circle(x + rnd(-8, 8), y, rnd(3, 5), 0xe9f6ff, 0.5).setDepth(DEPTH);
    fade(scene, w, { y: y - rnd(18, 34), x: w.x + rnd(-6, 6), alpha: 0, scale: 1.8 }, 900, i * 90);
  }
}
/** A cyan hologram flicker over a rectangle (screens and displays switching on). */
export function holoFlicker(scene: Phaser.Scene, x: number, y: number, w: number, h: number) {
  const r = scene.add.rectangle(x, y, w, h, 0x39d9ff, 0.5).setDepth(DEPTH);
  const flickers = prefersReducedMotion() ? 1 : 4;
  scene.tweens.add({ targets: r, alpha: { from: 0.7, to: 0.1 }, duration: 70, yoyo: true, repeat: flickers, onComplete: () => fade(scene, r, { alpha: 0 }, 250) });
}
/** An amber warning light that blinks `times` times (a broken machine, an alarm). */
export function amberBlink(scene: Phaser.Scene, x: number, y: number, radius = 10, times = 3) {
  const c = scene.add.circle(x, y, radius, 0xffb340, 0.7).setDepth(DEPTH);
  scene.tweens.add({ targets: c, alpha: { from: 0.8, to: 0.05 }, duration: dur(180), yoyo: true, repeat: prefersReducedMotion() ? 0 : times - 1, onComplete: () => c.destroy() });
}
