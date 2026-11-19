// Step 22b: the short "what your choices caused" summary and the best / next-time lines on the mission screen. PURE text from state.
// Never mentions the suit (rule 3). The panel line reuses the story tree text so the words always match what happened.
import { dishChoice } from '../core/dish';
import { MEASURE_LABELS, type MeasureId, type Measures, WEIGHTS } from '../core/score';
import type { GameState } from '../core/types';

export interface ConsequenceLine { topic: string; text: string }

export function consequenceLines(s: GameState): ConsequenceLine[] {
  const out: ConsequenceLine[] = [];
  const dish = dishChoice(s);
  if (dish === 'comms') out.push({ topic: 'Comms or dish', text: 'You repaired the comms console, so Earth stayed in reach. The water maker stayed damaged, and water ran lower each night.' });
  else if (dish === 'dish') out.push({ topic: 'Comms or dish', text: 'You repaired the dish, so water production came back. The comms console stayed broken, so Earth answered in static, a day late.' });
  out.push(s.wateringMode === 'automatic'
    ? { topic: 'Watering', text: 'The pump ran automatically, so the beds were watered without you. It used battery power to do it.' }
    : { topic: 'Watering', text: 'You watered by hand. It saved battery power, but every missed round hurt the plants.' });
  const panel = s.ep?.tree.find(n => n.tag === 'panels');
  if (panel) out.push({ topic: 'Panel plan', text: panel.text });
  return out;
}

const PRAISE: Record<MeasureId, string> = {
  morale: 'You kept the crew cheerful.', health: 'You looked after yourself.', plants: 'Your plants grew well.',
  energy: 'You kept the base energy healthy.', sustainability: 'The base could live a long time without Earth.',
};
const TIP: Record<MeasureId, string> = {
  morale: 'Talk to the crew every Sol and feed them a varied menu.',
  health: 'Eat on time and rest, so your health stays up.',
  plants: 'Water every bed every Sol and harvest when the crop is ready.',
  energy: 'Look after the panels and save battery power during the storm.',
  sustainability: 'Grow more food and keep the water maker repaired: that is how a base lives without shipments.',
};
const ORDER = Object.keys(WEIGHTS) as MeasureId[];

/** Highest measure gets the praise, lowest gets the tip (ties: the heavier-weighted measure first, so it is deterministic). */
export function bestAndTip(m: Measures): { best: { id: MeasureId; label: string; text: string }; tip: { id: MeasureId; label: string; text: string } } {
  const sorted = [...ORDER].sort((a, b) => m[b] - m[a] || ORDER.indexOf(a) - ORDER.indexOf(b));
  const hi = sorted[0], lo = sorted[sorted.length - 1];
  return { best: { id: hi, label: MEASURE_LABELS[hi], text: PRAISE[hi] }, tip: { id: lo, label: MEASURE_LABELS[lo], text: TIP[lo] } };
}
