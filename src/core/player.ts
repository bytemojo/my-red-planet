// The player's own look and name (character creator). Pure and tested; no DOM.
export type HairCut = 'long' | 'short';
export interface PlayerLook { name: string; skin: number; hair: number; style: HairCut }

// Ten evenly stepped skin tones, darkest to lightest.
export const SKIN_TONES = [0x3b2219, 0x4f2d20, 0x6b3e2a, 0x8a5236, 0xa0653f, 0xb87a50, 0xcd9468, 0xdeab82, 0xebc39d, 0xf6dcc4];
// Hair presets (the accessible alternative to the colour wheel).
export const HAIR_PRESETS = [0x1b1a22, 0x3a241d, 0x6b3f24, 0x8e4a26, 0xc98a3c, 0xe8c46a, 0xb03a2e, 0x9a9aa6, 0x3d6fd6, 0xd660a8];
export const DEFAULT_LOOK: PlayerLook = { name: 'Rookie', skin: 0xebc39d, hair: 0x3a241d, style: 'short' };

export const NAME_MIN = 2, NAME_MAX = 12;
// While typing: drop anything that is not a letter, hyphen or apostrophe (this also blocks spaces), and cap the length.
export function cleanNameInput(raw: string): string {
  return raw.replace(/[^\p{L}'-]/gu, '').slice(0, NAME_MAX);
}
// One first name only: letters plus an optional hyphen or apostrophe inside it, 2-12 characters.
export function validateName(raw: string): { ok: boolean; name: string; error: string } {
  const name = raw.trim();
  if (!name) return { ok: false, name, error: 'Type your first name.' };
  if (/\s/.test(name)) return { ok: false, name, error: 'One name only, no spaces.' };
  if (!/^[\p{L}'-]+$/u.test(name)) return { ok: false, name, error: 'Use letters only (a hyphen or apostrophe is fine).' };
  if (!/^\p{L}/u.test(name) || !/\p{L}$/u.test(name)) return { ok: false, name, error: 'Start and end your name with a letter.' };
  if (name.length < NAME_MIN) return { ok: false, name, error: `At least ${NAME_MIN} letters.` };
  if (name.length > NAME_MAX) return { ok: false, name, error: `At most ${NAME_MAX} letters.` };
  return { ok: true, name: name[0].toUpperCase() + name.slice(1), error: '' };
}
export const isLook = (x: unknown): x is PlayerLook => !!x && typeof x === 'object' && typeof (x as PlayerLook).skin === 'number' && typeof (x as PlayerLook).hair === 'number' && ['long', 'short'].includes((x as PlayerLook).style) && validateName((x as PlayerLook).name ?? '').ok;
