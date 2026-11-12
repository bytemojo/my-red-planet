// Original, hand-authored pixel sprites for My Red Planet.  These are drawn into
// Phaser textures at boot so the game stays offline and has no copied game art.
// The tiny source grids deliberately use hard pixel edges: Phaser's camera rounds
// pixels, so they remain crisp at every supported zoom.
// @ts-nocheck

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

const person = (scene: any, key: string, opts: any, step = 0) => {
  const legA = step === 1 ? ' L ' : 'l l';
  const legB = step === 2 ? 'l L' : legA;
  const rows = [
    '       hhh      ',
    opts.hair === 'curl' ? '      hhhhh     ' : '     hhhhhhh    ',
    '     hsssss     ',
    '     hsese s    ',
    '     hsssss     ',
    '      sssss     ',
    '     ooooooo    ',
    '    oobbbbb oo  ',
    '   obbbbbbbbbo  ',
    '   obbbbbbbbbo  ',
    '   obbbbbbbbbo  ',
    '    obbbbbbb o  ',
    '      bbbbbb    ',
    `      ${legA}     `,
    `      ${legB}     `,
  ];
  const colors: Palette = { h: opts.hairColor, s: opts.skin, e: 0x34261f, o: 0x19223a, b: opts.body, l: 0x29344a, L: 0x3f506d };
  texture(scene, key, rows, colors, 2);
};

const suit = (scene: any, key: string, step = 0) => {
  const left = step === 1 ? ' L ' : 'l l', right = step === 2 ? 'l L' : left;
  const rows = [
    '      wwwww     ', '     wvvvvvw    ', '    wvcccccwv   ', '    wvcccccwv   ',
    '     wwwwwww    ', '    ggggggggg   ', '   ggygggggygg  ', '  gggggggggggg  ',
    '  gggggggggggg  ', '  ggmmmmmmmggg  ', '   gggggggggg   ', '    gggggggg    ',
    `      ${left}     `, `      ${right}     `,
  ];
  texture(scene, key, rows, { w: 0xeaf4ff, v: 0x203b67, c: 0x54d8f3, g: 0xc6d4e6, y: 0xffbd45, m: 0x7890b5, l: 0x25314b, L: 0x49627f }, 2);
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

export const createPixelSprites = (scene: any) => {
  // The junior explorer has home clothes and EVA frames; each frame is an original sprite.
  [0, 1, 2].forEach(step => { person(scene, `ah${step}`, { hairColor: 0x3a241d, skin: 0xf1c39d, body: 0xe87838 }, step); suit(scene, `as${step}`, step); });
  const crew = {
    reyes: { hairColor: 0x30201b, skin: 0x9d6648, body: 0xc94b4a, hair: 'short' },
    aiko: { hairColor: 0x161a28, skin: 0xe4ae82, body: 0x38a9a3, hair: 'curl' },
    david: { hairColor: 0x563823, skin: 0xf0c69d, body: 0xdbb53d, hair: 'short' },
    sofia: { hairColor: 0x6d3826, skin: 0x8b573d, body: 0x8262b6, hair: 'curl' },
  };
  Object.entries(crew).forEach(([id, opts]) => person(scene, `npc_${id}`, opts, 0));
  ['lettuce', 'tomato', 'bean', 'potato'].forEach(k => [0, 1, 2, 3].forEach(stage => crop(scene, k, stage)));
  machine(scene, 'machine_oxygen', 0x5ee7ce, 0x46d8ff);
  machine(scene, 'machine_water', 0x79b9ff, 0x4c8eff);
};
