// Original, hand-authored pixel sprites for My Red Planet.  These are drawn into
// Phaser textures at boot so the game stays offline and has no copied game art.
// The tiny source grids deliberately use hard pixel edges: Phaser's camera rounds
// pixels, so they remain crisp at every supported zoom.
// @ts-nocheck
import { AW, AH, bubble, character, icon, type CharSpec, type Dir, type Pixels, type Pose } from './pixelart';

type Palette = Record<string, number>;

const paint = (g: any, rows: string[], colors: Palette, scale = 2) => {
  rows.forEach((row, y) => [...row].forEach((px, x) => {
    const color = colors[px];
    if (color !== undefined) { g.fillStyle(color, 1); g.fillRect(x * scale, y * scale, scale, scale); }
  }));
};

const texture = (scene: any, key: string, rows: string[], colors: Palette, scale = 2) => {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  paint(g, rows, colors, scale);
  g.generateTexture(key, rows[0].length * scale, rows.length * scale);
  g.destroy();
};

const crop = (scene: any, kind: string, stage: number) => {
  const palette: Record<string, Palette> = {
    lettuce: { d: 0x573e28, m: 0x356c39, l: 0x7fdf77, h: 0xd4ffd0, f: 0xeaffd0 },
    tomato: { d: 0x573e28, m: 0x2c6a3a, l: 0x60c764, h: 0xa8ed91, f: 0xff5b4c },
    bean: { d: 0x573e28, m: 0x316b37, l: 0x8ccf64, h: 0xd1f59e, f: 0xd2e97c },
    potato: { d: 0x573e28, m: 0x305f37, l: 0x67b862, h: 0xa2e691, f: 0xd7ad6e },
  };
  const rows = Array.from({ length: 16 }, (_, y) => y > 11 ? 'dddddddddddddddd' : '                ');
  const put = (x: number, y: number, c: string) => { const a = [...rows[y]]; a[x] = c; rows[y] = a.join(''); };
  // Stem and leaves become denser at each state; ripe crops add a distinct fruit color.
  if (stage > 0) { put(8, 11, 'm'); put(8, 10, 'm'); }
  if (stage > 1) {
    [[6, 10], [7, 9], [9, 9], [10, 10], [5, 10], [11, 10]].forEach(([x, y]) => put(x, y, 'l'));
    [[7, 10], [9, 10], [8, 8]].forEach(([x, y]) => put(x, y, 'h'));
  }
  if (stage > 2) {
    [[4, 9], [5, 8], [6, 8], [7, 7], [9, 7], [10, 8], [11, 8], [12, 9], [6, 6], [10, 6]].forEach(([x, y]) => put(x, y, 'l'));
    [[5, 9], [7, 8], [9, 8], [11, 9], [8, 6]].forEach(([x, y]) => put(x, y, 'h'));
  }
  if (stage === 3) {
    const fruit = kind === 'lettuce' ? [[8, 6]] : kind === 'bean' ? [[5, 9], [11, 8]] : [[6, 9], [10, 9], [8, 6]];
    fruit.forEach(([x, y]) => { put(x, y, 'f'); if (x + 1 < 16) put(x + 1, y, 'f'); });
  }
  texture(scene, `crop_${kind}_${stage}`, rows, palette[kind], 2);
};

const machine = (scene: any, key: string, accent: number, screen: number) => {
  const rows = [
    '    mmmmmmmm    ', '   mhhhhhhhm    ', '  mhhhhhhhhhm   ', '  mhssssssshm   ',
    '  mhsccccshm   ', '  mhsccccshm   ', '  mhssssssshm   ', '  mhhhhhhhhhm   ',
    '  mmmmmmmmmmm   ', '  mbbbbbbbbbm   ', '  mbbbaabbbbm   ', '  mbbbbbbbbbm   ',
    '  mmm mmmm mm   ', '  xx  mmmm  xx  ',
  ];
  texture(scene, key, rows, { m: 0x17243d, h: 0x7e93b5, s: 0x0c1830, c: screen, b: 0x3c5277, a: accent, x: 0x202a3c }, 2);
};


// Each character becomes one canvas texture with named frames, e.g. 'crew_aiko' frame 'side_step1'.
export const PX = 2; // one art pixel = 2 world pixels
export const CHAR_W = AW * PX, CHAR_H = AH * PX;
export const WALK: Pose[] = ['stand', 'step1', 'step2'];
export const DIRS: Dir[] = ['down', 'up', 'side'];
const EXTRA: Pose[] = ['write1', 'write2', 'read1', 'read2', 'lie1', 'lie2', 'sleep1', 'sleep2', 'tray'];
export const frameName = (dir: Dir, pose: Pose) => (EXTRA.includes(pose) ? pose : `${dir}_${pose}`);

