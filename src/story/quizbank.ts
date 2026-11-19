// Step 27d: where the quiz questions are found. The real banks (27e Reyes, 27f Aiko, 27g David, 27h Sofia) are registered in QUIZ_BANKS.
// A crew member with no complete bank (5 questions on each of 5 levels) never calls and never shows START QUIZ (no fake button).
// DEV builds only: a sample bank (verified:false) so the whole flow can be seen before the real banks exist. It never ships in a production build.
import { QUIZ } from '../core/quiz';
import { REYES_QUIZ } from './quiz-reyes';
import { AOKI_QUIZ } from './quiz-aoki';
import { DAVID_QUIZ } from './quiz-david';
import { SOFIA_QUIZ } from './quiz-sofia';
import type { CrewId, QuizQuestion } from '../core/types';

export const QUIZ_BANKS: Partial<Record<CrewId, readonly QuizQuestion[]>> = { reyes: REYES_QUIZ, aiko: AOKI_QUIZ, david: DAVID_QUIZ, sofia: SOFIA_QUIZ };

const SAMPLE: [string, string[]][] = [
  ['Which planet is called the Red Planet?', ['Mars', 'Venus', 'Jupiter', 'Mercury']],
  ['How many moons does Mars have?', ['Two', 'None', 'One', 'Five']],
  ['Which NASA rover landed in Jezero Crater in 2021?', ['Perseverance', 'Sojourner', 'Opportunity', 'Spirit']],
  ['What gas makes up most of the Martian air?', ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Helium']],
  ['Mars is the ___ planet from the Sun.', ['Fourth', 'Second', 'Sixth', 'Eighth']],
];
const sampleBank = (crew: CrewId): QuizQuestion[] => [1, 2, 3, 4, 5].flatMap(level => SAMPLE.map(([prompt, options], n) => ({ id: `sample-${crew}-${level}-${n}`, crew, level, prompt, options, correctIndex: 0, sourceUrl: 'https://science.nasa.gov/mars/', sourceTitle: 'NASA Mars Exploration', verified: false })));

const complete = (b: readonly QuizQuestion[] | undefined): b is readonly QuizQuestion[] =>
  !!b && Array.from({ length: QUIZ.LEVELS }, (_, i) => b.filter(q => q.level === i + 1).length).every(n => n === QUIZ.PER_LEVEL);
export const bankFor = (crew: CrewId): readonly QuizQuestion[] => { const b = QUIZ_BANKS[crew]; return complete(b) ? b : import.meta.env.DEV ? sampleBank(crew) : []; };
export const hasBank = (crew: CrewId): boolean => bankFor(crew).length > 0;
