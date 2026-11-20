// Step 29b: microscope viewer maths (pure, no DOM). The picture sits in a round eyepiece of diameter d px.
// At zoom 1 the picture just covers the circle; zooming in magnifies about a point; the picture can never be dragged off the circle.
export const ZOOM = { MIN: 1, MAX: 8, STEP: 1.5, WHEEL: 1.15 } as const;
/** x, y = where the picture's centre sits relative to the circle's centre (px). */
export interface View { zoom: number; x: number; y: number }
export const newView = (): View => ({ zoom: 1, x: 0, y: 0 });
export const clampZoom = (z: number): number => Math.min(ZOOM.MAX, Math.max(ZOOM.MIN, Number.isFinite(z) ? z : 1));

/** Size the picture is drawn at zoom 1 so that it fills the circle (cover). A bad size falls back to the circle itself. */
export function coverSize(iw: number, ih: number, d: number): { w: number; h: number } {
  if (!(iw > 0) || !(ih > 0)) return { w: d, h: d };
  const k = d / Math.min(iw, ih); return { w: iw * k, h: ih * k };
}
/** How far the picture may move from centre at this zoom without showing an edge. */
export const panLimit = (size: { w: number; h: number }, zoom: number, d: number) => ({ x: Math.max(0, (size.w * zoom - d) / 2), y: Math.max(0, (size.h * zoom - d) / 2) });

export function clampView(v: View, size: { w: number; h: number }, d: number): View {
  const zoom = clampZoom(v.zoom), lim = panLimit(size, zoom, d);
  return { zoom, x: Math.min(lim.x, Math.max(-lim.x, v.x)) || 0, y: Math.min(lim.y, Math.max(-lim.y, v.y)) || 0 }; // || 0 turns -0 into 0
}
/** Zoom by `factor` keeping the point under (ax, ay) (relative to the circle centre) where it is. */
export function zoomAt(v: View, factor: number, ax: number, ay: number, size: { w: number; h: number }, d: number): View {
  const zoom = clampZoom(v.zoom * factor), r = zoom / v.zoom;
  return clampView({ zoom, x: ax - (ax - v.x) * r, y: ay - (ay - v.y) * r }, size, d);
}
export const panBy = (v: View, dx: number, dy: number, size: { w: number; h: number }, d: number): View => clampView({ ...v, x: v.x + dx, y: v.y + dy }, size, d);

/** Next or previous sample, wrapping round. */
export const stepSample = (i: number, n: number, delta: number): number => n <= 0 ? 0 : (((i + delta) % n) + n) % n;
export const zoomLabel = (z: number): string => `${Math.round(clampZoom(z) * 10) / 10}×`;
export const canZoomIn = (z: number): boolean => z < ZOOM.MAX - 1e-9;
export const canZoomOut = (z: number): boolean => z > ZOOM.MIN + 1e-9;
