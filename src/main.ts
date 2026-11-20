import '@fontsource/orbitron/latin-500.css';
import '@fontsource/orbitron/latin-700.css';
import '@fontsource/orbitron/latin-900.css';
import '@fontsource/rajdhani/latin-500.css';
import '@fontsource/rajdhani/latin-600.css';
import '@fontsource/rajdhani/latin-700.css';
import Phaser from 'phaser';
import { WorldScene, keys, joy } from './game/WorldScene';
import { initMenu, menuControls } from './ui/menu';
import { $, UI, head, overlay, toast } from './ui/ui';
import { music, settings, sfx } from './ui/audio';
import { loadFromStorage, newSession, saveToStorage, type Session } from './core/session';
import { openControl } from './ui/panels';
import { runPending } from './ui/ui';
import { chosenSun, resetBonusProgress, showOpeningCard } from './ui/episode';
import { confirmOverwrite, showCreator } from './ui/creator';
import { openJournal } from './ui/journal';
import { HOW_TO_PLAY } from './story/howto';
import { masteryDetail, masteryLine, masteryScore } from './core/score';

let game: Phaser.Game | null = null;
let scene: WorldScene | null = null;
const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer:coarse)').matches;
if (coarse) document.body.classList.add('coarse');

function start(sess: Session) {
  menuControls.hide();
  refreshTopButton();
  $('#touch-hint').hidden = !coarse;
  if (game && scene) { game.loop.wake?.(); scene.loadSession(sess); return; }
  game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'phaser', backgroundColor: '#1c0d09', pixelArt: true, roundPixels: true,
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' }, render: { pixelArt: true, antialias: false, roundPixels: true }, audio: { noAudio: true },
    scene: [WorldScene],
  });
  game.registry.set('sess', sess);
  if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game; // dev-only hook for automated playtests
  const hook = (sc: WorldScene) => { scene = sc; sc.onMenu = toMenu; sc.onReplay = () => { const sun = sc.sess.state.ep?.sun; resetBonusProgress(); start(newSession(Math.floor(Math.random() * 99999) + 1, { mode: 'storm', sun })); toast('<b>New run.</b> Same storm, your choices can change.', { kind: 'good', ms: 4000 }); }; };
  game.events.once('ready', () => hook(game!.scene.getScene('World') as unknown as WorldScene));
  const wait = setInterval(() => { const sc = game?.scene.getScene('World') as unknown as WorldScene | undefined; if (sc) { hook(sc); clearInterval(wait); } }, 50);
}
function toMenu() {
  UI.stack.slice().forEach(id => UI.close(id)); $('#toasts').innerHTML = '';
  game?.loop.sleep?.(); menuControls.show(!!loadFromStorage()); refreshTopButton();
}

