// Original pixel-art engine for My Red Planet characters and icons. Pure TypeScript (no Phaser),
// so it can be unit-tested. Characters are built from shaped parts on a 16x26 grid, then shaded and
// outlined automatically. Every frame is generated from a CharSpec, which is also what a future
// character creator will edit (skin, hair colour, hair style, outfit).

export const AW = 16, AH = 26;
export type Dir = 'down' | 'up' | 'side';
export type Pose = 'stand' | 'step1' | 'step2' | 'write1' | 'write2' | 'read1' | 'read2' | 'lie1' | 'lie2' | 'sleep1' | 'sleep2' | 'tray';
export type HairStyle = 'short' | 'bob' | 'bun' | 'crop' | 'curly' | 'long';
export interface CharSpec { skin: number; hair: number; hairStyle: HairStyle; top: number; bottom: number; shoes: number; accent: number; blanket?: number; eva?: boolean; build?: 'slim' | 'broad' }

// materials
const E = 0, SKIN = 1, HAIR = 2, TOP = 3, ARM = 4, BOTTOM = 5, LEG2 = 6, SHOES = 7, ACCENT = 8, EYE = 9, BLUSH = 10, MOUTH = 11,
  HELMET = 12, VISOR = 13, VISOR_HI = 14, METAL = 15, BOOK = 16, PAGE = 17, BLANKET = 18, SHEET = 19, PEN = 20, GLOVE = 21, LIGHT = 22, TRAY = 23, FOOD = 24, HAIR_HI = 25;

export interface Pixels { w: number; h: number; px: Int32Array } // -1 = transparent, else 0xRRGGBB

// ---------- colour helpers ----------
const ch = (c: number, s: number) => (c >> s) & 255;
export const mix = (a: number, b: number, t: number) => {
  const m = (s: number) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t);
  return (m(16) << 16) | (m(8) << 8) | m(0);
};
export const shade = (c: number, f: number) => mix(c, f < 1 ? 0x000000 : 0xffffff, f < 1 ? 1 - f : f - 1);
const INK = 0x1c1022; // deep plum: outlines lean warm, never pure black

// ---------- head and hair shapes ----------
// Rows are given before the vertical offset `oy` (standing: oy = 2).
const headRows = (dir: Dir): Record<number, [number, number]> => dir === 'side'
  ? { 2: [6, 10], 3: [5, 11], 4: [4, 12], 5: [4, 12], 6: [4, 12], 7: [4, 12], 8: [4, 12], 9: [4, 12], 10: [5, 11], 11: [6, 10] }
  : { 2: [5, 10], 3: [4, 11], 4: [3, 12], 5: [3, 12], 6: [3, 12], 7: [3, 12], 8: [3, 12], 9: [3, 12], 10: [4, 11], 11: [5, 10] };
const inHead = (dir: Dir, x: number, y: number) => { const r = headRows(dir)[y]; return !!r && x >= r[0] && x <= r[1]; };

function hairAt(style: HairStyle, dir: Dir, x: number, y: number): boolean {
  const capFront = (y === 1 && x >= 5 && x <= 10) || (y >= 2 && y <= 4 && inHead('down', x, y)) || (y === 2 && (x === 4 || x === 11));
  if (dir === 'down') {
    switch (style) {
      case 'short': return capFront || (y === 5 && ((x >= 3 && x <= 6) || x >= 11 && x <= 12)) || ((y === 6 || y === 7) && (x === 3 || x === 12));
      case 'crop': return (y >= 2 && y <= 4 && inHead('down', x, y)) || (y === 5 && (x === 3 || x === 12));
      case 'bun': return capFront || (y === 0 && x >= 7 && x <= 8) || (y === 1 && x >= 6 && x <= 9) || (y === 5 && ((x >= 3 && x <= 5) || (x >= 10 && x <= 12))) || ((y === 6) && (x === 3 || x === 12));
      case 'bob': return capFront || (y >= 3 && y <= 5 && x >= 2 && x <= 13) || (y >= 6 && y <= 10 && (x <= 3 || x >= 12) && x >= 2 && x <= 13) || (y === 11 && ((x >= 2 && x <= 4) || (x >= 11 && x <= 13)));
      case 'long': return capFront || (y === 5 && ((x >= 3 && x <= 6) || (x >= 10 && x <= 12))) || (y >= 6 && y <= 16 && (x === 2 || x === 3 || x === 12 || x === 13));
      case 'curly': {
        if (y === 0) return x >= 5 && x <= 10 && x % 2 === 1;
        if (y === 1) return x >= 3 && x <= 12;
        if (y >= 2 && y <= 4) return x >= 2 && x <= 13;
        if (y === 5) return (x >= 2 && x <= 5) || (x >= 10 && x <= 13) || x === 7;
        if (y >= 6 && y <= 12) return (x >= 1 && x <= 3 && !(x === 1 && y % 2 === 0)) || (x >= 12 && x <= 14 && !(x === 14 && y % 2 === 1));
        if (y === 13) return x === 2 || x === 3 || x === 12 || x === 13;
        return false;
      }
    }
  }
  if (dir === 'up') {
    const full = inHead('up', x, y) || (y === 1 && x >= 5 && x <= 10) || (y === 2 && (x === 4 || x === 11));
    switch (style) {
      case 'crop': return full && y <= 8;
      case 'short': return full && y <= 9;
      case 'bun': return (full && y <= 9) || (y >= 0 && y <= 2 && x >= 6 && x <= 9 && !(y === 0 && (x === 6 || x === 9)));
      case 'bob': return (full && y <= 11) || (y >= 3 && y <= 11 && (x === 2 || x === 13));
      case 'long': return full || (y >= 3 && y <= 16 && x >= 2 && x <= 13 && (y <= 11 || (x >= 3 && x <= 12)));
      case 'curly': return hairAt('curly', 'down', x, y) || (full && y <= 12) || (y >= 10 && y <= 13 && x >= 2 && x <= 13);
    }
  }
  // side, facing right: hair covers the top and the back of the head
  const top = (y === 1 && x >= 6 && x <= 10) || (y >= 2 && y <= 4 && inHead('side', x, y));
  switch (style) {
    case 'crop': return (y >= 2 && y <= 4 && inHead('side', x, y)) || (y >= 5 && y <= 7 && x >= 4 && x <= 6);
    case 'short': return top || (y >= 5 && y <= 8 && x >= 4 && x <= 7) || (y === 5 && x >= 10 && x <= 12);
    case 'bun': return top || (y >= 5 && y <= 8 && x >= 4 && x <= 7) || (y >= 1 && y <= 4 && x >= 2 && x <= 4) || (y === 5 && x >= 11 && x <= 12);
    case 'bob': return top || (y >= 5 && y <= 11 && x >= 3 && x <= 7) || (y === 5 && x >= 10 && x <= 12) || (y >= 3 && y <= 4 && x === 3);
    case 'long': return top || (y >= 5 && y <= 16 && x >= 3 && x <= 6) || (y === 5 && x >= 10 && x <= 12) || (y >= 3 && y <= 4 && x === 3);
    case 'curly': return top || (y === 0 && x >= 5 && x <= 9 && x % 2 === 1) || (y >= 1 && y <= 4 && x >= 3 && x <= 12) || (y >= 5 && y <= 12 && x >= 2 && x <= 7 && !(x === 2 && y % 2 === 0)) || (y === 5 && x >= 10 && x <= 13);
  }
}

// ---------- body builder ----------
class Grid {
  m = new Int8Array(AW * AH);
  set(x: number, y: number, v: number) { if (x >= 0 && y >= 0 && x < AW && y < AH) this.m[y * AW + x] = v; }
  get(x: number, y: number) { return x >= 0 && y >= 0 && x < AW && y < AH ? this.m[y * AW + x] : E; }
  rect(x0: number, y0: number, x1: number, y1: number, v: number) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, v); }
}

