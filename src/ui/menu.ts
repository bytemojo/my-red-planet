import { ICON } from './icons';
import { music, settings, saveSettings, sfx } from './audio';
import { $, esc } from './ui';
import manifest from '../data/manifest.json';
import type { GameState } from '../core/types';
import { initSunCard, openWiki } from './episode';
import { cleanNameInput, validateName } from '../core/player';
import { openAstronautQuiz } from '../minigames/astronaut-quiz';

const store = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem('mrp.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem('mrp.' + k, JSON.stringify(v)); } catch { /* ignore */ } },
};

// ---------- awards (device-local) ----------
export const AWARDS = [
  { id: 'harvest', n: 'First Harvest', d: 'Grow and harvest your first Martian crop.', i: '🌱', test: (s: GameState) => !!s.flags.first_harvest },
  { id: 'friend', n: 'Good Friend', d: 'Get a crew member to five hearts.', i: '♥', test: (s: GameState) => Object.values(s.crew).some(c => c.friendship >= 5) },
  { id: 'rover', n: 'Surface Explorer', d: 'Make two rover trips.', i: '🚙', test: (s: GameState) => Number(s.flags.trips || 0) >= 2 },
  { id: 'cavern', n: 'Cave Opener', d: 'Open the cavern with water ice.', i: '🕳', test: (s: GameState) => !!s.flags.cavern_water },
  { id: 'steady', n: 'Steady Hands', d: 'Go 5 Sols without an Earth shipment.', i: '⏱', test: (s: GameState) => s.bestSelfSufficient >= 5 },
  { id: 'colony', n: 'Self-Sufficient Colony', d: 'Finish the campaign.', i: '★', test: (s: GameState) => s.campaignComplete },
];
export function updateAwards(s: GameState): string[] {
  const got = store.get<Record<string, number>>('awards', {}), fresh: string[] = [];
  for (const a of AWARDS) if (!got[a.id] && a.test(s)) { got[a.id] = 1; fresh.push(a.n); }
  if (fresh.length) store.set('awards', got);
  return fresh;
}

// ---------- starfield (ported) ----------
let starRAF = 0, starsOn = true, drawStars: (t: number) => void = () => {}, startFrame: () => void = () => {};
function initStars() {
  const c = $('#stars') as HTMLCanvasElement, x = c.getContext('2d')!;
  let w = 0, h = 0, nextShooting = 0, streaks: { x: number; y: number; start: number; duration: number; length: number; dx: number; dy: number }[] = [];
  const mobile = () => matchMedia('(max-width: 620px)').matches;
  const size = () => { const r = Math.min(devicePixelRatio || 1, 2); w = c.clientWidth; h = c.clientHeight; c.width = w * r; c.height = h * r; x.setTransform(r, 0, 0, r, 0, 0);
    streaks = []; nextShooting = 0; };
  const draw = (t: number) => {
    x.clearRect(0, 0, w, h);
    if (!starsOn || !mobile() || settings.reduce) { streaks = []; x.globalAlpha = 1; return; }
    if (t >= nextShooting) {
      streaks.push({ x: Math.random() * w * .65, y: h * (.02 + Math.random() * .06), start: t, duration: 700, length: 42 + Math.random() * 26, dx: 70 + Math.random() * 40, dy: 14 + Math.random() * 18 });
      nextShooting = t + 1700 + Math.random() * 2600;
    }
    streaks = streaks.filter(s => t - s.start <= s.duration);
    for (const s of streaks) {
      const progress = Math.max(0, (t - s.start) / s.duration), alpha = Math.sin(progress * Math.PI);
      const hx = s.x + s.dx * progress, hy = s.y + s.dy * progress, tx = hx - s.length, ty = hy - s.length * .32;
      const trail = x.createLinearGradient(tx, ty, hx, hy);
      trail.addColorStop(0, 'rgba(190,235,255,0)'); trail.addColorStop(.72, 'rgba(190,235,255,.5)'); trail.addColorStop(1, '#ffffff');
      x.save(); x.globalAlpha = alpha; x.strokeStyle = trail; x.lineWidth = 1.5; x.shadowColor = '#8edfff'; x.shadowBlur = 8; x.beginPath(); x.moveTo(tx, ty); x.lineTo(hx, hy); x.stroke(); x.restore();
    }
    x.globalAlpha = 1;
  };
  const frame = (t: number) => { if (!starsOn) { starRAF = 0; return; } draw(t); starRAF = settings.reduce || !mobile() ? 0 : requestAnimationFrame(frame); };
  size(); nextShooting = performance.now() + 100;
  addEventListener('resize', () => { size(); if (starsOn && mobile() && !settings.reduce) startFrame(); else { if (starRAF) cancelAnimationFrame(starRAF); starRAF = 0; draw(0); } });
  drawStars = draw; startFrame = () => { starsOn = true; if (!starRAF) frame(performance.now()); }; draw(performance.now());
}

