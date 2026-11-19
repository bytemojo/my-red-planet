// Step 22c: the share card, as pure data. Plain links only: no SDKs, no tracking pixels, nothing that follows the player.
// Nothing here makes a network call; a link is only opened when the player clicks it.
export const SHARE_URL = 'https://myredplanet.vercel.app/';
export const SHARE_TEXT = `Play this fun Mars colony game with me at ${SHARE_URL}`;

export type ShareNetworkId = 'whatsapp' | 'x' | 'facebook' | 'email';
export interface ShareNetwork { id: ShareNetworkId; label: string; href: string; external: boolean }

const enc = encodeURIComponent;

export const SHARE_NETWORKS: readonly ShareNetwork[] = [
  { id: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${enc(SHARE_TEXT)}`, external: true },
  { id: 'x', label: 'X', href: `https://twitter.com/intent/tweet?text=${enc(SHARE_TEXT)}`, external: true },
  // Facebook's sharer only takes the link; it cannot carry our sentence.
  { id: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(SHARE_URL)}`, external: true },
  { id: 'email', label: 'Email', href: `mailto:?subject=${enc('My Red Planet')}&body=${enc(SHARE_TEXT)}`, external: false },
];
