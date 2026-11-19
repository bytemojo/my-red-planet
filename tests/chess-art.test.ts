import { describe, expect, it } from 'vitest';
import { PIECE_ART, PIECE_KINDS, pieceSvg } from '../src/ui/chess-art';

describe('Step 19b: chess piece art', () => {
  it('has all six pieces as 8x8 grids that draw something and are all different', () => {
    expect(PIECE_KINDS).toHaveLength(6);
    for (const k of PIECE_KINDS) { const a = PIECE_ART[k]; expect(a, k).toHaveLength(8); a.forEach(r => expect(r).toMatch(/^[.#]{8}$/)); expect(a.join('').includes('#')).toBe(true); }
    expect(new Set(PIECE_KINDS.map(k => PIECE_ART[k].join('|'))).size).toBe(6);
  });
  it('renders an svg with one rect per run of pixels', () => {
    const s = pieceSvg('p'); expect(s.startsWith('<svg')).toBe(true); expect(s.match(/<rect/g)!.length).toBe(PIECE_ART.p.filter(r => r.includes('#')).length);
  });
});
