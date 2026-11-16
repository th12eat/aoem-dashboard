import { Injectable } from '@angular/core';
import type { EventDashboardConfig } from '@shared/models/event-dashboard-config.model';
import { STORMLANDS_CONFIG } from '../../configs/stormlands.config';

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
  private readonly configs: Record<string, EventDashboardConfig> = {
    [STORMLANDS_CONFIG.slug]: STORMLANDS_CONFIG,
  };

  /** Return the config for a slug, or null if none is registered. */
  getConfig(slug: string): EventDashboardConfig | null {
    return this.configs[slug] ?? null;
  }

  /** All registered configs — used by the hub to list available dashboards. */
  list(): EventDashboardConfig[] {
    return Object.values(this.configs);
  }
}
