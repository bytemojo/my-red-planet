// Supplied rank artwork. These transparent PNGs are used both in the quiz UI
// and on the downloadable/shareable report card, so a player's earned rank
// always looks the same.
import type { TierId } from './config';

const FILES: Record<TierId, string> = {
  recruit: 'recruit.png',
  explorer: 'explorer.png',
  commander: 'commander.png',
  scientist: 'scientist.png',
  galaxy: 'galaxy.png',
};

const base = ((import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/').replace(/\/?$/, '/');

/** Public URL for the supplied transparent rank image. */
export const badgeAssetUrl = (tier: TierId): string => `${base}astronaut-quiz-badges/${FILES[tier]}`;

/** Accessible image markup for quiz screens. */
export function badgeImage(tier: TierId, uid = 'badge'): string {
  return `<img class="aq-badge" id="aq-badge-${uid}" src="${badgeAssetUrl(tier)}" alt="${tier} rank badge">`;
}
