// Generates flat-colour PLACEHOLDER art + atlas JSON. Real art replaces public/assets/atlas.png/json
// as long as it keeps every frame name listed in docs/ART_SPEC.md. Run: npm run assets
import { PNG } from 'pngjs';
import fs from 'node:fs';

const P = { // locked palette (see docs/ART_SPEC.md)
  sand: [201, 122, 82], sand2: [186, 105, 70], dust: [222, 150, 100], rock: [120, 68, 55], rock2: [92, 50, 44],
  floor: [214, 196, 168], floor2: [196, 176, 148], wall: [88, 96, 118], wall2: [64, 70, 90], glass: [150, 210, 225],
  soil: [96, 60, 44], soilWet: [66, 42, 34], green: [88, 170, 84], green2: [58, 130, 62], leaf: [140, 205, 100],
  tomato: [214, 72, 62], bean: [150, 190, 90], potato: [200, 170, 110], metal: [150, 156, 170], metal2: [100, 106, 120],
  panel: [36, 60, 130], panel2: [70, 110, 190], skin: [240, 200, 160], dark: [30, 24, 30], white: [245, 240, 232],
  red: [200, 60, 60], yellow: [240, 200, 80], orange: [230, 130, 50], teal: [60, 170, 170], purple: [130, 90, 170],
};
const CREW_COL = { player: P.orange, reyes: P.red, aiko: P.teal, david: P.yellow, sofia: P.purple };

const sprites = []; // {name,w,h,px: Uint8 rgba}
function sprite(name, w, h, fn) {
  const px = new Uint8Array(w * h * 4);
  const set = (x, y, c) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const i = (y * w + x) * 4; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255; };
  const rect = (x0, y0, ww, hh, c) => { for (let y = y0; y < y0 + hh; y++) for (let x = x0; x < x0 + ww; x++) set(x, y, c); };
  const border = (c) => { for (let x = 0; x < w; x++) { set(x, 0, c); set(x, h - 1, c); } for (let y = 0; y < h; y++) { set(0, y, c); set(w - 1, y, c); } };
  fn({ set, rect, border, w, h });
  sprites.push({ name, w, h, px });
}
const noise = (seed) => { let a = seed; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };

// ---- tiles
[['tile_ground_a', P.sand, 1], ['tile_ground_b', P.sand2, 2], ['tile_ground_dust', P.dust, 3]].forEach(([n, c, sd]) =>
  sprite(n, 16, 16, ({ rect, set }) => { rect(0, 0, 16, 16, c); const r = noise(sd); for (let i = 0; i < 14; i++) set((r() * 16) | 0, (r() * 16) | 0, P.sand2); }));
sprite('tile_floor', 16, 16, ({ rect, border }) => { rect(0, 0, 16, 16, P.floor); border(P.floor2); });
sprite('tile_wall', 16, 16, ({ rect, border }) => { rect(0, 0, 16, 16, P.wall); border(P.wall2); });
sprite('tile_glass', 16, 16, ({ rect, border }) => { rect(0, 0, 16, 16, P.glass); border(P.wall2); });
sprite('tile_door', 16, 16, ({ rect, border }) => { rect(0, 0, 16, 16, P.metal); rect(6, 2, 4, 12, P.metal2); border(P.wall2); });
sprite('tile_ridge', 16, 16, ({ rect, set }) => { rect(0, 0, 16, 16, P.rock); const r = noise(9); for (let i = 0; i < 20; i++) set((r() * 16) | 0, (r() * 16) | 0, P.rock2); });
sprite('tile_soil', 16, 16, ({ rect, border }) => { rect(0, 0, 16, 16, P.soil); border(P.soilWet); });
sprite('tile_soil_wet', 16, 16, ({ rect, border }) => { rect(0, 0, 16, 16, P.soilWet); border(P.dark); });
// ---- crops: 4 stages each
const CROPCOL = { lettuce: P.leaf, tomato: P.tomato, bean: P.bean, potato: P.potato };
for (const [id, col] of Object.entries(CROPCOL)) for (let st = 0; st < 4; st++)
  sprite(`crop_${id}_${st}`, 16, 16, ({ rect }) => {
    const h = 3 + st * 3; rect(7, 15 - h, 2, h, P.green2);
    if (st >= 1) rect(5, 15 - h + 1, 6, 2, P.green);
    if (st === 3) rect(6, 15 - h - 1, 4, 3, col);
  });
