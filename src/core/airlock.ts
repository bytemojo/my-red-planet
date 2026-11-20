// Airlock (pure logic, no Phaser/DOM). The passage between the habitat and Mars has two doors and is never open to both at once.
//   EXIT : step in from the base -> the inner door shuts -> the passage depressurises (meter falls) -> the outer door opens -> walk out.
//   ENTRY: step in from outside -> the outer door shuts -> the passage repressurises (meter rises) -> the inner door opens -> walk in.
// Without a suit the scene drains health while the passage is exposed (see exposed()) and the gust at the outer door pushes the player out.
// Pressure is a 0..1 gauge (1 = habitat, 0 = Mars). The game shows it as a bar with HAB and MARS ends and NO invented numbers.

export const AIRLOCK = {
  DOOR_S: 0.9,        // a door takes this long to slide shut or open
  DEPRESS_S: 6,       // the passage drops from habitat to Mars pressure in this time
  PRESS_S: 6,         // and comes back up in this time
  GUST_S: 1.3,        // an unsuited player is blown out for this long when the outer door opens
  EXPOSED_BELOW: 0.9, // below this pressure an unsuited player is hurt
  STUCK_S: 8,         // a player who stays in the depressurised passage this long is cycled back in automatically
} as const;

export type AirlockPhase = 'habitat' | 'inner_closing' | 'depressurising' | 'outer_opening' | 'mars' | 'outer_closing' | 'pressurising' | 'inner_opening';
export type Where = 'inside' | 'chamber' | 'outside';
export type AirlockEvent = 'inner_closed' | 'outer_opened' | 'outer_closed' | 'inner_opened';
export interface Airlock { phase: AirlockPhase; t: number; armed: boolean }

/** A fresh passage: habitat pressure, inner door open, outer door shut. Pass true when the player is outside (Mars pressure, outer door open). */
export const newAirlock = (outside = false): Airlock => outside ? { phase: 'mars', t: 0, armed: true } : { phase: 'habitat', t: 0, armed: true };

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
/** 1 = habitat pressure, 0 = Mars. */
export function pressure(a: Airlock): number {
  switch (a.phase) {
    case 'habitat': case 'inner_closing': return 1;
    case 'depressurising': return clamp01(1 - a.t / AIRLOCK.DEPRESS_S);
    case 'outer_opening': case 'mars': case 'outer_closing': return 0;
    case 'pressurising': return clamp01(a.t / AIRLOCK.PRESS_S);
    case 'inner_opening': return 1;
  }
}
/** How far the inner door is open, 0..1. */
export function innerOpen(a: Airlock): number {
  if (a.phase === 'habitat') return 1;
  if (a.phase === 'inner_closing') return clamp01(1 - a.t / AIRLOCK.DOOR_S);
  if (a.phase === 'inner_opening') return clamp01(a.t / AIRLOCK.DOOR_S);
  return 0;
}
/** How far the outer door is open, 0..1. */
export function outerOpen(a: Airlock): number {
  if (a.phase === 'outer_opening') return clamp01(a.t / AIRLOCK.DOOR_S);
  if (a.phase === 'mars') return 1;
  if (a.phase === 'outer_closing') return clamp01(1 - a.t / AIRLOCK.DOOR_S);
  return 0;
}
/** Collision: the doors are solid until they are mostly open. */
export const innerBlocks = (a: Airlock): boolean => innerOpen(a) < 0.6 || a.phase === 'inner_closing'; // solid from the moment it starts to close
export const outerBlocks = (a: Airlock): boolean => outerOpen(a) < 0.6;
/** True while the passage air is too thin for an unsuited player. */
export const exposed = (a: Airlock): boolean => pressure(a) < AIRLOCK.EXPOSED_BELOW;
/** True while the passage is cycling (the status light is amber). */
export const cycling = (a: Airlock): boolean => a.phase !== 'habitat' && a.phase !== 'mars';

/**
 * Advance the passage by dt seconds.
 * where: which side of the doors the player stands on ('chamber' = in the 2x2 passage). canCycle: false while the storm lock holds the airlock.
 */
export function stepAirlock(a: Airlock, dt: number, where: Where, canCycle: boolean): AirlockEvent[] {
  const ev: AirlockEvent[] = [];
  const next = (p: AirlockPhase) => { a.phase = p; a.t = 0; };
  switch (a.phase) {
    case 'habitat':
      if (where === 'inside') a.armed = true;
      else if (where === 'outside') { next('mars'); a.armed = true; } // the player is outside, so the passage must be at Mars pressure
      else if (where === 'chamber' && a.armed && canCycle) { next('inner_closing'); a.armed = false; }
      break;
    case 'inner_closing': a.t += dt; if (a.t >= AIRLOCK.DOOR_S) { next('depressurising'); ev.push('inner_closed'); } break;
    case 'depressurising': a.t += dt; if (a.t >= AIRLOCK.DEPRESS_S) next('outer_opening'); break;
    case 'outer_opening': a.t += dt; if (a.t >= AIRLOCK.DOOR_S) { next('mars'); a.armed = false; ev.push('outer_opened'); } break;
    case 'mars':
      if (where === 'inside') { next('habitat'); a.armed = true; } // the player is in the base, so the passage must be at habitat pressure (e.g. after a load)
      else if (where === 'outside') { a.armed = true; a.t = 0; }
      else if (where === 'chamber') { a.t += dt; if (a.armed || a.t >= AIRLOCK.STUCK_S) { next('outer_closing'); a.armed = false; } }
      else a.t = 0;
      break;
    case 'outer_closing': a.t += dt; if (a.t >= AIRLOCK.DOOR_S) { next('pressurising'); ev.push('outer_closed'); } break;
    case 'pressurising': a.t += dt; if (a.t >= AIRLOCK.PRESS_S) next('inner_opening'); break;
    case 'inner_opening': a.t += dt; if (a.t >= AIRLOCK.DOOR_S) { next('habitat'); a.armed = false; ev.push('inner_opened'); } break;
  }
  return ev;
}

/** Which side of the doors a tile is on (the passage is x15-16, y17-18; row 19 and below is Mars). */
export const AIRLOCK_TILES = { x0: 15, x1: 16, y0: 17, y1: 18 } as const;
export function whereTile(tx: number, ty: number): Where {
  if (tx >= AIRLOCK_TILES.x0 && tx <= AIRLOCK_TILES.x1 && ty >= AIRLOCK_TILES.y0 && ty <= AIRLOCK_TILES.y1) return 'chamber';
  return ty > AIRLOCK_TILES.y1 ? 'outside' : 'inside';
}
