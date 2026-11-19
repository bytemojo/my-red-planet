// Step 27e: Captain Reyes's quiz (25 questions, 5 per level). Topics: mission preparation, leadership, safety, communication delay, radiation, Mars basics.
// Every fact below was read on the NASA page named in its sourceUrl (checked 19 Nov 2026). Distractors are plausible but wrong. Level 5 = a calculation (shown in `explanation`).
// The correct answer is listed FIRST in each row; core/quiz.ts buildAttempt shuffles options every attempt and re-points correctIndex.
import type { QuizQuestion } from '../core/types';

const S = {
  glance: ['https://www.jpl.nasa.gov/news/press_kits/insight/launch/facts/mars-at-a-glance', 'NASA JPL: Mars at a Glance'],
  mars: ['https://science.nasa.gov/mars/', 'NASA Science: Mars'],
  percy: ['https://science.nasa.gov/missions/mars-2020-perseverance/speaking-percys-language-how-to-talk-so-perseverance-will-listen/', "NASA Science: Speaking Percy's Language"],
  conj: ['https://www.jpl.nasa.gov/edu/resources/video/mars-in-a-minute-what-happens-when-the-sun-blocks-our-signal/', 'NASA JPL: Mars in a Minute, When the Sun Blocks Our Signal'],
  rad: ['https://www.nasa.gov/solar-system/real-martians-how-to-protect-astronauts-from-space-radiation-on-mars/', 'NASA: Real Martians, How to Protect Astronauts from Space Radiation on Mars'],
  chapea: ['https://www.nasa.gov/humans-in-space/chapea/chapea-mission-2/', 'NASA: CHAPEA Mission 2'],
  voyagers: ['https://www.nasa.gov/missions/voyagers-of-mars-the-first-chapea-crews-yearlong-journey/', 'NASA: Voyagers of Mars, the First CHAPEA Crew'],
  train: ['https://www.nasa.gov/wp-content/uploads/2015/10/160410main_space_training_fact_sheet.pdf', 'NASA: Astronaut Training Fact Sheet'],
  touch: ['https://www.jpl.nasa.gov/news/touchdown-nasas-mars-perseverance-rover-safely-lands-on-red-planet/', 'NASA JPL: Touchdown! Perseverance Lands on Mars'],
  eio: ['https://ntrs.nasa.gov/api/citations/20240007807/downloads/ASCEND%20DRAFT%20-%20FORMATTED.pdf', 'NASA NTRS: Earth Independent Operations for the Mars Campaign'],
} as const;
type Src = keyof typeof S;

