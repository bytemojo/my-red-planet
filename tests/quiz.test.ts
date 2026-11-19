import { describe, expect, it } from 'vitest';
import { newGame } from '../src/core/sim';
import { migrateState } from '../src/core/session';
import { CREW_IDS, heartsOf } from '../src/core/crewlife';
import { LEVEL_NAMES, QUIZ, buildAttempt, feedbackText, resultCopy, canStartCall, clockText, crewForSol, gradeAttempt, isTimedOut, levelsPassed, markCalled, nextLevel, quizOf, quizTimeoutMessage, recordResult, secondsLeft } from '../src/core/quiz';
import { EP_EVENTS } from '../src/story/episode1';
import { buildPopQuestion } from '../src/core/quiz';
import { masteryDetail, masteryLine, masteryScore } from '../src/core/score';
import type { CrewId, QuizQuestion } from '../src/core/types';

// A small fake bank: 5 questions per level for every crew member. Option 0 is always the right one in the source data.
const bank: QuizQuestion[] = CREW_IDS.flatMap(crew => [1, 2, 3, 4, 5].flatMap(level => [0, 1, 2, 3, 4].map(n => ({
  id: `${crew}-${level}-${n}`, crew, level, prompt: `Q ${crew} L${level} #${n}`,
  options: [`right ${crew}${level}${n}`, `b ${n}`, `c ${n}`, `d ${n}`], correctIndex: 0,
  sourceUrl: 'https://science.nasa.gov/mars/', sourceTitle: 'NASA Mars', verified: true,
}))));
const allRight = (a: ReturnType<typeof buildAttempt>) => a.questions.map(q => q.correctIndex);
const game = () => newGame(7, { mode: 'storm' });

