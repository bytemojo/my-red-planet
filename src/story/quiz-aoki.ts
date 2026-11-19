// Step 27f: the botanist's quiz (code id 'aiko', Aiko Tanaka; the V2 text calls her Dr Aoki). 25 questions, 5 per level.
// Topics: growing food in space, light, water, soil/regolith, nutrition, plus Mars basics. Every fact was read on the NASA page in its sourceUrl (checked 19 Nov 2026).
// The correct answer is listed FIRST in each row; core/quiz.ts buildAttempt shuffles options every attempt and re-points correctIndex. Level 5 = a calculation (shown in `explanation`).
import type { QuizQuestion } from '../core/types';

const S = {
  glance: ['https://www.jpl.nasa.gov/news/press_kits/insight/launch/facts/mars-at-a-glance', 'NASA JPL: Mars at a Glance'],
  veggie: ['https://www.nasa.gov/wp-content/uploads/2023/03/veggie-fact-sheet-508.pdf', 'NASA: Veggie Fact Sheet'],
  explore: ['https://www.nasa.gov/science-research/nasa-plant-researchers-explore-question-of-deep-space-food-crops/', 'NASA: Plant Researchers Explore Question of Deep-Space Food Crops'],
  chile: ['https://www.nasa.gov/missions/station/iss-research/chile-peppers-start-spicing-up-the-space-station/', 'NASA: Chile Peppers Start Spicing Up the Space Station'],
  radish: ['https://www.nasa.gov/missions/station/astronauts-harvest-radish-crop-on-international-space-station/', 'NASA: Astronauts Harvest Radish Crop on the Space Station'],
  farmer: ['https://www.nasa.gov/humans-in-space/so-you-want-to-be-a-space-farmer/', 'NASA: So You Want to Be a Space Farmer'],
  garden: ['https://spinoff.nasa.gov/Spinoff2018/cg_4.html', 'NASA Spinoff: The Martian Garden Recreates Red Planet\'s Surface'],
} as const;
type Src = keyof typeof S;

