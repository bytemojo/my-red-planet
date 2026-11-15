// Episode 1 screens: opening card, ringing intercom, the three HUD meters, comms static, the debrief with the
// decision tree, the NASA wiki, and the "Solar Forecast" DONKI card. Reads state only; actions go through the Host.
import { ICON } from './icons';
import { $, UI, bindLearning, clamp, esc, head, learnButton, overlay } from './ui';
import { settings, sfx } from './audio';
import { fillName } from '../story/name';
import { ALERT_LABEL, ARCHIVED_SUN, alertFor, baseEnergy, plantHealth } from '../core/episode';
import { teamMorale } from '../core/crewlife';
import { WIKI } from '../story/wiki';
import type { EpisodeState, GameState, TreeNode } from '../core/types';

// {name} in any line becomes the player's name (Settings > Callsign).
export const withName = (t: string) => fillName(t, settings.name);
export function bonusGoals(s: GameState): { label: string; done: boolean }[] {
  return [
    { label: 'Keep team morale high', done: teamMorale(s) >= 70 },
    { label: 'Write a note in your journal', done: !!s.notes?.some(n => n.text.trim()) },
    { label: 'Read a NASA source', done: sessionStorage.getItem('ep1_wiki_read') === '1' },
    { label: 'Share the mission with a friend', done: sessionStorage.getItem('ep1_shared') === '1' },
    { label: 'Keep the plants healthy', done: plantHealth(s) >= 75 },
  ];
}
export function resetBonusProgress(): void {
  sessionStorage.removeItem('ep1_wiki_read');
  sessionStorage.removeItem('ep1_shared');
}

export const BACKSTORY = [
  'The year is 2036. You are part of a NASA mission to explore the Hebrus Valles region on Mars and build the foundation for future human habitation.',
  'But soon after landing, the flu leaves everyone on your team sick except you. As the only healthy crew member on the base and a radiation storm approaching, the future of humanity on Mars now rests on you. Do your best, recruit.',
];
export function showOpeningCard(): Promise<void> {
  return new Promise(res => {
    const el = overlay('opening', `<div class="holo-panel holo-card">${head('base', 'EPISODE 1 · THE STORM', false)}<div class="panel-body"><div class="story">${BACKSTORY.map(p => `<p>${esc(p)}</p>`).join('')}</div>
      <p class="why">Tip: every choice costs something. Watch the three meters on the left and the space weather alert.</p>
      <div class="row" style="justify-content:flex-end"><button class="holo-btn primary" id="op-go">CONTINUE ▸</button></div></div></div>`);
    $('#op-go', el).onclick = () => { sfx.ok(); UI.close('opening'); res(); };
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
  set('epm-energy', baseEnergy(s)); set('epm-health', s.health); set('epm-morale', teamMorale(s));
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
export function showDebrief(s: GameState, onReplay: () => void, onMenu: () => void): void {
  const ep = s.ep!, r = ep.result!;
  const bonusRows = () => {
    return `<div class="bonus-grid">${bonusGoals(s).map(({ label, done }) => `<div class="bonus-goal ${done ? 'earned' : ''}"><span>${done ? '★' : '☆'}</span>${esc(label)}</div>`).join('')}</div>`;
  };
  const shareText = 'Play this fun Mars colony game with me at https://myredplanet.vercel.app/';
  const shareLink = encodeURIComponent('https://myredplanet.vercel.app/');
  const shareCopy = encodeURIComponent(shareText);
  UI.close('inspect'); UI.close('control'); // the panel used for the last action should not sit under the debrief
  sfx.win();
  const el = overlay('debrief', `<div class="holo-panel holo-card">${head('sun', 'EPISODE 1 COMPLETE', false)}<div class="panel-body">
    <div class="stars" aria-label="${r.stars} of 3 stars">${'★'.repeat(r.stars)}<span style="opacity:.25">${'★'.repeat(3 - r.stars)}</span></div>
    <div class="metrics"><div>Team morale<b>${r.morale}</b></div><div>Base energy<b>${r.power}</b></div><div>Plant health<b>${r.plants}</b></div><div>Your health<b>${r.health}</b></div></div>
    <p class="line"><b>${esc(r.best)}</b> ${esc(r.tip)}</p>
    <h4>Bonus objectives</h4>${bonusRows()}
    <h4>Your decisions and what they caused</h4><div class="tree">${renderTree(ep.tree)}</div>
    <p class="why">${ep.passOuts ? `You passed out ${ep.passOuts} time${ep.passOuts > 1 ? 's' : ''} and restarted from a checkpoint. ` : ''}The storm was modelled on a real solar flare in NASA's DONKI catalogue (class ${esc(ep.sun.classType)}, ${esc(ep.sun.date)}, ${ep.sun.source === 'live' ? 'read live' : 'archived'}). ${learnButton('donki_live')}</p>
    <div class="share-card"><b>SHARE YOUR MISSION</b><p>${esc(shareText)}</p><div class="share-actions"><a class="holo-btn small" target="_blank" rel="noopener" href="https://wa.me/?text=${shareCopy}" data-share>WhatsApp</a><a class="holo-btn small" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${shareCopy}" data-share>𝕏</a><a class="holo-btn small" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${shareLink}" data-share>Facebook</a><button class="holo-btn small" id="db-copy">COPY LINK</button></div><div id="share-status" aria-live="polite"></div></div>
    <div class="db-actions"><button class="holo-btn small" id="db-wiki">${ICON.doc} NASA WIKI</button><div class="grp"><button class="holo-btn small" id="db-menu">MAIN MENU</button><button class="holo-btn small amber" id="db-replay">PLAY AGAIN ▸</button></div></div></div></div></div>`);
  bindLearning(el);
  const markShared = () => { sessionStorage.setItem('ep1_shared', '1'); const status = $('#share-status', el); if (status) status.textContent = '★ Share bonus earned!'; const goals = el.querySelector('.bonus-grid'); if (goals) goals.outerHTML = bonusRows(); };
  el.querySelectorAll('[data-share]').forEach(a => (a as HTMLElement).addEventListener('click', markShared));
  $('#db-copy', el).onclick = async () => { try { await navigator.clipboard.writeText(shareText); $('#share-status', el).textContent = 'Link copied. ★ Share bonus earned!'; markShared(); } catch { $('#share-status', el).textContent = shareText; } };
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
  el.querySelectorAll('.wiki a').forEach(a => a.addEventListener('click', () => sessionStorage.setItem('ep1_wiki_read', '1')));
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
    <p class="why">DONKI records solar flares observed near Earth; it does not measure radiation at Mars.</p>
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
