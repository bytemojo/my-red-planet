import { describe, expect, it } from 'vitest';
import { newGame } from '../src/core/sim';
import { emptyHands } from '../src/core/inventory';
import { promptHtml, promptInfo } from '../src/ui/hud';

describe('Step 12b: interaction prompts', () => {
  const s = newGame(3, { mode: 'storm' });
  it('shows name, action, energy cost and why', () => {
    const p = promptInfo(s, 'kitchen', emptyHands(), 'Cook in Kitchen');
    expect(p.name).toBe('KITCHEN'); expect(p.energy).toBe(6); expect(p.why).toBeTruthy();
    expect(promptHtml(p)).toContain('Energy 6');
  });
  it('the farm prompt follows what is in your hands', () => {
    expect(promptInfo(s, 'farm', { ...emptyHands(), item: 'seed_packet', crop: 'lettuce' }, 'x').action).toBe('Plant Lettuce');
    expect(promptInfo(s, 'farm', { ...emptyHands(), item: 'sprinkler' }, 'x').energy).toBe(4);
  });
  it('the suit rack prompt never explains or hints', () => {
    const p = promptInfo(s, 'suit', emptyHands(), 'Suit Rack');
    expect(p.why).toBe(''); expect(promptHtml(p)).not.toMatch(/outside|wear|put on|radiation|storm/i);
  });
});
