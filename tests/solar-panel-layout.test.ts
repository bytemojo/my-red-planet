import { describe, expect, it } from 'vitest';
import { isNearSolarPanelTile, isSolarPanelTile, SOLAR_PANEL_ORIGINS } from '../src/game/solar-panel-layout';

describe('solar panel interactions', () => {
  it('only treats the panel footprints as click-to-interact targets', () => {
    for (const [left, top] of SOLAR_PANEL_ORIGINS) {
      expect(isSolarPanelTile(left, top)).toBe(true);
      expect(isSolarPanelTile(left + 2, top + 1)).toBe(true);
    }
    expect(isSolarPanelTile(13, 22)).toBe(false);
    expect(isSolarPanelTile(19, 24)).toBe(false);
  });

  it('offers the keyboard interaction prompt only beside the panels', () => {
    expect(isNearSolarPanelTile(19, 24)).toBe(true);
    expect(isNearSolarPanelTile(19, 20)).toBe(false);
  });
});
