// Step 27h: the medic's quiz (Dr. Sofia Silva, "Geologist and doctor", code id 'sofia'). 25 questions, 5 per level.
// Topics: astronaut health, radiation, bone and muscle loss, sleep, nutrition and exercise in space, plus Mars geology. Every fact was read on the NASA page in its sourceUrl (checked 19 Nov 2026).
// Radiation questions are deliberately qualitative: the NASA "Radiation Challenge" PDF contradicts itself on dose numbers, so no dose figures are used.
// The correct answer is listed FIRST in each row; core/quiz.ts buildAttempt shuffles options every attempt and re-points correctIndex. Level 5 = a calculation (shown in `explanation`).
import type { QuizQuestion } from '../core/types';

const S = {
  bone: ['https://www.nasa.gov/missions/station/iss-research/counteracting-bone-and-muscle-loss-in-microgravity/', 'NASA: Counteracting Bone and Muscle Loss in Microgravity'],
  sleep: ['https://www.nasa.gov/missions/station/seven-ways-astronauts-improve-sleep-may-help-you-snooze-better-on-earth/', 'NASA: Seven Ways Astronauts Improve Sleep'],
  twins: ['https://www.nasa.gov/news-release/nasas-landmark-twins-study-reveals-resilience-of-human-body-in-space/', 'NASA: Landmark Twins Study Reveals Resilience of Human Body in Space'],
  nutri: ['https://www.nasa.gov/wp-content/uploads/2024/10/2024-space-nutrition-2nd-edition-2024.pdf', 'NASA: Space Nutrition (2nd edition)'],
  care: ['https://www.nasa.gov/missions/station/faq-the-real-story-about-astronaut-health-care-in-space/', 'NASA: The Real Story About Astronaut Health Care in Space'],
  valles: ['https://www.nasa.gov/image-article/valles-marineris-grand-canyon-of-mars/', 'NASA: Valles Marineris, the Grand Canyon of Mars'],
  rad: ['https://www.nasa.gov/wp-content/uploads/2017/04/radiationchallenge.pdf', 'NASA: Space Faring, The Radiation Challenge'],
} as const;
type Src = keyof typeof S;

