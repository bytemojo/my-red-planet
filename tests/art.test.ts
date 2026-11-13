import { describe, expect, it } from 'vitest';
import { AH, AW, ICONS, bubble, character, icon, type CharSpec, type Dir, type Pose } from '../src/game/pixelart';
import { skyTint, nightness } from '../src/game/skytint';

const look: CharSpec = { skin: 0xf1c39d, hair: 0x3a241d, hairStyle: 'short', top: 0xe8823a, bottom: 0xcf6a2c, shoes: 0x3b3f55, accent: 0x39d9ff };
const count = (p: { px: Int32Array }, c: number) => p.px.filter(v => v === c).length;
const filled = (p: { px: Int32Array }) => p.px.filter(v => v !== -1).length;

describe('pixel art characters', () => {
  const dirs: Dir[] = ['down', 'up', 'side'], poses: Pose[] = ['stand', 'step1', 'step2'];
  it('renders every walk frame on the 16x26 grid with a sensible amount of pixels', () => {
    for (const d of dirs) for (const p of poses) {
      const f = character(look, d, p);
      expect([f.w, f.h]).toEqual([AW, AH]);
      expect(filled(f)).toBeGreaterThan(150); expect(filled(f)).toBeLessThan(AW * AH);
    }
  });
  it('walk frames differ from standing, and the face is only visible from the front and side', () => {
    const stand = character(look, 'down', 'stand'), step = character(look, 'down', 'step1');
    expect(Array.from(stand.px)).not.toEqual(Array.from(step.px));
    expect(count(character(look, 'down', 'stand'), 0x2a1a24)).toBeGreaterThan(0); // eyes
    expect(count(character(look, 'up', 'stand'), 0x2a1a24)).toBe(0);
  });
  it('the EVA suit hides skin and hair, and every hair style renders', () => {
    const eva = character({ ...look, eva: true }, 'down', 'stand');
    expect(count(eva, look.skin)).toBe(0); expect(count(eva, look.hair)).toBe(0);
    for (const hairStyle of ['short', 'bob', 'bun', 'crop', 'curly', 'long'] as const) expect(filled(character({ ...look, hairStyle }, 'down', 'stand'))).toBeGreaterThan(150);
  });
  it('sleeping closes the eyes and reading shows a book', () => {
    const rowHas = (p: { px: Int32Array }, row: number, c: number) => Array.from(p.px.slice(row * AW, (row + 1) * AW)).includes(c);
    expect(rowHas(character(look, 'down', 'lie1'), 8, 0x2a1a24)).toBe(true);    // open eyes are two rows tall
    expect(rowHas(character(look, 'down', 'sleep1'), 8, 0x2a1a24)).toBe(false); // closed eyes are a single lower line
    expect(count(character(look, 'side', 'read1'), 0xfff6e2)).toBeGreaterThan(0);
  });
  it('icons and thought bubbles exist for every need', () => {
    for (const n of ['happy', 'neutral', 'sad', 'food', 'water', 'ready', 'heart', 'zzz']) { expect(ICONS[n]).toBeDefined(); expect(filled(icon(n))).toBeGreaterThan(20); }
    expect(bubble('food').h).toBeGreaterThan(bubble('food').w / 2);
  });
});

describe('day and night tint', () => {
  it('is clear at midday, dark at night, and lighter indoors', () => {
    expect(skyTint(12, 0, false).alpha).toBe(0);
    expect(skyTint(23, 0, false).alpha).toBeGreaterThan(0.5);
    expect(skyTint(23, 0, true).alpha).toBeLessThan(skyTint(23, 0, false).alpha);
    expect(nightness(12)).toBe(0); expect(nightness(23)).toBe(1);
  });
  it('dusk fades smoothly and dust makes the day dimmer', () => {
    const a = [17, 18, 19, 20, 21].map(h => skyTint(h, 0, false).alpha);
    for (let i = 1; i < a.length; i++) expect(a[i]).toBeGreaterThanOrEqual(a[i - 1]);
    expect(skyTint(12, 0.9, false).alpha).toBeGreaterThan(0.1);
    expect(skyTint(12, 0.2, false).alpha).toBe(0);
  });
});
