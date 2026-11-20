import { describe, expect, it } from 'vitest';
import { ZOOM, canZoomIn, canZoomOut, clampView, clampZoom, coverSize, newView, panBy, panLimit, stepSample, zoomAt, zoomLabel } from '../src/core/microscope';

const D = 400, size = coverSize(1600, 1200, D); // a 4:3 picture in a 400 px circle

describe('Step 29b: microscope viewer maths', () => {
  it('cover size fills the circle on the short side and keeps the shape', () => {
    expect(size.h).toBeCloseTo(D, 6); expect(size.w).toBeCloseTo(D * 4 / 3, 6);
    expect(coverSize(0, 0, D)).toEqual({ w: D, h: D }); expect(coverSize(800, 800, D)).toEqual({ w: D, h: D });
  });
  it('zoom is clamped between 1 and 8, bad numbers fall back to 1', () => {
    expect(clampZoom(0.2)).toBe(ZOOM.MIN); expect(clampZoom(99)).toBe(ZOOM.MAX); expect(clampZoom(NaN)).toBe(1);
    expect(canZoomIn(8)).toBe(false); expect(canZoomIn(7)).toBe(true); expect(canZoomOut(1)).toBe(false); expect(canZoomOut(1.5)).toBe(true);
  });
  it('at zoom 1 a square picture cannot move; a wide one only sideways', () => {
    expect(panLimit({ w: D, h: D }, 1, D)).toEqual({ x: 0, y: 0 });
    expect(panLimit(size, 1, D).y).toBe(0); expect(panLimit(size, 1, D).x).toBeCloseTo((size.w - D) / 2, 6);
    expect(panBy(newView(), 50, 50, { w: D, h: D }, D)).toEqual({ zoom: 1, x: 0, y: 0 });
  });
  it('zooming about a point keeps the picture point under it fixed', () => {
    const a = zoomAt(newView(), 2, 60, -40, size, D), under = (v: typeof a, ax: number, ay: number) => [(ax - v.x) / v.zoom, (ay - v.y) / v.zoom];
    expect(a.zoom).toBe(2); const [u1, u2] = under(newView(), 60, -40), [v1, v2] = under(a, 60, -40);
    expect(v1).toBeCloseTo(u1, 6); expect(v2).toBeCloseTo(u2, 6);
    const b = zoomAt(a, ZOOM.STEP, 10, 20, size, D); const [w1, w2] = under(a, 10, 20), [x1, x2] = under(b, 10, 20);
    if (Math.abs(b.x) < panLimit(size, b.zoom, D).x - 1e-6 && Math.abs(b.y) < panLimit(size, b.zoom, D).y - 1e-6) { expect(x1).toBeCloseTo(w1, 6); expect(x2).toBeCloseTo(w2, 6); }
  });
  it('the picture can never be dragged off the circle', () => {
    let v = zoomAt(newView(), 4, 0, 0, size, D); v = panBy(v, 99999, -99999, size, D);
    const lim = panLimit(size, 4, D); expect(v.x).toBeCloseTo(lim.x, 6); expect(v.y).toBeCloseTo(-lim.y, 6);
    expect(clampView({ zoom: 3, x: 1e9, y: 1e9 }, size, D).x).toBeLessThanOrEqual(panLimit(size, 3, D).x);
  });
  it('zooming all the way out re-centres the picture', () => {
    let v = zoomAt(newView(), 6, 0, 0, size, D); v = panBy(v, 200, 100, size, D);
    v = zoomAt(v, 1 / 100, 0, 0, size, D); expect(v.zoom).toBe(1); expect(v.y).toBe(0); expect(Math.abs(v.x)).toBeLessThanOrEqual(panLimit(size, 1, D).x);
  });
  it('sample stepping wraps in both directions and survives an empty list', () => {
    expect(stepSample(0, 10, -1)).toBe(9); expect(stepSample(9, 10, 1)).toBe(0); expect(stepSample(3, 10, 2)).toBe(5); expect(stepSample(0, 0, 1)).toBe(0);
  });
  it('zoom label is short and never above the maximum', () => {
    expect(zoomLabel(1)).toBe('1×'); expect(zoomLabel(2.25)).toBe('2.3×'); expect(zoomLabel(50)).toBe('8×');
  });
});

import { CLICK_BOXES, MARKERS, T, ZONES, objectHit } from '../src/game/layout';
describe('Step 29b: the microscope in the lab', () => {
  it('is its own zone, listed before the bigger lab zone so it wins on its tile', () => {
    const keys = Object.keys(ZONES); expect(keys.indexOf('microscope')).toBeGreaterThanOrEqual(0); expect(keys.indexOf('microscope')).toBeLessThan(keys.indexOf('lab'));
    expect(ZONES.microscope.inside).toBe(true); expect(Object.keys(MARKERS)).toContain('microscope');
  });
  it('the stand point is inside its own zone', () => {
    const [mx, my] = MARKERS.microscope, z = ZONES.microscope; expect(mx >= z.x0 && mx < z.x1 + 1 && my >= z.y0 && my < z.y1 + 1).toBe(true);
  });
  it('only the microscope itself is clickable, not the laptop, the doorway or the bench far end', () => {
    expect(CLICK_BOXES.microscope.length).toBe(1);
    expect(objectHit('microscope', 31.5 * T, 12.9 * T)).toBe(true);   // the microscope
    expect(objectHit('microscope', 30.3 * T, 12.9 * T)).toBe(false);  // the laptop
    expect(objectHit('microscope', 33.5 * T, 12.9 * T)).toBe(false);  // the glovebox
    expect(objectHit('microscope', 31.5 * T, 16 * T)).toBe(false);    // open floor in the lab
  });
});
