// Step 18b: the checkers board overlay (rec room table). Cyan holographic pieces are yours, amber are the computer's.
// Rules live in core/checkers.ts; this file only draws and forwards clicks. Resolves with the result when the overlay closes (null = left early).
import { applyMove, computerMove, legalMoves, newGame, status, type Game, type Move, type Sq } from '../core/checkers';
import type { GameOutcome } from '../core/games';
import { head, esc, overlay } from './ui';
import { sfx } from './audio';

const CSS = `
#checkers .ck-board{display:grid;grid-template-columns:repeat(8,var(--cs));grid-template-rows:repeat(8,var(--cs));width:max-content;margin:0;border:2px solid #39d9ff;border-radius:6px;box-shadow:0 0 18px rgba(57,217,255,.35);overflow:hidden;--cs:calc(var(--bs) / 8)}
#checkers .ck-sq{position:relative;display:flex;align-items:center;justify-content:center;border:0;padding:0;margin:0;min-width:0;min-height:0;cursor:default;background:#0a1a33}
#checkers .ck-sq.dark{background:#102a4d}
#checkers .ck-sq.go{background:#14456b;cursor:pointer;box-shadow:inset 0 0 0 2px rgba(255,179,64,.9)}
#checkers .ck-sq.sel{box-shadow:inset 0 0 0 3px #fff}
#checkers .ck-sq:focus-visible{outline:2px solid #fff;outline-offset:-3px}
#checkers .ck-pc{width:72%;height:72%;border-radius:50%;border:2px solid;display:flex;align-items:center;justify-content:center}
#checkers .ck-pc.me{background:radial-gradient(circle at 35% 30%,#d9f8ff,#39d9ff 60%,#0e7fa3);border-color:#8ceaff;box-shadow:0 0 10px rgba(57,217,255,.7)}
#checkers .ck-pc.cpu{background:radial-gradient(circle at 35% 30%,#ffe9bf,#ffb340 60%,#b36a00);border-color:#ffd37f;box-shadow:0 0 10px rgba(255,179,64,.6)}
#checkers .ck-pc.king::after{content:"";width:46%;height:46%;border:2px solid #0a1a33;border-radius:50%;box-shadow:0 0 0 2px rgba(255,255,255,.7)}
#checkers .movable .ck-pc{animation:ckpulse 1.2s ease-in-out infinite}
@keyframes ckpulse{50%{box-shadow:0 0 16px rgba(255,255,255,.95)}}
@media (prefers-reduced-motion:reduce){#checkers .movable .ck-pc{animation:none}}
#checkers .ck-msg{min-height:2.6em;text-align:center}
#checkers .holo-btn{min-height:44px}
`;

