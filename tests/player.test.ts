import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK, HAIR_PRESETS, SKIN_TONES, cleanNameInput, isLook, validateName } from '../src/core/player';
import { fillName } from '../src/story/name';
import { character, type CharSpec } from '../src/game/pixelart';

describe('character creator: name rules', () => {
  it('accepts one first name with letters, hyphen or apostrophe, 2-12 characters', () => {
    for (const n of ['Ada', 'Zoe', "O'Neil", 'Mary-Jo', 'Chiamaka', 'Ébo', 'Ana']) expect(validateName(n).ok).toBe(true);
    expect(validateName('ada').name).toBe('Ada');
  });
  it('rejects empty, spaces, symbols, digits and the wrong length', () => {
    expect(validateName('').error).toMatch(/Type/);
    expect(validateName('Ada Lovelace').error).toMatch(/One name/);
    expect(validateName('Ad@').ok).toBe(false);
    expect(validateName('R2D2').ok).toBe(false);
    expect(validateName('A').error).toMatch(/At least/);
    expect(validateName('Abcdefghijklm').error).toMatch(/At most/);
    expect(validateName('-Ada').ok).toBe(false);
  });
  it('blocks spaces and symbols while typing, and caps the length', () => {
    expect(cleanNameInput('Ada Love')).toBe('AdaLove');
    expect(cleanNameInput('Zo3e!')).toBe('Zoe');
    expect(cleanNameInput('abcdefghijklmnop')).toHaveLength(12);
  });
  it('fills {name} everywhere it appears and falls back to Rookie', () => {
    expect(fillName('{name}, check the panels. Good work, {name}.', 'Ada')).toBe('Ada, check the panels. Good work, Ada.');
    expect(fillName('Hi {name}', '')).toBe('Hi Rookie');
  });
  it('a saved look round-trips through JSON and stays valid', () => {
    const look = { name: 'Ada', skin: SKIN_TONES[0], hair: HAIR_PRESETS[3], style: 'long' as const };
    expect(isLook(JSON.parse(JSON.stringify(look)))).toBe(true);
    expect(isLook({ ...look, name: 'two words' })).toBe(false);
    expect(isLook(DEFAULT_LOOK)).toBe(true);
  });
  it('offers ten skin tones from darkest to lightest', () => {
    const lum = (c: number) => ((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11;
    expect(SKIN_TONES).toHaveLength(10);
    for (let i = 1; i < SKIN_TONES.length; i++) expect(lum(SKIN_TONES[i])).toBeGreaterThan(lum(SKIN_TONES[i - 1]));
  });
  it('the two body styles render differently, with skin and hair from the choices', () => {
    const base: CharSpec = { skin: SKIN_TONES[2], hair: 0xd660a8, hairStyle: 'long', top: 0xe8823a, bottom: 0xcf6a2c, shoes: 0x3b3f55, accent: 0x39d9ff };
    const slim = character({ ...base, build: 'slim' }, 'down', 'stand'), broad = character({ ...base, hairStyle: 'short', build: 'broad' }, 'down', 'stand');
    expect(Array.from(slim.px)).not.toEqual(Array.from(broad.px));
    expect(Array.from(slim.px)).toContain(SKIN_TONES[2]);
    expect(Array.from(slim.px)).toContain(0xd660a8);
  });
});
