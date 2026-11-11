import type { GameState } from '../core/types';
export const TILE = 16, W = 40, H = 28;
export type Kind = 'ground' | 'floor' | 'wall' | 'glass' | 'door' | 'ridge';

// Outpost footprint x4..27, y2..16. Sick bay (quarantine) is lower-left, behind glass at y=9 until the crew recovers.
export function kindAt(x: number, y: number, s: GameState): Kind {
  if (x <= 1 || x >= 38 || y <= 0 || y >= 26) return 'ridge';
  const inX = x >= 4 && x <= 27, inY = y >= 2 && y <= 16;
  if (!inX || !inY) return 'ground';
  const edge = x === 4 || x === 27 || y === 2 || y === 16;
  if (edge) return (y === 16 && (x === 15 || x === 16)) ? 'door' : 'wall';       // airlock gap
  if (x === 14 || x === 17) return (y === 10 || y === 11) ? 'floor' : 'wall';    // corridor walls with doorways
  if (y === 9 && x < 14) return x >= 8 && x <= 10 ? (s.flags.quarantine_over ? 'floor' : 'glass') : 'glass';
  if (y === 9 && x > 17) return x >= 21 && x <= 24 ? 'floor' : 'wall';
  return 'floor';
}
export const isBlocked = (x: number, y: number, s: GameState) => { const k = kindAt(x, y, s); return k === 'wall' || k === 'glass' || k === 'ridge'; };
export const isOutside = (_x: number, y: number) => y >= 17;

export interface Obj { id: string; type: 'plot' | 'console' | 'bed' | 'intercom' | 'solar' | 'npc' | 'rover' | 'cave' | 'shipment'; x: number; y: number; w?: number; frame?: string; label: string; show?: (s: GameState) => boolean }
export const OBJECTS: Obj[] = [
  ...['p0', 'p1', 'p2', 'p3', 'p4', 'p5'].map((id, i) => ({ id, type: 'plot' as const, x: 6 + (i % 3) * 2, y: i < 3 ? 4 : 6, label: 'Plant', show: (s: GameState) => s.plots.some(p => p.id === id) })),
  { id: 'console', type: 'console', x: 15, y: 4, frame: 'obj_console', label: 'Console' },
  { id: 'intercom', type: 'intercom', x: 9, y: 8, frame: 'obj_intercom', label: 'Intercom', show: s => !s.flags.quarantine_over },
  { id: 'bed', type: 'bed', x: 20, y: 13, frame: 'obj_bed', label: 'Sleep' },
  ...Array.from({ length: 8 }, (_, i) => ({ id: `panel${i}`, type: 'solar' as const, x: 9 + (i % 4) * 4, y: 20 + Math.floor(i / 4) * 3, frame: 'obj_panel', label: 'Solar panel' })),
  { id: 'rover', type: 'rover', x: 31, y: 19, w: 2, frame: 'obj_rover', label: 'Rover', show: s => s.buildings.includes('rover_bay') },
  { id: 'cave', type: 'cave', x: 33, y: 4, frame: 'obj_cave', label: 'Cave', show: s => !!s.flags.cave_unlocked },
];
export const BUILDING_SLOTS: Record<string, { x: number; y: number; frame: string; w: number }> = {
  solar_2: { x: 30, y: 9, frame: 'bld_solar_2', w: 2 }, recycler: { x: 30, y: 12, frame: 'bld_recycler', w: 1 },
  shelter: { x: 33, y: 12, frame: 'bld_shelter', w: 1 }, rover_bay: { x: 30, y: 16, frame: 'bld_rover_bay', w: 2 },
};
// Crew stand behind the glass until quarantine ends, then move into the habitat.
export const CREW_SPOTS: Record<string, { sick: [number, number]; free: [number, number] }> = {
  reyes: { sick: [6, 11], free: [20, 5] }, aiko: { sick: [9, 12], free: [12, 5] },
  david: { sick: [12, 11], free: [22, 12] }, sofia: { sick: [7, 14], free: [10, 13] },
};
