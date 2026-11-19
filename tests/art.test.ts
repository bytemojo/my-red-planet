import { describe, expect, it } from 'vitest';
import { CROP_H, CROP_KINDS, CROP_PALETTE, CROP_STAGE_COUNT, CROP_W, WILTED_HEALTH, cropRows, cropStageFor, cropStateFor, ACTION_FRAME_COUNT, AH, AW, ICONS, PROP_ART, actionFrame, bubble, carryFrame, character, icon, propGrip, propPixels, type ActionPoseName, type CharSpec, type Dir, type Pose } from '../src/game/pixelart';
import { ITEM_H, ITEM_PALETTE, ITEM_W, SEED_H, SEED_W, harvestRows, seedPalette, seedRows } from '../src/game/pixelart';
import { FOOD_ART_IDS, FOOD_CARD_PX, FOOD_CARD_SIZE, FOOD_SCALE, FOOD_TRAY_PX, FOOD_TRAY_SIZE, GLINT_FOODS, HOT_FOODS, NASA_MEAL_IDS, foodFrameName, foodPixels } from '../src/game/pixelart';
import { FOOD_ITEMS } from '../src/core/meals';
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

describe('action poses, carry frames and props', () => {
  const poses = Object.keys(ACTION_FRAME_COUNT) as ActionPoseName[];
  it('has seven poses with four to six frames each, all on the 16x26 grid', () => {
    expect(poses.length).toBe(7);
    for (const p of poses) {
      expect(ACTION_FRAME_COUNT[p]).toBeGreaterThanOrEqual(4); expect(ACTION_FRAME_COUNT[p]).toBeLessThanOrEqual(6);
      for (let i = 0; i < ACTION_FRAME_COUNT[p]; i++) {
        const f = actionFrame(look, p, i);
        expect([f.px.w, f.px.h]).toEqual([AW, AH]); expect(filled(f.px)).toBeGreaterThan(120);
        expect(f.hand[0]).toBeGreaterThanOrEqual(0); expect(f.hand[0]).toBeLessThan(AW); expect(f.hand[1]).toBeGreaterThanOrEqual(0); expect(f.hand[1]).toBeLessThan(AH);
      }
    }
  });
  it('frames inside a pose are not all identical (it really animates)', () => {
    for (const p of poses) {
      const set = new Set(Array.from({ length: ACTION_FRAME_COUNT[p] }, (_, i) => Array.from(actionFrame(look, p, i).px.px).join(',')));
      expect(set.size).toBeGreaterThanOrEqual(3);
    }
  });
  it('the reach hand moves out to the rack and back', () => {
    const xs = Array.from({ length: 5 }, (_, i) => actionFrame(look, 'reach', i).hand[0]);
    expect(Math.max(...xs)).toBeGreaterThan(xs[0]); expect(xs[4]).toBeLessThan(Math.max(...xs));
  });
  it('suit-up ends in the EVA suit (no skin or hair) and starts in the flight suit', () => {
    const first = actionFrame(look, 'suitup', 0).px, last = actionFrame(look, 'suitup', 4).px;
    expect(count(first, look.skin)).toBeGreaterThan(0); expect(count(last, look.skin)).toBe(0); expect(count(last, look.hair)).toBe(0);
  });
  it('the EVA version of every pose hides skin', () => {
    for (const p of poses.filter(x => x !== 'sleep' && x !== 'suitup')) expect(count(actionFrame({ ...look, eva: true }, p, 1).px, look.skin)).toBe(0);
  });
  it('carry frames exist for every direction and step, with the hands in front', () => {
    for (const d of ['down', 'up', 'side'] as const) for (const w of ['stand', 'step1', 'step2'] as const) {
      const f = carryFrame(look, d, w); expect([f.px.w, f.px.h]).toEqual([AW, AH]); expect(filled(f.px)).toBeGreaterThan(150);
    }
    expect(Array.from(carryFrame(look, 'down', 'stand').px.px)).not.toEqual(Array.from(character(look, 'down', 'stand').px));
  });
  it('props are drawn, distinct, and have a grip point inside the sprite', () => {
    const ids = Object.keys(PROP_ART) as (keyof typeof PROP_ART)[];
    expect(ids.length).toBe(6);
    const shapes = new Set(ids.map(id => Array.from(propPixels(id).px).join(',')));
    expect(shapes.size).toBe(6);
    for (const id of ids) { const p = propPixels(id), g = propGrip(id); expect(filled(p)).toBeGreaterThan(25); expect(g[0]).toBeLessThan(p.w); expect(g[1]).toBeLessThan(p.h); }
  });
});

