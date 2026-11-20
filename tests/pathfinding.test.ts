import { describe, expect, it } from 'vitest';
import { pathToClosestReachable } from '../src/game/pathfinding';
import { FARM_BEDS, bedStand, roomAt, H, KITCHEN, LANDMARKS, MARKERS, MAP_EDGE, PLAYER_START, T, W, ZONES, buildLayout, isNewOutdoor } from '../src/game/layout';
import { CREW_WORK, PACE_LANE, PACE_MIN, PACE_MAX, ROOM_FURNITURE, SPOT, WALK_SPOTS, centerOfTile, footprint, needsNewActivity, paceRoute, pickWorkTile, rectsOverlap, routeTo } from '../src/game/crewwalk';

describe('click-to-walk paths', () => {
  it('routes through an opening in a wall', () => {
    const blocked = (x: number, y: number) => x === 3 && y !== 4;
    const result = pathToClosestReachable(7, 5, { x: 1, y: 2 }, { x: 5, y: 2 }, blocked);

    expect(result.reached).toBe(true);
    expect(result.destination).toEqual({ x: 5, y: 2 });
    expect(result.path.some(tile => tile.x === 3 && tile.y === 4)).toBe(true);
    expect(result.path.every(tile => !blocked(tile.x, tile.y))).toBe(true);
  });

  it('stops at the nearest reachable tile when a wall has no opening', () => {
    const blocked = (x: number) => x === 3;
    const result = pathToClosestReachable(7, 5, { x: 1, y: 2 }, { x: 5, y: 2 }, blocked);

    expect(result.reached).toBe(false);
    expect(result.destination).toEqual({ x: 2, y: 2 });
    expect(result.path.every(tile => !blocked(tile.x))).toBe(true);
  });
});

// Step 4b: walk the REAL collision grid (src/game/layout.ts, the same one world.ts draws from).
const layout = buildLayout();
const isBlocked = (x: number, y: number) => layout.blocked[y][x];
const tileOf = (m: [number, number]) => ({ x: Math.floor(m[0]), y: Math.floor(m[1]) });
const reaches = (target: { x: number; y: number }, blocked = isBlocked) =>
  pathToClosestReachable(W, H, PLAYER_START, target, blocked).reached;

// Kids need a path to every room and machine. Outside zones (solar, rover, cave) are reached through the south door, so they are walked too.
const MUST_REACH: Record<string, string> = {
  farm: 'farm', ls: 'life support', comms: 'comms', control: 'control module', sick: 'sick bay intercom', hatch: 'meal hatch',
  suit: 'suit rack', kitchen: 'kitchen', bands: 'gym bands', bike: 'gym bike', rower: 'gym rower', lab: 'lab', microscope: 'microscope on the lab bench', bath: 'bathroom',
  pump: 'water pump', lever: 'panel lever', pod: 'sleep pod', wiki: 'NASA wiki screen', chess: 'chess table', checkers: 'checkers table', rack_tool: 'water can stand', rack_seed: 'seed drawer', rack_parts: 'spare parts rack',
  bin_food: 'food bin', bin_seeds: 'seed bin', bin_tools: 'tool bin', bin_parts: 'parts bin', bin_filters: 'filter bin', bin_eva: 'EVA bin',
  ice: 'candidate ice sheet', intake: 'water-maker intake', solar: 'solar field', rover: 'rover', cave: 'cave mouth', dish: 'outdoor dish (repair spot south of it)',
};

