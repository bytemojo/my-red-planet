import { describe, expect, it } from 'vitest';
import { pathToClosestReachable } from '../src/game/pathfinding';

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