// ---------- menu modal ----------
function menuModal(title: string, body: string): HTMLElement {
  const host = $('#modal-host');
  host.innerHTML = `<div class="modal" role="dialog" aria-label="${esc(title)}"><div class="holo-panel"><div class="panel-head"><h2>${esc(title)}</h2><button class="close-x" aria-label="Close">×</button></div><div class="panel-body">${body}</div></div></div>`;
  const close = () => { host.innerHTML = ''; };
  ($('.close-x', host) as HTMLElement).onclick = () => { sfx.click(); close(); };
  ($('.modal', host) as HTMLElement).addEventListener('pointerdown', e => { if (e.target === e.currentTarget) close(); });
  return host;
}
function showAwards() {
  const got = store.get<Record<string, number>>('awards', {});
  menuModal('Your awards', `<p style="margin:0;color:#a9cfe2">${Object.keys(got).length} of ${AWARDS.length} earned</p><div class="grid2">${AWARDS.map(a => `<div class="card ${got[a.id] ? 'won' : 'locked'}"><div class="big">${a.i}</div><h3>${a.n}</h3><p>${a.d}</p></div>`).join('')}</div>`);
}
function showHelp() {
  const tag = (k: string, v: boolean) => k === 'dev-fallback' ? '<span class="tag arch">DEV FALLBACK</span>' : `<span class="tag ${v ? 'live' : 'emb'}">${v ? 'VERIFIED' : 'NOT YET VERIFIED'}</span>`;
  const h = menuModal('Help', `<div class="help"><h4>Your job</h4><p>Episode 1: a radiation storm and a dust storm hit at the same time while the crew is sick. Check the systems, decide what to do with the solar panels, keep power up, water the plants and feed the crew. Every choice costs something.</p>
    <h4>Controls</h4><ul><li>Click or tap the ground: walk there</li><li>Click or tap a station: walk over and use it</li><li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrows: walk</li><li><kbd>E</kbd>: use the nearby station</li><li><kbd>C</kbd>: Control Module</li><li>Phone or tablet: drag to walk too</li></ul>
    <h4>Rules of Mars</h4><ul><li>Every action costs your energy. Sleep to refill.</li><li>Nothing is free. Every choice costs something.</li><li>Outside, watch your meters.</li><li>The Time Machine lets you rewind your choices, never the weather.</li></ul>
    <h4>Go deeper</h4><p><button class="holo-btn small amber" id="help-wiki">LIVING IN SPACE: THE NASA WIKI</button></p>
    <h4>Data sources</h4>${manifest.datasets.map(d => `<div class="src"><b>${esc(d.name)} ${tag(d.kind, d.verified)}</b><span>${esc(d.limitations)}</span></div>`).join('')}</div>`);
  ($('#help-wiki', h) as HTMLElement).onclick = () => { sfx.click(); openWiki(); };
}
function showSettings() {
  const h = menuModal('Settings', `<div class="setting"><span class="lab">Sound</span><div class="seg" id="s-sound"><button data-v="1" aria-pressed="${settings.sound}">On</button><button data-v="0" aria-pressed="${!settings.sound}">Off</button></div></div>
    <div class="setting"><span class="lab">Reduce motion</span><div class="seg" id="s-reduce"><button data-v="1" aria-pressed="${settings.reduce}">On</button><button data-v="0" aria-pressed="${!settings.reduce}">Off</button></div></div>
    <div class="setting"><label class="lab" for="callsign">Your name</label><input type="text" id="callsign" maxlength="12" value="${esc(settings.name)}" aria-describedby="callsign-err" /></div><div class="cr-err" id="callsign-err" aria-live="polite"></div>`);
  const seg = (id: string, key: 'sound' | 'reduce') => h.querySelectorAll(`#${id} button`).forEach(b => ((b as HTMLElement).onclick = () => {
    settings[key] = (b as HTMLElement).dataset.v === '1'; saveSettings(); applyMotion();
    h.querySelectorAll(`#${id} button`).forEach(o => o.setAttribute('aria-pressed', String(o === b))); if (key === 'sound') sfx.ok(); }));
  seg('s-sound', 'sound'); seg('s-reduce', 'reduce');
  // The same one-name rule as the character creator; settings.name is the only source for {name}.
  ($('#callsign', h) as HTMLInputElement).addEventListener('input', e => { const inp = e.target as HTMLInputElement, c = cleanNameInput(inp.value); if (c !== inp.value) inp.value = c; const v = validateName(c); ($('#callsign-err', h) as HTMLElement).textContent = v.ok ? '' : v.error; if (v.ok) { settings.name = v.name; if (settings.look) settings.look = { ...settings.look, name: v.name }; saveSettings(); } });
}
export const applyMotion = () => { document.documentElement.dataset.reduce = settings.reduce ? '1' : '0'; if (!settings.reduce) startFrame(); };

