import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { map, of, switchMap, catchError } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EventRegistryService } from '@core/services/event-registry.service';
import { EVENT_DATA_SOURCE } from '@core/services/event-dashboard.datasource';
import type { OccurrenceStatus } from '@core/services/event.service';
import { PageTitleService } from '@core/services/page-title.service';
import { ClockService } from '@core/services/clock.service';
import { deriveMapView } from '@core/services/derive-map-view';
import type { EventData } from '@shared/models/event-data.model';
import type { DataSourceRef } from '@shared/models/event-dashboard-config.model';
import type { MapNodeState, MapRoute, StrongholdState } from '@shared/models/map.model';
import { EventHeaderComponent } from '@shared/components/event-header/event-header.component';
import { KingdomBarComponent } from '@shared/components/kingdom-bar/kingdom-bar.component';
import { PrepTugComponent } from '@shared/components/prep-tug/prep-tug.component';
import { TabBarComponent } from '@shared/components/tab-bar/tab-bar.component';
import { WidgetHostComponent } from '@shared/components/widget-host/widget-host.component';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; data: EventData; occStatus: OccurrenceStatus }
  | { status: 'error' };

/**
 * The ONE config-driven dashboard page. For any `:slug` it:
 *   1. resolves the EventDashboardConfig via EventRegistryService,
 *   2. loads + normalizes data through the EventDataSource seam,
 *   3. sets [data-kvk] on the host (pure-CSS accent),
 *   4. renders the rich event header (bg image, event-meta, buttons, badge,
 *      crests — fed the full config + live data), the tab bar, and the active
 *      tab's widgets via WidgetHost.
 *
 * Navigation back to the hub is via the frozen top bar brand — no in-page back
 * link. No event-specific code lives here — "new event = new config".
 */
