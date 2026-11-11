import type { Effect, GameState } from './types';
import { clamp, addLog } from './util';

export function applyEffect(s: GameState, e: Effect | undefined): void {
  if (!e) return;
  if (e.res) for (const k of Object.keys(e.res) as (keyof typeof s.res)[]) s.res[k] = clamp(s.res[k] + (e.res[k] ?? 0), 0, 100);
  if (e.energy) s.energy = clamp(s.energy + e.energy, 0, 100);
  if (e.rad) s.rad = clamp(s.rad + e.rad, 0, 100);
  if (e.panelDust) s.panelDust = clamp(s.panelDust + e.panelDust, 0, 1);
  if (e.friend) { const c = s.crew[e.friend.crew]; c.friendship = Math.max(0, c.friendship + e.friend.n); }
  if (e.flag) Object.assign(s.flags, e.flag);
  if (e.addFlag) for (const [k, n] of Object.entries(e.addFlag)) s.flags[k] = ((s.flags[k] as number) || 0) + n;
  if (e.setting?.farm) s.farm = e.setting.farm;
  if (e.setting?.ls) s.ls = e.setting.ls;
  if (e.log) addLog(s, 'SYSTEM', e.log);
}