function launchAstronautQuiz() {
  openAstronautQuiz({
    playerName: () => settings.name,
    isSoundOn: () => settings.sound,
    setSoundOn: enabled => { if (settings.sound !== enabled) music.toggle(); },
    reduceMotion: () => settings.reduce,
    onOpen: () => music.set(null),
    onClose: () => music.set('menu'),
    onNameChange: name => {
      const valid = validateName(cleanNameInput(name));
      if (!valid.ok) return;
      settings.name = valid.name;
      if (settings.look) settings.look = { ...settings.look, name: valid.name };
      saveSettings();
    },
  });
}

export function initMenu(h: { play(): void; cont(): void; hasSave(): boolean }) {
  document.querySelectorAll('[data-ic]').forEach(e => { (e as HTMLElement).innerHTML = ICON[(e as HTMLElement).dataset.ic!] ?? ''; });
  initStars(); applyMotion(); startFrame(); music.set('menu');
  void initSunCard();
  $('#btn-continue').hidden = !h.hasSave();
  document.querySelectorAll('.menu-list [data-act]').forEach(b => ((b as HTMLElement).onclick = () => {
    sfx.click(); const a = (b as HTMLElement).dataset.act;
    if (a === 'play') h.play(); else if (a === 'continue') h.cont(); else if (a === 'astroquiz') launchAstronautQuiz(); else if (a === 'awards') showAwards(); else if (a === 'wiki') openWiki(); else if (a === 'help') showHelp(); else if (a === 'settings') showSettings();
  }));
}
export const menuControls = {
  show(hasSave: boolean) { $('#menu').hidden = false; $('#game').hidden = true; $('#btn-continue').hidden = !hasSave; $('#modal-host').innerHTML = ''; startFrame(); music.set('menu'); },
  hide() { starsOn = false; $('#menu').hidden = true; $('#game').hidden = false; music.set('game'); },
  redraw() { drawStars(0); },
};
