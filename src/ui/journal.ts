// The journal (owner's prompt pack, Step 12): Mars photos, the mission diary, the player's own notes, and
// the Mars map. Reachable from the pause menu and the Control Module. Reads state; notes save with the game.
import { ICON } from './icons';
import { $, UI, bindLearning, esc, learnButton, overlay } from './ui';
import { sfx } from './audio';
import { PHOTOS, MARS_MAP } from '../story/photos';
import { HEBRUS_VALLES, mapXY } from '../core/marsmap';
import { refreshObjectives } from './hud';
import { addNote, deleteNote, NOTE_MAX } from '../core/notes';
import { openWiki } from './episode';
import type { GameState } from '../core/types';

export type JournalTab = 'photos' | 'diary' | 'notes' | 'map';
const TABS: [JournalTab, string][] = [['photos', 'Mars photos'], ['diary', 'Mission diary'], ['notes', 'My notes'], ['map', 'Mars map']];

export function openJournal(getState: () => GameState, save: () => void, tab: JournalTab = 'photos') {
  const el = overlay('journal', '');
  const render = () => {
    const s = getState();
    let body = '';
    if (tab === 'photos') {
      body = `<p class="why">Real pictures from NASA missions. Tap a source link to see the full image on NASA's site.</p><div class="photos">${PHOTOS.map(p => `<figure class="photo"><img src="${p.file}" alt="${esc(p.title)}" loading="lazy"><figcaption><b>${esc(p.title)}</b><span>${esc(p.caption)}</span><small>Image: ${esc(p.credit)} · <a href="${esc(p.source)}" target="_blank" rel="noopener noreferrer">source ↗</a></small></figcaption></figure>`).join('')}</div>`;
    } else if (tab === 'diary') {
      const d = s.journal.filter(j => j.id.startsWith('diary:'));
      body = d.length ? `<div class="diary">${d.map(j => `<div class="dentry"><p>${esc(j.happened)}</p>${learnButton(j.learnId)}</div>`).join('')}</div>` : '<p class="why">Nothing yet. Your diary writes itself each time you finish an objective.</p>';
      body += `<p class="why" style="margin-top:12px">Want to go deeper? <button class="holo-btn small" data-j="wiki">${ICON.doc} THE NASA WIKI</button></p>`;
    } else if (tab === 'notes') {
      const notes = s.notes ?? [];
      body = `<p class="why">Write anything you want to remember. Your notes are saved with your game.</p>
        <textarea id="j-note" class="j-note" maxlength="${NOTE_MAX}" rows="3" placeholder="e.g. Stow the panels before the dust peak next time!" aria-label="New note"></textarea>
        <div class="row" style="justify-content:flex-end"><button class="holo-btn small amber" data-j="add">ADD NOTE</button></div>
        <div class="notes">${notes.length ? notes.slice().reverse().map(n => `<div class="note"><p>${esc(n.text)}</p><button class="holo-btn small" data-del="${esc(n.id)}" aria-label="Delete this note">DELETE</button></div>`).join('') : '<p class="why">No notes yet.</p>'}</div>`;
    } else {
      const p = mapXY(HEBRUS_VALLES.lat, HEBRUS_VALLES.lon, 100, 100);
      body = `<div class="mapbox"><img src="${MARS_MAP.file}" alt="Colour height map of the whole of Mars" width="${MARS_MAP.width}" height="${MARS_MAP.height}"><span class="pin" style="left:${p.x}%;top:${p.y}%"><i></i><b>YOUR BASE · HEBRUS VALLES</b></span></div>
        <p class="line"><b>Game location based on real map data.</b> Our base is fictional, but Hebrus Valles is real: an old channel system west of the Elysium volcanoes, centred at about ${HEBRUS_VALLES.lat.toFixed(2)}°N, ${HEBRUS_VALLES.lon.toFixed(2)}°E. ${learnButton('hebrus')}</p>
        <p class="why">Colours show height: blue is low (the big round blue-purple patch is the Hellas basin), red and white are high (the Tharsis volcanoes on the left). The map comes from a laser on NASA's Mars Global Surveyor that measured the height of Mars more than 600 million times.</p>
        <p class="src-line">Map: ${esc(MARS_MAP.credit)} <a href="${esc(MARS_MAP.source)}" target="_blank" rel="noopener noreferrer">source ↗</a> · Location: <a href="${esc(HEBRUS_VALLES.source)}" target="_blank" rel="noopener noreferrer">USGS Gazetteer of Planetary Nomenclature ↗</a></p>`;
    }
    el.innerHTML = `<div class="holo-panel journal"><div class="panel-head"><span class="hico">${ICON.doc}</span><h2>My journal</h2><button class="close-x" data-close aria-label="Close">×</button></div><div class="panel-body">
      <div class="tabs">${TABS.map(([k, n]) => `<button data-tab="${k}" aria-selected="${k === tab}">${n}</button>`).join('')}</div>${body}</div></div>`;
    el.querySelectorAll('[data-close]').forEach(b => ((b as HTMLElement).onclick = () => { sfx.click(); UI.close('journal'); }));
    el.querySelectorAll('[data-tab]').forEach(b => ((b as HTMLElement).onclick = () => { sfx.click(); tab = (b as HTMLElement).dataset.tab as JournalTab; render(); }));
    el.querySelectorAll('[data-del]').forEach(b => ((b as HTMLElement).onclick = () => { sfx.click(); if (deleteNote(getState(), (b as HTMLElement).dataset.del!)) save(); render(); }));
    const add = el.querySelector('[data-j="add"]') as HTMLElement | null;
    if (add) add.onclick = () => { const t = ($('#j-note', el) as HTMLTextAreaElement).value; if (addNote(getState(), t)) { sfx.ok(); save(); render(); refreshObjectives(); } else sfx.warn(); };
    const ta = el.querySelector('#j-note') as HTMLTextAreaElement | null;
    if (ta) ta.addEventListener('keydown', e => e.stopPropagation()); // typing must not move the explorer
    const wk = el.querySelector('[data-j="wiki"]') as HTMLElement | null; if (wk) wk.onclick = () => { sfx.click(); openWiki(); };
    bindLearning(el);
  };
  render();
}
