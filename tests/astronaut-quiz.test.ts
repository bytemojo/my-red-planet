import { describe, expect, it } from 'vitest';
import { AQ, TIERS } from '../src/minigames/astronaut-quiz/config';
import { Run, buildRun, clock, mulberry32, passMark, tierFor } from '../src/minigames/astronaut-quiz/engine';
import { allQuestions } from '../src/minigames/astronaut-quiz/questions';

const bank = allQuestions();
const newRun = (seed = 1) => { const r = new Run(buildRun(bank, mulberry32(seed))); r.startLevel(); return r; };
/** Answer the current level: `right` correct, the rest wrong. Returns the status after the last question. */
function playLevel(r: Run, right: number) {
  let st = r.status;
  for (let i = 0; i < r.level.questions.length; i++) {
    const q = r.question, pick = i < right ? q.correctIndex : (q.correctIndex + 1) % q.options.length;
    r.answer(pick); st = r.advance();
  }
  return st;
}

describe('Astronaut Quiz: the question set', () => {
  it('reads all 100 existing questions (20 per difficulty 1-5)', () => {
    expect(bank).toHaveLength(100);
    for (let d = 1; d <= 5; d++) expect(bank.filter(q => q.level === d)).toHaveLength(20);
  });
  it('every question has a NASA https link and four options', () => { for (const q of bank) { expect(q.sourceUrl).toMatch(/^https:\/\//); expect(q.options).toHaveLength(4); } });
});

describe('buildRun', () => {
  it('makes 10 levels of 10 questions, and a full run uses every question exactly once', () => {
    const plans = buildRun(bank, mulberry32(5));
    expect(plans).toHaveLength(10);
    expect(plans.every(p => p.questions.length === 10 && p.passMark === 8)).toBe(true);
    const ids = plans.flatMap(p => p.questions.map(q => q.id));
    expect(new Set(ids).size).toBe(100);
  });
  it('gets harder: bank difficulty d feeds levels 2d-1 and 2d', () => {
    const plans = buildRun(bank, mulberry32(9));
    plans.forEach(p => { expect(p.difficulty).toBe(Math.ceil(p.level / 2)); expect(p.questions.every(q => q.difficulty === p.difficulty)).toBe(true); });
  });
  it('time limits go from easy to hard', () => { const t = buildRun(bank, mulberry32(2)).map(p => p.timeLimitS); expect(t[0]).toBeLessThanOrEqual(t[9]); expect(t.every(x => x >= 180 && x <= 420)).toBe(true); });
  it('shuffles options but keeps the right answer pointing at the right text', () => {
    const byId = new Map(bank.map(q => [q.id, q]));
    for (const p of buildRun(bank, mulberry32(3))) for (const q of p.questions) { const o = byId.get(q.id)!; expect(q.options[q.correctIndex]).toBe(o.options[o.correctIndex]); expect([...q.options].sort()).toEqual([...o.options].sort()); }
  });
  it('different seeds give different levels', () => { expect(buildRun(bank, mulberry32(1))[0].questions.map(q => q.id)).not.toEqual(buildRun(bank, mulberry32(2))[0].questions.map(q => q.id)); });
  it('copes with a small bank', () => {
    const small = bank.filter(q => q.level === 1).slice(0, 5); const plans = buildRun(small, mulberry32(1));
    expect(plans.length).toBeGreaterThan(0); expect(plans.every(p => p.questions.length >= 1 && p.passMark >= 1)).toBe(true);
  });
});

describe('the pass rule: 8 of 10', () => {
  it('passMark is 80%', () => { expect(passMark(10)).toBe(8); expect(passMark(5)).toBe(4); });
  it('8/10 enters the next level', () => { const r = newRun(); expect(playLevel(r, 8)).toBe('levelPassed'); r.nextLevel(); expect(r.level.level).toBe(2); expect(r.levelCorrect).toBe(0); });
  it('10/10 passes too', () => { expect(playLevel(newRun(), 10)).toBe('levelPassed'); });
  it('7/10 fails the run (restart from level 1)', () => { const r = newRun(); expect(playLevel(r, 7)).toBe('failed'); expect(r.failReason).toBe('score'); });
  it('more misses than right answers fails', () => { const r = newRun(); expect(playLevel(r, 4)).toBe('failed'); });
  it('running out of time fails the level', () => { const r = newRun(); r.answer(r.question.correctIndex); expect(r.timeUp()).toBe('failed'); expect(r.failReason).toBe('time'); expect(r.results[0].timedOut).toBe(true); });
  it('ignores a second answer to the same question', () => { const r = newRun(); expect(r.answer(r.question.correctIndex)).not.toBeNull(); expect(r.answer(0)).toBeNull(); expect(r.answered).toBe(1); });
  it('can only advance after answering', () => { const r = newRun(); expect(r.advance()).toBe('playing'); expect(r.qIdx).toBe(0); });
});

describe('a whole run', () => {
  it('clearing all 10 levels at 100% completes with Galaxy Brain', () => {
    const r = newRun(); let st = r.status;
    for (let l = 0; l < 10; l++) { st = playLevel(r, 10); if (st === 'levelPassed') r.nextLevel(); }
    expect(st).toBe('completed'); const s = r.summary();
    expect(s.correct).toBe(100); expect(s.tier).toBe('galaxy'); expect(s.levelsCleared).toBe(10);
    expect(s.points).toBe(10 * 2 * (1 + 2 + 3 + 4 + 5) * AQ.POINTS_PER_CORRECT + 10 * AQ.LEVEL_CLEAR_BONUS);
  });
  it('finishing at exactly 95% is Solar Scientist, not Galaxy Brain (it must be OVER 95%)', () => {
    const r = newRun(); let st = r.status; const rights = [10, 10, 10, 10, 10, 10, 10, 8, 8, 9]; // 95 of 100
    for (let l = 0; l < 10; l++) { st = playLevel(r, rights[l]); if (st === 'levelPassed') r.nextLevel(); }
    expect(st).toBe('completed'); const s = r.summary(); expect(s.correct / s.planned).toBeLessThanOrEqual(0.95); expect(s.tier).toBe('scientist');
  });
  it('a failed run keeps its stats for the report card', () => { const r = newRun(); playLevel(r, 10); r.nextLevel(); playLevel(r, 3); const s = r.summary(); expect(r.status).toBe('failed'); expect(s.levelsCleared).toBe(1); expect(s.correct).toBe(13); expect(s.answered).toBe(20); });
});

describe('rank badges', () => {
  const base = { levelsTotal: 10, planned: 100, correct: 0, completed: false };
  it('Recruit -> Explorer -> Commander by levels cleared', () => {
    expect(tierFor({ ...base, levelsCleared: 0 })).toBe('recruit'); expect(tierFor({ ...base, levelsCleared: 2 })).toBe('recruit');
    expect(tierFor({ ...base, levelsCleared: 3 })).toBe('explorer'); expect(tierFor({ ...base, levelsCleared: 5 })).toBe('explorer');
    expect(tierFor({ ...base, levelsCleared: 6 })).toBe('commander'); expect(tierFor({ ...base, levelsCleared: 9 })).toBe('commander');
  });
  it('finishing all levels is Solar Scientist; over 95% is Galaxy Brain', () => {
    expect(tierFor({ ...base, levelsCleared: 10, completed: true, correct: 90 })).toBe('scientist');
    expect(tierFor({ ...base, levelsCleared: 10, completed: true, correct: 95 })).toBe('scientist');
    expect(tierFor({ ...base, levelsCleared: 10, completed: true, correct: 96 })).toBe('galaxy');
  });
  it('has the five ranks in the requested order', () => { expect(TIERS.map(t => t.name)).toEqual(['Space Recruit', 'Space Explorer', 'Space Commander', 'Solar Scientist', 'Galaxy Brain']); });
});

describe('50:50 and the clock text', () => {
  it('50:50 hides exactly two wrong answers, once per level', () => {
    const r = newRun(); const h = r.useFifty()!; expect(h).toHaveLength(2); expect(h).not.toContain(r.question.correctIndex); expect(r.useFifty()).toBeNull();
  });
  it('clock formats m:ss', () => { expect(clock(240)).toBe('4:00'); expect(clock(59.2)).toBe('1:00'); expect(clock(-3)).toBe('0:00'); });
});
