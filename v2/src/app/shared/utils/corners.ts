/**
 * Canonical corner → colour mapping + server-number formatting.
 *
 * Corners and colours are 1:1 and consistent across every event: whoever holds
 * North is always blue, East purple, South green, West orange. So the editor
 * derives color/rgb/barColor from the corner — they're never hand-entered.
 * (Verified against stormlands.json + desolate.json kingdoms[].)
 */

export type Corner = 'North' | 'East' | 'South' | 'West';

export interface CornerColor {
  color: string;
  rgb: string;
  barColor: string;
}

export const CORNERS: Record<Corner, CornerColor> = {
  North: { color: '#5b8bc4', rgb: '91,139,196', barColor: '#5b9bd8' },
  East: { color: '#9a6dd4', rgb: '154,109,212', barColor: '#b18cff' },
  South: { color: '#5aa87a', rgb: '90,168,122', barColor: '#4fc386' },
  West: { color: '#d4934a', rgb: '212,147,74', barColor: '#f5731f' },
};

export const CORNER_NAMES: Corner[] = ['North', 'East', 'South', 'West'];

/** The colour set for a corner, or a neutral grey when unset/invalid. */
export function cornerColor(corner: string): CornerColor {
  return CORNERS[corner as Corner] ?? { color: '#8a90a5', rgb: '138,144,165', barColor: '#8a90a5' };
}

// ── server-number formatting ──────────────────────────────────────────────────
export type ServerStyle = 'full' | 'spaced' | 'hashed' | 'bare';

/** Format a server number in one of the four house styles:
 *   full `Era #008` · spaced `Era 8` · hashed `#008` · bare `8`.
 * Accepts a number or a string that may already be any of those forms. */
export function fmtServer(n: number | string, style: ServerStyle = 'full'): string {
  const num = typeof n === 'number' ? n : parseInt(String(n).replace(/\D/g, ''), 10);
  if (!Number.isFinite(num)) return '';
  const padded = String(num).padStart(3, '0');
  switch (style) {
    case 'full':
      return `Era #${padded}`;
    case 'spaced':
      return `Era ${num}`;
    case 'hashed':
      return `#${padded}`;
    case 'bare':
      return String(num);
  }
}

/** Bare server number from any format ("Era #008" / "Era 8" / "#008" / "8" → 8). */
export function serverNumber(s: string | number): number {
  const num = typeof s === 'number' ? s : parseInt(String(s).replace(/\D/g, ''), 10);
  return Number.isFinite(num) ? num : NaN;
}

/**
 * Our own server number. Hardcoded to 8 for now — Activity Tracker stores the
 * server only as a name string (`servers.name`), with no numeric column, so a
 * real lookup would parse `user_profiles.server_id → servers.name`. When tool
 * creation (per-server stand-up) lands, replace this with that lookup.
 */
export function ourServerNumber(): number {
  return 8;
}
