// Journal browser checks (13): photos, diary, notes, Mars map. Needs: npm i --no-save playwright-core, Chrome, dev server on 5179. Usage: node scripts/journal-checks.mjs <outdir>
import { chromium } from 'playwright-core';
const out = process.argv[2];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ok = (n, p, i = '') => console.log(`${p ? 'PASS' : 'FAIL'}  ${n}${i ? '  — ' + i : ''}`);
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }); const errs = [];
page.on('console', m => { if (m.type() === 'error' && !/404|net::/.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(String(e)));
const sc = (fn, a) => page.evaluate(([f, a]) => { const s = window.__game.scene.getScene('World'); return new Function('sc', 'st', 'a', f)(s, s.sess.state, a); }, [fn, a]);
const pause = async () => { await page.click('#sound-toggle'); await page.waitForTimeout(300); };
await page.goto('http://localhost:5179/'); await page.waitForTimeout(1500);
await page.evaluate(() => localStorage.removeItem('mrp.save.v1'));
await page.click('[data-act="play"]'); await page.waitForTimeout(500);
await page.fill('#cr-in', 'Ada'); await page.click('#cr-go'); await page.waitForTimeout(600); await page.click('#op-go'); await page.waitForTimeout(800);
// answer the call -> first diary entry
await sc(`const pl = sc.children.list.find(c => c.texture && c.texture.key === 'player'); pl.x = 8.5*32; pl.y = 11.7*32;`); await page.waitForTimeout(300);
await page.keyboard.press('e'); await page.waitForTimeout(300); await page.click('[data-do="answer|reyes"]'); await page.waitForTimeout(400);
for (let i = 0; i < 8 && await page.$('#dlg'); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(250); }
// journal from the pause menu
await pause(); await page.click('[data-pause="journal"]'); await page.waitForTimeout(800);
const imgs = await page.$$eval('.photo img', is => is.map(i => ({ w: i.naturalWidth, src: i.getAttribute('src') })));
ok('Pause → My journal opens on the Mars photos', imgs.length === 4);
ok('All four NASA photos load from the bundle (no hotlinking)', imgs.every(i => i.w > 0 && i.src.startsWith('/journal/')), JSON.stringify(imgs.map(i => i.w)));
const credits = await page.$$eval('.photo small', ss => ss.map(s => s.textContent));
ok('Each photo shows its credit and a source link', credits.length === 4 && credits.every(c => /NASA\/JPL-Caltech/.test(c) && /source/.test(c)));
await page.screenshot({ path: `${out}/j1-photos.png` });
await page.click('[data-tab="diary"]'); await page.waitForTimeout(300);
const diary = await page.$$eval('.dentry p', ps => ps.map(p => p.textContent));
ok('The mission diary has a first-person entry after the call', diary.length === 1 && /^I answered Captain Reyes/.test(diary[0]), diary.join(' | '));
ok('Diary entries have a NASA learn button', !!(await page.$('.dentry [data-learn]')));
await page.screenshot({ path: `${out}/j2-diary.png` });
// notes: typing does not move the player
await page.click('[data-tab="notes"]'); await page.waitForTimeout(300);
const p0 = await sc(`const pl = sc.children.list.find(c => c.texture && c.texture.key === 'player'); return [pl.x, pl.y];`);
await page.click('#j-note'); await page.keyboard.type('Stow the panels early. Water every bed!'); await page.waitForTimeout(200);
await page.click('[data-j="add"]'); await page.waitForTimeout(300);
const p1 = await sc(`const pl = sc.children.list.find(c => c.texture && c.texture.key === 'player'); return [pl.x, pl.y];`);
ok('Typing a note does not move the explorer', p0[0] === p1[0] && p0[1] === p1[1]);
ok('The note appears in the list', (await page.$$eval('.note p', ps => ps.map(p => p.textContent))).includes('Stow the panels early. Water every bed!'));
await page.screenshot({ path: `${out}/j3-notes.png` });
// reload and continue: the note is still there
await page.reload(); await page.waitForTimeout(1500);
await page.click('[data-act="continue"]'); await page.waitForTimeout(1500);
for (let i = 0; i < 4 && await page.$('#rep-go'); i++) { await page.click('#rep-go'); await page.waitForTimeout(300); }
await pause(); await page.click('[data-pause="journal"]'); await page.waitForTimeout(500); await page.click('[data-tab="notes"]'); await page.waitForTimeout(300);
const kept = await page.$$eval('.note p', ps => ps.map(p => p.textContent));
ok('The note is saved with the game (survives a reload + Continue)', kept.includes('Stow the panels early. Water every bed!'), kept.join(' | '));
await page.click('[data-del]'); await page.waitForTimeout(300);
ok('Delete removes the note', (await page.$$('.note')).length === 0);
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
ok('Escape closes the journal', !(await page.$('#journal')));
// map straight from the pause menu
await pause(); await page.click('[data-pause="map"]'); await page.waitForTimeout(800);
const map = await page.evaluate(() => { const img = document.querySelector('.mapbox img'), pin = document.querySelector('.pin'); if (!img || !pin) return null; const a = img.getBoundingClientRect(), b = pin.getBoundingClientRect(); return { loaded: img.naturalWidth, fx: ((b.left + b.width / 2) - a.left) / a.width, fy: ((b.top + b.height / 2) - a.top) / a.height, label: pin.textContent }; });
ok('Pause → Mars map shows the real map with the base pin at Hebrus Valles', !!map && map.loaded === 1024 && map.fx > 0.84 && map.fx < 0.87 && map.fy > 0.37 && map.fy < 0.41, JSON.stringify(map));
ok('The map says it is a game location on real map data, with credits', /Game location based on real map data/.test(await page.textContent('#journal')) && /USGS Astrogeology/.test(await page.textContent('#journal')));
await page.screenshot({ path: `${out}/j4-map.png` });
ok('No console errors', errs.length === 0, errs.join(' | '));
await browser.close();
