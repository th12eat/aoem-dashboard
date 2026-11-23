import { Injectable, InjectionToken, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map, switchMap } from 'rxjs';
import type { DataSourceRef } from '@shared/models/event-dashboard-config.model';
import type { EventData } from '@shared/models/event-data.model';
import { normalizeEventData } from './normalize-event-data';
import { MapStateStore } from './map-state.store';
import { overlayMapState } from './map-state-overlay';
import type { EventOccurrence, OccurrenceStatus } from './event.service';
import { environment } from '../../../environments/environment';

/** What a data source resolves to: the normalized data PLUS the occurrence
 * lifecycle status (so the page can gate on "awaiting"). `occurrence` is null
 * for a pure legacy static event (no DB row). */
export interface LoadedEvent {
  data: EventData;
  status: OccurrenceStatus;
  occurrence: EventOccurrence | null;
}

/**
 * The data seam. Every data source resolves a {@link DataSourceRef} to a
 * {@link LoadedEvent}. Components depend ONLY on this interface, so the
 * static↔Supabase swap is a provider change, not a component change.
 */
export interface EventDataSource {
  load(ref: DataSourceRef): Observable<LoadedEvent>;
}

/** DI token so the active source can be swapped without components knowing
 * which concrete class they got. */
export const EVENT_DATA_SOURCE = new InjectionToken<EventDataSource>('EVENT_DATA_SOURCE');

/**
 * Reads the committed 1.0 static JSON over HTTP and normalizes it. The data
 * path comes from environment.dataBaseUrl — the ONE place the dev (/data/) vs
 * prod (/aoem-dashboard/data/) difference lives. A static event has no
 * occurrence lifecycle, so it always loads as `complete` (fully viewable, no
 * gate). The Supabase source delegates here for its JSON fallback.
 */
@Injectable({ providedIn: 'root' })
export class StaticEventDataSource implements EventDataSource {
  private readonly http = inject(HttpClient);
  private readonly mapStore = inject(MapStateStore);

  load(ref: DataSourceRef): Observable<LoadedEvent> {
    const slug = ref.kind === 'static' ? ref.slug : ref.kind === 'supabase' ? ref.typeSlug : '';
    return this.loadStatic(slug).pipe(map(data => ({ data, status: 'complete' as const, occurrence: null })));
  }

  /** Fetch + normalize the static JSON for a slug, with the DB map overlay.
   * Exposed so SupabaseEventDataSource can reuse it as its fallback/base. */
  loadStatic(slug: string, eventId: string | null = null): Observable<EventData> {
    const url = `${environment.dataBaseUrl}live/${slug}.json`;
    return this.http
      .get<unknown>(url)
      .pipe(map(normalizeEventData), switchMap(data => from(overlayMapState(this.mapStore, eventId, slug, data))));
  }
}
