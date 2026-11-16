import type { NumericValue } from '@shared/models/event-data.model';

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
