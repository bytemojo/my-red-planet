// Shared content test for every quiz bank (27e Reyes, 27f Aoki, 27g engineer, 27h medic). Add a bank to QUIZ_BANKS and it is checked here.
import { describe, expect, it } from 'vitest';
import { QUIZ, validateQuestion } from '../src/core/quiz';
import { QUIZ_BANKS } from '../src/story/quizbank';

const NASA = /(^|\.)nasa\.gov$/;
const banks = Object.entries(QUIZ_BANKS);
const all = banks.flatMap(([, b]) => [...(b ?? [])]);

describe('quiz banks', () => {
  it('has at least the Reyes bank registered', () => { expect(QUIZ_BANKS.reyes?.length).toBe(25); });
  for (const [crew, bank] of banks) describe(crew, () => {
    const b = bank ?? [];
    it('has exactly 25 questions, 5 per level', () => {
      expect(b.length).toBe(QUIZ.LEVELS * QUIZ.PER_LEVEL);
      for (let l = 1; l <= QUIZ.LEVELS; l++) expect(b.filter(q => q.level === l).length).toBe(QUIZ.PER_LEVEL);
    });
    it('every question has 4 distinct options and one valid correct index', () => { for (const q of b) { expect(validateQuestion(q)).toBeNull(); expect(q.crew).toBe(crew); } });
    it('every source is an https link on a NASA domain with a title', () => {
      for (const q of b) { const u = new URL(q.sourceUrl); expect(u.protocol, q.id).toBe('https:'); expect(NASA.test(u.hostname), q.id + ' ' + u.hostname).toBe(true); expect(q.sourceTitle.length, q.id).toBeGreaterThan(3); }
    });
    it('every question explains its answer; level 5 shows a numeric calculation', () => {
      for (const q of b) { expect((q.explanation ?? '').length, q.id).toBeGreaterThan(10); if (q.level === 5) expect(q.explanation, q.id).toMatch(/\d.*[x×÷/+=-].*\d|\d.*=.*\d/); }
    });
    it('the correct answers are spread over all 4 positions (source order)', () => { expect(new Set(b.map(q => q.correctIndex)).size).toBe(4); });
  });
  it('has no duplicate ids or duplicate prompts across banks', () => {
    expect(new Set(all.map(q => q.id)).size).toBe(all.length);
    expect(new Set(all.map(q => q.prompt)).size).toBe(all.length);
  });
  it('lists unverified questions (none expected for Reyes)', () => { expect(all.filter(q => !q.verified).map(q => q.id)).toEqual([]); });
});
