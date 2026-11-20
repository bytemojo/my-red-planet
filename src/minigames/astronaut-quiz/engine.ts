// ASTRONAUT QUIZ engine: pure TypeScript (no DOM, no Phaser). Builds a run from a question bank and applies the rules.
// One run = up to 10 levels x 10 questions. Bank difficulty d (1-5) feeds game levels 2d-1 and 2d, so a full run uses every question once.
// You need 8/10 to enter the next level. Failing or running out of time always restarts from level 1 (a fresh run is built).
import { AQ, TIERS, TIER_AT, type TierId } from './config';

export interface BankQuestion { id: string; level: number; prompt: string; options: readonly string[]; correctIndex: number; sourceUrl: string; sourceTitle: string; explanation?: string; crew?: string }
export interface RunQuestion { id: string; difficulty: number; prompt: string; options: string[]; correctIndex: number; sourceUrl: string; sourceTitle: string; explanation: string; crew?: string }
export interface LevelPlan { level: number; difficulty: number; timeLimitS: number; passMark: number; questions: RunQuestion[] }
export type Rnd = () => number;

export const mulberry32 = (seed: number): Rnd => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export function shuffle<T>(items: readonly T[], rnd: Rnd): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const passMark = (n: number): number => Math.max(1, Math.ceil(n * AQ.PASS_FRACTION - 1e-9));

function toRunQuestion(q: BankQuestion, rnd: Rnd): RunQuestion {
  const order = shuffle(q.options.map((_, i) => i), rnd);
  return {
    id: q.id, difficulty: q.level, prompt: q.prompt, options: order.map(i => q.options[i]), correctIndex: order.indexOf(q.correctIndex),
    sourceUrl: q.sourceUrl, sourceTitle: q.sourceTitle, explanation: q.explanation ?? '', crew: q.crew,
  };
}

/** Build every level of a fresh run. Different questions land in different levels each run; options are re-shuffled. */
export function buildRun(bank: readonly BankQuestion[], rnd: Rnd = Math.random): LevelPlan[] {
  const levels: LevelPlan[] = [];
  const diffs = [...new Set(bank.map(q => Math.min(5, Math.max(1, q.level))))].sort((a, b) => a - b);
  for (const d of diffs) {
    const group = shuffle(bank.filter(q => Math.min(5, Math.max(1, q.level)) === d), rnd);
    const parts = group.length >= 2 ? 2 : 1, per = Math.min(AQ.QUESTIONS_PER_LEVEL, Math.floor(group.length / parts));
    for (let p = 0; p < parts && levels.length < AQ.LEVELS; p++) {
      const qs = group.slice(p * per, p * per + per).map(q => toRunQuestion(q, rnd));
      const level = levels.length + 1;
      levels.push({ level, difficulty: d, questions: qs, passMark: passMark(qs.length), timeLimitS: Math.max(60, Math.round(((AQ.LEVEL_TIME_S[level - 1] ?? 300) * qs.length) / AQ.QUESTIONS_PER_LEVEL)) });
    }
  }
  return levels;
}

export type RunStatus = 'ready' | 'playing' | 'levelPassed' | 'failed' | 'completed';
export type FailReason = 'score' | 'time' | 'misses';
export interface LevelResult { level: number; correct: number; total: number; passed: boolean; timedOut: boolean }
export interface RunSummary { tier: TierId; points: number; levelsCleared: number; levelReached: number; levelsTotal: number; correct: number; answered: number; planned: number; accuracy: number; completed: boolean; bestStreak: number }

export class Run {
  readonly plans: LevelPlan[];
  levelIdx = 0; qIdx = 0;
  status: RunStatus = 'ready'; failReason?: FailReason;
  levelCorrect = 0; levelAnswered = 0;
  correct = 0; answered = 0; points = 0; streak = 0; bestStreak = 0;
  fiftyLeft = 0; hidden: number[] = [];
  results: LevelResult[] = [];
  private picked: number | null | undefined;
  constructor(plans: LevelPlan[]) { this.plans = plans; }

  get level(): LevelPlan { return this.plans[this.levelIdx]; }
  get question(): RunQuestion { return this.level.questions[this.qIdx]; }
  get planned(): number { return this.plans.reduce((a, p) => a + p.questions.length, 0); }
  get misses(): number { return this.answered - this.correct; }
  get isLastLevel(): boolean { return this.levelIdx >= this.plans.length - 1; }
  get levelMisses(): number { return this.levelAnswered - this.levelCorrect; }

