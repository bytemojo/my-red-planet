// East wing browser checks (11): gym, lab, bathroom. Needs: npm i --no-save playwright-core, Chrome, dev server on 5179. Usage: node scripts/wing-checks.mjs <outdir>
import { chromium } from 'playwright-core';
const out = process.argv[2];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ok = (n, p, i = '') => console.log(`${p ? 'PASS' : 'FAIL'}  ${n}${i ? '  — ' + i : ''}`);
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }); const errs = [];
page.on('console', m => { if (m.type() === 'error' && !/404|net::/.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(String(e)));
const sc = (fn, a) => page.evaluate(([f, a]) => { const s = window.__game.scene.getScene('World'); return new Function('sc', 'st', 'a', f)(s, s.sess.state, a); }, [fn, a]);
const tp = (x, y) => sc(`const pl = sc.children.list.find(c => c.texture && c.texture.key === 'player'); pl.x = a[0]*32; pl.y = a[1]*32; sc.moveTarget = null;`, [x, y]);
const pos = () => sc(`const pl = sc.children.list.find(c => c.texture && c.texture.key === 'player'); return [pl.x/32, pl.y/32];`);
await page.goto('http://localhost:5179/'); await page.waitForTimeout(1500);
await page.evaluate(() => localStorage.removeItem('mrp.save.v1'));
await page.click('[data-act="play"]'); await page.waitForTimeout(500);
await page.fill('#cr-in', 'Ada'); await page.click('#cr-go'); await page.waitForTimeout(600); await page.click('#op-go'); await page.waitForTimeout(800);
await sc(`st.energy = 100; st.health = 80;`);
// overview of the wing
await sc(`sc.cameras.main.stopFollow(); sc.cameras.main.setZoom(1.25); sc.cameras.main.centerOn(34.5*32, 10.5*32);`); await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/w1-wing-overview.png` });
await sc(`const pl = sc.children.list.find(c => c.texture && c.texture.key === 'player'); sc.cameras.main.setZoom(2); sc.cameras.main.startFollow(pl, true, 1, 1);`);
// walk through the new door from the corridor
await tp(27.5, 11); await page.keyboard.down('d'); await page.waitForTimeout(2200); await page.keyboard.up('d');
const [px] = await pos();
ok('You can walk from the corridor into the east wing', px > 30.5, `x=${px.toFixed(1)}`);
// walk north into the gym through its door (x 33-35, y 9)
await tp(34, 10.6); await page.keyboard.down('w'); await page.waitForTimeout(1600); await page.keyboard.up('w');
const [, py] = await pos();
ok('The gym door lets you in', py < 9, `y=${py.toFixed(1)}`);
// bike
await tp(33.9, 5.9); await page.waitForTimeout(400);
const prompt = await page.textContent('#act').catch(() => '');
ok('Standing at the bike shows its prompt', /Cycle Ergometer/i.test(prompt || ''), prompt);
await page.keyboard.press('e'); await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/w2-gym-panel.png` });
await page.click('[data-do="go"]'); await page.waitForTimeout(400);
ok('The workout mini-game opens', !!(await page.$('#workout')));
await page.screenshot({ path: `${out}/w3-minigame.png` });
// try to land some real reps for up to 6 s, then skip
const t0 = Date.now(); let hits = 0;
while (Date.now() - t0 < 6000 && await page.$('#workout')) { const l = await page.$eval('#wo-mark', e => parseFloat(e.style.left)).catch(() => 0); const p = await page.evaluate(() => { const m = document.querySelector('#wo-mark'), tr = document.querySelector('.wo-track'); if (!m || !tr) return -1; const a = m.getBoundingClientRect(), b = tr.getBoundingClientRect(); return (a.left + 6 - b.left) / b.width; }); if (p > 0.45 && p < 0.55) { await page.keyboard.press(' '); hits++; await page.waitForTimeout(250); } else await page.waitForTimeout(20); void l; }
if (await page.$('#workout')) await page.click('#wo-skip');
ok('Reps can be scored by pressing in the green zone (or skipped)', hits >= 1, `${hits} timed presses`);
const e0 = await sc(`return st.energy`);
await page.waitForTimeout(700); await page.screenshot({ path: `${out}/w4-on-the-bike.png` });
await page.waitForTimeout(1700);
const after = await sc(`return { energy: st.energy, n: st.flags.tmp_workouts, health: st.health }`);
ok('The workout costs energy and counts (1 of 2)', after.n === 1 && after.energy < e0 + 1, JSON.stringify(after));
// rower (unfolds)
await tp(37, 5.9); await page.waitForTimeout(300); await page.keyboard.press('e'); await page.waitForTimeout(300);
await page.click('[data-do="go"]'); await page.waitForTimeout(300); await page.click('#wo-skip'); await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/w5-rower-unfolded.png` }); await page.waitForTimeout(1800);
// bands: third workout = overtraining
await tp(31, 5.3); await page.waitForTimeout(300); await page.keyboard.press('e'); await page.waitForTimeout(300);
await page.click('[data-do="go"]'); await page.waitForTimeout(300); await page.click('#wo-skip'); await page.waitForTimeout(2400);
const toasts = await page.$$eval('#toasts .toast', ts => ts.map(t => t.textContent));
ok('A third workout warns about overtraining', toasts.some(t => /Too much/.test(t)), toasts.join(' | ').slice(0, 120));
await page.screenshot({ path: `${out}/w6-bands.png` });
// lab
await tp(32, 14.8); await page.waitForTimeout(400); await page.keyboard.press('e'); await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/w7-lab.png` });
const ph0 = await sc(`return st.plots[0].health`);
await page.click('[data-do="study"]'); await page.waitForTimeout(400);
const ph1 = await sc(`return st.plots[0].health`);
ok('The lab microscope raises plant health (once per Sol)', ph1 > ph0, `${ph0} -> ${ph1}`);
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
// bathroom
await tp(37.5, 14.8); await page.waitForTimeout(400); await page.keyboard.press('e'); await page.waitForTimeout(400);
const bath = await page.textContent('#inspect').catch(() => '');
ok('The bathroom explains water recovery (98%) with a NASA source', /98%/.test(bath || '') && !!(await page.$('#inspect [data-learn="water_recycling"]')));
await page.screenshot({ path: `${out}/w8-bathroom.png` });
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
// next morning: overtraining message
await sc(`st.hour = 23.95;`); await page.waitForTimeout(1500);
const rep = await page.textContent('#report').catch(() => '');
ok('The morning report mentions yesterday\'s workouts', /workout|trained/i.test(rep || ''), (rep || '').replace(/\s+/g, ' ').slice(0, 140));
await page.screenshot({ path: `${out}/w9-morning.png` });
await page.click('#rep-go').catch(() => {});
// outside east: dish moved
await sc(`sc.cameras.main.stopFollow(); sc.cameras.main.setZoom(1); sc.cameras.main.centerOn(36*32, 14*32);`); await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/w10-east-outside.png` });
ok('No console errors', errs.length === 0, errs.join(' | '));
await browser.close();
