import type { EventDashboardConfig } from '@shared/models/event-dashboard-config.model';
import { DESOLATE_CONFIG } from './desolate.config';

/**
 * Desolate Desert — SANDBOX occurrence for visual map testing. Same template as
 * DD, but a different slug + data file (desolate-statetest.json) whose crafted
 * mapState/mapRoutes exercise every node + path state (inactive, active-
 * unoccupied, occupied-connected, occupied-disconnected, building, partial,
 * shared barberpole, sieged node + line, SSH). Does NOT touch the historical
 * desolate.json. View at /dashboards/desolate-test?now=2026-10-03 to see
 * schedule-gated activation alongside the live states.
 */
export const DESOLATE_STATETEST_CONFIG: EventDashboardConfig = {
  ...DESOLATE_CONFIG,
  slug: 'desolate-test',
  titleKey: 'desolate.title',
  dataSource: { kind: 'static', slug: 'desolate-statetest' },
};
