// Step 10b: the botanist's optional conversations (gentle plant and food science).
// Pure story + rules: no Phaser, no DOM. Hearts reuse CrewState.friendship (Step 10a), so there is no second system.
// The botanist is Aiko Tanaka in the code and the crew list; the menu text calls her "Dr Aoki" (owner decision pending, see STATE.md).
import { BOTANIST, MAX_HEARTS, heartsOf, nextCropUnlock, syncCropUnlocks } from '../core/crewlife';
import type { CropId, GameState } from '../core/types';

export interface AokiTopic {
  id: string; title: string; prompt: string;
  choices: [string, string]; replies: [string, string];
  fact: string;
}

/** Six optional topics. Each can be finished once (and then re-read). All facts are general plant and food science. */
export const AOKI_TOPICS: readonly AokiTopic[] = [
  { id: 'light', title: 'Why the pink grow lights?',
    prompt: 'Have you noticed the pink-violet strips over every bed? Why do you think they are not plain white?',
    choices: ['Plants like certain colours?', 'They just look pretty?'],
    replies: ['Exactly! Leaves use red and blue light the most for photosynthesis, so LEDs can give them just those colours and waste less power.', 'They do look pretty, but there is a reason. Red and blue light feed photosynthesis best, so we spend our power on the colours the plants actually use.'],
    fact: 'Photosynthesis uses light energy to turn water and carbon dioxide into sugar and oxygen.' },
  { id: 'soil', title: 'Is Mars dirt real soil?',
    prompt: 'Our beds hold dark regolith. Do you think Mars dirt is already good soil?',
    choices: ['Probably not yet?', 'Yes, plants grow in dirt!'],
    replies: ['Right. Regolith is crushed rock with almost no living matter in it. Real soil is full of tiny organisms and rotted plant material, so we have to build it up.', 'Good guess, but not quite. Regolith is crushed rock without the living part of soil. Some Mars samples also contain perchlorate salts, which would need washing out first.'],
    fact: 'The Phoenix lander found perchlorate salts in the Martian ground it sampled.' },
  { id: 'water', title: 'Where does the water go?',
    prompt: 'When I water a bed, where does most of that water end up?',
    choices: ['Inside the plant?', 'Back into the air?'],
    replies: ['A little stays in the plant, but most does not. Plants pull water up through the roots and release most of it as vapour through their leaves.', 'Yes! That is called transpiration. Plants breathe water vapour out through tiny leaf pores, and a station can catch that humid air and recycle it.'],
    fact: 'Plants release most of the water they take up as vapour through tiny pores in their leaves (transpiration).' },
  { id: 'roots', title: 'Why potatoes grow underground',
    prompt: 'A potato is not a root, and it is not a fruit. Any idea what it is?',
    choices: ['A food store?', 'A kind of seed?'],
    replies: ['Yes! The plant packs spare starch into swollen underground stems called tubers, saving energy for later. We eat that saved energy.', 'Close! A tuber can sprout a new plant, but it is really a swollen stem full of starch. The plant stores energy there, and we borrow it.'],
    fact: 'A potato is a tuber: an underground stem that stores starch.' },
  { id: 'beans', title: 'Beans and their tiny helpers',
    prompt: 'Beans have little lumps on their roots. Do you know who lives in them?',
    choices: ['Helpful bacteria?', 'Tiny worms?'],
    replies: ['Yes! Certain bacteria live in root nodules and turn nitrogen from the air into a form the plant can use. Nitrogen is a plant vitamin, basically.', 'Not worms, bacteria! The nodules are little homes for microbes that turn nitrogen gas into plant food. Beans trade them sugar for it.'],
    fact: 'Bean roots host bacteria that turn nitrogen from the air into a form plants can use.' },
  { id: 'fresh', title: 'Why grow food at all?',
    prompt: 'We have packed NASA meals. Why do you think fresh vegetables still matter on a long mission?',
    choices: ['Fresh food tastes better?', 'Packed food can lose nutrients?'],
    replies: ['It does, and tastes and smells lift morale a lot! Fresh crops can also top up nutrients that fade in stored food over a long trip.', 'Good thinking. Some vitamins in packaged food can slowly fade over a long mission, and fresh crops add colour, crunch and smell to the day. Both help the crew.'],
    fact: 'Space agencies study growing fresh crops because stored food can lose some nutrients over long missions.' },
];

export const AOKI_ENERGY_NOTE = 'A topic costs 3 energy.';
const doneKey = (id: string) => `aoki_topic_${id}`;
const HEART_TODAY = 'tmp_aoki_heart';                                   // tmp_: cleared every Sol (one heart-earning topic per Sol)

export const aokiTopic = (id: string): AokiTopic | undefined => AOKI_TOPICS.find(t => t.id === id);
/** The choice (0/1) the player made in a finished topic, or null. */
export function aokiChoice(s: Pick<GameState, 'flags'>, id: string): 0 | 1 | null {
  const v = Number(s.flags[doneKey(id)] || 0);
  return v === 1 ? 0 : v === 2 ? 1 : null;
}
export const aokiTopicsDone = (s: Pick<GameState, 'flags'>): number => AOKI_TOPICS.filter(t => aokiChoice(s, t.id) !== null).length;
export const aokiHeartEarnedToday = (s: Pick<GameState, 'flags'>): boolean => !!s.flags[HEART_TODAY];

export interface AokiResult { ok: boolean; msg: string; heart: boolean; unlocked: CropId[] }

/**
 * Finish one topic with the player's choice. A topic gives its heart only the first time AND only for the first
 * heart-earning topic of the Sol, so 5 hearts (wheat) takes several Sols of real effort, on top of the daily chat.
 * Energy is charged by the caller (act 'aoki_talk' in sim.ts), never here.
 */
export function aokiTalk(s: GameState, topicId: string, choice: 0 | 1): AokiResult {
  const t = aokiTopic(topicId);
  if (!t) return { ok: false, msg: 'Pick one of the topics.', heart: false, unlocked: [] };
  if (aokiChoice(s, topicId) !== null) return { ok: false, msg: 'You already talked about this one. Read it again any time.', heart: false, unlocked: [] };
  s.flags[doneKey(topicId)] = choice + 1;
  const c = s.crew[BOTANIST];
  c.met = true;
  const heart = !s.flags[HEART_TODAY] && heartsOf(s, BOTANIST) < MAX_HEARTS;
  if (heart) { c.friendship += 1; s.flags[HEART_TODAY] = true; }
  const unlocked = heart ? syncCropUnlocks(s) : [];
  return { ok: true, msg: t.replies[choice], heart, unlocked };
}

/** One line for the menu: what the next crop needs. null when every crop is open. */
export function aokiHint(s: GameState): string | null {
  const n = nextCropUnlock(s);
  if (!n) return null;
  const left = n.hearts - heartsOf(s, BOTANIST);
  return left > 0 ? `Next seeds open at ${n.hearts} hearts (${left} more).` : null;
}

/** Bonus star "Unlock all crops": only true at 5 hearts with the botanist AND every crop open (Step 12 reads this). */
export const allCropsUnlocked = (s: GameState): boolean => heartsOf(s, BOTANIST) >= MAX_HEARTS && nextCropUnlock(s) === null;