  startLevel(): void { this.status = 'playing'; this.qIdx = 0; this.levelCorrect = 0; this.levelAnswered = 0; this.fiftyLeft = AQ.LIFELINES_PER_LEVEL; this.hidden = []; this.picked = undefined; }

  /** Lock in an answer. Returns whether it was right (and the right index). Ignored if this question is already answered. */
  answer(pickIdx: number): { correct: boolean; right: number } | null {
    if (this.status !== 'playing' || this.picked !== undefined) return null;
    const q = this.question, ok = pickIdx === q.correctIndex;
    this.picked = pickIdx; this.answered++; this.levelAnswered++;
    if (ok) { this.correct++; this.levelCorrect++; this.streak++; this.bestStreak = Math.max(this.bestStreak, this.streak); this.points += AQ.POINTS_PER_CORRECT * q.difficulty; } else this.streak = 0;
    return { correct: ok, right: q.correctIndex };
  }
  get hasAnswered(): boolean { return this.picked !== undefined; }

  /** 50:50: hide two wrong answers on the current question. Returns the hidden indices, or null if not allowed. */
  useFifty(): number[] | null {
    if (this.status !== 'playing' || this.picked !== undefined || this.fiftyLeft <= 0 || this.hidden.length) return null;
    const q = this.question, wrong = q.options.map((_, i) => i).filter(i => i !== q.correctIndex);
    if (wrong.length < 3) return null;
    this.fiftyLeft--; this.hidden = wrong.sort(() => 0.5 - Math.random()).slice(0, 2); return this.hidden;
  }

  /** After an answer: go to the next question, or settle the level. */
  advance(): RunStatus {
    if (this.status !== 'playing' || this.picked === undefined) return this.status;
    if (AQ.RESTART_AT_TOTAL_MISSES > 0 && this.misses >= AQ.RESTART_AT_TOTAL_MISSES) return this.settle(false, 'misses');
    if (this.qIdx + 1 < this.level.questions.length) { this.qIdx++; this.picked = undefined; this.hidden = []; return this.status; }
    return this.settle(this.levelCorrect >= this.level.passMark, 'score');
  }
  /** The level clock ran out. Counts as a failed level (the run restarts from level 1). */
  timeUp(): RunStatus { return this.status === 'playing' ? this.settle(false, 'time') : this.status; }

  private settle(passed: boolean, why: FailReason): RunStatus {
    const lv = this.level;
    this.results.push({ level: lv.level, correct: this.levelCorrect, total: lv.questions.length, passed, timedOut: why === 'time' });
    if (!passed) { this.status = 'failed'; this.failReason = why; this.streak = 0; return this.status; }
    this.points += AQ.LEVEL_CLEAR_BONUS;
    this.status = this.isLastLevel ? 'completed' : 'levelPassed'; return this.status;
  }
  /** Move on after a passed level. */
  nextLevel(): void { if (this.status === 'levelPassed') { this.levelIdx++; this.startLevel(); } }

  summary(): RunSummary {
    const levelsCleared = this.results.filter(r => r.passed).length, completed = this.status === 'completed';
    const s: RunSummary = {
      tier: 'recruit', points: this.points, levelsCleared, levelReached: Math.min(this.plans.length, this.levelIdx + 1), levelsTotal: this.plans.length,
      correct: this.correct, answered: this.answered, planned: this.planned, accuracy: this.answered ? this.correct / this.answered : 0, completed, bestStreak: this.bestStreak,
    };
    s.tier = tierFor(s); return s;
  }
}

/** Space Recruit (everyone), Explorer (3 levels), Commander (6 levels), Solar Scientist (all levels), Galaxy Brain (all levels AND more than 95% of ALL questions right). */
export function tierFor(s: Pick<RunSummary, 'levelsCleared' | 'levelsTotal' | 'completed' | 'correct' | 'planned'>): TierId {
  if (s.completed && s.planned > 0 && s.correct / s.planned > AQ.GALAXY_ABOVE) return 'galaxy';
  if (s.completed) return 'scientist';
  if (s.levelsCleared >= TIER_AT.commander) return 'commander';
  if (s.levelsCleared >= TIER_AT.explorer) return 'explorer';
  return 'recruit';
}
export const tierIndex = (id: TierId): number => TIERS.findIndex(t => t.id === id);

export const clock = (s: number): string => { const t = Math.max(0, Math.ceil(s)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
