import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { DashboardAuthService } from './dashboard-auth.service';
import type { MapNodeState, MapRoute, StrongholdState } from '@shared/models/map.model';

/** The map state for one event+kind — the three keys the editor owns. */
export interface MapStateDoc {
  state: Record<string, MapNodeState>;
  routes: { actual: MapRoute[]; planned: MapRoute[] };
  strongholds: StrongholdState[];
}

/** Which of an event's two maps: real-time `live` (all servers) or the
 * pre-set `plan` (our-server-only). Stored as separate rows in event_map_state. */
export type MapKind = 'live' | 'plan';

const EMPTY: MapStateDoc = { state: {}, routes: { actual: [], planned: [] }, strongholds: [] };

/**
 * Reads/writes an event's map state in the `event_map_state` table — one row
 * per (slug, kind). The static JSON pipeline stays the source of truth for
 * everything else; this overlays only occupancy/routes/strongholds so a
 * Strategist's edits in /admin appear live on /dashboards without a redeploy.
 * Write is RLS-gated to strategist+ server-side (client gating is just UX).
 */
@Injectable({ providedIn: 'root' })
export class MapStateStore {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(DashboardAuthService);

  /** Fetch the saved state for an OCCURRENCE (preferred) or, when eventId is
   * null, the legacy (slug,kind) row — so legacy no-occurrence types still
   * resolve. Null (not throwing) on any error → caller falls back. */
  async load(eventId: string | null, slug: string, kind: MapKind): Promise<MapStateDoc | null> {
    try {
      let q = this.supabase.from('event_map_state').select('state, routes, strongholds').eq('kind', kind);
      q = eventId ? q.eq('event_id', eventId) : q.eq('slug', slug).is('event_id', null);
      const { data, error } = await q.maybeSingle();
      if (error || !data) return null;
      return {
        state: (data.state ?? {}) as Record<string, MapNodeState>,
        routes: (data.routes ?? EMPTY.routes) as { actual: MapRoute[]; planned: MapRoute[] },
        strongholds: (data.strongholds ?? []) as StrongholdState[],
      };
    } catch {
      return null;
    }
  }

  /** Upsert the state for an OCCURRENCE (event_id) + kind, or the legacy
   * (slug,kind) row when eventId is null. The two cases hit different partial
   * unique indexes (event_map_state_event_key vs _legacy_key), so the conflict
   * target differs. RLS gates writes to strategist+. */
  async save(eventId: string | null, slug: string, kind: MapKind, doc: MapStateDoc): Promise<{ error: string | null }> {
    const row = {
      event_id: eventId,
      slug,
      kind,
      state: doc.state,
      routes: doc.routes,
      strongholds: doc.strongholds,
      updated_by: this.auth.getUserId(),
    };
    const { error } = await this.supabase
      .from('event_map_state')
      .upsert(row, { onConflict: eventId ? 'event_id,kind' : 'slug,kind' });
    return { error: error?.message ?? null };
  }
}
