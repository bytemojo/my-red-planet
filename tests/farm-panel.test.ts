import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Step 6c: the farm panel is read-only. Planting, watering and harvesting happen in the world with animations.
describe('farm panel (Step 6c)', () => {
  const src = readFileSync(new URL('../src/ui/panels.ts', import.meta.url), 'utf8');
  const farm = src.slice(src.indexOf('export function openFarm'), src.indexOf('// ---------- ', src.indexOf('export function openFarm') + 10));
  it('has no Plant, Water or Harvest action buttons or handlers', () => {
    expect(farm).not.toMatch(/data-do="(plant|water|harvest|needseed|choose|cancel)/);
    expect(farm).not.toMatch(/host\.run\('(plant|water|harvest)'/);
  });
  it('still shows crop, growth, water state and the expected harvest', () => {
    expect(farm).toMatch(/Expected harvest/); expect(farm).toMatch(/NEEDS WATER/); expect(farm).toMatch(/READY TO PICK/); expect(farm).toMatch(/sbar/);
  });
});
