// Step 25a: the morning report as CARDS. Pure: turns the report lines into rows with an icon, a bold title, a short line and a status pill.
import type { DailyReport } from '../core/types';

export type MorningStatus = 'now' | 'ok' | 'todo' | 'warn' | 'info';
export interface MorningCard { icon: string; title: string; line: string; status: MorningStatus }
export const STATUS_LABEL: Record<MorningStatus, string> = { now: 'NOW', ok: 'OK', todo: 'TO DO', warn: 'WATCH', info: 'INFO' };
export const MORNING_STEP_MS = 400; // rows slide in one by one, about 400 ms apart

/** First match wins. Icons are keys of ui/icons.ts ICON. */
const RULES: { re: RegExp; icon: string; title: string; status: MorningStatus | ((l: string) => MorningStatus) }[] = [
  { re: /ready to harvest/i, icon: 'farm', title: 'Harvest', status: 'todo' },
  { re: /grew overnight/i, icon: 'farm', title: 'Plants', status: 'ok' },
  { re: /shipment/i, icon: 'earth', title: 'Shipment', status: 'ok' },
  { re: /space weather alert/i, icon: 'sun', title: 'Space weather', status: l => /(high|storm)\b/i.test(l) ? 'warn' : /elevated/i.test(l) ? 'info' : 'ok' },
  { re: /panels?/i, icon: 'panel', title: 'Solar panels', status: 'warn' },
  { re: /talk to you|crew|morale|hungry/i, icon: 'crew', title: 'Crew', status: 'todo' },
  { re: /battery|power/i, icon: 'battery', title: 'Power', status: 'warn' },
  { re: /water/i, icon: 'water', title: 'Water', status: 'warn' },
  { re: /air|oxygen/i, icon: 'o2', title: 'Air', status: 'warn' },
  { re: /food|meal|eat/i, icon: 'food', title: 'Food', status: 'warn' },
  { re: /workout|gym|health|muscle|strong/i, icon: 'heart', title: 'Health', status: 'info' },
  { re: /decision|come up/i, icon: 'ping', title: 'Decision', status: 'todo' },
  { re: /quiet night|steady/i, icon: 'moon', title: 'Quiet night', status: 'ok' },
];
export function morningCards(r: Pick<DailyReport, 'lines' | 'mission'>): MorningCard[] {
  const cards: MorningCard[] = [];
  if (r.mission) cards.push({ icon: 'bulb', title: "Today's mission", line: r.mission, status: 'now' });
  for (const line of r.lines) {
    const rule = RULES.find(x => x.re.test(line));
    cards.push(rule ? { icon: rule.icon, title: rule.title, line, status: typeof rule.status === 'function' ? rule.status(line) : rule.status } : { icon: 'ping', title: 'Update', line, status: 'info' });
  }
  return cards;
}
