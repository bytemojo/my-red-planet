// The ONLY file in this minigame that knows where the game's questions live. If the banks move, change the imports here.
// The 4 crew banks (25 questions each, difficulty 1-5) are re-used as they are: same text, same NASA source links.
import { REYES_QUIZ } from '../../story/quiz-reyes';
import { AOKI_QUIZ } from '../../story/quiz-aoki';
import { DAVID_QUIZ } from '../../story/quiz-david';
import { SOFIA_QUIZ } from '../../story/quiz-sofia';
import type { BankQuestion } from './engine';

export const allQuestions = (): BankQuestion[] => [...REYES_QUIZ, ...AOKI_QUIZ, ...DAVID_QUIZ, ...SOFIA_QUIZ];
