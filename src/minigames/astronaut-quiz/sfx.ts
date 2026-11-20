// ASTRONAUT QUIZ sound: a tiny WebAudio synth (no audio files, so nothing to download and it works offline).
// Game-show sounds: lock-in thump, bright bell for right, soft "aww" for wrong (never a buzzer, this is a kids' game), level fanfare, gentle bed loop.
let AC: AudioContext | undefined;
let allowed: () => boolean = () => true;
let muted = false;
try { muted = localStorage.getItem('mrp.aq.muted') === '1'; } catch { /* ignore */ }

const on = () => allowed() && !muted;
function ctx(): AudioContext | undefined {
  try {
    const W = window as unknown as { webkitAudioContext?: typeof AudioContext };
    AC = AC || new (window.AudioContext || W.webkitAudioContext!)();
    if (AC.state === 'suspended') void AC.resume();
    return AC;
  } catch { return undefined; }
}
interface T { f: number; d: number; type?: OscillatorType; v?: number; at?: number; to?: number; lp?: number }
function tone({ f, d, type = 'sine', v = 0.05, at = 0, to, lp }: T) {
  if (!on()) return; const ac = ctx(); if (!ac) return;
  try {
    const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + Math.min(0.02, d / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    let tail: AudioNode = o;
    if (lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); tail = fl; }
    tail.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d + 0.03);
  } catch { /* audio is optional */ }
}
function noise(d: number, v: number, f0: number, f1: number, at = 0) {
  if (!on()) return; const ac = ctx(); if (!ac) return;
  try {
    const n = Math.floor(ac.sampleRate * d), buf = ac.createBuffer(1, n, ac.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime + at;
    fl.type = 'bandpass'; fl.Q.value = 1.2; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + d * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.buffer = buf; src.connect(fl); fl.connect(g); g.connect(ac.destination); src.start(t);
  } catch { /* audio is optional */ }
}
const chord = (fs: number[], d: number, type: OscillatorType, v: number, at = 0, lp?: number) => fs.forEach(f => tone({ f, d, type, v, at, lp }));

// Bed music: a slow, soft pulse in a minor key. Starts at the first question, stops on every result screen. Gets a touch quicker on harder levels.
let bedTimer: number | undefined, bedStep = 0, bedMs = 480;
const BASS = [110, 110, 131, 110, 98, 98, 123, 98], ARP = [440, 523, 659, 523, 392, 494, 587, 494];
function bedTick() {
  if (!on()) return;
  const i = bedStep++ % BASS.length;
  tone({ f: BASS[i], d: 0.34, type: 'triangle', v: 0.03, lp: 500 });
  if (i % 2 === 1) tone({ f: ARP[i], d: 0.22, type: 'sine', v: 0.008, at: 0.04 });
}

export const aqSfx = {
  setGate(fn: () => boolean) { allowed = fn; },
  get muted() { return muted; },
  setMuted(m: boolean) { muted = m; try { localStorage.setItem('mrp.aq.muted', m ? '1' : '0'); } catch { /* ignore */ } if (m) this.bedStop(); },
  unlock() { ctx(); },
  click: () => tone({ f: 540, d: 0.06, type: 'square', v: 0.025 }),
  hover: () => tone({ f: 900, d: 0.03, type: 'square', v: 0.008 }),
  // intro "show starts": rising whoosh and a bright arpeggio
  start() { noise(0.7, 0.05, 300, 3200); [392, 523, 659, 784, 1047].forEach((f, i) => tone({ f, d: 0.22, type: 'triangle', v: 0.05, at: 0.12 + i * 0.09 })); chord([262, 330, 392, 523], 0.7, 'triangle', 0.03, 0.55); },
  level() { noise(0.5, 0.04, 400, 2400); tone({ f: 130, d: 0.4, type: 'sine', v: 0.12 }); tone({ f: 392, d: 0.14, type: 'triangle', v: 0.05, at: 0.2 }); tone({ f: 523, d: 0.3, type: 'triangle', v: 0.05, at: 0.34 }); },
  // answer locked in: drum thump and a low rising tension tone
  lock() { tone({ f: 150, d: 0.3, type: 'sine', v: 0.14, to: 60 }); tone({ f: 196, d: 0.9, type: 'sawtooth', v: 0.012, to: 330, lp: 700 }); },
  suspense() { for (let i = 0; i < 4; i++) tone({ f: 98, d: 0.2, type: 'sine', v: 0.06, at: i * 0.27 }); },
  // right: two bright bells and a little sparkle
  right() { tone({ f: 988, d: 0.5, type: 'sine', v: 0.06 }); tone({ f: 1319, d: 0.7, type: 'sine', v: 0.055, at: 0.12 }); chord([523, 659, 784], 0.55, 'triangle', 0.035, 0.1); [1568, 1976, 2349].forEach((f, i) => tone({ f, d: 0.16, type: 'sine', v: 0.015, at: 0.3 + i * 0.07 })); },
  // wrong: a soft, friendly "aww" slide down. Never harsh.
  wrong() { tone({ f: 392, d: 0.38, type: 'sine', v: 0.05, to: 294 }); tone({ f: 294, d: 0.5, type: 'sine', v: 0.045, at: 0.22, to: 220 }); },
  fifty() { [1200, 900, 1500].forEach((f, i) => tone({ f, d: 0.08, type: 'square', v: 0.02, at: i * 0.06 })); },
  low() { tone({ f: 660, d: 0.25, type: 'sine', v: 0.04 }); tone({ f: 523, d: 0.35, type: 'sine', v: 0.035, at: 0.18 }); },
  // level cleared: a fanfare
  pass() { [523, 659, 784].forEach((f, i) => chord([f, f * 1.5], 0.2, 'sawtooth', 0.02, i * 0.14, 1800)); chord([523, 659, 784, 1047], 0.9, 'sawtooth', 0.025, 0.46, 2000); chord([1047, 1319, 1568], 0.8, 'sine', 0.03, 0.5); },
  // run over: a gentle lullaby-ish descent, then a warm chord
  soft() { [659, 587, 494, 440].forEach((f, i) => tone({ f, d: 0.42, type: 'sine', v: 0.045, at: i * 0.26 })); chord([220, 330, 392], 1.1, 'triangle', 0.02, 1.0); },
  // finished everything: the big one
  fanfare() {
    noise(1.1, 0.05, 500, 6000);
    [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => chord([f, f / 2], 0.28, 'sawtooth', 0.025, i * 0.15, 2200));
    chord([523, 659, 784, 1047], 1.6, 'sawtooth', 0.03, 1.35, 2400); chord([1047, 1319, 1568, 2093], 1.4, 'sine', 0.03, 1.4);
    for (let i = 0; i < 10; i++) tone({ f: 1500 + Math.random() * 2200, d: 0.12, type: 'sine', v: 0.012, at: 1.5 + i * 0.09 });
  },
  card() { [784, 988, 1175, 1568].forEach((f, i) => tone({ f, d: 0.3, type: 'sine', v: 0.04, at: i * 0.08 })); },
  bedStart(level = 1) { this.bedStop(); if (!on()) return; ctx(); bedMs = Math.max(300, 500 - level * 18); bedStep = 0; bedTick(); bedTimer = window.setInterval(bedTick, bedMs); },
  bedStop() { if (bedTimer) { clearInterval(bedTimer); bedTimer = undefined; } },
};
