// Sound effects ported from the legacy prototype (WebAudio beeps, no asset files).
export const settings = (() => {
  // name: the player's first name (one source of truth for {name}); look: the character creator's choices.
  const base = { sound: true, reduce: typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches, name: 'Rookie', look: null as null | { name: string; skin: number; hair: number; style: 'long' | 'short' } };
  try { return Object.assign(base, JSON.parse(localStorage.getItem('mrp.settings') || '{}')); } catch { return base; }
})();
export const saveSettings = () => { try { localStorage.setItem('mrp.settings', JSON.stringify(settings)); } catch { /* ignore */ } };

let AC: AudioContext | undefined;
let musicMode: 'menu' | 'game' | null = null;
let musicLocation: 'indoor' | 'outdoor' = 'indoor';
let musicStarted = false;
let indoorSource: HTMLAudioElement | null = null;
let outdoorSource: HTMLAudioElement | null = null;
let indoorGain: GainNode | null = null;
let outdoorGain: GainNode | null = null;
let crossfadeTimer: number | undefined;
const ensureAudio = () => { const W = window as unknown as { webkitAudioContext?: typeof AudioContext }; AC = AC || new (window.AudioContext || W.webkitAudioContext!)(); if (AC.state === 'suspended') void AC.resume(); return AC; };
const makeMusicSource = (file: string) => {
  const el = new Audio(file);
  el.loop = true;
  el.preload = 'auto';
  return el;
};
const ensureMusic = () => {
  if (indoorSource && outdoorSource) return;
  const ac = ensureAudio();
  indoorSource = makeMusicSource('./audio/indoor-lofi-jpop.mp3');
  outdoorSource = makeMusicSource('./audio/outdoor-scifi-mystery.mp3');
  indoorGain = ac.createGain();
  outdoorGain = ac.createGain();
  indoorGain.gain.value = settings.sound ? 1 : 0;
  outdoorGain.gain.value = 0;
  const indoorMedia = ac.createMediaElementSource(indoorSource);
  const outdoorMedia = ac.createMediaElementSource(outdoorSource);
  indoorMedia.connect(indoorGain).connect(ac.destination);
  outdoorMedia.connect(outdoorGain).connect(ac.destination);
};
const setGain = (gain: GainNode | null, value: number, seconds = 1.8) => {
  if (!gain || !AC) return;
  const now = AC.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, value), now + seconds);
};
const playMusic = async () => {
  if (!settings.sound || !musicMode) return;
  ensureMusic();
  if (AC?.state === 'suspended') await AC.resume();
  if (!indoorSource || !outdoorSource) return;
  try {
    if (!indoorSource.paused || !outdoorSource.paused) return;
    await Promise.all([
      indoorSource.paused ? indoorSource.play() : Promise.resolve(),
      outdoorSource.paused ? outdoorSource.play() : Promise.resolve(),
    ]);
    musicStarted = true;
  } catch { /* Browser autoplay policy: a later pointer or key gesture retries. */ }
};
const crossfadeLocation = (location: 'indoor' | 'outdoor') => {
  if (!musicMode) return;
  musicLocation = location;
  ensureMusic();
  if (crossfadeTimer) window.clearTimeout(crossfadeTimer);
  crossfadeTimer = window.setTimeout(() => crossfadeTimer = undefined, 1900);
  if (!settings.sound) {
    setGain(indoorGain, 0);
    setGain(outdoorGain, 0);
    return;
  }
  setGain(indoorGain, location === 'indoor' ? 1 : 0);
  setGain(outdoorGain, location === 'outdoor' ? 1 : 0);
  void playMusic();
};
function beep(f = 660, d = 0.09, type: OscillatorType = 'sine', v = 0.05, delay = 0) {
  if (!settings.sound) return;
  try {
    const ac = ensureAudio();
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d + 0.02);
  } catch { /* audio is optional */ }
}
export const music = {
  set(mode: 'menu' | 'game' | null) {
    musicMode = mode;
    if (!mode) {
      indoorSource?.pause();
      outdoorSource?.pause();
      musicStarted = false;
      return;
    }
    crossfadeLocation(mode === 'menu' ? 'indoor' : musicLocation);
  },
  location(location: 'indoor' | 'outdoor') {
    if (location !== musicLocation) crossfadeLocation(location);
  },
  wake() { if (!musicMode || !settings.sound) return; void playMusic(); },
  toggle() {
    settings.sound = !settings.sound;
    saveSettings();
    if (!settings.sound) {
      setGain(indoorGain, 0);
      setGain(outdoorGain, 0);
    } else {
      crossfadeLocation(musicLocation);
    }
    return settings.sound;
  },
};
export const sfx = {
  click: () => { ensureAudio(); music.wake(); beep(520, 0.06, 'square', 0.03); },
  ok: () => { beep(660, 0.1, 'triangle', 0.06); beep(990, 0.16, 'triangle', 0.06, 0.1); },
  warn: () => { beep(300, 0.18, 'sawtooth', 0.05); beep(240, 0.22, 'sawtooth', 0.05, 0.18); },
  blip: () => beep(880, 0.03, 'square', 0.015),
  // Step 27c: quiz sounds. A soft two-note chime for a right answer, a low gentle tone for a miss (never harsh for kids).
  chime: () => { beep(784, 0.16, 'sine', 0.045); beep(1175, 0.26, 'sine', 0.04, 0.11); },
  miss: () => { beep(330, 0.2, 'sine', 0.035); beep(262, 0.26, 'sine', 0.03, 0.14); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.18, 'triangle', 0.06, i * 0.12)),
  // Step 22b: a bonus star lands. Low, short, no audio file.
  thump: () => { beep(120, 0.2, 'sine', 0.12); beep(64, 0.32, 'sine', 0.1, 0.03); },
  plant: () => beep(420, 0.08, 'triangle', 0.05),
  water: () => { beep(700, 0.05, 'sine', 0.04); beep(540, 0.08, 'sine', 0.04, 0.05); },
  harvest: () => { beep(600, 0.08, 'triangle', 0.06); beep(900, 0.12, 'triangle', 0.06, 0.08); },
  ring: () => { for (let i = 0; i < 3; i++) { beep(880, 0.12, 'square', 0.035, i * 0.18); beep(660, 0.12, 'square', 0.03, i * 0.18 + 0.09); } },
  alarm: () => { beep(980, 0.14, 'sawtooth', 0.04); beep(740, 0.14, 'sawtooth', 0.04, 0.16); },
  tick: () => beep(1200, 0.025, 'square', 0.02),
  refill: (air: number) => { beep(380 + air * 4, 0.06, 'sine', 0.022); beep(300 + air * 4, 0.1, 'triangle', 0.012, 0.05); },
  hum: () => { beep(110, 0.5, 'sine', 0.012); beep(165, 0.5, 'sine', 0.006); },
  cough: () => { beep(140, 0.07, 'sawtooth', 0.04); beep(110, 0.09, 'sawtooth', 0.035, 0.09); beep(95, 0.1, 'sawtooth', 0.03, 0.2); },
  // Radio static: a short burst of filtered noise (generated, no audio file).
  static: (secs = 0.9) => {
    if (!settings.sound) return;
    try {
      const ac = ensureAudio(), n = Math.floor(ac.sampleRate * secs), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (0.5 + 0.5 * Math.sin(i / 900));
      const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      f.type = 'bandpass'; f.frequency.value = 1800; g.gain.value = 0.05;
      src.buffer = buf; src.connect(f); f.connect(g); g.connect(ac.destination); src.start();
    } catch { /* audio is optional */ }
  },
};
