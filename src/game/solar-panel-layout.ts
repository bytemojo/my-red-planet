export const SOLAR_PANEL_ORIGINS: readonly (readonly [number, number])[] = [
  [10, 22], [14, 22], [18, 22], [22, 22], [26, 22],
  [10, 26], [14, 26], [18, 26], [22, 26], [26, 26],
];

export function isSolarPanelTile(x: number, y: number): boolean {
  return SOLAR_PANEL_ORIGINS.some(([left, top]) => x >= left && x < left + 3 && y >= top && y < top + 2);
}

export function isNearSolarPanelTile(x: number, y: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (isSolarPanelTile(x + dx, y + dy)) return true;
    }
  }
  return false;
}
