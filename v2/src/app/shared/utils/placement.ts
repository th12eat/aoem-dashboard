import { toNumericValue } from './numeric';

type Doc = Record<string, unknown>;

/**
 * Compute each server's final placement (1 = highest) from the kingdom
 * scoreboard points, and stamp it onto the doc. Called when an occurrence is
 * marked Complete (manually or at end-time). Writes `placement` onto each
 * `eventConfig.kingdoms[]` entry (matched by server) and a top-level
 * `placements` map (server → rank) for the history page to read directly.
 * Pure: returns a NEW doc, does not mutate the input.
 */
export function withPlacements(doc: Doc): Doc {
  const scoreboard = Array.isArray(doc['kingdomScoreboard']) ? (doc['kingdomScoreboard'] as Doc[]) : [];
  if (!scoreboard.length) return doc;

  // rank servers by points desc (blank/non-numeric sort last)
  const ranked = [...scoreboard]
    .map(r => ({ server: String(r['server'] ?? ''), v: toNumericValue(r['points']).value }))
    .sort((a, b) => (Number.isFinite(b.v) ? b.v : -Infinity) - (Number.isFinite(a.v) ? a.v : -Infinity));

  const placements: Record<string, number> = {};
  ranked.forEach((r, i) => {
    if (r.server) placements[r.server] = i + 1;
  });

  const ec = (doc['eventConfig'] && typeof doc['eventConfig'] === 'object' ? doc['eventConfig'] : {}) as Doc;
  const kingdoms = Array.isArray(ec['kingdoms']) ? (ec['kingdoms'] as Doc[]) : [];
  const stampedKingdoms = kingdoms.map(k => {
    const p = placements[String(k['server'] ?? '')];
    return p ? { ...k, placement: p } : k;
  });

  return {
    ...doc,
    placements,
    eventConfig: { ...ec, kingdoms: stampedKingdoms },
  };
}
