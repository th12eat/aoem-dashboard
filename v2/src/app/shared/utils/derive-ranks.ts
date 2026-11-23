import { toNumericValue } from './numeric';

/**
 * Rank a set of rows by a numeric field, descending (1 = highest). Returns a
 * map from row index → rank. Blank/non-numeric values sort last. Used for the
 * read-only Rank columns (scoreboard, alliance points, scouting) that derive
 * from the entered points/power rather than being hand-typed.
 */
export function rankByDesc(rows: readonly Record<string, string>[], key: string): number[] {
  const vals = rows.map((r, i) => ({ i, v: toNumericValue(r[key] ?? '').value }));
  const sorted = [...vals].sort((a, b) => {
    const av = Number.isFinite(a.v) ? a.v : -Infinity;
    const bv = Number.isFinite(b.v) ? b.v : -Infinity;
    return bv - av;
  });
  const rank: number[] = new Array(rows.length).fill(0);
  sorted.forEach((entry, idx) => (rank[entry.i] = idx + 1));
  return rank;
}

/** Default Rules-of-Engagement note derived from a diplomacy relation. */
export function relationNote(relation: string): string {
  switch (relation.toLowerCase()) {
    case 'ally':
      return 'Ally — coordinate, do not fight anywhere.';
    case 'hostile':
      return 'Hostile — engage on all fronts.';
    case 'neutral':
      return 'Neutral — avoid unless provoked.';
    default:
      return '';
  }
}
