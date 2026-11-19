// Episode 1 screens: opening card, ringing intercom, the three HUD meters, comms static, the debrief with the
// decision tree, the NASA wiki, and the "Solar Forecast" DONKI card. Reads state only; actions go through the Host.
import { ICON } from './icons';
import { $, UI, bindLearning, clamp, esc, head, learnButton, overlay } from './ui';
import { settings, sfx } from './audio';
import { fillName } from '../story/name';
import { refreshObjectives } from './hud';
import { charsShown } from '../core/typewriter';
import { ALERT_LABEL, ARCHIVED_SUN, alertFor, baseEnergy, plantHealth, playerHunger } from '../core/episode';
import { MAX_SCORE, MEASURE_LABELS, masteryDetail, masteryLine, masteryScore, WEIGHTS, bonusCount, bonusResults, computeScore, type MeasureId } from '../core/score';
import { bestAndTip, consequenceLines } from '../story/consequences';
import { SHARE_NETWORKS, SHARE_TEXT, type ShareNetworkId } from '../core/share';
import { teamMorale } from '../core/crewlife';
import { WIKI } from '../story/wiki';
import type { EpisodeState, GameState, TreeNode } from '../core/types';

// {name} in any line becomes the player's name (Settings > Callsign).
export const withName = (t: string) => fillName(t, settings.name);
export function resetBonusProgress(): void {
  sessionStorage.removeItem('ep1_wiki_read');
  sessionStorage.removeItem('ep1_shared');
  sessionStorage.removeItem('ep1_shared_at'); // Step 22b: when the share happened (ms); the bonus star counts one hour later (core/score.ts)
}

export const BACKSTORY = [
  'The year is 2036. You are part of a small crew that has just landed in Hebrus Valles on Mars. Your mission is to explore this region and build the first home for future explorers.',
  'But soon after landing, a flu spreads and everyone on your team gets sick, except you. They rest in quarantine while a radiation storm races toward the base.',
  'You are the only healthy crew member. Feed everyone, fix what breaks, and watch your meters. The future of humans on Mars rests on you, recruit.',
];
/** Step 26a: the opening is a typewriter scene (about 25 characters a second). Tap or any key finishes the text, SKIP always works, CONTINUE is always there. Reduced motion shows everything at once. */
export function showOpeningCard(): Promise<void> {
  return new Promise(res => {
    const full = BACKSTORY.join('\n'), reduced = reducedMotion();
    const el = overlay('opening', `<div class="holo-panel holo-card">${head('base', 'EPISODE 1 · THE STORM', false)}<div class="panel-body"><div class="story" id="op-story" aria-label="${esc(BACKSTORY.join(' '))}"></div>
      <p class="why">Tip: every choice costs something. Watch the three meters on the left and the space weather alert.</p>
      <div class="row" style="justify-content:flex-end;gap:8px"><button class="holo-btn small" id="op-skip" type="button">SKIP</button><button class="holo-btn primary" id="op-go" type="button">CONTINUE ▸</button></div></div></div>`);
    const box = $('#op-story', el), skip = $('#op-skip', el); box.setAttribute('role', 'text');
    const draw = (n: number) => { const parts = full.slice(0, n).split('\n'); box.innerHTML = parts.map((p, i) => `<p>${esc(p)}${i === parts.length - 1 && n < full.length ? '<span class="tw-caret" aria-hidden="true"></span>' : ''}</p>`).join(''); };
    let raf = 0, t0 = 0, done = false;
    const finish = () => { if (done) return; done = true; cancelAnimationFrame(raf); draw(full.length); skip.hidden = true; document.removeEventListener('keydown', onKey, true); };
    const onKey = () => { if (!done) finish(); };
    const tick = (now: number) => { if (!t0) t0 = now; const n = charsShown(now - t0, full.length); draw(n); if (n >= full.length) finish(); else raf = requestAnimationFrame(tick); };
    const leave = () => { sfx.ok(); finish(); UI.close('opening'); res(); };
    skip.onclick = () => { sfx.click(); finish(); };
    box.onclick = () => { if (!done) finish(); };
    $('#op-go', el).onclick = leave;
    if (reduced) finish(); else { draw(0); document.addEventListener('keydown', onKey, true); raf = requestAnimationFrame(tick); }
  });
}

