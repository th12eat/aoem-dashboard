import type { NumericValue } from '@shared/models/event-data.model';

/** Parse a #rrggbb hex to [r,g,b], or null. */
function hexRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Blend a base hex toward a target hex by amt (0..1). */
export function mixHex(base: string, target: string, amt: number): string {
  const a = hexRgb(base);
  const b = hexRgb(target);
  if (!a || !b) return base;
  const to = (x: number, y: number) => Math.round(x + (y - x) * amt).toString(16).padStart(2, '0');
  return '#' + to(a[0], b[0]) + to(a[1], b[1]) + to(a[2], b[2]);
}

/** Darken a hex by factor f (0..1) — toward black (1.0 dimHex). */
export function dimHex(hex: string, f: number): string {
  return mixHex(hex, '#000000', 1 - f);
}

/**
 * Derive a spread of n distinct in-family shades from one base colour, so a
 * server's alliances are individually legible on the map. Deterministic by
 * index: base, lighter, palest, darker, … (matches the v1.0 shade families
 * closely enough to tell the four apart).
 */
export function shadeSpread(base: string, n: number): string[] {
  const steps = [
    [0, ''],
    [0.32, '#ffffff'],
    [0.6, '#ffffff'],
    [0.32, '#000000'],
    [0.16, '#ffffff'],
    [0.5, '#000000'],
  ] as const;
  return Array.from({ length: n }, (_, i) => {
    const [amt, target] = steps[i % steps.length];
    return amt && target ? mixHex(base, target, amt) : base;
  });
}

/**
 * Parse a game-display number into a {@link NumericValue}.
 *
 * The 1.0 data mixes raw numbers (50200000000) and human strings
 * ("50,200,000,000", "21,613,610,877", "—"). We keep the exact `display` text
 * and derive a sortable `value`. Non-numeric placeholders like "—" yield
 * value: NaN so sorts can push them last while the UI still shows the dash.
 */
export function toNumericValue(input: unknown): NumericValue {
  if (typeof input === 'number') {
    return { value: input, display: formatCompact(input) };
  }
  if (typeof input === 'string') {
    const display = input.trim();
    // strip grouping commas/spaces; anything non-numeric (—, N/A) → NaN
    const cleaned = display.replace(/[,\s]/g, '');
    const value = /^-?\d+(\.\d+)?$/.test(cleaned) ? Number(cleaned) : NaN;
    return { value, display: display || '—' };
  }
  return { value: NaN, display: '—' };
}

/**
 * Compact display for a raw number: 50_200_000_000 → "50.2B".
 * Used when the source gave us a bare number and we need a display string.
 */
export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const units: [number, string][] = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ];
  for (const [factor, suffix] of units) {
    if (abs >= factor) {
      const scaled = n / factor;
      // one decimal, but drop a trailing .0
      const s = scaled.toFixed(1).replace(/\.0$/, '');
      return `${s}${suffix}`;
    }
  }
  return String(n);
}

/**
 * Roster-table shorthand (1.0 `rfmt`): billions with TWO decimals ("26.19B"),
 * millions with ONE ("246.4M"), smaller values as-is. Keeps scouting cells
 * compact so rows don't run over. NaN → "—".
 */
export function formatRoster(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  return String(Math.round(n));
}
