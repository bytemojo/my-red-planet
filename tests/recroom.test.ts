import { describe, expect, it } from 'vitest';
import { ACTION_DEFS } from '../src/core/actions';
import { CLIMB_MS, DIM_MS, EARTH_PRINT, GAME_TABLES, PLANT, POD, REC, REC_BLOCKS, REC_DECOR, WIKI_SCREEN, podBay, stepDim, stepPodSleep, tableMarker, type PodPhase } from '../src/game/recroom';
import { MARKERS, ZONES } from '../src/game/layout';

// Step 17b: the NASA WIKI wall screen and the chess / checkers tables in the rec room.
const tile = (m: [number, number]) => ({ x: Math.floor(m[0]), y: Math.floor(m[1]) });
const inRec = (x: number, y: number) => x >= REC.x0 && x <= REC.x1 && y >= REC.y0 && y <= REC.y1;
const blocked = (x: number, y: number) => REC_BLOCKS.some(([bx, by, w, h]) => x >= bx && x < bx + w && y >= by && y < by + h);

describe('Step 17b: rec room screen and tables', () => {
  it('has a wiki zone and one zone per game table, each with a marker', () => {
    for (const z of [WIKI_SCREEN.zone, ...GAME_TABLES.map(t => t.zone)]) { expect(ZONES[z], z).toBeTruthy(); expect(MARKERS[z], z).toBeTruthy(); }
  });
  it('the tables are inside the room, do not overlap the pod or each other, and their stand tiles are free floor', () => {
    const tables = GAME_TABLES.map(t => ({ x: t.x, y: t.y }));
    for (const t of tables) { expect(inRec(t.x, t.y)).toBe(true); expect(t.x >= POD.x && t.x < POD.x + POD.w && t.y >= POD.y && t.y < POD.y + POD.h).toBe(false); }
    expect(new Set(tables.map(t => `${t.x},${t.y}`)).size).toBe(tables.length);
    for (const t of GAME_TABLES) { const s = tile(tableMarker(t)); expect(inRec(s.x, s.y)).toBe(true); expect(blocked(s.x, s.y), `${t.zone} stand`).toBe(false); }
  });
  it('the wiki marker is free floor east of the screen wall', () => {
    const s = tile(MARKERS[WIKI_SCREEN.zone]); expect(s.x).toBe(REC.x0); expect(blocked(s.x, s.y)).toBe(false);
  });
  it('keeps the doorway column (x24) clear from the entrance down to the wiki screen', () => {
    for (let y = REC.y0; y <= 15; y++) expect(blocked(REC.x0, y), `tile 24,${y}`).toBe(false);
  });
  it('the zones do not overlap the sleep pod zone', () => {
    const pod = ZONES.pod, hit = (z: typeof pod) => !(z.x1 < pod.x0 || z.x0 > pod.x1 || z.y1 < pod.y0 || z.y0 > pod.y1);
    for (const z of [WIKI_SCREEN.zone, ...GAME_TABLES.map(t => t.zone)]) expect(hit(ZONES[z]), z).toBe(false);
  });
  it('use_screen is a free animated action with its beat inside the timeline', () => {
    const d = ACTION_DEFS.use_screen; expect(d.energy).toBe(0); expect(d.beatStep).toBeGreaterThanOrEqual(0); expect(d.beatStep).toBeLessThan(d.steps.length);
  });
  it('the wiki bonus key is the one the wiki modal and the HUD already use', async () => {
    const fs = await import('node:fs'); const src = fs.readFileSync('src/ui/episode.ts', 'utf8') + fs.readFileSync('src/ui/hud.ts', 'utf8');
    expect(src.match(/ep1_wiki_read/g)!.length).toBeGreaterThanOrEqual(3);
  });
});

