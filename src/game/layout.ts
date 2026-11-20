// @ts-nocheck
// Pure world layout (Step 4b): the collision grid, zones and tap/walk markers. No Phaser, no DOM, so tests can import it.
// world.ts draws from buildLayout(); WorldScene.ts uses ZONES and MARKERS; tests/pathfinding.test.ts walks the real grid.
import { SOLAR_PANEL_ORIGINS } from './solar-panel-layout';
import { PROP_RACKS, rackMarker, rackZone } from './racks';
import { PUMP, PUMP_MARKER, PUMP_ZONE } from './pump';
import { LEVER, LEVER_MARKER, LEVER_ZONE } from './lever';
import { ICE_MARKER, ICE_SHEET, ICE_ZONE, INTAKE, INTAKE_MARKER, INTAKE_ZONE } from './icesheet';
import { GAME_TABLES, POD, POD_MARKER, POD_ZONE, REC, REC_BLOCKS, WIKI_MARKER, WIKI_SCREEN, WIKI_ZONE, tableMarker, tableZone } from './recroom';

export const T = 32, W = 64, H = 44; // Step 28a: was 44 x 30
export const PLAYER_START = { x: 16, y: 14 }; // world.ts spawns the player at (16*T, 14.5*T)

// Furniture footprints in tiles [x, y, w, h] (collision).
export const WING_BLOCKS: [number, number, number, number][] = [
  [33, 4, 2, 1],                 // cycle ergometer
  [36, 3, 2, 1],                 // rowing machine, folded against the north wall
  [30, 13, 2, 1], [33, 13, 2, 1], [30, 17, 2, 1], // lab bench leaves tile 32 clear as the doorway
  [36, 13, 1, 1], [38, 13, 1, 1], [36, 16, 3, 2], // bathroom: sink, space toilet, shower stall
];

// Kitchen (moved into the SE corner of the indoor farm, under bed 3): interior x12-13, y7-9. Back wall y6 (counter wall face), counter row y7 (blocked),
// table (13,8) (blocked). Open on the west (greenhouse) and the south (corridor, next to the meal hatch): no wall on that corner. The cook stands on (12,8)/(12,9)/(13,9).
// Step 6a: the grow beds (2x2 tiles, top-left corner). Bed i belongs to plot i. Beds 1-3 are worked from their south side, beds 4-5 from the north.
export const FARM_BEDS: readonly [number, number][] = [[6, 3], [9, 3], [12, 3], [5, 7], [8, 7]];
export const bedStand = (i: number): { x: number; y: number } => { const [bx, by] = FARM_BEDS[i]; return { x: (bx + 1) * T, y: (by < 5 ? by + 2.55 : by - 0.45) * T }; };
// Step 6c: which room the explorer stands in (tile rectangles, first match wins; the kitchen sits inside the farm's footprint).
// The room-name labels in the world hide while you are inside that room and sit at half strength elsewhere.
export const ROOM_RECTS: [string, number, number, number, number][] = [
  ['kitchen', 11, 6, 13, 9], ['farm', 5, 3, 13, 8], ['control', 15, 3, 16, 5], ['comms', 18, 13, 22, 17], ['rec', 24, 13, 28, 17],
  ['gym', 30, 3, 38, 8], ['lab', 30, 13, 34, 17], ['bath', 36, 13, 38, 17], ['airlock', 14, 17, 17, 19], ['storage', 19, 19, 28, 20],
];
export const roomAt = (tx: number, ty: number): string | null => ROOM_RECTS.find(([, x0, y0, x1, y1]) => tx >= x0 && tx <= x1 && ty >= y0 && ty <= y1)?.[0] ?? null;
export const KITCHEN = { x0: 12, y0: 7, x1: 13, y1: 9, wallY: 6 };
// Storage annex south of Comms: door at tile (19,18) from the comms room.
export const STORAGE = { x0: 19, x1: 28, y0: 19, y1: 20, door: [19, 18] as [number, number] };
export const STORAGE_WALL_Y = 21; // south wall row; west wall x=18 and east wall x=29 run from y19 to y21
export const STORAGE_BLOCKS: [number, number, number, number][] = [[23, 19, 6, 1]]; // shelving units (collision)
export const STORAGE_BINS = [
  { id: 'food', name: 'NASA\nFOOD', tag: 0x4dffb0 }, { id: 'seeds', name: 'SEEDS', tag: 0xff9fd8 }, { id: 'tools', name: 'TOOLS', tag: 0xffb340 },
  { id: 'parts', name: 'SPARE\nPARTS', tag: 0xff6b6b }, { id: 'filters', name: 'WATER\nFILTERS', tag: 0x39d9ff }, { id: 'eva', name: 'EVA\nGEAR', tag: 0xc9a6ff },
] as const;
export const BIN_TILE_X = (i: number) => 23 + i;
export const binZoneId = (id: string) => `bin_${id}`;
export const binZone = (i: number) => ({ x0: 23 + i, y0: STORAGE.y1, x1: 23 + i, y1: STORAGE.y1, label: `Open ${STORAGE_BINS[i].name.replace('\n', ' ')} Bin`, inside: true });
export const binMarker = (i: number): [number, number] => [23 + i + 0.5, STORAGE.y1 + 0.45];

