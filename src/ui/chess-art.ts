// Step 19b: original 8x8 pixel pieces for the chess board (hologram look: one flat colour + a glow added by CSS). Pure data, no DOM, tested in tests/chess-art.test.ts.
export const PIECE_KINDS = ['p', 'n', 'b', 'r', 'q', 'k'] as const;
export type PieceKind = (typeof PIECE_KINDS)[number];
export const PIECE_ART: Record<PieceKind, string[]> = {
  p: ['........', '...##...', '..####..', '..####..', '...##...', '..####..', '.######.', '........'],
  n: ['..###...', '.#####..', '##.####.', '#..####.', '..####..', '..####..', '.######.', '.######.'],
  b: ['...##...', '..####..', '.##.###.', '..####..', '...##...', '..####..', '..####..', '.######.'],
  r: ['#.##.##.', '########', '.######.', '..####..', '..####..', '..####..', '.######.', '########'],
  q: ['#..##..#', '#.####.#', '.######.', '..####..', '..####..', '.######.', '.######.', '########'],
  k: ['...##...', '.######.', '...##...', '..####..', '..####..', '..####..', '.######.', '########'],
};
export const PIECE_NAMES: Record<PieceKind, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** An inline SVG for one piece; fill comes from CSS (currentColor) so it matches the cyan / amber sides. */
export function pieceSvg(kind: PieceKind): string {
  let rects = ''; PIECE_ART[kind].forEach((row, y) => { let x = 0; while (x < row.length) { if (row[x] !== '#') { x++; continue; } let w = 1; while (row[x + w] === '#') w++; rects += `<rect x="${x}" y="${y}" width="${w}" height="1"/>`; x += w; } });
  return `<svg viewBox="0 0 8 8" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true">${rects}</svg>`;
}
