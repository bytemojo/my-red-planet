import { describe, expect, it } from 'vitest';
import { newSession } from '../src/core/session';
import { RADAR_BOUNDS, RADAR_FAR_TILES, objectiveZones, pickRadarTarget } from '../src/core/radar';
import { SYSTEMS } from '../src/core/episode';
import { ICE_COLLECTED } from '../src/core/icerun';
import { MARKERS } from '../src/game/layout';
import type { GameState } from '../src/core/types';

const fresh = () => newSession(1, { mode: 'storm' }).state;
const M: Record<string, [number, number]> = { a: [10, 10], b: [20, 10], c: [40, 25] };

describe('pickRadarTarget (pure)', () => {
  it('picks the nearest zone to the player', () => {
    expect(pickRadarTarget(['a', 'b', 'c'], M, { x: 18, y: 10 })!.zone).toBe('b');
    expect(pickRadarTarget(['a', 'b', 'c'], M, { x: 11, y: 10 })!.zone).toBe('a');
    expect(pickRadarTarget(['c', 'b'], M, { x: 38, y: 24 })!.zone).toBe('c');
  });
  it('moves to the next target when the first one is finished (it leaves the list)', () => {
    const p = { x: 11, y: 10 };
    expect(pickRadarTarget(['a', 'b'], M, p)!.zone).toBe('a');
    expect(pickRadarTarget(['b'], M, p)!.zone).toBe('b');
  });
  it('returns null with no zones or no markers, and skips zones without a marker', () => {
    expect(pickRadarTarget([], M, { x: 0, y: 0 })).toBeNull();
    expect(pickRadarTarget(['nope'], M, { x: 0, y: 0 })).toBeNull();
    expect(pickRadarTarget(['nope', 'b'], M, { x: 0, y: 0 })!.zone).toBe('b');
  });
  it('flags far targets (edge arrow) and gives the direction', () => {
    const near = pickRadarTarget(['a'], M, { x: 10 + RADAR_FAR_TILES - 1, y: 10 })!;
    const far = pickRadarTarget(['a'], M, { x: 10 + RADAR_FAR_TILES + 1, y: 10 })!;
    expect(near.far).toBe(false); expect(far.far).toBe(true);
    expect(far.angle).toBeCloseTo(Math.PI, 5);            // target is to the left of the player
    expect(pickRadarTarget(['c'], M, { x: 40, y: 10 })!.angle).toBeCloseTo(Math.PI / 2, 5); // target is below
  });
  it('maps the target onto the round map with fractions in 0..1', () => {
    const p = pickRadarTarget(['a', 'c'], M, { x: 40, y: 25 })!;
    expect(p.fx).toBeGreaterThanOrEqual(0); expect(p.fx).toBeLessThanOrEqual(1); expect(p.fy).toBeGreaterThanOrEqual(0); expect(p.fy).toBeLessThanOrEqual(1);
    expect(p.fx).toBeCloseTo((40 - RADAR_BOUNDS.minX) / (RADAR_BOUNDS.maxX - RADAR_BOUNDS.minX), 5);
  });
});

describe('objectiveZones follows the story', () => {
  it('the incoming call points to the intercom first, then life support', () => {
    const s = fresh(); s.ep!.phase = 'call';
    expect(objectiveZones(s)).toEqual(['sick', 'ls']);
  });
  it('in the system check, each finished check removes its zone, so the dot moves on', () => {
    const s = fresh(); s.ep!.phase = 'check'; s.ep!.checked = [];
    const all = objectiveZones(s);
    expect(all[0]).toBe('ls'); expect(all).toEqual(expect.arrayContaining(['ls', 'farm', 'comms', 'solar']));
    s.ep!.checked = [SYSTEMS[0], SYSTEMS[1]] as never;
    const later = objectiveZones(s);
    expect(later.length).toBeLessThan(all.length);
    s.ep!.checked = [...SYSTEMS] as never;
    expect(objectiveZones(s)).toEqual([]);
  });
  it('ice run: ice sheet first, then the intake once the container is full', () => {
    const s = fresh(); s.ep!.phase = 'ice';
    expect(objectiveZones(s)).toEqual(['ice', 'intake']);
    s.flags[ICE_COLLECTED] = true;
    expect(objectiveZones(s)).toEqual(['intake']);
  });
  it('after the storm: panels, then the pump; stowed panels point to the lever first', () => {
    const s = fresh(); s.ep!.phase = 'after'; s.ep!.panelsCleaned = false; s.ep!.wateringFixed = false; s.ep!.panelsStowed = false;
    expect(objectiveZones(s)).toEqual(['solar', 'pump']);
    s.ep!.panelsCleaned = true; expect(objectiveZones(s)).toEqual(['pump']);
    s.ep!.wateringFixed = true; expect(objectiveZones(s)).toEqual([]);
    s.ep!.panelsStowed = true; expect(objectiveZones(s)[0]).toBe('lever');
  });
  it('every zone it can name has a map marker (so the dot can always be drawn)', () => {
    const zones = new Set<string>(['sick', 'ls', 'farm', 'comms', 'solar', 'lever', 'pump', 'ice', 'intake', 'kitchen', 'dish', 'rover', 'cave', 'control']);
    for (const z of zones) expect(MARKERS[z], z).toBeTruthy();
  });
  it('never names the suit rack (owner rule 3)', () => {
    const states: GameState[] = [];
    for (const phase of ['call', 'check', 'after', 'ice', 'done'] as const) { const s = fresh(); s.ep!.phase = phase; states.push(s); }
    for (const s of states) expect(objectiveZones(s)).not.toContain('suit');
  });
});