function head(g: Grid, spec: CharSpec, dir: Dir, oy: number, eyes: 'open' | 'closed' | 'down') {
  if (spec.eva) return helmet(g, dir, oy);
  for (const [ys, [a, b]] of Object.entries(headRows(dir))) g.rect(a, +ys + oy, b, +ys + oy, SKIN);
  if (dir === 'down') {
    if (eyes === 'closed') { g.set(4, 8 + oy, EYE); g.set(5, 8 + oy, EYE); g.set(10, 8 + oy, EYE); g.set(11, 8 + oy, EYE); }
    else { g.set(5, 7 + oy, EYE); g.set(5, 8 + oy, EYE); g.set(10, 7 + oy, EYE); g.set(10, 8 + oy, EYE); }
    g.set(4, 9 + oy, BLUSH); g.set(11, 9 + oy, BLUSH); g.set(7, 10 + oy, MOUTH); g.set(8, 10 + oy, MOUTH);
  } else if (dir === 'side') {
    if (eyes === 'closed') { g.set(10, 8 + oy, EYE); g.set(11, 8 + oy, EYE); }
    else if (eyes === 'down') { g.set(11, 8 + oy, EYE); }
    else { g.set(11, 7 + oy, EYE); g.set(11, 8 + oy, EYE); }
    g.set(10, 9 + oy, BLUSH); g.set(12, 10 + oy, MOUTH);
    g.set(13, 8 + oy, SKIN); // little nose
  }
  for (let y = 0; y < 18; y++) for (let x = 0; x < AW; x++) if (hairAt(spec.hairStyle, dir, x, y)) g.set(x, y + oy, HAIR);
  if (dir === 'down' && spec.hairStyle !== 'crop') { g.set(5, 3 + oy, HAIR_HI); g.set(6, 3 + oy, HAIR_HI); }
  if (dir === 'side' && spec.hairStyle !== 'crop') { g.set(8, 3 + oy, HAIR_HI); g.set(9, 3 + oy, HAIR_HI); }
}

function helmet(g: Grid, dir: Dir, oy: number) {
  const rows: Record<number, [number, number]> = { 1: [5, 10], 2: [3, 12], 3: [2, 13], 4: [2, 13], 5: [2, 13], 6: [2, 13], 7: [2, 13], 8: [2, 13], 9: [2, 13], 10: [2, 13], 11: [3, 12], 12: [4, 11] };
  for (const [ys, [a, b]] of Object.entries(rows)) g.rect(a, +ys + oy, b, +ys + oy, HELMET);
  if (dir === 'down') { g.rect(4, 5 + oy, 11, 9 + oy, VISOR); g.rect(5, 4 + oy, 10, 4 + oy, VISOR); g.rect(5, 10 + oy, 10, 10 + oy, VISOR); g.set(5, 5 + oy, VISOR_HI); g.set(6, 5 + oy, VISOR_HI); g.set(5, 6 + oy, VISOR_HI); g.set(10, 9 + oy, VISOR_HI); }
  if (dir === 'side') { g.rect(9, 5 + oy, 13, 9 + oy, VISOR); g.rect(10, 4 + oy, 12, 10 + oy, VISOR); g.set(11, 5 + oy, VISOR_HI); g.set(12, 6 + oy, VISOR_HI); }
  if (dir === 'up') { g.rect(6, 3 + oy, 9, 3 + oy, ACCENT); }
  g.rect(5, 12 + oy, 10, 12 + oy, ACCENT); // neck ring
}

function torso(g: Grid, spec: CharSpec, dir: Dir, oy: number) {
  if (dir === 'side') { g.rect(6, 12 + oy, 10, 12 + oy, TOP); g.rect(5, 13 + oy, 10, 16 + oy, TOP); g.rect(5, 17 + oy, 10, 17 + oy, BOTTOM); }
  else { const n = spec.build === 'slim' ? 1 : 0; g.rect(5, 12 + oy, 10, 12 + oy, TOP); g.rect(4 + n, 13 + oy, 11 - n, 16 + oy, TOP); g.rect(4, 17 + oy, 11, 17 + oy, BOTTOM); } // slim: narrower shoulders, same hips
  if (spec.eva) {
    if (dir === 'down') { g.rect(6, 14 + oy, 9, 15 + oy, METAL); g.set(7, 14 + oy, LIGHT); g.rect(4, 17 + oy, 11, 17 + oy, ACCENT); }
    if (dir === 'up') g.rect(4, 12 + oy, 11, 17 + oy, METAL);
    if (dir === 'side') { g.rect(2, 12 + oy, 4, 18 + oy, METAL); g.rect(5, 17 + oy, 10, 17 + oy, ACCENT); }
  } else if (dir === 'down') { g.set(7, 12 + oy, ACCENT); g.set(8, 12 + oy, ACCENT); g.set(9, 14 + oy, ACCENT); }
  else if (dir === 'side') g.set(10, 12 + oy, ACCENT);
}

function arms(g: Grid, spec: CharSpec, dir: Dir, pose: Pose, oy: number) {
  const hand = spec.eva ? GLOVE : SKIN;
  if (dir === 'side') {
    const swing = pose === 'step1' ? 1 : pose === 'step2' ? -1 : 0;
    g.rect(7 + swing, 13 + oy, 8 + swing, 15 + oy, ARM); g.rect(7 + swing * 2, 16 + oy, 8 + swing * 2, 16 + oy, hand);
    return;
  }
  const l = pose === 'step1' ? -1 : pose === 'step2' ? 1 : 0; // arms swing opposite to legs
  const a = spec.build === 'slim' ? 1 : 0; // arms hug the narrower shoulders
  g.rect(3 + a, 13 + oy, 3 + a, 15 + oy + l, ARM); g.set(3 + a, 16 + oy + l, hand);
  g.rect(12 - a, 13 + oy, 12 - a, 15 + oy - l, ARM); g.set(12 - a, 16 + oy - l, hand);
}

function legs(g: Grid, dir: Dir, pose: Pose, oy: number) {
  if (dir === 'side') {
    if (pose === 'stand') { g.rect(6, 18 + oy, 9, 20 + oy, BOTTOM); g.rect(6, 21 + oy, 10, 22 + oy, SHOES); return; }
    const back = pose === 'step1' ? LEG2 : BOTTOM, front = pose === 'step1' ? BOTTOM : LEG2;
    g.rect(5, 18 + oy, 6, 19 + oy, back); g.rect(4, 20 + oy, 6, 21 + oy, SHOES);
    g.rect(7, 18 + oy, 10, 18 + oy, front); g.rect(9, 19 + oy, 10, 20 + oy, front); g.rect(9, 21 + oy, 11, 22 + oy, SHOES);
    return;
  }
  g.rect(5, 18 + oy, 10, 18 + oy, BOTTOM);
  const lUp = pose === 'step2' ? 1 : 0, rUp = pose === 'step1' ? 1 : 0;
  g.rect(5, 19 + oy, 6, 20 + oy - lUp, BOTTOM); g.rect(4, 21 + oy - lUp, 6, 22 + oy - lUp, SHOES);
  g.rect(9, 19 + oy, 10, 20 + oy - rUp, BOTTOM); g.rect(9, 21 + oy - rUp, 11, 22 + oy - rUp, SHOES);
}

// Seated at a desk, side view facing right (the desk is drawn by the world, to the right).
function seated(g: Grid, spec: CharSpec, pose: Pose) {
  const oy = 4;
  head(g, spec, 'side', oy, pose.startsWith('read') ? 'down' : 'down');
  g.rect(6, 12 + oy, 10, 12 + oy, TOP); g.rect(5, 13 + oy, 10, 15 + oy, TOP);
  g.rect(5, 16 + oy, 12, 17 + oy, BOTTOM);              // thighs on the chair
  g.rect(11, 18 + oy, 12, 19 + oy, BOTTOM);             // shins
  g.rect(11, 20 + oy, 13, 20 + oy, SHOES);
  if (pose.startsWith('write')) {
    const up = pose === 'write2' ? 1 : 0;
    g.rect(8, 13 + oy, 8, 14 + oy, ARM); g.rect(9, 14 + oy - up, 11, 14 + oy - up, ARM); g.set(12, 14 + oy - up, SKIN); g.set(13, 13 + oy - up, PEN);
  } else {
    g.rect(11, 9 + oy, 14, 14 + oy, BOOK); g.rect(11, 10 + oy, 11, 13 + oy, PAGE);
    if (pose === 'read2') { g.set(12, 9 + oy, PAGE); g.set(12, 10 + oy, PAGE); }
    g.rect(8, 13 + oy, 10, 14 + oy, ARM); g.set(11, 14 + oy, SKIN);
  }
}

