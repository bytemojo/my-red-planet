import { describe, expect, it } from 'vitest';
import { TYPE_CPS, charsShown, typeDurationMs, wordCount } from '../src/core/typewriter';
import { BACKSTORY } from '../src/ui/episode';

describe('typewriter intro (Step 26a)', () => {
  const full = BACKSTORY.join('\n');
  it('the intro is 70 to 90 words, starts as asked, no invented numbers beyond the year', () => {
    const w = wordCount(BACKSTORY.join(' ')); expect(w).toBeGreaterThanOrEqual(70); expect(w).toBeLessThanOrEqual(90);
    expect(BACKSTORY[0].startsWith('The year is 2036. You are part of a small crew that has just landed in Hebrus Valles on Mars')).toBe(true);
  });
  it('about 25 characters a second (about 280 words per minute)', () => { expect(TYPE_CPS).toBe(25); const wpm = wordCount(full) / (typeDurationMs(full.length) / 60000); expect(wpm).toBeGreaterThan(240); expect(wpm).toBeLessThan(330); });
  it('charsShown grows with time and is clamped', () => { expect(charsShown(0, 100)).toBe(0); expect(charsShown(1000, 100)).toBe(25); expect(charsShown(99999, 100)).toBe(100); expect(charsShown(-5, 100)).toBe(0); });
});
