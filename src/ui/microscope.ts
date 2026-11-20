// Step 29b: the microscope viewer. A round eyepiece with a soft vignette, the picture inside, ZOOM + / ZOOM - (also wheel and pinch), drag to move,
// a slider to switch samples, a caption and a credit that links to the real source page. Maths are in core/microscope.ts. Opens from the lab microscope (game/WorldScene.microscopeAct).
// Pictures are bundled in public/microscope/ so it works offline. A picture that is still loading or cannot load shows a placeholder, never a broken image.
import { ZOOM, canZoomIn, canZoomOut, clampView, coverSize, newView, panBy, stepSample, zoomAt, zoomLabel, type View } from '../core/microscope';
import type { MicroscopeSample } from '../story/microscope';
import { head, overlay } from './ui';
import { sfx } from './audio';

const LENS = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="m12.5 12.5 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const srcOf = (s: MicroscopeSample) => s.file.startsWith('data:') ? s.file : '/microscope/' + encodeURIComponent(s.file);

/** Opens the viewer; resolves when it is closed. With no samples it resolves at once and shows nothing. */
export function openMicroscope(samples: readonly MicroscopeSample[], onView?: (s: MicroscopeSample) => void): Promise<void> {
  return new Promise(resolve => {
    const n = samples.length; if (!n) { resolve(); return; }
    const el = overlay('microscope', `<div class="holo-panel mic-panel" role="dialog" aria-label="Microscope">${head('panel', 'Microscope')}<div class="panel-body mic-body">
      <div class="mic-eye"><div class="mic-view" id="mic-view" tabindex="0" aria-label="Microscope view. Drag to move. Scroll, pinch or use plus and minus to zoom.">
        <img class="mic-img" id="mic-img" alt="" draggable="false"><div class="mic-load" id="mic-load" role="status">Loading…</div></div><div class="mic-vig" aria-hidden="true"></div></div>
      <div class="mic-zoom"><button class="holo-btn small" id="mic-out" aria-label="Zoom out">ZOOM −</button><span class="mic-zl" id="mic-z" aria-live="polite">1×</span><button class="holo-btn small" id="mic-in" aria-label="Zoom in">ZOOM +</button></div>
      <label class="mic-pick"><span id="mic-n"></span><input type="range" id="mic-slider" min="1" max="${n}" step="1" value="1" aria-label="Choose a sample"${n < 2 ? ' disabled' : ''}></label>
      <div class="mic-cap"><b id="mic-t"></b><p id="mic-c"></p><a class="mic-src" id="mic-src" target="_blank" rel="noopener noreferrer">${LENS}<span id="mic-cr"></span></a></div></div></div>`, 'mic-ov');
    const $ = <T extends HTMLElement>(id: string) => el.querySelector('#' + id) as T;
    const view = $('mic-view'), img = $<HTMLImageElement>('mic-img'), load = $('mic-load'), slider = $<HTMLInputElement>('mic-slider');
    let idx = 0, v: View = newView(), size = { w: 1, h: 1 }, token = 0, loaded = false;
    const dia = () => view.clientWidth || 300;
    const apply = () => {
      if (!loaded) return; const d = dia(); v = clampView(v, size, d);
      img.style.width = size.w + 'px'; img.style.height = size.h + 'px'; img.style.transform = `translate(calc(-50% + ${v.x}px), calc(-50% + ${v.y}px)) scale(${v.zoom})`;
      $('mic-z').textContent = zoomLabel(v.zoom); ($('mic-in') as HTMLButtonElement).disabled = !canZoomIn(v.zoom); ($('mic-out') as HTMLButtonElement).disabled = !canZoomOut(v.zoom);
    };
    const show = (i: number) => {
      idx = i; const s = samples[i], my = ++token; onView?.(s); loaded = false; v = newView(); slider.value = String(i + 1);
      img.style.visibility = 'hidden'; img.removeAttribute('src'); img.alt = ''; load.hidden = false; load.textContent = 'Loading…';
      $('mic-n').textContent = `Sample ${i + 1} of ${n}`; $('mic-t').textContent = s.title; $('mic-c').textContent = s.caption;
      const a = $<HTMLAnchorElement>('mic-src'); if (/^https:\/\//.test(s.sourceUrl)) { a.href = s.sourceUrl; a.hidden = false; $('mic-cr').textContent = s.credit; } else { a.removeAttribute('href'); a.hidden = true; }
      img.onload = () => { if (my !== token) return; size = coverSize(img.naturalWidth, img.naturalHeight, dia()); loaded = true; load.hidden = true; img.alt = s.title; img.style.visibility = 'visible'; apply(); };
      img.onerror = () => { if (my !== token) return; load.hidden = false; load.textContent = 'This picture could not be loaded.'; };
      img.src = srcOf(s);
      $('mic-z').textContent = zoomLabel(1); ($('mic-in') as HTMLButtonElement).disabled = true; ($('mic-out') as HTMLButtonElement).disabled = true;
    };
    const zoom = (f: number, ax = 0, ay = 0) => { if (!loaded) return; v = zoomAt(v, f, ax, ay, size, dia()); apply(); };
    const centre = (cx: number, cy: number) => { const r = view.getBoundingClientRect(); return { x: cx - (r.left + r.width / 2), y: cy - (r.top + r.height / 2) }; };
    $('mic-in').onclick = () => { sfx.click(); zoom(ZOOM.STEP); }; $('mic-out').onclick = () => { sfx.click(); zoom(1 / ZOOM.STEP); };
    slider.oninput = () => show(Number(slider.value) - 1);
    view.addEventListener('wheel', e => { e.preventDefault(); const a = centre(e.clientX, e.clientY); zoom(e.deltaY < 0 ? ZOOM.WHEEL : 1 / ZOOM.WHEEL, a.x, a.y); }, { passive: false });
    // drag to move (one pointer), pinch to zoom (two pointers)
    const ptrs = new Map<number, { x: number; y: number }>(); let lastDist = 0;
    view.addEventListener('pointerdown', e => { view.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); lastDist = 0; view.classList.add('drag'); });
    view.addEventListener('pointermove', e => {
      const p = ptrs.get(e.pointerId); if (!p || !loaded) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (ptrs.size === 1) { v = panBy(v, dx, dy, size, dia()); apply(); }
      else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], dist = Math.hypot(a.x - b.x, a.y - b.y), m = centre((a.x + b.x) / 2, (a.y + b.y) / 2); if (lastDist > 0 && dist > 0) zoom(dist / lastDist, m.x, m.y); lastDist = dist; }
    });
    const up = (e: PointerEvent) => { ptrs.delete(e.pointerId); lastDist = 0; if (!ptrs.size) view.classList.remove('drag'); };
    view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up);
    // keyboard: + / - zoom, arrows move, Escape closes (the sample slider keeps its own arrow keys)
    const ac = new AbortController();
    document.addEventListener('keydown', e => {
      if (!el.isConnected) return; const k = e.key;
      if (k === 'Escape') { e.preventDefault(); el.querySelector<HTMLElement>('[data-close]')?.click(); return; }
      if (k === '+' || k === '=') { zoom(ZOOM.STEP); return; } if (k === '-' || k === '_') { zoom(1 / ZOOM.STEP); return; }
      if (e.target === slider) return;
      const m = 30, mv: Record<string, [number, number]> = { ArrowLeft: [m, 0], ArrowRight: [-m, 0], ArrowUp: [0, m], ArrowDown: [0, -m] };
      if (mv[k] && loaded) { e.preventDefault(); v = panBy(v, mv[k][0], mv[k][1], size, dia()); apply(); }
    }, { signal: ac.signal });
    window.addEventListener('resize', () => { if (loaded) { size = coverSize(img.naturalWidth, img.naturalHeight, dia()); apply(); } }, { signal: ac.signal });
    new MutationObserver((_m, ob) => { if (!el.isConnected) { ob.disconnect(); ac.abort(); resolve(); } }).observe(document.getElementById('overlays')!, { childList: true });
    show(stepSample(0, n, 0)); view.focus();
  });
}
