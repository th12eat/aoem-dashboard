import type { EventData } from '@shared/models/event-data.model';
import type { MapStateStore } from './map-state.store';

/**
 * Overlay the DB-saved live/plan map state onto normalized EventData. Static
 * JSON (or the event_data doc) stays the source of truth for everything else;
 * only the three map keys are replaced when a row exists. A missing row leaves
 * the static map state untouched. Shared by both event data sources so the
 * overlay logic lives in exactly one place. Keyed by the OCCURRENCE (eventId)
 * when one exists; legacy no-occurrence types pass eventId=null and resolve the
 * legacy (slug,kind) row.
 */
export async function overlayMapState(
  mapStore: MapStateStore,
  eventId: string | null,
  slug: string,
  data: EventData,
): Promise<EventData> {
  const [live, plan] = await Promise.all([
    mapStore.load(eventId, slug, 'live'),
    mapStore.load(eventId, slug, 'plan'),
  ]);
  const liveDoc = live ?? {
    state: data.mapRaw.state,
    routes: data.mapRaw.routes,
    strongholds: data.mapRaw.strongholds,
  };
  return {
    ...data,
    mapState: liveDoc.state as Record<string, unknown>,
    mapRoutes: liveDoc.routes as { actual: unknown[]; planned: unknown[] },
    mapRaw: {
      ...data.mapRaw,
      state: liveDoc.state as Record<string, unknown>,
      routes: liveDoc.routes as { actual: unknown[]; planned: unknown[] },
      strongholds: liveDoc.strongholds as unknown[],
      live: liveDoc,
      plan: plan ?? undefined,
    },
  };
}
