// The one place where {name} in dialogue becomes the player's chosen first name.
export const fillName = (text: string, name: string): string => text.replace(/\{name\}/g, name || 'Rookie');
