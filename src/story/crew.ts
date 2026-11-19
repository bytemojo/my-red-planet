import type { CrewId, CropId, GameState } from '../core/types';
import { syncCropUnlocks } from '../core/crewlife';

export interface CrewChat { prompt: string; choices: [string, string]; replies: [string, string]; fact?: string; learnId?: 'space_crops' | 'mars_dust' | 'mars_caves' | 'mars_resources' }

export const CREW: Record<CrewId, { name: string; role: string; blurb: string; avatar: string; lines: string[][]; chat: CrewChat }> = {
  reyes: { name: 'Captain Elena Reyes', role: 'Commander', blurb: 'Calm, fair, always planning three Sols ahead.', lines: [
    ['Four numbers keep us alive: air, water, food, power. Watch those and I sleep fine.', 'Not bad at all, Commander-in-training. Do not tell the others I said so.'],
    ['Nice work out there. The crew is standing a little taller lately.', 'A plan is just a guess in a nice outfit. Check it against what is real.'],
    ['Whatever is in that cave, we walk in ready. Snacks included.', 'Look at that. You earned this chair.'],
  ], avatar: '🧭', chat: { prompt: 'Quick one: what do you think I miss most about Earth?', choices: ['The ocean?', 'A noisy family dinner?'], replies: ['Close! The ocean. I grew up on the Virginia coast, where the horizon was blue, not red. I keep a tiny photo of it in my flight book.', 'Yes! Family dinners in Norfolk: loud, warm and impossible to schedule. That is why I check in on every one of you.'] } },
  aiko: { name: 'Aiko Tanaka', role: 'Botanist', blurb: 'Curious and optimistic. Talks to the plants.', lines: [
    ['Lettuce is the speedy one. Potatoes take their sweet time, but wow, so filling. Team lettuce or team potato?', 'Water the plants once a Sol. They notice when you forget, I swear!'],
    ['I think the beans love those bright lights. The lights are very hungry for power though!', 'Every harvest teaches me something new. Today: beans are showoffs.'],
    ['Picture a whole garden under the ground. I daydream about it every night!', 'Okay, do not tell the humans, but plants are my favourite crew.'],
  ], avatar: '🌿', chat: { prompt: 'Guess which Earth snack I packed a drawing of!', choices: ['Onigiri rice balls?', 'Chocolate cake?'], replies: ['Yes! Onigiri! My grandmother and I made them before school in Sapporo. Now I doodle little rice triangles next to every crop plan.', 'Cake sounds great, but it is onigiri! Those little triangles make me smile. Food is a memory you can eat.'], fact: 'Fun fact: space gardens need light, water, air and lots of patient checking, just like ours.', learnId: 'space_crops' } },
  david: { name: 'David Okafor', role: 'Engineer', blurb: 'Practical and funny. Fixes things with tape and jokes.', lines: [
    ['Dusty panels make less power. Wipe them, then wipe them again. Mars never runs out of dust.', 'Never trust a battery you have not tested. They love to bluff.'],
    ['More panels, more power. More power, more problems. The good kind, mostly.', 'The rover rattles. Totally normal. Probably. Okay, I will check it.'],
    ['Seals first, jokes second. Well, jokes while sealing, if I am honest.', 'I built that airlock myself. It squeaks a little. Think of it as saying hello.'],
  ], avatar: '🔧', chat: { prompt: 'Can you guess which food I miss most from Earth?', choices: ['I do not know.', 'Maybe spinach?'], replies: ['Jollof rice from Nigeria! Nobody makes it like my mum. One day I will build a cooker that does it justice on Mars.', 'Ha! Spinach, bold guess. Nope: jollof rice from Nigeria. My mum puts in enough joy to power a small rover.'], fact: 'Engineer fun fact: dust on solar panels blocks sunlight, so cleaning them can bring power back.', learnId: 'mars_dust' } },
  sofia: { name: 'Dr. Sofia Silva', role: 'Geologist and doctor', blurb: 'Adventurous. Always looking at the horizon.', lines: [
    ['From my window I can see Hadriacus Mons. Huge, old and gorgeous. Best view in the solar system.', 'Drink your water. Doctor\'s orders, and I am very bossy about it.'],
    ['Those pits in the ridge could be lava tubes. Could be! I am excited, not certain.', 'Rocks tell stories if you hold still and listen.'],
    ['Radiation is the sneaky danger. Underground, the rock works like a giant blanket of armour.', 'I would go in first, you know. Just say the word.'],
  ], avatar: '🪨', chat: { prompt: 'What do you think I collected before I collected Mars rocks?', choices: ['Sea glass?', 'Comet pieces?'], replies: ['Sea glass! On the coast near Lisbon. Every smooth piece was plain old glass with a wild journey behind it. Just like a good rock sample.', 'Comet pieces, wow, I wish! Nope, sea glass near Lisbon. It taught me to look slowly, which helps when rocks keep secrets.'], fact: 'Rock above a candidate cave may help shield a future habitat from radiation and harsh temperatures.', learnId: 'mars_caves' } },
};

// Returns a line for the crew member. Friendship grows once per Sol per person.
// Step 24e: a hungry crew member will not chat. One short in-character line, plus a hint about the meal hatch.
export const HUNGRY_REFUSAL: Record<CrewId, string> = {
  reyes: 'Not now. A commander thinks better with a full stomach. Feed us first?',
  aiko: 'Sorry, I cannot think about plants when I am this hungry. Meal first?',
  david: 'Not now, my stomach is louder than you. Feed us first?',
  sofia: 'Doctor\'s orders: nobody talks on an empty stomach. Please serve a meal.',
};
export const HUNGRY_HINT = 'Serve a meal at the quarantine hatch, then try again. No energy was used.';
export const hungryRefusal = (id: CrewId) => `${HUNGRY_REFUSAL[id]} ${HUNGRY_HINT}`;
export function talkLine(s: GameState, id: CrewId): { line: string; gained: boolean; unlocked: CropId[] } {
  const bucket = s.stage <= 2 ? 0 : s.stage <= 4 ? 1 : 2;
  const set = CREW[id].lines[bucket];
  const c = s.crew[id];
  const key = `tmp_talk_${id}`;
  const gained = !s.flags[key];
  if (gained) { c.friendship += 1; s.flags[key] = true; }
  c.met = true;
  const unlocked = gained ? syncCropUnlocks(s) : [];                  // Step 10a: hearts with the botanist open crops
  return { line: set[c.friendship % set.length], gained, unlocked };
}