export type Zone = { x0: number; y0: number; x1: number; y1: number; label: string; inside: boolean };
const RACK_ZONES: Record<string, Zone> = Object.fromEntries(PROP_RACKS.map(r => [r.zone, rackZone(r)]));
const RACK_MARKERS: Record<string, [number, number]> = Object.fromEntries(PROP_RACKS.map(r => [r.zone, rackMarker(r)]));
const BIN_ZONES: Record<string, Zone> = Object.fromEntries(STORAGE_BINS.map((b, i) => [binZoneId(b.id), binZone(i)]));
const BIN_MARKERS: Record<string, [number, number]> = Object.fromEntries(STORAGE_BINS.map((b, i) => [binZoneId(b.id), binMarker(i)]));

export const ZONES: Record<string, Zone> = {
  [INTAKE.zone]: INTAKE_ZONE, [ICE_SHEET.zone]: ICE_ZONE, [PUMP.zone]: PUMP_ZONE, [LEVER.zone]: LEVER_ZONE, [POD.zone]: POD_ZONE, [WIKI_SCREEN.zone]: WIKI_ZONE, ...Object.fromEntries(GAME_TABLES.map(t => [t.zone, tableZone(t)])), ...RACK_ZONES, ...BIN_ZONES, // first, so a rack wins over the bigger Check Farm zone it sits inside
  kitchen: { x0: 11, y0: 7, x1: 13, y1: 9, label: 'Cook in Kitchen', inside: true }, // before farm: the kitchen sits inside the farm's footprint
  farm: { x0: 5, y0: 3, x1: 13, y1: 8, label: 'Check Farm', inside: true }, ls: { x0: 18, y0: 3, x1: 28, y1: 8, label: 'Check Air & Water', inside: true },
  comms: { x0: 18, y0: 13, x1: 22, y1: 17, label: 'Check Comms', inside: true }, control: { x0: 15, y0: 3, x1: 16, y1: 5, label: 'Open Control', inside: true },
  sick: { x0: 8, y0: 11, x1: 9, y1: 11, label: 'Use Intercom', inside: true },
  hatch: { x0: 11, y0: 11, x1: 12, y1: 11, label: 'Deliver to Meal Hatch', inside: true },
  suit: { x0: 15, y0: 16, x1: 16, y1: 16, label: 'Suit Rack', inside: true },
  solar: { x0: 9, y0: 20, x1: 30, y1: 27, label: 'Check Solar', inside: false }, rover: { x0: 30, y0: 19, x1: 37, y1: 24, label: 'Use Rover', inside: false },
  cave: { x0: 37, y0: 23, x1: 41, y1: 27, label: 'Look at the Cave', inside: false },
  dish: { x0: 40, y0: 10, x1: 41, y1: 11, label: 'Outdoor Dish', inside: false }, // Step 14c: the dish itself sits on blocked rock (40-41,8-9); you work it from the strip just south
  bands: { x0: 30, y0: 4, x1: 31, y1: 5, label: 'Resistance Bands', inside: true },
  bike: { x0: 33, y0: 5, x1: 34, y1: 6, label: 'Cycle Ergometer', inside: true },
  rower: { x0: 36, y0: 4, x1: 38, y1: 6, label: 'Rowing Machine', inside: true },
  microscope: { x0: 31, y0: 14, x1: 31, y1: 14, label: 'Use Microscope', inside: true }, // Step 29b: before 'lab' (the bigger zone) so the microscope wins on its own tile
  lab: { x0: 30, y0: 14, x1: 34, y1: 15, label: 'Science Lab', inside: true },
  bath: { x0: 36, y0: 13, x1: 38, y1: 15, label: 'Bathroom', inside: true },
};
export const MARKERS: Record<string, [number, number]> = { [INTAKE.zone]: INTAKE_MARKER, [ICE_SHEET.zone]: ICE_MARKER, [PUMP.zone]: PUMP_MARKER, [LEVER.zone]: LEVER_MARKER, [POD.zone]: POD_MARKER, [WIKI_SCREEN.zone]: WIKI_MARKER, ...Object.fromEntries(GAME_TABLES.map(t => [t.zone, tableMarker(t)])), ...RACK_MARKERS, ...BIN_MARKERS, farm: [9.5, 5.6], ls: [22.5, 6], comms: [21, 14.6], solar: [19, 24.6], control: [16, 4.5], rover: [34.5, 23], cave: [39.5, 26.7], dish: [40.9, 10.7], bands: [31, 5.3], bike: [33.9, 5.9], rower: [37, 5.9], microscope: [31.4, 14.6], lab: [32, 14.8], bath: [37.5, 14.8], sick: [8.5, 11.7], kitchen: [12.5, 8.6], hatch: [11.5, 11.7], suit: [16, 16.6] };
/**
 * Step 24b: CLICK BOXES. A click only counts as "use this object" when it lands on the object itself (its footprint plus CLICK_PAD px),
 * never anywhere in the room. Tile rectangles [x, y, w, h]. Zones not listed here are already object-sized (racks, bins, pump, lever, pod, tables,
 * wiki screen, ice, intake, hatch, suit rack, intercom, dish, gym machines, lab bench, bathroom) so their zone rectangle is the box. 'solar' uses the panel tiles.
 */