// Lying in bed seen from above: head on the pillow, blanket over the body.
function lying(g: Grid, spec: CharSpec, pose: Pose) {
  const oy = 1;
  head(g, spec, 'down', oy, pose.startsWith('sleep') ? 'closed' : 'open');
  const breathe = pose.endsWith('2') ? 1 : 0;
  g.rect(2, 12 + oy, 13, 13 + oy, SHEET);
  g.rect(2 - breathe, 14 + oy, 13 + breathe, 19 + oy, BLANKET);
  g.rect(2, 20 + oy, 13, 23 + oy, BLANKET);
  g.rect(3, 17 + oy, 12, 17 + oy, SHEET); // stripe
  if (!pose.startsWith('sleep')) { g.set(4, 14 + oy, SKIN); g.set(11, 14 + oy, SKIN); }
}

// ---------- shading, colour, outline ----------
function colour(spec: CharSpec, mat: number): number {
  const top = spec.eva ? 0xe9eef6 : spec.top, bottom = spec.eva ? 0xd3dbe8 : spec.bottom;
  switch (mat) {
    case SKIN: return spec.skin; case HAIR: return spec.hair; case HAIR_HI: return mix(spec.hair, 0xffffff, 0.22);
    case TOP: return top; case ARM: return shade(top, 0.86); case BOTTOM: return bottom; case LEG2: return shade(bottom, 0.78);
    case SHOES: return spec.eva ? 0x8b95ab : spec.shoes; case ACCENT: return spec.accent; case EYE: return 0x2a1a24;
    case BLUSH: return mix(spec.skin, 0xff6f8a, 0.45); case MOUTH: return shade(mix(spec.skin, 0xc0404a, 0.55), 0.85);
    case HELMET: return 0xf4f7fb; case VISOR: return 0x1d3566; case VISOR_HI: return 0x8ff0ff; case METAL: return 0xaab6ca;
    case BOOK: return mix(spec.accent, 0x7a3b2e, 0.4); case PAGE: return 0xfff6e2; case BLANKET: return spec.blanket ?? spec.top;
    case SHEET: return 0xf2f5fa; case PEN: return 0x31405e; case GLOVE: return 0x9aa4b8; case LIGHT: return 0x4dffb0;
    case TRAY: return 0xc9d3e3; case FOOD: return 0xffcf6b;
  }
  return 0xff00ff;
}
const SHADED = new Set([HAIR, TOP, BOTTOM, BLANKET, HELMET, METAL, SHOES]);

export function render(g: Grid, spec: CharSpec): Pixels {
  const px = new Int32Array(AW * AH).fill(-1);
  for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
    const m = g.get(x, y); if (m === E) continue;
    let c = colour(spec, m);
    if (SHADED.has(m)) {
      const below = g.get(x, y + 1), right = g.get(x + 1, y);
      if (below !== m && below !== HAIR_HI) c = shade(c, 0.8);       // underside in shadow (light comes from above)
      else if (right === E) c = shade(c, 0.9);                         // far side a touch darker
    }
    if (m === SKIN && (g.get(x, y - 1) === HAIR)) c = shade(c, 0.88);  // soft shadow under the hairline
    px[y * AW + x] = c;
  }
  // Coloured outline: each empty pixel touching the sprite takes a dark version of its neighbour.
  const out = Int32Array.from(px);
  for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
    if (px[y * AW + x] !== -1) continue;
    const n = [[x, y + 1], [x, y - 1], [x - 1, y], [x + 1, y]].find(([a, b]) => a >= 0 && b >= 0 && a < AW && b < AH && px[b * AW + a] !== -1);
    if (n) out[y * AW + x] = mix(shade(px[n[1] * AW + n[0]], 0.35), INK, 0.55);
  }
  return { w: AW, h: AH, px: out };
}

export function character(spec: CharSpec, dir: Dir, pose: Pose): Pixels {
  const g = new Grid();
  if (pose.startsWith('write') || pose.startsWith('read')) seated(g, spec, pose);
  else if (pose.startsWith('lie') || pose.startsWith('sleep')) lying(g, spec, pose);
  else {
    const oy = 2 + (pose === 'step1' || pose === 'step2' ? 0 : 0);
    legs(g, dir, pose === 'tray' ? 'stand' : pose, oy);
    torso(g, spec, dir, oy);
    head(g, spec, dir, oy, 'open');
    if (pose === 'tray') { // back view, both arms raised, a meal tray held up to the hatch
      g.rect(2, 3, 2, 14 + oy, ARM); g.rect(13, 3, 13, 14 + oy, ARM);
      g.rect(1, 2, 14, 2, TRAY); g.rect(3, 1, 5, 1, FOOD); g.rect(7, 1, 8, 1, FOOD); g.rect(10, 1, 12, 1, FOOD);
    } else arms(g, spec, dir, pose, oy);
  }
  return render(g, spec);
}

// ---------- icons (bubbles and faces over heads) ----------
const ICON_COLORS: Record<string, number> = {
  Y: 0xffd84a, y: 0xf3a72f, k: 0x3a2412, B: 0x9cc4ff, b: 0x5b86d6, c: 0x7fe3ff, w: 0xe8eef8, O: 0xfff2cc, o: 0xe0b45a,
  r: 0xe0575b, R: 0xa83a3e, p: 0xff6b9a, z: 0xd6f1ff, g: 0x66d17a, G: 0x2f8f4a, s: 0xb8865a, W: 0xffffff, t: 0x5ad1ff, T: 0x2f87c9,
};
export const ICONS: Record<string, string[]> = {
  happy: ['..YYYY..', '.YYYYYY.', 'YYkYYkYY', 'YYYYYYYY', 'YkYYYYkY', 'YYkrrkYY', '.yYkkYy.', '..yyyy..'],
  neutral: ['..YYYY..', '.YYYYYY.', 'YYkYYkYY', 'YYYYYYYY', 'YYYYYYYY', 'YYkkkkYY', '.yYYYYy.', '..yyyy..'],
  sad: ['..BBBB..', '.BBBBBB.', 'BBkBBkBB', 'BBcBBBBB', 'BBcBBBBB', 'BBBkkBBB', '.bkBBkb.', '..bbbb..'],
  food: ['.w..w...', '..w..w..', '.w..w...', 'OOOOOOOO', 'rOoOOoOr', '.rrrrrr.', '..RRRR..', '........'],
  water: ['...tt...', '...tt...', '..tttt..', '.tWtttt.', '.tWttTt.', '.ttttTt.', '..TTTT..', '........'],
  ready: ['...YY...', '..YYYY..', 'YYYYYYYY', '.YYWYYY.', '..YYYY..', '.YY..YY.', '.Y....Y.', '........'],
  heart: ['.pp..pp.', 'pppppppp', 'ppWppppp', 'pppppppp', '.pppppp.', '..pppp..', '...pp...', '........'],
  zzz: ['....zzzz', '......z.', '.....z..', 'zzz.zzzz', '..z.....', '.z......', 'zzz.....', '........'],
};
const BUBBLE = [
  '..kkkkkkkkkk..', '.kWWWWWWWWWWk.', 'kWWWWWWWWWWWWk', 'kWWWWWWWWWWWWk', 'kWWWWWWWWWWWWk', 'kWWWWWWWWWWWWk', 'kWWWWWWWWWWWWk',
  'kWWWWWWWWWWWWk', 'kWWWWWWWWWWWWk', 'kWWWWWWWWWWWWk', '.kWWWWWWWWWWk.', '..kkkkkkkkkk..',
];
const THINK_TAIL = ['...kkkk.......', '...kWWk.......', '...kkkk.......', '.kkk..........', '.kWk..........', '.kkk..........'];