describe('crop art', () => {
  const stages = [0, 1, 2, 3, 4, 'wilted'] as const;
  it('every crop has all 5 growth stages plus wilted, on a 16x14 grid', () => {
    expect(CROP_STAGE_COUNT).toBe(5);
    expect([...CROP_KINDS].sort()).toEqual(['bean', 'carrot', 'lettuce', 'potato', 'spinach', 'tomato', 'wheat']);
    for (const k of CROP_KINDS) for (const st of stages) {
      const rows = cropRows(k, st);
      expect(rows, `${k} ${st}`).toBeDefined();
      expect(rows).toHaveLength(CROP_H);
      rows.forEach(r => expect(r).toHaveLength(CROP_W));
    }
  });
  it('every letter used is in the crop palette', () => {
    for (const k of CROP_KINDS) for (const st of stages) for (const ch of cropRows(k, st).join('')) if (ch !== ' ') expect(CROP_PALETTE[k][ch], `${k} ${st} '${ch}'`).toBeDefined();
  });
  it('plants get bigger at each stage and no two stages are identical', () => {
    const px = (k: any, st: any) => [...cropRows(k, st).join('')].filter(c => c !== ' ' && c !== 'y').length;
    for (const k of CROP_KINDS) {
      for (let st = 1; st < 3; st++) expect(px(k, st + 1), `${k} ${st}`).toBeGreaterThan(px(k, st));
      const seen = new Set(stages.map(st => cropRows(k, st).join('|')));
      expect(seen.size).toBe(stages.length);
    }
  });
  it('silhouettes: potato shows a tuber, ready tomato has red fruit, ready beans have pods, ready crops glow, wilted has no bright greens', () => {
    const has = (k: any, st: any, c: string) => cropRows(k, st).join('').includes(c);
    expect(has('potato', 3, 'g')).toBe(true);
    expect(has('tomato', 4, 'f')).toBe(true); expect(has('tomato', 3, 'f')).toBe(false);
    expect(has('bean', 4, 'o')).toBe(true); expect(has('bean', 3, 'o')).toBe(false);
    expect(has('carrot', 4, 'o')).toBe(true); expect(has('carrot', 3, 'o')).toBe(false); // orange crown only when ready
    expect(has('wheat', 4, 'g')).toBe(true); expect(has('wheat', 3, 'g')).toBe(false); // golden heads only when ready
    for (const k of CROP_KINDS) { expect(has(k, 4, 'y')).toBe(true); expect(has(k, 3, 'y')).toBe(false); expect(has(k, 'wilted', 'l')).toBe(false); expect(has(k, 'wilted', 'h')).toBe(false); }
  });
  it('stages follow the existing growth value, and low plant health wilts', () => {
    expect([0, 2, 4, 6, 7.9, 8, 9].map(g => cropStageFor(g, 8))).toEqual([0, 1, 2, 3, 3, 4, 4]);
    expect(cropStateFor(2, 8, 80)).toBe(1);
    expect(cropStateFor(6, 8, WILTED_HEALTH)).toBe('wilted');
    expect(cropStateFor(8, 8, 10)).toBe('wilted');
    expect(cropStateFor(0, 8, 0)).toBe(0); // a seed mound cannot wilt
    expect(cropStateFor(6, 8, undefined)).toBe(3);
  });
});

describe('seed packet and harvest sprites (Step 5c)', () => {
  it('every crop has a seed packet and a harvested item, on fixed grids, using only its own palette', () => {
    for (const k of CROP_KINDS) {
      const seed = seedRows(k), harvest = harvestRows(k);
      expect(seed, k).toHaveLength(SEED_H); seed.forEach(r => expect(r).toHaveLength(SEED_W));
      expect(harvest, k).toHaveLength(ITEM_H); harvest.forEach(r => expect(r).toHaveLength(ITEM_W));
      for (const ch of seed.join('')) if (ch !== ' ') expect(seedPalette(k)[ch], `${k} seed '${ch}'`).toBeDefined();
      for (const ch of harvest.join('')) if (ch !== ' ') expect(ITEM_PALETTE[k][ch], `${k} harvest '${ch}'`).toBeDefined();
      expect(harvest.join('').replace(/ /g, '').length).toBeGreaterThan(30);
    }
  });
  it('no two crops share a seed packet or a harvest picture', () => {
    expect(new Set(CROP_KINDS.map(k => seedRows(k).join('|') + JSON.stringify(seedPalette(k)))).size).toBe(CROP_KINDS.length);
    expect(new Set(CROP_KINDS.map(k => harvestRows(k).join('|'))).size).toBe(CROP_KINDS.length);
  });
});

