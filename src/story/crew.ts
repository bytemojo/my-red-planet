import type { CrewId, GameState } from '../core/types';

export const CREW: Record<CrewId, { name: string; role: string; blurb: string; lines: string[][] }> = {
  reyes: { name: 'Captain Elena Reyes', role: 'Commander', blurb: 'Calm, fair, always planning three Sols ahead.', lines: [
    ['Keep the four numbers up: air, water, food, power. Everything else can wait.', 'You are doing fine, Commander-in-training.'],
    ['Good work out there. The crew is getting stronger.', 'Plans are only useful if you check them against reality.'],
    ['Whatever is in that cave, we go in prepared.', 'You have earned this command.'],
  ] },
  aiko: { name: 'Aiko Tanaka', role: 'Botanist', blurb: 'Curious and optimistic. Talks to the plants.', lines: [
    ['Lettuce is quick. Potatoes are slow but filling. Which do you trust more?', 'Water the plants once a Sol, they remember!'],
    ['I think the beans like the bright lights. But the lights are hungry...', 'Every harvest teaches me something.'],
    ['Imagine a whole underground garden. I think about it every night.', 'Plants are my favourite crew.'],
  ] },
  david: { name: 'David Okafor', role: 'Engineer', blurb: 'Practical and funny. Fixes things with tape and jokes.', lines: [
    ['Dusty panels make less power. Wipe them, then wipe them again.', 'Never trust a battery you have not tested.'],
    ['More panels, more power. More power, more problems. Good problems.', 'The rover rattles. That is normal. Mostly.'],
    ['Pressure seals first, then jokes.', 'I built that airlock myself. It only squeaks a little.'],
  ] },
  sofia: { name: 'Dr. Sofia Silva', role: 'Geologist and doctor', blurb: 'Adventurous. Always looking at the horizon.', lines: [
    ['I can see Hadriacus Mons from my window. It is beautiful and very old.', 'Drink your water. Doctor\'s orders.'],
    ['Those pits in the ridge could be lava tubes. Could be, mind you.', 'Rocks tell stories if you let them.'],
    ['Radiation is the quiet danger. Underground, the rock is a shield.', 'I would go first, if you let me.'],
  ] },
};

// Returns a line for the crew member. Friendship grows once per Sol per person.
export function talkLine(s: GameState, id: CrewId): { line: string; gained: boolean } {
  const bucket = s.stage <= 2 ? 0 : s.stage <= 4 ? 1 : 2;
  const set = CREW[id].lines[bucket];
  const c = s.crew[id];
  const key = `tmp_talk_${id}`;
  const gained = !s.flags[key];
  if (gained) { c.friendship += 1; s.flags[key] = true; }
  c.met = true;
  return { line: set[c.friendship % set.length], gained };
}
