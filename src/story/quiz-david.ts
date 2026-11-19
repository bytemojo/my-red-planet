// Step 27g: the engineer's quiz (David Okafor, code id 'david'). 25 questions, 5 per level.
// Topics: life support, power, solar panels, dust, rovers, communications, plus Mars trivia. Every fact was read on the NASA page in its sourceUrl (checked 19 Nov 2026).
// The correct answer is listed FIRST in each row; core/quiz.ts buildAttempt shuffles options every attempt and re-points correctIndex. Level 5 = a calculation (shown in `explanation`).
import type { QuizQuestion } from '../core/types';

const S = {
  moxie: ['https://www.jpl.nasa.gov/news/nasas-perseverance-mars-rover-extracts-first-oxygen-from-red-planet/', 'NASA JPL: Perseverance Extracts First Oxygen from the Red Planet'],
  eclss: ['https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/', 'NASA: Environmental Control and Life Support Systems (ECLSS)'],
  storm: ['https://www.jpl.nasa.gov/news/opportunity-hunkers-down-during-dust-storm/', 'NASA JPL: Opportunity Hunkers Down During Dust Storm'],
  power: ['https://www.jpl.nasa.gov/news/press_kits/mars_2020/landing/mission/spacecraft/power/', 'NASA JPL: Mars 2020 Perseverance Power'],
  insight: ['https://www.nasa.gov/missions/insight/for-insight-dust-cleanings-will-yield-new-science/', 'NASA: For InSight, Dust Cleanings Will Yield New Science'],
  relay: ['https://www.nasa.gov/centers-and-facilities/jpl/the-mars-relay-network-connects-us-to-nasas-martian-explorers/', 'NASA: The Mars Relay Network Connects Us to NASA\'s Martian Explorers'],
  ingenuity: ['https://www.jpl.nasa.gov/news/nasas-ingenuity-mars-helicopter-succeeds-in-historic-first-flight/', 'NASA JPL: Ingenuity Mars Helicopter Succeeds in Historic First Flight'],
  touch: ['https://www.jpl.nasa.gov/news/touchdown-nasas-mars-perseverance-rover-safely-lands-on-red-planet/', 'NASA JPL: Touchdown! Perseverance Lands on Mars'],
} as const;
type Src = keyof typeof S;

