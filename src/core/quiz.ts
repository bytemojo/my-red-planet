// Step 27a: the quiz rules. Pure functions only (no Phaser, no DOM). Question TEXT lives in src/story/quiz-*.ts (steps 27e-27h);
// every function here takes the question bank as an argument so the rules can be tested with a small fake bank.
import { CREW_IDS, syncCropUnlocks } from './crewlife';
import { mulberry32 } from './rng';
import type { CrewId, CropId, GameState, PopQuiz, QuizAttempt, QuizQuestion, QuizState } from './types';

export const QUIZ = {
  LEVELS: 5,                 // level 1 easy ... level 5 needs a calculation
  PER_LEVEL: 5,              // exactly 5 questions per level, all must be right to pass
  OPTIONS: 4,
  TIME_LIMIT_S: 300,         // 5 minutes, a SOFT limit: running out is never a failed score
  FAST_S: 150,               // "finished under the time" bonus line, used by the Mastery score in step 27i (tune there)
  HEART_LEVELS: [2, 4] as readonly number[], // +1 heart the FIRST time a crew's level 2 and level 4 are passed (hearts are whole numbers in the UI)
} as const;

/** The big text after an answer. Right answers alternate between two cheers; a wrong one is gentle. */
export const feedbackText = (correct: boolean, questionIndex: number): string => (correct ? (questionIndex % 2 === 0 ? 'You got it!' : 'Keep going!') : 'Missed that one.');
/** Title and short line for the level result card. */
export function resultCopy(right: number, total: number, level: number, passed: boolean): { title: string; line: string } {
  if (passed && level >= QUIZ.LEVELS) return { title: 'MASTERY!', line: 'You cleared all 5 levels with this crew member. Amazing work, astronaut!' };
  if (passed) return { title: `LEVEL ${level} CLEARED`, line: `All ${total} right. Ready for level ${level + 1}?` };
  return { title: 'SO CLOSE', line: `${right} of ${total} right. You need all ${total} to move up. Try again: it never costs you anything.` };
}
/** Names of levels 1 to 5, shown on the quiz screen. */
export const LEVEL_NAMES: readonly string[] = ['Rookie', 'Cadet', 'Specialist', 'Officer', 'Commander'];
export const QUIZ_TIMEOUT_TEXT = "You ran out of time {name}, no worries. Play again? Failing doesn't affect your score.";
export const quizTimeoutMessage = (name: string): string => QUIZ_TIMEOUT_TEXT.replace(/\{name\}/g, name || 'Rookie');

// ---------- state ----------
const newCrewQuiz = () => ({ passed: 0, attempts: 0, lastSol: 0 });
export const newQuizState = (): QuizState => ({
  crews: { reyes: newCrewQuiz(), aiko: newCrewQuiz(), david: newCrewQuiz(), sofia: newCrewQuiz() },
  fastPasses: 0,
});
/** The quiz state of a game (created on first use so older saves keep working). */
export const quizOf = (s: GameState): QuizState => (s.quiz ??= newQuizState());
/** Levels passed across all crew, 0-20 (the Mastery score in 27i builds on this). */
export const levelsPassed = (s: GameState): number => CREW_IDS.reduce((a, id) => a + quizOf(s).crews[id].passed, 0);
/** The next level this crew member will quiz on, or null when all 5 are passed. */
export const nextLevel = (s: GameState, crew: CrewId): number | null => {
  const p = quizOf(s).crews[crew].passed;
  return p >= QUIZ.LEVELS ? null : p + 1;
};

// ---------- the daily call ----------
/** One crew member calls per Sol, rotating Reyes, Aiko, David, Sofia, then Reyes again. */
export const crewForSol = (sol: number): CrewId => CREW_IDS[(((Math.floor(sol) - 1) % CREW_IDS.length) + CREW_IDS.length) % CREW_IDS.length];
/** True if this crew member is the caller today, has not been taken up on it yet, and still has a level to give. */
export const canStartCall = (s: GameState, crew: CrewId): boolean =>
  crew === crewForSol(s.sol) && quizOf(s).crews[crew].lastSol !== s.sol && nextLevel(s, crew) !== null;
/** Mark today's call as used (the player started the quiz). Retries and the next level are part of the same call. */
export const markCalled = (s: GameState, crew: CrewId): void => { quizOf(s).crews[crew].lastSol = s.sol; };

// ---------- one attempt at one level ----------
const hashStr = (str: string): number => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function shuffle<T>(items: readonly T[], rnd: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/**
 * Step 27j: one pop quiz question (an event choice shown as a quiz). Answer positions shuffle by (seed, Sol, event id); choiceIds[k] is the
 * story choice that answer k sets, so picking an answer still sets the same gameplay flag the old choice set. correctIndex tracks the right one.
 */
export function buildPopQuestion(pq: PopQuiz, seed: number, sol: number, eventId: string): { question: Omit<QuizQuestion, 'crew' | 'level' | 'explanation'>; choiceIds: string[] } {
  const rnd = mulberry32((seed ^ hashStr(`${eventId}|${sol}`)) >>> 0);
  const order = shuffle(pq.options.map((o, i) => ({ o, right: i === pq.correct })), rnd);
  return {
    question: { id: `pop-${eventId}`, prompt: pq.prompt, options: order.map(x => x.o.text), correctIndex: order.findIndex(x => x.right), sourceUrl: pq.sourceUrl, sourceTitle: pq.sourceTitle, verified: pq.verified },
    choiceIds: order.map(x => x.o.choice),
  };
}
export function validateQuestion(q: QuizQuestion): string | null {
  if (!q.id || !q.prompt) return 'missing id or prompt';
  if (!Array.isArray(q.options) || q.options.length !== QUIZ.OPTIONS) return `${q.id}: needs exactly ${QUIZ.OPTIONS} options`;
  if (new Set(q.options).size !== q.options.length) return `${q.id}: duplicate options`;
  if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.options.length) return `${q.id}: correctIndex out of range`;
  if (q.level < 1 || q.level > QUIZ.LEVELS) return `${q.id}: level out of range`;
  return null;
}
/**
 * Build the 5 questions of one level: always the level's own questions, in shuffled order with shuffled answer positions,
 * correctIndex re-pointed at the right answer. The shuffle depends on (game seed, Sol, crew, level, attempts so far), so the set resets
 * each Sol, every retry is shuffled again, and the same attempt always looks the same after a reload.
 */
