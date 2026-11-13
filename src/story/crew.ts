import type { CrewId, GameState } from '../core/types';

export interface CrewChat { prompt: string; choices: [string, string]; replies: [string, string]; fact?: string; learnId?: 'space_crops' | 'mars_dust' | 'mars_caves' | 'mars_resources' }

export const CREW: Record<CrewId, { name: string; role: string; blurb: string; avatar: string; lines: string[][]; chat: CrewChat }> = {
  reyes: { name: 'Captain Elena Reyes', role: 'Commander', blurb: 'Calm, fair, always planning three Sols ahead.', lines: [
    ['Keep the four numbers up: air, water, food, power. Everything else can wait.', 'You are doing fine, Commander-in-training.'],
    ['Good work out there. The crew is getting stronger.', 'Plans are only useful if you check them against reality.'],
    ['Whatever is in that cave, we go in prepared.', 'You have earned this command.'],
  ], avatar: '🧭', chat: { prompt: 'Quick question: what do you think I miss most about Earth?', choices: ['The ocean?', 'A noisy family dinner?'], replies: ['The ocean is close. I grew up in coastal Virginia, where the horizon was blue instead of red. I still keep a tiny photo of it in my flight book.', 'Exactly. My family dinners in Norfolk were loud, kind, and impossible to schedule. That is why I make time to check in with every person here.'] } },
  aiko: { name: 'Aiko Tanaka', role: 'Botanist', blurb: 'Curious and optimistic. Talks to the plants.', lines: [
    ['Lettuce is quick. Potatoes are slow but filling. Which do you trust more?', 'Water the plants once a Sol, they remember!'],
    ['I think the beans like the bright lights. But the lights are hungry...', 'Every harvest teaches me something.'],
    ['Imagine a whole underground garden. I think about it every night.', 'Plants are my favourite crew.'],
  ], avatar: '🌿', chat: { prompt: 'Which Earth snack do you think I packed a drawing of?', choices: ['Onigiri rice balls?', 'Chocolate cake?'], replies: ['Yes! My grandmother and I made onigiri before school in Sapporo. On Mars, I draw little rice triangles beside every crop plan.', 'Chocolate cake is tempting, but it is onigiri. The shape makes me smile—and it reminds me that food is also a memory.'], fact: 'Fun fact: space gardens need light, water, air, and patient checking—just like ours.', learnId: 'space_crops' } },
  david: { name: 'David Okafor', role: 'Engineer', blurb: 'Practical and funny. Fixes things with tape and jokes.', lines: [
    ['Dusty panels make less power. Wipe them, then wipe them again.', 'Never trust a battery you have not tested.'],
    ['More panels, more power. More power, more problems. Good problems.', 'The rover rattles. That is normal. Mostly.'],
    ['Pressure seals first, then jokes.', 'I built that airlock myself. It only squeaks a little.'],
  ], avatar: '🔧', chat: { prompt: 'Do you know which food I miss most from Earth?', choices: ['I do not know.', 'Maybe spinach?'], replies: ['Jollof rice from Nigeria. No one makes it like my mum. One day I will build a cooker that can do it justice on Mars.', 'Ha! Spinach is useful, but the answer is jollof rice from Nigeria. My mum makes it with enough joy to power a small rover.'], fact: 'Engineer fun fact: dust on solar panels blocks sunlight, so cleaning them can bring power back.', learnId: 'mars_dust' } },
  sofia: { name: 'Dr. Sofia Silva', role: 'Geologist and doctor', blurb: 'Adventurous. Always looking at the horizon.', lines: [
    ['I can see Hadriacus Mons from my window. It is beautiful and very old.', 'Drink your water. Doctor\'s orders.'],
    ['Those pits in the ridge could be lava tubes. Could be, mind you.', 'Rocks tell stories if you let them.'],
    ['Radiation is the quiet danger. Underground, the rock is a shield.', 'I would go first, if you let me.'],
  ], avatar: '🪨', chat: { prompt: 'What did I collect before I collected Mars rocks?', choices: ['Sea glass?', 'Comet pieces?'], replies: ['Sea glass, on the coast near Lisbon. Every smooth piece was ordinary glass with an extraordinary journey—rather like a good rock sample.', 'Comet pieces would be exciting! But it was sea glass near Lisbon. It taught me to look slowly, which is useful when rocks keep secrets.'], fact: 'Rock above a candidate cave may help shield a future habitat from radiation and harsh temperatures.', learnId: 'mars_caves' } },
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