const fromRows = (rows: string[], colors: Record<string, number>): Pixels => {
  const w = rows[0].length, h = rows.length, px = new Int32Array(w * h).fill(-1);
  rows.forEach((r, y) => [...r].forEach((k, x) => { const c = k === 'k' && colors === ICON_COLORS ? INK : colors[k]; if (c !== undefined) px[y * w + x] = c; }));
  return { w, h, px };
};
const outline = (p: Pixels): Pixels => {
  const w = p.w + 2, h = p.h + 2, px = new Int32Array(w * h).fill(-1);
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) px[(y + 1) * w + x + 1] = p.px[y * p.w + x];
  const out = Int32Array.from(px);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (px[y * w + x] === -1 && [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([a, b]) => { const X = x + a, Y = y + b; return X >= 0 && Y >= 0 && X < w && Y < h && px[Y * w + X] !== -1; })) out[y * w + x] = INK;
  return { w, h, px: out };
};
// A face or icon on its own, with a dark outline (used for the always-on mood badge).
export const icon = (name: string): Pixels => outline(fromRows(ICONS[name], ICON_COLORS));
// A thought bubble (dotted tail) with an icon inside: used for needs like food and water.
export function bubble(name: string): Pixels {
  const rows = [...BUBBLE, ...THINK_TAIL];
  const b = fromRows(rows, { ...ICON_COLORS, W: 0xf7fbff });
  const ic = fromRows(ICONS[name], ICON_COLORS);
  for (let y = 0; y < ic.h; y++) for (let x = 0; x < ic.w; x++) { const c = ic.px[y * ic.w + x]; if (c !== -1) b.px[(y + 2) * b.w + x + 3] = c; }
  return b;
}

// ---------- ACTION POSES, CARRY FRAMES AND PROPS (Step 1: action animation foundation) ----------
// Every frame is 16x26 like the walk frames, so the player sprite keeps the same origin (feet at the
// bottom centre). Side poses face RIGHT; the scene flips them for left. Each frame also reports where
// the hand is (`hand`, in art pixels) so a held prop can be drawn exactly in the hand.
export type ActionPoseName = 'reach' | 'crouch' | 'pour' | 'kneel' | 'pull' | 'suitup' | 'sleep';
export const ACTION_FRAME_COUNT: Record<ActionPoseName, number> = { reach: 5, crouch: 5, pour: 5, kneel: 4, pull: 5, suitup: 5, sleep: 4 };
/** How far a held tool tilts (degrees, clockwise) on each frame of a pose. Used for pouring. */
export const ACTION_TILT: Partial<Record<ActionPoseName, number[]>> = { pour: [0, 12, 40, 62, 18] };
export const actFrameName = (pose: ActionPoseName, i: number) => `act_${pose}_${i}`;
export const carryFrameName = (dir: Dir, pose: 'stand' | 'step1' | 'step2') => `carry_${dir}_${pose}`;
export type Hand = [number, number];
export interface ActFrame { px: Pixels; hand: Hand }

function line(g: Grid, x0: number, y0: number, x1: number, y1: number, m: number) {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, x = x0, y = y0;
  for (let n = 0; n < 64; n++) { g.set(x, y, m); if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x += sx; } if (e2 <= dx) { err += dx; y += sy; } }
}
// A two-pixel-wide arm from the shoulder (sx, sy) to the hand (hx, hy).
function armLine(g: Grid, spec: CharSpec, sx: number, sy: number, hx: number, hy: number) {
  const wide = Math.abs(hx - sx) >= Math.abs(hy - sy);
  line(g, sx, sy, hx, hy, ARM); line(g, sx + (wide ? 0 : 1), sy + (wide ? 1 : 0), hx + (wide ? 0 : 1), hy + (wide ? 1 : 0), ARM);
  g.set(hx, hy, spec.eva ? GLOVE : SKIN); g.set(hx + (wide ? 0 : 1), hy + (wide ? 1 : 0), spec.eva ? GLOVE : SKIN);
}
// Side-view body sunk by `d` pixels (0 = standing, 3-4 = crouch or kneel). Returns the shoulder point.
function sideBody(g: Grid, spec: CharSpec, d: number, kneel: boolean): Hand {
  const oy = 2 + d, hip = 19 + d;
  head(g, spec, 'side', oy, 'open');
  g.rect(6, 12 + oy, 10, 12 + oy, TOP); g.rect(5, 13 + oy, 10, 16 + oy, TOP); g.rect(5, hip, 10, hip, BOTTOM);
  if (spec.eva) { g.rect(2, 12 + oy, 4, 18 + oy, METAL); g.rect(5, hip, 10, hip, ACCENT); }
  if (d === 0) { g.rect(6, 20, 9, 22, BOTTOM); g.rect(6, 23, 10, 24, SHOES); return [8, 15]; }
  if (kneel) { // front foot flat, back knee on the floor
    g.rect(7, hip + 1, 11, hip + 1, BOTTOM); g.rect(11, hip + 2, 12, 23, BOTTOM); g.rect(11, 24, 13, 24, SHOES);
    g.rect(4, 24, 8, 24, LEG2); g.rect(2, 24, 3, 24, SHOES);
  } else { // squat: knees forward, both feet down
    g.rect(6, hip + 1 > 24 ? 24 : hip + 1, 11, hip + 1 > 24 ? 24 : hip + 1, BOTTOM); g.rect(10, hip + 2, 11, 23, BOTTOM); g.rect(9, 24, 12, 24, SHOES);
    g.rect(5, hip + 2, 6, 23, LEG2); g.rect(4, 24, 6, 24, SHOES);
  }
  return [8, 15 + d];
}
// Both arms out to the sides, front view (suit-up).
function armsOut(g: Grid, spec: CharSpec, oy: number) { armLine(g, spec, 3, 12 + oy, 0, 11 + oy); armLine(g, spec, 12, 12 + oy, 15, 11 + oy); }

export function actionFrame(spec: CharSpec, pose: ActionPoseName, i: number): ActFrame {
  const g = new Grid(); let hand: Hand = [12, 17];
  if (pose === 'reach') {
    const hands: Hand[] = [[9, 19], [12, 17], [14, 15], [14, 14], [11, 16]];
    const [sx, sy] = sideBody(g, spec, 0, false); hand = hands[i % 5]; armLine(g, spec, sx, sy, hand[0], hand[1]);
  } else if (pose === 'pour') {
    const hands: Hand[] = [[11, 17], [13, 15], [14, 15], [14, 17], [11, 17]];
    const [sx, sy] = sideBody(g, spec, 0, false); hand = hands[i % 5]; armLine(g, spec, sx, sy, hand[0], hand[1]);
  } else if (pose === 'crouch') {
    const d = [3, 4, 4, 4, 3][i % 5], hands: Hand[] = [[12, 22], [13, 23], [13, 24], [14, 24], [11, 21]];
    const [sx, sy] = sideBody(g, spec, d, false); hand = hands[i % 5]; armLine(g, spec, sx, sy, hand[0], hand[1]);
  } else if (pose === 'kneel' || pose === 'pull') {
    const [sx, sy] = sideBody(g, spec, 3, true);
    if (pose === 'kneel') { // working on a machine: hands move, cyan light sparks (never fire)
      const hands: Hand[] = [[13, 20], [14, 21], [13, 21], [14, 20]]; hand = hands[i % 4]; armLine(g, spec, sx, sy, hand[0], hand[1]);
      const sp = ([[15, 19], [15, 21], [14, 19], [15, 20]] as Hand[])[i % 4]; g.set(sp[0], sp[1], VISOR_HI); // cyan spark
    } else { // pulling a band back toward the chest
      const hands: Hand[] = [[14, 19], [12, 19], [9, 18], [9, 18], [12, 19]]; hand = hands[i % 5]; armLine(g, spec, sx, sy, hand[0], hand[1]);
    }
  } else if (pose === 'suitup') {
    const eva = i >= 3 ? { ...spec, eva: true } : spec; // frames 0-2: flight suit; 3-4: EVA suit
    legs(g, 'down', 'stand', 2); torso(g, eva, 'down', 2); head(g, i >= 2 ? { ...spec, eva: true } : spec, 'down', 2, 'open');
    if (i === 1 || i === 2 || i === 3) armsOut(g, eva, 2); else arms(g, eva, 'down', 'stand', 2);
    hand = [8, 17];
  } else { // sleep: drowsy stand, slump, then lie down (the bed view already used by the crew)
    if (i >= 2) return { px: render(lyingGrid(spec, i === 2 ? 'sleep1' : 'sleep2'), spec), hand: [8, 14] };
    if (i === 0) { legs(g, 'down', 'stand', 2); torso(g, spec, 'down', 2); head(g, spec, 'down', 2, 'closed'); arms(g, spec, 'down', 'stand', 2); }
    else { const [sx, sy] = sideBody(g, spec, 3, true); armLine(g, spec, sx, sy, 10, 21); g.set(10, 12, E); }
    hand = [8, 18];
  }
  return { px: render(g, spec), hand };
}
function lyingGrid(spec: CharSpec, pose: Pose): Grid { const g = new Grid(); lying(g, spec, pose); return g; }

