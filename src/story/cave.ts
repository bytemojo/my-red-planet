// Step 28e: the cave entrance outside the base. Content only. Until the story unlocks the cave (flag cave_unlocked), clicking it shows
// ONE line and nothing else: no button, so nothing fake. Once the story unlocks it, the existing Candidate Cave panel opens instead.

/** Shown when the player clicks the cave before the story unlocks it. The card has NO action button, only a close button. */
export const CAVE_LOCKED_TEXT = 'Keep playing to unlock cave exploration.';
export const CAVE_LOCKED_TITLE = 'Cave Entrance';
/** Words on the small hazard sign beside the opening (kept short: it is drawn as a symbol, the words are for screen readers and tests). */
export const CAVE_SIGN_TEXT = 'Caution: unexplored cave';
