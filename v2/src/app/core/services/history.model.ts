import { toNumericValue } from '@shared/utils/numeric';

/** A top-4 roster entry: [tag, power, merits]. */
export type RosterEntry = [string, number, number];

/** Raw legacy event from data/history.json (two shapes merged). */
export interface RawHistoryEvent {
  event: string;
  date: string;
  opp: string;
  result: string; // Win | Loss | TBD | Live
  // 1v1
  ours?: RosterEntry[];
  oppA?: RosterEntry[];
  // multi-server
  multi?: boolean;
  ourRoster?: RosterEntry[];
  oppRosters?: Record<string, RosterEntry[]>;
  placement?: number | null;
  kingdomFinal?: Record<string, string | number>;
  star?: boolean;
  note?: string;
  basis?: string;
  season?: string;
}

/** A side's combined top-4 power + merits. */
export interface SideTotals {
  power: number;
  merits: number;
}

/** Normalized history row the ledger + charts read. */
export interface HistoryEvent {
  type: string; // display name ("Desolate Desert")
  typeSlug: string; // resolved slug ("desolate") or '' if unknown
  kvkTheme: string; // accent theme key
  date: string;
  opp: string;
  result: string;
  placement: number | null;
  star: boolean;
  note?: string;
  multi: boolean;
  ours: SideTotals;
  opp_: SideTotals; // opponent combined (avg across servers for multi)
  oppServers?: { server: string; totals: SideTotals; rank: number | null }[];
  /** Deep-link to a full DB dashboard for this occurrence, when one exists. */
  occurrenceSlug?: string;
  occurrenceDate?: string;
}

/** Canonical full display name per slug — the one place event names live, so
 * History (and anywhere else) label them consistently. */
export const EVENT_DISPLAY_NAME: Record<string, string> = {
  stormlands: 'Stormlands',
  desolate: 'Desolate Desert',
  primordial: 'Primordial Conflict',
  behemoth: 'Behemoth Conquest',
  tme: 'The Mightiest Empire',
};

/** Full event name for a slug (falls back to the raw slug, uppercased, when
 * unknown — so a stray type still reads sensibly). */
export function displayName(slug: string): string {
  return EVENT_DISPLAY_NAME[slug] ?? (slug ? slug.toUpperCase() : 'Unknown');
}

/** Map a legacy event display name → (slug, theme, full name). Handles the
 * "Primordial" / "Primordial Conflict" drift. Unknown → ('', 'generic'). */
export function typeInfo(name: string): { slug: string; theme: string; name: string } {
  const n = name.toLowerCase();
  const of = (slug: string, theme: string) => ({ slug, theme, name: displayName(slug) });
  if (n.includes('storm')) return of('stormlands', 'stormlands');
  if (n.includes('desolate')) return of('desolate', 'desolate');
  if (n.includes('primordial')) return of('primordial', 'primordial');
  if (n.includes('behemoth')) return of('behemoth', 'behemoth');
  if (n === 'tme' || n.includes('mightiest empire')) return of('tme', 'tme');
  return { slug: '', theme: 'generic', name };
}

/** Sum the top-4 power+merits of a roster. */
export function topSum(rows: RosterEntry[] | undefined): SideTotals {
  if (!rows?.length) return { power: 0, merits: 0 };
  return rows.reduce((a, r) => ({ power: a.power + (r[1] || 0), merits: a.merits + (r[2] || 0) }), {
    power: 0,
    merits: 0,
  });
}

/** Merit-to-power ratio as a percentage (0 when power is 0). */
export function mpPct(t: SideTotals): number {
  return t.power > 0 ? (t.merits / t.power) * 100 : 0;
}

/** M:P colour bucket: ≥8 high (combat-active), 4–8 mid, <4 low. */
export function mpClass(pct: number): 'mp-hi' | 'mp-mid' | 'mp-lo' {
  return pct >= 8 ? 'mp-hi' : pct >= 4 ? 'mp-mid' : 'mp-lo';
}

/** Format a raw number as "17.24B". */
export function fmtB(n: number): string {
  return `${(n / 1e9).toFixed(2)}B`;
}

/** Our server's placement for an event:
 *   kingdomFinal rank of "Era 8" → explicit `placement` → Win=1 / Loss=4 → null. */
export function placementOf(e: RawHistoryEvent, ourServer = 'Era 8'): number | null {
  if (e.result === 'Live' || e.result === 'TBD') return null;
  if (e.kingdomFinal) {
    const ranked = Object.entries(e.kingdomFinal)
      .map(([server, pts]) => ({ server, v: toNumericValue(pts).value }))
      .sort((a, b) => (Number.isFinite(b.v) ? b.v : -Infinity) - (Number.isFinite(a.v) ? a.v : -Infinity));
    const idx = ranked.findIndex(r => r.server === ourServer);
    if (idx >= 0) return idx + 1;
  }
  if (typeof e.placement === 'number') return e.placement;
  if (e.result === 'Win') return 1;
  if (e.result === 'Loss') return 4;
  return null;
}

/** Normalize a raw legacy event into a HistoryEvent. */
export function normalizeLegacy(e: RawHistoryEvent): HistoryEvent {
  const info = typeInfo(e.event);
  const ours = topSum(e.ours ?? e.ourRoster);
  let opp_: SideTotals;
  let oppServers: HistoryEvent['oppServers'];
  if (e.oppRosters) {
    const entries = Object.entries(e.oppRosters);
    const kf = e.kingdomFinal ?? {};
    const ranked = Object.entries(kf)
      .map(([s, p]) => ({ s, v: toNumericValue(p).value }))
      .sort((a, b) => (Number.isFinite(b.v) ? b.v : -Infinity) - (Number.isFinite(a.v) ? a.v : -Infinity));
    const rankOf = (server: string): number | null => {
      const i = ranked.findIndex(r => r.s === server);
      return i >= 0 ? i + 1 : null;
    };
    oppServers = entries.map(([server, rows]) => ({ server, totals: topSum(rows), rank: rankOf(server) }));
    // combined opponent = average across servers (v1.0 collapsed view)
    const n = entries.length || 1;
    opp_ = {
      power: oppServers.reduce((a, s) => a + s.totals.power, 0) / n,
      merits: oppServers.reduce((a, s) => a + s.totals.merits, 0) / n,
    };
  } else {
    opp_ = topSum(e.oppA);
  }
  return {
    // Full canonical name when we recognise the type; else the raw event label.
    type: info.slug ? info.name : e.event,
    typeSlug: info.slug,
    kvkTheme: info.theme,
    date: e.date,
    opp: e.opp,
    result: e.result,
    placement: placementOf(e),
    star: e.star === true,
    note: e.note,
    multi: e.multi === true || !!e.oppRosters,
    ours,
    opp_,
    oppServers,
  };
}

/** Does an event carry enough roster data to chart? */
export function hasFigures(e: HistoryEvent): boolean {
  return e.ours.power > 0 && e.opp_.power > 0;
}
