import type { GameState } from '../core/types';

// Science facts appear ONLY as earned discovery events (design decision), never as popups.
export interface Discovery { id: string; title: string; happened: string; science: string; source: string }
export const DISCOVERIES: Record<string, Discovery> = {
  perchlorates: {
    id: 'perchlorates', title: 'Salty soil',
    happened: 'You harvested your first crop. Aiko says Martian soil has to be washed before plants can use it.',
    science: 'NASA\'s Phoenix lander found perchlorate salts in Martian soil in 2008. They are harmful to people, so soil has to be treated before growing food.',
    source: 'NASA Phoenix lander (2008)',
  },
  hellas_pressure: {
    id: 'hellas_pressure', title: 'Down in the basin',
    happened: 'On your first rover trip, Sofia points out how low the ground is here.',
    science: 'Hellas is one of the deepest basins on Mars. Air pressure is higher down low, but still roughly 100 times thinner than on Earth.',
    source: 'NASA Mars Reconnaissance Orbiter / Mars Global Surveyor altimetry (verify exact citation)',
  },
  lava_tubes: {
    id: 'lava_tubes', title: 'Holes in the ground',
    happened: 'The rover reaches a dark pit in the ridge. This is one of the candidate caves.',
    science: 'Orbiters have photographed pits that might lead to lava tubes. They are candidates: nobody has been inside to confirm them.',
    source: 'NASA MRO HiRISE / CTX imagery (verify exact citation)',
  },
  hadriacus: {
    id: 'hadriacus', title: 'An old, quiet volcano',
    happened: 'From the ridge you can see Hadriacus Mons rising behind the outpost.',
    science: 'Hadriacus Mons is an ancient volcano on the edge of the Hellas basin. It stopped erupting billions of years ago.',
    source: 'NASA Mars orbiter geology (verify exact citation)',
  },
  cave_ice: {
    id: 'cave_ice', title: 'Ice in the dark',
    happened: 'Deep in the cavern, your lamp finds a wall of ice. (The cavern is fictional.)',
    science: 'Orbiter radar has found large buried ice deposits on Mars. Ice could one day give a colony water and radiation shielding.',
    source: 'NASA MRO SHARAD radar (verify exact citation)',
  },
};

export function unlockDiscovery(s: GameState, id: string): boolean {
  const d = DISCOVERIES[id];
  if (!d || s.discovered.includes(id)) return false;
  s.discovered.push(id);
  s.journal.push({
    id: `discovery:${id}`, sol: s.sol, title: d.title, happened: d.happened,
    decision: 'You discovered it by exploring.', why: 'Exploring teaches you things no panel could.',
    science: d.science, sourceId: d.source, realData: true, kind: 'discovery',
  });
  return true;
}
