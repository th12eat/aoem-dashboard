import { Injectable, Signal, computed, signal } from '@angular/core';

/**
 * Single source of "now" for every time-dependent widget (countdown, timeline,
 * schedule windows, live badge). Widgets read `clock.now()` instead of calling
 * Date.now() themselves, which (a) centralises the 1s tick and (b) enables a
 * preview-date override for building/verifying dashboards outside a live event.
 *
 * Preview override: `?now=2026-11-04` or `?now=2026-11-04T19:30:00Z` on the URL
 * freezes the clock at that instant (no ticking — a fixed "as of" view). With
 * no param, the real wall clock is used and ticks every second.
 *
 * Intended for dev/admin verification; harmless in production (a shared link
 * with ?now would just pin that view). Reads location.search directly so it
 * works regardless of router timing.
 */
@Injectable({ providedIn: 'root' })
export class ClockService {
  /** Fixed override instant (ms) if ?now= is present and valid, else null. */
  private readonly override = signal<number | null>(this.readOverride());

  /** Live wall-clock tick (only advances when there's no override). */
  private readonly tick = signal(Date.now());

  constructor() {
    if (this.override() === null) {
      setInterval(() => this.tick.set(Date.now()), 1000);
    }
  }

  /** Current time in ms — the override instant, or the ticking wall clock. */
  readonly now: Signal<number> = computed(() => this.override() ?? this.tick());

  /** True when a preview-date override is active (for an optional UI banner). */
  readonly isPreview = computed(() => this.override() !== null);

  private readOverride(): number | null {
    try {
      const raw = new URLSearchParams(window.location.search).get('now');
      if (!raw) return null;
      // Accept a bare date (UTC midnight) or a full ISO instant.
      const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00Z` : raw;
      const ms = Date.parse(iso);
      return Number.isFinite(ms) ? ms : null;
    } catch {
      return null;
    }
  }
}
