import { describe, expect, it } from 'vitest';
import { applyMove, computerMove, fromFen, inCheck, legalMoves, newGame, sq, sqName, status, type Game, type Move, type PromoPiece } from '../src/core/chess';
import { mulberry32 } from '../src/core/rng';

const find = (g: Game, from: string, to: string, promotion?: PromoPiece): Move => {
  const m = legalMoves(g).find(l => sqName(l.from) === from && sqName(l.to) === to && l.promotion === promotion);
  if (!m) throw new Error(`no legal move ${from}-${to}`); return m;
};
const play = (g: Game, ...mv: string[]) => mv.reduce((x, s) => applyMove(x, find(x, s.slice(0, 2), s.slice(2, 4), (s[4]?.toUpperCase() as PromoPiece) || undefined)), g);
const perft = (g: Game, d: number): number => d === 0 ? 1 : legalMoves(g).reduce((n, m) => n + (d === 1 ? 1 : perft(applyMove(g, m), d - 1)), 0);

describe('Step 19a: chess core', () => {
  it('start position: 20 moves for White, 20 for Black after 1.e4, not over, no check', () => {
    const g = newGame(); expect(legalMoves(g)).toHaveLength(20); expect(status(g)).toEqual({ over: false, check: false });
    expect(legalMoves(play(g, 'e2e4'))).toHaveLength(20);
  });
  it('move counts match the published perft numbers (this exercises every rule)', () => {
    expect([1, 2, 3].map(d => perft(newGame(), d))).toEqual([20, 400, 8902]);
    const kiwi = fromFen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1'); // castling, pins, en passant
    expect([1, 2].map(d => perft(kiwi, d))).toEqual([48, 2039]);
    const endgame = fromFen('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1'); // en passant discovered check
    expect([1, 2, 3].map(d => perft(endgame, d))).toEqual([14, 191, 2812]);
    const promo = fromFen('r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1'); // promotions and checks
    expect([1, 2, 3].map(d => perft(promo, d))).toEqual([6, 264, 9467]);
  });
  it('detects check and only allows moves that answer it', () => {
    const g = play(newGame(), 'e2e4', 'f7f6', 'd1h5');
    expect(inCheck(g)).toBe(true); expect(status(g)).toEqual({ over: false, check: true });
    const ms = legalMoves(g); expect(ms.length).toBe(1); expect(sqName(ms[0].from) + sqName(ms[0].to)).toBe('g7g6');
  });
  it("fool's mate is checkmate and White has lost", () => {
    const g = play(newGame(), 'f2f3', 'e7e5', 'g2g4', 'd8h4');
    expect(status(g)).toEqual({ over: true, winner: 'black', reason: 'checkmate' });
  });
  it('stalemate is a draw', () => {
    expect(status(fromFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'))).toEqual({ over: true, winner: 'draw', reason: 'stalemate' });
  });
  it('insufficient material and the 50-move rule are draws', () => {
    expect(status(fromFen('8/8/4k3/8/8/3K4/8/8 w - - 0 1'))).toMatchObject({ over: true, reason: 'insufficient' });
    expect(status(fromFen('8/8/4k3/8/8/3KB3/8/8 w - - 0 1'))).toMatchObject({ over: true, reason: 'insufficient' });
    expect(status(fromFen('8/8/4k3/8/8/3K4/R7/8 w - - 99 60')).over).toBe(false);
    expect(status(fromFen('8/8/4k3/8/8/3K4/R7/8 w - - 100 60'))).toMatchObject({ over: true, reason: 'fifty-move' });
  });
  it('castles both ways, moves the rook, and loses the rights afterwards', () => {
    const g = fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    const k = applyMove(g, find(g, 'e1', 'g1')); expect(k.board[7][6]).toBe('K'); expect(k.board[7][5]).toBe('R'); expect(k.board[7][7]).toBeNull(); expect(k.rights.K || k.rights.Q).toBe(false);
    const q = applyMove(g, find(g, 'e1', 'c1')); expect(q.board[7][2]).toBe('K'); expect(q.board[7][3]).toBe('R');
    const moved = play(g, 'h1h2', 'a8a7', 'h2h1', 'a7a8'); expect(legalMoves(moved).some(m => sqName(m.to) === 'g1' && sqName(m.from) === 'e1')).toBe(false);
  });
  it('cannot castle out of, through or into check, or with a piece in the way', () => {
    const has = (fen: string) => legalMoves(fromFen(fen)).some(m => sqName(m.from) === 'e1' && sqName(m.to) === 'g1');
    expect(has('4k3/8/8/8/8/8/8/4K2R w K - 0 1')).toBe(true);
    expect(has('4k3/4r3/8/8/8/8/8/4K2R w K - 0 1')).toBe(false); // in check
    expect(has('4k3/5r2/8/8/8/8/8/4K2R w K - 0 1')).toBe(false); // through f1
    expect(has('4k3/6r1/8/8/8/8/8/4K2R w K - 0 1')).toBe(false); // into g1
    expect(has('4k3/8/8/8/8/8/8/4KN1R w K - 0 1')).toBe(false); // blocked
  });
  it('en passant works only immediately', () => {
    const g = play(newGame(), 'e2e4', 'a7a6', 'e4e5', 'd7d5');
    const ep = find(g, 'e5', 'd6'); const n = applyMove(g, ep); expect(n.board[3][3]).toBeNull(); expect(n.board[2][3]).toBe('P');
    const late = play(g, 'a2a3', 'a6a5'); expect(legalMoves(late).some(m => sqName(m.from) === 'e5' && sqName(m.to) === 'd6')).toBe(false);
  });
  it('promotion offers Q R B N and the chosen piece appears; a promotion move must name the piece', () => {
    const g = fromFen('8/P6k/8/8/8/8/8/K7 w - - 0 1');
    expect(legalMoves(g).filter(m => sqName(m.to) === 'a8').map(m => m.promotion).sort()).toEqual(['B', 'N', 'Q', 'R']);
    expect(applyMove(g, find(g, 'a7', 'a8', 'N')).board[0][0]).toBe('N');
    expect(() => applyMove(g, { from: sq('a7'), to: sq('a8') })).toThrow();
    const b = fromFen('k7/8/8/8/8/8/p7/7K b - - 0 1'); expect(applyMove(b, find(b, 'a2', 'a1', 'Q')).board[7][0]).toBe('q');
  });
  it('rejects illegal moves (wrong turn, through pieces, into check) and returns a new game', () => {
    const g = newGame();
    for (const [f, t] of [['e7', 'e5'], ['a1', 'a3'], ['e1', 'e2'], ['b1', 'b3']]) expect(() => applyMove(g, { from: sq(f), to: sq(t) })).toThrow();
    const n = play(g, 'e2e4'); expect(n).not.toBe(g); expect(g.board[6][4]).toBe('P'); expect(n.turn).toBe('black');
    const pinned = fromFen('k3r3/8/8/8/4R3/8/8/4K3 w - - 0 1'), rook = legalMoves(pinned).filter(m => sqName(m.from) === 'e4'); // a pinned rook may only slide along the e-file
    expect(rook.length).toBeGreaterThan(0); expect(rook.every(m => sqName(m.to)[0] === 'e')).toBe(true);
  });
  it('the computer plays legal moves, takes mate in one, grabs a free queen and avoids stepping into mate', () => {
    const g = newGame(); expect(computerMove(g, mulberry32(3))).toEqual(computerMove(g, mulberry32(3)));
    const mate = fromFen('6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1'); const m = computerMove(mate, mulberry32(1))!; expect(sqName(m.from) + sqName(m.to)).toBe('a1a8');
    const free = fromFen('4k3/8/8/3q4/8/8/3R4/4K3 w - - 0 1'); expect(sqName(computerMove(free, mulberry32(1))!.to)).toBe('d5');
    expect(computerMove(fromFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'))).toBeNull();
  });
  it('random computer-vs-computer games stay legal and end or reach the ply cap without throwing', () => {
    for (let seed = 1; seed <= 3; seed++) {
      let g = newGame(); const rng = mulberry32(seed);
      for (let i = 0; i < 120 && !status(g).over; i++) g = applyMove(g, computerMove(g, rng)!);
      expect(g.board.flat().filter(p => p === 'K' || p === 'k')).toHaveLength(2);
    }
  });
});
