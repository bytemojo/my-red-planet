import { describe, expect, it } from 'vitest';
import { LOCKED_CROP_MSG } from '../src/core/meals';
import { PRODUCE_ITEMS, isFoodUnlocked } from '../src/core/meals';
import { newSession } from '../src/core/session';

describe('Step 24c: locked food message', () => {
  it('uses the exact text and every locked crop is locked at the start', () => {
    expect(LOCKED_CROP_MSG).toBe('Build your relationship with Dr Aoki, the Botanist, to unlock this crop.');
    const s = newSession(1).state;
    const locked = PRODUCE_ITEMS.filter(f => !isFoodUnlocked(s, f)).map(f => f.id);
    expect(locked.length).toBeGreaterThan(0);
  });
});
