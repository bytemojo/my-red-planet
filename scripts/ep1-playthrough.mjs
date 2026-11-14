// Full Episode 1 playthrough with screenshots. Usage: node ep.mjs <outdir>
import { chromium } from 'playwright-core';
const out = process.argv[2];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('404')) errs.push(m.text()); });
page.on('pageerror', e => errs.push(String(e)));
const shot = n => page.screenshot({ path: `${out}/${n}.png` });
const sc = (fn, arg) => page.evaluate(([f, a]) => { const s = window.__game.scene.getScene('World'); return new Function('sc', 'st', 'a', f)(s, s.sess.state, a); }, [fn, arg]);
const go = async (x, y) => { await sc(`const pl = sc.children.list.find(c => c.texture && c.texture.key === 'player'); pl.x = a[0]*32; pl.y = a[1]*32; sc.moveTarget = null;`, [x, y]); await page.waitForTimeout(400); };
const clearDlg = async (pick = {}) => {
  for (let i = 0; i < 14; i++) {
    const dlg = await page.$('#dlg'); if (!dlg) break;
    const choices = await page.$$('#dlg [data-choice]');
    if (choices.length) { let btn = null; for (const c of choices) { const id = await c.getAttribute('data-choice'); if (pick[id]) { btn = c; break; } } await (btn || choices[0]).click().catch(() => {}); }
    else await page.keyboard.press('Enter');
    await page.waitForTimeout(350);
  }
};
const press = async k => { await page.keyboard.press(k); await page.waitForTimeout(450); };
const clickDo = async d => { const b = await page.$(`[data-do="${d}"]`); if (b) { await b.click(); await page.waitForTimeout(350); return true; } console.log('  (no button ' + d + ')'); return false; };
const closePanel = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(300); };
const log = async label => { const r = await sc(`return {sol: st.sol, hour: +st.hour.toFixed(1), phase: st.ep?.phase, checked: st.ep?.checked?.length, call: st.ep?.call, power: Math.round(st.res.power), pending: st.pending?.id, suit: st.suitOn, outside: st.outside, dmg: st.ep?.panelDamage, stowed: st.ep?.panelsStowed, health: Math.round(st.health), tree: st.ep?.tree.length, overlays: [...document.querySelectorAll('#overlays > *')].map(e => e.id)}`); console.log(label, JSON.stringify(r)); };
const nextMorning = async (pick) => { await sc(`st.hour = 23.95;`); await page.waitForTimeout(1500); await page.click('#rep-go').catch(() => {}); await page.waitForTimeout(600); await clearDlg(pick); await page.waitForTimeout(400); };

await page.goto('http://localhost:5179/'); await page.waitForTimeout(3000); await shot('00-menu');
await page.click('[data-act="play"]'); await page.waitForTimeout(700);
if (await page.$('#cf-yes')) { await page.click('#cf-yes'); await page.waitForTimeout(400); }
if (await page.$('#cr-in')) { await page.fill('#cr-in', 'Ada'); await page.click('[data-style="long"]'); await shot('00b-creator'); await page.click('#cr-go'); await page.waitForTimeout(700); }
await shot('01-opening');
await page.click('#op-go'); await page.waitForTimeout(1800); await shot('02-ringing'); await log('start');
await go(8.5, 11.7); await press('e'); await shot('03-who-is-calling');
await clickDo('answer|aiko'); await page.waitForTimeout(500); await shot('04-wrong-answer');
await press('e'); await clickDo('answer|reyes'); await page.waitForTimeout(900); await shot('05-reyes-call'); await clearDlg(); await page.waitForTimeout(400); await shot('06-objective-check'); await log('after call');
await go(22.5, 7); await press('e'); await clickDo('check|air'); await clickDo('check|water'); await shot('07-ls-checked'); await closePanel();
await go(9.5, 8); await press('e'); await shot('08-farm'); await clickDo('check|plants'); await closePanel();
await go(22.5, 14); await press('e'); await clickDo('check|comms'); await shot('09-comms'); await closePanel();
await go(16, 16.6); await press('e'); await shot('10-suit-rack'); await clickDo('suit'); await closePanel();
await go(19, 20.5); await page.waitForTimeout(700); await press('e'); await shot('11-solar-outside'); await clickDo('check|solar'); await closePanel(); await log('all checked');
await go(16, 14.5); await sc(`st.hour = 18.85;`); await page.waitForTimeout(2500); await shot('12-storm-call'); await log('storm call');
await page.waitForTimeout(4000); await shot('13-storm-call-4s');
const stow = await page.$('#dlg [data-choice="stow"]'); if (stow) await stow.click(); await page.waitForTimeout(600); await log('stowed');
await sc(`st.hour = 23.95;`); await page.waitForTimeout(1500); await shot('14-morning-report'); await page.click('#rep-go').catch(() => {}); await page.waitForTimeout(700);
await shot('15-sol2-beat'); await clearDlg({ water_wall: 1 }); await page.waitForTimeout(500); await shot('16-sol2-storm'); await log('sol2');
await go(16, 17.4); await page.keyboard.down('s'); await page.waitForTimeout(1200); await page.keyboard.up('s'); await shot('17-airlock-sealed'); await log('sealed?');
await go(22.5, 14); await press('e'); await shot('18-comms-static'); await closePanel();
for (const sol of [2, 3, 4]) { await nextMorning({ water_wall: 1, manual_air: 1, fix: 1 }); await log('morning after sol ' + sol); }
await shot('19-sol5-after-storm');
await go(16, 16.6); await press('e'); await clickDo('suit'); await closePanel();
await go(19, 20.5); await page.waitForTimeout(600); await press('e'); await shot('20-solar-after'); await clickDo('clean'); await closePanel(); await log('cleaned');
await go(16, 14.5); await sc(`st.res.power = Math.max(st.res.power, 10);`);
await go(9.5, 8); await press('e'); await clickDo('repairw'); await page.waitForTimeout(1500); await shot('21-debrief'); await log('end');
const tree = await page.$('#debrief .tree'); if (tree) { await tree.evaluate(e => { e.scrollTop = 300; }); await shot('22-debrief-tree'); }
await page.click('#db-wiki').catch(() => {}); await page.waitForTimeout(600); await shot('23-wiki');
console.log('errors:', JSON.stringify(errs));
await browser.close();
