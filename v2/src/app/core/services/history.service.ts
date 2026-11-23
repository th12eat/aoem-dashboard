import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { EventService, type EventOccurrence } from './event.service';
import {
  normalizeLegacy,
  topSum,
  typeInfo,
  placementOf,
  type HistoryEvent,
  type RawHistoryEvent,
  type RosterEntry,
} from './history.model';

type Doc = Record<string, unknown>;

/**
 * Builds the merged KvK history timeline from two sources:
 *   • the committed data/history.json ledger (6 months of archived events), and
 *   • the DB `events` occurrences (as they're created + completed).
 * De-duped by (typeSlug, date) preferring the DB occurrence (richer + deep-
 * linkable), sorted newest-first. A DB occurrence contributes a row built from
 * its stored doc (scoreboard placements + top-4 from scouting) and carries an
 * occurrenceSlug/Date so the ledger can link to its full past dashboard.
 */
@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(EventService);

  async load(): Promise<HistoryEvent[]> {
    const [legacy, occurrences] = await Promise.all([this.loadLegacy(), this.events.listAll()]);

    const byKey = new Map<string, HistoryEvent>();
    const keyOf = (slug: string, date: string) => `${slug}|${date}`;

    // legacy first…
    for (const raw of legacy) {
      const h = normalizeLegacy(raw);
      byKey.set(keyOf(h.typeSlug || h.type, h.date), h);
    }
    // …DB occurrences override (complete/published only; awaiting isn't history)
    for (const occ of occurrences) {
      if (occ.status === 'awaiting') continue;
      const h = await this.fromOccurrence(occ);
      if (h) byKey.set(keyOf(h.typeSlug, h.date), h);
    }

    return [...byKey.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }

  private async loadLegacy(): Promise<RawHistoryEvent[]> {
    const url = `${environment.dataBaseUrl}history.json`;
    const data = await firstValueFrom(
      this.http.get<{ events?: RawHistoryEvent[] }>(url).pipe(catchError(() => of({ events: [] }))),
    );
    return Array.isArray(data?.events) ? data.events : [];
  }

  /** Build a HistoryEvent from a DB occurrence's stored doc. */
  private async fromOccurrence(occ: EventOccurrence): Promise<HistoryEvent | null> {
    const doc = (await this.events.loadDoc(occ.id)) ?? {};
    const info = typeInfo(occ.typeSlug);
    const research = obj(doc['research']);
    const ours = topSum(toRoster(obj(research['ours'])['alliances']));
    const oppRosterArr = arr(research['opponents']);

    // reconstruct a RawHistoryEvent so placement/opp logic is shared with legacy
    const oppRosters: Record<string, RosterEntry[]> = {};
    for (const o of oppRosterArr) {
      const srv = str(obj(o)['server']);
      if (srv) oppRosters[srv] = toRoster(obj(o)['alliances']);
    }
    const kingdomFinal: Record<string, string> = {};
    for (const r of arr(doc['kingdomScoreboard'])) {
      const srv = str(obj(r)['server']);
      if (srv) kingdomFinal[srv] = str(obj(r)['points']);
    }
    const hasOpp = Object.keys(oppRosters).length > 0;
    const raw: RawHistoryEvent = {
      event: info.slug ? capitalize(info.slug) : occ.typeSlug,
      date: occ.startDate,
      opp: Object.keys(oppRosters).join(' / '),
      result: inferResult(doc, kingdomFinal),
      multi: hasOpp,
      ourRoster: toRoster(obj(research['ours'])['alliances']),
      oppRosters: hasOpp ? oppRosters : undefined,
      kingdomFinal: Object.keys(kingdomFinal).length ? kingdomFinal : undefined,
    };
    const h = normalizeLegacy(raw);
    // ours already computed; keep normalizeLegacy's richer opp handling
    h.ours = ours.power ? ours : h.ours;
    h.occurrenceSlug = occ.typeSlug;
    h.occurrenceDate = occ.startDate;
    h.placement = placementOf(raw);
    return h;
  }
}

// ── small raw-doc helpers ─────────────────────────────────────────────────────
function obj(v: unknown): Doc {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Doc) : {};
}
function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function str(v: unknown): string {
  return v == null ? '' : String(v);
}
function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
function toRoster(v: unknown): RosterEntry[] {
  return arr(v).map(a => {
    const o = obj(a);
    return [str(o['tag']), num(o['power']), num(o['merits'])] as RosterEntry;
  });
}
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
/** A finished occurrence is Win when Era 8 tops the kingdom scoreboard, else Loss. */
function inferResult(doc: Doc, kingdomFinal: Record<string, string>): string {
  const entries = Object.entries(kingdomFinal);
  if (!entries.length) return 'Live';
  const ranked = entries
    .map(([s, p]) => ({ s, v: num(p) }))
    .sort((a, b) => b.v - a.v);
  return ranked[0]?.s === 'Era 8' ? 'Win' : 'Loss';
}
