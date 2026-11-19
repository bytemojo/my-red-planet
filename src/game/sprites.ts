// Original, hand-authored pixel sprites for My Red Planet.  These are drawn into
// Phaser textures at boot so the game stays offline and has no copied game art.
// The tiny source grids deliberately use hard pixel edges: Phaser's camera rounds
// pixels, so they remain crisp at every supported zoom.
// @ts-nocheck
import { FOOD_ART_IDS, foodFrameName, foodPixels, CROP_KINDS, CROP_PALETTE, cropFrameName, cropRows, harvestFrameName, harvestRows, seedFrameName, seedPalette, seedRows, ITEM_PALETTE, type CropKind, AW, AH, ACTION_FRAME_COUNT, actFrameName, actionFrame, bubble, carryFrame, carryFrameName, character, icon, propGrip, propPixels, PROP_ART, type ActionPoseName, type CharSpec, type Dir, type Hand, type Pixels, type Pose, type PropArt } from './pixelart';

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

const crop = (scene: any, kind: CropKind, stage: number | 'wilted') => texture(scene, cropFrameName(kind, stage), cropRows(kind, stage), CROP_PALETTE[kind], 2);


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
// The character creator's choices on top of the player's orange flight suit.
export const lookToSpec = (look: { skin: number; hair: number; style: 'long' | 'short' }): CharSpec => ({ ...PLAYER_LOOK, skin: look.skin, hair: look.hair, hairStyle: look.style, build: look.style === 'long' ? 'slim' : 'broad' });

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
// Action poses (reach, crouch, pour, kneel, pull, suit-up, sleep) and carry-walk frames live on a second
// sheet, 'player_act', so neither texture gets near a GPU's maximum width. Frame names are prefixed
// 'in_' (indoor clothes) or 'ev_' (EVA suit), e.g. 'in_act_reach_3' or 'ev_carry_side_step1'.
// FRAME_HANDS[name without prefix] = where the hand is (art pixels), so a held prop sits in the hand.
export const FRAME_HANDS: Record<string, Hand> = {};
export const PLAYER_ACT = 'player_act';
const POSES = Object.keys(ACTION_FRAME_COUNT) as ActionPoseName[];
const actFrames = (spec: CharSpec, prefix: string): [string, Pixels][] => {
  const out: [string, Pixels][] = [];
  for (const pose of POSES) for (let i = 0; i < ACTION_FRAME_COUNT[pose]; i++) { const f = actionFrame(spec, pose, i); FRAME_HANDS[actFrameName(pose, i)] = f.hand; out.push([prefix + actFrameName(pose, i), f.px]); }
  for (const d of DIRS) for (const w of WALK) { const f = carryFrame(spec, d, w); FRAME_HANDS[carryFrameName(d, w)] = f.hand; out.push([prefix + carryFrameName(d, w), f.px]); }
  return out;
};
// Rebuild the player's sheets (indoor clothes + EVA suit). Call again when the look changes.
export function buildPlayerSheet(scene: any, look: CharSpec = PLAYER_LOOK) {
  sheet(scene, 'player', [...charFrames(look, 'in_'), ...charFrames({ ...look, eva: true }, 'ev_')]);
  sheet(scene, PLAYER_ACT, [...actFrames(look, 'in_'), ...actFrames({ ...look, eva: true }, 'ev_')]);
}

// Props the explorer can carry. Frame name = prop id. PROP_GRIPS[id] = the grip point in WORLD pixels.
export const PROP_GRIPS: Record<string, Hand> = {};
export function buildPropSheet(scene: any) {
  const ids = Object.keys(PROP_ART) as PropArt[];
  ids.forEach(id => { const g = propGrip(id); PROP_GRIPS[id] = [g[0] * PX, g[1] * PX]; });
  sheet(scene, 'props', ids.map(id => [id, propPixels(id)] as [string, Pixels]));
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
  buildPropSheet(scene);
  for (const [id, spec] of Object.entries(CREW_LOOKS)) sheet(scene, `crew_${id}`, charFrames(spec));
  sheet(scene, 'icons', [
    ...['happy', 'neutral', 'sad', 'heart', 'zzz'].map(n => [`mood_${n}`, icon(n)] as [string, Pixels]),
    ...['food', 'water', 'ready', 'heart'].map(n => [`bubble_${n}`, bubble(n)] as [string, Pixels]),
  ]);
  CROP_KINDS.forEach(k => [0, 1, 2, 3, 4, 'wilted'].forEach(stage => crop(scene, k, stage)));
  CROP_KINDS.forEach(k => { texture(scene, seedFrameName(k), seedRows(k), seedPalette(k), 2); texture(scene, harvestFrameName(k), harvestRows(k), ITEM_PALETTE[k], 2); }); // Step 5c item sprites
  for (const size of ['card', 'tray'] as const) sheet(scene, `food_${size}`, FOOD_ART_IDS.map(id => [foodFrameName(id, size), foodPixels(id, size)] as [string, Pixels])); // Step 9b: frames food_card_<id> (64px) / food_tray_<id> (32px)
};
