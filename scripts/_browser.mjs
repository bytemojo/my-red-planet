// Shared launcher: playwright-core + Chrome when installed locally; otherwise any Playwright with its bundled Chromium (cloud sandbox).
import { createRequire } from 'node:module';
const req = createRequire(import.meta.url);
let pw;
for (const m of ['playwright-core', 'playwright', '/home/claude/.npm-global/lib/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright-core']) { try { pw = req(m); break; } catch { /* try next */ } }
if (!pw) { console.error('No Playwright found. Run: npm i --no-save playwright-core'); process.exit(2); }
export async function launch() {
  const args = ['--no-sandbox'];
  try { return await pw.chromium.launch({ channel: 'chrome', headless: true, args }); } catch { return await pw.chromium.launch({ headless: true, args }); }
}
