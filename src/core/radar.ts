// Step 24g: the radar points at the NEXT nearest objective. Pure: no Phaser, no DOM.
// objectiveZones() lists the zones of the current NOW objective first, then the NEXT ones (in story order);
// pickRadarTarget() chooses the nearest of them to the player. When an objective is finished its zone leaves the list, so the dot moves on.
// No text here mentions the suit (owner rule 3): the radar only shows WHERE, never what to wear.
import { CREW_LIFE, CROPS } from './constants';
import { CREW_IDS } from './crewlife';
import { dishChoice, FAULT_FLAG } from './dish';
import { SYSTEMS } from './episode';
import { ICE_COLLECTED } from './icerun';
import type { GameState } from './types';

/** The part of the map (in tiles) that the round radar shows. */
export const RADAR_BOUNDS = { minX: 4, maxX: 41, minY: 2, maxY: 27 };
/** Farther than this many tiles and the radar also shows an arrow at its edge. */
export const RADAR_FAR_TILES = 12;

const SYSTEM_ZONE: Record<string, string> = { air: 'ls', water: 'ls', plants: 'farm', comms: 'comms', solar: 'solar' };

export function objectiveZones(s: GameState): string[] {
  const out: string[] = [];
  const add = (...zs: (string | null | false | undefined)[]) => { for (const z of zs) if (z && !out.includes(z)) out.push(z); };
  const hungryCrew = CREW_IDS.some(id => s.crew[id].hunger >= CREW_LIFE.HUNGRY_AT) && s.res.food >= CREW_LIFE.FOOD_NEEDED;
  if (s.ep) {
    const ep = s.ep, dry = s.plots.some(p => p.crop && !p.watered && s.hour < 21);
    switch (ep.phase) {
      case 'call': add('sick', 'ls'); return out;
      case 'check': for (const sys of SYSTEMS) if (!ep.checked.includes(sys)) add(SYSTEM_ZONE[sys]); return out;
      case 'after': add(ep.panelsStowed && 'lever', !ep.panelsCleaned && 'solar', !ep.wateringFixed && 'pump'); return out;
      case 'ice': add(s.flags[ICE_COLLECTED] ? 'intake' : 'ice', 'intake'); return out;
      case 'done': return out;
    }
    add(ep.stormCall === 'stow' && !ep.panelsStowed && 'lever', hungryCrew && 'kitchen', dry && 'farm');
    if (ep.checked.length >= SYSTEMS.length && !s.flags[FAULT_FLAG]) { const d = dishChoice(s); add(d === 'comms' ? 'comms' : d === 'dish' ? 'dish' : null); }
    return out;
  }
  const readyOrEmpty = s.plots.some(p => p.crop && p.growth >= CROPS[p.crop].sols) || !s.plots.some(p => p.crop);
  add(readyOrEmpty && 'farm', !s.flags.quarantine_over && hungryCrew && 'kitchen', s.panelDust > 0.6 && 'solar',
    s.buildings.includes('rover_bay') && Number(s.flags.trips || 0) < 2 && 'rover', !!s.flags.cave_unlocked && !s.flags.cavern_water && 'cave', s.energy < 15 && 'control');
  return out;
}

export interface RadarPick {
  zone: string;
  /** Position on the radar, 0 to 1 from the top-left corner of the round map. */
  fx: number; fy: number;
  /** Tiles between the player and the target. */
  dist: number;
  /** Direction from the player to the target in radians (screen coordinates: 0 = right, PI/2 = down). */
  angle: number;
  /** True when the target is far, so an arrow is shown at the radar edge. */
  far: boolean;
}
const frac = (v: number, lo: number, hi: number) => Math.min(1, Math.max(0, (v - lo) / (hi - lo)));

/** The nearest of the objective zones to the player (tile units). Zones without a marker are skipped. */
export function pickRadarTarget(zones: readonly string[], markers: Record<string, [number, number]>, player: { x: number; y: number }): RadarPick | null {
  let best: RadarPick | null = null;
  for (const zone of zones) {
    const m = markers[zone]; if (!m) continue;
    const dx = m[0] - player.x, dy = m[1] - player.y, dist = Math.hypot(dx, dy);
    if (!best || dist < best.dist) best = { zone, fx: frac(m[0], RADAR_BOUNDS.minX, RADAR_BOUNDS.maxX), fy: frac(m[1], RADAR_BOUNDS.minY, RADAR_BOUNDS.maxY), dist, angle: Math.atan2(dy, dx), far: dist > RADAR_FAR_TILES };
  }
  return best;
}
