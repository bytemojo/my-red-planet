import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { SHARE_TEXT, SHARE_URL, SHARE_NETWORKS } from '../src/core/share';

describe('share card (Step 22c)', () => {
  it('uses the exact default text', () => {
    expect(SHARE_TEXT).toBe('Play this fun Mars colony game with me at https://myredplanet.vercel.app/');
    expect(SHARE_URL).toBe('https://myredplanet.vercel.app/');
  });
  it('has plain links for the main networks that decode back to the exact text', () => {
    expect(SHARE_NETWORKS.map(n => n.id)).toEqual(['whatsapp', 'x', 'facebook', 'email']);
    for (const n of SHARE_NETWORKS) {
      const u = new URL(n.href);
      if (n.id === 'facebook') expect(u.searchParams.get('u')).toBe(SHARE_URL);
      else expect(u.searchParams.get('text') ?? u.searchParams.get('body')).toBe(SHARE_TEXT);
    }
    expect(SHARE_NETWORKS.filter(n => n.external).every(n => n.href.startsWith('https://'))).toBe(true);
  });
  it('the debrief renders the card from this data, under the stars, with Play Again right after it', () => {
    const src = readFileSync('src/ui/episode.ts', 'utf8');
    expect(src).toContain('SHARE_NETWORKS');
    const iStars = src.indexOf('id="bonus-wrap"'), iCard = src.indexOf('class="share-card"'), iAgain = src.indexOf('id="db-replay"'), iTree = src.indexOf('<div class="tree">');
    expect(iStars).toBeGreaterThan(0);
    expect(iCard).toBeGreaterThan(iStars); expect(iCard).toBeLessThan(iTree);
    expect(iAgain).toBeGreaterThan(iCard); expect(iAgain).toBeLessThan(iTree);
  });
  it('the debrief still has NASA WIKI and MAIN MENU buttons', () => {
    const src = readFileSync('src/ui/episode.ts', 'utf8');
    for (const id of ['db-wiki', 'db-menu', 'db-copy']) expect(src).toContain(`id="${id}"`);
  });
  it('no tracking, SDK or fetch is used by the share code', () => {
    const ep = readFileSync('src/ui/episode.ts', 'utf8');
    const src = readFileSync('src/core/share.ts', 'utf8') + ep.slice(ep.indexOf('export function showDebrief'), ep.indexOf('// ---------- NASA wiki'));
    expect(/fetch\(|XMLHttpRequest|sendBeacon|gtag|fbq|analytics|connect\.facebook\.net/i.test(src)).toBe(false);
  });
  it('Play Again keeps device awards and the leaderboard (only per-run bonus progress is cleared)', () => {
    const src = readFileSync('src/ui/episode.ts', 'utf8');
    const fn = src.slice(src.indexOf('export function resetBonusProgress'), src.indexOf('export const BACKSTORY'));
    expect(fn).not.toMatch(/awards|board|localStorage/);
  });
});
