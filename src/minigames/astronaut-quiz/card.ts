// The shareable report card: painted on a canvas (1080x1350, the 4:5 shape social feeds like), then shown as an image and offered as a PNG.
// One drawing path for what the player sees and what they download, so the two always match.
import { TIERS, type TierId } from './config';
import { badgeAssetUrl } from './badges';

export interface CardData {
  name: string; tier: TierId; points: number; levelsCleared: number; levelsTotal: number; correct: number; answered: number; accuracy: number; completed: boolean; date: string; url: string;
}
export const CARD_W = 1080, CARD_H = 1350;
const HEAD = 'Orbitron, "Arial Black", system-ui, sans-serif', BODY = 'Rajdhani, "Trebuchet MS", system-ui, sans-serif';
const GLOW: Record<TierId, string> = { recruit: '#f0a868', explorer: '#9fe3ff', commander: '#ffd75e', scientist: '#ffb347', galaxy: '#c9a6ff' };

const imgCache = new Map<string, Promise<HTMLImageElement | null>>();
const loadImg = (src: string): Promise<HTMLImageElement | null> => {
  let p = imgCache.get(src);
  if (!p) { p = new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); imgCache.set(src, p); }
  return p;
};
async function fonts(): Promise<void> {
  try { await Promise.race([Promise.all(['900 40px Orbitron', '700 24px Orbitron', '600 30px Rajdhani', '700 24px Rajdhani'].map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 1500))]); } catch { /* the fallback fonts still look fine */ }
}
function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
const spaced = (c: CanvasRenderingContext2D, px: number) => { try { (c as unknown as { letterSpacing: string }).letterSpacing = `${px}px`; } catch { /* old browsers: no letter spacing */ } };
function fit(c: CanvasRenderingContext2D, text: string, weight: number, family: string, max: number, start: number, min = 18): number {
  let s = start; for (; s > min; s -= 2) { c.font = `${weight} ${s}px ${family}`; if (c.measureText(text).width <= max) break; } c.font = `${weight} ${s}px ${family}`; return s;
}
function wrap(c: CanvasRenderingContext2D, text: string, max: number): string[] {
  const out: string[] = []; let line = '';
  for (const w of text.split(' ')) { const t = line ? line + ' ' + w : w; if (c.measureText(t).width > max && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}
const rand = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

/** A name under the player's badge: at most 8 letters in full, any extra letters fade out (so long names never crowd the slot). */
function fadedName(c: CanvasRenderingContext2D, name: string, cx: number, y: number) {
  const chars = Array.from(name), shown = chars.slice(0, 8), extra = chars.length > 8 ? chars.slice(8, 10) : [];
  c.save(); c.font = `700 20px ${BODY}`; c.textAlign = 'left'; spaced(c, 2);
  const all = [...shown, ...extra], widths = all.map(ch => c.measureText(ch).width + 2), total = widths.reduce((a, b) => a + b, 0);
  let x = cx - total / 2;
  all.forEach((ch, i) => { c.globalAlpha = i < shown.length ? 1 : i === shown.length ? 0.45 : 0.18; c.fillStyle = '#ffffff'; c.fillText(ch, x, y); x += widths[i]; });
  c.restore();
}

export async function renderCard(d: CardData): Promise<HTMLCanvasElement> {
  await fonts();
  const cv = document.createElement('canvas'); cv.width = CARD_W; cv.height = CARD_H;
  const c = cv.getContext('2d')!; const W = CARD_W, H = CARD_H, cx = W / 2;
  const tier = TIERS.find(t => t.id === d.tier)!, glow = GLOW[d.tier];
  const imgs = Object.fromEntries(await Promise.all(TIERS.map(async t => [t.id, await loadImg(badgeAssetUrl(t.id))]))) as Record<TierId, HTMLImageElement | null>;

  // ----- background: space, with a warm Mars glow at the bottom
  const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#16276b'); bg.addColorStop(0.45, '#0a1233'); bg.addColorStop(1, '#3a1226');
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  const mars = c.createRadialGradient(W * 0.85, H * 1.02, 10, W * 0.85, H * 1.02, 520); mars.addColorStop(0, 'rgba(255,120,70,.55)'); mars.addColorStop(1, 'rgba(255,120,70,0)'); c.fillStyle = mars; c.fillRect(0, 0, W, H);
  const r = rand(7); for (let i = 0; i < 110; i++) { c.globalAlpha = 0.25 + r() * 0.6; c.fillStyle = '#fff'; c.beginPath(); c.arc(r() * W, r() * H, 0.6 + r() * 1.8, 0, 6.283); c.fill(); } c.globalAlpha = 1;

  // ----- card frame
  c.save(); rr(c, 34, 34, W - 68, H - 68, 58); c.clip();
  const sheen = c.createLinearGradient(0, 0, W, H * 0.55); sheen.addColorStop(0, 'rgba(255,255,255,.16)'); sheen.addColorStop(0.5, 'rgba(255,255,255,.02)'); sheen.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = sheen; c.fillRect(0, 0, W, H);
  c.restore();
  const border = c.createLinearGradient(0, 0, W, H); [['0', '#6ff0ff'], ['.35', '#b48cff'], ['.65', '#ff8be0'], ['1', '#ffc24d']].forEach(([o, col]) => border.addColorStop(+o, col));
  c.lineWidth = 7; c.strokeStyle = border; rr(c, 34, 34, W - 68, H - 68, 58); c.stroke();
  c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.28)'; rr(c, 46, 46, W - 92, H - 92, 48); c.stroke();

  // ----- header
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  spaced(c, 8); c.font = `900 66px ${HEAD}`;
  const hg = c.createLinearGradient(0, 100, 0, 150); hg.addColorStop(0, '#ffffff'); hg.addColorStop(1, '#8ee9ff');
  c.shadowColor = 'rgba(57,217,255,.8)'; c.shadowBlur = 26; c.fillStyle = hg; c.fillText('ASTRONAUT QUIZ', cx + 4, 152); c.shadowBlur = 0;
  spaced(c, 5); c.font = `700 22px ${HEAD}`; c.fillStyle = '#ffb340'; c.fillText('MY LITTLE RED PLANET  ·  NASA SPACE TRIVIA', cx + 2, 196);
  spaced(c, 0);

  // ----- hero badge with sunburst
  const by = 430;
  const halo = c.createRadialGradient(cx, by, 20, cx, by, 270); halo.addColorStop(0, glow + 'cc'); halo.addColorStop(0.55, glow + '33'); halo.addColorStop(1, glow + '00'); c.fillStyle = halo; c.fillRect(0, by - 280, W, 560);
  c.save(); c.translate(cx, by); for (let i = 0; i < 18; i++) { c.rotate((Math.PI * 2) / 18); c.beginPath(); c.moveTo(0, 0); c.lineTo(-26, -300); c.lineTo(26, -300); c.closePath(); c.fillStyle = 'rgba(255,255,255,.05)'; c.fill(); } c.restore();
  if (imgs[d.tier]) { c.shadowColor = glow; c.shadowBlur = 50; c.drawImage(imgs[d.tier]!, cx - 160, by - 160, 320, 320); c.shadowBlur = 0; }

  // ----- tier name + statement
  const nameY = 672; spaced(c, 3);
  fit(c, tier.name.toUpperCase(), 900, HEAD, 880, 62, 28);
  const tg = c.createLinearGradient(0, nameY - 50, 0, nameY + 10); tg.addColorStop(0, '#fff6c4'); tg.addColorStop(1, '#ffb83d');
  c.shadowColor = 'rgba(255,170,40,.65)'; c.shadowBlur = 22; c.fillStyle = tg; c.fillText(tier.name.toUpperCase(), cx + 1.5, nameY); c.shadowBlur = 0; spaced(c, 0);
  c.font = `700 30px ${BODY}`; c.fillStyle = '#ffb340'; spaced(c, 3); c.fillText(`AWARDED TO ${(d.name || 'ROOKIE').toUpperCase()}`, cx + 1.5, 722); spaced(c, 0);
  c.font = `600 34px ${BODY}`; c.fillStyle = '#e6f8ff';
  wrap(c, tier.line, 800).slice(0, 2).forEach((l, i) => c.fillText(l, cx, 772 + i * 40));

  // ----- the five ranks, side by side
  const py = 842, ph = 252; c.fillStyle = 'rgba(255,255,255,.07)'; rr(c, 76, py, W - 152, ph, 30); c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(111,240,255,.4)'; rr(c, 76, py, W - 152, ph, 30); c.stroke();
  const at = TIERS.findIndex(t => t.id === d.tier);
  TIERS.forEach((t, i) => {
    const x = 76 + (W - 152) / 10 + ((W - 152) / 5) * i, mine = i === at, y0 = py + 22, sz = mine ? 132 : 112;
    if (mine) { const g = c.createRadialGradient(x, y0 + 66, 10, x, y0 + 66, 90); g.addColorStop(0, GLOW[t.id] + '88'); g.addColorStop(1, GLOW[t.id] + '00'); c.fillStyle = g; c.fillRect(x - 100, y0 - 20, 200, 180); }
    c.globalAlpha = i <= at ? 1 : 0.32;
    if (imgs[t.id]) c.drawImage(imgs[t.id]!, x - sz / 2, y0 + 66 - sz / 2, sz, sz);
    c.globalAlpha = 1;
    c.textAlign = 'center'; c.font = `700 ${mine ? 19 : 17}px ${HEAD}`; c.fillStyle = mine ? '#ffd76a' : i < at ? '#d9f6ff' : 'rgba(217,246,255,.45)';
    c.fillText(t.short.toUpperCase(), x, py + 188);
    c.font = `700 17px ${BODY}`; c.fillStyle = mine ? '#6ff0ff' : 'rgba(159,198,220,.7)'; c.fillText(mine ? '▲ YOUR RANK' : t.need, x, py + 212);
    if (mine) fadedName(c, (d.name || 'ASTRONAUT').toUpperCase(), x, py + 237);
  });

  // ----- stats
  const sy = 1114, tw = (W - 152 - 60) / 4, tiles: [string, string][] = [
    ['SCORE', d.points.toLocaleString('en-US')],
    ['LEVELS', `${d.levelsCleared}/${d.levelsTotal}`],
    ['CORRECT', `${d.correct}/${d.answered}`],
    ['ACCURACY', `${Math.round(d.accuracy * 100)}%`],
  ];
  tiles.forEach(([k, v], i) => {
    const x = 76 + i * (tw + 20);
    const g = c.createLinearGradient(0, sy, 0, sy + 104); g.addColorStop(0, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(255,255,255,.04)'); c.fillStyle = g; rr(c, x, sy, tw, 104, 22); c.fill();
    c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.22)'; rr(c, x, sy, tw, 104, 22); c.stroke();
    c.textAlign = 'center'; spaced(c, 3); c.font = `700 19px ${BODY}`; c.fillStyle = '#8fd8f4'; c.fillText(k, x + tw / 2 + 1.5, sy + 34); spaced(c, 0);
    fit(c, v, 900, HEAD, tw - 24, 42, 22); c.fillStyle = '#fff'; c.fillText(v, x + tw / 2, sy + 82);
  });

  // ----- footer (kept well clear of the card edge)
  c.textAlign = 'center'; spaced(c, 3); c.font = `900 25px ${HEAD}`; c.fillStyle = '#ffc24d'; c.fillText('CAN YOU BEAT MY SCORE?', cx + 1.5, 1256);
  spaced(c, 0); c.font = `600 20px ${BODY}`; c.fillStyle = '#a9cfe2';
  c.fillText([d.url ? d.url.replace(/^https?:\/\//, '').replace(/\/$/, '') : 'My Little Red Planet', d.date].filter(Boolean).join('   ·   '), cx, 1284);

  // ----- gloss: a soft diagonal shine over everything, clipped to the card
  c.save(); rr(c, 34, 34, W - 68, H - 68, 58); c.clip();
  const gl = c.createLinearGradient(0, 0, W, H); gl.addColorStop(0.18, 'rgba(255,255,255,0)'); gl.addColorStop(0.3, 'rgba(255,255,255,.10)'); gl.addColorStop(0.38, 'rgba(255,255,255,0)'); gl.addColorStop(0.62, 'rgba(255,255,255,0)'); gl.addColorStop(0.7, 'rgba(255,255,255,.06)'); gl.addColorStop(0.78, 'rgba(255,255,255,0)');
  c.fillStyle = gl; c.fillRect(0, 0, W, H);
  const top = c.createLinearGradient(0, 34, 0, 330); top.addColorStop(0, 'rgba(255,255,255,.22)'); top.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = top; c.fillRect(34, 34, W - 68, 300);
  c.restore();
  return cv;
}

export const canvasBlob = (cv: HTMLCanvasElement): Promise<Blob | null> => new Promise(res => cv.toBlob(b => res(b), 'image/png'));
