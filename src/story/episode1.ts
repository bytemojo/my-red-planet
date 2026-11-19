// Episode 1 "The Storm": scripted beats and decision cards (content only). Rules live in src/core/episode.ts.
// Lines may use {name}; the UI replaces it with the player's name. Every choice costs something.
import type { Beat, EventDef } from '../core/types';
import { EP } from '../core/constants';
import { SYSTEM_NAME, missedSystem } from '../core/episode';
import { earthReplySol, staticComms } from '../core/dish';

/** Step 21c: the exact closing line. {name} becomes the player's name through story/name.ts fillName. */
export const CAPTAIN_BEAT_ID = 'captain_line';
export const CAPTAIN_LINE = "I hope you're ready {name}. The real game just started.";
export const EP_BEATS: Beat[] = [
  { id: 'ep_call', speaker: 'reyes', when: s => !!s.ep && s.ep.call === 'answered' && s.ep.phase === 'call',
    lines: ["There's a solar storm coming and just our luck, it's happening during the middle of a dust storm.",
      '{name}, our power reserves are already down, so we need you to maintain all systems.',
      "Check that all core systems are functioning before the solar storm hits. Always watch the space weather alert while you're outside."],
    effects: { friend: { crew: 'reyes', n: 1 } } },
  { id: 'storm_begins', speaker: 'reyes', when: s => !!s.ep && s.sol === 2 && s.ep.phase === 'storm',
    lines: ['The storm is here, {name}. The airlock stays sealed until it passes.', 'The dust blocks the sunlight, and the space weather alert will stay high for days. We ride it out together.'] },
  { id: 'earth_reply', speaker: 'reyes', when: s => !!s.ep && s.sol >= 2 && s.sol >= earthReplySol(s) && s.ep.stormCall === 'ask' && !staticComms(s),
    lines: ["Earth's answer finally came in: \"Stow the panels before the dust peaks.\"",
      'A radio message takes between 3 and 22 minutes to cross from Earth to Mars, then the reply needs the same again. By the time it arrived, the storm had already hit.',
      'Out here, {name}, we have to decide for ourselves.'] },
  { id: 'earth_reply_static', speaker: 'reyes', when: s => !!s.ep && s.sol >= earthReplySol(s) && s.ep.stormCall === 'ask' && staticComms(s),
    lines: ['Earth is answering, but the comms console is still broken, so it is all static. We caught only: "...stow the panels..." and then it faded.',
      'It took an extra day to piece together, {name}. That is what happens when the dish gets fixed before the radio.'] },
  { id: 'storm_over', speaker: 'reyes', when: s => !!s.ep && s.ep.phase === 'after',
    lines: ['The storm has passed! The space weather alert is back to low and the airlock is open.', 'Two jobs left, {name}: clean the solar panels outside, and repair the watering system at the farm pump.'] },
  // Step 21c: the captain line. Fires the moment the ice container is delivered (deliverIce sets flags.ice_delivered), BEFORE the mission screen.
  // It is a story scene (no choices, no Skip, Esc does not close it); WorldScene shows the mission screen only after it is resolved. EXACT text, {name} = story/name.ts.
  { id: CAPTAIN_BEAT_ID, speaker: 'reyes', when: s => !!s.ep && s.ep.phase === 'done' && !!s.flags.ice_delivered,
    lines: [CAPTAIN_LINE] },
];