// ---------- the ringing intercom ----------
const RING_MAX_MS = 5 * 60 * 1000;
let ringStart = 0, ringTimer = 0;
export function ringUpdate(s: GameState) {
  const box = $('#ring'); if (!box) return;
  const ringing = !!s.ep && s.ep.call === 'ringing' && s.ep.phase === 'call' && !UI.stack.includes('opening'); // not while the backstory is up
  if (!ringing) { box.hidden = true; if (ringTimer) { clearInterval(ringTimer); ringTimer = 0; } ringStart = 0; return; }
  if (box.hidden) {
    box.hidden = false; ringStart = performance.now(); box.classList.remove('quiet');
    if (!ringTimer) ringTimer = window.setInterval(() => { if (performance.now() - ringStart < RING_MAX_MS) sfx.ring(); }, 2600);
  }
  if (performance.now() - ringStart >= RING_MAX_MS) box.classList.add('quiet'); // goes quiet after 5 real minutes, icon stays lit
}

// ---------- the three meters + space weather chip ----------
export function refreshEpHud(s: GameState) {
  const bar = $('#ep-bar'); if (!bar) return;
  bar.hidden = !s.ep;
  if (!s.ep) return;
  const set = (id: string, v: number) => {
    const el = $('#' + id);
    el.classList.remove('warn', 'low', 'crit');
    if (v < 20) el.classList.add('crit'); else if (v < 40) el.classList.add('low'); else if (v < 65) el.classList.add('warn');
    (el.querySelector('.bar i') as HTMLElement).style.width = clamp(v, 0, 100) + '%';
    el.setAttribute('aria-valuenow', String(Math.round(v)));
  };
  set('epm-energy', baseEnergy(s)); set('epm-health', s.health); set('epm-hunger', 100 - playerHunger(s)); set('epm-morale', teamMorale(s));
  const morale = teamMorale(s), moraleMeter = $('#epm-morale');
  const mood = morale < 35 ? 'angry' : morale >= 65 ? 'happy' : 'neutral';
  moraleMeter.dataset.mood = mood;
  moraleMeter.setAttribute('aria-valuetext', `${Math.round(morale)} out of 100, ${mood}`);
  const moodIcon = $('#epm-morale-icon');
  if (moodIcon.dataset.mood !== mood) {
    moodIcon.dataset.mood = mood;
    moodIcon.innerHTML = `<span>${ICON[mood]}</span>`;
  }
  const a = alertFor(s), solar = $('#ep-alert');
  const strength = { low: 0, elevated: 55, high: 100, storm: 100 }[a];
  const runInside = s.outside && (a === 'high' || a === 'storm');
  solar.className = `epm solar-meter ${a}${runInside ? ' run' : ''}`;
  (solar.querySelector('.bar i') as HTMLElement).style.width = `${strength}%`;
  solar.setAttribute('aria-valuenow', String(strength));
  solar.setAttribute('aria-valuetext', runInside ? `${ALERT_LABEL[a]}, run inside` : ALERT_LABEL[a]);
}

// ---------- comms during the storm: static and one clue per Sol ----------
const STATIC_CLUES: Record<number, string> = { 2: '…st—w the pa— —ls before th— pe—…', 3: '…radiation p—k has passed… h—ld on…', 4: '…dust clear—ng by morn—ng… proud of y—…' };
export function staticText(sol: number) {
  const junk = () => Array.from({ length: 34 }, () => '▒░▓ ·'[Math.floor(Math.random() * 5)]).join('');
  return `${junk()}\n${STATIC_CLUES[sol] ?? '…'}\n${junk()}`;
}

