// Original pixel-art engine for My Red Planet characters and icons. Pure TypeScript (no Phaser),
// so it can be unit-tested. Characters are built from shaped parts on a 16x26 grid, then shaded and
// outlined automatically. Every frame is generated from a CharSpec, which is also what a future
// character creator will edit (skin, hair colour, hair style, outfit).

export const AW = 16, AH = 26;
export type Dir = 'down' | 'up' | 'side';
export type Pose = 'stand' | 'step1' | 'step2' | 'write1' | 'write2' | 'read1' | 'read2' | 'lie1' | 'lie2' | 'sleep1' | 'sleep2' | 'tray';
export type HairStyle = 'short' | 'bob' | 'bun' | 'crop' | 'curly' | 'long';
export interface CharSpec { skin: number; hair: number; hairStyle: HairStyle; top: number; bottom: number; shoes: number; accent: number; blanket?: number; eva?: boolean }

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
  else { g.rect(5, 12 + oy, 10, 12 + oy, TOP); g.rect(4, 13 + oy, 11, 16 + oy, TOP); g.rect(4, 17 + oy, 11, 17 + oy, BOTTOM); }
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
  g.rect(3, 13 + oy, 3, 15 + oy + l, ARM); g.set(3, 16 + oy + l, hand);
  g.rect(12, 13 + oy, 12, 15 + oy - l, ARM); g.set(12, 16 + oy - l, hand);
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