export function openCheckers(): Promise<GameOutcome | null> {
  if (!document.getElementById('checkers-css')) { const st = document.createElement('style'); st.id = 'checkers-css'; st.textContent = CSS; document.head.appendChild(st); }
  return new Promise(resolve => {
    let g: Game = newGame(), sel: Sq | null = null, locked = false, outcome: GameOutcome | null = null, note = 'Your turn. Tap one of your glowing blue pieces.';
    const el = overlay('checkers', `<div class="holo-panel game-panel">${head('base', 'Checkers')}<div class="panel-body"><div class="ck-msg why" id="ck-msg" aria-live="polite"></div><div class="gb-wrap"><div class="gb-ranks" aria-hidden="true"><span>8</span><span>7</span><span>6</span><span>5</span><span>4</span><span>3</span><span>2</span><span>1</span></div><div class="gb-main"><div class="ck-board" id="ck-board"></div><div class="gb-files" aria-hidden="true"><span>a</span><span>b</span><span>c</span><span>d</span><span>e</span><span>f</span><span>g</span><span>h</span></div></div></div><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><span class="row" style="gap:8px"><button class="holo-btn small" id="ck-new">NEW GAME</button><button class="holo-btn small" id="ck-resign">RESIGN</button></span><button class="holo-btn small amber" data-close>LEAVE TABLE ▸</button></div></div></div>`);
    const same = (a: Sq, b: Sq) => a[0] === b[0] && a[1] === b[1];
    const render = () => {
      const moves = g.turn === 'red' && !outcome ? legalMoves(g) : [], from = moves.filter(m => sel && same(m.from, sel)), movers = moves.filter((m, i) => moves.findIndex(o => same(o.from, m.from)) === i);
      let h = '';
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const p = g.board[r][c], dark = (r + c) % 2 === 1, isGo = from.some(m => m.to[0] === r && m.to[1] === c), isMover = movers.some(m => m.from[0] === r && m.from[1] === c), isSel = !!sel && sel[0] === r && sel[1] === c;
        const label = p ? `${p === 'r' || p === 'R' ? 'Your' : 'Computer'} ${p === 'R' || p === 'B' ? 'king' : 'piece'}, row ${r + 1} column ${c + 1}` : `Empty square, row ${r + 1} column ${c + 1}`;
        h += `<button class="ck-sq${dark ? ' dark' : ''}${isGo ? ' go' : ''}${isSel ? ' sel' : ''}${isMover ? ' movable' : ''}" data-r="${r}" data-c="${c}" aria-label="${esc(label)}"${dark ? '' : ' tabindex="-1"'}>${p ? `<span class="ck-pc ${p === 'r' || p === 'R' ? 'me' : 'cpu'}${p === 'R' || p === 'B' ? ' king' : ''}"></span>` : ''}</button>`;
      }
      const b = el.querySelector('#ck-board') as HTMLElement; b.innerHTML = h;
      b.querySelectorAll('.ck-sq').forEach(n => ((n as HTMLElement).onclick = () => click(+(n as HTMLElement).dataset.r!, +(n as HTMLElement).dataset.c!)));
      (el.querySelector('#ck-msg') as HTMLElement).innerHTML = esc(note);
    };
    const finish = () => {
      const st = status(g); if (!st.over) return false;
      outcome = st.winner === 'draw' ? 'draw' : st.winner === 'red' ? 'win' : 'loss'; locked = true;
      note = outcome === 'win' ? 'You won! Well played. Close the table to collect the crew cheer.' : outcome === 'draw' ? 'A draw! Close the table when you are ready.' : 'The computer won this one. Close the table, or start a new game.';
      outcome === 'win' ? sfx.ok() : sfx.click(); return true;
    };
    const cpuTurn = () => {
      locked = true; note = 'The computer is thinking...'; render();
      setTimeout(() => {
        if (!el.isConnected) return;
        const m = computerMove(g); if (m) { g = applyMove(g, m); sfx.click(); }
        locked = false;
        if (!finish()) { const my = legalMoves(g); note = my[0]?.captured.length ? 'You must jump! Pick a glowing piece.' : 'Your turn.'; }
        render();
      }, 650);
    };
    const click = (r: number, c: number) => {
      if (locked || outcome || g.turn !== 'red') return;
      const moves = legalMoves(g), mine = moves.filter(m => m.from[0] === r && m.from[1] === c);
      if (sel) { const m = moves.find((x: Move) => same(x.from, sel!) && x.to[0] === r && x.to[1] === c); if (m) { g = applyMove(g, m); sel = null; sfx.click(); if (!finish()) return cpuTurn(); render(); return; } }
      if (mine.length) { sel = [r, c]; sfx.click(); note = mine[0].captured.length ? 'Jump! Tap a glowing square.' : 'Tap a glowing square to move.'; }
      else { sel = null; sfx.warn(); note = moves[0]?.captured.length ? 'You must jump when you can. Pick a piece that can capture.' : 'That piece cannot move. Tap a glowing blue piece.'; }
      render();
    };
    (el.querySelector('#ck-resign') as HTMLElement).onclick = () => { if (outcome || locked) return; sfx.click(); outcome = 'loss'; locked = true; sel = null; note = 'You resigned. Close the table, or start a new game.'; render(); };
    (el.querySelector('#ck-new') as HTMLElement).onclick = () => { if (outcome) return; sfx.click(); g = newGame(); sel = null; locked = false; note = 'New game. Your turn.'; render(); };
    new MutationObserver((_m, ob) => { if (!el.isConnected) { ob.disconnect(); resolve(outcome); } }).observe(document.getElementById('overlays')!, { childList: true });
    render();
  });
}