export function buildAttempt(bank: readonly QuizQuestion[], s: GameState, crew: CrewId, level: number): QuizAttempt {
  const own = bank.filter(q => q.crew === crew && q.level === level);
  if (own.length !== QUIZ.PER_LEVEL) throw new Error(`quiz bank: ${crew} level ${level} has ${own.length} questions, needs ${QUIZ.PER_LEVEL}`);
  for (const q of own) { const bad = validateQuestion(q); if (bad) throw new Error(`quiz bank: ${bad}`); }
  const rnd = mulberry32(hashStr(`${s.seed}|${s.sol}|${crew}|${level}|${quizOf(s).crews[crew].attempts}`));
  const questions = shuffle(own, rnd).map(q => {
    const order = shuffle(q.options.map((text, i) => ({ text, right: i === q.correctIndex })), rnd);
    return { id: q.id, prompt: q.prompt, options: order.map(o => o.text), correctIndex: order.findIndex(o => o.right), sourceUrl: q.sourceUrl, sourceTitle: q.sourceTitle, verified: q.verified };
  });
  return { crew, level, sol: s.sol, questions };
}

export interface QuizGrade { marks: boolean[]; correct: number; passed: boolean }
/** picks[i] = the shuffled option index chosen for question i (null or missing = not answered = wrong). Pass only with all 5 right. */
export function gradeAttempt(a: QuizAttempt, picks: readonly (number | null | undefined)[]): QuizGrade {
  const marks = a.questions.map((q, i) => picks[i] === q.correctIndex);
  const correct = marks.filter(Boolean).length;
  return { marks, correct, passed: correct === a.questions.length && a.questions.length === QUIZ.PER_LEVEL };
}
/** The 5-minute timer. At or past the limit the attempt ends softly. */
export const isTimedOut = (elapsedS: number): boolean => elapsedS >= QUIZ.TIME_LIMIT_S;
export const secondsLeft = (elapsedS: number): number => Math.max(0, Math.ceil(QUIZ.TIME_LIMIT_S - elapsedS));
export const clockText = (secondsLeftNow: number): string => { const t = Math.max(0, Math.floor(secondsLeftNow)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

export interface QuizOutcome { grade: QuizGrade; passed: boolean; timedOut: boolean; heartsGained: number; unlocked: CropId[] }
/**
 * Record one finished attempt. NOTHING here can lower hearts, levels or any score: a failure or a timeout only counts the attempt.
 * A pass moves the crew member up one level (only if it was their next level; replaying a passed level changes nothing).
 * Hearts reuse CrewState.friendship (no second system) and come only the first time a HEART_LEVELS level is passed.
 */
export function recordResult(s: GameState, a: QuizAttempt, picks: readonly (number | null | undefined)[], elapsedS: number): QuizOutcome {
  const q = quizOf(s), c = q.crews[a.crew];
  const timedOut = isTimedOut(elapsedS);
  const grade = gradeAttempt(a, picks);
  const passed = grade.passed && !timedOut;
  c.attempts += 1;
  let heartsGained = 0, unlocked: CropId[] = [];
  if (passed && a.level === c.passed + 1) {
    c.passed = a.level;
    if (elapsedS <= QUIZ.FAST_S) q.fastPasses += 1;
    if (QUIZ.HEART_LEVELS.includes(a.level)) { s.crew[a.crew].friendship += 1; heartsGained = 1; unlocked = syncCropUnlocks(s); }
  }
  return { grade, passed, timedOut, heartsGained, unlocked };
}

// ---------- Step 27d: who shows START QUIZ ----------
/** The crew member whose turn it is today AND who can still quiz (has a level left, not already called today). null = nobody. */
export const callerToday = (s: GameState, hasBank: (c: CrewId) => boolean = () => true): CrewId | null => {
  const c = crewForSol(s.sol); return canStartCall(s, c) && hasBank(c) ? c : null;
};
/** START QUIZ shows only for today's caller, never for a hungry crew member (hungry crew do not talk), and only when a full question bank exists. */
export const showStartQuiz = (s: GameState, crew: CrewId, hasBank: boolean, hungry: boolean): boolean => hasBank && !hungry && canStartCall(s, crew);
/** The line shown (toast) when a crew member calls for the day. */
export const callLine = (name: string): string => `${name} is calling: a quick quiz? Open the intercom and tap START QUIZ. Skip it any time, it is free.`;
