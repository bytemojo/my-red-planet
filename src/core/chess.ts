// Step 19a: chess rules. Pure logic: no Phaser, no DOM, no engine. Row 0 = rank 8 (top), White starts at the bottom and moves first.
// Pieces: uppercase = White, lowercase = Black (P N B R Q K). Full rules: check, checkmate, stalemate, castling, en passant, promotion,
// 50-move rule and insufficient material. (Threefold repetition is not tracked: the UI can add it later.)
export type Side = 'white' | 'black';
export type Piece = string | null; // one letter or null
export type Board = Piece[][];
export type Sq = readonly [number, number]; // [row, col]
export type PromoPiece = 'Q' | 'R' | 'B' | 'N';
export interface Move { from: Sq; to: Sq; promotion?: PromoPiece; /** set by the generator, informational */ kind?: 'castle-k' | 'castle-q' | 'ep' }
export interface Rights { K: boolean; Q: boolean; k: boolean; q: boolean }
export interface Game { board: Board; turn: Side; rights: Rights; /** square a pawn just skipped over (en passant target) */ ep: Sq | null; /** plies since the last capture or pawn move */ half: number; full: number }
export type Result = { over: false; check: boolean } | { over: true; winner: Side | 'draw'; reason: 'checkmate' | 'stalemate' | 'fifty-move' | 'insufficient' };

export const SIZE = 8;
export const FIFTY_MOVE_PLIES = 100;
export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const other = (s: Side): Side => (s === 'white' ? 'black' : 'white');
export const sideOf = (p: Piece): Side | null => (p ? (p === p.toUpperCase() ? 'white' : 'black') : null);
export const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const inB = (r: number, c: number) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;
const same = (a: Sq, b: Sq) => a[0] === b[0] && a[1] === b[1];
const KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]], KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]], ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];

/** 'e4' -> [4,4] */
export const sq = (name: string): Sq => [8 - Number(name[1]), name.charCodeAt(0) - 97];
export const sqName = (s: Sq) => String.fromCharCode(97 + s[1]) + (8 - s[0]);

export function fromFen(fen: string): Game {
  const [pos, turn = 'w', cs = '-', ep = '-', half = '0', full = '1'] = fen.trim().split(/\s+/);
  const rows = pos.split('/'); if (rows.length !== 8) throw new Error('bad FEN');
  const board: Board = rows.map(row => { const out: Piece[] = []; for (const ch of row) { if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) out.push(null); else out.push(ch); } if (out.length !== 8) throw new Error('bad FEN row'); return out; });
  return { board, turn: turn === 'w' ? 'white' : 'black', rights: { K: cs.includes('K'), Q: cs.includes('Q'), k: cs.includes('k'), q: cs.includes('q') }, ep: ep === '-' ? null : sq(ep), half: +half, full: +full };
}
export const newGame = (): Game => fromFen(START_FEN);

function attacked(b: Board, r: number, c: number, by: Side): boolean {
  const up = by === 'white'; // white pawns attack towards row-1, so they sit at row+1
  const own = (p: Piece, ch: string) => p === (up ? ch.toUpperCase() : ch.toLowerCase());
  const pr = up ? r + 1 : r - 1;
  for (const dc of [-1, 1]) if (inB(pr, c + dc) && own(b[pr][c + dc], 'p')) return true;
  for (const [dr, dc] of KN) if (inB(r + dr, c + dc) && own(b[r + dr][c + dc], 'n')) return true;
  for (const [dr, dc] of KG) if (inB(r + dr, c + dc) && own(b[r + dr][c + dc], 'k')) return true;
  for (const [dirs, kinds] of [[DIAG, ['b', 'q']], [ORTH, ['r', 'q']]] as const) for (const [dr, dc] of dirs) {
    for (let rr = r + dr, cc = c + dc; inB(rr, cc); rr += dr, cc += dc) { const p = b[rr][cc]; if (!p) continue; if (kinds.some(k => own(p, k))) return true; break; }
  }
  return false;
}
function kingSq(b: Board, s: Side): Sq | null { const k = s === 'white' ? 'K' : 'k'; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (b[r][c] === k) return [r, c]; return null; }
export function inCheck(g: Game, s: Side = g.turn): boolean { const k = kingSq(g.board, s); return !!k && attacked(g.board, k[0], k[1], other(s)); }

