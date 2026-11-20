// Full Episode 1 playthrough with screenshots. Usage: node ep.mjs <outdir>
import { launch } from './_browser.mjs';
const out = process.argv[2];
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('404')) errs.push(m.text()); });
page.on('pageerror', e => errs.push(String(e)));
const shot = n => page.screenshot({ path: `${out}/${n}.png` });
const sc = (fn, arg) => page.evaluate(([f, a]) => { const s = window.__game.scene.getScene('World'); return new Function('sc', 'st', 'a', f)(s, s.sess.state, a); }, [fn, arg]);
const go = async (x, y) => { await page.evaluate(async ([x, y]) => { const { world } = await import('/src/game/world.ts'); const s = window.__game.scene.getScene('World'); world.player.x = x * 32; world.player.y = y * 32; s.moveTarget = null; }, [x, y]); await page.waitForTimeout(400); };
const clearDlg = async (pick = {}) => {
  for (let i = 0; i < 14; i++) {
    // Step 27j: the storm-radiation question is a pop quiz (4 answers, then CONTINUE). Answer the first option.
    if (await page.$('#qz-opts .qz-opt')) { await page.click('#qz-opts .qz-opt'); await page.waitForTimeout(1500); await page.click('#qz-next').catch(() => {}); await page.waitForTimeout(500); continue; }
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
await page.click('#op-skip').catch(() => {}); await page.waitForTimeout(300); await page.click('#op-go'); await page.waitForTimeout(1800); await shot('02-ringing'); await log('start');
await go(8.5, 11.7); await press('e'); await shot('03-who-is-calling');
await clickDo('answer|aiko'); await page.waitForTimeout(500); await shot('04-wrong-answer');
await press('e'); await clickDo('answer|reyes'); await page.waitForTimeout(900); await shot('05-reyes-call'); await clearDlg(); await page.waitForTimeout(400); await shot('06-objective-check'); await log('after call');
await go(22.5, 7); await press('e'); await clickDo('check|air'); await clickDo('check|water'); await shot('07-ls-checked'); await closePanel();
await go(9.5, 8); await press('e'); await shot('08-farm'); await clickDo('check|plants'); await closePanel();
await go(22.5, 14); await press('e'); await clickDo('check|comms'); await shot('09-comms'); await closePanel();
await go(16, 16.6); await press('e'); await page.waitForTimeout(3500); await shot('10-suit-on'); await log('suited?');
await go(12, 24); await page.waitForTimeout(700); await press('e'); await shot('11-solar-outside'); await clickDo('check|solar'); await closePanel(); await log('all checked');
// ---- Step 14: the dish decision comes right after the five-system check. Branch A: repair the comms (stay inside). ----
await closePanel(); await clearDlg({ comms: 1 }); await shot('12-dish-decision-done'); await log('dish chosen');
// Physical repair: fetching the spare part from the storage bin is shortcut here (state, not UI); the walk, kneel, ring and art swap are real.
const giveItem = item => page.evaluate(async i => { const { pickUp } = await import('/src/core/inventory.ts'); const s = window.__game.scene.getScene('World'); pickUp(s.held, i); }, item);
await go(16, 14.5); await closePanel();
await giveItem('spare_part'); await go(20, 15); await press('e'); await page.waitForTimeout(5000); await shot('13-comms-repaired'); await log('comms repaired?');
// ---- Storm Call (19:00 on Sol 1): stow the panels with the lever as the story card says ----
await sc(`st.hour = 18.95;`); await page.waitForTimeout(2500); await shot('14-storm-call'); await log('storm call');
await clearDlg({ stow: 1 }); await log('storm call answered');
await go(16, 6.65); await press('e'); await page.waitForTimeout(2500); await shot('15-lever-stowed'); await log('lever');
// ---- Sols 2-4: the storm (the crew answers the optional story cards with their first choice) ----
for (const sol of [1, 2, 3, 4]) { await nextMorning({ water_wall: 1, manual_air: 1, fix: 1 }); await log('morning after sol ' + sol); await clearDlg(); }
await shot('16-sol5-after-storm');
// ---- After the storm: the panels never unfold by themselves. Deploy with the lever. ----
await go(16, 6.65); await press('e'); await page.waitForTimeout(2500); await shot('17-lever-deployed'); await clearDlg(); await log('deployed');
await sc(`st.res.power = Math.max(st.res.power, 20);`);
// The pump is broken after the storm: repair it by hand (spare part shortcut, real kneel + ring).
await giveItem('spare_part'); await go(5.55, 5.65); await press('e'); await page.waitForTimeout(5000); await shot('17b-pump-repaired'); await closePanel(); await log('pump repaired?');
// ---- Water maker shuts down; Reyes calls; ice run ----
await page.waitForTimeout(1500); await clearDlg(); await shot('18-water-maker-off'); await log('water maker');
await go(16, 16.6); await press('e'); await page.waitForTimeout(3500); await log('suited for the ice run');
await go(3, 23.5); await page.waitForTimeout(700); await press('e'); await page.waitForTimeout(4500); await shot('19-ice-chipped'); await log('ice chipped');
await go(25.5, 5.6); await page.waitForTimeout(700); await press('e'); await page.waitForTimeout(4500); await shot('20-ice-poured'); await log('ice poured');
// ---- The captain line, then the mission screen ----
await page.waitForTimeout(1200); await shot('21-captain-line'); const cap = await page.textContent('#dlg-text').catch(() => ''); console.log('captain line:', JSON.stringify(cap));
await clearDlg(); await page.waitForTimeout(1500); await shot('22-debrief'); await log('end');
const tree = await page.$('#debrief .tree'); if (tree) { await tree.evaluate(e => { e.scrollTop = 300; }); await shot('23-debrief-tree'); }
await page.click('#db-wiki').catch(() => {}); await page.waitForTimeout(600); await shot('24-wiki');
console.log('errors:', JSON.stringify(errs));
await browser.close();