// Walking while carrying something: arms bent in front, the prop is drawn in the hand by the scene.
export function carryFrame(spec: CharSpec, dir: Dir, pose: 'stand' | 'step1' | 'step2'): ActFrame {
  const g = new Grid(), oy = 2; let hand: Hand = [8, 17];
  legs(g, dir, pose, oy); torso(g, spec, dir, oy); head(g, spec, dir, oy, 'open');
  if (dir === 'down') { armLine(g, spec, 4, 15, 6, 18); armLine(g, spec, 11, 15, 9, 18); hand = [8, 18]; }
  else if (dir === 'up') { armLine(g, spec, 3, 15, 3, 18); armLine(g, spec, 12, 15, 12, 18); hand = [12, 18]; } // 24f: from behind the held prop sits at the hip, never at head height (was y5)
  else { armLine(g, spec, 8, 15, 12, 17); hand = [12, 17]; }
  return { px: render(g, spec), hand };
}

// ----- props: small original sprites for the things the explorer carries -----
const PROP_COLORS: Record<string, number> = {
  w: 0xe8eef8, W: 0xffffff, g: 0x9aa8c2, G: 0x5b6b8c, c: 0x39d9ff, C: 0x9af4ff, a: 0xffb340, A: 0xc9791f,
  r: 0xe0575b, y: 0xffd84a, l: 0x66d17a, L: 0x2f8f4a, b: 0x3c5277, o: 0xe0b45a,
};
export type PropArt = 'tray' | 'sprinkler' | 'seed_packet' | 'spare_part' | 'ice_sample' | 'harvest';
export const PROP_ART: Record<PropArt, { rows: string[]; grip: Hand }> = {
  tray: { grip: [6, 3], rows: ['gggggggggggg', 'gwwwwwwwwwwg', 'gwaaawcccwlg', 'gwaaawcccwlg', 'gwwwwwwwwwwg', 'GGGGGGGGGGGG'] },
  sprinkler: { grip: [4, 5], rows: ['........cC', '.......gCc', '......gcc.', '.ggggg.g..', 'gwwwwwg...', 'gGwcwwg...', 'gGwcwwg...', 'gwwwwwg...', '.GGGGGG...'] },
  seed_packet: { grip: [4, 5], rows: ['.gggggg.', 'gwwwwwwg', 'gwLLLLwg', 'gwwllwwg', 'glllLllg', 'gwwlLwwg', 'gwwlwwwg', 'gwwwwwwg', 'gwwwwwwg', '.GGGGGG.'] },
  spare_part: { grip: [5, 5], rows: ['....gg....', '.gg.gg.gg.', '.gggggggg.', '..ggCCgg..', 'ggggCCgggg', 'ggggCCgggg', '..ggCCgg..', '.gggggggg.', '.gg.gg.gg.', '....gg....'] },
  ice_sample: { grip: [4, 5], rows: ['.GGGGGGG.', '.wwwwwww.', '.wCwCwCw.', 'wwcCcCcWw', 'wwCcCcCww', 'wwcCcCcww', 'wwwwwwwww', '.wwwwwww.'] },
  harvest: { grip: [4, 3], rows: ['.oooooo.', 'oAoAoAoo', 'oooooooo', 'AooAooAo', '.oooooo.'] }, // Step 6c: a basket; while carried the real crop sprite (harvest_<crop>) is drawn instead
};
export const propPixels = (id: PropArt): Pixels => outline(fromRows(PROP_ART[id].rows, PROP_COLORS));
// `outline` adds one pixel on every side, so the grip moves by (1, 1).
export const propGrip = (id: PropArt): Hand => [PROP_ART[id].grip[0] + 1, PROP_ART[id].grip[1] + 1];