function pseudo(g: Game): Move[] {
  const out: Move[] = [], b = g.board, me = g.turn, white = me === 'white';
  const add = (from: Sq, r: number, c: number, extra: Partial<Move> = {}) => out.push({ from, to: [r, c], ...extra });
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = b[r][c]; if (!p || sideOf(p) !== me) continue; const t = p.toLowerCase(), from: Sq = [r, c];
    if (t === 'p') {
      const dr = white ? -1 : 1, start = white ? 6 : 1, last = white ? 0 : 7;
      const push = (rr: number, cc: number, extra: Partial<Move> = {}) => { if (rr === last) for (const pr of ['Q', 'R', 'B', 'N'] as const) add(from, rr, cc, { promotion: pr }); else add(from, rr, cc, extra); };
      if (inB(r + dr, c) && !b[r + dr][c]) { push(r + dr, c); if (r === start && !b[r + 2 * dr][c]) add(from, r + 2 * dr, c); }
      for (const dc of [-1, 1]) { const rr = r + dr, cc = c + dc; if (!inB(rr, cc)) continue; const q = b[rr][cc];
        if (q && sideOf(q) !== me) push(rr, cc); else if (!q && g.ep && g.ep[0] === rr && g.ep[1] === cc) add(from, rr, cc, { kind: 'ep' }); }
    } else if (t === 'n' || t === 'k') {
      for (const [dr, dc] of t === 'n' ? KN : KG) { const rr = r + dr, cc = c + dc; if (inB(rr, cc) && sideOf(b[rr][cc]) !== me) add(from, rr, cc); }
      if (t === 'k') { // castling: rights, empty squares between, king not in check and not passing through an attack
        const row = white ? 7 : 0, foe = other(me);
        if (r === row && c === 4 && !attacked(b, row, 4, foe)) {
          if ((white ? g.rights.K : g.rights.k) && b[row][7] === (white ? 'R' : 'r') && !b[row][5] && !b[row][6] && !attacked(b, row, 5, foe) && !attacked(b, row, 6, foe)) add(from, row, 6, { kind: 'castle-k' });
          if ((white ? g.rights.Q : g.rights.q) && b[row][0] === (white ? 'R' : 'r') && !b[row][1] && !b[row][2] && !b[row][3] && !attacked(b, row, 3, foe) && !attacked(b, row, 2, foe)) add(from, row, 2, { kind: 'castle-q' });
        }
      }
    } else {
      for (const [dr, dc] of t === 'b' ? DIAG : t === 'r' ? ORTH : [...DIAG, ...ORTH]) for (let rr = r + dr, cc = c + dc; inB(rr, cc); rr += dr, cc += dc) {
        const q = b[rr][cc]; if (!q) { add(from, rr, cc); continue; } if (sideOf(q) !== me) add(from, rr, cc); break;
      }
    }
  }
  return out;
}

/** Plays a (pseudo-legal) move on a copy without checking legality. */
function play(g: Game, m: Move): Game {
  const board = g.board.map(r => [...r]), p = board[m.from[0]][m.from[1]]!, t = p.toLowerCase(), white = g.turn === 'white';
  const target = board[m.to[0]][m.to[1]], rights = { ...g.rights };
  board[m.from[0]][m.from[1]] = null;
  if (m.kind === 'ep') board[m.from[0]][m.to[1]] = null; // the captured pawn sits beside the mover
  board[m.to[0]][m.to[1]] = m.promotion ? (white ? m.promotion : m.promotion.toLowerCase()) : p;
  if (m.kind === 'castle-k') { const r = m.to[0]; board[r][5] = board[r][7]; board[r][7] = null; }
  if (m.kind === 'castle-q') { const r = m.to[0]; board[r][3] = board[r][0]; board[r][0] = null; }
  if (t === 'k') { if (white) rights.K = rights.Q = false; else rights.k = rights.q = false; }
  for (const [r, c, k] of [[7, 0, 'Q'], [7, 7, 'K'], [0, 0, 'q'], [0, 7, 'k']] as const) if ((m.from[0] === r && m.from[1] === c) || (m.to[0] === r && m.to[1] === c)) rights[k] = false;
  return { board, turn: other(g.turn), rights, ep: t === 'p' && Math.abs(m.to[0] - m.from[0]) === 2 ? [(m.from[0] + m.to[0]) / 2, m.from[1]] : null,
    half: t === 'p' || target || m.kind === 'ep' ? 0 : g.half + 1, full: g.full + (g.turn === 'black' ? 1 : 0) };
}

/** Every legal move for the side to move (moves that leave your own king in check are removed). */
export function legalMoves(g: Game): Move[] { return pseudo(g).filter(m => !inCheck(play(g, m), g.turn)); }
export const sameMove = (a: Move, b: Move) => same(a.from, b.from) && same(a.to, b.to) && a.promotion === b.promotion;

/** Plays a move and returns a NEW game; throws if it is not legal. A pawn reaching the last rank must say which piece it becomes. */
export function applyMove(g: Game, m: Move): Game {
  const legal = legalMoves(g).find(l => sameMove(l, m)); if (!legal) throw new Error('illegal chess move');
  return play(g, legal);
}

function insufficient(b: Board): boolean {
  const rest = b.flat().filter(p => p && p.toLowerCase() !== 'k') as string[];
  return rest.length === 0 || (rest.length === 1 && 'bn'.includes(rest[0].toLowerCase()));
}

export function status(g: Game): Result {
  const check = inCheck(g), none = legalMoves(g).length === 0;
  if (none) return check ? { over: true, winner: other(g.turn), reason: 'checkmate' } : { over: true, winner: 'draw', reason: 'stalemate' };
  if (insufficient(g.board)) return { over: true, winner: 'draw', reason: 'insufficient' };
  if (g.half >= FIFTY_MOVE_PLIES) return { over: true, winner: 'draw', reason: 'fifty-move' };
  return { over: false, check };
}

const mated = (g: Game) => { const s = status(g); return s.over && s.winner !== 'draw'; };
/** The simple computer (no engine): mate in one if it sees it; never a move that allows mate in one if there is a safer one; otherwise the biggest capture; otherwise random. */
export function computerMove(g: Game, rng: () => number = Math.random): Move | null {
  const moves = legalMoves(g); if (!moves.length) return null;
  const pick = (a: Move[]) => a[Math.min(a.length - 1, Math.floor(rng() * a.length))];
  const mates = moves.filter(m => mated(play(g, m))); if (mates.length) return pick(mates);
  const safe = moves.filter(m => { const n = play(g, m); return !pseudo(n).some(r => { const n2 = play(n, r); return !inCheck(n2, n.turn) && mated(n2); }); });
  const pool = safe.length ? safe : moves;
  const gain = (m: Move) => { const v = g.board[m.to[0]][m.to[1]]; return (v ? VALUE[v.toLowerCase()] : m.kind === 'ep' ? 1 : 0) + (m.promotion ? 8 : 0); };
  const best = Math.max(...pool.map(gain)); return pick(best > 0 ? pool.filter(m => gain(m) === best) : pool);
}
