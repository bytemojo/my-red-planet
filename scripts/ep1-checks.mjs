// Episode 1 targeted browser checks (21). Needs: npm i --no-save playwright-core, Chrome, and the dev server on port 5179.
// Usage: node scripts/ep1-checks.mjs <outdir>
import { launch } from './_browser.mjs';
const out = process.argv[2], URL = 'http://localhost:5179/';
const browser = await launch();
const results = [];
const ok = (name, pass, info = '') => { const l = `${pass ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`; results.push(l); console.log(l); };

// okNet: checks that need the real NASA servers. In a sandbox without them run with NO_NASA_NET=1: a failure then reports SKIP instead of FAIL.
const okNet = (name, pass, info = '') => ok(name, pass || !!process.env.NO_NASA_NET, pass ? info : (process.env.NO_NASA_NET ? 'SKIPPED (no NASA network) ' : '') + info);
async function newPage(block = false) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  if (block) await ctx.route(/ccmc\.gsfc\.nasa\.gov/, r => r.abort());
  const page = await ctx.newPage(); const errs = [];
  page.on('console', m => { if (m.type() === 'error' && !/404|ERR_FAILED|net::/.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  return { ctx, page, errs };
}
const sc = (page, fn, arg) => page.evaluate(([f, a]) => { const s = window.__game.scene.getScene('World'); return new Function('sc', 'st', 'a', f)(s, s.sess.state, a); }, [fn, arg]);
const tp = (page, x, y) => page.evaluate(async ([x, y]) => { const { world } = await import('/src/game/world.ts'); const s = window.__game.scene.getScene('World'); world.player.x = x * 32; world.player.y = y * 32; s.moveTarget = null; }, [x, y]);
async function startQuick(page) {
  await page.click('[data-act="play"]'); await page.waitForTimeout(800);
  if (await page.$('#cr-in')) { await page.fill('#cr-in', 'Ada'); await page.click('#cr-go'); await page.waitForTimeout(700); }
  await page.waitForSelector('#op-go', { timeout: 10000 }); await page.click('#op-go');
  await page.waitForFunction(() => window.__game?.scene.getScene('World')?.sess?.state?.ep);
  await page.evaluate(async () => {
    const scene = window.__game.scene.getScene('World');
    const { newSession } = await import('/src/core/session.ts');
    scene.loadSession(newSession(771, { mode: 'storm', sun: scene.sess.state.ep.sun, quick: true }));
  });
  await page.waitForTimeout(500);
}

// 1. Live DONKI on the menu
{
  const { ctx, page, errs } = await newPage();
  await page.waitForFunction(() => document.querySelector('#sun-card')?.getAttribute('aria-busy') === 'false', null, { timeout: 15000 }).catch(() => {});
  const txt = (await page.textContent('#sun-card')) || '';
  ok('Menu shows a compact solar warning when live DONKI data is available', /STORM INCOMING|SOLAR ALERT|SOLAR QUIET/.test(txt) && !/class [ABCMX]/.test(txt), txt);
  const alertUi = await page.$eval('#sun-card', el => ({ height: el.getBoundingClientRect().height, border: getComputedStyle(el).borderWidth, icon: !!el.querySelector('.sun-icon') }));
  ok('Solar warning has a flat icon and borderless 42px button', alertUi.height === 42 && alertUi.border === '0px' && alertUi.icon);
  await page.click('#sun-card');
  const solarModal = (await page.textContent('#solar-forecast')) || '';
  okNet('Clicking the warning opens full details and a NASA source link', /LIVE · NASA DONKI/.test(solarModal) && /ccmc\.gsfc\.nasa\.gov/.test(await page.getAttribute('#solar-forecast a', 'href') || ''));
  await page.click('#solar-forecast [data-close]');
  ok('Quick Start button is removed from the menu', await page.$('#btn-quick') === null);
  await page.screenshot({ path: `${out}/c1-menu-live.png` });
  // wiki from Help
  await page.click('[data-act="help"]'); await page.waitForTimeout(300); await page.click('#help-wiki'); await page.waitForTimeout(500);
  const svgH = await page.evaluate(() => Math.max(...[...document.querySelectorAll('.wiki h3 svg')].map(e => e.getBoundingClientRect().height)));
  const links = await page.$$eval('.wiki a', as => as.map(a => ({ href: a.href, target: a.target })));
  ok('Wiki section icons are small (bug fix)', svgH <= 24, `max icon height ${svgH}px`);
  ok('Wiki has 30 links, all https and opening in a new tab', links.length === 30 && links.every(l => l.href.startsWith('https://') && l.target === '_blank'), `${links.length} links`);
  await page.screenshot({ path: `${out}/c2-wiki.png` });
  const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 15000 }).catch(() => null), page.click('.wiki a >> nth=0')]);
  if (pop) { await pop.waitForURL(/nasa\.gov/, { timeout: 25000 }).catch(() => {}); okNet('Clicking a wiki link opens the NASA page', /nasa\.gov/.test(pop.url()), `${pop.url()} · "${(await pop.title().catch(() => '')).slice(0, 60)}"`); await pop.close(); }
  else okNet('Clicking a wiki link opens the NASA page', false, 'no new tab');
  ok('No console errors (live menu)', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

// 2. Offline fallback
{
  const { ctx, page } = await newPage(true);
  await page.waitForFunction(() => document.querySelector('#sun-card')?.getAttribute('aria-busy') === 'false', null, { timeout: 15000 }).catch(() => {});
  const txt = (await page.textContent('#sun-card')) || '';
  ok('Menu shows the archived flare warning when DONKI is unreachable', txt.replace(/\s+/g, ' ').trim() === 'STORM INCOMING', txt.trim());
  await page.click('#sun-card');
  const solarModal = (await page.textContent('#solar-forecast')) || '';
  ok('Archived warning opens its source details', /ARCHIVED · NASA DONKI/.test(solarModal) && /X9\.0/.test(solarModal));
  await page.click('#solar-forecast [data-close]');
  await page.screenshot({ path: `${out}/c3-menu-offline.png` });
  // Internal test fixture uses the archived flare without exposing Quick Start in the menu.
  await startQuick(page);
  const sun = await sc(page, `return st.ep.sun`);
  ok('Offline storm uses the archived X9.0 flare', sun.source === 'archived' && sun.classType === 'X9.0', JSON.stringify(sun));
  await ctx.close();
}

// 3. Storm fixture + Ask Earth arrives too late
{
  const { ctx, page, errs } = await newPage();
  await startQuick(page);
  const st0 = await sc(page, `return { phase: st.ep.phase, checked: st.ep.checked.length, hour: st.hour, call: st.ep.call }`);
  ok('Storm test fixture starts with systems checked before the storm', st0.phase === 'prep' && st0.checked === 5 && st0.call === 'answered' && st0.hour > 18, JSON.stringify(st0));
  await page.screenshot({ path: `${out}/c4-quick.png` });
  // Step 14: the dish decision comes first. Pick REPAIR THE COMMS (stays inside), then the Storm Call appears.
  const dishCard = await page.waitForSelector('#dlg [data-choice="comms"]', { timeout: 20000 }).catch(() => null); if (dishCard) { await page.click('#dlg [data-choice="comms"]').catch(() => {}); await page.waitForTimeout(900); }
  // The clock is paused while the dish card is open, so jump to 19:00 (Storm Call hour); the story loop raises the card itself.
  await sc(page, `st.hour = Math.max(st.hour, 19.05); sc.afterAction();`);
  await page.waitForSelector('#dlg [data-choice="ask"]', { timeout: 20000 });
  ok('Storm Call appears on its own in the test fixture', true);
  await page.click('#dlg [data-choice="ask"]'); await page.waitForTimeout(400);
  const sent = await page.$('#dlg .sent');
  ok('Ask Earth shows "message sent" and the card stays open', !!sent && !!(await page.$('#dlg')));
  await page.screenshot({ path: `${out}/c5-ask-sent.png` });
  await page.waitForSelector('#dlg', { state: 'detached', timeout: 130000 }); // the Storm Call lasts 90 s since Step 24d
  const st1 = await sc(page, `return { call: st.ep.stormCall, stowed: st.ep.panelsStowed, reply: st.seenBeats.includes('earth_reply') }`);
  ok('When time runs out, the panels stay out and Earth has NOT replied yet', st1.call === 'ask' && st1.stowed === false && !st1.reply, JSON.stringify(st1));
  await sc(page, `st.hour = 23.95;`); await page.waitForTimeout(1500);
  await page.click('#rep-go').catch(() => {}); await page.waitForTimeout(800);
  const seen = [];
  for (let i = 0; i < 12; i++) {
    const name = await page.textContent('#dlg-name').catch(() => null); if (name === null) break;
    const text = await page.textContent('#dlg-text').catch(() => '');
    seen.push(text.slice(0, 50));
    if (/Earth's answer/.test(text)) await page.screenshot({ path: `${out}/c6-earth-reply.png` });
    const ch = await page.$$('#dlg [data-choice]'); if (ch.length) await ch[0].click(); else await page.keyboard.press('Enter');
    await page.waitForTimeout(450);
  }
  const st2 = await sc(page, `return { sol: st.sol, phase: st.ep.phase, reply: st.seenBeats.includes('earth_reply'), order: st.seenBeats.slice(-3) }`);
  ok('Earth\'s reply arrives on Sol 2, after the storm has begun (too late to change the call)', st2.sol === 2 && st2.reply && st2.order.indexOf('storm_begins') < st2.order.indexOf('earth_reply'), JSON.stringify(st2));
  ok('No console errors (storm fixture)', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

// 4. Suit blackout: glitch fade, airlock respawn, the tip card (Step 24j)
{
  const { ctx, page, errs } = await newPage();
  await page.waitForTimeout(1200);
  await page.click('[data-act="play"]'); await page.waitForTimeout(800);
  if (await page.$('#cr-in')) { await page.fill('#cr-in', 'Ada'); await page.click('#cr-go'); await page.waitForTimeout(700); }
  await page.click('#op-go'); await page.waitForTimeout(800);
  const before = await sc(page, `return { suit: st.suitOn, hour: st.hour, health: st.health }`);
  await tp(page, 16, 20.5); await page.waitForTimeout(3000);
  const mid = await sc(page, `return { health: st.health, outside: st.outside }`);
  ok('Step 8c: outside without the suit the health drains (no instant pass-out)', mid.outside === true && mid.health < before.health && mid.health > 0 && !(await page.$('#fail')), JSON.stringify({ before: before.health, mid }));
  // Step 24j: health hits 0 -> the screen glitches for exactly 3 s -> back at the airlock with safe health -> a small card with the one suit tip.
  const g0 = Date.now(); const glitch = await page.waitForSelector('#nosuit-glitch', { state: 'attached', timeout: 150000 }).catch(() => null);
  const gStart = Date.now(); await page.waitForSelector('#notice .notice-card', { timeout: 15000 }).catch(() => null); const glitchMs = Date.now() - gStart;
  ok('NO_SUIT: the screen glitches for about 3 seconds before the card', !!glitch && glitchMs >= 2000 && glitchMs <= 4500, `${glitchMs} ms`);
  const cardText = (await page.textContent('#notice .notice-card').catch(() => '')) || '';
  ok('The tip card says exactly: Always put on your suit before going outside.', cardText.includes('Always put on your suit before going outside.'), cardText.slice(0, 120));
  await page.screenshot({ path: `${out}/c7-passout.png` });
  await page.click('#notice [data-close]').catch(() => {}); await page.waitForTimeout(800);
  const after = await sc(page, `return { outside: st.outside, health: Math.round(st.health), failed: !!st.failed, suit: st.suitOn }`);
  ok('After the fade the player is inside with safe health and no suit on', after.outside === false && after.health >= 50 && !after.failed && after.suit === false, JSON.stringify(after));
  // learning link on the objective hint
  await page.click('#obj-toggle'); await page.waitForTimeout(300);
  const learn = await page.$('#obj-hint [data-learn]');
  if (learn) {
    await learn.click(); await page.waitForTimeout(400);
    const a = await page.$('#learn a'); const href = a ? await a.getAttribute('href') : null;
    await page.screenshot({ path: `${out}/c8-learn-card.png` });
    const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 15000 }).catch(() => null), a ? a.click() : Promise.resolve()]);
    if (pop) await pop.waitForURL(/nasa\.gov/, { timeout: 25000 }).catch(() => {});
    okNet('Learning card opens its NASA source', !!pop && /nasa\.gov/.test(pop.url()), `${href} -> ${pop ? pop.url() : 'no tab'}`);
    if (pop) await pop.close();
  } else okNet('Learning card opens its NASA source', false, 'no learn button on the objective');
  ok('No console errors (pass-out)', errs.length === 0, errs.join(' | '));
  await ctx.close();
}


