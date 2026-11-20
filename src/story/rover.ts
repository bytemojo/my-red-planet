// Step 28d: the parked, broken rover (art in game/rover.ts). Content only: the locked-state text and 3 NASA articles about rovers on Mars.
// Every link is https on a NASA domain (nasa.gov or a nasa.gov subdomain). Never invent a URL: `verified` says whether the page was actually opened or found
// in a live search in the build session (Nov 20, 2026). A link with verified:false must be listed to the owner.

/** Shown when the player clicks the rover. A locked state: the card has NO action button (no fake feature), only a close button. */
export const ROVER_LOCKED_TEXT = 'This rover needs to be repaired. Keep playing to unlock the skills to fix it.';
export const ROVER_LOCKED_TITLE = 'Parked Rover';

export interface RoverArticle { id: string; title: string; blurb: string; url: string; source: string; verified: boolean }

export const ROVER_ARTICLES: readonly RoverArticle[] = [
  { id: 'rovers_space_place', title: 'The Mars Rovers', blurb: 'A kid-friendly tour of every rover NASA has sent to Mars and why rovers matter.', url: 'https://spaceplace.nasa.gov/mars-rovers/en/', source: 'NASA Space Place', verified: true }, // page fetched in full
  { id: 'perseverance', title: 'Mars 2020: Perseverance Rover', blurb: 'NASA\'s newest rover searches for signs of ancient microbial life in Jezero Crater.', url: 'https://science.nasa.gov/mission/mars-2020-perseverance/', source: 'NASA Science', verified: true }, // page found in a live search with its mission description
  { id: 'curiosity', title: 'Mars Science Laboratory: Curiosity Rover', blurb: 'Curiosity has explored Gale Crater since 2012 to learn if Mars could ever have supported life.', url: 'https://science.nasa.gov/mission/msl-curiosity/', source: 'NASA Science', verified: true }, // page found in a live search with its title
];

/** https link on nasa.gov or one of its subdomains. */
export const isNasaUrl = (u: string): boolean => { try { const x = new URL(u); return x.protocol === 'https:' && /(^|\.)nasa\.gov$/.test(x.hostname); } catch { return false; } };