describe('every room can be walked to from the start', () => {
  it('the player starts on a walkable tile', () => {
    expect(isBlocked(PLAYER_START.x, PLAYER_START.y)).toBe(false);
  });

  it('covers every zone the game defines', () => {
    expect(Object.keys(ZONES).sort()).toEqual(Object.keys(MUST_REACH).sort());
    expect(Object.keys(MARKERS).sort()).toEqual(Object.keys(MUST_REACH).sort());
  });

  // The control module is reached through the corridor x15-16 (the kitchen no longer walls it in).
  for (const [zone, name] of Object.entries(MUST_REACH)) {
    it(`reaches the ${name} (${zone})`, () => {
      const target = tileOf(MARKERS[zone]);
      expect(isBlocked(target.x, target.y), `${zone} stand tile ${target.x},${target.y} is blocked`).toBe(false);
      expect(reaches(target), `no path from the start to ${zone} at ${target.x},${target.y}`).toBe(true);
    });
  }

  it('the kitchen sits in the indoor farm corner under bed 3, with its own space', () => {
    const bed3 = layout.farmBeds[2];
    expect(KITCHEN.x0).toBeGreaterThanOrEqual(bed3[0]);
    expect(KITCHEN.y0).toBeGreaterThan(bed3[1] + 1); // clear of bed 3
    // nothing overlaps: no two blocked footprints (beds, counter, table, control console) share a tile
    const tiles = new Map<string, string>();
    const claim = (name: string, x: number, y: number, w: number, h: number) => {
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
        expect(tiles.has(`${i},${j}`), `${name} overlaps ${tiles.get(`${i},${j}`)} at ${i},${j}`).toBe(false);
        tiles.set(`${i},${j}`, name);
      }
    };
    layout.farmBeds.forEach(([x, y]: number[], i: number) => claim(`bed ${i + 1}`, x, y, 2, 2));
    claim('kitchen counter', KITCHEN.x0, KITCHEN.y0, 2, 1);
    claim('kitchen table', KITCHEN.x0 + 1, KITCHEN.y0 + 1, 1, 1);
    claim('control console', 15, 3, 2, 1);
  });

  it('the kitchen is open on the west and the south (no wall) and every cook stand tile is free', () => {
    for (let y = KITCHEN.y0 + 1; y <= KITCHEN.y1; y++) expect(isBlocked(KITCHEN.x0 - 1, y), `west edge ${KITCHEN.x0 - 1},${y}`).toBe(false);
    for (let x = KITCHEN.x0; x <= KITCHEN.x1; x++) expect(layout.kind[KITCHEN.y1 + 1][x]).not.toBe('wall');
    for (const [x, y] of [[12, 8], [12, 9], [13, 9]]) { expect(isBlocked(x, y)).toBe(false); expect(reaches({ x, y })).toBe(true); }
  });

  it('the control module is not blocked: the corridor runs north from the south corridor into it', () => {
    for (let y = 4; y <= 10; y++) for (const x of [15, 16]) expect(isBlocked(x, y), `corridor ${x},${y}`).toBe(false);
    expect(reaches({ x: 15, y: 4 })).toBe(true);
    expect(reaches({ x: 16, y: 5 })).toBe(true);
  });

  it('fails when a door is blocked on purpose (lab door tile 32,12)', () => {
    const lab = tileOf(MARKERS.lab);
    expect(reaches(lab)).toBe(true);
    expect(reaches(lab, (x, y) => (x === 32 && y === 12) || isBlocked(x, y))).toBe(false);
  });

  it('fails when the storage door is blocked on purpose (tile 19,18)', () => {
    const bin = tileOf(MARKERS.bin_food);
    expect(reaches(bin)).toBe(true);
    expect(reaches(bin, (x, y) => (x === 19 && y === 18) || isBlocked(x, y))).toBe(false);
  });
});

// Step 6a: the spot the explorer walks to for planting must be a free floor tile that is reachable, for every bed.
describe('bed stand points', () => {
  FARM_BEDS.forEach((_, i) => it(`bed ${i + 1} stand is free and reachable`, () => {
    const t = { x: Math.floor(bedStand(i).x / 32), y: Math.floor(bedStand(i).y / 32) };
    expect(isBlocked(t.x, t.y)).toBe(false); expect(reaches(t)).toBe(true);
  }));
});

describe('room detection for the room-name labels', () => {
  it('finds the room under the player, kitchen before farm', () => {
    expect(roomAt(9, 5)).toBe('farm'); expect(roomAt(12, 8)).toBe('kitchen'); expect(roomAt(16, 4)).toBe('control');
    expect(roomAt(22, 15)).toBe('comms'); expect(roomAt(34, 5)).toBe('gym'); expect(roomAt(32, 15)).toBe('lab'); expect(roomAt(37, 15)).toBe('bath');
    expect(roomAt(16, 12)).toBeNull(); // corridor
  });
});

