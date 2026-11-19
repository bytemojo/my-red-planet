// Step 16c: the in-game Solar Alert is AUTHORED. Sol + hour -> level -> radiation drain, and nothing else.
// It never reads the live NASA DONKI forecast (that card on the home menu is information only and cannot change gameplay).
// The storm is modelled on the real X9.0 flare of 3 Oct 2024 (docs/NASA_SOURCES.md); the hours below are a game script, not NASA data.
import type { Alert } from '../core/types';

/** For each Sol: [fromHour, level] steps, ascending. The last step whose fromHour <= hour wins. Sols not listed are LOW. */
export const ALERT_SCRIPT: Record<number, ReadonlyArray<readonly [number, Alert]>> = {
  1: [[0, 'low'], [13, 'elevated'], [17, 'high']],
  2: [[0, 'high'], [3, 'storm'], [8, 'high'], [13, 'storm'], [19, 'high'], [22, 'storm']],
  3: [[0, 'storm'], [4, 'high'], [9, 'storm'], [15, 'high'], [20, 'storm']],
  4: [[0, 'high'], [5, 'storm'], [10, 'high'], [16, 'storm'], [21, 'high']],
};

/** Health lost per hour outside at each level (the radiation drain). */
export const ALERT_DRAIN: Record<Alert, number> = { low: 0, elevated: 2, high: 9, storm: 16 };

export function scriptedAlert(sol: number, hour: number): Alert {
  const steps = ALERT_SCRIPT[sol]; if (!steps) return 'low';
  let level: Alert = steps[0][1];
  for (const [from, l] of steps) if (hour >= from) level = l;
  return level;
}
