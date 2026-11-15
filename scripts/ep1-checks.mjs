// Episode 1 targeted browser checks (20). Needs: npm i --no-save playwright-core, Chrome, and the dev server on port 5179.
// Usage: node scripts/ep1-checks.mjs <outdir>
import { chromium } from 'playwright-core';
const out = process.argv[2], URL = 'http://localhost:5179/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
const ok = (name, pass, info = '') => { const l = `${pass ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`; results.push(l); console.log(l); };

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
const tp = (page, x, y) => sc(page, `const pl = sc.children.list.find(c => c.texture && c.texture.key === 'player'); pl.x = a[0]*32; pl.y = a[1]*32; sc.moveTarget = null;`, [x, y]);
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
  await page.waitForFunction(() => !document.querySelector('#sun-card')?.textContent.includes('Checking'), null, { timeout: 15000 }).catch(() => {});
  const txt = (await page.textContent('#sun-card')) || '';
  ok('Menu shows LIVE DONKI data when online', /LIVE/.test(txt) && /class [ABCMX]/.test(txt), txt.replace(/\s+/g, ' ').slice(0, 140));
  ok('Solar Forecast has no live-data checkbox', /Solar Forecast/.test(txt) && await page.$('#sun-use') === null);
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
  if (pop) { await pop.waitForURL(/nasa\.gov/, { timeout: 25000 }).catch(() => {}); ok('Clicking a wiki link opens the NASA page', /nasa\.gov/.test(pop.url()), `${pop.url()} · "${(await pop.title().catch(() => '')).slice(0, 60)}"`); await pop.close(); }
  else ok('Clicking a wiki link opens the NASA page', false, 'no new tab');
  ok('No console errors (live menu)', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

// 2. Offline fallback
{
  const { ctx, page } = await newPage(true);
  await page.waitForFunction(() => !document.querySelector('#sun-card')?.textContent.includes('Checking'), null, { timeout: 15000 }).catch(() => {});
  const txt = (await page.textContent('#sun-card')) || '';
  ok('Menu falls back to ARCHIVED when DONKI is unreachable', /ARCHIVED/.test(txt) && !/LIVE/.test(txt), txt.replace(/\s+/g, ' ').slice(0, 140));
  ok('Archived Solar Forecast has no live-data checkbox', /Solar Forecast/.test(txt) && await page.$('#sun-use') === null);
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
  await page.waitForSelector('#dlg [data-choice="ask"]', { timeout: 20000 });
  ok('Storm Call appears on its own in the test fixture', true);
  await page.click('#dlg [data-choice="ask"]'); await page.waitForTimeout(400);
  const sent = await page.$('#dlg .sent');
  ok('Ask Earth shows "message sent" and the card stays open', !!sent && !!(await page.$('#dlg')));
  await page.screenshot({ path: `${out}/c5-ask-sent.png` });
  await page.waitForSelector('#dlg', { state: 'detached', timeout: 20000 });
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

// 4. Suit blackout reloads the checkpoint
{
  const { ctx, page, errs } = await newPage();
  await page.waitForTimeout(1200);
  await page.click('[data-act="play"]'); await page.waitForTimeout(800);
  if (await page.$('#cr-in')) { await page.fill('#cr-in', 'Ada'); await page.click('#cr-go'); await page.waitForTimeout(700); }
  await page.click('#op-go'); await page.waitForTimeout(800);
  const before = await sc(page, `return { suit: st.suitOn, hour: st.hour }`);
  await tp(page, 16, 20.5); await page.waitForTimeout(1200);
  const box = await page.$('#fail');
  ok('Going outside without the suit makes you pass out', !!box && /forgot your suit/i.test((await box.textContent()) || ''), `suit was ${before.suit}`);
  await page.screenshot({ path: `${out}/c7-passout.png` });
  if (box) { await page.click('#po-go'); await page.waitForTimeout(800); }
  const after = await sc(page, `const pl = sc.children.list.find(c => c.texture && c.texture.key === 'player'); return { outside: st.outside, passOuts: st.ep.passOuts, phase: st.ep.phase, py: Math.round(pl.y / 32) }`);
  ok('Checkpoint reloaded: back inside, pass-out counted', after.outside === false && after.passOuts === 1 && after.py < 18, JSON.stringify(after));
  // learning link on the objective hint
  await page.click('#obj-toggle'); await page.waitForTimeout(300);
  const learn = await page.$('#obj-hint [data-learn]');
  if (learn) {
    await learn.click(); await page.waitForTimeout(400);
    const a = await page.$('#learn a'); const href = a ? await a.getAttribute('href') : null;
    await page.screenshot({ path: `${out}/c8-learn-card.png` });
    const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 15000 }).catch(() => null), a ? a.click() : Promise.resolve()]);
    if (pop) await pop.waitForURL(/nasa\.gov/, { timeout: 25000 }).catch(() => {});
    ok('Learning card opens its NASA source', !!pop && /nasa\.gov/.test(pop.url()), `${href} -> ${pop ? pop.url() : 'no tab'}`);
    if (pop) await pop.close();
  } else ok('Learning card opens its NASA source', false, 'no learn button on the objective');
  ok('No console errors (pass-out)', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

await browser.close();
