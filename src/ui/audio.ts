// Sound effects ported from the legacy prototype (WebAudio beeps, no asset files).
export const settings = (() => {
  const base = { sound: true, reduce: typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches, name: 'Rookie' };
  try { return Object.assign(base, JSON.parse(localStorage.getItem('mrp.settings') || '{}')); } catch { return base; }
})();
export const saveSettings = () => { try { localStorage.setItem('mrp.settings', JSON.stringify(settings)); } catch { /* ignore */ } };

let AC: AudioContext | undefined;
let musicTimer: number | undefined, musicMode: 'menu' | 'game' | null = null, musicStep = 0;
const ensureAudio = () => { const W = window as unknown as { webkitAudioContext?: typeof AudioContext }; AC = AC || new (window.AudioContext || W.webkitAudioContext!)(); if (AC.state === 'suspended') void AC.resume(); return AC; };
function beep(f = 660, d = 0.09, type: OscillatorType = 'sine', v = 0.05, delay = 0) {
  if (!settings.sound) return;
  try {
    const ac = ensureAudio();
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d + 0.02);
  } catch { /* audio is optional */ }
}
function musicTick() {
  if (!settings.sound || !AC || !musicMode) return;
  // A tiny generated lo-fi loop: no downloaded audio, and it starts only after
  // a player gesture (the browser's autoplay rule).
  const menu = musicMode === 'menu', notes = menu ? [220, 277, 330, 415, 330, 277] : [196, 247, 294, 370, 330, 294];
  const n = notes[musicStep++ % notes.length];
  beep(n, menu ? .42 : .3, 'triangle', .018);
  beep(n * 1.5, .16, 'sine', .008, .07);
  if (musicStep % 3 === 0) beep(n / 2, .28, 'sine', .014, .03);
}
export const music = {
  set(mode: 'menu' | 'game' | null) { musicMode = mode; if (musicTimer) { clearInterval(musicTimer); musicTimer = undefined; } if (mode && settings.sound && AC) { musicTick(); musicTimer = window.setInterval(musicTick, mode === 'menu' ? 620 : 460); } },
  wake() { if (!musicMode || !settings.sound || musicTimer) return; ensureAudio(); musicTick(); musicTimer = window.setInterval(musicTick, musicMode === 'menu' ? 620 : 460); },
  toggle() { settings.sound = !settings.sound; saveSettings(); if (!settings.sound && musicTimer) { clearInterval(musicTimer); musicTimer = undefined; } if (settings.sound) this.wake(); return settings.sound; },
};
export const sfx = {
  click: () => { ensureAudio(); music.wake(); beep(520, 0.06, 'square', 0.03); },
  ok: () => { beep(660, 0.1, 'triangle', 0.06); beep(990, 0.16, 'triangle', 0.06, 0.1); },
  warn: () => { beep(300, 0.18, 'sawtooth', 0.05); beep(240, 0.22, 'sawtooth', 0.05, 0.18); },
  blip: () => beep(880, 0.03, 'square', 0.015),
  win: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.18, 'triangle', 0.06, i * 0.12)),
  plant: () => beep(420, 0.08, 'triangle', 0.05),
  water: () => { beep(700, 0.05, 'sine', 0.04); beep(540, 0.08, 'sine', 0.04, 0.05); },
  harvest: () => { beep(600, 0.08, 'triangle', 0.06); beep(900, 0.12, 'triangle', 0.06, 0.08); },
  ring: () => { for (let i = 0; i < 3; i++) { beep(880, 0.12, 'square', 0.035, i * 0.18); beep(660, 0.12, 'square', 0.03, i * 0.18 + 0.09); } },
  alarm: () => { beep(980, 0.14, 'sawtooth', 0.04); beep(740, 0.14, 'sawtooth', 0.04, 0.16); },
  tick: () => beep(1200, 0.025, 'square', 0.02),
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
