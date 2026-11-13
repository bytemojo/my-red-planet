import { ICON } from './icons';
import { music, settings, saveSettings, sfx } from './audio';
import { $, esc } from './ui';
import manifest from '../data/manifest.json';
import type { GameState } from '../core/types';

const store = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem('mrp.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem('mrp.' + k, JSON.stringify(v)); } catch { /* ignore */ } },
};

// ---------- awards and leaderboard (device-local) ----------
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
export function recordRun(score: number, sols: number) {
  const b = store.get<{ name: string; score: number; sols: number }[]>('board', []);
  b.push({ name: settings.name, score, sols }); b.sort((x, y) => y.score - x.score); store.set('board', b.slice(0, 5));
}

// ---------- starfield (ported) ----------
let starRAF = 0, starsOn = true, drawStars: (t: number) => void = () => {}, startFrame: () => void = () => {};
function initStars() {
  const c = $('#stars') as HTMLCanvasElement, x = c.getContext('2d')!; let w = 0, h = 0, nextShooting = 0, stars: { x: number; y: number; r: number; p: number; s: number }[] = [];
  const size = () => { const r = Math.min(devicePixelRatio || 1, 2); w = c.clientWidth; h = c.clientHeight; c.width = w * r; c.height = h * r; x.setTransform(r, 0, 0, r, 0, 0);
    stars = Array.from({ length: Math.round((w * h) / 4200) }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.4 + 0.2, p: Math.random() * 6.28, s: Math.random() * 0.7 + 0.2 })); };
  const draw = (t: number) => {
    x.clearRect(0, 0, w, h); const R = Math.min(w, h) * 0.75, cx = w * 0.8, cy = h + R * 0.42;
    for (const s of stars) { const a = .68 + .25 * Math.sin((t / 1400) * s.s + s.p); x.globalAlpha = a; x.fillStyle = s.r > 1.1 ? '#cfeeff' : '#ffffff'; x.beginPath(); x.arc(s.x, s.y, s.r, 0, 6.283); x.fill(); }
    if (t > nextShooting) { nextShooting = t + 25000 + Math.random() * 50000; const sx = Math.random() * w * .65, sy = 40 + Math.random() * h * .35; x.globalAlpha = .85; x.strokeStyle = '#e9f9ff'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + 70, sy + 24); x.stroke(); }
    const g = x.createRadialGradient(cx - R * 0.3, cy - R * 0.45, R * 0.08, cx, cy, R); g.addColorStop(0, '#e5835a'); g.addColorStop(0.55, '#8c3a22'); g.addColorStop(1, '#1d0a08');
    x.save(); x.beginPath(); x.arc(cx, cy, R, 0, 6.283); x.fillStyle = '#3f130d'; x.fill(); x.fillStyle = g; x.fill(); x.shadowColor = 'rgba(57,217,255,.8)'; x.shadowBlur = 34; x.lineWidth = 3; x.strokeStyle = 'rgba(57,217,255,.6)'; x.stroke(); x.restore();
    x.globalAlpha = 1;
  };
  const frame = (t: number) => { if (!starsOn) { starRAF = 0; return; } draw(t); starRAF = settings.reduce ? 0 : requestAnimationFrame(frame); };
  size(); addEventListener('resize', () => { size(); if (!starRAF) draw(0); });
  drawStars = draw; startFrame = () => { starsOn = true; if (!starRAF) frame(performance.now()); }; draw(0);
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
function showBoard() {
  const b = store.get<{ name: string; score: number; sols: number }[]>('board', []);
  menuModal('Leaderboard', `<p style="margin:0;color:#a9cfe2">Best stage scores on this device.</p>${b.length ? `<table class="lb"><tr><th>#</th><th>Name</th><th>Sols</th><th>Score</th></tr>${b.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.name)}</td><td>${r.sols}</td><td>${r.score}</td></tr>`).join('')}</table>` : '<p>No scores yet. Finish a stage to get on the board.</p>'}`);
}
function showHelp() {
  const tag = (k: string, v: boolean) => k === 'dev-fallback' ? '<span class="tag arch">DEV FALLBACK</span>' : `<span class="tag ${v ? 'live' : 'emb'}">${v ? 'VERIFIED' : 'NOT YET VERIFIED'}</span>`;
  menuModal('Help', `<div class="help"><h4>Your job</h4><p>The crew is sick, so you run the outpost. Keep air, water, food and power up. Grow food, build, explore and open the cave.</p>
    <h4>Controls</h4><ul><li>Click or tap the ground: walk there</li><li>Click or tap a station: walk over and use it</li><li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrows: walk</li><li><kbd>E</kbd>: use the nearby station</li><li><kbd>C</kbd>: Control Module</li><li>Phone or tablet: drag to walk too</li></ul>
    <h4>Rules of Mars</h4><ul><li>Every action costs your energy. Sleep to refill.</li><li>Nothing is free. Every choice costs something.</li><li>Outside, watch suit air and radiation.</li><li>The Time Machine lets you rewind your choices, never the weather.</li></ul>
    <h4>Data sources</h4>${manifest.datasets.map(d => `<div class="src"><b>${esc(d.name)} ${tag(d.kind, d.verified)}</b><span>${esc(d.limitations)}</span></div>`).join('')}</div>`);
}
function showSettings() {
  const h = menuModal('Settings', `<div class="setting"><span class="lab">Sound</span><div class="seg" id="s-sound"><button data-v="1" aria-pressed="${settings.sound}">On</button><button data-v="0" aria-pressed="${!settings.sound}">Off</button></div></div>
    <div class="setting"><span class="lab">Reduce motion</span><div class="seg" id="s-reduce"><button data-v="1" aria-pressed="${settings.reduce}">On</button><button data-v="0" aria-pressed="${!settings.reduce}">Off</button></div></div>
    <div class="setting"><label class="lab" for="callsign">Callsign</label><input type="text" id="callsign" maxlength="12" value="${esc(settings.name)}" /></div>`);
  const seg = (id: string, key: 'sound' | 'reduce') => h.querySelectorAll(`#${id} button`).forEach(b => ((b as HTMLElement).onclick = () => {
    settings[key] = (b as HTMLElement).dataset.v === '1'; saveSettings(); applyMotion();
    h.querySelectorAll(`#${id} button`).forEach(o => o.setAttribute('aria-pressed', String(o === b))); if (key === 'sound') sfx.ok(); }));
  seg('s-sound', 'sound'); seg('s-reduce', 'reduce');
  ($('#callsign', h) as HTMLInputElement).addEventListener('input', e => { settings.name = (e.target as HTMLInputElement).value.replace(/[^\w \-]/g, '').slice(0, 12) || 'Rookie'; saveSettings(); });
}
export const applyMotion = () => { document.documentElement.dataset.reduce = settings.reduce ? '1' : '0'; if (!settings.reduce) startFrame(); };

export function initMenu(h: { play(): void; cont(): void; hasSave(): boolean }) {
  document.querySelectorAll('[data-ic]').forEach(e => { (e as HTMLElement).innerHTML = ICON[(e as HTMLElement).dataset.ic!] ?? ''; });
  initStars(); applyMotion(); startFrame(); music.set('menu');
  $('#btn-continue').hidden = !h.hasSave();
  document.querySelectorAll('.menu-list [data-act]').forEach(b => ((b as HTMLElement).onclick = () => {
    sfx.click(); const a = (b as HTMLElement).dataset.act;
    if (a === 'play') h.play(); else if (a === 'continue') h.cont(); else if (a === 'awards') showAwards(); else if (a === 'board') showBoard(); else if (a === 'help') showHelp(); else if (a === 'settings') showSettings();
  }));
}
export const menuControls = {
  show(hasSave: boolean) { $('#menu').hidden = false; $('#game').hidden = true; $('#btn-continue').hidden = !hasSave; $('#modal-host').innerHTML = ''; startFrame(); music.set('menu'); },
  hide() { starsOn = false; $('#menu').hidden = true; $('#game').hidden = false; music.set('game'); },
  redraw() { drawStars(0); },
};