describe('Step 9b: food art', () => {
  const count = (p: { px: Int32Array }, c: number) => p.px.filter(v => v === c).length;
  const filled = (p: { px: Int32Array }) => p.px.filter(v => v !== -1).length;
  it('has art for exactly the 15 food items (8 NASA meals + 7 crops), ids matching core/meals', () => {
    expect(FOOD_ART_IDS.length).toBe(15);
    expect([...FOOD_ART_IDS].sort()).toEqual(FOOD_ITEMS.map(f => f.id).sort());
    expect(NASA_MEAL_IDS.length).toBe(8);
  });
  it('every item has a tray picture (32px on screen) and a card picture (64px on screen)', () => {
    expect([FOOD_TRAY_SIZE, FOOD_CARD_SIZE]).toEqual([32, 64]);
    for (const id of FOOD_ART_IDS) {
      const tray = foodPixels(id, 'tray'), card = foodPixels(id, 'card');
      expect([tray.w, tray.h]).toEqual([FOOD_TRAY_PX, FOOD_TRAY_PX]); expect([card.w, card.h]).toEqual([FOOD_CARD_PX, FOOD_CARD_PX]);
      expect(tray.w * FOOD_SCALE).toBe(32); expect(card.w * FOOD_SCALE).toBe(64);
      expect(filled(tray)).toBeGreaterThan(50); expect(filled(card)).toBeGreaterThan(filled(tray) * 3);   // card is the detailed one
      expect(foodFrameName(id, 'card')).toBe(`food_card_${id}`); expect(foodFrameName(id, 'tray')).toBe(`food_tray_${id}`);
    }
  });
  it('all 15 pictures are different from each other, at both sizes', () => {
    for (const size of ['tray', 'card'] as const) expect(new Set(FOOD_ART_IDS.map(id => Array.from(foodPixels(id, size).px).join(','))).size).toBe(15);
  });
  it('pictures are original pixel art: no emoji or external images, and every pixel is a plain 0xRRGGBB colour or transparent', () => {
    for (const id of FOOD_ART_IDS) for (const size of ['tray', 'card'] as const) for (const v of foodPixels(id, size).px) expect(v === -1 || (v >= 0 && v <= 0xffffff)).toBe(true);
  });
  it('tray pictures are not clipped: anything on the border of the 16x16 grid is the single outline colour', () => {
    for (const id of FOOD_ART_IDS) {
      const t = foodPixels(id, 'tray'), edge = new Set<number>();
      for (let i = 0; i < t.w; i++) for (const v of [t.px[i], t.px[(t.h - 1) * t.w + i], t.px[i * t.w], t.px[i * t.w + t.w - 1]]) if (v !== -1) edge.add(v);
      expect(edge.size).toBeLessThanOrEqual(1);
    }
  });
  it('hot foods get steam wisps on the card, tray pictures stay clean; fruit gets glints', () => {
    const wisp = 0xeaf6ff;
    for (const id of HOT_FOODS) { expect(count(foodPixels(id, 'card'), wisp)).toBeGreaterThan(0); expect(count(foodPixels(id, 'tray'), wisp)).toBe(0); }
    for (const id of FOOD_ART_IDS.filter(i => !HOT_FOODS.includes(i))) expect(count(foodPixels(id, 'card'), wisp)).toBe(0);
    for (const id of GLINT_FOODS) expect(count(foodPixels(id, 'card'), 0xffffff)).toBeGreaterThan(0);
  });
});

describe('Step 24f: held props never sit at head height from behind', () => {
  it('the carry hand facing up is at hip height, like the other directions', () => {
    for (const w of ['stand', 'step1', 'step2'] as const) {
      const up = carryFrame(look, 'up', w).hand, down = carryFrame(look, 'down', w).hand;
      expect(up[1]).toBeGreaterThanOrEqual(down[1] - 2);
    }
  });
});