export const CLICK_PAD = 8;
export const CLICK_BOXES: Record<string, [number, number, number, number][]> = {
  farm: FARM_BEDS.map(([x, y]) => [x, y, 2, 2] as [number, number, number, number]), // one box per grow bed
  ls: [[19, 3, 3, 2], [24, 3, 3, 2]],                                                // oxygen unit, water maker
  comms: [[20, 16, 3, 1]],                                                           // the comms console
  control: [[15, 3, 2, 1]],                                                          // the control module screen
  kitchen: [[KITCHEN.x0, KITCHEN.wallY, 2, KITCHEN.y0 - KITCHEN.wallY + 2]],          // counter wall + appliances + prep island
  rover: [[33, 21, 3, 2]],
  cave: [[38, 24, 3, 3]],
  microscope: [[31, 12, 1, 2]],                                                       // Step 29b: the microscope on the west lab bench
};
/** Does a click at world pixel (px, py) land on the object of zone `key`? Pure. */
export function objectHit(key: string, px: number, py: number): boolean {
  const boxes = CLICK_BOXES[key] ?? (ZONES[key] ? [[ZONES[key].x0, ZONES[key].y0, ZONES[key].x1 - ZONES[key].x0 + 1, ZONES[key].y1 - ZONES[key].y0 + 1] as [number, number, number, number]] : []);
  return boxes.some(([x, y, w, h]) => px >= x * T - CLICK_PAD && px <= (x + w) * T + CLICK_PAD && py >= y * T - CLICK_PAD && py <= (y + h) * T + CLICK_PAD);
}
// ---- Step 28a: the BIGGER OUTSIDE MAP. The outdoor area is about 2x larger: the grid grew east (x42-61) and south (y28-41). Old zones, rocks and craters stay where they were.
// Terrain data only (art comes in 28b): 'open' plain regolith, 'rockfield' dense rocks, 'dune' a walkable dune ridge, 'crater' a walkable bowl, 'rim' the blocked back rim of a crater,
// 'pad' the metal truck pad. Everything the player can walk on is reachable from the start (tests/pathfinding.test.ts); sealed pockets are filled with rocks.
export const MAP_EDGE = 2; // tiles of solid ridge around the whole map
export type Terrain = 'open' | 'rockfield' | 'dune' | 'crater' | 'rim' | 'pad';
export const isNewOutdoor = (x: number, y: number): boolean => x >= 42 || y >= 28;
export const ROCK_FIELDS = [
  { x0: 46, y0: 3, x1: 57, y1: 11, density: 0.2 }, { x0: 4, y0: 36, x1: 14, y1: 40, density: 0.2 },
  { x0: 42, y0: 30, x1: 56, y1: 34, density: 0.18 }, { x0: 24, y0: 39, x1: 40, y1: 40, density: 0.22 },
];
/** The dune ridge: a wavy band 3 tiles thick across the south, walkable. */
export const duneY = (x: number): number => 37 + Math.round(2 * Math.sin(x / 5));
export const DUNE = { x0: 4, x1: 59 };
/** Craters [centre x, centre y, radius]: a walkable bowl with a blocked rim on the north side only (open to the south). */
export const CRATERS: [number, number, number][] = [[8, 31, 3], [22, 32, 3], [52, 22, 4], [57, 29, 3], [47, 15, 3]];
export type Landmark = { id: string; label: string; x0: number; y0: number; x1: number; y1: number; stand: [number, number]; existing: boolean };
/** Landmarks of the outside world. DATA ONLY: no interaction here (the rover, cave and truck get theirs in 28c-28h). Only the truck bay is new; the rest keep their old place. */
export const LANDMARKS: Landmark[] = [
  { id: 'rover_site', label: 'Rover site', x0: 30, y0: 19, x1: 37, y1: 24, stand: [34.5, 23.6], existing: true },
  { id: 'cave_mouth', label: 'Cave mouth', x0: 37, y0: 23, x1: 41, y1: 27, stand: [39.5, 27.4], existing: true },
  { id: 'ice_sheet', label: 'Ice sheet', x0: ICE_SHEET.x0 ?? 0, y0: ICE_SHEET.y0 ?? 0, x1: ICE_SHEET.x1 ?? 0, y1: ICE_SHEET.y1 ?? 0, stand: ICE_MARKER, existing: true },
  { id: 'truck_bay', label: 'Truck bay', x0: 32, y0: 30, x1: 37, y1: 33, stand: [34.5, 29.6], existing: false },
];
function mulberry(seed: number) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
/** Fills `terrain` and adds blocked rocks (pushed into `rocks` so world.ts draws them). Only touches the NEW outdoor tiles. Pure and deterministic. */
export function buildOutside(blocked: boolean[][], rocks: number[][], inside: boolean[][], start: { x: number; y: number }) {
  const rng = mulberry(2036);
  const terrain: Terrain[][] = Array.from({ length: H }, () => Array(W).fill('open'));
  const free = (x: number, y: number) => x >= MAP_EDGE && y >= MAP_EDGE && x < W - MAP_EDGE && y < H - MAP_EDGE && isNewOutdoor(x, y) && !blocked[y][x];
  const addRock = (x: number, y: number, w = 1) => { rocks.push([x, y, w, rng()]); for (let i = 0; i < w; i++) blocked[y][x + i] = true; };
  const inBox = (b: { x0: number; y0: number; x1: number; y1: number }, x: number, y: number) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
  const reserved = (x: number, y: number) => LANDMARKS.some(l => !l.existing && x >= l.x0 - 1 && x <= l.x1 + 1 && y >= l.y0 - 1 && y <= l.y1 + 1) || (x >= 38 && x <= 43 && y >= 7 && y <= 28); // truck bay + a clear lane east of the base, dish and cave
  // truck pad
  for (const l of LANDMARKS) if (!l.existing) for (let y = l.y0; y <= l.y1; y++) for (let x = l.x0; x <= l.x1; x++) terrain[y][x] = 'pad';
  // dune ridge (walkable)
  for (let x = DUNE.x0; x <= DUNE.x1; x++) for (let y = duneY(x) - 1; y <= duneY(x) + 1; y++) if (isNewOutdoor(x, y) && terrain[y][x] === 'open') terrain[y][x] = 'dune';
  // craters (bowl walkable, north rim blocked)
  for (const [cx, cy, r] of CRATERS) for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
    if (!isNewOutdoor(x, y) || x < MAP_EDGE || y < MAP_EDGE || x >= W - MAP_EDGE || y >= H - MAP_EDGE || terrain[y][x] === 'pad') continue;
    const d = Math.hypot(x - cx, y - cy);
    if (d < r - 0.5) terrain[y][x] = 'crater';
    else if (d <= r + 0.5) { terrain[y][x] = 'rim'; if (y <= cy && !blocked[y][x]) { blocked[y][x] = true; } }
  }
  // rock fields (dense) and scattered rocks over the rest of the new ground
  for (const f of ROCK_FIELDS) for (let y = f.y0; y <= f.y1; y++) for (let x = f.x0; x <= f.x1; x++) if (free(x, y) && terrain[y][x] === 'open') terrain[y][x] = 'rockfield';
  for (let y = MAP_EDGE; y < H - MAP_EDGE; y++) for (let x = MAP_EDGE; x < W - MAP_EDGE; x++) {
    if (!free(x, y) || reserved(x, y)) continue;
    const t = terrain[y][x]; if (t === 'pad' || t === 'crater' || t === 'rim') continue;
    const field = ROCK_FIELDS.find(f => inBox(f, x, y));
    const p = field ? field.density : t === 'dune' ? 0.01 : 0.025;
    if (rng() < p) { const wide = rng() < 0.3 && free(x + 1, y) && !reserved(x + 1, y) && terrain[y][x + 1] !== 'rim' && terrain[y][x + 1] !== 'crater'; addRock(x, y, wide ? 2 : 1); }
  }
  // seal pockets: any new open tile the player cannot walk to becomes a rock, so no walkable ground is unreachable
  const seen = Array.from({ length: H }, () => Array(W).fill(false)); const q = [[start.x, start.y]]; seen[start.y][start.x] = true;
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny][nx] || blocked[ny][nx]) continue; seen[ny][nx] = true; q.push([nx, ny]); } }
  for (let y = MAP_EDGE; y < H - MAP_EDGE; y++) for (let x = MAP_EDGE; x < W - MAP_EDGE; x++) if (isNewOutdoor(x, y) && !blocked[y][x] && !seen[y][x] && !inside[y][x]) addRock(x, y, 1);
  return terrain;
}

