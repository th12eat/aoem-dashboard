/**
 * Parse pasted tabular text (from a spreadsheet or CSV) into rows keyed by a
 * column order. Tab-separated is the default (what copying from Sheets/Excel
 * produces); a comma fallback handles pasted CSV. Blank lines are skipped, and
 * cells are trimmed. Extra cells beyond the column list are dropped; missing
 * trailing cells become ''.
 */
export function parsePastedRows(text: string, columns: readonly string[]): Record<string, string>[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  return lines.map(line => {
    // Prefer tabs; fall back to commas only when the line has no tab.
    const cells = line.includes('\t') ? line.split('\t') : line.split(',');
    const row: Record<string, string> = {};
    columns.forEach((col, i) => {
      row[col] = (cells[i] ?? '').trim();
    });
    return row;
  });
}
