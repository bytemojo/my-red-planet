// Step 26b: pure rules for the two life-support machines' art states (no Phaser). The drawing is in game/lifesupport.ts.
import { waterMakerOff } from './icerun';
import type { GameState } from './types';

export interface LifeSupportState { o2On: boolean; waterOn: boolean }

/** Oxygen unit is OFF when there is no air left or no power to run it. Water maker is OFF while the ice-run story has it shut down. */
export const pickLifeSupportState = (s: Pick<GameState, 'res' | 'flags'>): LifeSupportState => ({
  o2On: s.res.o2 > 0 && s.res.power > 0,
  waterOn: !waterMakerOff(s),
});

/** Water meter 0..100 -> tank fill 0..1 (clamped, safe for NaN). */
export const tankFill = (water: number): number => (Number.isFinite(water) ? Math.max(0, Math.min(1, water / 100)) : 0);