// ---- Crops (Step 5b): 16x14 art grids, plant roots on the bottom row. Five growth stages + wilted for each crop.
// ' ' is transparent. Letters are colours from CROP_PALETTE (shared) merged with the crop's own colours.
export const CROP_KINDS = ['lettuce', 'tomato', 'bean', 'potato', 'carrot', 'spinach', 'wheat'] as const;
export type CropKind = typeof CROP_KINDS[number];
export const CROP_STAGE_COUNT = 5;            // 0 seed mound, 1 sprout, 2 young, 3 mature, 4 ready (gentle glow)
export const CROP_W = 16, CROP_H = 14;
export const WILTED_HEALTH = 25;              // plant health at or below this shows the wilted sprite
const CROP_SHARED: Record<string, number> = { S: 0xaab6d0, w: 0xa89a4a, x: 0x6a5a2a, y: 0xfff3a0, r: 0x8a4a2e, q: 0x4a2616, p: 0xf0e0b0, k: 0x2a5a30 };
export const CROP_PALETTE: Record<CropKind, Record<string, number>> = {
  lettuce: { ...CROP_SHARED, m: 0x356c39, l: 0x7fdf77, h: 0xd4ffd0 },
  tomato: { ...CROP_SHARED, m: 0x2c6a3a, l: 0x60c764, h: 0xa8ed91, k: 0x244f2c, f: 0xff5b4c, F: 0xc23a30, g: 0xb8d35a },
  bean: { ...CROP_SHARED, k: 0x316b37, m: 0x3a8a35, l: 0x8ccf64, h: 0xd1f59e, o: 0xb7e04a },
  potato: { ...CROP_SHARED, m: 0x305f37, l: 0x67b862, h: 0xa2e691, g: 0xd2a468, G: 0x9a6c3c, f: 0xf5e9ff },
  carrot: { ...CROP_SHARED, m: 0x2f6f3a, l: 0x6fcf5f, h: 0xb4f08a, o: 0xff9a3c, O: 0xd9701f },
  spinach: { ...CROP_SHARED, k: 0x163f26, m: 0x1f5a35, l: 0x3f9a4f, h: 0x7fcf7a },
  wheat: { ...CROP_SHARED, m: 0x4f8a3a, l: 0x8bc34a, h: 0xcfe68a, g: 0xe6c35a, G: 0xb88a2e },
};
const centre = (rows: string[]) => rows.map(r => r.length >= CROP_W ? r : r.padStart(Math.floor((CROP_W + r.length) / 2)).padEnd(CROP_W));
const base = (seedLike: boolean) => [seedLike ? '       rr       ' : '                ', '     qrrrrq     ', '    qrrrrrrq    '];
const grid = (plant: string[], full = false) => {
  const rows = full ? plant : centre(plant);
  const body = [...Array(CROP_H - 2 - rows.length).fill(' '.repeat(CROP_W)), ...rows]; // plant roots touch the mound (rows 12-13)
  return [...body, ...base(false).slice(1)];
};
const glow = (rows: string[]) => {
  const out = rows.map(r => [...r]);
  [[2, 3], [13, 2], [1, 7], [14, 6], [3, 1], [12, 8]].forEach(([x, y]) => { if (out[y] && out[y][x] === ' ') out[y][x] = 'y'; });
  return out.map(r => r.join(''));
};
const MOUND = [...Array(CROP_H - 3).fill(' '.repeat(CROP_W)), ...base(true)].map((r, i) => i === CROP_H - 3 ? '       pr       ' : r);
const CROP_ART: Record<CropKind, { stages: string[][]; wilted: string[] }> = {
  lettuce: {
    stages: [
      MOUND,
      grid(['l    l', 'ml  lm', ' mllm ']),
      grid([' h    h ', 'l hllh l', 'mllllllm', ' mmllmm ']),
      grid(['  hh  ', ' hllh ', ' lhllllhl ', 'mllllllllm', 'mmllllllmm', ' mmmllmmm ']),
      glow(grid(['  hh  ', ' hhhh ', 'lhhllhhl', 'mhllllllhm', 'mmllhhllmm', ' mmmllmmm '])),
    ],
    wilted: grid(['xwwwwwwwx', 'wxwwwwwxw', ' xxwwwxx ']),
  },
  potato: {
    stages: [
      MOUND,
      grid(['l   l', 'mlllm', '  m  ']),
      grid([' l  l ', 'lmllml', 'mlllllm', ' m  m  ']),
      grid(['  h  h  ', ' lhllhl ', 'mlllllllm', 'mmllllmm', '   gg   ']),
      glow(grid(['  f  f  ', '  h  h  ', ' lhllhl ', 'mlllllllm', 'mmllllmm', '  gGGg  '])),
    ],
    wilted: grid([' w    w ', 'xwx  xwx', 'xwwxxwwx', ' xwwwwx ', '   gg   ']),
  },
  bean: {
    stages: [
      MOUND,
      grid(['  l  ', 'l k l', ' mkm '], false),
      grid(['        S       ', '       lSl      ', '       kSkl     ', '      lkSk      ', '       kSk      '], true),
      grid(['        S       ', '       lSl      ', '      hlSlh     ', '       kSkl     ', '     lhkSk      ', '      lkSkl     ', '       kSk      ', '      mkSkm     '], true),
      glow(grid(['        S       ', '       lSl      ', '      hlSlh     ', '     o lSkl     ', '     o hkSk o   ', '      lkSkl o   ', '       kSk      ', '      mkSkm     '], true)),
    ],
    wilted: grid(['        S       ', '      w S       ', '     xw S w     ', '      xwSwx     ', '       xSx      '], true),
  },
  tomato: {
    stages: [
      MOUND,
      grid(['  l  ', 'l k l', ' mkm '], false),
      grid(['        S       ', '      lhSl      ', '     lmlSml     ', '      mkSkm     '], true),
      grid(['        S       ', '      hlSlh     ', '    lhllSllhl   ', '     mlgSlgm    ', '    lmllSllml   ', '     mkkSkkm    ', '       mSm      '], true),
      glow(grid(['        S       ', '      hlSlh     ', '    lhllSllhl   ', '     mlfSlfm    ', '    lmlFSlFml   ', '     mkkSkkm    ', '       mSm      '], true)),
    ],
    wilted: grid(['        S       ', '     w  S  w    ', '    xwx S xwx   ', '     xwxSxwx    ', '      xwSwx     ', '       xSx      '], true),
  },
  // Step 5c. Carrot: feathery tops, an orange crown pokes out of the soil when ready.
  carrot: {
    stages: [
      MOUND,
      grid(['l l', 'lml', ' m ']),
      grid(['l  l  l', 'hl l lh', ' lmlml ', '  mlm  ', '   m   ']),
      grid(['h  h  h  h', 'l  l  l  l', ' l hl lh l', ' ml lml lm ', '  mlmmlml ', '   mlmlm  ', '    mlm    ']),
      glow(grid(['h  h  h  h', 'l  l  l  l', ' l hl lh l', ' ml lml lm ', '  mlmmlml ', '   mlmlm  ', '    mlm    ', '   oOOo   ', '    oo    '])),
    ],
    wilted: grid([' w   w ', 'xwx xwx', ' xwwwx ', '   x   ', '   O   ']),
  },
  // Spinach: low rosette of dark, broad leaves.
  spinach: {
    stages: [
      MOUND,
      grid(['l l', 'mlm']),
      grid([' l  l ', 'llmmll', 'mllllm', ' mmmm ']),
      grid(['  l  hl  ', ' lhllllhl ', 'llllhhllll', 'mllhhhhllm', 'mmllllllmm', ' mmmmmmmm ']),
      glow(grid(['  hh  hh  ', ' lhhllhhl ', 'lhllhhllhl', 'mlllhhhlllm', 'mmllllllllmm', ' mmmllllmmm ', '  kmmmmmmk  '])),
    ],
    wilted: grid(['xw    wx', 'xwwxxwwx', ' xwwwwx ']),
  },
  // Wheat: thin blades, then green heads, then golden heads.
  wheat: {
    stages: [
      MOUND,
      grid(['l  l', 'l  l', 'mllm']),
      grid(['   l  l  l  l   ', '   m  m  m  m   ', '  lm lm lm lm   ', '   m  m  m  m   '], true),
      grid(['   h  h  h  h   ', '   h  h  h  h   ', '   l  l  l  l   ', '   m  m  m  m   ', '  lm lm lm lm   ', '   m  m  m  m   ', '  lmmlmmlmml    '], true),
      glow(grid(['   g  g  g  g   ', '   g  g  g  g   ', '   G  G  G  G   ', '   l  l  l  l   ', '   m  m  m  m   ', '  lm lm lm lm   ', '   m  m  m  m   ', '  lmmlmmlmml    ', '   m  m  m  m   '], true)),
    ],
    wilted: grid(['  ww     ww     ', '   xw   wx  w   ', '   x  x  x  x   ', '   x  x  x  x   ', '  xxwxxwxxwx    '], true),
  },
};
// ---- Step 5c: seed packet (10x12) and harvested item (12x12) for every crop. Letters: w/g/G packet paper+edge, B packet band, a-d the crop's own colours.
export const SEED_W = 10, SEED_H = 12, ITEM_W = 12, ITEM_H = 12;
export const ITEM_PALETTE: Record<CropKind, Record<string, number>> = {
  lettuce: { a: 0x7fdf77, b: 0x356c39, c: 0xd4ffd0, d: 0x2c5a30 },
  tomato: { a: 0xff5b4c, b: 0xc23a30, c: 0x60c764, d: 0x2c6a3a, h: 0xffb0a0 },
  bean: { a: 0xb7e04a, b: 0x7fa82e, c: 0xd1f59e, d: 0x3a6a24 },
  potato: { a: 0xd2a468, b: 0x9a6c3c, c: 0xe8c892, d: 0x6a4a28 },
  carrot: { a: 0xff9a3c, b: 0xd9701f, c: 0x6fcf5f, d: 0x2f6f3a, h: 0xffc78a },
  spinach: { a: 0x3f9a4f, b: 0x1f5a35, c: 0x7fcf7a, d: 0x163f26 },
  wheat: { a: 0xe6c35a, b: 0xb88a2e, c: 0xfff0a8, d: 0x8a6a28, s: 0x39d9ff },
};
const HARVEST_ART: Record<CropKind, string[]> = {
  lettuce: ['    cccc    ', '  ccaaaacc  ', ' caaacaaaac ', 'caaacaaaaaac', 'aaaaaacaaaaa', 'aabaaaaaaaaa', 'aabbaacaaaab', ' abbaaaaabb ', ' dabbbbbbad ', '  ddbbbbdd  ', '    dddd    '],
  tomato: ['     dd     ', '   dcddcd   ', '    dccd    ', '  aaaddaaa  ', ' aahaaaaaaa ', 'aahhaaaaaaaa', 'aahaaaaaaaab', 'aaaaaaaaaabb', 'aaaaaaaaabbb', ' aabbbbbbbb ', '  bbbbbbbb  ', '    bbbb    '],
  bean: ['        dd  ', '       daad ', '      daaaad', '     daacaad', '    daaacaad', '   daaacaad ', '  daaacaad  ', ' daaacaad   ', 'daaacaad    ', 'daacad      ', ' dad        ', '  d         '],
  potato: ['    aaaaa   ', '  aaaacaaaa ', ' aaaaaaaaaaa', 'aacaadaaaabb', 'aaaabaaaaabb', 'aaaaaaaadabb', 'abaadaaabaab', ' aaaaaaabbb ', '  abbbbbbb  ', '   dbbbbd   '],
  carrot: ['  c  c  c   ', '   cdcdc    ', '    dcd     ', '   hhaaa    ', '  ahaaaab   ', '  aaaaabb   ', '   aaaabb   ', '   aaabb    ', '    aabb    ', '    abb     ', '     bb     ', '     b      '],
  spinach: ['    cc cc   ', '   caacaac  ', '  caaaaaaac ', ' caacaaaaaac', 'caaaacaaaaac', 'aabaaaaabaaa', 'aabbaaaaabba', ' abbbaaabbb ', '  abbbbbbba ', '   dbbbbbd  ', '    ddbdd   ', '     dd     '],
  wheat: ['  c  c  c   ', ' aca aca ac ', ' aba aba aba', ' aba aba ab ', '  b   b  b  ', '  d  d   d  ', '  ssssssss  ', '  ssssssss  ', '  d  d  d   ', ' d   d   d  ', ' d   d    d '],
};
const SEED_ICON: Record<CropKind, string[]> = { // 4x4 picture on the packet; spaces are paper
  lettuce: [' cc ', 'caac', 'caac', ' bb '], tomato: [' cc ', 'aaaa', 'aaaa', ' bb '], bean: ['  aa', ' aa ', 'aa  ', 'a   '],
  potato: [' aa ', 'aaaa', 'aaab', ' bb '], carrot: [' cc ', 'aaaa', ' aa ', '  a '], spinach: [' aa ', 'aaaa', 'abba', ' aa '], wheat: ['a a ', ' aa ', 'aaaa', ' bb '],
};
const fit = (rows: string[], w: number, h: number) => [...Array(Math.max(0, h - rows.length)).fill(''), ...rows].map(r => r.padEnd(w));
export const harvestRows = (kind: CropKind): string[] => fit(HARVEST_ART[kind], ITEM_W, ITEM_H);
export const seedRows = (kind: CropKind): string[] => [
  ' gggggggg ', 'gwwwwwwwwg', 'gBBBBBBBBg', 'gBBBBBBBBg', 'gwwwwwwwwg',
  ...SEED_ICON[kind].map(r => 'gww' + r.replace(/ /g, 'w') + 'wwg'),
  'gwwwwwwwwg', 'gwwwwwwwwg', ' GGGGGGGG ',
];
export const seedPalette = (kind: CropKind): Record<string, number> => ({ w: 0xe8eef8, g: 0x9aa8c2, G: 0x5b6b8c, B: ITEM_PALETTE[kind].a, ...ITEM_PALETTE[kind] });
export const seedFrameName = (kind: string) => `seed_${kind}`;
export const harvestFrameName = (kind: string) => `harvest_${kind}`;
/** Art rows for one crop at a stage 0-4, or 'wilted'. Every grid is CROP_W x CROP_H. */
export const cropRows = (kind: CropKind, stage: number | 'wilted'): string[] => stage === 'wilted' ? CROP_ART[kind].wilted : CROP_ART[kind].stages[stage];
export const cropFrameName = (kind: string, stage: number | 'wilted') => `crop_${kind}_${stage}`;
/** Which sprite a bed shows. growth/need is the existing growth value; ready wins over everything but wilting. */
export const cropStageFor = (growth: number, need: number): number => growth >= need ? 4 : Math.min(3, Math.floor(Math.max(0, growth / need) * 4));
export const cropStateFor = (growth: number, need: number, health?: number): number | 'wilted' => {
  const stage = cropStageFor(growth, need);
  return stage >= 1 && health !== undefined && health <= WILTED_HEALTH ? 'wilted' : stage;
};


