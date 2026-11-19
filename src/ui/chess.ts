// Step 19b: the chess board overlay (rec room table). Cyan holographic pieces are yours (White), amber are the computer's (Black).
// Rules live in core/chess.ts; this file draws and forwards taps. Resolves with the result when the overlay closes (null = left early).
import { applyMove, computerMove, inCheck, legalMoves, newGame, sideOf, sq, sqName, status, type Game, type Move, type PromoPiece, type Sq } from '../core/chess';
import type { GameOutcome } from '../core/games';
import { PIECE_NAMES, pieceSvg, type PieceKind } from './chess-art';
import { head, esc, overlay } from './ui';
import { sfx } from './audio';

const CSS = `
#chess .ch-board{display:grid;grid-template-columns:repeat(8,var(--cs));grid-template-rows:repeat(8,var(--cs));width:max-content;margin:0;border:2px solid #39d9ff;border-radius:6px;box-shadow:0 0 18px rgba(57,217,255,.35);overflow:hidden;--cs:calc(var(--bs) / 8)}
#chess .ch-sq{position:relative;display:flex;align-items:center;justify-content:center;border:0;padding:0;margin:0;min-width:0;min-height:0;background:#0a1a33;cursor:default}
#chess .ch-sq.dark{background:#102a4d}
#chess .ch-sq.last{box-shadow:inset 0 0 0 2px rgba(140,234,255,.45)}
#chess .ch-sq.check{background:#5a2a12}
#chess .ch-sq.go{background:#14456b;cursor:pointer;box-shadow:inset 0 0 0 2px rgba(255,179,64,.9)}
#chess .ch-sq.sel{box-shadow:inset 0 0 0 3px #fff}
#chess .ch-sq:focus-visible{outline:2px solid #fff;outline-offset:-3px}
#chess .ch-sq svg{width:78%;height:78%;filter:drop-shadow(0 0 3px currentColor)}
#chess .ch-sq .me{color:#39d9ff}#chess .ch-sq .cpu{color:#ffb340}
#chess .movable svg{animation:chpulse 1.2s ease-in-out infinite}
@keyframes chpulse{50%{filter:drop-shadow(0 0 8px #fff)}}
@media (prefers-reduced-motion:reduce){#chess .movable svg{animation:none}}
#chess .ch-msg{min-height:2.6em;text-align:center}
#chess .holo-btn{min-height:44px}
#chess .ch-promo{display:flex;gap:8px;justify-content:center;margin:4px 0}
#chess .ch-promo .holo-btn{min-width:44px}
`;
const PROMOS: [PromoPiece, string][] = [['Q', 'Queen'], ['R', 'Rook'], ['B', 'Bishop'], ['N', 'Knight']];