// [level, source, prompt, correct, wrong1, wrong2, wrong3, explanation]
const ROWS: [number, Src, string, string, string, string, string, string][] = [
  // ----- Level 1 (easy)
  [1, 'explore', 'Plants take a gas out of the air that people breathe out. Which gas is it?', 'Carbon dioxide', 'Helium', 'Neon', 'Methane', 'Plants could produce oxygen and remove carbon dioxide from the air, which is one reason to grow them in space.'],
  [1, 'explore', 'Which salad plant did astronauts on the space station harvest and eat from the Veggie garden?', 'Red romaine lettuce', 'Pumpkins', 'Bananas', 'Watermelon', 'Astronauts on the International Space Station ate red romaine lettuce grown in the Veggie system.'],
  [1, 'veggie', 'What is the name of the plant growth unit on the space station that grows lettuce?', 'Veggie', 'Salad Bar', 'Planter One', 'Green Box', 'Veggie, the Vegetable Production System, is a simple, low-power unit for growing fresh food for astronauts.'],
  [1, 'chile', 'What color does a chile pepper turn when it is ripe?', 'Red', 'Blue', 'Purple', 'White', 'Peppers can be eaten green but turn red when ripe.'],
  [1, 'glance', 'What do we call one day on Mars?', 'A sol', 'A moon', 'A mars-year', 'A dune', 'A Mars day is called a sol. It lasts 24 hours, 39 minutes, 35 seconds.'],
  // ----- Level 2
  [2, 'veggie', 'What is inside a Veggie "plant pillow" together with the seeds?', 'Clay growth media, slow-release fertilizer and water', 'Only sand', 'Real garden soil from Earth', 'Ice cubes', 'The pillows contain calcined clay growth media, controlled-release fertilizer and water.'],
  [2, 'veggie', 'How does water get to the roots in a Veggie pillow?', 'Passively, through wicks', 'Through a rain machine', 'By a swimming pool', 'By shaking the plant', 'Water is delivered passively through wicks, and roots need water and oxygen at the same time.'],
  [2, 'radish', 'How many days do radishes need to reach maturity in the Advanced Plant Habitat?', '27 days', '3 days', '90 days', '200 days', 'Radishes reach maturity in 27 days, so they are a speedy space crop.'],
  [2, 'radish', 'Which colors of LED light does the Advanced Plant Habitat use?', 'Red, blue, green and white', 'Only yellow', 'Only purple', 'No lights at all', 'The chamber uses red, blue, green and broad-spectrum white LED lights.'],
  [2, 'explore', 'Why grow food in space instead of just packing all of it?', 'You cannot pack everything for a long mission', 'Plants are cheaper than water', 'Packed food always tastes bad', 'Rockets cannot carry food', 'As the plant scientist says: you cannot pack everything you need for a long-duration spaceflight.'],
  // ----- Level 3
  [3, 'explore', 'Compared with Earth, how much sunlight does Mars receive?', '43 percent', '100 percent', '5 percent', '250 percent', 'Mars receives 43 percent of the sunlight Earth does.'],
  [3, 'farmer', 'Why is watering plants hard in microgravity?', 'Roots need enough water without drowning', 'Water turns to stone', 'Plants refuse to drink', 'There is no water in space', 'The challenge is giving roots enough water to stay healthy without drowning them.'],
  [3, 'explore', 'What is Martian soil like for a gardener?', 'Broken rock that lacks most nutrients', 'Rich black compost', 'Pure sugar', 'Soft wet mud', 'Martian soil is broken rock that lacks most nutrients, so plants need added nutrients.'],
  [3, 'explore', 'Why are potatoes a good crop for space?', 'They can make twice the food of some seed crops in the same light', 'They grow without any water', 'They glow in the dark', 'They do not need any light', 'Potatoes store food as tubers and can produce twice the amount of food as some seed crops given equal light.'],
  [3, 'chile', 'Chile peppers are packed with which vitamin, even more than some citrus fruits?', 'Vitamin C', 'Vitamin Z', 'Vitamin M', 'Vitamin Q', 'NASA says peppers are dense in nutrients and have more vitamin C than some citrus.'],
  // ----- Level 4
  [4, 'explore', 'Water found on Mars would be salty brine. Which kind of chemical must be dealt with before it is used for plants?', 'Perchlorates', 'Vitamins', 'Sugar', 'Chlorophyll', 'Martian water would be brine, and perchlorates and other impurities must be dealt with before use.'],
  [4, 'garden', 'Mars Mojave Simulant, a test soil for growing plants, is made from crushed what?', 'Basalt rock', 'Seashells', 'Coal', 'Chalk', 'It is made from crushed basalt from a quarry in the Mojave Desert.'],
  [4, 'garden', 'Mars has minerals but no organic compounds, and test soil is baked sterile. What must gardeners add?', 'Fertilizer', 'More heat', 'Salt', 'Nothing at all', 'Because the simulant is sterile, fertilizer is required.'],
  [4, 'explore', 'Dust storms can block sunlight on Mars. What did the plant scientist suggest as a backup?', 'Efficient, high-intensity LED lights', 'Giant candles', 'Mirrors made of paper', 'Waiting for the storm to leave', 'Dust storms can block sunlight, so high-intensity, efficient LED lights are an alternative.'],
  [4, 'explore', 'Potato researchers kept the nutrient water a very thin film. Why?', 'Potatoes do not tolerate standing water', 'Potatoes drink only a drop a year', 'Thin water glows', 'Thick water is too cold', 'Potatoes do not like to be submerged, so the nutrient water film was kept very thin.'],
  // ----- Level 5 (a calculation each)
  [5, 'radish', 'Radishes mature in 27 days. You replant right after each harvest. How many days for 3 harvests in a row?', '81 days', '54 days', '30 days', '108 days', '27 days x 3 harvests = 81 days.'],
  [5, 'explore', 'Mars gets 43 percent of Earth\'s sunlight. A bed gets 500 units of light on Earth. About how much would it get from Martian sunlight?', 'About 215 units', 'About 500 units', 'About 43 units', 'About 1,163 units', '500 x 0.43 = 215 units.'],
  [5, 'veggie', 'A Veggie set has 6 pillows and each pillow gets 2 or 3 seeds. What is the MOST seeds in one set?', '18 seeds', '12 seeds', '9 seeds', '36 seeds', '6 pillows x 3 seeds = 18 seeds at most (6 x 2 = 12 at least).'],
  [5, 'farmer', 'The pepper experiment lasted 137 days, the longest plant experiment in space so far. A Mars year is 687 Earth days. How many whole 137-day experiments fit in one Mars year?', '5', '4', '6', '7', '687 / 137 = 5.01, so 5 whole experiments fit.'],
  [5, 'veggie', 'Veggie uses about 70 watts. How much energy does it use in 10 hours?', '700 watt-hours', '70 watt-hours', '7 watt-hours', '7,000 watt-hours', '70 W x 10 h = 700 Wh (0.7 kWh).'],
];

export const AOKI_QUIZ: QuizQuestion[] = ROWS.map(([level, src, prompt, ok, a, b, c, explanation], n) => {
  const options = [ok, a, b, c], at = n % 4;
  [options[0], options[at]] = [options[at], options[0]];
  return { id: `aiko-${level}-${(n % 5) + 1}`, crew: 'aiko', level, prompt, options, correctIndex: at, sourceUrl: S[src][0], sourceTitle: S[src][1], verified: true, explanation };
});
