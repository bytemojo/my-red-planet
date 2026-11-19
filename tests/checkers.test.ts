import { describe, expect, it } from 'vitest';
import { NO_PROGRESS_LIMIT, applyMove, computerMove, count, fromRows, legalMoves, newGame, status, type Move } from '../src/core/checkers';
import { mulberry32 } from '../src/core/rng';

const mv = (g: ReturnType<typeof newGame>, from: [number, number], to: [number, number]): Move => {
  const m = legalMoves(g).find(l => l.from[0] === from[0] && l.from[1] === from[1] && l.to[0] === to[0] && l.to[1] === to[1]);
  if (!m) throw new Error(`no legal move ${from} -> ${to}`); return m;
};

describe('Step 18a: checkers core', () => {
  it('starts with 12 men each on dark squares, red to move with 7 opening moves', () => {
    const g = newGame(); expect(count(g, 'red')).toBe(12); expect(count(g, 'black')).toBe(12); expect(g.turn).toBe('red');
    g.board.forEach((row, r) => row.forEach((p, c) => { if (p) expect((r + c) % 2).toBe(1); }));
    expect(legalMoves(g)).toHaveLength(7);
  });
  it('a man steps diagonally forward only', () => {
    const g = fromRows(['........', '........', '........', '........', '...r....', '........', '........', '........']);
    expect(legalMoves(g).map(m => m.to.join(',')).sort()).toEqual(['3,2', '3,4']);
  });
  it('captures are forced: a step is not offered while a jump exists', () => {
    const g = fromRows(['........', '........', '........', '..b.....', '...r....', '......r.', '........', '........']);
    const ms = legalMoves(g); expect(ms).toHaveLength(1); expect(ms[0].captured).toEqual([[3, 2]]); expect(ms[0].to).toEqual([2, 1]);
  });
  it('a multi-jump with two captures ends on the right square', () => {
    const g = fromRows(['........', '........', '..b.....', '........', '..b.....', '.r......', '........', '........']);
    // r at (5,1) jumps (4,2) -> (3,3), then jumps (2,2) -> (1,1)
    const ms = legalMoves(g), m = ms[0]; expect(ms).toHaveLength(1); expect(m.captured).toHaveLength(2); expect(m.to).toEqual([1, 1]);
    expect(count(applyMove(g, m), 'black')).toBe(0); // both jumped pieces are removed
  });
  it('the same piece cannot be jumped twice in one turn', () => {
    const g = fromRows(['........', '........', '........', '..b.b...', '........', '..b.b...', '...r....', '........']);
    for (const m of legalMoves(g)) { const keys = m.captured.map(q => q.join(',')); expect(new Set(keys).size).toBe(keys.length); }
  });
  it('a man that reaches the far row is crowned', () => {
    const g = fromRows(['........', '.r......', '........', '........', '........', '........', '........', '........']);
    const m = legalMoves(g).find(x => x.to[1] === 0)!, n = applyMove(g, m); expect(m.to).toEqual([0, 0]); expect(n.board[0][0]).toBe('R');
  });
  it('crowning ends the turn: a new king does not keep jumping in the same move', () => {
    // red (2,3) jumps (1,4) and lands on (0,5), crowned; as a king it could then jump (1,6) -> (2,7), but the turn ends instead
    const g = fromRows(['........', '..b.b.b.', '...r....', '........', '........', '........', '........', '........']);
    const jumps = legalMoves(g); expect(jumps.length).toBeGreaterThan(0);
    for (const m of jumps) { expect(m.path).toHaveLength(1); expect(m.to[0]).toBe(0); }
    expect(applyMove(g, jumps[0]).board[0][jumps[0].to[1]]).toBe('R');
  });
  it('a king moves and jumps backwards too', () => {
    const g = fromRows(['........', '........', '........', '...R....', '........', '........', '........', '........']);
    expect(legalMoves(g)).toHaveLength(4);
    const g2 = fromRows(['........', '........', '........', '...R....', '....b...', '........', '........', '........']);
    const ms = legalMoves(g2); expect(ms).toHaveLength(1); expect(ms[0].to).toEqual([5, 5]);
  });
  it('a king can chain jumps in different directions', () => {
    const g = fromRows(['........', '........', '..b.....', '........', '..b.....', '...R....', '........', '........']);
    // R (5,3) jumps (4,2) -> (3,1), then (2,2)? (3,1)->(1,3) over (2,2) -> lands (1,3)
    const m = legalMoves(g)[0]; expect(m.captured).toHaveLength(2);
  });
  it('applyMove returns a new game, flips the turn and rejects illegal moves', () => {
    const g = newGame(), m = legalMoves(g)[0], n = applyMove(g, m);
    expect(n).not.toBe(g); expect(g.turn).toBe('red'); expect(n.turn).toBe('black'); expect(count(g, 'red')).toBe(12);
    expect(() => applyMove(g, { from: [0, 1], to: [4, 1], path: [[4, 1]], captured: [] })).toThrow();
  });
  it('wins when the opponent has no pieces left', () => {
    const g = fromRows(['........', '........', '........', '..b.....', '...r....', '........', '........', '........'], 'red');
    const n = applyMove(g, legalMoves(g)[0]); expect(status(n)).toEqual({ over: true, winner: 'red', reason: 'no-pieces' });
  });
  it('wins when the opponent has pieces but no legal move', () => {
    const g = fromRows(['.b......', 'r.r.....', '...r....', '........', '........', '........', '........', '........'], 'black');
    expect(status(g)).toEqual({ over: true, winner: 'red', reason: 'no-moves' });
  });
  it('is a draw after too many plies without a capture or a man move', () => {
    const g = fromRows(['.......R', '........', '........', '........', '........', '........', '........', 'b.......'], 'red', 0);
    expect(status(g).over).toBe(false);
    let q = fromRows(['.......R', '........', '........', '........', '........', '........', '........', 'B.......'], 'red', NO_PROGRESS_LIMIT - 1);
    q = applyMove(q, legalMoves(q)[0]); expect(status(q)).toEqual({ over: true, winner: 'draw', reason: 'no-progress' });
  });
  it('a man move or a capture resets the no-progress counter; king moves count', () => {
    const k = fromRows(['.......R', '........', '........', '........', '........', '........', '........', '.......B'], 'red', 5);
    expect(applyMove(k, legalMoves(k)[0]).quiet).toBe(6);
    const m = fromRows(['........', '........', '........', '........', '...r....', '........', '........', '........'], 'red', 5);
    expect(applyMove(m, legalMoves(m)[0]).quiet).toBe(0);
  });
  it('the computer plays a legal move, takes a capture when there is one, and is repeatable with a seed', () => {
    const g = newGame(); const a = computerMove(g, mulberry32(7)), b = computerMove(g, mulberry32(7));
    expect(a).toEqual(b); expect(legalMoves(g).some(l => l.from[0] === a!.from[0] && l.to[1] === a!.to[1])).toBe(true);
    const c = fromRows(['........', '........', '........', '..b.....', '...r....', '......r.', '........', '........']);
    expect(computerMove(c)!.captured).toHaveLength(1);
    expect(computerMove(fromRows(['.b......', 'r.r.....', '...r....', '........', '........', '........', '........', '........'], 'black'))).toBeNull();
  });
  it('random self-play always finishes with a legal result and never throws', () => {
    for (let seed = 1; seed <= 20; seed++) {
      let g = newGame(); const rng = mulberry32(seed); let plies = 0;
      while (!status(g).over && plies < 600) { g = applyMove(g, computerMove(g, rng)!); plies++; }
      expect(status(g).over, `seed ${seed} did not finish`).toBe(true);
    }
  });
});
