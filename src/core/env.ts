import climate from '../data/climate.json';
import solar from '../data/solar-events.json';
import { hash01 } from './rng';
import type { Env } from './types';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// Pure function of the Sol number and bundled data. Works offline. See docs/DATA_MANIFEST.md.
export function envForSol(sol: number): Env {
  const d = climate.dust;
  let storm = 0;
  if (sol >= d.stormStartSol && sol <= d.stormEndSol) {
    storm = sol <= d.stormPeakSol
      ? (sol - d.stormStartSol) / (d.stormPeakSol - d.stormStartSol)
      : (d.stormEndSol - sol) / (d.stormEndSol - d.stormPeakSol);
  }
  const dust = clamp(d.baseline + hash01(sol + 11) * d.noise + storm * (d.stormPeak - d.baseline), 0, 1);
  const t = climate.tempC;
  const tempC = Math.round(t.mean + t.amplitude * Math.sin((2 * Math.PI * sol) / t.periodSols) + (hash01(sol + 29) - 0.5) * t.noise);
  const w = climate.wind;
  const gust = hash01(sol + 47) < w.gustChance;
  const windMs = Math.round(gust ? w.gustMs : w.mean + (hash01(sol + 61) - 0.5) * w.noise);

  let flare: Env['flare'] = null;
  const { firstSol, everySols } = solar.schedule;
  if (sol >= firstSol && (sol - firstSol) % everySols === 0) {
    const e = solar.events[(sol - firstSol) / everySols];
    if (e) flare = { id: e.id, classType: e.classType, mult: e.mult, date: e.date };
  }
  return { sol, dust, tempC, windMs, flare, globalStorm: storm > 0.6 };
}

export const forecastLabel = (e: Env) =>
  e.flare ? 'A solar flare warning' : e.dust > 0.55 ? 'A dust front' : e.windMs >= 18 ? 'Strong winds' : e.tempC <= -75 ? 'A cold snap' : 'Calm weather';
