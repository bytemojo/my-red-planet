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
// Generated action sounds. They use Web Audio rather than downloaded assets, so they
// work offline and always follow the global sound setting.
let noiseBuffer: AudioBuffer | null = null;
const getNoise = (ac: AudioContext) => {
  if (noiseBuffer && noiseBuffer.sampleRate === ac.sampleRate) return noiseBuffer;
  const n = Math.floor(ac.sampleRate * 2), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return (noiseBuffer = buf);
};
interface BurstOpts { d: number; f0: number; f1?: number; q?: number; type?: BiquadFilterType; v?: number; delay?: number; attack?: number }
function burst(o: BurstOpts) {
  if (!settings.sound) return;
  try {
    const ac = ensureAudio(), t = ac.currentTime + (o.delay ?? 0), src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = getNoise(ac); src.loop = true; f.type = o.type ?? 'bandpass'; f.Q.value = o.q ?? 0.9; f.frequency.setValueAtTime(o.f0, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.d);
    const a = Math.min(o.attack ?? 0.01, o.d * 0.5), v = o.v ?? 0.1;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + o.d);
    src.connect(f); f.connect(g); g.connect(ac.destination); src.start(t, Math.random() * 1.5); src.stop(t + o.d + 0.05);
  } catch { /* audio is optional */ }
}
function sweep(f0: number, f1: number, d: number, type: OscillatorType = 'sine', v = 0.05, delay = 0) {
  if (!settings.sound) return;
  try {
    const ac = ensureAudio(), t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d + 0.02);
  } catch { /* audio is optional */ }
}
function bell(f: number, d = 1.1, v = 0.07, delay = 0) { beep(f, d, 'sine', v, delay); beep(f * 2.01, d * 0.5, 'sine', v * 0.35, delay); beep(f * 3.02, d * 0.25, 'sine', v * 0.12, delay); }
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
  click: () => { ensureAudio(); music.wake(); beep(1250, 0.03, 'square', 0.022); beep(520, 0.06, 'square', 0.028); beep(150, 0.05, 'sine', 0.05); },
  pickup: () => { burst({ d: 0.12, f0: 2600, f1: 4200, q: 0.7, v: 0.05 }); sweep(480, 880, 0.1, 'triangle', 0.055, 0.03); },
  putdown: () => { sweep(260, 120, 0.12, 'sine', 0.09); burst({ d: 0.06, f0: 900, q: 0.8, v: 0.06 }); },
  locker: () => { beep(1800, 0.02, 'square', 0.03); burst({ d: 0.3, f0: 700, f1: 1500, q: 1.2, v: 0.07, delay: 0.02 }); sweep(140, 90, 0.18, 'sine', 0.07, 0.24); },
  water: () => { for (let i = 0; i < 3; i++) burst({ d: 0.22, f0: 5200, f1: 3200, q: 0.6, type: 'highpass', v: 0.05, delay: i * 0.2 }); beep(900, 0.04, 'sine', 0.03, 0.55); },
  pour: () => { burst({ d: 0.7, f0: 1000, f1: 1800, q: 1.4, v: 0.08, attack: 0.1 }); for (let i = 0; i < 4; i++) beep(500 + i * 130, 0.05, 'sine', 0.025, 0.12 + i * 0.14); },
  plant: () => { burst({ d: 0.14, f0: 500, type: 'lowpass', q: 0.5, v: 0.14 }); sweep(300, 520, 0.08, 'triangle', 0.04, 0.08); },
  harvest: () => { burst({ d: 0.18, f0: 3000, f1: 1800, q: 0.7, v: 0.06 }); sweep(380, 760, 0.08, 'triangle', 0.06, 0.12); bell(1175, 0.4, 0.04, 0.2); },
  latch: () => { beep(1700, 0.025, 'square', 0.03); beep(900, 0.04, 'square', 0.03, 0.05); sweep(200, 130, 0.08, 'sine', 0.06, 0.04); },
  microwave: (secs = 1.5) => { const d = Math.min(4, Math.max(0.5, secs)); beep(100, d, 'sawtooth', 0.016); beep(200, d, 'sine', 0.01); for (let i = 0; i * 0.25 < d; i++) beep(1500, 0.015, 'square', 0.012, i * 0.25); },
  ding: () => bell(1976, 1.3, 0.09),
  steam: () => { burst({ d: 0.9, f0: 6500, f1: 3800, q: 0.5, type: 'highpass', v: 0.06, attack: 0.15 }); },
  wipe: () => { for (let i = 0; i < 3; i++) burst({ d: 0.28, f0: i % 2 ? 4200 : 2200, f1: i % 2 ? 2200 : 4200, q: 0.9, v: 0.07, delay: i * 0.3, attack: 0.1 }); bell(2637, 0.35, 0.03, 0.95); },
  servo: (secs = 0.9) => { const d = Math.min(3, secs); sweep(110, 330, d, 'sawtooth', 0.025); sweep(90, 50, 0.15, 'sine', 0.13, d); },
  lever: () => { for (let i = 0; i < 3; i++) beep(1100 - i * 120, 0.02, 'square', 0.03, i * 0.07); sweep(120, 60, 0.18, 'sine', 0.15, 0.24); },
  wrench: () => { for (let i = 0; i < 5; i++) { beep(1500 + (i % 2) * 300, 0.02, 'square', 0.03, i * 0.09); burst({ d: 0.03, f0: 3000, q: 1, v: 0.04, delay: i * 0.09 }); } bell(1319, 0.5, 0.05, 0.5); },
  suit: () => { burst({ d: 0.35, f0: 3800, q: 0.6, v: 0.08, attack: 0.02 }); beep(1900, 0.02, 'square', 0.035, 0.4); burst({ d: 0.5, f0: 6000, type: 'highpass', q: 0.5, v: 0.04, delay: 0.55 }); },
  pod: () => { burst({ d: 0.7, f0: 5000, f1: 2500, type: 'highpass', q: 0.5, v: 0.06 }); sweep(330, 165, 1.0, 'sine', 0.04, 0.3); },
  twang: () => { sweep(200, 360, 0.15, 'sawtooth', 0.04); sweep(420, 300, 0.4, 'triangle', 0.05, 0.12); },
  ice: () => { burst({ d: 0.12, f0: 2500, q: 1.5, v: 0.1 }); bell(3136, 0.35, 0.035, 0.18); },
  done: () => [660, 880, 1320].forEach((f, i) => beep(f, 0.16, 'triangle', 0.055, i * 0.09)),
  ok: () => { beep(660, 0.1, 'triangle', 0.06); beep(990, 0.16, 'triangle', 0.06, 0.1); },
  warn: () => { beep(300, 0.18, 'sawtooth', 0.05); beep(240, 0.22, 'sawtooth', 0.05, 0.18); },
  blip: () => beep(880, 0.03, 'square', 0.015),
  // Step 27c: quiz sounds. A soft two-note chime for a right answer, a low gentle tone for a miss (never harsh for kids).
  chime: () => { beep(784, 0.16, 'sine', 0.045); beep(1175, 0.26, 'sine', 0.04, 0.11); },
  miss: () => { beep(330, 0.2, 'sine', 0.035); beep(262, 0.26, 'sine', 0.03, 0.14); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.18, 'triangle', 0.06, i * 0.12)),
  // Step 22b: a bonus star lands. Low, short, no audio file.
  thump: () => { beep(120, 0.2, 'sine', 0.12); beep(64, 0.32, 'sine', 0.1, 0.03); },
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
