import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { MICROSCOPE_SAMPLES } from '../src/story/microscope';

describe('offline: service worker precaches the microscope pictures (Step 30b)', () => {
  const sw = readFileSync('public/sw.js', 'utf8');
  const listed = [...(sw.match(/const MICROSCOPE = \[([^\]]*)\]/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map(m => m[1]);
  it('lists exactly the sample files', () => expect([...listed].sort()).toEqual(MICROSCOPE_SAMPLES.map(s => s.file).sort()));
  it('adds them on install', () => expect(sw).toMatch(/MICROSCOPE\.map\(f => c\.add\('\.\/microscope\/' \+ f\)/));
  it('pre-caches the bundled quiz music and report-card reveal sound', () => {
    expect(sw).toContain("'./audio/astronaut-quiz-monume.mp3'");
    expect(sw).toContain("'./audio/tapjoy-victory.mp3'");
  });
});
