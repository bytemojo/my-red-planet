import { describe, expect, it } from 'vitest';
import { cameraZoom, isDesktopView } from '../src/game/camera';
describe('camera zoom', () => {
  it('phones keep the old close view', () => { expect(cameraZoom(390, 780)).toBe(1); expect(cameraZoom(412, 915)).toBe(1); expect(cameraZoom(780, 390)).toBe(1); });
  it('desktop is zoomed out by 50%: 2 -> 1 at 1280x800, 2.5 -> 1.25 at 1920x1080', () => {
    expect(isDesktopView(1280, 800)).toBe(true); expect(cameraZoom(1280, 800)).toBe(1); expect(cameraZoom(1920, 1080)).toBe(1.25);
  });
  it('always on a 0.25 step and never below 1', () => {
    for (const [w, h] of [[900, 600], [1024, 768], [1366, 768], [1440, 900], [2560, 1440], [3840, 2160]]) { const z = cameraZoom(w, h); expect(z).toBeGreaterThanOrEqual(1); expect(z * 4).toBe(Math.round(z * 4)); }
  });
});
