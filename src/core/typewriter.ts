// Step 26a: typewriter timing, pure. About 280 words per minute is slightly above average reading speed: 280 wpm x ~5.4 chars per word / 60 s = about 25 characters per second.
export const TYPE_CPS = 25;
export const wordCount = (t: string): number => t.trim().split(/\s+/).filter(Boolean).length;
/** How many characters are visible after `elapsedMs`. Always between 0 and the text length. */
export const charsShown = (elapsedMs: number, total: number, cps = TYPE_CPS): number => Math.max(0, Math.min(total, Math.floor((Math.max(0, elapsedMs) / 1000) * cps)));
/** Time needed to type the whole text. */
export const typeDurationMs = (total: number, cps = TYPE_CPS): number => Math.ceil((total / cps) * 1000);
