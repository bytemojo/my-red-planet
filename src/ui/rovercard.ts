// Step 28d: pure markup for the parked-rover card body (no DOM, so it is unit-tested). panels.ts wraps it in the panel head.
import { ROVER_ARTICLES, ROVER_LOCKED_TEXT, isNasaUrl } from '../story/rover';

export const MAGNIFIER_SVG = '<svg class="rv-mag" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/><line x1="12.6" y1="12.6" x2="17.5" y2="17.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';

/** The card body: the locked-state text, then a magnifier heading and the NASA links. NO action button anywhere (nothing fake). */
export function roverBodyHtml(esc: (s: string) => string): string {
  const links = ROVER_ARTICLES.filter(a => isNasaUrl(a.url)).map(a => `<a class="rv-link" href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${MAGNIFIER_SVG}<span><b>${esc(a.title)}</b><small>${esc(a.source)}${a.verified ? '' : ' (link not checked yet)'} · ${esc(a.blurb)}</small></span></a>`).join('');
  return `<p class="why">${esc(ROVER_LOCKED_TEXT)}</p><div class="rv-learn"><div class="rv-learn-h">${MAGNIFIER_SVG}<span>Read about rovers on Mars</span></div>${links}</div>`;
}
