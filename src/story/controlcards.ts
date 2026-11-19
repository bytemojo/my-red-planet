// Step 25b: the Control Module meters tab as a GRID OF SYSTEM CARDS (pure data). Each card: meter 0-100, a status colour and ONE primary line.
import { K } from '../core/constants';
import { isDishBroken } from '../core/dish';
import { ALERT_LABEL, alertFor, envFor } from '../core/episode';
import { isBroken } from '../core/inventory';
import { foodSolsText } from '../core/meals';
import { rates, solarEfficiency } from '../core/sim';
import type { GameState } from '../core/types';
import { objectivesView } from './objectives';

export type CardLevel = 'ok' | 'warn' | 'crit';
export interface SystemCard { id: string; icon: string; title: string; value: number; level: CardLevel; line: string; trend: number }
/** Same cut-offs as the HUD meters (ui.levelClass): under 20 = crit, under 40 = warn. */
export const levelOf = (v: number): CardLevel => (v < 20 ? 'crit' : v < 40 ? 'warn' : 'ok');
const clamp100 = (v: number) => Math.max(0, Math.min(100, v));

export function systemCards(s: GameState): SystemCard[] {
  const env = envFor(s), r = rates(s, env), eff = solarEfficiency(s, env);
  const panelPct = s.ep?.panelsStowed ? 0 : clamp100((eff / K.SOLAR_BASE_EFF) * 100);
  const commsDown = isBroken(s, 'comms'), solar = s.ep?.panelsStowed ? 'Panels are folded away' : s.panelDust > 0.5 ? 'Dusty: clean the panels' : 'Panels are catching sun';
  const rad = s.ep ? ALERT_LABEL[alertFor(s)] : null;
  const card = (id: string, icon: string, title: string, value: number, line: string, trend = 0, level = levelOf(value)): SystemCard => ({ id, icon, title, value: Math.round(clamp100(value)), level, line, trend });
  return [
    card('life', 'o2', 'Life support', s.res.o2, s.res.o2 < 40 ? 'Air is getting low' : 'Air is steady', r.o2),
    card('power', 'battery', 'Power', s.res.power, s.res.power < 25 ? 'Power is low' : 'Battery is healthy', r.power),
    card('water', 'water', 'Water', s.res.water, s.res.water < 40 ? 'Water is getting low' : s.ep ? (s.wateringMode === 'automatic' ? 'Pump: automatic' : 'Pump: manual') : 'Water is steady', r.water),
    card('comms', 'ping', 'Comms', commsDown ? 25 : 100, commsDown ? (isDishBroken(s) ? 'Dish is broken: static' : 'Console is broken') : 'Link to Earth is clear', 0, commsDown ? 'crit' : 'ok'),
    card('radiation', 'rad', 'Radiation', s.rad, rad ? `Solar Alert: ${rad}` : `${Math.round(s.rad)}% safe`, 0, rad === 'HIGH' || rad === 'STORM' ? 'crit' : rad === 'ELEVATED' ? 'warn' : levelOf(s.rad)),
    card('solar', 'panel', 'Solar', panelPct, solar, 0, s.ep?.panelsStowed ? 'warn' : levelOf(panelPct)),
    card('food', 'food', 'Food', s.res.food, foodSolsText(s), r.food),
    card('energy', 'bulb', 'You', s.energy, s.energy < 20 ? 'You are tired. Rest soon.' : `${Math.round(s.energy)} energy`, 0),
  ];
}
/** The NOW / NEXT strip on top. Empty strings when there is no Episode (so the strip is simply not drawn). */
export function nowNext(s: GameState): { now: string; next: string } { const v = objectivesView(s); return { now: v.now, next: v.next ?? '' }; }
