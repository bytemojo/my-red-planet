import type { EventDef } from '../core/types';
import { flagNum, hasBuilding } from '../core/util';

// SYSTEMIC EVENTS. Chosen each morning by weight from the Sol's environment AND the player's past choices (flags).
// A choice must have a real cost somewhere. No option is perfect.
export const EVENTS: EventDef[] = [
  { id: 'solar_flare', title: 'Solar flare warning', speaker: 'sofia',
    weight: (_s, env) => (env.flare ? 100 : 0),
    text: (_s, env) => `Sofia: "Inspired by a real flare NASA's DONKI recorded on ${env.flare?.date} (class ${env.flare?.classType}), a flare is heading our way. Radiation outside will be higher today."`,
    choices: [
      { id: 'stay', label: 'Stay inside today', hint: 'Safe, but no outdoor work.', effects: { flag: { tmp_delay_outdoor: true }, friend: { crew: 'sofia', n: 1 } } },
      { id: 'go', label: 'Work outside anyway', hint: 'Get things done, but more radiation.', effects: { addFlag: { risky: 1 }, flag: { tmp_flare_exposed: true } } },
      { id: 'shield', label: 'Shield the equipment', hint: 'Costs 5 power.', effects: { res: { power: -5 }, flag: { tmp_equip_safe: true } } },
    ],
    journal: { why: 'Flares send out bursts of radiation. Planning ahead keeps people and machines safe.', science: 'DONKI catalogues real solar flares. It does not measure radiation at our fictional outpost, so the game uses a simplified radiation model.', sourceId: '@flare', learnId: 'donki_flare', realData: true } },
  { id: 'global_storm', title: 'A planet-wide dust storm', speaker: 'reyes',
    weight: (s, env) => (env.globalStorm && !s.flags.seen_global_storm ? 60 : 0),
    text: () => 'Reyes: "The sky is going dark. This reminds me of the 2018 global dust storm, when sunlight dropped so low that the Opportunity rover went quiet. We need a plan."',
    choices: [
      { id: 'hunker', label: 'Hunker down: dim lights', hint: 'Slower plants, steady power.', effects: { setting: { farm: 'dim' }, flag: { seen_global_storm: true } } },
      { id: 'battery', label: 'Run everything off the battery', hint: 'Costs 15 power now.', effects: { res: { power: -15 }, flag: { seen_global_storm: true } } },
      { id: 'ask', label: 'Ask Earth for advice', hint: 'The answer takes time.', effects: { flag: { seen_global_storm: true, asked_earth: true }, friend: { crew: 'reyes', n: 1 }, log: 'Message sent to Earth. The reply will take a while.' } },
    ],
    journal: { why: 'When dust blocks the Sun, solar power drops for days. You cannot wait for Earth to fix it.', science: 'In 2018 a global dust storm blocked so much sunlight that the solar-powered Opportunity rover stopped communicating.', sourceId: 'mars-2018-global-dust-storm', learnId: 'mars_dust', realData: true } },
  { id: 'dust_front', title: 'Dust approaching', speaker: 'david',
    weight: (_s, env) => (env.dust >= 0.45 && !env.globalStorm ? 5 : 0),
    text: () => 'David: "Dust front coming in. The sky is turning orange. Solar panels will make less power."',
    choices: [
      { id: 'clean', label: 'Clean the panels now', hint: 'Costs 12 energy.', requires: s => s.energy >= 12, effects: { energy: -12, panelDust: -1, friend: { crew: 'david', n: 1 } } },
      { id: 'dim', label: 'Switch to dim grow-lights', hint: 'Plants grow slower.', effects: { setting: { farm: 'dim' } } },
      { id: 'postpone', label: 'Postpone building today', hint: 'Saves 6 power, no building.', effects: { res: { power: 6 }, flag: { tmp_no_build: true } } },
    ],
    journal: { why: 'Dust blocks sunlight and settles on panels, so you make less power.', science: 'Dust is a major problem for solar power on Mars. (This event uses the development fallback climate table, not measured data.)', sourceId: 'mars-climate-dev-fallback', learnId: 'mars_dust', realData: false } },
  { id: 'cold_snap', title: 'Cold snap', speaker: 'david',
    weight: (_s, env) => (env.tempC <= -75 ? 3 : 0),
    text: (_s, env) => `David: "It is ${env.tempC} degrees outside. The habitat is getting chilly."`,
    choices: [
      { id: 'heat', label: 'Heat the whole habitat', hint: 'Uses more power today.', effects: { flag: { tmp_heating: true }, friend: { crew: 'david', n: 1 } } },
      { id: 'layers', label: 'Bundle up, no extra heat', hint: 'Costs 10 energy.', effects: { energy: -10 } },
      { id: 'greenhouse', label: 'Warm only the greenhouse, dim lights', hint: 'Protects the plants.', effects: { flag: { tmp_heating: true }, setting: { farm: 'dim' } } },
    ],
    journal: { why: 'Heating takes power. Every warm room costs electricity you could use elsewhere.', science: 'Mars is cold. Habitats need heat, and heat competes with everything else for power.', sourceId: 'mars-climate-dev-fallback', realData: false } },
  { id: 'strong_wind', title: 'Strong winds', speaker: 'david',
    weight: (_s, env) => (env.windMs >= 18 ? 3 : 0),
    text: (_s, env) => `David: "Wind is up to ${env.windMs} metres per second. Working outside is harder today."`,
    choices: [
      { id: 'wait', label: 'Wait inside', hint: 'No outdoor work today.', effects: { flag: { tmp_delay_outdoor: true } } },
      { id: 'careful', label: 'Go out carefully', hint: 'Costs 8 energy.', effects: { energy: -8 } },
      { id: 'help', label: 'Ask David to help', hint: 'He likes being asked.', effects: { friend: { crew: 'david', n: 1 }, energy: -3 } },
    ],
    journal: { why: 'Wind makes outdoor jobs harder and riskier.', science: 'Mars winds are thin, but strong gusts still move dust onto panels.', sourceId: 'mars-climate-dev-fallback', realData: false } },
  // MEMORY-DRIVEN: appears because of what the player did (or skipped) earlier.
  { id: 'panel_fault', title: 'A panel is overheating', speaker: 'david',
    weight: s => (s.panelDust >= 0.7 ? 6 : 0),
    text: () => 'David: "Those panels have not been cleaned in a while. One of them is running hot. Fix it now or it gets worse."',
    choices: [
      { id: 'repair', label: 'Repair it now', hint: 'Costs 8 energy.', requires: s => s.energy >= 8, effects: { energy: -8, panelDust: -0.6, friend: { crew: 'david', n: 1 } } },
      { id: 'later', label: 'Patch it later', hint: 'Costs 10 power now.', effects: { res: { power: -10 } } },
    ],
    journal: { why: 'Skipping maintenance does not make it go away.', science: 'Dusty panels run hotter and produce less. Regular cleaning keeps solar farms healthy.', realData: false } },
  { id: 'aiko_request', title: 'A favour from Aiko', speaker: 'aiko',
    weight: s => (s.stage >= 2 && flagNum(s, 'aiko_help') < 3 ? 2 : 0),
    text: () => 'Aiko (on the intercom): "Could you water the lettuce twice today? It is for a little experiment."',
    choices: [
      { id: 'yes', label: 'Sure, happy to help', hint: 'Costs 5 energy.', requires: s => s.energy >= 5, effects: { energy: -5, friend: { crew: 'aiko', n: 2 }, addFlag: { aiko_help: 1 } } },
      { id: 'no', label: 'Not today', hint: 'No hard feelings.', effects: {} },
    ],
    journal: { why: 'Helping people costs time and energy. So does ignoring them, in other ways.', science: 'Crew wellbeing is a real part of mission planning on long missions.', realData: false } },
];

export const eventById = (id: string) => EVENTS.find(e => e.id === id);
export { hasBuilding };
