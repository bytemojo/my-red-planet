// The five rank badges, drawn as inline SVG (no image files). Used on the intro screen, the result screens and painted onto the report card PNG.
// badgeSvg(tier, uid) returns a complete <svg>. `uid` keeps gradient ids unique when several badges sit in one page.
import type { TierId } from './config';

const PAL: Record<TierId, { ring: string[]; face: string[]; glow: string }> = {
  recruit:   { ring: ['#f1b47d', '#b3672e', '#7a3f18'], face: ['#4a6fc4', '#1d3270'], glow: '#f0a868' },
  explorer:  { ring: ['#ffffff', '#b7c4d4', '#74869b'], face: ['#35a0c9', '#0f3d6b'], glow: '#9fe3ff' },
  commander: { ring: ['#fff3b0', '#e6b02b', '#a46c0c'], face: ['#2a4fb0', '#0b1b4d'], glow: '#ffd75e' },
  scientist: { ring: ['#ffe29a', '#f08a24', '#a8420a'], face: ['#ff9a35', '#8a2410'], glow: '#ffb347' },
  galaxy:    { ring: ['#7ff3ff', '#b48cff', '#ff8be0'], face: ['#35198a', '#060220'], glow: '#c9a6ff' },
};

const star = (cx: number, cy: number, R: number, r: number, n = 5): string =>
  Array.from({ length: n * 2 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / n, d = i % 2 ? r : R; return `${(cx + d * Math.cos(a)).toFixed(1)},${(cy + d * Math.sin(a)).toFixed(1)}`; }).join(' ');
const spark = (x: number, y: number, s: number, c = '#fff', o = 1): string => `<path d="M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z" fill="${c}" opacity="${o}"/>`;

