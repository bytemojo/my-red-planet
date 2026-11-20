// Stand-alone page entry (astronaut-quiz.html): lets you play, test and share the minigame by itself, outside the main game.
// Dev: http://localhost:5173/astronaut-quiz.html     Deployed: https://<your-site>/astronaut-quiz.html   (add ?seed=123 for a repeatable run)
import '@fontsource/orbitron/latin-500.css';
import '@fontsource/orbitron/latin-700.css';
import '@fontsource/orbitron/latin-900.css';
import '@fontsource/rajdhani/latin-500.css';
import '@fontsource/rajdhani/latin-600.css';
import '@fontsource/rajdhani/latin-700.css';
import { openAstronautQuiz } from './index';
import { mulberry32 } from './engine';

const seed = Number(new URLSearchParams(location.search).get('seed'));
const host = document.getElementById('aq-landing') as HTMLElement;
function launch() {
  host.hidden = true;
  openAstronautQuiz({ rnd: seed ? mulberry32(seed) : undefined, onClose: () => { host.hidden = false; } });
}
(document.getElementById('aq-open') as HTMLElement).onclick = launch;
launch();
