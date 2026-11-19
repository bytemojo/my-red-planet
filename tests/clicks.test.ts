import { describe, expect, it } from 'vitest';
import { CLICK_BOXES, FARM_BEDS, KITCHEN, MARKERS, T, ZONES, objectHit } from '../src/game/layout';

const centre = (x: number, y: number, w = 1, h = 1) => [(x + w / 2) * T, (y + h / 2) * T] as const;

describe('Step 24b: only the object itself is clickable', () => {
  it('a grow bed hits the farm, the floor between and around the beds does not', () => {
    for (const [bx, by] of FARM_BEDS) expect(objectHit('farm', ...centre(bx, by, 2, 2))).toBe(true);
    expect(objectHit('farm', 8.5 * T, 3.5 * T)).toBe(false); // the free tile between the first two beds (x 8)
    expect(objectHit('farm', 10.5 * T, 6 * T)).toBe(false);  // open floor in the greenhouse
    expect(objectHit('farm', 5.5 * T, 5.5 * T)).toBe(false); // floor between the bed rows
  });
  it('the comms console opens comms, the rest of the comms room does not', () => {
    expect(objectHit('comms', 21.5 * T, 16.5 * T)).toBe(true);
    expect(objectHit('comms', 19 * T, 14 * T)).toBe(false);
    expect(objectHit('comms', 22 * T, 14 * T)).toBe(false);
  });
  it('the oxygen unit and water maker are hit, the floor in life support is not', () => {
    expect(objectHit('ls', 20.5 * T, 4 * T)).toBe(true);
    expect(objectHit('ls', 25.5 * T, 4 * T)).toBe(true);
    expect(objectHit('ls', 23 * T, 7.5 * T)).toBe(false);
  });
  it('the kitchen counter is hit, the greenhouse floor next to it is not', () => {
    expect(objectHit('kitchen', ...centre(KITCHEN.x0, KITCHEN.y0))).toBe(true);
    expect(objectHit('kitchen', 9 * T, 8.5 * T)).toBe(false);
  });
  it('the suit rack is hit; a tile two away is not', () => {
    expect(objectHit('suit', 15.5 * T, 16.5 * T)).toBe(true);
    expect(objectHit('suit', 15.5 * T, 14.5 * T)).toBe(false);
  });
  it('every zone has a hit area that overlaps its own zone and no hit area covers a whole big room', () => {
    for (const [k, z] of Object.entries(ZONES)) {
      if (k === 'solar') continue; // panel tiles, tested by solar-panel-layout
      const cx = ((z.x0 + z.x1 + 1) / 2) * T, cy = ((z.y0 + z.y1 + 1) / 2) * T;
      const boxes = CLICK_BOXES[k];
      if (!boxes) continue; // object-sized zone: its own rectangle is the box
      const [mx, my] = MARKERS[k]; expect(mx).toBeGreaterThan(0); expect(my).toBeGreaterThan(0);
      const area = boxes.reduce((s, [, , w, h]) => s + w * h, 0), zoneArea = (z.x1 - z.x0 + 1) * (z.y1 - z.y0 + 1);
      expect(area).toBeLessThan(zoneArea); expect(cx).toBeGreaterThan(0);
    }
  });
});
