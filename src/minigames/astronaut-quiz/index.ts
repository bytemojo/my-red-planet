// ASTRONAUT QUIZ: public entry. One call opens the minigame on top of whatever is on screen; closing it returns to the game untouched.
//   import { openAstronautQuiz } from './minigames/astronaut-quiz';
//   openAstronautQuiz({ playerName: () => settings.name, isSoundOn: () => settings.sound, reduceMotion: () => settings.reduce });
import { AstronautQuizUI, type AstronautQuizOptions } from './ui';
import { allQuestions } from './questions';

export type { AstronautQuizOptions } from './ui';
export { AQ, TIERS, LEVEL_NAMES, SAY } from './config';
export { buildRun, Run, tierFor } from './engine';

let current: AstronautQuizUI | null = null;

/** Open the quiz. Safe to call twice: a second call while it is open does nothing. Returns a function that closes it. */
export function openAstronautQuiz(opts: Partial<AstronautQuizOptions> = {}): () => void {
  if (current) return closeAstronautQuiz;
  const ui = new AstronautQuizUI({ bank: allQuestions(), ...opts, onClose: () => { current = null; opts.onClose?.(); } });
  current = ui; ui.mount();
  if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) (window as unknown as { __aq?: unknown }).__aq = ui; // dev-only hook for automated playtests
  return closeAstronautQuiz;
}
export function closeAstronautQuiz(): void { current?.destroy(); }
export const isAstronautQuizOpen = (): boolean => current !== null;