// ---------- Step 9b: food art (original, procedural; no emoji) ----------
// Every food item has two pictures made from ONE hand-drawn 14x14 grid padded to 16x16:
//   tray size: 16x16 art px, drawn at 2x = 32x32 screen px (a slot on the tray)
//   card size: the same picture doubled to 32x32 art px, drawn at 2x = 64x64 screen px, then given more detail:
//              soft top-left light and bottom-right shade, a coloured anime outline, glints on fruit and steam wisps on hot food.
export const NASA_MEAL_IDS = ['almonds', 'eggs', 'chicken', 'beef', 'oatmeal', 'mac', 'tortilla', 'soup'] as const;
export const FOOD_ART_IDS: readonly string[] = [...NASA_MEAL_IDS, ...CROP_KINDS];
export const FOOD_TRAY_PX = 16, FOOD_CARD_PX = 32, FOOD_SCALE = 2;
export const FOOD_TRAY_SIZE = FOOD_TRAY_PX * FOOD_SCALE, FOOD_CARD_SIZE = FOOD_CARD_PX * FOOD_SCALE;   // 32 and 64 screen px
export type FoodSize = 'tray' | 'card';
export const foodFrameName = (id: string, size: FoodSize) => `food_${size}_${id}`;
/** Foods that give off steam in the card picture, and foods that get a glint (fruit and shiny produce). */
export const HOT_FOODS: readonly string[] = ['chicken', 'beef', 'mac', 'soup', 'oatmeal', 'eggs'];
export const GLINT_FOODS: readonly string[] = ['almonds', 'oatmeal', 'tomato', 'carrot', 'bean'];

