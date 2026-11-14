// Character creator browser checks (16). Needs: npm i --no-save playwright-core, Chrome, dev server on 5179. Usage: node scripts/creator-checks.mjs <outdir>
import { chromium } from 'playwright-core';
const out = process.argv[2];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ok = (n, p, i = '') => console.log(`${p ? 'PASS' : 'FAIL'}  ${n}${i ? '  — ' + i : ''}`);
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage(); const errs = [];
page.on('console', m => { if (m.type() === 'error' && !/404|net::/.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(String(e)));
await page.goto('http://localhost:5179/'); await page.waitForTimeout(1500);
await page.click('[data-act="play"]'); await page.waitForTimeout(600);
ok('Creator opens on a new game', !!(await page.$('#creator #cr-in')));
ok('Continue is disabled before a name', await page.$eval('#cr-go', b => b.disabled));
await page.click('#cr-in'); await page.keyboard.type('Ada Love!'); await page.waitForTimeout(200);
ok('Spaces and symbols are blocked while typing', (await page.inputValue('#cr-in')) === 'AdaLove', await page.inputValue('#cr-in'));
await page.fill('#cr-in', ''); await page.keyboard.type('A'); await page.waitForTimeout(150);
ok('Too-short name shows an error and keeps Continue disabled', (await page.textContent('#cr-err')).length > 0 && await page.$eval('#cr-go', b => b.disabled), await page.textContent('#cr-err'));
await page.keyboard.type('da'); await page.waitForTimeout(150);
ok('Valid name enables Continue', !(await page.$eval('#cr-go', b => b.disabled)));
await page.click('[data-skin] >> nth=1'); await page.click('[data-style="long"]'); await page.click('[data-hair] >> nth=9');
await page.screenshot({ path: `${out}/cr-desktop.png` });
const skinPicked = await page.$eval('[data-skin] >> nth=1', b => b.getAttribute('aria-pressed'));
ok('Swatch selection is shown (ring)', skinPicked === 'true');
// colour wheel click
const wb = await page.$('#cr-wheel'); const box = await wb.boundingBox();
await page.mouse.click(box.x + box.width * 0.85, box.y + box.height * 0.5); await page.waitForTimeout(150);
const hexAfterWheel = await page.inputValue('#cr-hex');
ok('Clicking the colour wheel sets the hair colour', /^#[0-9a-f]{6}$/i.test(hexAfterWheel) && hexAfterWheel.toLowerCase() !== '#d660a8', hexAfterWheel);
await page.click('[data-hair] >> nth=9'); // back to pink for an easy pixel check
await page.click('#cr-go'); await page.waitForTimeout(800);
ok('Backstory card follows the creator', !!(await page.$('#op-go')));
const set = await page.evaluate(() => JSON.parse(localStorage.getItem('mrp.settings') || '{}'));
ok('Name and look are saved', set.name === 'Ada' && set.look?.style === 'long' && set.look?.hair === 0xd660a8, JSON.stringify(set.look));
await page.click('#op-go'); await page.waitForTimeout(1200);
// player texture uses the chosen hair colour
const hasPink = await page.evaluate(() => { const t = window.__game.textures.get('player'); const src = t.getSourceImage(); const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const x = c.getContext('2d'); x.drawImage(src, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; for (let i = 0; i < d.length; i += 4) if (d[i] === 0xd6 && d[i + 1] === 0x60 && d[i + 2] === 0xa8) return true; return false; });
ok('The player sprite in the world uses the chosen hair colour', hasPink);
await page.evaluate(() => { const s = window.__game.scene.getScene('World'); const pl = s.children.list.find(c => c.texture && c.texture.key === 'player'); pl.x = 8.5 * 32; pl.y = 11.7 * 32; });
await page.waitForTimeout(400); await page.keyboard.press('e'); await page.waitForTimeout(400);
await page.click('[data-do="answer|reyes"]'); await page.waitForTimeout(500);
let saw = '';
for (let i = 0; i < 4; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(300); await page.keyboard.press('Enter'); await page.waitForTimeout(200); const t = await page.textContent('#dlg-text').catch(() => ''); if (/Ada/.test(t)) { saw = t; await page.screenshot({ path: `${out}/cr-name-in-dialogue.png` }); break; } }
ok('Captain Reyes says the chosen name', /Ada/.test(saw), saw.slice(0, 80));
await page.screenshot({ path: `${out}/cr-in-game.png` });
// pause -> menu -> play again asks before overwriting
for (let i = 0; i < 6 && await page.$('#dlg'); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(250); }
await page.click('#sound-toggle'); await page.waitForTimeout(300); await page.click('[data-pause="menu"]'); await page.waitForTimeout(600);
await page.click('[data-act="play"]'); await page.waitForTimeout(500);
ok('Play with a saved game asks before replacing it', !!(await page.$('#cf-yes')));
await page.click('#cf-no'); await page.waitForTimeout(300);
ok('Keep my save goes back to the menu, save intact', !(await page.$('#creator')) && !!(await page.evaluate(() => localStorage.getItem('mrp.save.v1'))));
// settings name rule
await page.click('[data-act="settings"]'); await page.waitForTimeout(300);
await page.fill('#callsign', ''); await page.type('#callsign', 'Bo Bo'); await page.waitForTimeout(150);
const nm = await page.inputValue('#callsign');
ok('Settings name blocks spaces too', nm === 'BoBo', nm);
ok('No console errors', errs.length === 0, errs.join(' | '));
// phone width
const ph = await browser.newPage({ viewport: { width: 390, height: 844 } });
await ph.goto('http://localhost:5179/'); await ph.waitForTimeout(1200); await ph.evaluate(() => localStorage.removeItem('mrp.save.v1'));
await ph.click('[data-act="play"]'); await ph.waitForTimeout(600);
const over = await ph.evaluate(() => document.documentElement.scrollWidth > innerWidth || [...document.querySelectorAll('#creator *')].some(e => e.getBoundingClientRect().right > innerWidth + 1));
ok('Creator fits a 390px phone without sideways overflow', !over);
await ph.screenshot({ path: `${out}/cr-phone.png` });
await browser.close();
