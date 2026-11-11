// Small deterministic RNG. Seeded per (seed, sol) so a rewound Sol rolls the same dice.
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const hash01 = (n: number) => mulberry32(n * 2654435761)();
export const rngFor = (seed: number, sol: number) => mulberry32((seed ^ (sol * 7919)) >>> 0);
