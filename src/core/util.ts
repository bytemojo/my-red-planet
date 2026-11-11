import type { GameState } from './types';
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const hasBuilding = (s: GameState, id: string) => s.buildings.includes(id);
export const flagNum = (s: GameState, k: string) => (typeof s.flags[k] === 'number' ? (s.flags[k] as number) : 0);
export const caveTotal = (s: GameState) => s.cave.explore + s.cave.excavate + s.cave.pressurize + s.cave.shield;
export const addLog = (s: GameState, who: string, text: string) => { s.log.unshift({ sol: s.sol, who, text }); if (s.log.length > 80) s.log.length = 80; };