function emblem(t: TierId, u: string): string {
  switch (t) {
    case 'recruit': return `
      <g>
        <path d="M70 150 L100 166 L130 150" stroke="#ffd7a8" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="57" cy="100" r="8" fill="#9db3d1"/><circle cx="143" cy="100" r="8" fill="#9db3d1"/>
        <circle cx="100" cy="98" r="46" fill="url(#h${u})" stroke="#6f86ad" stroke-width="2"/>
        <ellipse cx="100" cy="100" rx="32" ry="27" fill="#0c1a3d" stroke="#a9c8f2" stroke-width="3.5"/>
        <path d="M76 92 Q84 76 106 76 Q92 84 88 100Z" fill="#fff" opacity=".55"/>
        <circle cx="116" cy="112" r="3" fill="#7fd6ff" opacity=".9"/>${spark(112, 94, 6, '#bfeaff', .9)}
        <rect x="88" y="141" width="24" height="6" rx="3" fill="#9db3d1"/>
        ${spark(48, 52, 7, '#ffe9c9')}${spark(152, 56, 5, '#ffe9c9', .8)}
      </g>`;
    case 'explorer': return `
      <g>
        <ellipse cx="100" cy="112" rx="64" ry="20" transform="rotate(-24 100 112)" fill="none" stroke="#bfefff" stroke-width="2.5" stroke-dasharray="3 7" stroke-linecap="round" opacity=".8"/>
        <circle cx="56" cy="138" r="19" fill="url(#p${u})"/><ellipse cx="56" cy="138" rx="31" ry="8" transform="rotate(-22 56 138)" fill="none" stroke="#f1f7ff" stroke-width="4"/>
        <path d="M44 132 A19 19 0 0 1 70 130" stroke="#fff" stroke-width="2" fill="none" opacity=".5"/>
        <g transform="rotate(38 108 92)">
          <path d="M108 38 C132 62 134 104 122 128 L94 128 C82 104 84 62 108 38Z" fill="url(#h${u})" stroke="#7088a8" stroke-width="2"/>
          <path d="M108 38 C119 49 125 60 127 72 L89 72 C91 60 97 49 108 38Z" fill="#ff6b5a"/>
          <circle cx="108" cy="90" r="11" fill="#12497d" stroke="#8fd6ff" stroke-width="3.5"/><circle cx="104" cy="86" r="3.2" fill="#fff" opacity=".8"/>
          <path d="M92 108 L72 138 L96 128Z" fill="#ff6b5a"/><path d="M124 108 L144 138 L120 128Z" fill="#ff6b5a"/>
          <path d="M98 130 Q108 176 118 130Z" fill="url(#fl${u})"/>
        </g>
        ${spark(150, 50, 6, '#fff')}${spark(46, 76, 5, '#bfefff', .9)}
      </g>`;
    case 'commander': return `
      <g>
        <g fill="url(#w${u})" stroke="#8a5a0a" stroke-width="1.5" stroke-linejoin="round">
          <path id="wing${u}" d="M70 96 C52 80 34 80 18 90 C34 92 44 98 52 106 C42 104 32 107 24 114 C38 116 48 120 56 126 C48 127 42 131 36 138 C54 136 68 129 78 120Z"/>
          <path transform="translate(200 0) scale(-1 1)" d="M70 96 C52 80 34 80 18 90 C34 92 44 98 52 106 C42 104 32 107 24 114 C38 116 48 120 56 126 C48 127 42 131 36 138 C54 136 68 129 78 120Z"/>
        </g>
        <polygon points="${star(100, 94, 36, 15)}" fill="url(#w${u})" stroke="#8a5a0a" stroke-width="2.5" stroke-linejoin="round"/>
        <polygon points="${star(100, 94, 20, 8.5)}" fill="#fff6c9" opacity=".7"/>
        <path d="M76 138 L100 150 L124 138" stroke="url(#w${u})" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M80 154 L100 164 L120 154" stroke="url(#w${u})" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </g>`;
    case 'scientist': {
      const rays = Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6, long = i % 2 === 0, r0 = 30, r1 = long ? 56 : 46, w = 0.13; const p = (r: number, da: number) => `${(100 + r * Math.cos(a + da)).toFixed(1)},${(100 + r * Math.sin(a + da)).toFixed(1)}`; return `<polygon points="${p(r0, -w)} ${p(r1, 0)} ${p(r0, w)}" fill="#fff1a8"/>`; }).join('');
      return `
      <g>
        ${rays}
        <circle cx="100" cy="100" r="29" fill="url(#s${u})" stroke="#fff6c4" stroke-width="3"/>
        <ellipse cx="100" cy="100" rx="66" ry="22" transform="rotate(32 100 100)" fill="none" stroke="#fff" stroke-width="3" opacity=".92"/>
        <ellipse cx="100" cy="100" rx="66" ry="22" transform="rotate(-32 100 100)" fill="none" stroke="#fff" stroke-width="3" opacity=".92"/>
        <circle cx="155" cy="128" r="6.5" fill="#bff0ff" stroke="#fff" stroke-width="2"/><circle cx="45" cy="72" r="6.5" fill="#bff0ff" stroke="#fff" stroke-width="2"/><circle cx="150" cy="70" r="5.5" fill="#bff0ff" stroke="#fff" stroke-width="2"/>
        ${spark(100, 100, 12, '#fff', .8)}
      </g>`; }
    case 'galaxy': {
      const arm = (off: number, w: number, o: number, c: string): string => { let d = ''; for (let k = 0; k <= 40; k++) { const th = k * 0.2 + off, r = 6 + k * 1.5; d += `${k ? 'L' : 'M'}${(100 + r * Math.cos(th)).toFixed(1)} ${(100 + r * Math.sin(th) * 0.92).toFixed(1)}`; } return `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" opacity="${o}"/>`; };
      const stars = [[40, 60, 2], [162, 52, 2.4], [150, 148, 2], [52, 150, 2.2], [100, 34, 1.8], [30, 108, 1.6], [172, 104, 1.8], [118, 168, 1.6], [76, 40, 1.4]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity=".9"/>`).join('');
      return `
      <g>
        ${arm(0, 9, 0.35, '#7ff3ff')}${arm(Math.PI, 9, 0.35, '#ff8be0')}${arm(0, 3, 0.9, '#d7fbff')}${arm(Math.PI, 3, 0.9, '#ffd2f2')}${arm(Math.PI / 2, 2, 0.5, '#b48cff')}${arm(-Math.PI / 2, 2, 0.5, '#b48cff')}
        ${stars}
        <g stroke="#fff" stroke-width="2.4" stroke-linejoin="round" fill="url(#b${u})">
          <circle cx="74" cy="102" r="13"/><circle cx="84" cy="88" r="14"/><circle cx="100" cy="82" r="14"/><circle cx="117" cy="86" r="14"/><circle cx="128" cy="99" r="13"/><circle cx="123" cy="113" r="13"/><circle cx="106" cy="118" r="13"/><circle cx="90" cy="117" r="13"/><circle cx="77" cy="114" r="10"/>
        </g>
        <ellipse cx="101" cy="101" rx="38" ry="25" fill="url(#b${u})"/>
        <path d="M101 80 C96 90 106 94 100 104 C95 112 104 114 101 122 M82 96 C90 98 90 106 84 110 M120 94 C112 98 112 106 118 110 M88 86 C94 88 94 94 90 98 M114 84 C108 88 108 94 112 96" stroke="#7b3fc9" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".85"/>
        <path d="M110 122 L114 136 L124 136 L120 120Z" fill="url(#b${u})" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
        ${spark(144, 80, 9)}${spark(58, 130, 7, '#bff7ff')}${spark(100, 56, 6, '#ffd2f2')}
      </g>`; }
  }
}

/** A full 200x200 badge. */
export function badgeSvg(t: TierId, uid = 'x'): string {
  const p = PAL[t], u = `${t}-${uid}`, big = 400;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${big}" height="${big}" role="img" aria-label="${t} badge">
  <defs>
    <linearGradient id="r${u}" x1="0" y1="0" x2="1" y2="1">${p.ring.map((c, i) => `<stop offset="${i / (p.ring.length - 1)}" stop-color="${c}"/>`).join('')}</linearGradient>
    <radialGradient id="f${u}" cx=".5" cy=".3" r=".85"><stop offset="0" stop-color="${p.face[0]}"/><stop offset="1" stop-color="${p.face[1]}"/></radialGradient>
    <linearGradient id="g${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="h${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#b5c8e4"/></linearGradient>
    <linearGradient id="w${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6b8"/><stop offset=".55" stop-color="#f0b82e"/><stop offset="1" stop-color="#b97a0e"/></linearGradient>
    <linearGradient id="fl${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3a0"/><stop offset="1" stop-color="#ff7a1c"/></linearGradient>
    <radialGradient id="p${u}" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#ffd27a"/><stop offset="1" stop-color="#d4572a"/></radialGradient>
    <radialGradient id="s${u}" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fffbd0"/><stop offset=".6" stop-color="#ffd23c"/><stop offset="1" stop-color="#ff9a10"/></radialGradient>
    <linearGradient id="b${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd2f2"/><stop offset="1" stop-color="#b48cff"/></linearGradient>
    <clipPath id="c${u}"><circle cx="100" cy="100" r="82"/></clipPath>
  </defs>
  <circle cx="100" cy="100" r="97" fill="${p.glow}" opacity=".18"/>
  <circle cx="100" cy="100" r="94" fill="url(#r${u})"/>
  <circle cx="100" cy="100" r="94" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.5"/>
  <circle cx="100" cy="100" r="86" fill="#0b1226" opacity=".55"/>
  <circle cx="100" cy="100" r="82" fill="url(#f${u})"/>
  ${Array.from({ length: 24 }, (_, i) => { const a = (i * Math.PI) / 12; return `<circle cx="${(100 + 90 * Math.cos(a)).toFixed(1)}" cy="${(100 + 90 * Math.sin(a)).toFixed(1)}" r="1.5" fill="#fff" opacity=".7"/>`; }).join('')}
  <g clip-path="url(#c${u})">${emblem(t, u)}<ellipse cx="100" cy="44" rx="78" ry="42" fill="url(#g${u})"/></g>
  <circle cx="100" cy="100" r="82" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>
</svg>`;
}
export const badgeDataUrl = (t: TierId): string => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(badgeSvg(t, 'img'));
