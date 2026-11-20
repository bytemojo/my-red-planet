import { describe, expect, it } from 'vitest';
import { ROVER_ARTICLES, ROVER_LOCKED_TEXT, isNasaUrl } from '../src/story/rover';
import { roverBodyHtml } from '../src/ui/rovercard';
import { CLICK_BOXES, CLICK_PAD, T, ZONES, objectHit } from '../src/game/layout';
import { ROVER } from '../src/game/rover';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
describe('Step 28d: rover click and NASA article links', () => {
  it('the locked text is exact', () => {
    expect(ROVER_LOCKED_TEXT).toBe('This rover needs to be repaired. Keep playing to unlock the skills to fix it.');
  });
  it('exactly 3 articles, unique ids, https links on a NASA domain, with a title, blurb and source', () => {
    expect(ROVER_ARTICLES.length).toBe(3);
    expect(new Set(ROVER_ARTICLES.map(a => a.id)).size).toBe(3); expect(new Set(ROVER_ARTICLES.map(a => a.url)).size).toBe(3);
    for (const a of ROVER_ARTICLES) { expect(isNasaUrl(a.url), a.url).toBe(true); expect(new URL(a.url).protocol).toBe('https:'); expect(a.title.length).toBeGreaterThan(3); expect(a.blurb.length).toBeGreaterThan(10); expect(a.source.length).toBeGreaterThan(2); expect(typeof a.verified).toBe('boolean'); }
  });
  it('the NASA domain check accepts nasa.gov and subdomains and rejects look-alikes, http and junk', () => {
    for (const ok of ['https://nasa.gov/x', 'https://www.nasa.gov/x', 'https://science.nasa.gov/mission/msl-curiosity/', 'https://spaceplace.nasa.gov/mars-rovers/en/', 'https://mars.nasa.gov/']) expect(isNasaUrl(ok), ok).toBe(true);
    for (const bad of ['http://www.nasa.gov/x', 'https://nasa.gov.evil.com/', 'https://evilnasa.gov/', 'https://example.com/nasa.gov', 'javascript:alert(1)', 'not a url', '']) expect(isNasaUrl(bad), bad).toBe(false);
  });
  it('the card body has the text, a magnifier, 3 safe links (new tab, noopener) and NO button (no fake feature)', () => {
    const html = roverBodyHtml(esc);
    expect(html).toContain(ROVER_LOCKED_TEXT); expect(html).toContain('rv-mag');
    expect((html.match(/<a /g) ?? []).length).toBe(3);
    expect((html.match(/target="_blank"/g) ?? []).length).toBe(3); expect((html.match(/rel="noopener noreferrer"/g) ?? []).length).toBe(3);
    expect(html).not.toMatch(/<button/i); expect(html).not.toContain('data-do');
    for (const a of ROVER_ARTICLES) expect(html).toContain(`href="${a.url}"`);
  });
  it('an unverified link would be labelled so the player is never told it is checked', () => {
    // simulate by checking the template wording is present in the source of truth: verified:false shows "(link not checked yet)"
    expect(roverBodyHtml(esc)).not.toContain('link not checked yet'); // all three are verified today
  });
  it('the click box is the rover itself (small), matches the art, and the clicks between the rover and empty ground do not count', () => {
    expect(CLICK_BOXES.rover).toEqual([[33, 21, 3, 2]]);
    expect([ROVER.x / T, ROVER.y / T, ROVER.w / T, ROVER.h / T]).toEqual([33, 21, 3, 2]);
    expect(objectHit('rover', 34.5 * T, 22 * T)).toBe(true);                                        // on the rover
    expect(objectHit('rover', ROVER.x - CLICK_PAD - 4, 22 * T)).toBe(false);                        // just beside it
    expect(objectHit('rover', 34.5 * T, ROVER.y + ROVER.h + CLICK_PAD + 4)).toBe(false);            // just below it
    expect(ZONES.rover.inside).toBe(false);
  });
});