// Step 24i: the sleeper stays visible, the room dims and brightens slowly, the room is decorated with nothing flammable.
describe('Step 24i: pod sleep, dimming, decoration', () => {
  const idle = { phase: 'none' as PodPhase, climb: 0 };
  const run = (st: { phase: PodPhase; climb: number }, inp: { mine: boolean; lying: boolean; busy: boolean }, ms: number, reduced = false) => {
    let v = stepPodSleep(st, inp, 16, reduced);
    for (let t = 16; t < ms; t += 16) v = stepPodSleep(v, inp, 16, reduced);
    return v;
  };

  it('the explorer never vanishes: in the pod the sleeper sprite shows and the real one is parked; outside the real one shows', () => {
    let v = stepPodSleep(idle, { mine: true, lying: false, busy: false }, 16, false);
    expect(v.inPod).toBe(false); expect(v.playerVisible).toBe(true); expect(v.sleeperVisible).toBe(false);
    for (const inp of [{ mine: true, lying: true, busy: false }, { mine: false, lying: false, busy: true }]) {
      v = run(v, inp, 3000);
      expect(v.sleeperVisible).toBe(true); expect(v.playerVisible).toBe(false);
    }
    for (let i = 0; i < 400; i++) { v = stepPodSleep(v, { mine: false, lying: false, busy: false }, 16, false); expect(v.sleeperVisible || v.playerVisible).toBe(true); }
  });

  it('sequence: lid opens to reach in, the explorer climbs in with the lid open, then the lid closes and the room dims', () => {
    let v = stepPodSleep(idle, { mine: true, lying: false, busy: false }, 16, false);
    expect(v.lidOpen).toBe(true);                                   // reaching in: lid open
    v = stepPodSleep(v, { mine: true, lying: true, busy: false }, 16, false);
    expect(v.phase).toBe('in'); expect(v.lidOpen).toBe(true); expect(v.asleep).toBe(false); expect(v.dimTarget).toBe(1); // climbing: lid still open, dimming starts
    v = run(v, { mine: true, lying: true, busy: false }, CLIMB_MS + 100);
    expect(v.climb).toBe(1); expect(v.asleep).toBe(true); expect(v.lidOpen).toBe(false);                                  // lying in the bay, lid shut
  });

  it('stays asleep while the Sol passes (busy) and wakes only when it is over', () => {
    let v = run(idle, { mine: true, lying: true, busy: false }, 700);
    v = run(v, { mine: false, lying: false, busy: true }, 5000);
    expect(v.phase).toBe('in'); expect(v.asleep).toBe(true); expect(v.dimTarget).toBe(1);
    v = stepPodSleep(v, { mine: false, lying: false, busy: false }, 16, false);
    expect(v.phase).toBe('out'); expect(v.dimTarget).toBe(0); expect(v.lidOpen).toBe(true);        // wake: brighten, lid opens
    v = run(v, { mine: false, lying: false, busy: false }, CLIMB_MS + 200);
    expect(v.phase).toBe('none'); expect(v.climb).toBe(0); expect(v.lidOpen).toBe(false); expect(v.playerVisible).toBe(true);
  });

  it('a refused or aborted sleep (never busy) wakes at once instead of getting stuck', () => {
    let v = run(idle, { mine: true, lying: true, busy: false }, 200);
    v = run(v, { mine: false, lying: false, busy: false }, 1000);
    expect(v.phase).toBe('none'); expect(v.playerVisible).toBe(true);
  });

  it('reduced motion skips the climb animation', () => {
    const v = stepPodSleep(idle, { mine: true, lying: true, busy: false }, 16, true);
    expect(v.climb).toBe(1); expect(v.asleep).toBe(true);
  });

  it('the room lights take 2 to 3 seconds to dim and 2 to 3 seconds to brighten, smoothly', () => {
    expect(DIM_MS).toBeGreaterThanOrEqual(2000); expect(DIM_MS).toBeLessThanOrEqual(3000);
    let d = 0, t = 0, prev = 0;
    while (d < 1 && t < 10000) { d = stepDim(d, 1, 16); expect(d - prev).toBeLessThan(0.02); prev = d; t += 16; }   // no sudden jumps
    expect(t).toBeGreaterThanOrEqual(2000); expect(t).toBeLessThanOrEqual(3100);
    t = 0;
    while (d > 0 && t < 10000) { d = stepDim(d, 0, 16); t += 16; }
    expect(t).toBeGreaterThanOrEqual(2000); expect(t).toBeLessThanOrEqual(3100);
    expect(stepDim(0.3, 1, 16, true)).toBe(1);                       // reduced motion: instant
  });

  it('the sleeper lies inside the pod bay, and the Zzz/bay point is within the pod body', () => {
    expect(podBay.x).toBeGreaterThan(POD.x * 32); expect(podBay.x).toBeLessThan((POD.x + POD.w) * 32);
    expect(podBay.y).toBeGreaterThan(POD.y * 32); expect(podBay.y).toBeLessThan((POD.y + POD.h) * 32);
  });

  it('decoration is metal, glass or a real plant: nothing flammable (no paper, wood, fabric)', () => {
    expect(REC_DECOR.map(d => d.id).sort()).toEqual(['earth_print', 'plant']);
    for (const d of REC_DECOR) for (const m of d.materials) expect(m, `${d.id}: ${m}`).not.toMatch(/paper|wood|fabric|cloth|cardboard|plastic bag|candle/i);
    expect(REC_DECOR.find(d => d.id === 'earth_print')!.materials.join(' ')).toMatch(/metal/);
    expect(REC_DECOR.find(d => d.id === 'plant')!.materials.join(' ')).toMatch(/metal pot/);
  });

  it('the potted plant is a solid tile in a free corner: inside the room, off the pod, tables, doorway and every stand tile', () => {
    expect(inRec(PLANT.x, PLANT.y)).toBe(true); expect(blocked(PLANT.x, PLANT.y)).toBe(true);
    for (const t of GAME_TABLES) { expect((PLANT as { x: number; y: number }).x === t.x && (PLANT as { x: number; y: number }).y === t.y).toBe(false); const s = tile(tableMarker(t)) as { x: number; y: number }; expect(s.x === PLANT.x && s.y === PLANT.y).toBe(false); }
    expect(PLANT.x >= POD.x && PLANT.x < POD.x + POD.w && PLANT.y >= POD.y && PLANT.y < POD.y + POD.h).toBe(false);
    for (const z of [ZONES.pod, ZONES.wiki, ZONES.chess, ZONES.checkers] as { x0: number; x1: number; y0: number; y1: number }[]) expect(PLANT.x >= z.x0 && PLANT.x <= z.x1 && PLANT.y >= z.y0 && PLANT.y <= z.y1, 'plant tile is not a stand tile').toBe(false);
  });

  it('the Earth print hangs on the north wall inside the room, away from the doorway gap (x24) and the pod label', () => {
    expect(EARTH_PRINT.wallY).toBe(REC.wallY0); expect(EARTH_PRINT.x0).toBeGreaterThan(REC.x0); expect(EARTH_PRINT.x1).toBeLessThan(POD.x); expect(EARTH_PRINT.x0).toBeLessThanOrEqual(EARTH_PRINT.x1);
  });
});