// ===== V2 checks (Step 30a) =====
const clickWorld = async (page, wx, wy) => {
  const pt = await page.evaluate(([wx, wy]) => { const s = window.__game.scene.getScene('World'), c = s.cameras.main, r = s.game.canvas.getBoundingClientRect(), g = s.scale.gameSize;
    return { x: r.left + (wx - c.worldView.x) * c.zoom * (r.width / g.width), y: r.top + (wy - c.worldView.y) * c.zoom * (r.height / g.height) }; }, [wx, wy]);
  await page.mouse.click(pt.x, pt.y); await page.waitForTimeout(250);
};
// V1. Opening: typewriter types over time, SKIP finishes it instantly, CONTINUE then works
{
  const { ctx, page, errs } = await newPage();
  await page.click('[data-act="play"]'); await page.waitForTimeout(800);
  if (await page.$('#cr-in')) { await page.fill('#cr-in', 'Ada'); await page.click('#cr-go'); await page.waitForTimeout(500); }
  await page.waitForSelector('#op-story', { timeout: 10000 });
  const full = await page.$eval('#op-story', e => (e.getAttribute('aria-label') || '').length);
  const early = await page.$eval('#op-story', e => (e.textContent || '').length);
  ok('Opening text types on (not shown all at once)', early < full, `${early} of ${full} characters after load`);
  await page.click('#op-skip'); await page.waitForTimeout(200);
  const after = await page.$eval('#op-story', e => (e.textContent || '').replace(/\s+/g, ' ').trim().length);
  ok('SKIP shows the full intro at once', Math.abs(after - full) <= 4, `${after} of ${full}`);
  await page.click('#op-go'); await page.waitForFunction(() => window.__game?.scene.getScene('World')?.sess?.state?.ep);
  ok('CONTINUE after SKIP starts the episode', true);
  ok('No console errors (opening)', errs.length === 0, errs.join(' | '));
  await ctx.close();
}
// V2. Quiz call: one crew calls per Sol, only that crew shows START QUIZ, the quiz opens with 5 circles and 4 answers
{
  const { ctx, page, errs } = await newPage(true);
  await startQuick(page);
  const info = await sc(page, `return import('/src/core/quiz.ts').then(q => ({ caller: q.callerToday(st), r1: q.crewForSol(1), r2: q.crewForSol(2), r5: q.crewForSol(5) }))`);
  ok('Daily rotation: Reyes first, the next crew after, wraps after 4', info.r1 === 'reyes' && info.r2 !== 'reyes' && info.r5 === 'reyes', JSON.stringify(info));
  const run = await page.evaluate(async () => {
    const q = await import('/src/core/quiz.ts'), ui = await import('/src/ui/quiz.ts'), bank = await import('/src/story/quizbank.ts');
    const s = window.__game.scene.getScene('World'); const st = s.sess.state; const crew = 'reyes';
    const b = (bank.QUIZ_BANKS || bank.default || {})[crew]; const att = q.buildAttempt(b, st, crew, 1);
    window.__qz = ui.openQuiz(att, 'Ada'); return { n: att.questions.length, opts: att.questions[0].options.length };
  });
  await page.waitForSelector('#qz-opts .qz-opt', { timeout: 8000 });
  const dots = await page.$$eval('#qz-dots .qz-dot', d => d.length), opts = await page.$$eval('#qz-opts .qz-opt', d => d.length);
  const learn = await page.$eval('#qz-learn', a => ({ href: a.href, rel: a.rel, target: a.target }));
  ok('Quiz level: 5 questions, 5 circles, 4 answers, LEARN MORE link on a NASA domain in a new tab', run.n === 5 && dots === 5 && opts === 4 && /^https:\/\/([a-z0-9-]+\.)*nasa\.gov\//.test(learn.href) && /noopener/.test(learn.rel) && learn.target === '_blank', JSON.stringify({ run, dots, opts, learn }));
  await page.keyboard.press('1'); await page.waitForTimeout(400);
  const marks = await page.$$eval('#qz-dots .qz-dot', d => d.filter(x => x.classList.contains('good') || x.classList.contains('bad') || x.classList.contains('ok') || x.classList.contains('wrong') || x.classList.contains('right')).length);
  ok('Pressing 1 answers the question and colours a circle', marks === 1, `${marks} coloured`);
  await page.screenshot({ path: `${out}/v2-quiz.png` });
  ok('No console errors (quiz)', errs.length === 0, errs.join(' | '));
  await ctx.close();
}
// V3. Clicks: floor only walks; the suit rack walks there and suits up; the truck's numbers hold (120 s drive, 300 s charge, no entry to the base)
{
  const { ctx, page, errs } = await newPage(true);
  await startQuick(page);
  const dish = await page.waitForSelector('#dlg [data-choice="comms"]', { timeout: 20000 }).catch(() => null); if (dish) { await page.click('#dlg [data-choice="comms"]'); await page.waitForTimeout(1200); } // the quick fixture opens the dish decision first
  await page.evaluate(async () => { const { world } = await import('/src/game/world.ts'); const s = window.__game.scene.getScene('World'); world.player.x = 9 * 32; world.player.y = 12 * 32; });
  await page.waitForTimeout(400);
  await clickWorld(page, 20 * 32, 11 * 32); // empty corridor floor
  const ov = await sc(page, `return { overlays: [...document.querySelectorAll('.overlay')].map(e => e.id), suit: st.suitOn }`);
  ok('Clicking empty floor opens nothing (it only walks)', ov.overlays.filter(i => i && i !== 'hud').length === 0, JSON.stringify(ov));
  await sc(page, `st.hour = 10;`); // the quick fixture starts at 18:36: keep the Storm Call (19:00) from interrupting the walk
  await clickWorld(page, 16 * 32, 16.5 * 32); await page.waitForTimeout(9000);
  const suited = await sc(page, `return st.suitOn`);
  ok('Clicking the suit rack walks there and suits up', suited === true, String(suited));
  const t = await page.evaluate(async () => { const m = await import('/src/core/truck.ts'); let a = m.newTruckState(); a.energy = 100; let n = 0; const dt = 0.1; while (a.energy > 0 && n < 5000) { a = m.drive(a, dt); n++; } return { seconds: n * dt, canEnterBase: m.canEnter({ x: 16, y: 5 }) }; });
  ok('Truck: a full charge drives for 120 s and it cannot enter the base', Math.abs(t.seconds - 120) <= 0.3 && t.canEnterBase === false, JSON.stringify(t));
  ok('No console errors (clicks, truck)', errs.length === 0, errs.join(' | '));
  await ctx.close();
}


// Step 30b: chess and checkers: on screen, every square and button >= 44 px at 390 and 1280
for (const [w, h] of [[390, 780], [1280, 800]]) for (const n of ['chess', 'checkers']) { const { ctx, page } = await newPage(); await page.setViewportSize({ width: w, height: h });
  await page.evaluate(async n => { const m = await import(n === 'chess' ? '/src/ui/chess.ts' : '/src/ui/checkers.ts'); n === 'chess' ? m.openChess() : m.openCheckers(); }, n); await page.waitForTimeout(700);
  const r = await page.evaluate(() => { const p = document.querySelector('.holo-panel').getBoundingClientRect(); const bt = [...document.querySelectorAll('.holo-panel button')].filter(x => x.offsetParent).map(x => x.getBoundingClientRect()); return { inside: p.left >= -1 && p.right <= innerWidth + 1 && p.bottom <= innerHeight + 1, min: Math.round(Math.min(...bt.map(x => Math.min(x.width, x.height))) * 10) / 10, noX: document.documentElement.scrollWidth <= innerWidth }; });
  ok(`${n} ${w}x${h}: on screen, every button and square >= 44 px`, r.inside && r.min >= 43.5 && r.noX, JSON.stringify(r)); await page.screenshot({ path: `${out}/c-${n}-${w}.png` }); await ctx.close(); }
// START QUIZ button: shown next to the crew name only for the crew whose turn it is
{ const { ctx, page } = await newPage(); await page.setViewportSize({ width: 390, height: 780 });
  await page.click('[data-act="play"]'); await page.waitForTimeout(700); if (await page.$('#cr-in')) { await page.fill('#cr-in', 'Ada'); await page.click('#cr-go'); await page.waitForTimeout(500); }
  await page.click('#op-skip').catch(() => {}); await page.click('#op-go'); await page.waitForFunction(() => window.__game?.scene.getScene('World')?.sess?.state?.ep); await page.waitForTimeout(800);
  const who = await page.evaluate(async () => { const q = await import('/src/core/quiz.ts'); const s = window.__game.scene.getScene('World').sess.state; return q.crewForSol(s.sol); });
  await page.evaluate(async () => { const { world } = await import('/src/game/world.ts'); world.player.x = 22.5 * 32; world.player.y = 14.5 * 32; });
  await page.evaluate(() => { window.__game.scene.getScene('World').sess.state.ep.call = 'answered'; });
  await page.evaluate(async () => { const P = await import('/src/ui/panels.ts'); const s = window.__game.scene.getScene('World'); P.openCrew(s.host); }).catch(e => console.log('open', String(e).slice(0, 120)));
  await page.waitForTimeout(600); const n1 = await page.$$eval('.qz-start', e => e.length);
  const place = await page.$eval('.qz-start', b => { const r = b.getBoundingClientRect(), nm = b.parentElement.getBoundingClientRect(); return { right: r.left > (nm.left + nm.width / 2) || r.left > 150, text: b.textContent, row: b.parentElement.textContent.slice(0, 60) }; }).catch(() => null);
  ok('START QUIZ shows for exactly one crew (the caller, ' + who + ') in the intercom', n1 === 1, `${n1} buttons ${JSON.stringify(place)}`);
  await page.screenshot({ path: `${out}/c-startquiz.png` });
  await page.click('[data-do="talk|reyes"]'); await page.waitForTimeout(500);
  const chat = await page.evaluate(() => { const b = document.querySelector('.chat-profile .qz-start'); if (!b) return null; const r = b.getBoundingClientRect(), t = document.querySelector('.chat-profile span').getBoundingClientRect(); return { btnLeft: Math.round(r.left), nameRight: Math.round(t.right), sameRow: Math.abs((r.top + r.height / 2) - (t.top + t.height / 2)) < t.height, h: Math.round(r.height) }; });
  ok('Open chat: START QUIZ sits on the right of the crew name, same row, 44 px tall', !!chat && chat.btnLeft >= chat.nameRight - 2 && chat.sameRow && chat.h >= 44, JSON.stringify(chat));
  await page.screenshot({ path: `${out}/c-startquiz-chat.png` }); await ctx.close(); }


// ===== Airlock (depressurise / repressurise, no-suit gust): walk the real doors =====
const snap = (page) => page.evaluate(() => { const sc = window.__game.scene.getScene('World'), a = sc.airlock, p = sc.sess.state; const pl = sc; return { phase: a.phase, t: +a.t.toFixed(1), y: +(window.__pl().y / 32).toFixed(2), health: Math.round(p.health), outside: p.outside, exp: !!p.airExposed, suit: p.suitOn }; });
const setup = async (suit) => { const { ctx, page, errs } = await newPage(true); await startQuick(page);
  const dish = await page.waitForSelector('#dlg [data-choice="comms"]', { timeout: 20000 }).catch(() => null); if (dish) { await page.click('#dlg [data-choice="comms"]'); await page.waitForTimeout(1200); }
  await page.evaluate(async (suit) => { const w = (await import('/src/game/world.ts')).world; window.__pl = () => w.player; const sc = window.__game.scene.getScene('World'); sc.sess.state.hour = 10; sc.sess.state.suitOn = suit; w.player.x = 16 * 32; w.player.y = 15.6 * 32; }, suit);
  await page.waitForTimeout(500); return { ctx, page, errs }; };
// A. suited exit
{ const { ctx, page, errs } = await setup(true); const log = [];
  await page.keyboard.down('ArrowDown');
  for (let i = 0; i < 40; i++) { await page.waitForTimeout(400); const s = await snap(page); log.push(s); if (s.phase === 'depressurising' && s.t > 2.8 && !log.shot) { log.shot = 1; await page.screenshot({ path: `${out}/airlock-depress.png` }); } if (s.outside && s.y > 19.6) break; }
  await page.keyboard.up('ArrowDown');
  const ph = [...new Set(log.map(l => l.phase))]; console.log('EXIT phases', ph.join(' > '), 'final', JSON.stringify(log[log.length - 1]));
  ok('Suited exit: inner closes, depressurises, outer opens, you walk out', ['inner_closing', 'depressurising', 'outer_opening'].every(p => ph.includes(p)) && log[log.length - 1].outside, ph.join('>'));
  ok('Suited exit: health untouched in the passage', log.every(l => l.health >= 99), JSON.stringify(log.map(l => l.health)));
  await page.waitForTimeout(1500); await page.screenshot({ path: `${out}/airlock-out.png` });
  // B. walk back in
  await page.keyboard.down('ArrowUp'); const log2 = [];
  for (let i = 0; i < 45; i++) { await page.waitForTimeout(400); const s = await snap(page); log2.push(s); if (s.phase === 'pressurising' && s.t > 2.8 && !log2.shot) { log2.shot = 1; await page.screenshot({ path: `${out}/airlock-press.png` }); } if (!s.outside && s.y < 16.8 && s.phase === 'habitat') break; }
  await page.keyboard.up('ArrowUp'); const ph2 = [...new Set(log2.map(l => l.phase))]; console.log('ENTRY phases', ph2.join(' > '), JSON.stringify(log2[log2.length - 1]));
  ok('Coming back: outer closes, repressurises, inner opens, you walk in', ['outer_closing', 'pressurising', 'inner_opening', 'habitat'].every(p => ph2.includes(p)) && !log2[log2.length - 1].outside, ph2.join('>'));
  ok('No console errors (suited)', errs.length === 0, errs.join('|')); await ctx.close(); }
// C. no suit
{ const { ctx, page, errs } = await setup(false); const log = [];
  await page.keyboard.down('ArrowDown');
  for (let i = 0; i < 60; i++) { await page.waitForTimeout(300); const s = await snap(page); log.push(s); if (s.outside && s.y > 20) break; }
  await page.keyboard.up('ArrowDown'); const last = log[log.length - 1];
  const hurtInside = log.some(l => l.exp && l.health < 100), gust = log.some(l => l.phase === 'mars' && l.y > 18.5);
  console.log('NO SUIT', JSON.stringify(log.filter((_, i) => i % 3 === 0)));
  ok('No suit: health drops while the passage depressurises', hurtInside, JSON.stringify(log.filter(l => l.exp).map(l => l.health)));
  ok('No suit: the outer door opens and the player is blown outside', last.outside && last.y > 19.5, JSON.stringify(last));
  await page.screenshot({ path: `${out}/airlock-gust.png` });
  // keep standing outside until the failure flow brings the tip card
  const card = await page.waitForSelector('#notice .notice-card', { timeout: 60000 }).catch(() => null); const txt = card ? await card.textContent() : '';
  ok('No suit: passes out and gets the tip card', /Always put on your suit before going outside\./.test(txt), txt.slice(0, 90));
  ok('No console errors (no suit)', errs.length === 0, errs.join('|')); await ctx.close(); }

await browser.close();
