// Sound effects ported from the legacy prototype (WebAudio beeps, no asset files).
export const settings = (() => {
  const base = { sound: true, reduce: typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches, name: 'Rookie' };
  try { return Object.assign(base, JSON.parse(localStorage.getItem('mrp.settings') || '{}')); } catch { return base; }
})();
export const saveSettings = () => { try { localStorage.setItem('mrp.settings', JSON.stringify(settings)); } catch { /* ignore */ } };

let AC: AudioContext | undefined;
function beep(f = 660, d = 0.09, type: OscillatorType = 'sine', v = 0.05, delay = 0) {
  if (!settings.sound) return;
  try {
    const W = window as unknown as { webkitAudioContext?: typeof AudioContext };
    AC = AC || new (window.AudioContext || W.webkitAudioContext!)();
    const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
  } catch { /* audio is optional */ }
}
export const sfx = {
  click: () => beep(520, 0.06, 'square', 0.03),
  ok: () => { beep(660, 0.1, 'triangle', 0.06); beep(990, 0.16, 'triangle', 0.06, 0.1); },
  warn: () => { beep(300, 0.18, 'sawtooth', 0.05); beep(240, 0.22, 'sawtooth', 0.05, 0.18); },
  blip: () => beep(880, 0.03, 'square', 0.015),
  win: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.18, 'triangle', 0.06, i * 0.12)),
  plant: () => beep(420, 0.08, 'triangle', 0.05),
  water: () => { beep(700, 0.05, 'sine', 0.04); beep(540, 0.08, 'sine', 0.04, 0.05); },
  harvest: () => { beep(600, 0.08, 'triangle', 0.06); beep(900, 0.12, 'triangle', 0.06, 0.08); },
};
