// Visual playtest helper. Starts a new game in a real browser, clears the briefing, teleports the player
// to a few spots / hours of the day and saves screenshots, so you can LOOK at what you built.
//
// Setup (once):   npm i --no-save playwright-core        (uses your installed Google Chrome)
// Run:            npm run dev -- --port 5179             (in one terminal)
//                 node scripts/playtest-shots.mjs docs/playtest/new     (in another; URL env var overrides the port)
// Edit the `go(...)` calls at the bottom to look at whatever you changed. Dev builds expose window.__game.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] || 'docs/playtest/shots';
const URL = process.env.URL || 'http://localhost:5179/';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('404')) errs.push(m.text()); });
page.on('pageerror', e => errs.push(String(e)));
await page.goto(URL); await page.waitForTimeout(800);
await page.click('[data-act="play"]'); await page.waitForTimeout(1500);
for (let i = 0; i < 12; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(150); } // click through the briefing

// go(x, y, hour, zoom): x,y in tiles (32px), hour 0-24 (null keeps the clock), zoom default 2.
const go = async (x, y, hour, zoom) => {
  await page.evaluate(([x, y, hour, zoom]) => {
    const sc = window.__game.scene.getScene('World'); const T = 32;
    const pl = sc.children.list.find(c => c.texture && c.texture.key === 'player');
    pl.x = x * T; pl.y = y * T; if (hour != null) sc.sess.state.hour = hour;
    sc.cameras.main.setZoom(zoom || 2); sc.cameras.main.startFollow(pl, true, 1, 1);
  }, [x, y, hour, zoom]);
  await page.waitForTimeout(700);
};
const shot = name => page.screenshot({ path: `${out}/${name}.png` });

await go(9.5, 11.5, 10); await shot('quarters-day');
await go(9.5, 11.5, 22.5); await page.waitForTimeout(2500); await shot('quarters-night');
await go(9.5, 7, 12); await shot('farm');
await go(16, 20.5, 22.5); await shot('outside-night');

console.log('console errors:', JSON.stringify(errs));
await browser.close();