/** Builds the collision grid exactly as world.ts used to inline it (same rng stream, so rock layout and ground art do not change). */
export function buildLayout() {
 const rng=(seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296})(214);
 const grid=v=>Array.from({length:H},()=>Array(W).fill(v));
 const inside=grid(false),blocked=grid(false),kind=grid('ground');
 for(let y=2;y<=18;y++)for(let x=4;x<=39;x++){inside[y][x]=true;kind[y][x]='floor';if(x===4||x===39||y===2||y===18){kind[y][x]='wall';blocked[y][x]=true}}
 const wall=(x,y,k='wall')=>{kind[y][x]=k;blocked[y][x]=true};
 // east wing (gym north; lab and bathroom south), through a door in the old east wall at y 10-11
 for(let y=3;y<=17;y++)if(y<10||y>11)wall(29,y);
 for(let x=30;x<=38;x++){if(x<33||x>35)wall(x,9);if(x!==32&&x!==37)wall(x,12)}
 for(let y=13;y<=17;y++)wall(35,y);
 for(let y=3;y<=17;y++){for(const x of[14,17]){if(y>=10&&y<=11)continue;if(x===14&&y===9)continue;wall(x,y,(x===14&&y>=13)?'glass':'wall')}}
 // kitchen in the SE corner of the indoor farm: only its back wall (counter wall face) is solid. The old kitchen walls at (15-16,6) and the glass (15-16,10) are gone,
 // so the corridor x15-16 runs straight north into the control module again.
 for(const x of[KITCHEN.x0,KITCHEN.x1])wall(x,KITCHEN.wallY);
 for(let x=5;x<=13;x++){if(x<8)wall(x,9);wall(x,12,'glass')} // greenhouse south wall: the door gap x8-10 and the kitchen corner x11-13 are open
 for(let x=18;x<=28;x++){if(x<21||x>24)wall(x,9);if(x<21||x>24)wall(x,12)}
 // Step 17a: the REC ROOM takes the east half of the old comms room. Partition wall x23 (y12-17); the corridor gap x21-22 still opens into comms, x24 into the rec room.
 for(let y=REC.wallY0;y<=REC.wallY1;y++)wall(REC.wallX,y);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(x<=1||x>=W-2||y<=1||y>=H-2){kind[y][x]='ridge';blocked[y][x]=true}}
 // door in south wall
 for(const x of[15,16]){kind[18][x]='floor';blocked[18][x]=false}
 // storage annex south of comms (Step 3a, art in storage.ts): west wall x18, east wall x29, south wall y21, door (19,18) from the comms room
 for(let y=19;y<=STORAGE_WALL_Y;y++){wall(18,y);wall(29,y)}for(let x=18;x<=29;x++)wall(x,STORAGE_WALL_Y);
 for(let y=STORAGE.y0;y<=STORAGE.y1;y++)for(let x=STORAGE.x0;x<=STORAGE.x1;x++){inside[y][x]=true;kind[y][x]='floor'}
 kind[18][19]='floor';blocked[18][19]=false;inside[18][19]=true;
 const block=(x,y,w,h)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)blocked[j][i]=true};
 // objects footprints
 const farmBeds=FARM_BEDS;farmBeds.forEach(([x,y])=>block(x,y,2,2));PROP_RACKS.forEach(r=>{if(r.wall==='stand')block(r.wallX,r.y,1,1)});
 block(19,3,3,2);block(24,3,3,2);block(20,16,3,1);REC_BLOCKS.forEach(([x,y,w,h])=>block(x,y,w,h));block(15,3,2,1);block(KITCHEN.x0,KITCHEN.y0,2,1);block(KITCHEN.x0+1,KITCHEN.y0+1,1,1);
 const panelsPos=SOLAR_PANEL_ORIGINS.map(([x,y])=>[x,y]);panelsPos.forEach(([x,y])=>block(x,y,3,2));
 block(33,21,3,2);block(38,24,3,2);block(40,8,2,2);WING_BLOCKS.forEach(([x,y,w,h])=>block(x,y,w,h));STORAGE_BLOCKS.forEach(([x,y,w,h])=>block(x,y,w,h));
 // rocks
 const rocks=[];const avoid=(x,y)=>(x>=3&&x<=41&&y>=1&&y<=20)||(x>=8&&x<=30&&y>=20&&y<=28)||(x>=13&&x<=18&&y>=18&&y<=24)||(x>=30&&x<=37&&y>=19&&y<=24)||(x>=36&&x<=41&&y>=22&&y<=27);
 for(let i=0;i<260&&rocks.length<42;i++){const x=2+Math.floor(rng()*40),y=2+Math.floor(rng()*26);if(avoid(x,y)||blocked[y][x])continue;const wide=rng()<.3&&!blocked[y][x+1]&&!avoid(x+1,y)&&x<41;rocks.push([x,y,wide?2:1,rng()]);block(x,y,wide?2:1,1)}
 const terrain=buildOutside(blocked,rocks,inside,PLAYER_START);
 return { rng, inside, blocked, kind, farmBeds, panelsPos, rocks, avoid, terrain };
}
