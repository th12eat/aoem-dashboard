import { Injectable, InjectionToken, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import type { DataSourceRef } from '@shared/models/event-dashboard-config.model';
import type { EventData } from '@shared/models/event-data.model';
import { normalizeEventData } from './normalize-event-data';
import { environment } from '../../../environments/environment';

/**
 * The data seam. Every data source resolves a {@link DataSourceRef} to the
 * normalized {@link EventData}. Components depend ONLY on this interface, so
 * Phase C can introduce a SupabaseEventDataSource with zero component changes.
 */
export interface EventDataSource {
  load(ref: DataSourceRef): Observable<EventData>;
}

/** DI token so the active source can be swapped (static now, Supabase later)
 * without components knowing which concrete class they got. */
export const EVENT_DATA_SOURCE = new InjectionToken<EventDataSource>('EVENT_DATA_SOURCE');

/**
 * Reads the existing 1.0 static JSON (single source of truth) over HTTP and
 * normalizes it. The data path comes from environment.dataBaseUrl — the ONE
 * place the dev (/data/) vs prod (/aoem-dashboard/data/) difference lives.
 */
@Injectable({ providedIn: 'root' })
export class StaticEventDataSource implements EventDataSource {
  private readonly http = inject(HttpClient);

  load(ref: DataSourceRef): Observable<EventData> {
    if (ref.kind !== 'static') {
      throw new Error(`StaticEventDataSource cannot handle data source kind "${ref.kind}"`);
    }
    const url = `${environment.dataBaseUrl}live/${ref.slug}.json`;
    return this.http.get<unknown>(url).pipe(map(normalizeEventData));
  }
}