describe('Step 24f: the water can stands next to the farm beds', () => {
  it('the water can stand is in the greenhouse, touches a bed, is solid, and its stand point is walkable', async () => {
    const { PROP_RACKS, rackMarker } = await import('../src/game/racks');
    const { FARM_BEDS, roomAt } = await import('../src/game/layout');
    const r = PROP_RACKS.find(x => x.item === 'sprinkler')!;
    expect(roomAt(r.wallX, r.y)).toBe('farm');
    expect(FARM_BEDS.some(([bx, by]) => r.wallX >= bx - 1 && r.wallX <= bx + 2 && r.y >= by - 1 && r.y <= by + 2)).toBe(true);
    expect(isBlocked(r.wallX, r.y)).toBe(true);
    const [mx, my] = rackMarker(r);
    expect(isBlocked(Math.floor(mx), Math.floor(my))).toBe(false);
  });
});

// Step 24h: crew obey the same collision grid as the player, and hungry crew pace on a free lane.
describe('crew walking (24h)', () => {
  const rng = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
  const free = (px: number, py: number) => !isBlocked(Math.floor(px / T), Math.floor(py / T));
  // sample a straight pixel segment every 2 px: every sample must be on a free tile
  const segmentFree = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
    for (let i = 0; i <= n; i++) if (!free(a.x + (b.x - a.x) * i / n, a.y + (b.y - a.y) * i / n)) return false;
    return true;
  };

  it('every work spot is a free tile (never a table, bed or machine)', () => {
    for (const id of Object.keys(CREW_WORK) as (keyof typeof CREW_WORK)[]) {
      for (let seed = 1; seed <= 60; seed++) {
        const t = pickWorkTile(CREW_WORK[id], isBlocked, W, H, rng(seed));
        expect(t, `${id} has free floor in its work area`).not.toBeNull();
        expect(isBlocked(t!.x, t!.y)).toBe(false);
      }
    }
  });

  it('a walk between work spots only touches free tiles, one step at a time, and the straight line between waypoints is free', () => {
    const ids = Object.keys(CREW_WORK) as (keyof typeof CREW_WORK)[];
    for (const id of ids) for (const other of ids) for (let seed = 1; seed <= 12; seed++) {
      const r = rng(seed * 7 + 3);
      const from = pickWorkTile(CREW_WORK[id], isBlocked, W, H, r)!, to = pickWorkTile(CREW_WORK[other], isBlocked, W, H, r)!;
      const route = routeTo(centerOfTile(from), to, isBlocked, W, H);
      let prev = centerOfTile(from), prevTile = from;
      for (const tl of route) {
        expect(isBlocked(tl.x, tl.y)).toBe(false);
        expect(Math.abs(tl.x - prevTile.x) + Math.abs(tl.y - prevTile.y)).toBe(1);
        const c = centerOfTile(tl);
        expect(segmentFree(prev, c)).toBe(true);
        prev = c; prevTile = tl;
      }
    }
  });

  it('a blocked target is never walked INTO: the route stops on free floor', () => {
    const solid = tileOf(ZONES.ls ? [ZONES.ls.x0 + 0.5, ZONES.ls.y0 + 0.5] : [20, 5]);
    const route = routeTo(centerOfTile(PLAYER_START), { x: 1, y: 1 }, isBlocked, W, H); // (1,1) is the outer ridge
    for (const tl of route) expect(isBlocked(tl.x, tl.y)).toBe(false);
    expect(solid.x).toBeGreaterThan(0);
  });

  it('pacing: 3 to 4 tiles in a straight line, every tile on the way free, ends where it started', () => {
    let found = 0;
    for (const id of Object.keys(CREW_WORK) as (keyof typeof CREW_WORK)[]) {
      const [x0, y0, x1, y1] = CREW_WORK[id];
      for (let y = Math.floor(y0); y <= Math.floor(y1); y++) for (let x = Math.floor(x0); x <= Math.floor(x1); x++) {
        if (isBlocked(x, y)) continue;
        const route = paceRoute({ x, y }, isBlocked, W, H, rng(x * 31 + y));
        if (!route) continue;
        found++;
        const [B, A] = route;
        expect(A).toEqual({ x, y });
        const len = Math.abs(B.x - A.x) + Math.abs(B.y - A.y);
        expect(len).toBeGreaterThanOrEqual(PACE_MIN); expect(len).toBeLessThanOrEqual(PACE_MAX);
        expect(B.x === A.x || B.y === A.y).toBe(true);
        for (let i = 0; i <= len; i++) expect(isBlocked(A.x + Math.sign(B.x - A.x) * i, A.y + Math.sign(B.y - A.y) * i)).toBe(false);
        expect(route.length).toBe(4);
      }
    }
    expect(found).toBeGreaterThan(0);
  });

  it('pacing refuses a start with no straight free lane (boxed in)', () => {
    const boxed = (x: number, y: number) => !(x === 5 && y === 5);
    expect(paceRoute({ x: 5, y: 5 }, boxed, 10, 10, () => 0.2)).toBeNull();
    expect(paceRoute({ x: 4, y: 4 }, boxed, 10, 10, () => 0.2)).toBeNull(); // start itself is blocked
  });

  it('quarantine rooms: nobody stands, paces or strolls through the bed, desk, chair or personal item', () => {
    const spots = WALK_SPOTS.map(n => ({ name: n as string, x: SPOT[n][0], y: SPOT[n][1] }));
    const lane = [{ name: 'laneTop', x: PACE_LANE.dx, y: PACE_LANE.yTop }, { name: 'laneBottom', x: PACE_LANE.dx, y: PACE_LANE.yBottom }];
    const pts = [...spots, ...lane];
    const hits = (x: number, y: number) => Object.entries(ROOM_FURNITURE).filter(([, box]) => rectsOverlap(footprint(x, y), box)).map(([n]) => n);
    for (const p of pts) expect(hits(p.x, p.y), `${p.name} is clear of furniture`).toEqual([]);
    for (const a of pts) for (const b of pts) for (let i = 0; i <= 40; i++) {
      const x = a.x + (b.x - a.x) * i / 40, y = a.y + (b.y - a.y) * i / 40;
      expect(hits(x, y), `${a.name} to ${b.name} at ${Math.round(x)},${Math.round(y)}`).toEqual([]);
    }
  });

  it('the pacing lane is 3 to 4 tiles long', () => {
    const len = (PACE_LANE.yBottom - PACE_LANE.yTop) / T;
    expect(len).toBeGreaterThanOrEqual(3); expect(len).toBeLessThanOrEqual(4);
  });

  it('a hungry person standing still does NOT re-choose every frame (the flicker), but a change of hunger does', () => {
    const base = { hungry: true, wasHungry: true, night: false, act: 'stand', atWork: false };
    for (let frame = 0; frame < 200; frame++) expect(needsNewActivity(base)).toBe(false);
    expect(needsNewActivity({ ...base, wasHungry: false })).toBe(true);                    // just got hungry
    expect(needsNewActivity({ ...base, hungry: false })).toBe(true);                       // just got fed
    expect(needsNewActivity({ ...base, hungry: false, wasHungry: false, night: true, act: 'wander' })).toBe(true); // night falls: go to bed
    expect(needsNewActivity({ ...base, hungry: false, wasHungry: false, night: true, act: 'sleep' })).toBe(false);
    expect(needsNewActivity({ ...base, hungry: false, wasHungry: false, act: 'sleep' })).toBe(true);              // morning: wake up
  });
});

