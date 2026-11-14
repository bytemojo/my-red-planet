// Placing a point on the bundled Mars map (USGS MGS MOLA colour shaded relief, simple cylindrical,
// longitude -180..180 centred on 0, latitude +90 at the top). Pure, tested in tests/journal.test.ts.
// The site of the (fictional) base: centre of Hebrus Valles in the USGS Gazetteer of Planetary
// Nomenclature, Feature 2404 (planetocentric, +East), checked 2026-11-14.
export const HEBRUS_VALLES = { lat: 19.98, lon: 126.6, source: 'https://planetarynames.wr.usgs.gov/Feature/2404' };
export function mapXY(lat: number, lonEast: number, w = 1, h = 1): { x: number; y: number } {
  const lon = ((lonEast + 180) % 360 + 360) % 360 - 180; // wrap to -180..180
  return { x: ((lon + 180) / 360) * w, y: ((90 - lat) / 180) * h };
}
