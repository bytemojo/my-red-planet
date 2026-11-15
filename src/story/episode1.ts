// Episode 1 "The Storm": scripted beats and decision cards (content only). Rules live in src/core/episode.ts.
// Lines may use {name}; the UI replaces it with the player's name. Every choice costs something.
import type { Beat, EventDef } from '../core/types';
import { EP } from '../core/constants';
import { SYSTEM_NAME, missedSystem } from '../core/episode';

export const EP_BEATS: Beat[] = [
  { id: 'ep_call', speaker: 'reyes', when: s => !!s.ep && s.ep.call === 'answered' && s.ep.phase === 'call',
    lines: ["There's a solar storm coming and just our luck, it's happening during the middle of a dust storm.",
      '{name}, our power reserves are already down, so we need you to maintain all systems.',
      "Check that all core systems are functioning before the solar storm hits. Always watch the space weather alert while you're outside."],
    effects: { friend: { crew: 'reyes', n: 1 } } },
  { id: 'storm_begins', speaker: 'reyes', when: s => !!s.ep && s.sol === 2 && s.ep.phase === 'storm',
    lines: ['The storm is here, {name}. The airlock stays sealed until it passes.', 'The dust blocks the sunlight, and the space weather alert will stay high for days. We ride it out together.'] },
  { id: 'earth_reply', speaker: 'reyes', when: s => !!s.ep && s.sol >= 2 && s.ep.stormCall === 'ask',
    lines: ["Earth's answer finally came in: \"Stow the panels before the dust peaks.\"",
      'A radio message takes between 3 and 22 minutes to cross from Earth to Mars, then the reply needs the same again. By the time it arrived, the storm had already hit.',
      'Out here, {name}, we have to decide for ourselves.'] },
  { id: 'storm_over', speaker: 'reyes', when: s => !!s.ep && s.ep.phase === 'after',
    lines: ['The storm has passed! The space weather alert is back to low and the airlock is open.', 'Two jobs left, {name}: clean the solar panels outside, and repair the watering system at the farm pump.'] },
];

export const EP_EVENTS: EventDef[] = [
  { id: 'storm_call', title: 'The Storm Call', speaker: 'reyes',
    weight: () => 0, // triggered at the storm's arrival by episodeTick
    text: () => 'Reyes: "{name}! The dust front is here and the solar panels are about to get buried. Stow them and we lose solar power tonight. Leave them out and we keep some power, but we could lose a lot more."',
    choices: [
      { id: 'stow', label: 'Stow the panels', hint: 'Panels stay safe. No solar power until you put them back out.', effects: {} },
      { id: 'out', label: 'Leave them out', hint: 'Some power during the storm. The dust can bury them.', effects: {} },
      { id: 'ask', label: 'Ask Earth', hint: 'The reply takes a long time to come back.', effects: {} },
      { id: 'wait', label: 'Time ran out', effects: {} },
    ],
    journal: { why: 'Solar panels make power only when sunlight reaches them. Dust storms block the Sun and can bury panels.', science: 'In 2018 a global dust storm blocked so much sunlight that NASA\'s solar-powered Opportunity rover could not recharge and went silent.', sourceId: 'mars-2018-global-dust-storm', learnId: 'mars_dust', realData: true } },
  { id: 'radiation_peak', title: 'Radiation peak tonight', speaker: 'sofia',
    weight: s => (s.ep && s.sol === 2 && s.ep.shield === null ? 100 : 0),
    text: () => 'The space weather alert goes to its peak tonight. How should we prepare?',
    choices: [
      { id: 'water_wall', label: 'Fill the water walls', hint: `Water stops radiation. Costs ${EP.WATER_WALL.water} water and ${EP.WATER_WALL.power} power.`, effects: { res: { water: -EP.WATER_WALL.water, power: -EP.WATER_WALL.power } } },
      { id: 'corner', label: 'Sleep in the storage corner', hint: 'Free, but squeezed in: the crew will be grumpy.', effects: {} },
      { id: 'nothing', label: 'Hope for the best', hint: 'Costs nothing now. Risky.', effects: {} },
    ],
    journal: { why: 'Mars has no global magnetic field and a thin atmosphere, so crews need shielding during solar storms. Water is a good shield, but it is also drinking water.', science: 'NASA studies hydrogen-rich shields like water and plastic to protect astronauts. DONKI records the real solar storms; it does not measure radiation at this fictional base.', sourceId: 'donki-flr-2024-10-03', learnId: 'space_radiation', realData: true } },
  { id: 'power_fault', title: 'Plan B: battery low', speaker: 'david',
    weight: () => 0, // triggered by episodeTick when power drops below 20 during the storm
    text: () => 'David: "Battery is low, so the automatic reserves just shut down. Plan B: we run things by hand. Which one?"',
    choices: [
      { id: 'manual_air', label: 'Run the air maker by hand', hint: 'Costs 15 of your energy.', requires: s => s.energy >= 15, effects: { energy: -15, res: { power: 4 } } },
      { id: 'water_off', label: 'Let the water maker sleep', hint: 'Saves power, costs 10 water.', effects: { res: { water: -10, power: 4 } } },
    ],
    journal: { why: 'When power runs short, crews switch off what they can live without for a while. Everything you switch off costs something else.', science: 'Real habitats plan for power emergencies: which systems stay on, and which can wait.', realData: false } },
  { id: 'missed_check', title: 'A fault you could have caught', speaker: 'david',
    weight: s => (s.ep && s.sol === 3 && !s.flags.missed_check_done && missedSystem(s) ? 100 : 0),
    text: s => { const m = missedSystem(s); return `David: "The ${m ? SYSTEM_NAME[m] : 'system'} has a fault. We could have caught it on the first day, but nobody checked it before the storm. Fix it properly, or patch it?"`; },
    choices: [
      { id: 'fix', label: 'Fix it properly', hint: 'Costs 12 of your energy.', requires: s => s.energy >= 12, effects: { energy: -12 } },
      { id: 'patch', label: 'Patch it for now', hint: 'Quick, but it costs supplies.', effects: {} },
    ],
    journal: { why: 'Checking systems before trouble arrives is cheaper than fixing them in the middle of it.', science: 'Crews on the space station inspect and maintain their life support every day.', realData: false } },
];
