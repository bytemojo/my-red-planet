// The workout mini-game: press SPACE / tap when the marker is in the green zone. Five good reps finish it.
// Short and skippable for accessibility: skipping gives exactly the same result.
import { $, UI, overlay } from './ui';
import { sfx } from './audio';
import { MACHINES, type Machine } from '../core/gym';

export function playWorkout(m: Machine): Promise<boolean> {
  return new Promise(res => {
    const REPS = 5; let reps = 0, t0 = performance.now(), raf = 0, shownPos = 0;
    const el = overlay('workout', `<div class="holo-panel" style="max-width:520px"><div class="panel-head"><h2>${MACHINES[m].name}</h2><button class="close-x" id="wo-x" aria-label="Cancel">×</button></div><div class="panel-body">
      <p class="why">Press <kbd>SPACE</kbd> or tap <b>PUSH</b> when the marker is in the green zone. ${REPS} good reps!</p>
      <div class="wo-track"><div class="wo-zone"></div><div class="wo-mark" id="wo-mark"></div></div>
      <div class="wo-reps" id="wo-reps" aria-live="polite">${'○'.repeat(REPS)}</div>
      <div class="wo-feedback" id="wo-feedback" aria-live="polite">Watch the marker.</div>
      <div class="row" style="justify-content:space-between"><button class="holo-btn small" id="wo-skip">SKIP (SAME RESULT)</button><button class="holo-btn primary" id="wo-push">PUSH</button></div></div></div>`);
    const mark = $('#wo-mark', el), repsEl = $('#wo-reps', el), feedback = $('#wo-feedback', el), pushButton = $('#wo-push', el) as HTMLButtonElement;
    const pos = () => (Math.sin((performance.now() - t0) / 420) + 1) / 2; // 0..1
    const frame = () => { shownPos = pos(); mark.style.left = `calc(${shownPos * 100}% - 6px)`; raf = requestAnimationFrame(frame); };
    const end = (ok: boolean) => { cancelAnimationFrame(raf); removeEventListener('keydown', key, true); UI.close('workout'); res(ok); };
    const push = () => {
      if (shownPos > 0.38 && shownPos < 0.62) {
        reps++; sfx.ok(); repsEl.textContent = '●'.repeat(reps) + '○'.repeat(REPS - reps);
        feedback.textContent = reps === REPS ? 'Workout complete!' : `Good push! ${reps} of ${REPS}`;
        feedback.className = 'wo-feedback good';
        if (reps >= REPS) { pushButton.disabled = true; setTimeout(() => end(true), 250); }
      } else {
        sfx.blip(); feedback.textContent = shownPos < 0.38 ? 'Too early — try again.' : 'Too late — try again.';
        feedback.className = 'wo-feedback miss';
        repsEl.classList.remove('miss'); void repsEl.offsetWidth; repsEl.classList.add('miss');
      }
    };
    const key = (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); push(); } else if (e.key === 'Escape') { e.stopPropagation(); end(false); } };
    addEventListener('keydown', key, true);
    pushButton.onclick = push;
    $('#wo-skip', el).onclick = () => { sfx.click(); end(true); };
    $('#wo-x', el).onclick = () => { sfx.click(); end(false); };
    frame();
  });
}