describe('quiz rules (27a)', () => {
  it('a level has exactly 5 questions, from that level and crew only', () => {
    const a = buildAttempt(bank, game(), 'reyes', 3);
    expect(a.questions).toHaveLength(QUIZ.PER_LEVEL);
    expect(a.questions.every(q => q.id.startsWith('reyes-3-'))).toBe(true);
    expect(new Set(a.questions.map(q => q.id)).size).toBe(5);
    expect(() => buildAttempt(bank.slice(1), game(), 'reyes', 1)).toThrow(/needs 5/);
  });

  it('pass needs all 5 right; one wrong or a blank fails', () => {
    const a = buildAttempt(bank, game(), 'aiko', 1);
    expect(gradeAttempt(a, allRight(a))).toMatchObject({ correct: 5, passed: true });
    const one = allRight(a); one[2] = (one[2] + 1) % 4;
    expect(gradeAttempt(a, one)).toMatchObject({ correct: 4, passed: false });
    const blank: (number | null)[] = allRight(a); blank[0] = null;
    expect(gradeAttempt(a, blank).passed).toBe(false);
    expect(gradeAttempt(a, []).correct).toBe(0);
  });

  it('shuffles questions and answers, always keeps the right answer pointed at', () => {
    const s = game(); const orders = new Set<string>(); const spots = new Set<number>();
    for (let sol = 1; sol <= 12; sol++) {
      s.sol = sol; const a = buildAttempt(bank, s, 'david', 2);
      orders.add(a.questions.map(q => q.id).join());
      for (const q of a.questions) { expect(q.options).toHaveLength(4); expect(q.options[q.correctIndex]).toBe(`right david2${q.id.split('-')[2]}`); spots.add(q.correctIndex); }
    }
    expect(orders.size).toBeGreaterThan(1);
    expect(spots.size).toBeGreaterThan(1);
  });

  it('the set resets each Sol, is the same after a reload, and reshuffles after an attempt', () => {
    const s = game();
    const a1 = buildAttempt(bank, s, 'reyes', 1), a1b = buildAttempt(bank, JSON.parse(JSON.stringify(s)), 'reyes', 1);
    expect(a1b).toEqual(a1);
    recordResult(s, a1, [], 10);                       // a failed try counts as an attempt
    const retry = buildAttempt(bank, s, 'reyes', 1);
    expect(retry.questions.map(q => q.id).join() + retry.questions.map(q => q.options.join()).join()).not.toEqual(a1.questions.map(q => q.id).join() + a1.questions.map(q => q.options.join()).join());
    const first = a1.questions.map(q => q.id).join(), later = new Set<string>();
    for (let sol = 2; sol <= 9; sol++) { s.sol = sol; later.add(buildAttempt(bank, { ...s, sol }, 'reyes', 1).questions.map(q => q.id).join()); }
    expect([...later].some(o => o !== first)).toBe(true);   // a new Sol is a new shuffle
  });

  it('5 minute soft timeout with the exact message and the player name', () => {
    expect(QUIZ.TIME_LIMIT_S).toBe(300);
    expect(isTimedOut(299.9)).toBe(false); expect(isTimedOut(300)).toBe(true);
    expect(secondsLeft(0)).toBe(300); expect(secondsLeft(299.2)).toBe(1); expect(secondsLeft(999)).toBe(0);
    expect(clockText(300)).toBe('5:00'); expect(clockText(65)).toBe('1:05'); expect(clockText(-3)).toBe('0:00');
    expect(quizTimeoutMessage('Lenny')).toBe("You ran out of time Lenny, no worries. Play again? Failing doesn't affect your score.");
    expect(quizTimeoutMessage('')).toBe("You ran out of time Rookie, no worries. Play again? Failing doesn't affect your score.");
  });

  it('a timeout is not a pass, even with all answers right, and costs nothing', () => {
    const s = game(), a = buildAttempt(bank, s, 'reyes', 1), before = JSON.stringify(s.crew);
    const out = recordResult(s, a, allRight(a), 301);
    expect(out).toMatchObject({ timedOut: true, passed: false });
    expect(quizOf(s).crews.reyes).toMatchObject({ passed: 0, attempts: 1 });
    expect(JSON.stringify(s.crew)).toBe(before);
  });

  it('crew call once per Sol in rotation: Reyes, Aiko, David, Sofia, then Reyes again', () => {
    expect([1, 2, 3, 4, 5, 6, 8].map(crewForSol)).toEqual(['reyes', 'aiko', 'david', 'sofia', 'reyes', 'aiko', 'sofia']);
    const s = game(); s.sol = 2;
    expect(canStartCall(s, 'aiko')).toBe(true);
    expect(canStartCall(s, 'reyes')).toBe(false);      // not their turn
    markCalled(s, 'aiko');
    expect(canStartCall(s, 'aiko')).toBe(false);       // already taken today
    s.sol = 6; expect(canStartCall(s, 'aiko')).toBe(true);
    quizOf(s).crews.aiko.passed = 5; expect(canStartCall(s, 'aiko')).toBe(false); // nothing left to ask
  });

  it('passing moves up one level; replaying a passed level changes nothing', () => {
    const s = game(); const crew: CrewId = 'sofia';
    expect(nextLevel(s, crew)).toBe(1);
    let a = buildAttempt(bank, s, crew, 1);
    expect(recordResult(s, a, allRight(a), 200).passed).toBe(true);
    expect(nextLevel(s, crew)).toBe(2); expect(levelsPassed(s)).toBe(1);
    a = buildAttempt(bank, s, crew, 1);                 // PLAY AGAIN on level 1
    recordResult(s, a, allRight(a), 200);
    expect(quizOf(s).crews[crew].passed).toBe(1);
    a = buildAttempt(bank, s, crew, 3);                 // cannot skip ahead
    recordResult(s, a, allRight(a), 200);
    expect(quizOf(s).crews[crew].passed).toBe(1);
    for (const lv of [2, 3, 4, 5]) { a = buildAttempt(bank, s, crew, lv); recordResult(s, a, allRight(a), 200); }
    expect(nextLevel(s, crew)).toBeNull(); expect(levelsPassed(s)).toBe(5);
  });

  it('hearts: +1 only the first time level 2 and level 4 are passed, never lost on failure', () => {
    const s = game(); const crew: CrewId = 'aiko'; const start = s.crew[crew].friendship;
    const run = (lv: number, ok: boolean, secs = 200) => { const a = buildAttempt(bank, s, crew, lv); const p = allRight(a); if (!ok) p[0] = (p[0] + 1) % 4; return recordResult(s, a, p, secs); };
    expect(run(1, true).heartsGained).toBe(0);
    expect(run(2, false).heartsGained).toBe(0); expect(s.crew[crew].friendship).toBe(start);
    expect(run(2, true).heartsGained).toBe(1); expect(s.crew[crew].friendship).toBe(start + 1);
    expect(run(2, true).heartsGained).toBe(0);          // replay: no second heart
    run(3, true); expect(run(4, true).heartsGained).toBe(1);
    run(5, true); expect(s.crew[crew].friendship).toBe(start + 2);
    expect(heartsOf(s, crew)).toBe(start + 2);
    const before = s.crew[crew].friendship;
    for (let i = 0; i < 4; i++) run(5, false, 301);
    expect(s.crew[crew].friendship).toBe(before);       // failing never costs hearts
    expect(quizOf(s).crews[crew].passed).toBe(5);
  });

  it('counts fast passes (speed data for the Mastery score)', () => {
    const s = game(); let a = buildAttempt(bank, s, 'reyes', 1);
    recordResult(s, a, allRight(a), QUIZ.FAST_S);
    a = buildAttempt(bank, s, 'reyes', 2); recordResult(s, a, allRight(a), QUIZ.FAST_S + 1);
    expect(quizOf(s).fastPasses).toBe(1);
  });

  it('saves and loads, and old saves get empty quiz progress', () => {
    const s = game(); const a = buildAttempt(bank, s, 'david', 1); recordResult(s, a, allRight(a), 100); markCalled(s, 'david');
    const back = migrateState(JSON.parse(JSON.stringify(s)))!;
    expect(back.quiz).toEqual(s.quiz); expect(back.quiz!.crews.david).toMatchObject({ passed: 1, attempts: 1, lastSol: s.sol });
    const old = JSON.parse(JSON.stringify(newGame(1))); delete old.quiz; old.version = 6;
    const up = migrateState(old)!;
    expect(up.version).toBeGreaterThanOrEqual(7); expect(levelsPassed(up)).toBe(0);
    expect(up.quiz!.crews.reyes).toEqual({ passed: 0, attempts: 0, lastSol: 0 });
  });

  it('has a name for each of the 5 levels', () => { expect(LEVEL_NAMES).toHaveLength(QUIZ.LEVELS); expect(new Set(LEVEL_NAMES).size).toBe(5); });

  it('feedback text: right answers cheer, a miss is gentle (27c)', () => {
    expect(feedbackText(true, 0)).toBe('You got it!'); expect(feedbackText(true, 1)).toBe('Keep going!'); expect(feedbackText(true, 2)).toBe('You got it!');
    for (const n of [0, 1, 2, 3, 4]) expect(feedbackText(false, n)).toBe('Missed that one.');
  });

  it('result copy: level cleared, mastery on level 5, so close when any are wrong (27c)', () => {
    expect(resultCopy(5, 5, 2, true)).toEqual({ title: 'LEVEL 2 CLEARED', line: 'All 5 right. Ready for level 3?' });
    expect(resultCopy(5, 5, 5, true).title).toBe('MASTERY!');
    const miss = resultCopy(4, 5, 3, false);
    expect(miss.title).toBe('SO CLOSE'); expect(miss.line).toMatch(/4 of 5 right/); expect(miss.line).toMatch(/never costs you anything/);
  });
});

