import { Injectable } from '@angular/core';
import type { EventDashboardConfig } from '@shared/models/event-dashboard-config.model';
import { STORMLANDS_CONFIG } from '../../configs/stormlands.config';
import { DESOLATE_CONFIG } from '../../configs/desolate.config';
import { TME_CONFIG } from '../../configs/tme.config';
import { BEHEMOTH_CONFIG } from '../../configs/behemoth.config';
import { PRIMORDIAL_CONFIG } from '../../configs/primordial.config';
import { DESOLATE_STATETEST_CONFIG } from '../../configs/desolate-statetest.config';

/**
 * Resolves an event slug to its EventDashboardConfig.
 *
 * Phase A/B: configs are compiled TS modules registered in CONFIGS (type-safe,
 * no network). Phase D will extend getConfig() to also look up a config from
 * assets/events/<slug>.json or a Supabase `event_configs` row, validated with
 * validateConfig(), so a new event can be added without a rebuild.
 */
@Injectable({ providedIn: 'root' })
export class EventRegistryService {
  /** Dashboards shown on the hub. */
  private readonly configs: Record<string, EventDashboardConfig> = {
    [STORMLANDS_CONFIG.slug]: STORMLANDS_CONFIG,
    [DESOLATE_CONFIG.slug]: DESOLATE_CONFIG,
    [TME_CONFIG.slug]: TME_CONFIG,
    [BEHEMOTH_CONFIG.slug]: BEHEMOTH_CONFIG,
    [PRIMORDIAL_CONFIG.slug]: PRIMORDIAL_CONFIG,
  };

  /** Resolvable but hidden from the hub (dev/sandbox occurrences). */
  private readonly hidden: Record<string, EventDashboardConfig> = {
    [DESOLATE_STATETEST_CONFIG.slug]: DESOLATE_STATETEST_CONFIG,
  };

  /** Return the config for a slug, or null if none is registered. */
  getConfig(slug: string): EventDashboardConfig | null {
    return this.configs[slug] ?? this.hidden[slug] ?? null;
  }

  /** Listed dashboards (hub). Hidden sandbox occurrences are excluded. */
  list(): EventDashboardConfig[] {
    return Object.values(this.configs);
  }
}
