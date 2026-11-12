import Phaser from 'phaser';
import './ui/holo.css';
import { WorldScene, keys, joy } from './game/WorldScene';
import { initMenu, menuControls } from './ui/menu';
import { $, UI, toast } from './ui/ui';
import { sfx } from './ui/audio';
import { loadFromStorage, newSession, type Session } from './core/session';
import { openControl } from './ui/panels';
import { runPending } from './ui/ui';

let game: Phaser.Game | null = null;
let scene: WorldScene | null = null;
const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer:coarse)').matches;
if (coarse) document.body.classList.add('coarse');

function start(sess: Session) {
  menuControls.hide();
  $('#touch-hint').hidden = !coarse;
  if (game && scene) { game.loop.wake?.(); scene.loadSession(sess); return; }
  game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'phaser', backgroundColor: '#1c0d09', pixelArt: true, roundPixels: true,
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' }, render: { pixelArt: true, antialias: false, roundPixels: true }, audio: { noAudio: true },
    scene: [WorldScene],
  });
  game.registry.set('sess', sess);
  game.events.once('ready', () => { scene = game!.scene.getScene('World') as unknown as WorldScene; scene.onMenu = toMenu; });
  const wait = setInterval(() => { const sc = game?.scene.getScene('World') as unknown as WorldScene | undefined; if (sc) { scene = sc; scene.onMenu = toMenu; clearInterval(wait); } }, 50);
}
function toMenu() {
  UI.stack.slice().forEach(id => UI.close(id)); $('#toasts').innerHTML = '';
  game?.loop.sleep?.(); menuControls.show(!!loadFromStorage());
}

initMenu({
  play: () => { try { localStorage.removeItem('mrp.save.v1'); } catch { /* ignore */ } start(newSession(Math.floor(Math.random() * 99999) + 1)); },
  cont: () => { const s = loadFromStorage(); start(s ?? newSession(1)); },
  hasSave: () => !!loadFromStorage(),
});

// ----- input -----
addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); if ($('#game').hidden) return;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k) && !(e.target && (e.target as HTMLElement).tagName === 'INPUT')) e.preventDefault();
  if (UI.stack.includes('dlg')) { if (['e', ' ', 'enter'].includes(k)) { e.preventDefault(); runPending.next?.(); } return; }
  if (k === 'escape') { for (const id of ['inspect', 'control', 'simple', 'result']) if (UI.stack.includes(id)) { UI.close(id); break; } return; }
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
stage.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' || (e.target as HTMLElement).closest('button') || UI.blocking()) return; joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = joy.y = 0; const r = stage.getBoundingClientRect(); jb.style.left = jk.style.left = e.clientX - r.left + 'px'; jb.style.top = jk.style.top = e.clientY - r.top + 'px'; jb.style.display = jk.style.display = 'block'; $('#touch-hint').hidden = true; try { stage.setPointerCapture(e.pointerId); } catch { /* ignore */ } });
stage.addEventListener('pointermove', e => { if (e.pointerId !== joy.id) return; let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const m = Math.hypot(dx, dy), R = 46; if (m > R) { dx *= R / m; dy *= R / m; } joy.x = dx / R; joy.y = dy / R; const r = stage.getBoundingClientRect(); jk.style.left = joy.ox - r.left + dx + 'px'; jk.style.top = joy.oy - r.top + dy + 'px'; });
const joyEnd = (e: PointerEvent) => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; jb.style.display = jk.style.display = 'none'; };
stage.addEventListener('pointerup', joyEnd); stage.addEventListener('pointercancel', joyEnd);
void toast;