// ---------- Step 27d: START QUIZ rule + the daily call ----------
import { callerToday, showStartQuiz, callLine, crewForSol as crewForSol27d, markCalled as markCalled27d } from '../src/core/quiz';
describe('27d daily call and START QUIZ button', () => {
  it('only today\'s caller shows the button, and the rotation moves each Sol', () => {
    const s = newGame(1, { mode: 'storm' });
    const today = crewForSol27d(s.sol);
    expect(callerToday(s)).toBe(today);
    for (const id of CREW_IDS) expect(showStartQuiz(s, id, true, false)).toBe(id === today);
    s.sol += 1; expect(crewForSol27d(s.sol)).not.toBe(today); expect(callerToday(s)).toBe(crewForSol27d(s.sol));
  });
  it('hidden when hungry, when no bank exists, after the call is used, and when all 5 levels are passed', () => {
    const s = newGame(1, { mode: 'storm' }), c = crewForSol27d(s.sol);
    expect(showStartQuiz(s, c, true, true)).toBe(false);
    expect(showStartQuiz(s, c, false, false)).toBe(false);
    expect(callerToday(s, () => false)).toBeNull();
    markCalled27d(s, c); expect(showStartQuiz(s, c, true, false)).toBe(false); expect(callerToday(s)).toBeNull();
    const t = newGame(1, { mode: 'storm' }); quizOf(t).crews[crewForSol27d(t.sol)].passed = 5; expect(callerToday(t)).toBeNull();
  });
  it('the call line names the caller', () => { expect(callLine('Commander Reyes')).toContain('Commander Reyes is calling'); });
});

