import { describe, expect, it } from 'vitest';
import { captureLive, deserialize, liveSpot, newSession, serialize } from '../src/core/session';
import { HOW_TO_PLAY } from '../src/story/howto';

describe('Step 24a: CONTINUE resumes the exact spot', () => {
  it('saves and reloads the same hour, position and held item', () => {
    const s = newSession(7); s.state.hour = 13.4;
    captureLive(s, 612.5, 301, { item: 'sprinkler', crop: null });
    const back = deserialize(serialize(s))!;
    expect(back.state.hour).toBe(13.4);
    expect(liveSpot(back)).toEqual({ x: 612.5, y: 301, held: { item: 'sprinkler', crop: null } });
  });
  it('keeps a seed packet crop and ignores bad numbers', () => {
    const s = newSession(7);
    captureLive(s, 100, 200, { item: 'seed_packet', crop: 'bean' });
    captureLive(s, NaN, 5, { item: null });
    expect(liveSpot(deserialize(serialize(s))!)!.held).toEqual({ item: 'seed_packet', crop: 'bean' });
  });
  it('an old save without a live spot still loads', () => {
    expect(liveSpot(newSession(3))).toBeNull();
  });
  it('how to play has at most 8 short lines', () => {
    expect(HOW_TO_PLAY.length).toBeLessThanOrEqual(8);
    HOW_TO_PLAY.forEach(([, l]) => expect(l.length).toBeLessThan(140));
    expect(JSON.stringify(HOW_TO_PLAY).toLowerCase()).not.toContain('suit'); // Owner Rule 3: the suit is never hinted
  });
});