// [level, source, prompt, correct, wrong1, wrong2, wrong3, explanation]
const ROWS: [number, Src, string, string, string, string, string, string][] = [
  // ----- Level 1 (easy)
  [1, 'bone', 'Why do astronauts exercise every day in space?', 'To keep their muscles and bones strong', 'Only to stay warm', 'To make the station spin', 'Because it is a rule about snacks', 'In microgravity muscles and bones do less work and weaken, so crews exercise about two hours a day.'],
  [1, 'nutri', 'Space windows block the rays we need to make a vitamin in our skin. Which vitamin do astronauts take as a supplement?', 'Vitamin D', 'Vitamin Z', 'Vitamin M', 'Vitamin X', 'Astronauts cannot make vitamin D from sunlight in flight, so they take supplements.'],
  [1, 'care', 'Which doctors watch over the crew\'s health from the ground?', 'Flight surgeons', 'Ship captains', 'Rock doctors', 'Weather doctors', 'NASA assigns flight surgeons, physicians trained in space medicine, to each crew.'],
  [1, 'valles', 'Which giant canyon on Mars is called "the Grand Canyon of Mars"?', 'Valles Marineris', 'Olympus Canyon', 'Gale Gorge', 'Phobos Pass', 'Valles Marineris stretches about 3,870 km across Mars.'],
  [1, 'rad', 'On Earth, which two things shield us from most space radiation?', 'The atmosphere and the magnetic field', 'The clouds and the oceans', 'The Moon and the Sun', 'Mountains and forests', 'Earth\'s atmosphere and magnetic field protect us. Mars lacks both in the same strength.'],
  // ----- Level 2
  [2, 'bone', 'Which space station machine lets astronauts mimic weightlifting?', 'ARED', 'MOXIE', 'Veggie', 'Ingenuity', 'The Advanced Resistive Exercise Device (ARED) mimics weightlifting in microgravity.'],
  [2, 'sleep', 'The space station orbits Earth every 90 minutes. How many sunrises do the crew see each day?', '16', '1', '4', '90', 'The crew see 16 sunrises each day, which makes sleeping tricky.'],
  [2, 'nutri', 'Astronauts and cosmonauts can choose from how many food items?', 'More than 300', 'Only 5', 'About 20', 'Exactly 100,000', 'The menu has more than 300 items, including Canadian, European, Japanese and Russian foods.'],
  [2, 'nutri', 'Why is eating extra calcium alone not enough to protect astronaut bones?', 'Their bodies absorb less calcium in space, so they also need exercise', 'Calcium is poisonous in space', 'Bones cannot use calcium', 'Calcium turns into ice', 'Astronauts absorb less calcium in space, so exercise is needed too.'],
  [2, 'twins', 'In NASA\'s Twins Study, how long did astronaut Scott Kelly stay in space?', '340 days', '3 days', '34 days', '3,400 days', 'He spent 340 days on the station while his twin Mark stayed on Earth for comparison.'],
  // ----- Level 3
  [3, 'bone', 'Without precautions, how much denser or less dense do weight-bearing bones get each month in space?', 'Roughly 1% less dense', 'Roughly 50% less dense', 'Exactly the same', 'Roughly 1% denser', 'Weight-bearing bones can become roughly 1% less dense if astronauts do not take precautions.'],
  [3, 'bone', 'Why do bones get weaker in microgravity?', 'Bone-building cells slow down while bone-breakdown cells keep working', 'Bones turn into jelly', 'Bones stop being made of calcium', 'The cold shrinks bones', 'Without gravity\'s load, breakdown outpaces growth, producing weaker, more brittle bones.'],
  [3, 'twins', 'What happened to Scott Kelly\'s telomeres (the caps on chromosomes) in space?', 'They were longer in space, then returned to normal after about six months', 'They disappeared forever', 'They did not change at all', 'They turned blue', 'They were unexpectedly longer in space, and averaged back to normal about six months after his return.'],
  [3, 'rad', 'NASA says the effects of space radiation are "cumulative". What does that mean?', 'Exposure adds up over time', 'It only matters on Tuesdays', 'It disappears each night', 'It only affects robots', 'Because the effects are cumulative, radiation exposure builds up over time.'],
  [3, 'sleep', 'How can astronauts use the new lights on the space station to help sleep or alertness?', 'They adjust the color and brightness of the light', 'They switch to candles', 'They cover every window with paper', 'They turn off gravity', 'The new solid-state lights let crew adjust the color spectrum and intensity to promote alertness or sleep.'],
  // ----- Level 4
  [4, 'nutri', 'About 45 minutes before landing, astronauts drink a liter of salty water. Why?', 'To help prevent fainting after landing', 'To clean the spacecraft', 'To wash their hair', 'To make the landing softer', 'The salty water helps prevent fainting when gravity returns.'],
  [4, 'rad', 'About 85% of galactic cosmic radiation is made of which particle?', 'Protons', 'Pebbles', 'Water drops', 'Feathers', 'Galactic cosmic radiation is about 85% protons, 14% helium and about 1% heavy ions.'],
  [4, 'rad', 'What does NASA say deep-space missions need to hide from solar storms?', 'Specially designed storm shelters', 'Extra windows', 'More sleeping bags', 'Bigger antennas only', 'Deep-space missions need specially designed storm shelters and space-weather warnings so crews can take cover.'],
  [4, 'twins', 'In the Twins Study, how did the flu vaccine given to Scott in space work?', 'As it does on Earth', 'It did not work at all', 'It made him glow', 'It worked twice as fast and stayed forever', 'His immune response was appropriate in space; the vaccine worked as it does on Earth.'],
  [4, 'valles', 'What is the leading idea for how Valles Marineris began?', 'A crack that started billions of years ago as the planet cooled', 'A giant river carved it last year', 'A meteor made it in one day', 'Martians dug it', 'Its origin is unknown, but a leading hypothesis is a crack that formed as Mars cooled.'],
  // ----- Level 5 (a calculation each)
  [5, 'bone', 'Bones can lose roughly 1% of their density each month without precautions. About how much in a 6-month stay?', 'About 6 percent', 'About 1 percent', 'About 12 percent', 'About 60 percent', '1% x 6 months = 6%.'],
  [5, 'sleep', 'The station orbits every 90 minutes. How many orbits (and sunrises) fit in 24 hours?', '16', '24', '8', '90', '24 h x 60 = 1,440 minutes, and 1,440 / 90 = 16.'],
  [5, 'twins', 'Scott Kelly spent 340 days in space. How many days short of a full 365-day year is that?', '25 days', '35 days', '15 days', '105 days', '365 - 340 = 25 days.'],
  [5, 'valles', 'Valles Marineris is about 9.3 km deep at its deepest. The Grand Canyon is about 1.8 km deep. About how many times deeper is Valles Marineris?', 'About 5 times', 'About 2 times', 'About 10 times', 'About 50 times', '9.3 / 1.8 = 5.2, so about 5 times deeper.'],
  [5, 'nutri', 'A child aged 9 to 13 needs 1,300 mg of calcium a day. How much is that over 7 days?', '9,100 mg', '1,307 mg', '910 mg', '13,000 mg', '1,300 mg x 7 days = 9,100 mg.'],
];

export const SOFIA_QUIZ: QuizQuestion[] = ROWS.map(([level, src, prompt, ok, a, b, c, explanation], n) => {
  const options = [ok, a, b, c], at = n % 4;
  [options[0], options[at]] = [options[at], options[0]];
  return { id: `sofia-${level}-${(n % 5) + 1}`, crew: 'sofia', level, prompt, options, correctIndex: at, sourceUrl: S[src][0], sourceTitle: S[src][1], verified: true, explanation };
});
