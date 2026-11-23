import { Injectable, inject } from '@angular/core';
import { Observable, from, map, of, switchMap } from 'rxjs';
import type { DataSourceRef } from '@shared/models/event-dashboard-config.model';
import type { EventData } from '@shared/models/event-data.model';
import { normalizeEventData } from './normalize-event-data';
import { MapStateStore } from './map-state.store';
import { overlayMapState } from './map-state-overlay';
import { EventService, type EventOccurrence } from './event.service';
import { StaticEventDataSource, type EventDataSource, type LoadedEvent } from './event-dashboard.datasource';

/**
 * Occurrence-aware data source. Resolves which occurrence of a type to show
 * (the current one, or a dated past one), reads its stored `event_data` doc,
 * and surfaces the occurrence `status` so the page can gate "awaiting" events.
 *
 * DB-first with a static-JSON fallback (the locked decision):
 *   • no occurrence row at all  → fall back to the committed static JSON
 *     entirely, status 'complete' (legacy events keep working unchanged).
 *   • occurrence row, no doc yet → use the static JSON as the doc, status from
 *     the row (so a freshly-created occurrence gates on 'awaiting' while still
 *     showing the static template once published).
 *   • occurrence row + doc       → normalize the stored doc.
 * In all cases the live/plan map state is overlaid (still keyed by type slug).
 */
@Injectable({ providedIn: 'root' })
export class SupabaseEventDataSource implements EventDataSource {
  private readonly events = inject(EventService);
  private readonly mapStore = inject(MapStateStore);
  private readonly staticSource = inject(StaticEventDataSource);

  load(ref: DataSourceRef): Observable<LoadedEvent> {
    // A config still on the static source → delegate verbatim.
    if (ref.kind === 'static') return this.staticSource.load(ref);
    const typeSlug = ref.typeSlug;
    const date = ref.date;

    const resolve = date ? this.events.resolveByDate(typeSlug, date) : this.events.resolveCurrent(typeSlug);
    return from(resolve).pipe(
      switchMap(occ => {
        if (!occ) {
          // No DB row for this type → pure legacy static fallback.
          return this.staticSource
            .loadStatic(typeSlug)
            .pipe(map(data => ({ data, status: 'complete' as const, occurrence: null })));
        }
        return from(this.events.loadDoc(occ.id)).pipe(
          switchMap(doc => this.buildData(occ.id, typeSlug, doc)),
          map(data => ({ data, status: occ.status, occurrence: occ as EventOccurrence })),
        );
      }),
    );
  }

  /** doc present → normalize it; doc null → use the static JSON as the doc.
   * Either way, overlay the OCCURRENCE's map state (keyed by event_id). */
  private buildData(eventId: string, typeSlug: string, doc: Record<string, unknown> | null): Observable<EventData> {
    if (doc) {
      return of(normalizeEventData(doc)).pipe(
        switchMap(data => from(overlayMapState(this.mapStore, eventId, typeSlug, data))),
      );
    }
    return this.staticSource.loadStatic(typeSlug, eventId);
  }
}