describe('Step 28a: the bigger outside map', () => {
  const OLD_W = 44, OLD_H = 30;
  it('the map is about 2x larger than before', () => {
    expect(W * H).toBeGreaterThanOrEqual(1.9 * OLD_W * OLD_H);
    expect(W).toBeGreaterThan(OLD_W); expect(H).toBeGreaterThan(OLD_H);
  });
  it('the whole map edge is solid ridge (edge limits), so nobody walks off the map', () => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const edge = x < MAP_EDGE || y < MAP_EDGE || x >= W - MAP_EDGE || y >= H - MAP_EDGE;
      if (edge) expect(layout.blocked[y][x], `edge tile ${x},${y}`).toBe(true);
    }
    const p = pathToClosestReachable(W, H, tileOf(MARKERS.solar), { x: W - 1, y: H - 1 }, (x, y) => isBlocked(x, y));
    expect(p.path.every(t => t.x < W - MAP_EDGE && t.y < H - MAP_EDGE)).toBe(true);
    expect(p.destination.x < W - MAP_EDGE && p.destination.y < H - MAP_EDGE).toBe(true);
  });
  it('the old ridge strip east and south of the old map is open ground now', () => {
    expect(isBlocked(43, 15)).toBe(false); expect(isBlocked(30, 29)).toBe(false);
  });
  it('the new ground has rock fields, a dune ridge, craters with a blocked rim, and a truck pad', () => {
    const kinds = new Set<string>(); layout.terrain.forEach(r => r.forEach(t => kinds.add(t)));
    for (const k of ['open', 'rockfield', 'dune', 'crater', 'rim', 'pad']) expect(kinds.has(k), k).toBe(true);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (layout.terrain[y][x] === 'rim') expect(isNewOutdoor(x, y)).toBe(true);
      if (layout.terrain[y][x] === 'dune' || layout.terrain[y][x] === 'crater' || layout.terrain[y][x] === 'pad') {
        if (!layout.rocks.some(([rx, ry, rw]) => ry === y && x >= rx && x < rx + rw)) expect(isBlocked(x, y), `${layout.terrain[y][x]} ${x},${y}`).toBe(false);
      }
    }
  });
  it('most of the new ground is open to walk on (rocks are the minority)', () => {
    let open = 0, total = 0;
    for (let y = MAP_EDGE; y < H - MAP_EDGE; y++) for (let x = MAP_EDGE; x < W - MAP_EDGE; x++) if (isNewOutdoor(x, y)) { total++; if (!isBlocked(x, y)) open++; }
    expect(open / total).toBeGreaterThan(0.75);
  });
  it('every walkable tile on the whole map can be reached from the start (no sealed pockets)', () => {
    const seen = new Set<string>([`${PLAYER_START.x},${PLAYER_START.y}`]); const q = [[PLAYER_START.x, PLAYER_START.y]];
    while (q.length) { const [x, y] = q.pop()!; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || isBlocked(nx, ny) || seen.has(`${nx},${ny}`)) continue; seen.add(`${nx},${ny}`); q.push([nx, ny]); } }
    const lost: string[] = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isNewOutdoor(x, y) && !isBlocked(x, y) && !seen.has(`${x},${y}`)) lost.push(`${x},${y}`);
    expect(lost, `unreachable new tiles: ${lost.slice(0, 8).join(' ')}`).toEqual([]);
  });
  it('every old zone is still reachable and every landmark (old and new) is reachable', () => {
    for (const zone of Object.keys(ZONES)) { const t = tileOf(MARKERS[zone]); expect(isBlocked(t.x, t.y), zone).toBe(false); expect(reaches(t), zone).toBe(true); }
    expect(LANDMARKS.map(l => l.id).sort()).toEqual(['cave_mouth', 'ice_sheet', 'rover_site', 'truck_bay']);
    expect(LANDMARKS.filter(l => !l.existing).map(l => l.id)).toEqual(['truck_bay']);
    for (const l of LANDMARKS) { const t = tileOf(l.stand); expect(isBlocked(t.x, t.y), `${l.id} stand ${t.x},${t.y}`).toBe(false); expect(reaches(t), `no path to ${l.id}`).toBe(true); expect(l.x1).toBeGreaterThanOrEqual(l.x0); expect(l.y1).toBeGreaterThanOrEqual(l.y0); }
  });
  it('landmarks are data only: the truck bay adds no zone (no button that does nothing yet)', () => {
    expect(Object.keys(ZONES)).not.toContain('truck_bay'); expect(Object.keys(ZONES)).not.toContain('truck');
  });
  it('the truck bay is a clear pad (nothing blocked on it) and the old rover/cave/ice landmarks did not move', () => {
    const bay = LANDMARKS.find(l => l.id === 'truck_bay')!;
    for (let y = bay.y0; y <= bay.y1; y++) for (let x = bay.x0; x <= bay.x1; x++) expect(isBlocked(x, y), `pad ${x},${y}`).toBe(false);
    expect([ZONES.rover.x0, ZONES.rover.y0, ZONES.rover.x1, ZONES.rover.y1]).toEqual([30, 19, 37, 24]);
    expect([ZONES.cave.x0, ZONES.cave.y0, ZONES.cave.x1, ZONES.cave.y1]).toEqual([37, 23, 41, 27]);
  });
  it('the layout is deterministic (same rocks every time)', () => {
    const again = buildLayout();
    expect(again.rocks).toEqual(layout.rocks); expect(again.blocked).toEqual(layout.blocked);
  });
});