// ---- objects
sprite('obj_console', 16, 16, ({ rect, border }) => { rect(0, 4, 16, 12, P.metal2); rect(2, 6, 12, 5, P.teal); border(P.dark); });
sprite('obj_bed', 16, 16, ({ rect, border }) => { rect(0, 2, 16, 14, P.white); rect(0, 2, 16, 5, P.red); border(P.dark); });
sprite('obj_intercom', 16, 16, ({ rect, border }) => { rect(4, 3, 8, 10, P.metal); rect(6, 5, 4, 3, P.green); border(P.dark); });
sprite('obj_panel', 16, 16, ({ rect, border }) => { rect(1, 3, 14, 9, P.panel); rect(1, 7, 14, 1, P.panel2); rect(7, 3, 1, 9, P.panel2); rect(7, 12, 2, 4, P.metal2); border(P.dark); });
sprite('obj_cave', 16, 16, ({ rect }) => { rect(0, 0, 16, 16, P.rock); rect(3, 5, 10, 11, P.dark); rect(5, 3, 6, 3, P.dark); });
sprite('bld_solar_2', 32, 16, ({ rect, border }) => { rect(1, 2, 30, 10, P.panel); rect(1, 7, 30, 1, P.panel2); rect(15, 2, 1, 10, P.panel2); rect(14, 12, 4, 4, P.metal2); border(P.dark); });
sprite('bld_recycler', 16, 16, ({ rect, border }) => { rect(2, 2, 12, 14, P.metal); rect(4, 5, 8, 5, P.glass); border(P.dark); });
sprite('bld_shelter', 16, 16, ({ rect, border }) => { rect(0, 4, 16, 12, P.wall2); rect(5, 8, 6, 8, P.dark); border(P.dark); });
sprite('bld_rover_bay', 32, 16, ({ rect, border }) => { rect(0, 2, 32, 14, P.wall); rect(6, 6, 20, 10, P.dark); border(P.wall2); });
sprite('obj_rover', 32, 16, ({ rect, border }) => { rect(2, 4, 28, 8, P.metal); rect(6, 1, 12, 4, P.glass); rect(4, 12, 6, 4, P.dark); rect(22, 12, 6, 4, P.dark); border(P.dark); });
// ---- characters: 16x32, 4 directions x 2 walk frames
for (const [id, col] of Object.entries(CREW_COL))
  for (const dir of ['down', 'up', 'left', 'right']) for (let f = 0; f < 2; f++)
    sprite(`char_${id}_${dir}_${f}`, 16, 32, ({ rect, set }) => {
      rect(4, 6, 8, 8, P.skin);                  // head
      rect(4, 4, 8, 3, P.dark);                  // hair
      rect(3, 14, 10, 10, col);                  // body
      rect(4, 24, 3, 7 - (f ? 1 : 0), P.dark);   // legs (walk wobble)
      rect(9, 24, 3, 7 - (f ? 0 : 1), P.dark);
      if (dir === 'down') { set(6, 10, P.dark); set(9, 10, P.dark); }
      if (dir === 'left') set(5, 10, P.dark);
      if (dir === 'right') set(10, 10, P.dark);
    });

// ---- pack (shelf) and write
const W = 512; let x = 0, y = 0, rowH = 0; const frames = {};
for (const s of [...sprites].sort((a, b) => b.h - a.h)) {
  if (x + s.w > W) { x = 0; y += rowH; rowH = 0; }
  s.x = x; s.y = y; x += s.w; rowH = Math.max(rowH, s.h);
}
const H = y + rowH;
const png = new PNG({ width: W, height: H });
for (const s of sprites) {
  for (let j = 0; j < s.h; j++) for (let i = 0; i < s.w; i++) {
    const a = (j * s.w + i) * 4, b = ((s.y + j) * W + (s.x + i)) * 4;
    png.data[b] = s.px[a]; png.data[b + 1] = s.px[a + 1]; png.data[b + 2] = s.px[a + 2]; png.data[b + 3] = s.px[a + 3];
  }
  frames[s.name] = { frame: { x: s.x, y: s.y, w: s.w, h: s.h }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: s.w, h: s.h }, sourceSize: { w: s.w, h: s.h } };
}
fs.mkdirSync('public/assets', { recursive: true });
fs.writeFileSync('public/assets/atlas.png', PNG.sync.write(png));
fs.writeFileSync('public/assets/atlas.json', JSON.stringify({ frames, meta: { image: 'atlas.png', size: { w: W, h: H }, scale: '1', format: 'RGBA8888' } }, null, 1));
fs.writeFileSync('docs/frames.generated.txt', Object.keys(frames).sort().join('\n') + '\n');
console.log(`atlas: ${sprites.length} frames, ${W}x${H}`);