// ---------- debrief ----------
const tone = (n: TreeNode) => n.tone;
function renderTree(tree: TreeNode[]): string {
  const ids = new Set(tree.map(n => n.id));
  const kids = (id: string) => tree.filter(n => n.cause === id);
  const node = (n: TreeNode): string => `<div class="tnode ${tone(n)}"><div class="sol">SOL ${n.sol}</div>${esc(n.text)}${kids(n.id).length ? `<div class="tkids">${kids(n.id).map(k => `<div class="tkid ${tone(k)}">${esc(k.text)}${kids(k.id).map(g => `<div class="tkids"><div class="tkid ${tone(g)}">${esc(g.text)}</div></div>`).join('')}</div>`).join('')}</div>` : ''}</div>`;
  const roots = tree.filter(n => !n.cause || !ids.has(n.cause));
  return roots.map(node).join('');
}
// Step 22c: original line glyphs (not brand logos), 16px, drawn with currentColor.
const svg16 = (d: string) => `<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const SHARE_ICON: Record<ShareNetworkId | 'link', string> = {
  whatsapp: svg16('<path d="M2.5 13.5l.9-3A5.6 5.6 0 1 1 5.5 12.6z"/><path d="M6 6.2c.2 1.6 1.6 3 3.4 3.6"/>'),
  x: svg16('<path d="M3 3l10 10M13 3L3 13"/>'),
  facebook: svg16('<circle cx="8" cy="8" r="6.2"/><path d="M9.6 13.8V8.6h1.6M6.8 8.6h4.4M8.6 8.6V6.9c0-1 .5-1.5 1.5-1.5h.8"/>'),
  email: svg16('<rect x="2" y="3.5" width="12" height="9" rx="1.5"/><path d="M2.5 4.5L8 9l5.5-4.5"/>'),
  link: svg16('<path d="M6.8 9.2a2.6 2.6 0 0 0 3.7 0l2-2a2.6 2.6 0 0 0-3.7-3.7l-.8.8"/><path d="M9.2 6.8a2.6 2.6 0 0 0-3.7 0l-2 2a2.6 2.6 0 0 0 3.7 3.7l.8-.8"/>'),
};
const meterClass = (n: number) => (n < 35 ? 'low' : n < 65 ? 'mid' : 'high');
const reducedMotion = () => document.documentElement.dataset.reduce === '1' || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion:reduce)').matches);
const readSharedAt = (): number | null => { const v = sessionStorage.getItem('ep1_shared_at'); const n = v === null ? NaN : Number(v); return Number.isFinite(n) ? n : null; };
export function showDebrief(s: GameState, onReplay: () => void, onMenu: () => void): void {
  const ep = s.ep!;
  const sc = computeScore(s), { best, tip } = bestAndTip(sc.measures), conseq = consequenceLines(s);
  const reduce = reducedMotion();
  const bonus = () => bonusResults(s, { wikiRead: sessionStorage.getItem('ep1_wiki_read') === '1', sharedAt: readSharedAt(), now: Date.now() });
  const bonusSlots = (rs: ReturnType<typeof bonus>, animate: boolean) => `<div class="bonus-sky" id="bonus-sky">${rs.map((b, i) => `<div class="bstar ${b.done ? 'earned' : 'missed'}${b.done && animate ? ' pending' : ''}" data-i="${i}"><span class="bs-star" aria-hidden="true">${b.done ? '★' : '☆'}</span><span class="bs-label">${esc(b.label)}${b.done ? '' : '<small>Not earned yet</small>'}</span></div>`).join('')}</div>`;
  const shareNote = (rs: ReturnType<typeof bonus>) => { const sh = rs.find(r => r.id === 'share'); return sh && sh.done && !sh.counts ? 'The share star is lit now and counts toward your bonus total one hour after you shared.' : ''; };
  const shareText = SHARE_TEXT;
  UI.close('inspect'); UI.close('control'); // the panel used for the last action should not sit under the debrief
  sfx.win();
  const rs0 = bonus();
  const ids = Object.keys(WEIGHTS) as MeasureId[];
  const el = overlay('debrief', `<div class="holo-panel holo-card mission-card">${head('sun', 'EPISODE 1 COMPLETE', false)}<div class="panel-body">
    <div class="stars" aria-label="${sc.stars} of 3 stars">${'★'.repeat(sc.stars)}<span style="opacity:.25">${'★'.repeat(3 - sc.stars)}</span></div>
    <div class="score-line" aria-label="Score ${sc.score} out of ${MAX_SCORE}">SCORE <b>${sc.score}</b> / ${MAX_SCORE}</div>
    <div class="mastery-badge" aria-label="${masteryLine(s)}, ${masteryDetail(s)}"><b>${masteryScore(s)}</b><span>${masteryLine(s)}<small>${masteryDetail(s)}</small></span></div>
    <div class="measure-bars" role="list">${ids.map(id => `<div class="mbar ${meterClass(sc.measures[id])}" role="listitem" aria-label="${MEASURE_LABELS[id]} ${sc.measures[id]} out of 100"><span class="ml">${MEASURE_LABELS[id]}</span><div class="mtrack"><i style="--w:${sc.measures[id]}%"></i></div><b>${sc.measures[id]}</b></div>`).join('')}</div>
    <p class="line"><b>${esc(best.text)}</b> Next time: ${esc(tip.text)}</p>
    <h4>What your choices caused</h4><ul class="conseq">${conseq.map(c => `<li><b>${esc(c.topic)}</b>${esc(c.text)}</li>`).join('')}</ul>
    <h4>Bonus stars <span class="bonus-count" id="bonus-count">${bonusCount(rs0)} of ${rs0.length}</span></h4><div id="bonus-wrap">${bonusSlots(rs0, !reduce)}</div><p class="share-note" id="share-note">${esc(shareNote(rs0))}</p>
    <div class="share-card"><b>SHARE YOUR MISSION</b><p>${esc(shareText)}</p><div class="share-actions">${SHARE_NETWORKS.map(n => `<a class="holo-btn small share-btn" ${n.external ? 'target="_blank" rel="noopener" ' : ''}href="${n.href}" data-share aria-label="Share on ${n.label}">${SHARE_ICON[n.id]}<span>${n.label}</span></a>`).join('')}<button class="holo-btn small share-btn" id="db-copy" aria-label="Copy link">${SHARE_ICON.link}<span>COPY LINK</span></button></div><div id="share-status" aria-live="polite"></div></div>
    <button class="holo-btn amber play-again" id="db-replay">PLAY AGAIN ▸</button><p class="play-again-note">A clean Episode 1. Your awards and leaderboard stay.</p>
    <h4>Your decisions and what they caused</h4><div class="tree">${renderTree(ep.tree)}</div>
    <p class="why">${ep.passOuts ? `You passed out ${ep.passOuts} time${ep.passOuts > 1 ? 's' : ''} and restarted from a checkpoint. ` : ''}The storm was modelled on a real solar flare in NASA's DONKI catalogue (class ${esc(ep.sun.classType)}, ${esc(ep.sun.date)}, ${ep.sun.source === 'live' ? 'read live' : 'archived'}). ${learnButton('donki_live')}</p>

    <div class="db-actions"><button class="holo-btn small" id="db-wiki">${ICON.doc} NASA WIKI</button><button class="holo-btn small" id="db-menu">MAIN MENU</button></div></div></div></div></div>`);
  bindLearning(el);
  // Bars fill, then each earned bonus star zooms in from far away with a glowing trail, a thump and a small shake. Missed goals stay dim.
  const card = el.querySelector('.mission-card') as HTMLElement, live = () => el.isConnected;
  const run = (ms: number, fn: () => void) => { if (reduce) fn(); else window.setTimeout(() => { if (live()) fn(); }, ms); };
  run(80, () => el.querySelectorAll('.mbar').forEach(b => b.classList.add('go')));
  const earned = Array.from(el.querySelectorAll<HTMLElement>('.bstar.pending'));
  earned.forEach((n, k) => run(1100 + k * 750, () => {
    n.classList.remove('pending'); n.classList.add('zoom'); sfx.thump();
    card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
    window.setTimeout(() => card.classList.remove('shake'), 340);
  }));
  const markShared = () => {
    sessionStorage.setItem('ep1_shared', '1'); if (readSharedAt() === null) sessionStorage.setItem('ep1_shared_at', String(Date.now()));
    const status = $('#share-status', el); if (status) status.textContent = '★ Share star lit!';
    const rs = bonus(); $('#bonus-wrap', el).innerHTML = bonusSlots(rs, false); $('#bonus-count', el).textContent = `${bonusCount(rs)} of ${rs.length}`; $('#share-note', el).textContent = shareNote(rs);
    el.querySelectorAll('.bstar.earned').forEach(n => n.classList.add('zoom', 'settled'));
  };
  el.querySelectorAll('[data-share]').forEach(a => (a as HTMLElement).addEventListener('click', markShared));
  $('#db-copy', el).onclick = async () => {
    const status = $('#share-status', el);
    let ok = false;
    try { await navigator.clipboard.writeText(shareText); ok = true; } catch { /* clipboard blocked: try the old way below */ }
    if (!ok) { // fallback: select the text in a hidden field and copy it
      try { const t = document.createElement('textarea'); t.value = shareText; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;opacity:0;top:0;left:0'; document.body.appendChild(t); t.select(); ok = document.execCommand('copy'); t.remove(); } catch { ok = false; }
    }
    if (ok) { markShared(); status.textContent = 'Link copied. ★ Share star lit!'; }
    else status.textContent = `Could not copy here. Copy this by hand: ${shareText}`; // honest: no star until it was really shared
  };
  $('#db-wiki', el).onclick = () => { sfx.click(); openWiki(); };
  $('#db-replay', el).onclick = () => { sfx.ok(); UI.close('debrief'); onReplay(); };
  $('#db-menu', el).onclick = () => { sfx.click(); UI.close('debrief'); onMenu(); };
}

// ---------- NASA wiki ----------
export function openWiki(section?: string) {
  const sec = (w: typeof WIKI[number]) => `<h3 id="wiki-${w.id}">${ICON[w.icon] ?? ''} ${esc(w.title)}</h3><p class="why">${esc(w.intro)}</p>${w.links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.title)} ↗<span>${esc(l.blurb)}</span></a>`).join('')}`;
  const el = overlay('wiki', `<div class="holo-panel"><div class="panel-head"><span class="hico">${ICON.doc}</span><h2>Living in space: the NASA wiki</h2><button class="close-x" data-close aria-label="Close">×</button></div><div class="panel-body wiki">
    <p class="why">Real NASA pages for anyone who wants to go deeper. Links open in a new tab and need the internet. The game itself works offline.</p>
    <div class="row">${WIKI.map(w => `<button class="holo-btn small" data-jump="${w.id}">${esc(w.title.split(':')[0])}</button>`).join('')}</div>
    ${WIKI.map(sec).join('')}</div></div>`);
  el.querySelectorAll('[data-jump]').forEach(b => ((b as HTMLElement).onclick = () => { sfx.click(); $(`#wiki-${(b as HTMLElement).dataset.jump}`, el)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
  el.querySelectorAll('.wiki a').forEach(a => a.addEventListener('click', () => { sessionStorage.setItem('ep1_wiki_read', '1'); refreshObjectives(); }));
  if (section) $(`#wiki-${section}`, el)?.scrollIntoView();
}

// ---------- Solar forecast (NASA DONKI, live when online) ----------
export type Sun = EpisodeState['sun'];
const rank = (c: string) => ('ABCMX'.indexOf(c[0]) + 1) * 100 + parseFloat(c.slice(1) || '0');
export async function fetchTodaysSun(): Promise<{ sun: Sun; count: number; fetchedAt: Date } | null> {
  try {
    const end = new Date(), start = new Date(end.getTime() - 30 * 86400000), d = (x: Date) => x.toISOString().slice(0, 10);
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(`https://ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR?startDate=${d(start)}&endDate=${d(end)}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    const list = (await r.json()) as { flrID: string; classType: string; peakTime: string }[];
    if (!Array.isArray(list) || !list.length) return null;
    const top = list.reduce((a, b) => (rank(b.classType) > rank(a.classType) ? b : a));
    return { sun: { source: 'live', flrID: top.flrID, classType: top.classType, date: top.peakTime.slice(0, 10) }, count: list.length, fetchedAt: new Date() };
  } catch { return null; }
}
export const sunChoice: { sun: Sun } = { sun: ARCHIVED_SUN };
let solarForecastDetails: { count: number; fetchedAt: Date } | null = null;
let solarForecastLoaded = false;

function solarWarning(sun: Sun) {
  const type = sun.classType[0];
  if (type === 'X') return { text: 'STORM INCOMING', level: 'danger', alert: 'DANGEROUS' };
  if (type === 'M') return { text: 'SOLAR ALERT', level: 'alert', alert: 'HIGH' };
  return { text: 'SOLAR QUIET', level: 'safe', alert: 'SAFE' };
}

export function openSolarForecast() {
  const sun = sunChoice.sun, warning = solarWarning(sun);
  const sourceTag = !solarForecastLoaded
    ? '<span class="tag emb">CHECKING NASA DONKI</span>'
    : sun.source === 'live' ? '<span class="tag live">LIVE · NASA DONKI</span>' : '<span class="tag arch">ARCHIVED · NASA DONKI</span>';
  const flareDetails = !solarForecastLoaded
    ? '<p>Checking NASA DONKI for solar activity…</p>'
    : sun.source === 'live'
      ? `<p>In the last 30 days, NASA DONKI recorded ${solarForecastDetails!.count} solar flares. The strongest was <b>class ${esc(sun.classType)}</b> on ${esc(sun.date)}. Fetched ${esc(solarForecastDetails!.fetchedAt.toLocaleTimeString())}.</p>`
      : '<p>NASA DONKI could not be reached. The game uses its archived record of the real <b>X9.0 flare</b> from 3 Oct 2024.</p>';
  const guidance = warning.level === 'danger'
    ? 'Strong flare activity: stay inside the habitat, move to a shielded area, and turn off nonessential equipment to save power. Keep life-support systems on.'
    : warning.level === 'alert'
      ? 'Solar activity is elevated: stay inside during mission alerts and use available water shielding. Keep essential systems powered.'
      : 'Conditions are calm. No extra steps are needed right now—keep checking mission alerts.';
  const el = overlay('solar-forecast', `<div class="holo-panel">${head('sun', 'Solar Forecast')}<div class="panel-body">
    ${sourceTag}
    <div class="card solar-status" data-alert="${warning.level}"><h3>${warning.alert}</h3>${flareDetails}</div>
    <div><h4>What you can do</h4><p class="why">${guidance}</p></div>
    <p class="why">DONKI records solar flares observed near Earth; it does not measure radiation at Mars. This card is information only: the Solar Alert in the game follows its own script and is never changed by live data.</p>
    <a class="holo-btn small amber" href="https://ccmc.gsfc.nasa.gov/tools/DONKI/" target="_blank" rel="noopener noreferrer">OPEN NASA DONKI ↗</a>
    <a class="holo-btn small" href="https://www.nasa.gov/science-research/heliophysics/real-martians-how-to-protect-astronauts-from-space-radiation-on-mars/" target="_blank" rel="noopener noreferrer">READ NASA RADIATION GUIDANCE ↗</a>
  </div></div>`);
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Solar Forecast details');
  (el.querySelector('[data-close]') as HTMLElement | null)?.focus();
  return el;
}

export async function initSunCard() {
  const card = $('#sun-card'); if (!card) return;
  card.onclick = () => { sfx.click(); openSolarForecast(); };
  const live = await fetchTodaysSun();
  if (live) {
    sunChoice.sun = live.sun;
    solarForecastDetails = { count: live.count, fetchedAt: live.fetchedAt };
  } else {
    sunChoice.sun = ARCHIVED_SUN;
  }
  solarForecastLoaded = true;
  const warning = solarWarning(sunChoice.sun);
  const label = $('#sun-label', card);
  if (label) label.textContent = warning.text;
  card.dataset.alert = warning.level;
  card.setAttribute('aria-label', `Solar warning: ${warning.text}. Click for flare details and NASA DONKI source.`);
  card.setAttribute('aria-busy', 'false');
}
export const chosenSun = (): Sun => sunChoice.sun;
export { plantHealth };