// [level, source, prompt, correct, wrong1, wrong2, wrong3, explanation]
const ROWS: [number, Src, string, string, string, string, string, string][] = [
  // ----- Level 1 (easy)
  [1, 'moxie', 'The toaster-size MOXIE machine on Mars makes which gas from the Martian air?', 'Oxygen', 'Helium', 'Hydrogen', 'Neon', 'MOXIE separates oxygen atoms from carbon dioxide, the main gas in the Martian air.'],
  [1, 'storm', 'What did the Opportunity rover use to recharge its batteries?', 'Solar panels', 'A wind turbine', 'A gas tank', 'A water wheel', 'Dust blocks the sunlight that Opportunity\'s solar panels need to recharge its batteries.'],
  [1, 'ingenuity', 'What was the name of the little helicopter that flew on Mars?', 'Ingenuity', 'Skylark', 'Whirlybird', 'Dragonfly One', 'Ingenuity made the first powered, controlled flight on another planet, on 19 April 2021.'],
  [1, 'storm', 'In a big Martian dust storm, why do solar-powered rovers struggle?', 'Dust in the air blocks the sunlight', 'The Sun switches off', 'Dust makes the panels too hot', 'Rain floods the wheels', 'Dust blocks the sunlight the panels need, like a very smoggy day.'],
  [1, 'touch', 'Which NASA rover, carrying MOXIE, landed on Mars on 18 February 2021?', 'Perseverance', 'Sojourner', 'Spirit', 'Opportunity', 'Perseverance touched down on 18 February 2021.'],
  // ----- Level 2
  [2, 'power', 'Perseverance makes electricity from the heat of which natural process?', 'Radioactive decay of plutonium-238', 'Burning wood', 'Wind blowing', 'Rubbing wheels on rocks', 'Its MMRTG is like a nuclear battery: it turns the heat of plutonium-238 decay into electricity.'],
  [2, 'eclss', 'About how much of the water on the space station is recovered and reused?', 'About 90 percent', 'About 10 percent', 'None of it', 'Exactly 50 percent', 'The water recovery system reclaims urine, humidity and other wastewater and recovers about 90 percent of the water.'],
  [2, 'relay', 'NASA\'s Deep Space Network has big ground stations near California, Madrid and which other place?', 'Canberra, Australia', 'Cairo, Egypt', 'Tokyo, Japan', 'Lagos, Nigeria', 'The stations are near Goldstone (California), Madrid (Spain) and Canberra (Australia), so one is always facing Mars as Earth turns.'],
  [2, 'ingenuity', 'How high did Ingenuity hover during its first flight?', 'About 10 feet (3 meters)', 'About 1 foot', 'About 1,000 feet', 'About a mile', 'It hovered at 10 feet (3 m) for 30 seconds in a 39.1-second flight.'],
  [2, 'ingenuity', 'Why is it hard for a helicopter to fly on Mars?', 'The air is extremely thin', 'The air is too thick', 'There is no Sun', 'Rotors cannot spin in cold', 'Mars air is only about 1% of Earth\'s surface pressure, so the blades have few air molecules to push on.'],
  // ----- Level 3
  [3, 'relay', 'Why do rovers send most science data through orbiters instead of straight to Earth?', 'Sending that much data directly would take too long', 'Orbiters are cheaper than antennas', 'Earth cannot receive radio', 'Rovers have no antennas', 'Large volumes of science data go to overhead orbiters, which then send it tens of millions of miles to Earth.'],
  [3, 'moxie', 'About how hot does MOXIE need to get to split oxygen out of carbon dioxide?', 'About 800 °C (1,470 °F)', 'About 20 °C', 'About -50 °C', 'About 5 °C', 'The process requires about 1,470 °F, or 800 °C.'],
  [3, 'power', 'Why did NASA give Perseverance a nuclear battery instead of solar panels?', 'It avoids day/night limits and dust building up on panels', 'Solar panels are illegal in space', 'Nuclear batteries are lighter than air', 'Mars has no sunlight at all', 'The MMRTG avoids daily and seasonal sunlight changes and the accumulation of fine Martian dust.'],
  [3, 'eclss', 'On the space station, how is oxygen made for the crew?', 'Electricity splits water into oxygen and hydrogen', 'Squeezing air tanks', 'Burning candles', 'Plants only', 'An electrolysis cell stack splits water into oxygen and hydrogen; the oxygen goes to the cabin.'],
  [3, 'moxie', 'MOXIE makes oxygen from carbon dioxide. Which gas is released as a waste product?', 'Carbon monoxide', 'Chlorine', 'Steam', 'Neon', 'It separates oxygen atoms from carbon dioxide, and carbon monoxide is released as waste.'],
  // ----- Level 4
  [4, 'storm', 'In the 2018 storm, Opportunity\'s heaters used battery power. What two risks did the team have to balance?', 'Low battery charge versus freezing cold', 'Too much sun versus too little rain', 'Wheel wear versus tyre pressure', 'Radio noise versus memory', 'Survival heaters protect the batteries from the cold but draw power from them, so low charge and freezing had to be balanced.'],
  [4, 'storm', 'By 12 June 2018, the Martian dust storm covered roughly how much of the planet?', 'About a quarter', 'About a hundredth', 'The whole planet twice', 'Only one crater', 'It covered about 14 million square miles, roughly a quarter of the planet.'],
  [4, 'insight', 'What sometimes cleaned dust off the solar panels of Spirit and Opportunity?', 'Gusts of wind', 'Rain showers', 'A tiny broom', 'The rover shaking itself on purpose', 'Dust-clearing gusts boosted their power by as much as 10%.'],
  [4, 'storm', 'In "low-power fault mode", what stays on in a rover like Opportunity?', 'Only a mission clock', 'The cameras', 'The wheels', 'The radio and heaters', 'In low-power fault mode, everything except a mission clock is off.'],
  [4, 'eclss', 'On the space station, what captures exhaled carbon dioxide?', 'Molecular sieves', 'A paper filter', 'A fan blowing it outside', 'Fish tanks', 'Carbon dioxide is captured by molecular sieves in the air revitalization system.'],
  // ----- Level 5 (a calculation each)
  [5, 'moxie', 'MOXIE made 5.4 grams of oxygen in an hour, enough for an astronaut to breathe for about 10 minutes. How many grams would one hour of breathing need?', '32.4 grams', '5.4 grams', '54 grams', '16.2 grams', '60 min / 10 min = 6 portions, and 6 x 5.4 g = 32.4 g.'],
  [5, 'power', 'The Perseverance generator gives about 110 watts, but peak demand can reach 900 watts. How many watts must the batteries add at the peak?', '790 watts', '110 watts', '1,010 watts', '900 watts', '900 W - 110 W = 790 W from the batteries.'],
  [5, 'insight', 'InSight\'s panels made about 2,700 watt-hours per sol and daily work needed about 1,500. How many watt-hours were left over?', '1,200 watt-hours', '1,500 watt-hours', '4,200 watt-hours', '2,700 watt-hours', '2,700 Wh - 1,500 Wh = 1,200 Wh spare per sol.'],
  [5, 'relay', 'Perseverance\'s landing was confirmed on Earth at 12:55:00 p.m. PST. The signal took 11 minutes 22 seconds. When did it really touch down?', '12:43:38 p.m.', '1:06:22 p.m.', '12:44:38 p.m.', '12:55:00 p.m.', '12:55:00 - 0:11:22 = 12:43:38 p.m. PST.'],
  [5, 'eclss', 'A station crew uses 400 liters of water and 90 percent is recovered. How many liters of new water are needed?', '40 liters', '360 liters', '90 liters', '4 liters', '400 L x 0.10 = 40 L (400 L x 0.90 = 360 L is recovered).'],
];

export const DAVID_QUIZ: QuizQuestion[] = ROWS.map(([level, src, prompt, ok, a, b, c, explanation], n) => {
  const options = [ok, a, b, c], at = n % 4;
  [options[0], options[at]] = [options[at], options[0]];
  return { id: `david-${level}-${(n % 5) + 1}`, crew: 'david', level, prompt, options, correctIndex: at, sourceUrl: S[src][0], sourceTitle: S[src][1], verified: true, explanation };
});