describe('Astronaut Mastery (27i)', () => {
  const passLevel = (s: ReturnType<typeof game>, crew: CrewId, level: number, elapsed: number) => { const a = buildAttempt(bank, s, crew, level); return recordResult(s, a, allRight(a), elapsed); };
  it('starts at 0 and 20 levels is 100 with every pass fast', () => {
    const s = game(); expect(masteryScore(s)).toBe(0);
    for (const c of CREW_IDS) for (let l = 1; l <= 5; l++) passLevel(s, c, l, 60);
    expect(levelsPassed(s)).toBe(20); expect(masteryScore(s)).toBe(100);
  });
  it('20 slow passes give 90: the speed bonus is only the last 10', () => {
    const s = game(); for (const c of CREW_IDS) for (let l = 1; l <= 5; l++) passLevel(s, c, l, QUIZ.FAST_S + 1);
    expect(masteryScore(s)).toBe(90);
  });
  it('one level: 5 slow, 5 with a fast pass (rounding)', () => {
    const a = game(); passLevel(a, 'reyes', 1, 200); expect(masteryScore(a)).toBe(5);   // 4.5 -> 5
    const b = game(); passLevel(b, 'reyes', 1, 100); expect(masteryScore(b)).toBe(5);   // 4.5 + 0.5
  });
  it('failures and timeouts never lower it', () => {
    const s = game(); passLevel(s, 'reyes', 1, 100); passLevel(s, 'reyes', 2, 100); const before = masteryScore(s);
    const a = buildAttempt(bank, s, 'reyes', 3); recordResult(s, a, [null, null, null, null, null], 20); recordResult(s, a, allRight(a), 400);
    expect(masteryScore(s)).toBe(before);
    recordResult(s, buildAttempt(bank, s, 'reyes', 1), allRight(buildAttempt(bank, s, 'reyes', 1)), 10); // replaying a passed level changes nothing
    expect(masteryScore(s)).toBe(before);
  });
  it('is separate from the Episode 1 score and does not change the state', () => {
    const s = game(), snap = JSON.stringify(s); masteryScore(s); expect(JSON.stringify(s)).toBe(snap);
    expect(masteryLine(s)).toBe('ASTRONAUT MASTERY 0 / 100'); expect(masteryDetail(s)).toBe('0 of 20 quiz levels passed');
  });
});

describe('Step 27j: storm-radiation pop quiz', () => {
  const ev = EP_EVENTS.find(e => e.id === 'radiation_peak')!;
  const pq = ev.popQuiz!;
  it('is one question with 4 options, one right, a NASA https source and a choice id for every answer', () => {
    expect(pq.options).toHaveLength(4);
    expect(pq.correct).toBe(0);
    expect(pq.options[pq.correct].choice).toBe('water_wall');
    expect(new URL(pq.sourceUrl).protocol).toBe('https:');
    expect(/(^|\.)nasa\.gov$/.test(new URL(pq.sourceUrl).hostname)).toBe(true);
    for (const o of pq.options) expect(ev.choices.some(c => c.id === o.choice)).toBe(true);
    expect(pq.prompt).toBe('What can you do to get more radiation protection in an emergency?');
  });
  it('shuffling keeps the right answer and maps every pick to the same flag as the old choice', () => {
    for (const seed of [1, 7, 42, 999, 123456]) {
      const b = buildPopQuestion(pq, seed, 2, ev.id);
      expect(b.question.options).toHaveLength(4);
      expect(b.choiceIds[b.question.correctIndex]).toBe('water_wall');
      expect(b.question.options[b.question.correctIndex]).toBe(pq.options[0].text);
      expect(b.choiceIds.filter(c => c === 'corner')).toHaveLength(1);
      expect(buildPopQuestion(pq, seed, 2, ev.id)).toEqual(b);   // same after a reload
    }
  });
  it('keeps the old story flags: water_wall costs water and power, wrong picks cost nothing', () => {
    expect(ev.choices.find(c => c.id === 'water_wall')!.effects.res).toBeTruthy();
    expect(ev.choices.find(c => c.id === 'nothing')!.effects).toEqual({});
  });
});
