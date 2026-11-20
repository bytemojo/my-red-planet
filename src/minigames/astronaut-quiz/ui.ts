// ASTRONAUT QUIZ screens. Draws the DOM and forwards input; every rule lives in engine.ts and every number or line of copy in config.ts.
// Flow: intro (Reyes welcome) -> level splash -> 10 questions (lock in, reveal, NASA link) -> level cleared | try-again -> ... -> report card.
import './astronaut-quiz.css';
import { AQ, GENERIC_NAME, LEVEL_NAMES, SAY, SHARE_URL, TIERS, fill, pick, type TierId } from './config';
import { Run, buildRun, clock, tierIndex, type BankQuestion, type Rnd, type RunSummary } from './engine';
import { badgeImage } from './badges';
import { aqSfx } from './sfx';
import { renderCard, canvasBlob, type CardData } from './card';

export interface AstronautQuizOptions {
  bank: BankQuestion[];
  playerName?: () => string;            // the game's player name; falls back to what the player types on the report card
  isSoundOn?: () => boolean;            // the game's sound setting
  reduceMotion?: () => boolean;         // the game's "reduce motion" setting
  assetBase?: string;                   // folder that holds crew/reyes.png (default: Vite's BASE_URL)
  shareUrl?: string;                    // link added to shared posts (default: this page)
  rnd?: Rnd;
  container?: HTMLElement;              // where to mount (default: document.body)
  onOpen?: () => void;                  // e.g. pause the menu music
  onClose?: () => void;                 // e.g. restart the menu music
  onNameChange?: (name: string) => void;
}

