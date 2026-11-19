// Step 18b: the rec-room games (checkers now, chess in Step 19b) are optional. ONE small morale reward per Sol, shared by both games.
// The flag is tmp_ so endSol clears it. Pure, unit-tested in tests/games.test.ts.
import { clamp, addLog } from './util';
import { CREW_IDS } from './crewlife';
import type { GameState } from './types';

export type GameKind = 'checkers' | 'chess';
export type GameOutcome = 'win' | 'loss' | 'draw';
/** Morale added to EACH crew member. A loss still gives a little: it is a social evening. Energy is paid once, when the reward is taken. */
export const GAME_REWARD = { win: 4, draw: 3, loss: 2, ENERGY: 2, FLAG: 'tmp_game_reward' } as const;
const NAMES: Record<GameKind, string> = { checkers: 'checkers', chess: 'chess' };
const LINES: Record<GameOutcome, (g: string) => string> = {
  win: g => `I won a game of ${g} in the rec room. The crew cheered me on.`,
  draw: g => `A long game of ${g} ended in a draw. Good company.`,
  loss: g => `I lost at ${g} tonight, but it was fun and we all laughed.`,
};

/** Why the player cannot sit down to play right now, or null. Never mentions the suit. */
export function gameRefusal(s: GameState): string | null {
  if (s.outside) return 'Games are played inside the station.';
  if (s.energy < GAME_REWARD.ENERGY) return 'Too tired to play. Rest first.';
  return null;
}

export const rewardTaken = (s: GameState) => !!s.flags[GAME_REWARD.FLAG];

export function gameReward(s: GameState, kind: GameKind, outcome: GameOutcome): { applied: boolean; morale: number; msg: string } {
  if (rewardTaken(s)) return { applied: false, morale: 0, msg: 'Fun game! The crew already had their game time this Sol, so no extra morale today.' };
  const gain = GAME_REWARD[outcome];
  s.flags[GAME_REWARD.FLAG] = 1;
  s.energy = clamp(s.energy - GAME_REWARD.ENERGY, 0, 100);
  for (const id of CREW_IDS) s.crew[id].morale = clamp(s.crew[id].morale + gain, 0, 100);
  addLog(s, 'REC ROOM', LINES[outcome](NAMES[kind]));
  return { applied: true, morale: gain, msg: `Crew morale +${gain}. Energy -${GAME_REWARD.ENERGY}.` };
}