export const CREW_LOOKS: Record<string, CharSpec> = {
  reyes: { skin: 0x9d6648, hair: 0x2a1a16, hairStyle: 'bob', top: 0xc94b4a, bottom: 0x3d4766, shoes: 0xe9e6f2, accent: 0xffd84a, blanket: 0x6f8fd0 },
  aiko: { skin: 0xe8b48a, hair: 0x1b1f30, hairStyle: 'bun', top: 0x38a9a3, bottom: 0x2f5f6a, shoes: 0xf3d3dc, accent: 0xffb3c7, blanket: 0xf2a7b8 },
  david: { skin: 0x6b4128, hair: 0x1a1210, hairStyle: 'crop', top: 0xdbb53d, bottom: 0x4a4f63, shoes: 0x2b2f3d, accent: 0x39d9ff, blanket: 0x6fae73 },
  sofia: { skin: 0xc98d63, hair: 0x5a2c1c, hairStyle: 'curly', top: 0x8262b6, bottom: 0x3b3557, shoes: 0xdcd3f2, accent: 0xffd84a, blanket: 0xe0a35a },
};
export const PLAYER_LOOK: CharSpec = { skin: 0xf1c39d, hair: 0x3a241d, hairStyle: 'short', top: 0xe8823a, bottom: 0xcf6a2c, shoes: 0x3b3f55, accent: 0x39d9ff };

const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
function sheet(scene: any, key: string, frames: [string, Pixels][]) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const fw = Math.max(...frames.map(([, p]) => p.w)) * PX, fh = Math.max(...frames.map(([, p]) => p.h)) * PX;
  const tex = scene.textures.createCanvas(key, fw * frames.length, fh);
  const ctx = tex.getContext();
  frames.forEach(([name, p], i) => {
    const ox = i * fw, oy = fh - p.h * PX; // bottom-aligned
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) { const c = p.px[y * p.w + x]; if (c === -1) continue; ctx.fillStyle = hex(c); ctx.fillRect(ox + x * PX, oy + y * PX, PX, PX); }
    tex.add(name, 0, ox, oy, p.w * PX, p.h * PX);
  });
  tex.refresh();
}
const charFrames = (spec: CharSpec, prefix = ''): [string, Pixels][] => {
  const out: [string, Pixels][] = [];
  for (const d of DIRS) for (const p of WALK) out.push([prefix + frameName(d, p), character(spec, d, p)]);
  if (!spec.eva) for (const p of EXTRA) out.push([prefix + p, character(spec, p === 'tray' ? 'up' : 'side', p)]);
  return out;
};
// Rebuild the player's sheet (indoor clothes + EVA suit). Call again when the look changes.
export function buildPlayerSheet(scene: any, look: CharSpec = PLAYER_LOOK) {
  sheet(scene, 'player', [...charFrames(look, 'in_'), ...charFrames({ ...look, eva: true }, 'ev_')]);
}

// Soft radial light used for lamps and outdoor lights at night.
export function createGlowTexture(scene: any) {
  if (scene.textures.exists('glow')) return;
  const tex = scene.textures.createCanvas('glow', 128, 128); const ctx = tex.getContext();
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128); tex.refresh();
}

export const createPixelSprites = (scene: any) => {
  createGlowTexture(scene);
  buildPlayerSheet(scene);
  for (const [id, spec] of Object.entries(CREW_LOOKS)) sheet(scene, `crew_${id}`, charFrames(spec));
  sheet(scene, 'icons', [
    ...['happy', 'neutral', 'sad', 'heart', 'zzz'].map(n => [`mood_${n}`, icon(n)] as [string, Pixels]),
    ...['food', 'water', 'ready', 'heart'].map(n => [`bubble_${n}`, bubble(n)] as [string, Pixels]),
  ]);
  ['lettuce', 'tomato', 'bean', 'potato'].forEach(k => [0, 1, 2, 3].forEach(stage => crop(scene, k, stage)));
  machine(scene, 'machine_oxygen', 0x5ee7ce, 0x46d8ff);
  machine(scene, 'machine_water', 0x79b9ff, 0x4c8eff);
};
