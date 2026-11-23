/**
 * Coordinate conversion for the map editor. The map SVG uses
 * `preserveAspectRatio="none"` over a `viewBox` (e.g. "0 0 100 100"), so the
 * mapping from a screen point to viewBox user-units is LINEAR — no letterbox
 * math. Two helpers:
 *   • clientToUser — precise, uses the live SVG's getScreenCTM() (resize-proof).
 *   • clientToPercent — pure (rect + viewBox in, point out); the unit-test
 *     target and a fallback when no SVG element is handy.
 * Values are rounded to 1 decimal to match the geometry literals (e.g. 36.5).
 */

export interface Pt {
  x: number;
  y: number;
}

/** Parse "minX minY width height" → [minX, minY, w, h]. */
export function parseViewBox(viewBox: string): [number, number, number, number] {
  const p = viewBox.trim().split(/\s+/).map(Number);
  return [p[0] || 0, p[1] || 0, p[2] || 100, p[3] || 100];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Clamp a point to the viewBox bounds. */
export function clampToViewBox(p: Pt, viewBox: string): Pt {
  const [minX, minY, w, h] = parseViewBox(viewBox);
  return {
    x: Math.min(minX + w, Math.max(minX, p.x)),
    y: Math.min(minY + h, Math.max(minY, p.y)),
  };
}

/**
 * Convert a client (screen) point to viewBox user-units using the element's
 * bounding rect. Pure + deterministic — the primary unit-test target.
 */
export function clientToPercent(
  rect: { left: number; top: number; width: number; height: number },
  viewBox: string,
  clientX: number,
  clientY: number,
): Pt {
  const [minX, minY, w, h] = parseViewBox(viewBox);
  const fx = rect.width ? (clientX - rect.left) / rect.width : 0;
  const fy = rect.height ? (clientY - rect.top) / rect.height : 0;
  return { x: round1(minX + fx * w), y: round1(minY + fy * h) };
}

/**
 * Convert a client point to viewBox user-units via the live SVG's CTM. Correct
 * for any viewBox/scale and recomputed per event, so it survives resizes.
 * Falls back to clientToPercent if the CTM is unavailable.
 */
export function clientToUser(svg: SVGSVGElement, clientX: number, clientY: number): Pt {
  const ctm = svg.getScreenCTM();
  if (ctm) {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(ctm.inverse());
    return { x: round1(p.x), y: round1(p.y) };
  }
  const r = svg.getBoundingClientRect();
  return clientToPercent(r, svg.getAttribute('viewBox') ?? '0 0 100 100', clientX, clientY);
}
