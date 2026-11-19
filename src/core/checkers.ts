// Step 18a: checkers (English draughts) rules. Pure logic: no Phaser, no DOM. 8x8, dark squares only, forced captures, multi-jumps, kings.
// Red starts at the bottom and moves first (up the board); Black starts at the top (down). A man that reaches the far row becomes a king and its move ends there.
export type Side = 'red' | 'black';
/** r/b = man, R/B = king, null = empty. */
export type Piece = 'r' | 'b' | 'R' | 'B' | null;
export type Board = Piece[][];
export type Sq = readonly [number, number]; // [row, col], row 0 = top
export interface Move { from: Sq; to: Sq; /** every landing square in order (one for a step, several for a multi-jump) */ path: Sq[]; captured: Sq[] }
export interface Game { board: Board; turn: Side; /** plies since the last capture or man move */ quiet: number }
export type Result = { over: false } | { over: true; winner: Side | 'draw'; reason: 'no-pieces' | 'no-moves' | 'no-progress' };

export const SIZE = 8;
/** 40 moves each (80 plies) with no capture and no man move is a draw. */
export const NO_PROGRESS_LIMIT = 80;
export const other = (s: Side): Side => (s === 'red' ? 'black' : 'red');
export const sideOf = (p: Piece): Side | null => (p === 'r' || p === 'R' ? 'red' : p === 'b' || p === 'B' ? 'black' : null);
const isKing = (p: Piece) => p === 'R' || p === 'B';
const kingRow = (s: Side) => (s === 'red' ? 0 : SIZE - 1);
const inB = (r: number, c: number) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;
const sameSq = (a: Sq, b: Sq) => a[0] === b[0] && a[1] === b[1];

export function newGame(): Game {
  const board: Board = Array.from({ length: SIZE }, () => Array<Piece>(SIZE).fill(null));
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if ((r + c) % 2 === 1) board[r][c] = r < 3 ? 'b' : r > 4 ? 'r' : null;
  return { board, turn: 'red', quiet: 0 };
}

/** Build a position from 8 strings of 8 chars ('.' empty, r b men, R B kings). Used by tests and by the UI for puzzles. */
export function fromRows(rows: string[], turn: Side = 'red', quiet = 0): Game {
  if (rows.length !== SIZE || rows.some(r => r.length !== SIZE)) throw new Error('need 8 rows of 8 characters');
  return { board: rows.map(row => [...row].map(ch => (ch === '.' ? null : (ch as Piece)))), turn, quiet };
}

export const count = (g: Game, s: Side) => g.board.flat().filter(p => sideOf(p) === s).length;

function jumpsFrom(board: Board, side: Side, r0: number, c0: number): Move[] {
  const out: Move[] = [], start: Sq = [r0, c0], king0 = isKing(board[r0][c0]);
  const empty = (r: number, c: number) => board[r][c] === null || (r === r0 && c === c0); // the jumper has left its start square
  const dfs = (r: number, c: number, king: boolean, path: Sq[], caps: Sq[]) => {
    let more = false;
    for (const dr of king ? [-1, 1] : side === 'red' ? [-1] : [1]) for (const dc of [-1, 1]) {
      const mr = r + dr, mc = c + dc, lr = r + 2 * dr, lc = c + 2 * dc;
      if (!inB(lr, lc) || sideOf(board[mr][mc]) !== other(side) || caps.some(q => q[0] === mr && q[1] === mc) || !empty(lr, lc)) continue;
      more = true;
      const crowned = !king && lr === kingRow(side), p2 = [...path, [lr, lc] as Sq], c2 = [...caps, [mr, mc] as Sq];
      if (crowned) out.push({ from: start, to: [lr, lc], path: p2, captured: c2 }); // crowning ends the turn
      else dfs(lr, lc, king, p2, c2);
    }
    if (!more && caps.length) out.push({ from: start, to: path[path.length - 1], path, captured: caps });
  };
  dfs(r0, c0, king0, [], []);
  return out;
}

/** All legal moves for the side to move. If any capture exists, ONLY captures are returned (forced), and each one is a full multi-jump. */
export function legalMoves(g: Game): Move[] {
  const side = g.turn, jumps: Move[] = [], steps: Move[] = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const p = g.board[r][c]; if (sideOf(p) !== side) continue;
    jumps.push(...jumpsFrom(g.board, side, r, c));
    for (const dr of isKing(p) ? [-1, 1] : side === 'red' ? [-1] : [1]) for (const dc of [-1, 1]) {
      const nr = r + dr, nc = c + dc;
      if (inB(nr, nc) && g.board[nr][nc] === null) steps.push({ from: [r, c], to: [nr, nc], path: [[nr, nc]], captured: [] });
    }
  }
  return jumps.length ? jumps : steps;
}

export const sameMove = (a: Move, b: Move) => sameSq(a.from, b.from) && a.path.length === b.path.length && a.path.every((q, i) => sameSq(q, b.path[i]));

/** Plays a move and returns a NEW game; throws if it is not one of legalMoves (so a UI bug cannot corrupt the board). */
export function applyMove(g: Game, m: Move): Game {
  const legal = legalMoves(g).find(l => sameMove(l, m));
  if (!legal) throw new Error('illegal checkers move');
  const board = g.board.map(row => [...row]), piece = board[legal.from[0]][legal.from[1]]!;
  board[legal.from[0]][legal.from[1]] = null;
  for (const [r, c] of legal.captured) board[r][c] = null;
  const [tr, tc] = legal.to, crowned = !isKing(piece) && tr === kingRow(g.turn);
  board[tr][tc] = crowned ? (piece.toUpperCase() as Piece) : piece;
  const progress = legal.captured.length > 0 || !isKing(piece);
  return { board, turn: other(g.turn), quiet: progress ? 0 : g.quiet + 1 };
}

/** Who has won, if anyone. A side with no pieces or no legal move on its turn loses; too long without progress is a draw. */
export function status(g: Game): Result {
  if (count(g, g.turn) === 0) return { over: true, winner: other(g.turn), reason: 'no-pieces' };
  if (legalMoves(g).length === 0) return { over: true, winner: other(g.turn), reason: 'no-moves' };
  if (g.quiet >= NO_PROGRESS_LIMIT) return { over: true, winner: 'draw', reason: 'no-progress' };
  return { over: false };
}

/** The simple computer: a capture is forced anyway, so among captures take the longest chain, otherwise a random legal move. rng() must return [0,1). */
export function computerMove(g: Game, rng: () => number = Math.random): Move | null {
  const moves = legalMoves(g); if (!moves.length) return null;
  const best = Math.max(...moves.map(m => m.captured.length));
  const pool = moves.filter(m => m.captured.length === best);
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}