export const EP_EVENTS: EventDef[] = [
  { id: 'storm_call', title: 'The Storm Call', speaker: 'reyes',
    weight: () => 0, // triggered at the storm's arrival by episodeTick
    text: () => 'Reyes: "{name}! The dust front is here and the solar panels are about to get buried. Stow them and we lose solar power tonight. Leave them out and we keep some power, but we could lose a lot more."',
    choices: [
      { id: 'stow', label: 'Stow the panels', hint: 'Panels stay safe. No solar power until you put them back out.', effects: {},
        card: { benefit: 'The panels stay safe from the dust.', cost: 'No solar power tonight. The battery carries everything.', risk: 'The battery may run low before the storm ends.', meters: [{ meter: 'Power', dir: 'down' }] } },
      { id: 'out', label: 'Leave them out', hint: 'Some power during the storm. The dust can bury them.', effects: {},
        card: { benefit: 'Some solar power keeps coming in.', cost: 'Nothing right now.', risk: 'The dust can bury or damage the panels.', meters: [{ meter: 'Power', dir: 'up' }] } },
      { id: 'ask', label: 'Ask Earth', hint: 'The reply takes a long time to come back.', effects: {},
        card: { benefit: 'Earth hears your question.', cost: 'The clock keeps running.', risk: 'The reply takes minutes. Until then the panels stay out.' } },
      { id: 'wait', label: 'Time ran out', effects: {} },
    ],
    journal: { why: 'Solar panels make power only when sunlight reaches them. Dust storms block the Sun and can bury panels.', science: 'In 2018 a global dust storm blocked so much sunlight that NASA\'s solar-powered Opportunity rover could not recharge and went silent.', sourceId: 'mars-2018-global-dust-storm', learnId: 'mars_dust', realData: true } },
  { id: 'dish_decision', title: 'One fault, one fix', speaker: 'reyes',
    weight: () => 0, // raised by raiseDish() (core/dish.ts) right after the five-system check
    text: () => 'Reyes: "{name}, your check found a fault on the outdoor dish, and it knocked out our comms console too. We only have time to fix ONE before the storm. Which one?"',
    choices: [
      { id: 'comms', label: 'Repair the comms', hint: 'Stay inside. Earth contact stays good, but the water maker stays damaged, so water will be tight.', effects: {},
        card: { benefit: 'Earth can hear you and answer fast. You stay safely inside.', cost: 'You carry a spare part to the comms console and repair it by hand.', risk: 'The dish stays broken, the water maker stays damaged, and water gets tight.', meters: [{ meter: 'Water', dir: 'down' }] } },
      { id: 'dish', label: 'Repair the dish and water-maker link', hint: 'Go outside. Water production is restored, but comms stay unreliable: static and late replies.', effects: {},
        card: { benefit: 'The water maker works again, so water stays plentiful.', cost: 'You go outside and repair the dish by hand, using energy and a spare part.', risk: 'The Solar Alert keeps rising while you are out, and comms stay broken: static and late replies.', meters: [{ meter: 'Water', dir: 'up' }, { meter: 'Energy', dir: 'down' }] } },
    ],
    journal: { why: 'Real crews cannot fix everything at once. They rank problems by what keeps people safe longest.', science: 'Radio signals between Mars and Earth take 3 to 22 minutes one way, so a Mars crew must be able to decide for itself.', realData: false } },
  { id: 'water_shutdown', title: 'The water maker stopped', speaker: 'reyes',
    weight: () => 0, // raised by maybeFinish() (core/episode.ts) when the storm clean-up is done
    text: () => 'Reyes: "{name}, the water maker just shut down and the tank is not refilling. We need emergency water. The scanners show a CANDIDATE ice sheet outside the base. We have not confirmed it is ice, so go and see. Bring a container."',
    choices: [{ id: 'ok', label: 'I will find the ice', hint: 'Look for the marked area outside.', effects: {} }],
    journal: { why: 'Water is the most important supply on Mars. Crews plan for the day the water maker stops.', science: 'Orbiters have found places on Mars that may hold water ice under the dust. Scientists call them candidates until a mission confirms them.', realData: false } },
  { id: 'radiation_peak', title: 'Radiation peak tonight', speaker: 'sofia',
    // Step 27j: shown as a pop quiz. Every answer sets the same flag the old three-way choice set (water_wall / corner / nothing).
    popQuiz: {
      prompt: 'What can you do to get more radiation protection in an emergency?',
      options: [
        { text: 'Shelter in the most shielded spot and put water, food and supplies around you', choice: 'water_wall' },
        { text: 'Squeeze into a corner and do nothing else', choice: 'corner' },
        { text: 'Turn on every light in the base', choice: 'nothing' },
        { text: 'Open the airlock to let the radiation out', choice: 'nothing' },
      ],
      correct: 0,
      explanation: 'Real spacecraft have a shielded storm shelter, and crews use the water, food and supplies already on board as extra shielding, because water is very good at stopping radiation.',
      sourceUrl: 'https://www.nasa.gov/wp-content/uploads/2015/11/np-2014-03-001-jsc-orion_radiation_handout.pdf',
      sourceTitle: 'NASA Orion: radiation handout (storm shelter, water and supplies as shielding)',
      verified: true,
    },
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
