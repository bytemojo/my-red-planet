// Character creator (owner's prompt pack, Step 3): one scrollable holo modal with a live pixel preview.
// Order: name -> skin tone -> body style -> hair colour -> CONTINUE (disabled until the name is valid).
import { $, UI, esc, overlay } from './ui';
import { saveSettings, settings, sfx } from './audio';
import { DEFAULT_LOOK, HAIR_PRESETS, SKIN_TONES, cleanNameInput, isLook, validateName, type HairCut, type PlayerLook } from '../core/player';
import { character, type Pixels } from '../game/pixelart';
import { lookToSpec } from '../game/sprites';

const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
function hsl2int(h: number, s: number, l: number): number {
  const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return (f(0) << 16) | (f(8) << 8) | f(4);
}
function paint(cv: HTMLCanvasElement, frames: Pixels[], scale: number) {
  const ctx = cv.getContext('2d')!; ctx.clearRect(0, 0, cv.width, cv.height);
  frames.forEach((p, i) => { const ox = i * (p.w * scale + scale * 4); for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) { const c = p.px[y * p.w + x]; if (c === -1) continue; ctx.fillStyle = hex(c); ctx.fillRect(ox + x * scale, y * scale, scale, scale); } });
}

export function currentLook(): PlayerLook { return isLook(settings.look) ? settings.look : { ...DEFAULT_LOOK, name: validateName(settings.name).ok ? settings.name : DEFAULT_LOOK.name }; }

