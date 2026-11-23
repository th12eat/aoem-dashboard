/** A rendered table cell with best/worst-in-row colouring. */
export interface ExtremeCell {
  text: string;
  color: string;
  weight: string;
}

/**
 * Best/worst-in-row cell styling (1.0 `extremeStyle`): the maximum value in the
 * row is green+bold, the minimum is red; everything else neutral. Nulls render
 * muted with the given placeholder. Shared by the tier + depth tables so both
 * read identically.
 */
export function extremeCell(rowValues: (number | null)[], value: number | null, text: string): ExtremeCell {
  if (value == null) return { text, color: 'var(--text-muted)', weight: '400' };
  const nums = rowValues.filter((v): v is number => v != null);
  const max = Math.max(...nums);
  const min = Math.min(...nums);
  if (max !== min && value === max) return { text, color: '#4ade80', weight: '800' };
  if (max !== min && value === min) return { text, color: '#f87171', weight: '700' };
  return { text, color: '#cbd5e1', weight: '400' };
}