@Component({
  selector: 'app-event-dashboard',
  imports: [RouterLink, TranslateModule, EventHeaderComponent, KingdomBarComponent, PrepTugComponent, TabBarComponent, WidgetHostComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let cfg = config();
    @if (!cfg) {
      <div class="shell">
        <p>{{ 'common.unknownDashboard' | translate }}</p>
        <a routerLink="/dashboards" class="kvk-accent">{{ 'common.backToHub' | translate }}</a>
      </div>
    } @else {
      <app-event-header [config]="cfg" [data]="readyData()?.meta ?? null" (jump)="onJump($event)" />

      @if (gated()) {
        <!-- Pre-publish: header stands alone; body awaits the admin's go-live. -->
        <main class="shell">
          <div class="awaiting">
            <h2>{{ 'event.awaiting.title' | translate }}</h2>
            <p>{{ 'event.awaiting.body' | translate }}</p>
          </div>
        </main>
      } @else {
        @if (readyData(); as d) {
          <!-- Persistent bar — above the tabs on every tab (1.0). The kingdom
               standings bar by default; TME's prep-war uses the prep tug. -->
          @if (persistentBar() === 'prepTug' && d.prep) {
            <div class="shell kb-wrap">
              <app-prep-tug [config]="persistentBarConfig()" [data]="d.prep" />
            </div>
          } @else if (persistentBar() === 'kingdomBar') {
            <div class="shell kb-wrap">
              <app-kingdom-bar [config]="persistentBarConfig()" [data]="d.kingdomScoreboard" />
            </div>
          }
        }

        <app-tab-bar [tabs]="cfg.tabs" [activeId]="activeTabId()" (tabSelect)="selectTab($event)" />

        <main class="shell">
          @switch (load().status) {
            @case ('loading') {
              <p class="muted">{{ 'common.loading' | translate }}</p>
            }
            @case ('error') {
              <p class="muted">{{ 'common.error' | translate }}</p>
            }
            @case ('ready') {
              @for (row of widgetRows(); track $index) {
                @if (row.length > 1) {
                  <div class="widget-row">
                    @for (widget of row; track $index) {
                      <app-widget-host class="widget-half" [config]="widget" [eventData]="viewData()!" />
                    }
                  </div>
                } @else {
                  <app-widget-host [config]="row[0]" [eventData]="viewData()!" />
                }
              }
            }
          }
        </main>
      }
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .shell {
        max-width: var(--w-content);
        margin: 0 auto;
        padding: 0 20px;
      }
      .kb-wrap {
        padding-top: 14px;
        padding-bottom: 4px;
      }
      /* side-by-side half-width widgets (e.g. tier + depth tables); stack on
         narrow screens. Each half aligns to the top. */
      .widget-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        align-items: start;
      }
      @media (max-width: 760px) {
        .widget-row {
          grid-template-columns: 1fr;
        }
      }
      .widget-half {
        min-width: 0;
      }
      .muted {
        color: var(--text-muted);
        text-align: center;
        padding: 40px;
      }
      main.shell {
        padding-bottom: 48px;
      }
      .awaiting {
        margin: 40px auto;
        max-width: 520px;
        text-align: center;
        padding: 32px 24px;
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 12px;
      }
      .awaiting h2 {
        color: var(--kvk-accent);
        margin: 0 0 10px;
        font-family: var(--font-display);
        letter-spacing: 1px;
      }
      .awaiting p {
        color: var(--text-secondary);
        line-height: 1.6;
        margin: 0;
      }
    `,
  ],
})
export class EventDashboardPage {
  private readonly route = inject(ActivatedRoute);
  private readonly registry = inject(EventRegistryService);
  private readonly dataSource = inject(EVENT_DATA_SOURCE);
  private readonly pageTitle = inject(PageTitleService);
  private readonly translate = inject(TranslateService);
  private readonly clock = inject(ClockService);

  /** Current slug + optional occurrence date (/dashboards/:slug/history/:date). */
  private readonly slug = toSignal(this.route.paramMap.pipe(map(p => p.get('slug') ?? '')), { initialValue: '' });
  private readonly date = toSignal(this.route.paramMap.pipe(map(p => p.get('date'))), { initialValue: null });

  readonly config = computed(() => (this.slug() ? this.registry.getConfig(this.slug()) : null));

  /** Which tab is active (seeded to the first tab; user-switchable). */
  private readonly activeTab = signal<string | null>(null);
  readonly activeTabId = computed(() => this.activeTab() ?? this.config()?.tabs[0]?.id ?? '');
  private readonly tabWidgets = computed(() => {
    const cfg = this.config();
    if (!cfg) return [];
    return (cfg.tabs.find(t => t.id === this.activeTabId()) ?? cfg.tabs[0])?.widgets ?? [];
  });

  /** Widgets grouped into rows: consecutive `halfWidth` widgets share a flex
   * row (side-by-side on wide screens, stacked on narrow); everything else is a
   * full-width row of one. */
  readonly widgetRows = computed<WidgetConfig[][]>(() => {
    const rows: WidgetConfig[][] = [];
    let half: WidgetConfig[] = [];
    const flush = () => {
      if (half.length) {
        rows.push(half);
        half = [];
      }
    };
    for (const w of this.tabWidgets()) {
      if (w.halfWidth) {
        half.push(w);
      } else {
        flush();
        rows.push([w]);
      }
    }
    flush();
    return rows;
  });

  /** The data-source ref, occurrence-date-aware: a supabase config targets the
   * dated occurrence (/history/:date) or the current one; static is unchanged. */
  private readonly sourceRef = computed<DataSourceRef | null>(() => {
    const cfg = this.config();
    if (!cfg) return null;
    const ref = cfg.dataSource;
    if (ref.kind === 'supabase') return { ...ref, date: this.date() ?? undefined };
    return ref;
  });

  /** Data load, re-run whenever the ref (slug or occurrence date) changes. */
  readonly load = toSignal(
    toObservable(this.sourceRef).pipe(
      switchMap(ref => {
        if (!ref) return of<LoadState>({ status: 'error' });
        return this.dataSource.load(ref).pipe(
          map((loaded): LoadState => ({ status: 'ready', data: loaded.data, occStatus: loaded.status })),
          catchError(() => of<LoadState>({ status: 'error' })),
        );
      }),
    ),
    { initialValue: { status: 'loading' } as LoadState },
  );

  readonly readyData = computed(() => {
    const l = this.load();
    return l.status === 'ready' ? l.data : null;
  });

  /** Occurrence lifecycle status of the loaded event (drives the gate). */
  readonly occStatus = computed<OccurrenceStatus>(() => {
    const l = this.load();
    return l.status === 'ready' ? l.occStatus : 'complete';
  });
  /** True when the event exists but isn't published yet → show header + the
   * "Awaiting Matchmaking…" card only. Keys on occurrence STATUS, not the
   * header's date phase (an admin publishes explicitly). */
  readonly gated = computed(() => this.occStatus() === 'awaiting');

  /** EventData augmented with the derived MapView (single source of truth for
   * the map + its derived tables). Recomputes when data or the clock changes,
   * so schedule-gated node activation + the preview clock both flow through. */
  readonly viewData = computed<EventData | null>(() => {
    const data = this.readyData();
    if (!data) return null;
    const geometry = this.config()?.mapGeometry;
    if (!geometry) return data;
    const startMs = Date.parse(data.meta.eventStart);
    const now = this.clock.now();
    const mk = (raw: { state: unknown; routes: unknown; strongholds: unknown }) =>
      deriveMapView(
        geometry,
        raw.state as Record<string, MapNodeState>,
        raw.routes as { actual: MapRoute[]; planned: MapRoute[] },
        raw.strongholds as StrongholdState[],
        data.meta.kingdoms,
        data.allianceServer,
        startMs,
        now,
      );
    // Two full independent maps: LIVE (all servers) + PLAN (our server only).
    // Plan falls back to live when no plan row has been saved. `mapView` stays
    // the LIVE view so the economy tables (nodeControl/placer) are unaffected.
    const liveRaw = data.mapRaw.live ?? data.mapRaw;
    const planRaw = data.mapRaw.plan ?? liveRaw;
    const mapView = mk(liveRaw);
    const mapViewPlan = mk(planRaw);
    return { ...data, mapView, mapViewPlan, mapViews: { live: mapView, plan: mapViewPlan } };
  });

  constructor() {
    // Feed the frozen top bar's breadcrumb + accent from the active event.
    effect(() => {
      const cfg = this.config();
      this.pageTitle.set(cfg ? this.translate.instant(cfg.titleKey) : null);
      this.pageTitle.setTheme(cfg?.kvkTheme ?? 'generic');
    });
  }

  /** Which persistent bar to pin above the tabs (config-chosen; defaults to the
   * kingdom-standings bar). TME's prep-war opts into `prepTug`. */
  readonly persistentBar = computed<'kingdomBar' | 'prepTug' | 'none'>(() => this.config()?.persistentBar ?? 'kingdomBar');

  /** Minimal card-less WidgetConfig for whichever persistent bar renders; its
   * last-updated label comes from the loaded data. */
  readonly persistentBarConfig = computed<WidgetConfig>(() => ({
    kind: this.persistentBar() === 'prepTug' ? 'prepTug' : 'kingdomBar',
    card: false,
    options: { updatedLabel: this.readyData()?.pointsUpdatedLabel },
  }));

  selectTab(id: string): void {
    this.activeTab.set(id);
  }

  /** Header jump: switch tab (if given), then scroll to the widget anchor. */
  onJump(target: { tab?: string; anchor?: string }): void {
    if (target.tab) this.activeTab.set(target.tab);
    if (target.anchor) {
      // Wait for the tab's widgets to render, then scroll the anchored card in.
      setTimeout(() => {
        document.getElementById(target.anchor!)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 60);
    }
  }
}