// [level, source, prompt, correct, wrong1, wrong2, wrong3, explanation]
const ROWS: [number, Src, string, string, string, string, string, string][] = [
  // ----- Level 1 (easy)
  [1, 'mars', 'Counting out from the Sun, which number planet is Mars?', 'Fourth', 'Second', 'Sixth', 'Eighth', 'Mars is the fourth planet from the Sun.'],
  [1, 'glance', 'What are the names of the two moons of Mars?', 'Phobos and Deimos', 'Luna and Titan', 'Europa and Io', 'Triton and Charon', 'Mars has two small, lumpy moons: Phobos and Deimos.'],
  [1, 'glance', 'Which gas makes up most of the air on Mars?', 'Carbon dioxide', 'Oxygen', 'Helium', 'Hydrogen', 'The Martian air is about 95% carbon dioxide, so people could not breathe it.'],
  [1, 'touch', 'In which crater did the Perseverance rover land in February 2021?', 'Jezero Crater', 'Gale Crater', 'Endeavour Crater', 'Tycho Crater', 'Perseverance touched down in Jezero Crater on 18 February 2021.'],
  [1, 'train', 'Where do astronauts practise spacewalks here on Earth?', 'Underwater, in a giant pool', 'On a sandy beach', 'On a snowy mountain', 'In a flight simulator only', 'They train in a huge indoor pool, because floating in water feels a bit like floating in space.'],
  // ----- Level 2
  [2, 'percy', 'A radio message to Mars takes a different time depending on where the planets are. How long does it take, one way?', 'Between 3 and 22 minutes', 'Less than a second', 'About 2 hours', 'Exactly 1 day', 'Commands to Perseverance take 3 to 22 minutes, depending on where Earth and Mars are in their orbits.'],
  [2, 'glance', 'How strong is gravity on Mars compared with Earth?', 'About 38% of Earth\'s', 'About the same', 'Double Earth\'s', 'Almost none', 'Mars gravity is 38 percent of Earth\'s, so you would feel much lighter.'],
  [2, 'chapea', 'NASA\'s CHAPEA missions have volunteers live in a simulated Mars home. How long is each mission?', '378 days', '7 days', '30 days', '5 years', 'CHAPEA Mission 2 is a 378-day simulated Mars mission with a crew of four.'],
  [2, 'conj', 'About how often does Mars end up on the far side of the Sun from Earth, cutting off contact?', 'About every two years', 'Every week', 'Every 20 years', 'Only once ever', 'This "solar conjunction" happens about every two years.'],
  [2, 'voyagers', 'In the first CHAPEA crew, what did the mission commander do?', 'Led daily operations and helped keep crew morale up', 'Only fixed the 3D printer', 'Stayed away from the crew', 'Only talked to Earth', 'Commander Kelly Haston led daily operations and helped maintain crew morale.'],
  // ----- Level 3
  [3, 'glance', 'About how long is one year on Mars?', '687 Earth days', '365 Earth days', '88 Earth days', '1,000 Earth days', 'Mars takes 687 Earth days to go around the Sun.'],
  [3, 'conj', 'How long does the communications break last when the Sun is in the way?', 'Just a few weeks', 'A few minutes', 'About ten years', 'A single hour', 'The break in contact lasts just a few weeks.'],
  [3, 'rad', 'Which kind of material is good at blocking space radiation?', 'Hydrogen-rich material, such as water', 'A thin sheet of paper', 'Plain air', 'Glass marbles', 'Hydrogen blocks particles well. Water and polyethylene are hydrogen-rich, so water could serve as a storm shelter.'],
  [3, 'rad', 'Why can\'t NASA simply pile up lots of heavy shielding on a spacecraft?', 'It would be far too heavy and expensive to launch', 'Heavy shielding makes radiation stronger', 'Shielding always melts in space', 'Nobody has thought of it', 'NASA says using sheer bulk to protect astronauts would be prohibitively expensive, because more mass needs more fuel.'],
  [3, 'voyagers', 'A CHAPEA crew member said that even deciding WHEN to send a message matters. Why?', 'Bandwidth is limited and teammates should not be overloaded', 'Messages only work at midnight', 'Messages cost money per word', 'The crew was not allowed to talk', 'The crew had to choose which observations were worth sending so they would not overload teammates or waste limited bandwidth.'],
  // ----- Level 4
  [4, 'eio', 'When a Mars message delay is longer than 10 minutes, who does the first response to a problem on board?', 'The crew themselves', 'Mission Control on Earth', 'A passing spaceship', 'Nobody until the delay ends', 'For delays over 10 minutes, the crew are responsible for the initial triage and response to onboard problems.'],
  [4, 'eio', 'NASA\'s Earth-independence idea says "any capability that can reasonably be left on the ground, will be." What does that mean?', 'Only the jobs that truly cannot wait for Earth are given to the crew', 'The crew must do every job alone', 'Earth does nothing at all', 'The crew leaves its tools on the ground', 'It keeps the crew\'s workload sensible: Earth handles what it reasonably can, and the crew handles what they must.'],
  [4, 'rad', 'Most particles from ordinary solar storms are low-energy protons. What can stop almost all of them?', 'The spacecraft\'s own structure', 'Nothing can stop them', 'A cotton blanket', 'A window', 'Solar particles can almost all be physically shielded by the structure of the spacecraft.'],
  [4, 'rad', 'Why are galactic cosmic rays harder to shield than solar particles?', 'Their collisions create secondary radiation', 'They are slow and heavy', 'They only travel in the dark', 'They come only from the Moon', 'Galactic cosmic rays are particles moving near the speed of light. When they collide with shielding they make secondary radiation that can reach a dangerous level.'],
  [4, 'conj', 'During the contact break, mission controllers send only simple task lists. Why?', 'A partly received command could confuse the spacecraft and put it in danger', 'Spacecraft cannot read long words', 'Long lists are against the law', 'The Sun erases all lists', 'Charged particles from the Sun can corrupt signals, and a partial command could confuse a spacecraft.'],
  // ----- Level 5 (a calculation each)
  [5, 'percy', 'You send a question to Mars when the one-way delay is at its longest, 22 minutes. What is the SHORTEST time before you could get an answer back?', '44 minutes', '22 minutes', '11 minutes', '66 minutes', '22 min there + 22 min back = 44 minutes (and that is if the answer is instant).'],
  [5, 'glance', 'One Mars day (a sol) is 1.027 Earth days. About how many Earth days are 10 sols?', 'About 10.27 days', 'About 9.73 days', 'About 12.7 days', 'About 1.027 days', '10 sols x 1.027 = 10.27 Earth days.'],
  [5, 'glance', 'A 100 kg supply crate sits on Mars, where gravity is 38% of Earth\'s. On Earth, which weight feels equally heavy?', '38 kg', '62 kg', '100 kg', '380 kg', '100 kg x 0.38 = 38 kg. It would feel as light as a 38 kg crate on Earth.'],
  [5, 'train', 'For every 1 hour of spacewalk, astronauts train about 10 hours underwater. How many pool hours to prepare for a 3-hour spacewalk?', 'About 30 hours', 'About 13 hours', 'About 3 hours', 'About 300 hours', '3 hours x 10 = 30 hours of training in the pool.'],
  [5, 'glance', 'The CHAPEA crew lives 378 days in the habitat. A sol is 1.027 Earth days. About how many sols is that?', 'About 368 sols', 'About 388 sols', 'About 378 sols', 'About 310 sols', '378 / 1.027 = 368.1, so about 368 sols.'],
];

export const REYES_QUIZ: QuizQuestion[] = ROWS.map(([level, src, prompt, ok, a, b, c, explanation], n) => {
  const options = [ok, a, b, c], at = n % 4; // spread the right answer over the 4 positions in the source too
  [options[0], options[at]] = [options[at], options[0]];
  return { id: `reyes-${level}-${(n % 5) + 1}`, crew: 'reyes', level, prompt, options, correctIndex: at, sourceUrl: S[src][0], sourceTitle: S[src][1], verified: true, explanation };
});
