import { describe, expect, it } from 'vitest';
import { ICON } from '../src/ui/icons';
import { MORNING_STEP_MS, STATUS_LABEL, morningCards } from '../src/story/morning';

describe('morning cards (Step 25a)', () => {
  const r = { mission: 'Survive the storm: keep power up.', lines: ['2 plants grew overnight.', '1 crop is ready to harvest.', 'Space weather alert: HIGH.', 'The solar panels are stowed: no solar power.', 'Something odd happened.'] };
  const cards = morningCards(r);
  it('the mission comes first with the NOW pill; every line becomes one card', () => { expect(cards[0]).toMatchObject({ title: "Today's mission", status: 'now', icon: 'bulb' }); expect(cards).toHaveLength(r.lines.length + 1); });
  it('each card has an icon that exists, a title, a line and a status pill', () => {
    for (const c of cards) { expect(ICON[c.icon]).toBeTruthy(); expect(c.title.length).toBeGreaterThan(2); expect(c.line.length).toBeGreaterThan(2); expect(STATUS_LABEL[c.status]).toBeTruthy(); }
  });
  it('classifies lines', () => {
    expect(cards.find(c => c.title === 'Harvest')!.status).toBe('todo'); expect(cards.find(c => c.title === 'Plants')!.status).toBe('ok');
    expect(cards.find(c => c.title === 'Space weather')!.status).toBe('warn'); expect(cards.find(c => c.title === 'Solar panels')!.icon).toBe('panel');
    expect(cards[cards.length - 1]).toMatchObject({ title: 'Update', icon: 'ping', status: 'info' });
  });
  it('low alert is OK; slide-in step is about 400 ms', () => { expect(morningCards({ mission: '', lines: ['Space weather alert: LOW.'] })[0].status).toBe('ok'); expect(MORNING_STEP_MS).toBe(400); });
});