export function openChess(): Promise<GameOutcome | null> {
  if (!document.getElementById('chess-css')) { const st = document.createElement('style'); st.id = 'chess-css'; st.textContent = CSS; document.head.appendChild(st); }
  return new Promise(resolve => {
    let g: Game = newGame(), sel: Sq | null = null, locked = false, hints = true, outcome: GameOutcome | null = null, last: Move | null = null;
    let promo: Move[] | null = null, note = 'Your turn. You play White (blue). Tap a piece.';
    const history: { g: Game; last: Move | null }[] = [];
    const el = overlay('chess', `<div class="holo-panel game-panel">${head('base', 'Chess')}<div class="panel-body"><div class="ch-msg why" id="ch-msg" aria-live="polite"></div><div id="ch-promo"></div><div class="gb-wrap"><div class="gb-ranks" aria-hidden="true"><span>8</span><span>7</span><span>6</span><span>5</span><span>4</span><span>3</span><span>2</span><span>1</span></div><div class="gb-main"><div class="ch-board" id="ch-board"></div><div class="gb-files" aria-hidden="true"><span>a</span><span>b</span><span>c</span><span>d</span><span>e</span><span>f</span><span>g</span><span>h</span></div></div></div><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><span class="row" style="gap:8px"><button class="holo-btn small" id="ch-undo">UNDO</button><button class="holo-btn small" id="ch-hints" aria-pressed="true">HINTS: ON</button><button class="holo-btn small" id="ch-new">NEW GAME</button><button class="holo-btn small" id="ch-resign">RESIGN</button></span><button class="holo-btn small amber" data-close>LEAVE TABLE ▸</button></div></div></div>`);
    const same = (a: Sq, b: Sq) => a[0] === b[0] && a[1] === b[1];
    const $$ = <T extends HTMLElement>(q: string) => el.querySelector(q) as T;
    const render = () => {
      const moves = g.turn === 'white' && !outcome ? legalMoves(g) : [], from = sel ? moves.filter(m => same(m.from, sel!)) : [];
      const movers = hints ? moves.filter((m, i) => moves.findIndex(o => same(o.from, m.from)) === i) : [], king = inCheck(g) ? g.board.flat().findIndex(p => p === (g.turn === 'white' ? 'K' : 'k')) : -1;
      let h = '';
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const p = g.board[r][c], dark = (r + c) % 2 === 1, name = sqName([r, c]);
        const isGo = hints && from.some(m => same(m.to, [r, c])), isMover = movers.some(m => same(m.from, [r, c])), isSel = !!sel && same(sel, [r, c]);
        const isLast = !!last && (same(last.from, [r, c]) || same(last.to, [r, c])), isKingChk = king === r * 8 + c;
        const kind = p ? (p.toLowerCase() as PieceKind) : null, mine = sideOf(p) === 'white';
        const label = p ? `${mine ? 'Your' : 'Computer'} ${PIECE_NAMES[kind!]}, ${name}` : `Empty ${name}`;
        h += `<button class="ch-sq${dark ? ' dark' : ''}${isGo ? ' go' : ''}${isSel ? ' sel' : ''}${isMover ? ' movable' : ''}${isLast ? ' last' : ''}${isKingChk ? ' check' : ''}" data-sq="${name}" aria-label="${esc(label)}">${kind ? `<span class="${mine ? 'me' : 'cpu'}" style="display:contents">${pieceSvg(kind)}</span>` : ''}</button>`;
      }
      const b = $$('#ch-board'); b.innerHTML = h;
      b.querySelectorAll('.ch-sq').forEach(n => ((n as HTMLElement).onclick = () => click(sq((n as HTMLElement).dataset.sq!))));
      $$('#ch-msg').innerHTML = esc(note);
      $$('#ch-resign').toggleAttribute('disabled', !!outcome || locked);
      $$('#ch-undo').toggleAttribute('disabled', !history.length || locked || !!outcome);
      $$('#ch-hints').textContent = `HINTS: ${hints ? 'ON' : 'OFF'}`; $$('#ch-hints').setAttribute('aria-pressed', String(hints));
      const pr = $$('#ch-promo'); pr.innerHTML = promo ? `<div class="ch-promo">${PROMOS.map(([k, n]) => `<button class="holo-btn small" data-pr="${k}" aria-label="Promote to ${n}">${n.toUpperCase()}</button>`).join('')}</div>` : '';
      pr.querySelectorAll('[data-pr]').forEach(n => ((n as HTMLElement).onclick = () => { const k = (n as HTMLElement).dataset.pr as PromoPiece, m = promo!.find(x => x.promotion === k)!; promo = null; play(m); }));
    };
    const finish = () => {
      const st = status(g); if (!st.over) { note = st.check ? (g.turn === 'white' ? 'Check! Protect your king.' : 'Check! Their king is in danger.') : g.turn === 'white' ? 'Your turn.' : note; return false; }
      locked = true; outcome = st.winner === 'draw' ? 'draw' : st.winner === 'white' ? 'win' : 'loss';
      const why = { checkmate: 'Checkmate!', stalemate: 'Stalemate: no legal move, so it is a draw.', 'fifty-move': 'Draw: 50 moves with no capture or pawn move.', insufficient: 'Draw: neither side has enough pieces to win.' }[st.reason];
      note = `${why} ${outcome === 'win' ? 'You won! Close the table to collect the crew cheer.' : outcome === 'draw' ? 'Close the table when you are ready.' : 'The computer won this one. Close the table, or start a new game.'}`;
      outcome === 'win' ? sfx.ok() : sfx.click(); return true;
    };
    const cpuTurn = () => {
      locked = true; note = 'The computer is thinking...'; render();
      setTimeout(() => {
        if (!el.isConnected) return;
        const m = computerMove(g); if (m) { g = applyMove(g, m); last = m; sfx.click(); }
        locked = false; note = 'Your turn.'; finish(); render();
      }, 650);
    };
    const play = (m: Move) => { history.push({ g, last }); g = applyMove(g, m); last = m; sel = null; sfx.click(); if (!finish()) { cpuTurn(); return; } render(); };
    const click = (s: Sq) => {
      if (locked || outcome || g.turn !== 'white' || promo) return;
      const moves = legalMoves(g), mine = moves.filter(m => same(m.from, s));
      if (sel) {
        const to = moves.filter(x => same(x.from, sel!) && same(x.to, s));
        if (to.length === 1) return play(to[0]);
        if (to.length > 1) { promo = to; sfx.click(); note = 'Choose what your pawn becomes.'; return render(); }
      }
      if (mine.length) { sel = s; sfx.click(); note = hints ? 'Tap a glowing square to move.' : 'Tap the square you want to move to.'; }
      else { sel = null; sfx.warn(); note = sideOf(g.board[s[0]][s[1]]) === 'white' ? 'That piece cannot move right now.' : inCheck(g) ? 'Your king is in check! Move it, block, or capture.' : 'Tap one of your blue pieces.'; }
      render();
    };
    $$('#ch-undo').onclick = () => { if (locked || outcome || !history.length) return; sfx.click(); const h = history.pop()!; g = h.g; last = h.last; sel = null; promo = null; note = 'Move undone. Your turn.'; render(); };
    $$('#ch-hints').onclick = () => { sfx.click(); hints = !hints; note = hints ? 'Hints on: legal moves glow.' : 'Hints off: no glowing squares. Good luck!'; render(); };
    $$('#ch-resign').onclick = () => { if (outcome || locked) return; sfx.click(); outcome = 'loss'; locked = true; promo = null; sel = null; note = 'You resigned. Close the table, or start a new game.'; render(); };
    $$('#ch-new').onclick = () => { if (outcome) return; sfx.click(); g = newGame(); sel = null; promo = null; locked = false; last = null; history.length = 0; note = 'New game. Your turn.'; render(); };
    new MutationObserver((_m, ob) => { if (!el.isConnected) { ob.disconnect(); resolve(outcome); } }).observe(document.getElementById('overlays')!, { childList: true });
    render();
  });
}
