import type { Beat, GameState } from '../core/types';
import { caveTotal, flagNum, hasBuilding } from '../core/util';

const seen = (s: GameState, id: string) => s.seenBeats.includes(id);

// SCRIPTED STORY BEATS. First match in this array fires. Add new beats here; keep `when` cheap and pure.
export const BEATS: Beat[] = [
  { id: 'intro', speaker: 'reyes', when: s => s.sol === 1,
    lines: ["I'm sure you remember our mission, rookie: to explore the Martian lava tubes near Hadriacus Mons, in Hellas Planitia.",
      'Orbiters have spotted three candidate caves there. Nobody has been inside to confirm them. That is what we came to find out.',
      "But now, rookie... you're the only one who is not sick.",
      'The whole crew is quarantined with the flu. Earth is more than 33 million miles away, and help is not coming soon.',
      'The mission\'s success depends on you.',
      'Start by checking the farm, the air and water, comms and solar power. The solar farm is outside, so use the airlock and watch your suit air.'],
    effects: { flag: { intro_done: true }, friend: { crew: 'reyes', n: 1 } } },
  { id: 'aiko_seeds', speaker: 'aiko', when: s => seen(s, 'intro') && s.sol >= 2,
    lines: ['Hi from the sick bay window! Take my seed packets. Pick one to plant first.'],
    choices: [
      { id: 'lettuce', label: 'Lettuce: ready in 2 Sols', hint: 'Quick, but a small meal.', effects: { flag: { first_crop: 'lettuce' }, friend: { crew: 'aiko', n: 1 } } },
      { id: 'potato', label: 'Potatoes: ready in 4 Sols', hint: 'Slow, but very filling.', effects: { flag: { first_crop: 'potato' }, friend: { crew: 'aiko', n: 1 } } },
    ] },
  { id: 'david_panels', speaker: 'david', when: s => seen(s, 'aiko_seeds') && s.sol >= 3,
    lines: ['Panel check! Dust piles up on them and they make less power. Want me to show you the wiping trick?'],
    choices: [
      { id: 'teach', label: 'Yes, show me', hint: 'David is pleased.', effects: { flag: { knows_cleaning: true }, friend: { crew: 'david', n: 2 } } },
      { id: 'own', label: 'I will figure it out', hint: 'Bold. Maybe a little dusty.', effects: { flag: { knows_cleaning: false }, energy: 5 } },
    ] },
  { id: 'earth_call', speaker: 'reyes', when: s => seen(s, 'david_panels') && s.sol >= 4,
    lines: ['Mission Control wants an update. Remember: a message takes 3 to 22 minutes to reach Earth, and the same to come back.',
      'So we cannot ask for help every time. Decide, then report.'],
    choices: [
      { id: 'short', label: 'Send a short report', hint: 'Quick and cheap.', effects: { flag: { reported: 'short' } } },
      { id: 'full', label: 'Send a full report', hint: 'Uses a little power.', effects: { flag: { reported: 'full' }, res: { power: -2 }, friend: { crew: 'reyes', n: 1 } } },
    ] },
  { id: 'reyes_risk_talk', speaker: 'reyes', when: s => flagNum(s, 'risky') >= 2,
    lines: ['I noticed you took extra risks outside lately. Radiation adds up, you know.', 'How do you feel about that?'],
    choices: [
      { id: 'careful', label: 'I will be more careful', effects: { friend: { crew: 'reyes', n: 2 }, addFlag: { risky: -2 } } },
      { id: 'worth', label: 'It was worth it', hint: 'Captain Reyes frowns, but respects honesty.', effects: { flag: { reyes_worried: true } } },
    ] },
  { id: 'aiko_secret_seed', speaker: 'aiko', when: s => s.crew.aiko.friendship >= 5,
    lines: ['You have been so kind to me. I saved these tomato seeds for a special day. Today is that day.'],
    choices: [{ id: 'thanks', label: 'Thank you, Aiko!', effects: { flag: { tomato_unlocked: true }, friend: { crew: 'aiko', n: 1 } } }] },
  { id: 'quarantine_over', speaker: 'reyes', when: s => s.stage >= 3,
    lines: ['Good news! The flu has passed. The crew is out of quarantine.', 'You ran this place alone. We will not forget that.'],
    effects: { flag: { quarantine_over: true }, friend: { crew: 'reyes', n: 1 } } },
  { id: 'rover_ready', speaker: 'david', when: s => hasBuilding(s, 'rover_bay'),
    lines: ['The rover is fixed! It rattles. That is normal. Mostly.', 'Rover trips cost energy and power. Strong wind makes them harder.'],
    effects: { friend: { crew: 'david', n: 1 } } },
  { id: 'cave_found', speaker: 'sofia', when: s => s.stage >= 5,
    lines: ['Everything points to one of the pits being a real lava tube. A candidate, anyway.', 'We can explore it, dig it out, pressurize it, and shield it. Each step costs.'],
    effects: { flag: { cave_unlocked: true }, friend: { crew: 'sofia', n: 1 } } },
  { id: 'cavern_opened', speaker: 'sofia', when: s => caveTotal(s) >= 8 && s.cave.explore > 0 && s.cave.excavate > 0 && s.cave.pressurize > 0 && s.cave.shield > 0,
    lines: ['The tube opens into a huge cavern! Look, ice in the walls. Water!', 'Shielded by rock, with water at hand. This could be home.'],
    effects: { flag: { cavern_water: true }, friend: { crew: 'sofia', n: 2 } } },
  { id: 'campaign_complete', speaker: 'reyes', when: s => s.campaignComplete,
    lines: ['Ten Sols without help from Earth. You did it, Commander.', 'The mission is complete. But the colony is yours. Keep building.'],
    effects: { flag: { sandbox: true } } },
];