// the shared white-grey meal tray every NASA meal sits on (4 rows); t rim, T body, k cyan strip
const MEAL_TRAY = [' tttttttttttt ', 'tTTTTTTTTTTTTt', 'tTkkkkkkkkkkTt', ' tttttttttttt '];
const TRAY_COLORS = { t: 0xe3ecf8, T: 0x9fb0c8, k: 0x39d9ff };
// 10 rows of food above the tray. Letters are per-item colours (see MEAL_COLORS).
const MEAL_ART: Record<string, { rows: string[]; colors: Record<string, number> }> = {
  almonds: { colors: { a: 0xc98a52, b: 0x8a5530, c: 0xf0c48a, e: 0xe0394a, E: 0x9c1f35, f: 0xffa53a, F: 0xd9741f },
    rows: ['              ', '     ee       ', '    eEee  ff  ', ' aa  ee  fFFf ', 'acaa aa  fFFf ', 'aaab acab  ff ', ' abb aabb ee  ', 'aa ab  aab aa ', 'acaaaaabaabacb', 'abbaabbbaabbbb'] },
  eggs: { colors: { y: 0xffd84a, Y: 0xe0a92c, h: 0xfff3a8, g: 0x58b85a },
    rows: ['              ', '    yyyy  yy  ', '  yyhhyyyyhyy ', ' yyhyyYyygyyyy', ' yyyyyyyhyYyyy', 'yyYyyyyyyyyyyy', 'yYYyyhyyyYyyYy', ' YYyyyygyYYyYY', '  YYYYYYYYYYY '] },
  chicken: { colors: { a: 0xe0963c, b: 0x9a5524, c: 0xffd08a, w: 0xfff6e8, W: 0xd8c9b0 },
    rows: ['              ', '              ', '   aaaa  aaa  ', '  acaaaaaaaaa ', ' wwabbaaabaawW', 'wwwwabbbbbaWww', 'wwcwwwwwwwwWww', 'wwwwwwwwwwWWww', ' WWWWWWWWWWWW '] },
  beef: { colors: { a: 0xb04a3a, b: 0x5a2a24, c: 0xf0c8b0, e: 0x8a3a1e },
    rows: ['              ', '              ', '  bbbbbbbbbb  ', ' bacccaaccaaab', ' bacaaaaaaaaab', 'bbbbbbbbbbbbbb', ' eaaccaaaccaae', '  eaaaaaaaaae '] },
  oatmeal: { colors: { a: 0xf0d6a0, b: 0xc29a5c, c: 0xfff0cc, u: 0x4a6ae0, U: 0x2a3a9a, h: 0xd8e4ff },
    rows: ['              ', '              ', '    aaaaaaaa  ', '  aaacaaaauaaa', ' aaauUaaaaaaaa', ' acaaaaaauUaab', 'aaabaauhUaaabb', 'aabbbaaaabbbbb', ' bbbbbbbbbbbb '] },
  mac: { colors: { a: 0xffb23a, b: 0xd98820, c: 0xffe08a },
    rows: ['              ', '              ', '   aa aaa  aa ', '  acaaaacaaaca', ' aa aabaaa aaa', 'aaacaaaaaabaaa', 'abaaabaaacaaab', 'aaabbaabaaabba', ' bbbbbbbbbbbb '] },
  tortilla: { colors: { a: 0xf4dcae, b: 0xd0a868, c: 0xfff2d2, d: 0xa8743a },
    rows: ['              ', '              ', '              ', '  cccccccccc  ', ' caaaaaaaaaab ', 'cadaaaaaadaaab', ' bbbbbbbbbbbb ', ' caaaaaadaaaab', 'cabbbbbbbbbbbb'] },
  soup: { colors: { e: 0xe2703a, E: 0xa8441e, f: 0xff9a3c, g: 0x5ccf5f, a: 0xe8c892 },
    rows: ['              ', '              ', '  eeeeeeeeee  ', ' eefeeegeeeeaee', 'eeeeeeeeefeeee', 'eegeeaeeeegeee', 'eeeefeeeeeeaee', ' EEEEEEEEEEEE '] },
};

const padGrid = (rows: string[], w: number, h: number) => rows.map(r => r.padEnd(w).slice(0, w)).concat(Array(Math.max(0, h - rows.length)).fill(' '.repeat(w))).slice(0, h);
/** The 14x14 hand-drawn grid and palette for one food id. NASA meals sit on the shared tray; crops reuse the original harvest art. */
function foodGrid(id: string): { rows: string[]; colors: Record<string, number> } {
  const meal = MEAL_ART[id];
  if (meal) return { rows: [...padGrid(meal.rows, 14, 10), ...MEAL_TRAY], colors: { ...TRAY_COLORS, ...meal.colors } };
  const kind = id as CropKind;
  const src = harvestRows(kind).map(r => r.trimEnd()), top = src.findIndex(r => r.trim() !== '');
  const body = src.slice(top).map(r => (' ' + r).padEnd(14).slice(0, 14));                     // 12 wide art centred in 14
  const rows = [...Array(Math.max(0, 13 - body.length)).fill(' '.repeat(14)), ...body.slice(0, 13), ' '.repeat(14)];
  return { rows: rows.slice(0, 14), colors: kind === 'wheat' ? { ...ITEM_PALETTE[kind], s: 0xb8743a } : ITEM_PALETTE[kind] };   // food art ties the wheat with twine, not the cyan tech strip
}
/** The coloured outline for an item: its darkest main colour pulled toward the ink, so every food keeps a warm or cool anime edge. */
const foodOutline = (colors: Record<string, number>) => { const vals = Object.values(colors); const dark = vals.reduce((m, c) => (lum(c) < lum(m) ? c : m), vals[0]); return mix(INK, dark, 0.35); };
const lum = (c: number) => ch(c, 16) * 0.3 + ch(c, 8) * 0.59 + ch(c, 0) * 0.11;
const WISP = [0xeaf6ff, 0xbfdcf2];

const upscale2 = (p: Pixels): Pixels => { const w = p.w * 2, h = p.h * 2, px = new Int32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px[y * w + x] = p.px[(y >> 1) * p.w + (x >> 1)]; return { w, h, px }; };
const edgeOutline = (p: Pixels, color: number): Pixels => {                                   // in-bounds 1px outline, no growth
  const out = Int32Array.from(p.px), at = (x: number, y: number) => x >= 0 && y >= 0 && x < p.w && y < p.h && p.px[y * p.w + x] !== -1;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.px[y * p.w + x] === -1 && (at(x + 1, y) || at(x - 1, y) || at(x, y + 1) || at(x, y - 1))) out[y * p.w + x] = color;
  return { w: p.w, h: p.h, px: out };
};
/** Soft light: pixels with empty space above or to the left get lighter, below or to the right get darker. Only inside the picture, before the outline. */
const softLight = (p: Pixels): Pixels => {
  const out = Int32Array.from(p.px), empty = (x: number, y: number) => x < 0 || y < 0 || x >= p.w || y >= p.h || p.px[y * p.w + x] === -1;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) { const c = p.px[y * p.w + x]; if (c === -1) continue;
    if (empty(x, y - 1) || empty(x - 1, y)) out[y * p.w + x] = shade(c, 1.18); else if (empty(x, y + 1) || empty(x + 1, y)) out[y * p.w + x] = shade(c, 0.82); }
  return { w: p.w, h: p.h, px: out };
};
const topOf = (p: Pixels, x: number) => { for (let y = 0; y < p.h; y++) if (p.px[y * p.w + x] !== -1) return y; return -1; };
/** Two or three wavy steam wisps rising from the top of the food. Drawn only into empty pixels. */
function addSteam(p: Pixels, tall: number, cols: number[]): void {
  cols.forEach((x0, i) => { let x = x0; const t = topOf(p, x0); if (t < 0) return;
    for (let k = 1; k <= tall; k++) { const y = t - k - 1; if (y < 0) break; x = x0 + (Math.floor((k + i) / 2) % 2 === 0 ? 0 : 1); if (x >= 0 && x < p.w && p.px[y * p.w + x] === -1) p.px[y * p.w + x] = WISP[k > tall - 2 ? 1 : 0]; } });
}
/** A small white plus-shaped sparkle on the lightest food pixel nearest the top-left (card) or one white pixel (tray). */
function addGlint(p: Pixels, big: boolean): void {
  let best = -1, bx = 0, by = 0;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) { const c = p.px[y * p.w + x]; if (c === -1) continue; const s = lum(c) * 2 - (x + y) * 1.5; if (s > best) { best = s; bx = x; by = y; } }
  if (best < 0) return;
  const put = (x: number, y: number, c: number) => { if (x >= 0 && y >= 0 && x < p.w && y < p.h) p.px[y * p.w + x] = c; };
  put(bx, by, 0xffffff); if (big) { put(bx - 1, by, 0xfff8d8); put(bx + 1, by, 0xfff8d8); put(bx, by - 1, 0xfff8d8); put(bx, by + 1, 0xfff8d8); }
}
/** The picture for one food id at tray (16x16 art px) or card (32x32 art px) size. Both are drawn at FOOD_SCALE. */
export function foodPixels(id: string, size: FoodSize): Pixels {
  const { rows, colors } = foodGrid(id), full = [' '.repeat(16), ...rows.map(r => ' ' + r.padEnd(14).slice(0, 14) + ' '), ' '.repeat(16)];
  const base = fromRows(full, colors), line = foodOutline(colors);
  if (size === 'tray') { const p = edgeOutline(base, line); if (GLINT_FOODS.includes(id)) addGlint(p, false); return p; }
  const big = softLight(upscale2(base));                                                      // card: more detail than the tray picture
  if (HOT_FOODS.includes(id)) addSteam(big, 7, [11, 17, 22]);
  if (GLINT_FOODS.includes(id)) addGlint(big, true);
  return edgeOutline(big, line);
}
