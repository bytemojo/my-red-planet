// ASTRONAUT QUIZ: every rule, number and line of copy lives here so the game can be tuned without touching the engine or the UI.
// Pure data. No DOM, no Phaser.

export const AQ = {
  LEVELS: 10,                    // game levels (2 per bank difficulty 1-5, so difficulty rises every 2 levels)
  QUESTIONS_PER_LEVEL: 10,
  PASS_FRACTION: 0.8,            // 8 of 10 right to enter the next level (see passMark in engine.ts)
  GALAXY_ABOVE: 0.95,            // Galaxy Brain = finish all levels with MORE than 95% of ALL questions right
  /** Optional stricter reading of the brief: restart the whole run once the player has missed this many questions in total. 0 = off. */
  RESTART_AT_TOTAL_MISSES: 0,
  /** Seconds per level, easy to hard. The clock only runs while a question is waiting for an answer (it pauses on the answer screen). */
  LEVEL_TIME_S: [240, 240, 270, 270, 300, 300, 330, 330, 360, 360] as readonly number[],
  LIFELINES_PER_LEVEL: 1,        // "50:50" lifelines per level. 0 hides the button.
  POINTS_PER_CORRECT: 10,        // x bank difficulty (1-5)
  LEVEL_CLEAR_BONUS: 100,
  SUSPENSE_MS: 1100,             // the game-show pause between locking an answer in and the reveal
  LEVEL_INTRO_MS: 2600,          // the "LEVEL 3" splash auto-continues after this (tap or Enter skips it)
  LOW_TIME_S: 30,                // the gentle "take your time" notice
} as const;

/** The link added to shared posts and printed on the report card. */
export const SHARE_URL = 'https://myredplanet.vercel.app';
export const GENERIC_NAME = 'Astronaut';

export const LEVEL_NAMES: readonly string[] = ['Launch Pad', 'Lift-Off', 'Low Orbit', 'Moon Walk', 'Space Station', 'Deep Space', 'Red Planet', 'Asteroid Belt', 'Outer Planets', 'The Galaxy'];

export type TierId = 'recruit' | 'explorer' | 'commander' | 'scientist' | 'galaxy';
export interface Tier { id: TierId; name: string; short: string; need: string; line: string }
/** Lowest to highest. Rules are in tierFor() (engine.ts). */
export const TIERS: readonly Tier[] = [
  { id: 'recruit',   name: 'Space Recruit',   short: 'Recruit',   need: 'Start your journey',          line: 'Every astronaut starts here. The stars are waiting for you!' },
  { id: 'explorer',  name: 'Space Explorer',  short: 'Explorer',  need: 'Clear 3 levels',              line: 'You are charting the unknown. Keep exploring!' },
  { id: 'commander', name: 'Space Commander', short: 'Commander', need: 'Clear 6 levels',              line: 'You lead the way through deep space!' },
  { id: 'scientist', name: 'Solar Scientist', short: 'Scientist', need: 'Clear all 10 levels',         line: 'All 10 levels cleared. The Sun has no secrets from you!' },
  { id: 'galaxy',    name: 'Galaxy Brain',    short: 'Galaxy',    need: 'Over 95% right',  line: 'Over 95% correct! The whole galaxy fits inside your brain.' },
];
export const TIER_AT = { explorer: 3, commander: 6 } as const; // levels cleared

/** Reyes's lines. {name} is the player's name. */
export const SAY = {
  welcome: "Welcome to Astronaut Quiz. Let's test how much you know about space.",
  tip: "Tip: After you answer you'll get a link to learn more from NASA data.",
  correct: ["You're doing amazing.", "I can see you've been studying.", 'Brilliant! Right on target.', 'That is real astronaut thinking!', 'Mission Control is impressed.', 'Nice one, {name}!'],
  streak: ['{n} in a row! You are on fire.', '{n} in a row! Keep that streak going.'],
  wrong: ['Good try! Now you know.', 'No worries. Even astronauts learn on the job.', 'Almost! The NASA link has the full story.', 'Tricky one. You will get it next time.'],
  ready: ['Take your time, {name}. No rush.', 'Think it through. You have got this.', 'Read it twice, then trust your gut.'],
  lowTime: 'About 30 seconds left. Take a breath, you are doing fine.',
  fifty: 'Two wrong answers are gone. Pick from the rest!',
  levelPass: "Level {n} cleared! You're doing amazing, {name}.",
  levelPassLine: 'Ready for level {next}?',
  fail: 'Better luck next time.',
  failLine: 'Every astronaut starts over sometimes. Let us go again!',
  timeout: "Time's up, but no worries.",
  timeoutLine: 'Better luck next time. Every astronaut starts over sometimes.',
  complete: 'You cleared every level, {name}! I am so proud of you.',
  restartAsk: 'Start again from Level 1?',
} as const;

export const pick = <T,>(a: readonly T[], n: number): T => a[((n % a.length) + a.length) % a.length];
export const fill = (t: string, v: Record<string, string | number>): string => t.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));
