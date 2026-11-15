export interface TilePoint { x: number; y: number }
export interface TilePath {
  path: TilePoint[];
  destination: TilePoint;
  reached: boolean;
}

const DIRECTIONS: readonly TilePoint[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

export function pathToClosestReachable(
  width: number,
  height: number,
  start: TilePoint,
  target: TilePoint,
  blocked: (x: number, y: number) => boolean,
): TilePath {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new RangeError('Pathfinding grid dimensions must be positive integers.');
  }
  const inBounds = (p: TilePoint) => p.x >= 0 && p.y >= 0 && p.x < width && p.y < height;
  if (!inBounds(start) || !inBounds(target)) throw new RangeError('Pathfinding points must be inside the grid.');

  const index = (x: number, y: number) => y * width + x;
  const startIndex = index(start.x, start.y);
  const targetIndex = index(target.x, target.y);
  const parents = new Int32Array(width * height).fill(-2);
  const queue = new Int32Array(width * height);
  parents[startIndex] = -1;
  queue[0] = startIndex;

  let head = 0, tail = 1, destinationIndex = startIndex;
  let bestDistance = (start.x - target.x) ** 2 + (start.y - target.y) ** 2;
  let reached = startIndex === targetIndex;

  while (head < tail) {
    const current = queue[head++];
    if (current === targetIndex) {
      destinationIndex = current;
      reached = true;
      break;
    }
    const x = current % width, y = Math.floor(current / width);
    for (const direction of DIRECTIONS) {
      const nx = x + direction.x, ny = y + direction.y;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height || blocked(nx, ny)) continue;
      const next = index(nx, ny);
      if (parents[next] !== -2) continue;
      parents[next] = current;
      queue[tail++] = next;
      const distance = (nx - target.x) ** 2 + (ny - target.y) ** 2;
      if (distance < bestDistance) {
        destinationIndex = next;
        bestDistance = distance;
      }
    }
  }

  const path: TilePoint[] = [];
  for (let current = destinationIndex; current !== startIndex && current >= 0; current = parents[current]) {
    path.push({ x: current % width, y: Math.floor(current / width) });
  }
  path.reverse();
  return {
    path,
    destination: { x: destinationIndex % width, y: Math.floor(destinationIndex / width) },
    reached,
  };
}