export function showCreator(): Promise<PlayerLook> {
  const start = currentLook();
  const look: PlayerLook = { ...start, name: start.name === DEFAULT_LOOK.name ? '' : start.name };
  return new Promise(res => {
    const el = overlay('creator', `<div class="holo-panel creator"><div class="panel-head"><h2>Create your junior astronaut</h2></div><div class="panel-body cr-body">
      <div class="cr-preview"><canvas id="cr-big" width="224" height="104" aria-label="Preview of your astronaut: front, side and in the EVA suit"></canvas><div class="cr-name" id="cr-pname"></div></div>
      <div class="cr-form">
        <section><label class="cr-h" for="cr-in">1 · What should we call you?</label><input id="cr-in" class="cr-in" type="text" inputmode="text" autocomplete="off" spellcheck="false" maxlength="12" placeholder="First name" value="${esc(look.name)}" aria-describedby="cr-help cr-err"><div class="cr-help" id="cr-help">One name only</div><div class="cr-err" id="cr-err" aria-live="polite"></div></section>
        <section><div class="cr-h">2 · Skin tone</div><div class="cr-row" id="cr-skin">${SKIN_TONES.map((c, i) => `<button class="sw-btn" data-skin="${c}" style="background:${hex(c)}" aria-label="Skin tone ${i + 1} of ${SKIN_TONES.length}"></button>`).join('')}</div></section>
        <section><div class="cr-h">3 · Body style</div><div class="cr-row cr-bodies">${(['long', 'short'] as HairCut[]).map(st => `<button class="cr-body-btn" data-style="${st}"><canvas width="64" height="104" data-thumb="${st}"></canvas><span>${st === 'long' ? 'Long hair, narrower shoulders' : 'Short hair, broader shoulders'}</span></button>`).join('')}</div></section>
        <section><div class="cr-h">4 · Hair colour</div><div class="cr-hair"><canvas id="cr-wheel" width="150" height="150" aria-label="Hair colour wheel: click to choose"></canvas><div><div class="cr-row" id="cr-presets">${HAIR_PRESETS.map(c => `<button class="sw-btn small" data-hair="${c}" style="background:${hex(c)}" aria-label="Hair colour ${hex(c)}"></button>`).join('')}</div><label class="cr-hexl">Or type a colour <input id="cr-hex" class="cr-hex" type="text" maxlength="7" value="${hex(look.hair)}" aria-label="Hair colour as a hex code"></label></div></div></section>
        <button class="holo-btn primary cr-go" id="cr-go" disabled>CONTINUE ▸</button>
      </div></div></div>`, 'creator-overlay');
    const input = $('#cr-in', el) as HTMLInputElement, err = $('#cr-err', el), go = $('#cr-go', el) as HTMLButtonElement;
    // colour wheel: hue around, colour strength outward
    const wheel = $('#cr-wheel', el) as HTMLCanvasElement, wc = wheel.getContext('2d')!, R = 75;
    for (let y = -R; y < R; y++) for (let x = -R; x < R; x++) { const d = Math.hypot(x, y); if (d > R) continue; wc.fillStyle = hex(hsl2int((Math.atan2(y, x) * 180 / Math.PI + 360) % 360, d / R, 0.42)); wc.fillRect(x + R, y + R, 1, 1); }
    const redraw = () => {
      const spec = lookToSpec(look);
      paint($('#cr-big', el) as HTMLCanvasElement, [character(spec, 'down', 'stand'), character(spec, 'side', 'stand'), character({ ...spec, eva: true }, 'down', 'stand')], 4);
      el.querySelectorAll<HTMLCanvasElement>('[data-thumb]').forEach(cv => paint(cv, [character(lookToSpec({ ...look, style: cv.dataset.thumb as HairCut }), 'down', 'stand')], 4));
      el.querySelectorAll('[data-skin]').forEach(b => b.setAttribute('aria-pressed', String(Number((b as HTMLElement).dataset.skin) === look.skin)));
      el.querySelectorAll('[data-style]').forEach(b => b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.style === look.style)));
      el.querySelectorAll('[data-hair]').forEach(b => b.setAttribute('aria-pressed', String(Number((b as HTMLElement).dataset.hair) === look.hair)));
      ($('#cr-hex', el) as HTMLInputElement).value = hex(look.hair);
      const v = validateName(look.name);
      $('#cr-pname', el).textContent = v.ok ? v.name : '…';
      go.disabled = !v.ok; err.textContent = look.name && !v.ok ? v.error : '';
    };
    input.addEventListener('input', () => { const c = cleanNameInput(input.value); if (c !== input.value) input.value = c; look.name = c; redraw(); });
    input.addEventListener('keydown', e => { if (e.key === ' ') e.preventDefault(); if (e.key === 'Enter' && !go.disabled) go.click(); e.stopPropagation(); });
    el.querySelectorAll('[data-skin]').forEach(b => ((b as HTMLElement).onclick = () => { sfx.click(); look.skin = Number((b as HTMLElement).dataset.skin); redraw(); }));
    el.querySelectorAll('[data-style]').forEach(b => ((b as HTMLElement).onclick = () => { sfx.click(); look.style = (b as HTMLElement).dataset.style as HairCut; redraw(); }));
    el.querySelectorAll('[data-hair]').forEach(b => ((b as HTMLElement).onclick = () => { sfx.click(); look.hair = Number((b as HTMLElement).dataset.hair); redraw(); }));
    wheel.addEventListener('pointerdown', e => { const r = wheel.getBoundingClientRect(), x = (e.clientX - r.left) * wheel.width / r.width - R, y = (e.clientY - r.top) * wheel.height / r.height - R, d = Math.hypot(x, y); if (d > R) return; sfx.click(); look.hair = hsl2int((Math.atan2(y, x) * 180 / Math.PI + 360) % 360, d / R, 0.42); redraw(); });
    ($('#cr-hex', el) as HTMLInputElement).addEventListener('change', e => { const m = /^#?([0-9a-f]{6})$/i.exec((e.target as HTMLInputElement).value.trim()); if (m) { look.hair = parseInt(m[1], 16); redraw(); } });
    go.onclick = () => {
      const v = validateName(look.name); if (!v.ok) return;
      sfx.ok(); const done: PlayerLook = { ...look, name: v.name };
      settings.name = done.name; settings.look = done; saveSettings();
      UI.close('creator'); res(done);
    };
    redraw(); setTimeout(() => input.focus(), 50);
  });
}

// Asks before a new game replaces a saved one (owner's prompt pack, Step 2).
export function confirmOverwrite(): Promise<boolean> {
  return new Promise(res => {
    const el = overlay('confirm', `<div class="holo-panel" style="max-width:460px"><div class="panel-head"><h2>Start a new game?</h2></div><div class="panel-body"><p class="line">Your saved game will be replaced. You can use CONTINUE instead to carry on.</p><div class="row" style="justify-content:flex-end;gap:8px"><button class="holo-btn small" id="cf-no">KEEP MY SAVE</button><button class="holo-btn small amber" id="cf-yes">START NEW</button></div></div></div>`);
    $('#cf-no', el).onclick = () => { sfx.click(); UI.close('confirm'); res(false); };
    $('#cf-yes', el).onclick = () => { sfx.ok(); UI.close('confirm'); res(true); };
  });
}
