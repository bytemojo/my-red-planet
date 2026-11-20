import { describe, it, expect } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { MICROSCOPE_SAMPLES } from '../src/story/microscope';

const NASA = /^https:\/\/([a-z0-9-]+\.)*(nasa\.gov)\//;
describe('microscope samples (Step 29c)', () => {
  it('has at least 5 samples', () => expect(MICROSCOPE_SAMPLES.length).toBeGreaterThanOrEqual(5));
  it('ids and files are unique', () => {
    expect(new Set(MICROSCOPE_SAMPLES.map(s => s.id)).size).toBe(MICROSCOPE_SAMPLES.length);
    expect(new Set(MICROSCOPE_SAMPLES.map(s => s.file)).size).toBe(MICROSCOPE_SAMPLES.length);
  });
  for (const s of MICROSCOPE_SAMPLES) {
    it(`${s.id}: file exists, credit, caption, NASA source`, () => {
      const f = `public/microscope/${s.file}`;
      expect(existsSync(f), f).toBe(true);
      expect(statSync(f).size).toBeGreaterThan(10_000);
      expect(s.title.length).toBeGreaterThan(3);
      expect(s.caption.length).toBeGreaterThan(20);
      expect(s.credit.length).toBeGreaterThan(3);
      expect(s.sourceUrl).toMatch(NASA);
    });
  }
});

import { noteSample } from '../src/story/microscope';
import { newGame } from '../src/core/sim';
describe('journal note (Step 29d)', () => {
  it('adds one note per sample, never twice, none for dev patterns', () => {
    const g = newGame();
    const a = MICROSCOPE_SAMPLES[0], b = MICROSCOPE_SAMPLES[1];
    const n0 = g.journal.length;
    expect(noteSample(g, a)).toBe(true); expect(noteSample(g, a)).toBe(false);
    expect(g.journal.length).toBe(n0 + 1);
    expect(g.journal[n0].happened).toMatch(/^I saw .* under the microscope\.$/);
    expect(noteSample(g, b)).toBe(true); expect(g.journal.length).toBe(n0 + 2);
    expect(noteSample(g, { ...a, id: 'dev-1', sourceUrl: '' })).toBe(false);
  });
});
