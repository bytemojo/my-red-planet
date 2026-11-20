// Camera zoom for the world view (pure, tested). Phones keep the close view. On a desktop-sized window the view is zoomed OUT by 40%
// (zoom x 0.6, kept on 0.25 steps so the pixel art stays crisp) so more of the base and the outside world is visible.
export const DESKTOP_MIN_W = 900, DESKTOP_MIN_H = 600, DESKTOP_ZOOM_FACTOR = 0.6;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const q = (z: number) => Math.round(z * 4) / 4;
export const isDesktopView = (w: number, h: number): boolean => w >= DESKTOP_MIN_W && h >= DESKTOP_MIN_H;
/** The old rule (one 12-tile band fits the short side, 0.25 steps, 1 to 2.5), then 40% further out on desktop (never below 1). */
export function cameraZoom(w: number, h: number): number {
  const base = clamp(q(Math.min(w, h) / (32 * 12)), 1, 2.5);
  return isDesktopView(w, h) ? Math.max(1, q(base * DESKTOP_ZOOM_FACTOR)) : base;
}