const esc = (t: string) => t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const LET = ['A', 'B', 'C', 'D'];
const ls = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem('mrp.aq.' + k); return v == null ? d : (JSON.parse(v) as T); } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem('mrp.aq.' + k, JSON.stringify(v)); } catch { /* ignore */ } },
};
const cleanName = (n: string) => n.replace(/[^\p{L}\p{N} '\-]/gu, '').slice(0, 12).trim();
const ICON = {
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  on: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9c1.4 1.6 1.4 4.4 0 6M18.8 6.5c2.8 3.2 2.8 7.8 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  off: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 3h6"/></svg>',
  play: '<svg viewBox="0 0 20 20"><path d="M5 3l12 7-12 7z" fill="currentColor"/></svg>',
  dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8.7 10.5l6.6-3M8.7 13.5l6.6 3"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.4-1.1-2.7 0-1.3.7-1.9.9-2.2.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.3.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.8-.1 1.4z"/></svg>',
  tw: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z"/></svg>',
  fb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 22v-8.2h2.8l.4-3.3h-3.2V8.4c0-.9.3-1.6 1.6-1.6h1.7V3.9c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.3v3.3h2.8V22h3.4z"/></svg>',
  tg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.5 3.5 2.8 10.7c-.9.4-.9 1.1 0 1.4l4.8 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.3-2.2 4.6 3.4c.8.5 1.5.2 1.7-.8L22.9 5c.3-1.2-.4-1.8-1.4-1.5zM9.2 13.3l9.6-6-7.7 7.2-.3 3.2-1.6-4.4z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>',
};

export class AstronautQuizUI {
  private root!: HTMLDivElement; private screen!: HTMLDivElement;
  private run!: Run;
  private timeouts = new Set<number>();
  private state: 'idle' | 'open' | 'locking' | 'feedback' = 'idle';
  private remaining = 0; private limit = 0; private lastT = 0; private clockId = 0; private timerOn = false; private modalOpen = false; private lowShown = false;
  private name = 'Rookie'; private calm = false; private recorded = false;
  private cardUrl = ''; private cardCv?: HTMLCanvasElement; private msgEdited = false; private shareMsg = ''; private renderSeq = 0;
  private prefill = ''; private named = false; private reyes = ''; private url = ''; private alive = false;
  private keyHandler = (e: KeyboardEvent) => this.onKey(e);
  private visHandler = () => { this.lastT = performance.now(); };

  constructor(private opts: AstronautQuizOptions) {}

  // ---------- lifecycle ----------
  mount(): void {
    const o = this.opts, base = o.assetBase ?? ((import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/');
    this.reyes = new URL(`${base.replace(/\/?$/, '/')}crew/reyes.png`, document.baseURI).href;
    this.url = o.shareUrl ?? SHARE_URL;
    const given = cleanName(o.playerName?.() ?? ''); this.name = given || cleanName(ls.get('name', '')) || 'Rookie'; this.prefill = this.name === 'Rookie' ? '' : this.name;
    this.calm = !!(o.reduceMotion?.() || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches));
    aqSfx.setGate(() => o.isSoundOn?.() ?? true);
    this.root = document.createElement('div'); this.root.className = 'aq' + (this.calm ? ' calm' : ''); this.root.setAttribute('role', 'dialog'); this.root.setAttribute('aria-modal', 'true'); this.root.setAttribute('aria-label', 'Astronaut Quiz');
    const stars = Array.from({ length: 36 }, () => `<i class="aq-star" style="left:${Math.random() * 100}%;top:${Math.random() * 100}%;animation-delay:${(Math.random() * 3).toFixed(2)}s"></i>`).join('');
    this.root.innerHTML = `<div class="aq-bg"><i class="aq-beam b1"></i><i class="aq-beam b2"></i><i class="aq-beam b3"></i><div class="aq-floor"></div>${stars}</div>
      <div class="aq-top"><button class="aq-ico" id="aq-exit" aria-label="Close Astronaut Quiz">${ICON.x}</button><div class="aq-title">ASTRONAUT <i>QUIZ</i></div><button class="aq-ico" id="aq-snd" aria-label="Sound"></button></div>
      <div class="aq-screen"></div>`;
    this.screen = this.root.querySelector('.aq-screen') as HTMLDivElement;
    (o.container ?? document.body).appendChild(this.root);
    this.alive = true;
    (this.root.querySelector('#aq-exit') as HTMLElement).onclick = () => { aqSfx.click(); void this.requestExit(); };
    (this.root.querySelector('#aq-snd') as HTMLElement).onclick = () => { aqSfx.setMuted(!aqSfx.muted); if (!aqSfx.muted) { aqSfx.click(); if (this.state === 'open' || this.state === 'feedback') aqSfx.bedStart(this.run.level.level); } this.drawSound(); };
    this.drawSound();
    document.addEventListener('keydown', this.keyHandler, true); document.addEventListener('visibilitychange', this.visHandler);
    o.onOpen?.();
    this.showIntro();
  }
  destroy(): void {
    if (!this.alive) return; this.alive = false;
    this.stopClock(); aqSfx.bedStop(); this.timeouts.forEach(clearTimeout); this.timeouts.clear();
    document.removeEventListener('keydown', this.keyHandler, true); document.removeEventListener('visibilitychange', this.visHandler);
    if (this.cardUrl) URL.revokeObjectURL(this.cardUrl);
    this.root.remove(); this.opts.onClose?.();
  }
  private async requestExit() {
    const midRun = this.run && (this.run.status === 'playing' || this.run.status === 'levelPassed') && (this.run.answered > 0 || this.run.levelIdx > 0);
    if (!midRun || await this.ask('Leave the quiz? Your run will be lost.', 'Leave', 'Keep playing')) this.destroy();
  }

  // ---------- small helpers ----------
  private after(ms: number, fn: () => void): number { const id = window.setTimeout(() => { this.timeouts.delete(id); fn(); }, ms); this.timeouts.add(id); return id; }
  private $ = <T extends HTMLElement = HTMLElement>(s: string): T => this.root.querySelector(s) as T;
  private say = (t: string, extra: Record<string, string | number> = {}) => fill(t, { name: this.name, ...extra });
  private setScreen(html: string): void {
    const s = document.createElement('div'); s.className = 'aq-screen'; s.innerHTML = html; this.root.replaceChild(s, this.screen); this.screen = s;
    (s.querySelector('#aq-main') as HTMLElement | null)?.focus({ preventScroll: true });
  }
  private drawSound() { const b = this.$('#aq-snd'); const off = aqSfx.muted || this.opts.isSoundOn?.() === false; b.innerHTML = off ? ICON.off : ICON.on; b.setAttribute('aria-pressed', String(off)); b.setAttribute('aria-label', off ? 'Turn sound on' : 'Mute sound'); }
  private toast(msg: string) { this.root.querySelector('.aq-toast')?.remove(); const t = document.createElement('div'); t.className = 'aq-toast'; t.setAttribute('role', 'status'); t.textContent = msg; this.root.appendChild(t); this.after(3300, () => t.remove()); }
  private confetti(n = 60) {
    if (this.calm) return; const box = document.createElement('div'), cols = ['#ffc94d', '#6ff0ff', '#ff7a9c', '#38e8a0', '#b48cff', '#fff']; box.className = 'aq-conf';
    box.innerHTML = Array.from({ length: n }, () => `<i style="left:${Math.random() * 100}%;background:${cols[Math.floor(Math.random() * cols.length)]};--x:${Math.round(Math.random() * 160 - 80)}px;--r:${Math.round(Math.random() * 900 - 300)}deg;--d:${(2.4 + Math.random() * 1.6).toFixed(2)}s;--w:${(Math.random() * 0.9).toFixed(2)}s"></i>`).join('');
    this.root.appendChild(box); this.after(4600, () => box.remove());
  }
  private ask(msg: string, yes: string, no: string): Promise<boolean> {
    return new Promise(res => {
      const wasOn = this.timerOn; this.modalOpen = true;
      const m = document.createElement('div'); m.className = 'aq-modal'; m.innerHTML = `<div class="aq-glass" role="alertdialog" aria-label="${esc(msg)}"><p>${esc(msg)}</p><div class="aq-row"><button class="aq-btn" data-y>${esc(yes)}</button><button class="aq-btn ghost" data-n>${esc(no)}</button></div></div>`;
      const done = (v: boolean) => { this.modalOpen = false; this.lastT = performance.now(); m.remove(); void wasOn; res(v); };
      (m.querySelector('[data-y]') as HTMLElement).onclick = () => { aqSfx.click(); done(true); };
      (m.querySelector('[data-n]') as HTMLElement).onclick = () => { aqSfx.click(); done(false); };
      m.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } });
      this.root.appendChild(m); (m.querySelector('[data-n]') as HTMLElement).focus();
    });
  }
  private reyesImg(cls: string, alt = 'Captain Reyes'): string { return `<img class="${cls}" src="${this.reyes}" alt="${esc(alt)}" draggable="false" onerror="this.style.visibility='hidden'">`; }
  private earned(): Set<TierId> { return new Set(ls.get<TierId[]>('ranks', [])); }
  private rankStrip(uid: string, upTo?: TierId): string {
    const got = this.earned(); if (upTo) for (let i = 0; i <= tierIndex(upTo); i++) got.add(TIERS[i].id);
    return TIERS.map(t => `<span class="rk ${got.has(t.id) ? '' : 'off'}" title="${esc(t.name)}: ${esc(t.need)}">${badgeImage(t.id, `${uid}-${t.id}`)}</span>`).join('');
  }
  private typeInto(el: HTMLElement, text: string, done?: () => void) {
    if (this.calm) { el.textContent = text; done?.(); return; }
    let i = 0; const step = () => { if (!this.alive || !el.isConnected) return; i += 1; el.textContent = text.slice(0, i); if (i < text.length) this.after(24, step); else done?.(); };
    el.onclick = () => { i = text.length; el.textContent = text; };
    step();
  }

  // ---------- 1. intro: Reyes welcomes you ----------
  private showIntro() {
    this.stopClock(); aqSfx.bedStop(); this.state = 'idle';
    this.setScreen(`<div class="aq-split intro">
      <figure class="aq-host">${this.reyesImg('aq-reyes')}</figure>
      <div class="aq-side">
        <div class="aq-bubble left"><span class="aq-who">CAPTAIN REYES</span><span id="aq-say" aria-label="${esc(SAY.welcome)}"></span><span class="aq-tip" id="aq-tip" style="opacity:0;transition:opacity .5s">${esc(SAY.tip)}</span></div>
        <button class="aq-btn big" id="aq-main">${ICON.play}Play Quiz</button>
        <p class="aq-rules">${AQ.LEVELS} levels · ${AQ.QUESTIONS_PER_LEVEL} questions each · get ${Math.ceil(AQ.QUESTIONS_PER_LEVEL * AQ.PASS_FRACTION)} right to level up</p>
        <div><div class="aq-ranks-t">YOUR RANK BADGES</div><div class="aq-ranks">${this.rankStrip('in')}</div></div>
      </div></div>`);
    this.typeInto(this.$('#aq-say'), SAY.welcome, () => { this.$('#aq-tip').style.opacity = '1'; });
    if (!this.calm) this.after(1700, () => { const t = this.root.querySelector('#aq-tip') as HTMLElement | null; if (t) t.style.opacity = '1'; });
    (this.$('#aq-main')).onclick = () => { aqSfx.unlock(); aqSfx.start(); this.newRun(); this.showLevelSplash(); };
  }

  private newRun() {
    this.run = new Run(buildRun(this.opts.bank, this.opts.rnd)); this.recorded = false; this.cardCv = undefined; this.msgEdited = false; this.named = false;
    this.run.startLevel();
  }

  // ---------- 2. level splash ----------
  private showLevelSplash() {
    this.stopClock(); aqSfx.bedStop(); this.state = 'idle';
    const r = this.run; if (!r.plans.length) { this.setScreen(`<div class="aq-splash"><p class="aq-big soft">No questions found</p></div>`); return; }
    const lv = r.level, n = lv.level;
    this.setScreen(`<div class="aq-splash">
      <div class="aq-lv-k">LEVEL</div><div class="aq-lv-n">${n}</div><div class="aq-lv-name">${esc(LEVEL_NAMES[n - 1] ?? '')}</div>
      <div class="aq-chips"><span class="aq-chip"><b>${lv.questions.length}</b> questions</span><span class="aq-chip">Get <b>${lv.passMark}</b> right to level up</span><span class="aq-chip">${clock(lv.timeLimitS)} <b>on the clock</b></span></div>
      <div class="aq-bubble down" style="margin-top:10px"><span class="aq-who">CAPTAIN REYES</span>${esc(this.say(n === 1 ? 'Take your time, {name}. No rush.' : pick(SAY.ready, n)))}</div>
      <button class="aq-btn" id="aq-main" style="margin-top:6px">Let's go!</button></div>`);
    aqSfx.level();
    const go = () => { if (this.state === 'idle' && this.$('.aq-lv-n')) this.beginLevel(); };
    this.after(AQ.LEVEL_INTRO_MS, go); (this.$('#aq-main')).onclick = () => { aqSfx.click(); go(); };
  }

  // ---------- 3. the questions ----------
  private beginLevel() {
    const lv = this.run.level; this.limit = lv.timeLimitS; this.remaining = this.limit; this.lowShown = false; this.marks = [];
    const total = lv.questions.length;
    this.setScreen(`<div class="aq-play">
      <div class="aq-hud">
        <div class="aq-lvchip"><b>LEVEL ${lv.level}</b><span>${esc(LEVEL_NAMES[lv.level - 1] ?? '')}</span></div>
        <div class="aq-clock aq-glass" id="aq-clock" role="timer" aria-label="Time left on this level">${ICON.clock}<i class="aq-bar"><u id="aq-fill"></u></i><b id="aq-time">${clock(this.limit)}</b></div>
        ${AQ.LIFELINES_PER_LEVEL > 0 ? `<button class="aq-life" id="aq-fifty" aria-label="50:50, remove two wrong answers">50:50</button>` : ''}
      </div>
      <div class="aq-pips" id="aq-pips" role="img">${'<i class="aq-pip"></i>'.repeat(total)}</div>
      <div class="aq-grid">
        <div class="aq-hostrow" aria-live="polite">${this.reyesImg('aq-reyes', '')}${this.reyesImg('aq-hostfull', '')}<div class="aq-bubble left"><span class="aq-who">CAPTAIN REYES</span><span id="aq-hsay"></span></div></div>
        <div class="aq-col">
          <div class="aq-qp" id="aq-qp"><div class="aq-qp-in"><span class="aq-qno" id="aq-qno"></span><p class="aq-q" id="aq-q"></p></div></div>
          <div class="aq-opts" id="aq-opts" role="group" aria-label="Answers"></div>
          <div id="aq-fbbox" aria-live="polite"></div>
        </div>
        <ol class="aq-ladder" aria-label="Levels">${this.run.plans.map(p => `<li class="${p.level < lv.level ? 'done' : p.level === lv.level ? 'now' : ''}"><b>${p.level}</b>${esc(LEVEL_NAMES[p.level - 1] ?? '')}</li>`).join('')}</ol>
      </div></div>`);
    const fifty = this.root.querySelector('#aq-fifty') as HTMLButtonElement | null;
    if (fifty) fifty.onclick = () => this.useFifty();
    aqSfx.bedStart(lv.level); this.drawQuestion(); this.startClock();
  }

  private drawQuestion() {
    const r = this.run, q = r.question, total = r.level.questions.length, i = r.qIdx;
    this.state = 'open'; this.timerOn = true; this.lastT = performance.now();
    this.$('#aq-qno').textContent = `QUESTION ${i + 1} OF ${total}`; this.$('#aq-q').textContent = q.prompt;
    const qp = this.$('#aq-qp'); qp.classList.remove('enter'); void qp.offsetWidth; qp.classList.add('enter');
    this.$('#aq-opts').innerHTML = q.options.map((o, k) => `<div class="aq-optw" data-w="${k}"><button class="aq-opt" type="button" data-k="${k}" aria-label="${LET[k]}: ${esc(o)}"><span class="aq-opt-in"><b class="aq-key">${LET[k]}</b><span class="aq-txt">${esc(o)}</span></span></button></div>`).join('');
    this.root.querySelectorAll<HTMLElement>('.aq-opt').forEach(b => { b.onclick = () => this.choose(+b.dataset.k!); b.onmouseenter = () => aqSfx.hover(); });
    this.$('#aq-fbbox').innerHTML = ''; this.drawPips(); this.drawFifty();
    this.$('#aq-hsay').textContent = i === 0 && r.level.level === 1 ? this.say('Take your time, {name}. No rush.') : this.say(pick(SAY.ready, r.answered + i));
  }
  private drawPips() {
    const r = this.run, total = r.level.questions.length;
    // dots for this level: right / missed so far, and the one in play
    const marks = this.marks; this.$('#aq-pips').innerHTML = Array.from({ length: total }, (_, k) => `<i class="aq-pip ${marks[k] ?? (k === r.qIdx ? 'now' : '')}"></i>`).join('');
    this.$('#aq-pips').setAttribute('aria-label', `Question ${r.qIdx + 1} of ${total}. ${r.levelCorrect} right, ${r.levelMisses} missed.`);
  }
  private marks: ('ok' | 'bad')[] = [];
  private drawFifty() { const b = this.root.querySelector('#aq-fifty') as HTMLButtonElement | null; if (b) b.disabled = this.run.fiftyLeft <= 0 || this.state !== 'open' || this.run.hidden.length > 0; }
  private useFifty() {
    if (this.state !== 'open') return; const h = this.run.useFifty(); if (!h) return;
    aqSfx.fifty(); h.forEach(k => { const w = this.$(`[data-w="${k}"]`); w.classList.add('gone'); (w.querySelector('button') as HTMLButtonElement).disabled = true; });
    this.drawFifty(); this.toast(SAY.fifty);
  }

  private choose(k: number) {
    if (this.state !== 'open' || this.modalOpen) return;
    this.state = 'locking'; this.timerOn = false; this.drawFifty();
    this.root.querySelectorAll<HTMLButtonElement>('.aq-opt').forEach(b => { b.disabled = true; if (+b.dataset.k! === k) b.classList.add('locked'); });
    aqSfx.lock(); this.after(140, () => aqSfx.suspense());
    this.$('#aq-hsay').textContent = `${LET[k]}, ${this.name}? Locking it in...`;
    this.after(this.calm ? 350 : AQ.SUSPENSE_MS, () => this.reveal(k));
  }

  private reveal(k: number) {
    if (!this.alive) return;
    const r = this.run, q = r.question, res = r.answer(k); if (!res) return;
    this.marks[r.qIdx] = res.correct ? 'ok' : 'bad'; this.state = 'feedback';
    this.root.querySelectorAll<HTMLElement>('.aq-optw').forEach(w => {
      const n = +w.dataset.w!, b = w.querySelector('.aq-opt') as HTMLElement; b.classList.remove('locked');
      if (n === q.correctIndex) b.classList.add('right'); else if (n === k) b.classList.add('wrong'); else w.classList.add('dim');
    });
    res.correct ? aqSfx.right() : aqSfx.wrong();
    this.drawPips();
    const line = res.correct ? (r.streak >= 3 ? this.say(pick(SAY.streak, r.streak), { n: r.streak }) : this.say(pick(SAY.correct, r.answered))) : this.say(pick(SAY.wrong, r.answered));
    this.$('#aq-hsay').textContent = line;
    const last = r.qIdx + 1 >= r.level.questions.length, url = /^https:\/\//.test(q.sourceUrl) ? q.sourceUrl : '';
    this.$('#aq-fbbox').innerHTML = `<div class="aq-fb ${res.correct ? 'good' : 'bad'}">
      <div class="aq-fb-h"><i aria-hidden="true">${res.correct ? '✓' : '★'}</i>${res.correct ? 'Correct!' : 'Not this time'}</div>
      <p class="aq-fb-a">${res.correct ? 'The answer is' : 'The right answer is'} <b>${LET[q.correctIndex]}: ${esc(q.options[q.correctIndex])}</b></p>
      ${q.explanation ? `<p class="aq-fb-e">${esc(q.explanation)}</p>` : ''}
      ${url ? `<a class="aq-fb-l" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M9 8h6"/></svg><span>Learn more from NASA: ${esc(q.sourceTitle)}</span> ↗</a>` : ''}
      <div class="aq-fb-b" id="aq-fbb"><button class="aq-btn" id="aq-main">${last ? 'See result' : 'Next question'}</button><button class="aq-btn ghost" id="aq-restart">Restart game</button></div></div>`;
    this.bindFeedbackButtons(last);
    this.$('#aq-main').focus({ preventScroll: true });
    this.after(60, () => this.$('#aq-fbbox').scrollIntoView({ block: 'nearest', behavior: this.calm ? 'auto' : 'smooth' }));
  }
  private bindFeedbackButtons(last: boolean) {
    (this.$('#aq-main')).onclick = () => { aqSfx.click(); this.next(); };
    (this.$('#aq-restart')).onclick = () => {
      aqSfx.click(); this.$('#aq-fbb').innerHTML = `<div class="aq-ask">${esc(SAY.restartAsk)}<button class="aq-btn" id="aq-yes">Yes, restart</button><button class="aq-btn ghost" id="aq-no">Keep playing</button></div>`;
      (this.$('#aq-yes')).onclick = () => { aqSfx.click(); this.restartNow(); };
      (this.$('#aq-no')).onclick = () => { aqSfx.click(); this.$('#aq-fbb').innerHTML = `<button class="aq-btn" id="aq-main">${last ? 'See result' : 'Next question'}</button><button class="aq-btn ghost" id="aq-restart">Restart game</button>`; this.bindFeedbackButtons(last); this.$('#aq-main').focus(); };
      this.$('#aq-no').focus();
    };
  }
  private restartNow() { this.stopClock(); this.timeouts.forEach(clearTimeout); this.timeouts.clear(); this.marks = []; this.newRun(); this.showLevelSplash(); }

  private next() {
    if (this.state !== 'feedback') return;
    const st = this.run.advance();
    if (st === 'playing') { this.drawQuestion(); return; }
    this.stopClock(); this.state = 'idle'; aqSfx.bedStop();
    if (st === 'levelPassed') this.showLevelPassed(); else if (st === 'completed') this.showComplete(); else this.showFailed();
  }

  // ---------- the clock: runs only while a question waits for an answer ----------
  private startClock() { this.stopClock(); this.lastT = performance.now(); this.clockId = window.setInterval(() => this.tick(), 250); this.tick(); }
  private stopClock() { if (this.clockId) { clearInterval(this.clockId); this.clockId = 0; } this.timerOn = false; }
  private tick() {
    const now = performance.now(), dt = Math.min(now - this.lastT, 500) / 1000; this.lastT = now;
    const live = this.timerOn && !this.modalOpen && !document.hidden && this.state === 'open';
    if (live) this.remaining = Math.max(0, this.remaining - dt);
    const t = this.root.querySelector('#aq-time'), f = this.root.querySelector('#aq-fill') as HTMLElement | null, c = this.root.querySelector('#aq-clock');
    if (!t || !f || !c) return;
    t.textContent = clock(this.remaining); f.style.width = `${(this.remaining / this.limit) * 100}%`;
    c.classList.toggle('low', this.remaining <= AQ.LOW_TIME_S); c.classList.toggle('paused', !live);
    if (live && !this.lowShown && this.remaining <= AQ.LOW_TIME_S && this.remaining > 0) { this.lowShown = true; aqSfx.low(); this.toast(SAY.lowTime); }
    if (live && this.remaining <= 0) this.timeUp();
  }
  private timeUp() {
    this.stopClock(); this.timeouts.forEach(clearTimeout); this.timeouts.clear(); this.state = 'idle'; aqSfx.bedStop();
    this.run.timeUp(); this.showFailed();
  }

  // ---------- results ----------
  private record(): RunSummary {
    const s = this.run.summary();
    if (!this.recorded) {
      this.recorded = true; const got = this.earned(); for (let i = 0; i <= tierIndex(s.tier); i++) got.add(TIERS[i].id); ls.set('ranks', [...got]);
      const best = ls.get<{ points: number } | null>('best', null); if (!best || s.points > best.points) ls.set('best', { points: s.points, tier: s.tier });
    }
    return s;
  }
  private statBox(v: string | number, k: string) { return `<div class="aq-stat aq-glass"><b>${v}</b><span>${k}</span></div>`; }

  private showLevelPassed() {
    const r = this.run, s = r.summary(), n = r.level.level, last = r.results[r.results.length - 1], nx = r.plans[r.levelIdx + 1];
    this.marks = [];
    this.setScreen(`<div class="aq-split">
      <figure class="aq-host">${this.reyesImg('aq-reyes')}</figure>
      <div class="aq-side">
        <div class="aq-bubble left"><span class="aq-who">CAPTAIN REYES</span>${esc(this.say(SAY.levelPass, { n }))}<small>${esc(this.say(SAY.levelPassLine, { next: n + 1 }))}</small></div>
        <div class="aq-big">LEVEL ${n} CLEARED</div>
        <div class="aq-stats">${this.statBox(`${last.correct}/${last.total}`, 'This level')}${this.statBox(s.points.toLocaleString('en-US'), 'Score')}${this.statBox(`${s.levelsCleared}/${s.levelsTotal}`, 'Levels')}</div>
        <button class="aq-btn big" id="aq-main">Start level ${n + 1}</button>
        <p class="aq-rules">Next up: <b>${esc(LEVEL_NAMES[n] ?? '')}</b>, ${nx ? clock(nx.timeLimitS) : ''} on the clock. Harder questions ahead!</p>
      </div></div>`);
    aqSfx.pass(); this.confetti(50);
    (this.$('#aq-main')).onclick = () => { aqSfx.click(); r.nextLevel(); this.showLevelSplash(); };
  }

  private showComplete() {
    const s = this.record(), tier = TIERS.find(t => t.id === s.tier)!;
    this.marks = [];
    this.setScreen(`<div class="aq-split">
      <figure class="aq-host">${this.reyesImg('aq-reyes')}</figure>
      <div class="aq-side">
        <div class="aq-bubble left"><span class="aq-who">CAPTAIN REYES</span>${esc(this.say(SAY.complete))}</div>
        <div class="aq-big">MISSION COMPLETE!</div>
        <div class="aq-rank aq-glass">${badgeImage(s.tier, 'result')}<div><b>${esc(tier.name)}</b><span>${esc(tier.line)}</span></div></div>
        <div class="aq-stats">${this.statBox(s.points.toLocaleString('en-US'), 'Score')}${this.statBox(`${Math.round((s.correct / s.planned) * 100)}%`, 'Right')}${this.statBox(`${s.correct}/${s.planned}`, 'Correct')}</div>
        <div class="aq-row"><button class="aq-btn big" id="aq-main">See my report card</button><button class="aq-btn ghost" id="aq-again">Play again</button></div>
      </div></div>`);
    aqSfx.fanfare(); this.confetti(110); this.after(1400, () => this.confetti(70));
    (this.$('#aq-main')).onclick = () => { aqSfx.click(); this.goReport(); }; (this.$('#aq-again')).onclick = () => { aqSfx.click(); this.restartNow(); };
  }

  private showFailed() {
    const r = this.run, s = this.record(), tier = TIERS.find(t => t.id === s.tier)!, timeout = r.failReason === 'time';
    this.marks = [];
    this.setScreen(`<div class="aq-split">
      <figure class="aq-host">${this.reyesImg('aq-reyes')}</figure>
      <div class="aq-side">
        <div class="aq-bubble left"><span class="aq-who">CAPTAIN REYES</span>${esc(timeout ? SAY.timeout : SAY.fail)}<small>${esc(timeout ? SAY.timeoutLine : SAY.failLine)}</small></div>
        <div class="aq-big soft">${timeout ? "TIME'S UP" : 'NICE TRY, ' + esc(this.name.toUpperCase())}</div>
        <div class="aq-stats">${this.statBox(`${r.levelIdx + 1}`, 'Level reached')}${this.statBox(`${r.correct}/${r.answered}`, 'Correct')}${this.statBox(s.points.toLocaleString('en-US'), 'Score')}</div>
        <div class="aq-rank aq-glass">${badgeImage(s.tier, 'result')}<div><b>${esc(tier.name)}</b><span>${esc(tier.line)}</span></div></div>
        <div class="aq-row"><button class="aq-btn big" id="aq-main">Play again</button><button class="aq-btn ghost" id="aq-rep">See report card</button></div>
      </div></div>`);
    aqSfx.soft();
    (this.$('#aq-main')).onclick = () => { aqSfx.click(); this.restartNow(); }; (this.$('#aq-rep')).onclick = () => { aqSfx.click(); this.goReport(); };
  }

  // ---------- 4a. ask for a name (skippable) ----------
  private goReport() { if (this.named) this.showReport(); else this.showNameStep(); }
  private showNameStep() {
    aqSfx.bedStop();
    this.setScreen(`<div class="aq-split">
      <figure class="aq-host">${this.reyesImg('aq-reyes')}</figure>
      <div class="aq-side">
        <div class="aq-bubble left"><span class="aq-who">CAPTAIN REYES</span>What name should I put on your report card, astronaut?<small>You can skip this and I will pick one for you.</small></div>
        <label class="aq-namelab">Your name<input class="aq-namein" id="aq-nm" maxlength="12" value="${esc(this.prefill)}" placeholder="${GENERIC_NAME}" autocomplete="off" enterkeyhint="done"></label>
        <div class="aq-row"><button class="aq-btn big" id="aq-main">Make my report card</button><button class="aq-btn ghost" id="aq-skip">Skip</button></div>
      </div></div>`);
    const input = this.$<HTMLInputElement>('#aq-nm'); input.focus({ preventScroll: true });
    const go = (skip: boolean) => {
      const c = skip ? '' : cleanName(input.value); this.name = c || GENERIC_NAME; this.named = true;
      if (c) { ls.set('name', c); this.opts.onNameChange?.(c); }
      this.showReport();
    };
    input.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); aqSfx.click(); go(false); } };
    (this.$('#aq-main')).onclick = () => { aqSfx.click(); go(false); }; (this.$('#aq-skip')).onclick = () => { aqSfx.click(); go(true); };
  }

  // ---------- 4. report card + sharing ----------
  private cardData(): CardData {
    const s = this.run.summary(), d = new Date();
    return { name: this.name, tier: s.tier, points: s.points, levelsCleared: s.levelsCleared, levelsTotal: s.levelsTotal, correct: s.correct, answered: s.answered, accuracy: s.accuracy, completed: s.completed, url: this.url, date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) };
  }
  private defaultMsg(): string {
    const s = this.run.summary(), tier = TIERS.find(t => t.id === s.tier)!;
    return `I reached ${tier.name} on Astronaut Quiz! 🚀 ${s.points.toLocaleString('en-US')} points, ${Math.round(s.accuracy * 100)}% right. Can you beat me? ${this.url}`.trim();
  }
  private showReport() {
    this.record(); aqSfx.bedStop(); this.shareMsg = this.defaultMsg();
    const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    this.setScreen(`<div class="aq-report">
      <div class="aq-cardwrap" style="aspect-ratio:4/5;background:rgba(255,255,255,.06)"><img id="aq-card" alt="Your Astronaut Quiz report card" width="1080" height="1350" draggable="false" style="opacity:0;transition:opacity .4s"></div>
      <div class="aq-share aq-glass">
        <h3>SHARE YOUR REPORT CARD</h3>
        <label>Your name<input id="aq-name" maxlength="12" value="${esc(this.name)}" autocomplete="off"></label>
        <label>Say it in your own words<textarea id="aq-msg" rows="3" maxlength="240">${esc(this.shareMsg)}</textarea></label>
        <div class="aq-soc">
          <button class="aq-btn wide" id="aq-dl">${ICON.dl}Download image</button>
          ${canShare ? `<button class="aq-btn ghost wide" id="aq-native">${ICON.share}Share picture…</button>` : ''}
          <button class="aq-btn ghost" data-soc="whatsapp">${ICON.wa}WhatsApp</button><button class="aq-btn ghost" data-soc="x">${ICON.tw}X</button>
          <button class="aq-btn ghost" data-soc="facebook">${ICON.fb}Facebook</button><button class="aq-btn ghost" data-soc="telegram">${ICON.tg}Telegram</button>
          <button class="aq-btn ghost wide" id="aq-copy">${ICON.copy}Copy message</button>
        </div>
        <p class="aq-fine">Tip: download the picture, then add it to your post. Ask a grown-up before you share online.</p>
        <div class="aq-row"><button class="aq-btn" id="aq-main">Play again</button><button class="aq-btn ghost" id="aq-done">Close</button></div>
      </div></div>`);
    aqSfx.card(); if (this.run.status === 'completed') this.confetti(60);
    void this.paintCard();
    const nm = this.$<HTMLInputElement>('#aq-name'), msg = this.$<HTMLTextAreaElement>('#aq-msg'); let deb = 0;
    nm.oninput = () => { const c = cleanName(nm.value); this.name = c || 'Rookie'; ls.set('name', this.name); this.opts.onNameChange?.(this.name); clearTimeout(deb); deb = window.setTimeout(() => { if (!this.msgEdited) { this.shareMsg = this.defaultMsg(); msg.value = this.shareMsg; } void this.paintCard(); }, 350); };
    msg.oninput = () => { this.msgEdited = true; this.shareMsg = msg.value; };
    (this.$('#aq-main')).onclick = () => { aqSfx.click(); this.restartNow(); }; (this.$('#aq-done')).onclick = () => { aqSfx.click(); this.destroy(); };
    (this.$('#aq-dl')).onclick = () => { aqSfx.click(); void this.download(); };
    const nat = this.root.querySelector('#aq-native') as HTMLElement | null; if (nat) nat.onclick = () => { aqSfx.click(); void this.nativeShare(); };
    this.root.querySelectorAll<HTMLElement>('[data-soc]').forEach(b => { b.onclick = () => { aqSfx.click(); this.social(b.dataset.soc!); }; });
    (this.$('#aq-copy')).onclick = () => { aqSfx.click(); void this.copy(); };
  }
  private async paintCard() {
    const seq = ++this.renderSeq, cv = await renderCard(this.cardData()); if (seq !== this.renderSeq || !this.alive) return;
    this.cardCv = cv; const blob = await canvasBlob(cv); if (!blob || seq !== this.renderSeq || !this.alive) return;
    const old = this.cardUrl; this.cardUrl = URL.createObjectURL(blob); const img = this.root.querySelector('#aq-card') as HTMLImageElement | null;
    if (img) { img.src = this.cardUrl; img.style.opacity = '1'; } if (old) URL.revokeObjectURL(old);
  }
  private async blob(): Promise<Blob | null> { if (!this.cardCv) this.cardCv = await renderCard(this.cardData()); return canvasBlob(this.cardCv); }
  private async download() {
    const b = await this.blob(); if (!b) return; const u = URL.createObjectURL(b), a = document.createElement('a');
    a.href = u; a.download = `astronaut-quiz-${this.run.summary().tier}.png`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); this.toast('Saved! Check your downloads.');
  }
  private async nativeShare() {
    try {
      const b = await this.blob(), file = b ? new File([b], 'astronaut-quiz.png', { type: 'image/png' }) : null;
      const data: ShareData = { title: 'Astronaut Quiz', text: this.shareMsg };
      if (file && navigator.canShare?.({ files: [file] })) data.files = [file];
      await navigator.share(data);
    } catch { /* the player closed the share sheet */ }
  }
  /** The message already ends with the game link, so it is sent as-is (no second copy of the link). */
  private social(kind: string) {
    const t = encodeURIComponent(this.shareMsg), u = encodeURIComponent(this.url);
    const href = kind === 'whatsapp' ? `https://wa.me/?text=${t}` : kind === 'x' ? `https://x.com/intent/tweet?text=${t}`
      : kind === 'facebook' ? `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}` : `https://t.me/share/url?url=${u}&text=${t}`;
    window.open(href, '_blank', 'noopener,noreferrer');
  }
  private async copy() {
    try { await navigator.clipboard.writeText(this.shareMsg); } catch { const ta = this.$<HTMLTextAreaElement>('#aq-msg'); ta.select(); try { document.execCommand('copy'); } catch { /* ignore */ } }
    this.toast('Message copied!');
  }

  // ---------- keyboard ----------
  private onKey(e: KeyboardEvent) {
    if (!this.alive || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target as HTMLElement | null)?.tagName ?? '';
    if (e.key === 'Escape') { if (this.root.querySelector('.aq-modal')) return; e.preventDefault(); e.stopPropagation(); void this.requestExit(); return; }
    if (this.root.querySelector('.aq-modal') || tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (this.state === 'open') {
      const k = '1234'.indexOf(e.key) >= 0 && e.key.length === 1 ? +e.key - 1 : e.key.length === 1 ? 'abcd'.indexOf(e.key.toLowerCase()) : -1;
      if (k >= 0 && k < 4 && this.run.question.options[k] !== undefined && !this.run.hidden.includes(k)) { e.preventDefault(); e.stopPropagation(); this.choose(k); }
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      if (tag === 'BUTTON' || tag === 'A') return; // the focused button handles it
      const main = this.root.querySelector('#aq-main') as HTMLElement | null; if (main) { e.preventDefault(); e.stopPropagation(); main.click(); }
    }
  }
}
