// Steps 27b + 27c: the quiz screen ("Who Wants to Be a Millionaire" style). Draws and forwards input only; the rules live in core/quiz.ts.
// Wired in 27d: the chat nav START QUIZ button (ui/panels.ts) -> Host.quiz (game/WorldScene.ts) -> openQuiz.
// Layout: crew cutout in the bottom corner, question card, 4 answers (A to D), 5 circles on top (grey / green / red), sand-glass + m:ss, level name, LEARN MORE source link.
// 27c: big animated feedback text after each answer, STUDY MORE source link + NEXT, then the level result card.
import { LEVEL_NAMES, QUIZ, buildAttempt, canStartCall, markCalled, nextLevel, recordResult, clockText, feedbackText, gradeAttempt, isTimedOut, quizTimeoutMessage, resultCopy, secondsLeft } from '../core/quiz';
import { CREW } from '../story/crew';
import type { CrewId, GameState, QuizAttempt, QuizQuestion } from '../core/types';
import { ICON } from './icons';
import { esc, head, overlay, UI } from './ui';
import { sfx } from './audio';

/** What the player chose on the result card. 'next' = START LEVEL N+1 QUIZ, 'again' = PLAY AGAIN (same level), 'retry' = RETRY (same level), 'close' = left. */
export type QuizAction = 'next' | 'again' | 'retry' | 'close';
export interface QuizRun { picks: (number | null)[]; elapsedS: number; timedOut: boolean; completed: boolean; action: QuizAction }
/** What the caller says about the finished attempt, so the result card can show the right buttons. Called once, when the attempt ends. */
export interface QuizSettle { passed: boolean; heartsGained?: number }
const LETTERS = ['A', 'B', 'C', 'D'];
export const QUIZ_POP_MS = 1000;      // the big feedback text shows for about 1 second
const safeUrl = (u: string) => (/^https:\/\//.test(u) ? u : '');
const GLASS = (ic: string) => `<span class="qz-glass" aria-hidden="true">${ICON[ic] ?? ''}</span>`;

/**
 * Show one attempt. Resolves when the screen closes, with the picks, the elapsed seconds, whether time ran out and the button the
 * player pressed (the caller then builds the next attempt for 'next' / 'again' / 'retry'). `settle` records the result (core/quiz.ts
 * recordResult) and tells the screen whether it was a pass; without it the screen grades locally (all 5 right = pass).
 */
export function openQuiz(attempt: QuizAttempt, playerName: string, settle?: (run: Omit<QuizRun, 'action'>) => QuizSettle, pop?: { explanation: string }): Promise<QuizRun> {
  return new Promise(resolve => {
    const total = attempt.questions.length;
    const picks: (number | null)[] = Array(total).fill(null);
    const marks: ('' | 'ok' | 'bad')[] = Array(total).fill('');
    let i = 0, locked = false, timedOut = false, done = false, answered = false, timer = 0, popT = 0, action: QuizAction = 'close';
    const t0 = performance.now(), elapsed = () => (performance.now() - t0) / 1000;
    const crew = CREW[attempt.crew], lvl = LEVEL_NAMES[attempt.level - 1] ?? `Level ${attempt.level}`;
    const el = overlay('quiz', `<img class="qz-cutout" src="/crew/${attempt.crew}.png" alt="" aria-hidden="true">
      <div class="holo-panel quiz-panel" role="dialog" aria-label="${esc(crew.name)} quiz, level ${attempt.level}">
        ${head('crew', pop ? `${crew.name.split(' ').slice(-1)[0]} · Pop quiz` : `${crew.name.split(' ').slice(-1)[0]} · Level ${attempt.level}`, !pop)}
        <div class="panel-body qz-body" id="qz-body">
          <div class="qz-top"><div class="qz-dots" id="qz-dots" role="img"></div><div class="qz-clock" aria-label="Time left" ${pop ? 'hidden' : ''}>${GLASS('hourglass')}<b id="qz-time">${clockText(QUIZ.TIME_LIMIT_S)}</b></div></div>
          <div class="qz-lvl"><img class="qz-face" src="/crew/${attempt.crew}.png" alt="${esc(crew.name)} profile"><span>${esc(crew.name)} · <b>${esc(pop ? 'Pop quiz' : lvl)}</b></span></div>
          <div class="qz-card" aria-live="polite"><div class="qz-count" id="qz-count"></div><p class="qz-q" id="qz-q"></p><a class="qz-learn" id="qz-learn" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="m12.5 12.5 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span>LEARN MORE</span></a></div>
          <div class="qz-opts" id="qz-opts"></div>
          <div class="qz-after" id="qz-after" hidden><a class="qz-study" id="qz-study" target="_blank" rel="noopener noreferrer">STUDY MORE ↗</a><button type="button" class="holo-btn primary qz-next" id="qz-next">NEXT</button></div>
          <p class="qz-msg why" id="qz-msg" aria-live="polite"></p>
        </div>
      </div>`, 'quiz-overlay');
    const $q = (s: string) => el.querySelector(s) as HTMLElement;
    const dotsHtml = (now: boolean) => marks.map((m, k) => `<i class="qz-dot ${m} ${now && k === i && !m ? 'now' : ''}"></i>`).join('');
    const drawDots = () => { $q('#qz-dots').innerHTML = dotsHtml(!done); $q('#qz-dots').setAttribute('aria-label', `${marks.filter(m => m === 'ok').length} correct, ${marks.filter(m => m === 'bad').length} wrong, ${marks.filter(m => !m).length} to go`); };
    const removePop = () => { clearTimeout(popT); el.querySelector('.qz-pop')?.remove(); };

    const draw = () => {
      const q = attempt.questions[i];
      removePop(); drawDots(); answered = false;
      $q('#qz-count').textContent = pop ? 'POP QUIZ · ONE QUESTION' : `QUESTION ${i + 1} OF ${total}`;
      $q('#qz-q').textContent = q.prompt;
      const url = safeUrl(q.sourceUrl), a = $q('#qz-learn') as HTMLAnchorElement, st = $q('#qz-study') as HTMLAnchorElement;
      a.hidden = !url; st.hidden = !url;
      if (url) { a.href = url; a.title = q.sourceTitle; a.setAttribute('aria-label', `Learn more: ${q.sourceTitle} (opens NASA in a new tab)`); st.href = url; st.setAttribute('aria-label', `Study more: ${q.sourceTitle} (opens NASA in a new tab)`); }
      $q('#qz-opts').innerHTML = q.options.map((o, k) => `<button type="button" class="qz-opt" data-k="${k}"><span class="qz-key">${LETTERS[k]}</span><span class="qz-txt">${esc(o)}</span></button>`).join('');
      el.querySelectorAll('.qz-opt').forEach(b => ((b as HTMLElement).onclick = () => answer(+(b as HTMLElement).dataset.k!)));
      ($q('#qz-after') as HTMLElement).hidden = true;
      $q('#qz-msg').textContent = 'Tap an answer, or press 1 to 4.';
      locked = false;
    };
    const tickClock = () => {
      const e = elapsed(); $q('#qz-time').textContent = clockText(secondsLeft(e));
      $q('#qz-time').parentElement!.classList.toggle('low', secondsLeft(e) <= 30);
      if (!pop && isTimedOut(e) && !done) { timedOut = true; finish(false); }
    };
    const stop = () => { clearInterval(timer); clearTimeout(popT); document.removeEventListener('keydown', onKey, true); };
    const leave = (a: QuizAction, run: Omit<QuizRun, 'action'>) => { action = a; stop(); UI.close('quiz'); resolve({ ...run, action }); };

    const showResult = (completed: boolean) => {
      const base = { picks: picks.slice(), elapsedS: elapsed(), timedOut, completed };
      const right = completed ? marks.filter(m => m === 'ok').length : gradeAttempt(attempt, picks).correct;
      const s = settle ? settle(base) : { passed: !timedOut && gradeAttempt(attempt, picks).passed };
      const passed = s.passed && !timedOut, mastered = passed && attempt.level >= QUIZ.LEVELS, hasNext = passed && !mastered;
      const copy = timedOut ? { title: "TIME'S UP", line: quizTimeoutMessage(playerName) } : resultCopy(right, total, attempt.level, passed);
      const btn = (key: string, label: string, primary: boolean) => `<button type="button" class="holo-btn ${primary ? 'primary' : ''} qz-end" data-act="${key}">${label}</button>`;
      const buttons = timedOut ? btn('again', 'PLAY AGAIN', true)
        : hasNext ? btn('next', `START LEVEL ${attempt.level + 1} QUIZ`, true) + btn('again', 'PLAY AGAIN', false)
        : mastered ? btn('again', 'PLAY AGAIN', true)
        : btn('retry', 'RETRY', true);
      $q('#qz-body').innerHTML = `<div class="qz-result ${passed ? 'pass' : 'fail'} ${mastered ? 'master' : ''}" role="status">
        <h3 class="qz-rtitle">${mastered ? '★ ' : ''}${esc(copy.title)}${mastered ? ' ★' : ''}</h3>
        <div class="qz-dots static" aria-hidden="true">${dotsHtml(false)}</div>
        <div class="qz-score"><b>${right}</b> / ${total}</div>
        <p class="qz-rline">${esc(copy.line)}</p>
        ${s.heartsGained ? `<p class="qz-heart">+${s.heartsGained} ♥ with ${esc(crew.name.split(' ').slice(-1)[0])}</p>` : ''}
        <div class="qz-btns">${buttons}</div>
      </div>`;
      el.querySelectorAll('[data-act]').forEach(b => ((b as HTMLElement).onclick = () => { sfx.click(); leave((b as HTMLElement).dataset.act as QuizAction, base); }));
      (el.querySelector('[data-act]') as HTMLElement | null)?.focus();
      passed ? sfx.win() : sfx.click();
    };
    const finish = (completed: boolean) => { if (done) return; done = true; stop(); drawDots(); showResult(completed); };

    const answer = (k: number) => {
      if (locked || done || k < 0 || k >= attempt.questions[i].options.length) return;
      locked = true; picks[i] = k;
      const right = k === attempt.questions[i].correctIndex; marks[i] = right ? 'ok' : 'bad'; right ? sfx.chime() : sfx.miss();
      el.querySelectorAll('.qz-opt').forEach(b => {
        const n = +(b as HTMLElement).dataset.k!, btn = b as HTMLButtonElement; btn.disabled = true;
        if (n === attempt.questions[i].correctIndex) btn.classList.add('right'); else if (n === k) btn.classList.add('wrong');
      });
      $q('#qz-msg').textContent = pop ? `${right ? 'Correct! ' : 'Not this time. The right answer is marked green. '}${pop.explanation}` : right ? 'Correct!' : 'Not this time. The right answer is marked green.';
      drawDots();
      // Big animated 3D-style feedback text for about a second, then STUDY MORE + NEXT appear (no auto-advance, so the source link can be used).
      removePop(); $q('#qz-body').insertAdjacentHTML('beforeend', `<div class="qz-pop ${right ? 'good' : 'bad'}" aria-hidden="true">${esc(feedbackText(right, i))}</div>`);
      popT = window.setTimeout(removePop, QUIZ_POP_MS);
      answered = true; const after = $q('#qz-after') as HTMLElement; after.hidden = false;
      const next = $q('#qz-next') as HTMLButtonElement; next.textContent = pop ? 'CONTINUE' : i + 1 >= total ? 'SEE RESULT' : 'NEXT';
      next.onclick = () => { if (pop) { done = true; sfx.click(); leave('close', { picks: picks.slice(), elapsedS: elapsed(), timedOut: false, completed: true }); } else if (i + 1 >= total) finish(true); else { i += 1; draw(); ($q('.qz-opt') as HTMLElement | null)?.focus(); } };
      next.focus();
    };
    const onKey = (e: KeyboardEvent) => {
      if (!el.isConnected || e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      const k = '1234'.indexOf(e.key) >= 0 ? +e.key - 1 : 'abcd'.indexOf(e.key.toLowerCase());
      if (k >= 0 && k < 4 && !answered) { e.preventDefault(); e.stopPropagation(); answer(k); }
    };
    document.addEventListener('keydown', onKey, true);
    // Leaving early (the x button) resolves with completed:false and nothing recorded; after the result card the same x just closes.
    new MutationObserver((_m, ob) => { if (!el.isConnected) { ob.disconnect(); if (!done) { done = true; stop(); resolve({ picks: picks.slice(), elapsedS: elapsed(), timedOut: false, completed: false, action: 'close' }); } else if (action === 'close') { stop(); resolve({ picks: picks.slice(), elapsedS: elapsed(), timedOut, completed: !timedOut, action: 'close' }); } } }).observe(document.getElementById('overlays')!, { childList: true });
    draw(); tickClock(); timer = window.setInterval(tickClock, 250);
    ($q('.qz-opt') as HTMLElement | null)?.focus();
  });
}

/** Step 27d: one accepted daily call. Marks the call used, then loops levels (retry / next level) until the player closes the screen.
 *  Only core/quiz.ts rules touch the state; failing or timing out never lowers hearts or levels. `save` is called after every recorded result. */
export async function runQuizCall(s: GameState, crew: CrewId, bank: readonly QuizQuestion[], playerName: string, save: () => void): Promise<void> {
  if (!canStartCall(s, crew)) return;
  markCalled(s, crew); save();
  for (;;) {
    const level = nextLevel(s, crew);
    if (level === null) return;
    const a = buildAttempt(bank, s, crew, level);
    const run = await openQuiz(a, playerName, r => { const o = recordResult(s, a, r.picks, r.elapsedS); save(); return { passed: o.passed, heartsGained: o.heartsGained }; });
    if (run.action === 'close' || !run.completed && !run.timedOut) return;
  }
}
