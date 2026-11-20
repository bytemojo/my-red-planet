import type { GameState } from '../core/types';
// Step 29b-29d: the microscope samples (real NASA images in public/microscope/, each with a credit and a NASA source link). In dev builds only, clearly-labelled generated test patterns stand in when the list is empty.
export interface MicroscopeSample { id: string; /** file name inside public/microscope/ (or a data: URL for the dev test patterns) */ file: string; title: string; caption: string; credit: string; /** page the picture came from; empty only for the dev test patterns */ sourceUrl: string }

/** Step 29c: the 8 samples (sand grains and gypsum crystals were dropped: no good picture).  Every sourceUrl was opened and read (NASA domains only). The picture files are saved by the owner into public/microscope/ (see docs/MICROSCOPE_TODO.md).
 *  MICROSCOPE_SAMPLES is this list, so the microscope opens in production. */
export const MICROSCOPE_PLAN: MicroscopeSample[] = [
  { id: 'meteorite', file: '01-mars-meteorite.jpg', title: 'Mars meteorite, super close-up', caption: 'A rock from Mars fell to Earth as a meteorite. These tiny tube shapes are less than a hair wide. Scientists still argue about what made them.', credit: 'NASA/JSC/Stanford University', sourceUrl: 'https://science.nasa.gov/photojournal/mars-life-microscopic-tube-like-structures/' },
  { id: 'spherules', file: '03-mars-spherules.jpg', title: 'Tiny round Mars pebbles', caption: 'These little spheres are up to 3 millimetres wide. Some have worn away and show rings inside, like an onion.', credit: 'NASA/JPL-Caltech/Cornell Univ./USGS/Modesto Junior College (Opportunity Microscopic Imager)', sourceUrl: 'https://www.jpl.nasa.gov/images/pia16139-puzzling-little-martian-spheres-that-dont-taste-like-blueberries/' },
  { id: 'dust', file: '04-mars-dust-particle.jpg', title: 'A speck of Martian dust', caption: 'One dust particle, about one micrometre wide, seen by the Phoenix lander. Colours show how tall each part is.', credit: 'NASA/JPL-Caltech/University of Arizona/University of Neuchatel/Imperial College London', sourceUrl: 'https://www.jpl.nasa.gov/news/phoenix-microscope-takes-first-image-of-martian-dust-particle' },
  { id: 'roots', file: '05-plant-root-cells.jpg', title: 'Plant root hairs and their cell skeleton', caption: 'Root hairs are tiny tubes that drink water for the plant. The glowing threads inside are the cell\u2019s skeleton. Colours were added to help us see.', credit: 'NASA Kennedy Space Center/Noble Research Institute, LLC (NASA Scientific Visualization Studio)', sourceUrl: 'https://svs.gsfc.nasa.gov/31218' },
  { id: 'pollen', file: '06-pollen-grains.jpg', title: 'Pollen grains', caption: 'Pollen from six garden plants, magnified. Each plant makes its own shape of grain.', credit: 'NASA/Goddard Space Flight Center, Scientific Visualization Studio', sourceUrl: 'https://svs.gsfc.nasa.gov/cgi-bin/details.cgi?aid=10394' },
  { id: 'microbes', file: '07-clean-room-bacteria.jpg', title: 'Bacteria from a spacecraft clean room', caption: 'Each round cell is about one micrometre across. This kind was found only in the clean rooms where spacecraft are built.', credit: 'NASA/JPL-Caltech', sourceUrl: 'https://www.jpl.nasa.gov/images/novel-bacterial-genus-found-only-in-spacecraft-assembly-clean-rooms' },
  { id: 'jezero', file: '08-jezero-rock-grains.jpg', title: 'A rock from Jezero crater', caption: 'Perseverance ground a patch 5 centimetres wide. The grey grains in it are only 1 to 2 millimetres across.', credit: 'NASA/JPL-Caltech/MSSS (Perseverance WATSON)', sourceUrl: 'https://www.jpl.nasa.gov/images/pia24940-watsons-view-of-dourbes-in-mars-jezero-crater/' },
  { id: 'nodules', file: '10-sandstone-nodules.jpg', title: 'Sand grains cemented into nodules', caption: 'Sand grains stuck together into lumps about the size of a chickpea, inside Martian sandstone.', credit: 'NASA/JPL-Caltech/MSSS (Curiosity MAHLI)', sourceUrl: 'https://www.jpl.nasa.gov/images/pia20323-nodules-of-cemented-sand-grains-within-martian-sandstone/' },
];
export const MICROSCOPE_SAMPLES: MicroscopeSample[] = MICROSCOPE_PLAN;

const isDev = (): boolean => !!(import.meta as { env?: { DEV?: boolean } }).env?.DEV;
/** Dev-only test patterns (drawn in the browser; NOT real samples, never shipped). */
export function devTestSamples(): MicroscopeSample[] {
  return [0, 1, 2].map(i => {
    const c = document.createElement('canvas'); c.width = 1600; c.height = 1200; const g = c.getContext('2d')!;
    g.fillStyle = ['#2a1d3a', '#1d3a2a', '#3a2a1d'][i]; g.fillRect(0, 0, 1600, 1200);
    for (let k = 0; k < 160; k++) { const x = (k * 197 + i * 61) % 1600, y = (k * 313 + i * 97) % 1200; g.fillStyle = `hsla(${(k * 37 + i * 90) % 360},60%,55%,0.55)`; g.beginPath(); g.arc(x, y, 6 + (k * 7) % 28, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; for (let x = 0; x <= 1600; x += 100) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1200); g.stroke(); } for (let y = 0; y <= 1200; y += 100) { g.beginPath(); g.moveTo(0, y); g.lineTo(1600, y); g.stroke(); }
    g.fillStyle = '#fff'; g.font = 'bold 90px sans-serif'; g.textAlign = 'center'; g.fillText('TEST PATTERN ' + (i + 1), 800, 620);
    return { id: 'dev-' + (i + 1), file: c.toDataURL('image/jpeg', 0.8), title: `Test pattern ${i + 1} (dev only)`, caption: 'Zoom in to see the grid. This is not a real sample.', credit: 'Generated in the browser', sourceUrl: '' };
  });
}
export const viewerSamples = (): MicroscopeSample[] => MICROSCOPE_SAMPLES.length ? MICROSCOPE_SAMPLES : isDev() ? devTestSamples() : [];
/** Can the player use the microscope at all? (Real samples, or a dev build.) */
export const microscopeReady = (): boolean => MICROSCOPE_SAMPLES.length > 0 || isDev();

/** Step 29d: seeing a sample for the first time adds ONE small journal note. No score, no energy beyond the lab action. Dev test patterns (no source link) never count. */
export function noteSample(s: GameState, m: MicroscopeSample): boolean {
  if (!m.sourceUrl) return false;
  const id = `microscope:${m.id}`;
  if (s.journal.some(j => j.id === id)) return false;
  s.journal.push({ id, sol: s.sol, title: `Microscope: ${m.title}`, happened: `I saw ${m.title.charAt(0).toLowerCase()}${m.title.slice(1)} under the microscope.`, decision: 'You looked closely.', why: 'Looking at tiny things shows how Mars rocks, plants and microbes are made.', science: m.caption, realData: true, kind: 'discovery' });
  return true;
}
