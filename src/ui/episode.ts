// Episode 1 screens: opening card, ringing intercom, the three HUD meters, comms static, the debrief with the
// decision tree, the NASA wiki, and the "Today's Sun" DONKI card. Reads state only; actions go through the Host.
import { ICON } from './icons';
import { $, UI, bindLearning, clamp, esc, head, learnButton, overlay } from './ui';
import { settings, sfx } from './audio';
import { ALERT_LABEL, ARCHIVED_SUN, alertFor, baseEnergy, plantHealth } from '../core/episode';
import { teamMorale } from '../core/crewlife';
import { WIKI } from '../story/wiki';
import type { EpisodeState, GameState, TreeNode } from '../core/types';

// {name} in any line becomes the player's name (Settings > Callsign).
export const withName = (t: string) => t.replace(/\{name\}/g, settings.name || 'Rookie');

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
let ringStart = 0, ringTimer = 0, ringMuted = false;
export function ringUpdate(s: GameState) {
  const box = $('#ring'); if (!box) return;
  const ringing = !!s.ep && s.ep.call === 'ringing' && s.ep.phase === 'call' && !UI.stack.includes('opening'); // not while the backstory is up
  if (!ringing) { box.hidden = true; if (ringTimer) { clearInterval(ringTimer); ringTimer = 0; } ringStart = 0; return; }
  if (box.hidden) {
    box.hidden = false; ringStart = performance.now(); ringMuted = false; box.classList.remove('quiet');
    $('#ring-mute').onclick = () => { ringMuted = !ringMuted; $('#ring-mute').textContent = ringMuted ? '🔔' : '🔕'; };
    if (!ringTimer) ringTimer = window.setInterval(() => { if (!ringMuted && performance.now() - ringStart < RING_MAX_MS) sfx.ring(); }, 2600);
  }
  if (performance.now() - ringStart >= RING_MAX_MS) box.classList.add('quiet'); // goes quiet after 5 real minutes, icon stays lit
}

// ---------- the three meters + space weather chip ----------
export function refreshEpHud(s: GameState) {
  const bar = $('#ep-bar'); if (!bar) return;
  bar.hidden = !s.ep;
  if (!s.ep) return;
  const set = (id: string, v: number) => { const el = $('#' + id); el.classList.remove('warn', 'crit'); if (v < 20) el.classList.add('crit'); else if (v < 40) el.classList.add('warn'); (el.querySelector('.bar i') as HTMLElement).style.width = clamp(v, 0, 100) + '%'; el.querySelector('b')!.textContent = String(Math.round(v)); };
  set('epm-energy', baseEnergy(s)); set('epm-health', s.health); set('epm-morale', teamMorale(s));
  const a = alertFor(s), chip = $('#ep-alert');
  chip.className = 'sw ' + a + (s.outside && (a === 'high' || a === 'storm') ? ' run' : '');
  chip.textContent = s.outside && (a === 'high' || a === 'storm') ? '☢ RUN INSIDE!' : `SPACE WEATHER · ${ALERT_LABEL[a]}`;
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
  UI.close('inspect'); UI.close('control'); // the panel used for the last action should not sit under the debrief
  sfx.win();
  const el = overlay('debrief', `<div class="holo-panel holo-card">${head('sun', 'EPISODE 1 COMPLETE', false)}<div class="panel-body">
    <div class="stars" aria-label="${r.stars} of 3 stars">${'★'.repeat(r.stars)}<span style="opacity:.25">${'★'.repeat(3 - r.stars)}</span></div>
    <div class="metrics"><div>Team morale<b>${r.morale}</b></div><div>Base energy<b>${r.power}</b></div><div>Plant health<b>${r.plants}</b></div><div>Your health<b>${r.health}</b></div></div>
    <p class="line"><b>${esc(r.best)}</b> ${esc(r.tip)}</p>
    <h4>Your decisions and what they caused</h4><div class="tree">${renderTree(ep.tree)}</div>
    <p class="why">${ep.passOuts ? `You passed out ${ep.passOuts} time${ep.passOuts > 1 ? 's' : ''} and restarted from a checkpoint. ` : ''}The storm was modelled on a real solar flare in NASA's DONKI catalogue (class ${esc(ep.sun.classType)}, ${esc(ep.sun.date)}, ${ep.sun.source === 'live' ? 'read live' : 'archived'}). ${learnButton('donki_live')}</p>
    <div class="db-actions"><button class="holo-btn small" id="db-wiki">${ICON.doc} NASA WIKI</button><div class="grp"><button class="holo-btn small" id="db-menu">MAIN MENU</button><button class="holo-btn small amber" id="db-replay">REPLAY WITH A DIFFERENT PLAN ▸</button></div></div></div></div></div>`);
  bindLearning(el);
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
  if (section) $(`#wiki-${section}`, el)?.scrollIntoView();
}

// ---------- Today's Sun (NASA DONKI, live when online) ----------
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
export const sunChoice: { sun: Sun; useLive: boolean } = { sun: ARCHIVED_SUN, useLive: true };
export async function initSunCard() {
  const card = $('#sun-card'); if (!card) return;
  const live = await fetchTodaysSun();
  if (live) {
    sunChoice.sun = live.sun;
    const peak = live.sun.classType[0] === 'X' ? 'STORM' : live.sun.classType[0] === 'M' ? 'HIGH' : 'ELEVATED';
    card.innerHTML = `<b>Today's Sun</b> <span class="tag live">LIVE · NASA DONKI</span><br>Strongest flare in the last 30 days: <b>class ${esc(live.sun.classType)}</b> on ${esc(live.sun.date)} (${live.count} flares). Fetched ${live.fetchedAt.toLocaleTimeString()}.<br>With this Sun your storm's radiation peak will be <b>${peak}</b>.
      <label><input type="checkbox" id="sun-use" checked> Use today's real Sun for my storm (unticked: the archived X9.0 flare of 3 Oct 2024)</label>`;
    ($('#sun-use', card) as HTMLInputElement).onchange = e => { sunChoice.useLive = (e.target as HTMLInputElement).checked; };
  } else {
    sunChoice.sun = ARCHIVED_SUN; sunChoice.useLive = false;
    card.innerHTML = `<b>Today's Sun</b> <span class="tag arch">ARCHIVED</span><br>Could not reach NASA DONKI (offline?). Your storm is modelled on the real <b>X9.0</b> flare of 3 Oct 2024 from the DONKI catalogue. Nothing here is live data.`;
  }
}
export const chosenSun = (): Sun => (sunChoice.useLive ? sunChoice.sun : ARCHIVED_SUN);
export { plantHealth };