initMenu({
  // New game: ask before replacing a save, then the character creator, then the backstory card (it pauses the clock).
  play: () => { void (async () => {
    if (loadFromStorage() && !(await confirmOverwrite())) return;
    await showCreator();
    try { localStorage.removeItem('mrp.save.v1'); } catch { /* ignore */ }
    resetBonusProgress(); start(newSession(Math.floor(Math.random() * 99999) + 1, { mode: 'storm', sun: chosenSun() })); void showOpeningCard();
  })(); },

  cont: () => { const s = loadFromStorage(); start(s ?? newSession(1)); },
  hasSave: () => !!loadFromStorage(),
});
const soundToggle = $('#sound-toggle');
const soundIcon = (muted: boolean) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 9.2c1.3 1.5 1.3 4.1 0 5.6M18.8 6.6c2.7 3 2.7 7.8 0 10.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ${muted ? 'opacity=".28"' : ''}/>${muted ? '<path d="M4 4 20 20" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' : ''}</svg>`;
const pauseIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>';
const refreshTopButton = () => {
  const playing = !$('#game').hidden;
  soundToggle.setAttribute('aria-pressed', String(!settings.sound));
  soundToggle.setAttribute('aria-label', playing ? 'Pause game' : settings.sound ? 'Mute all sound' : 'Turn sound on');
  soundToggle.title = playing ? 'Pause' : settings.sound ? 'Mute sound' : 'Turn sound on';
  soundToggle.innerHTML = playing ? pauseIcon : soundIcon(!settings.sound);
};
function openHowTo() {
  const el = overlay('howto', `<div class="holo-panel pause-panel">${head('clock', 'How to play', false)}<div class="panel-body"><div class="optlist">${HOW_TO_PLAY.map(([t, l]) => `<p class="why"><b>${t}.</b> ${l}</p>`).join('')}<button class="holo-btn primary" data-howto="back">BACK</button></div></div></div>`);
  (el.querySelector('[data-howto]') as HTMLElement).onclick = () => { sfx.click(); UI.close('howto'); openPause(); };
}
function openPause() {
  if (UI.blocking()) return;
  scene?.autosave(); // Step 24a: opening the pause menu saves the exact live spot
  const el = overlay('pause', `<div class="holo-panel pause-panel">${head('clock', 'Paused')}<div class="panel-body"><p class="why">Take a breather. Mars will wait for you.</p>${scene ? `<div class="mastery-badge" aria-label="${masteryLine(scene.sess.state)}, ${masteryDetail(scene.sess.state)}"><b>${masteryScore(scene.sess.state)}</b><span>${masteryLine(scene.sess.state)}<small>${masteryDetail(scene.sess.state)}</small></span></div>` : ''}<div class="optlist"><button class="holo-btn primary" data-pause="resume">RESUME MISSION</button><button class="holo-btn" data-pause="sound">${soundIcon(!settings.sound)}<span>${settings.sound ? 'SOUND: ON' : 'SOUND: OFF'}</span></button><button class="holo-btn" data-pause="howto">HOW TO PLAY</button><button class="holo-btn" data-pause="save">SAVE GAME</button><button class="holo-btn" data-pause="journal">MY JOURNAL</button><button class="holo-btn" data-pause="map">MARS MAP</button><button class="holo-btn amber" data-pause="menu">SAVE & RETURN TO MENU</button></div></div></div>`);
  el.querySelectorAll('[data-pause]').forEach(button => ((button as HTMLElement).onclick = () => {
    const action = (button as HTMLElement).dataset.pause;
    if (action === 'resume') { sfx.click(); UI.close('pause'); }
    if (action === 'sound') { music.toggle(); if (settings.sound) sfx.ok(); openPause(); refreshTopButton(); }
    if (action === 'howto') { sfx.click(); UI.close('pause'); openHowTo(); }
    if (action === 'save' && scene) { sfx.ok(); scene.autosave(); toast('Game saved.', { kind: 'good' }); }
    if ((action === 'journal' || action === 'map') && scene) { sfx.click(); UI.close('pause'); const sc = scene; openJournal(() => sc.sess.state, () => saveToStorage(sc.sess), action === 'map' ? 'map' : 'photos'); }
    if (action === 'menu' && scene) { sfx.click(); scene.autosave(); UI.close('pause'); toMenu(); }
  }));
}
refreshTopButton();
soundToggle.onclick = () => { if ($('#game').hidden) { music.toggle(); if (settings.sound) sfx.ok(); refreshTopButton(); } else openPause(); };

// ----- input -----
addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); if ($('#game').hidden) return;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k) && !(e.target && (e.target as HTMLElement).tagName === 'INPUT')) e.preventDefault();
  if (UI.stack.includes('dlg')) { if (['e', ' ', 'enter'].includes(k)) { e.preventDefault(); runPending.next?.(); } return; }
  // Escape closes whatever is on top (the newest closable overlay); with nothing open it pauses.
  if (k === 'escape') { const top = [...UI.stack].reverse().find(id => ['howto', 'pause', 'learn', 'wiki', 'journal', 'inspect', 'control', 'simple', 'result'].includes(id)); if (top) UI.close(top); else if (!UI.blocking()) openPause(); return; }
  if (UI.blocking()) return;
  if (k === 'e' || k === 'enter' || k === ' ') scene?.doAct(); else if (k === 'c' && scene) openControl(scene.host);
  keys[k] = true;
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
$('#obj-toggle').onclick = () => { sfx.click(); const t = $('#obj-toggle'), d = $('#obj-drop'), o = t.getAttribute('aria-expanded') === 'true'; t.setAttribute('aria-expanded', String(!o)); d.hidden = o; };
document.addEventListener('pointerdown', e => { const t = $('#obj-toggle'); if (t.getAttribute('aria-expanded') === 'true' && !(e.target as HTMLElement).closest('.obj')) { t.setAttribute('aria-expanded', 'false'); $('#obj-drop').hidden = true; } });
const setHud = (o: boolean) => { $('#hud-toggle').setAttribute('aria-expanded', String(o)); $('#hud-panel').hidden = !o; };
$('#hud-toggle').onclick = () => { sfx.click(); setHud($('#hud-panel').hidden); };
document.addEventListener('pointerdown', e => { if (!$('#hud-panel').hidden && !(e.target as HTMLElement).closest('#hud-panel,#hud-toggle')) setHud(false); });
$('#ctrl-btn').onclick = () => { if (!UI.blocking() && scene) { sfx.click(); openControl(scene.host); } };
$('#act').onclick = () => scene?.doAct();
const stage = $('#stage'), jb = $('#joy-base'), jk = $('#joy-knob');
let tapX = 0, tapY = 0, dragged = false;
stage.addEventListener('pointerdown', e => { if ((e.target as HTMLElement).closest('button') || UI.blocking()) return; tapX = e.clientX; tapY = e.clientY; dragged = false; if (e.pointerType === 'mouse') return; joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = joy.y = 0; const r = stage.getBoundingClientRect(); jb.style.left = jk.style.left = e.clientX - r.left + 'px'; jb.style.top = jk.style.top = e.clientY - r.top + 'px'; jb.style.display = jk.style.display = 'block'; $('#touch-hint').hidden = true; try { stage.setPointerCapture(e.pointerId); } catch { /* ignore */ } });
stage.addEventListener('pointermove', e => { if (Math.hypot(e.clientX - tapX, e.clientY - tapY) > 12) dragged = true; if (e.pointerId !== joy.id) return; let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const m = Math.hypot(dx, dy), R = 46; if (m > R) { dx *= R / m; dy *= R / m; } joy.x = dx / R; joy.y = dy / R; const r = stage.getBoundingClientRect(); jk.style.left = joy.ox - r.left + dx + 'px'; jk.style.top = joy.oy - r.top + dy + 'px'; });
const joyEnd = (e: PointerEvent) => { if (!dragged && !(e.target as HTMLElement).closest('button')) scene?.tapAt(e.clientX, e.clientY, stage.getBoundingClientRect()); if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; jb.style.display = jk.style.display = 'none'; };
stage.addEventListener('pointerup', joyEnd); stage.addEventListener('pointercancel', joyEnd);


// Step 23b: offline support. The service worker (public/sw.js) caches this site's own files after the first visit. Production only, no network calls to other sites.
if (import.meta.env.PROD && 'serviceWorker' in navigator) window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });

// Step 24a: autosave when the tab is hidden and every 20 seconds while playing, so CONTINUE resumes exactly where you stopped.
document.addEventListener('visibilitychange', () => { if (document.hidden && scene && !$('#game').hidden) scene.autosave(); });
window.addEventListener('pagehide', () => { if (scene && !$('#game').hidden) scene.autosave(); });
setInterval(() => { if (scene && !$('#game').hidden && !document.hidden) scene.autosave(); }, 20000);
