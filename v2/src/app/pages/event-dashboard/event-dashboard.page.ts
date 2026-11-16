import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { map, of, switchMap, catchError } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EventRegistryService } from '@core/services/event-registry.service';
import { EVENT_DATA_SOURCE } from '@core/services/event-dashboard.datasource';
import { PageTitleService } from '@core/services/page-title.service';
import type { EventData } from '@shared/models/event-data.model';
import { EventHeaderComponent } from '@shared/components/event-header/event-header.component';
import { TabBarComponent } from '@shared/components/tab-bar/tab-bar.component';
import { WidgetHostComponent } from '@shared/components/widget-host/widget-host.component';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; data: EventData }
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
  imports: [RouterLink, TranslateModule, EventHeaderComponent, TabBarComponent, WidgetHostComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-kvk]': 'kvkTheme()' },
  template: `
    @let cfg = config();
    @if (!cfg) {
      <div class="shell">
        <p>{{ 'common.unknownDashboard' | translate }}</p>
        <a routerLink="/dashboards" class="kvk-accent">{{ 'common.backToHub' | translate }}</a>
      </div>
    } @else {
      <app-event-header [config]="cfg" [data]="readyData()?.meta ?? null" (jumpToTab)="selectTab($event)" />

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
            @for (widget of activeWidgets(); track $index) {
              <app-widget-host [config]="widget" [eventData]="readyData()!" />
            }
          }
        }
      </main>
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
      .muted {
        color: var(--text-muted);
        text-align: center;
        padding: 40px;
      }
      main.shell {
        padding-bottom: 48px;
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

  /** Current slug from the route. */
  private readonly slug = toSignal(this.route.paramMap.pipe(map(p => p.get('slug') ?? '')), { initialValue: '' });

  readonly config = computed(() => (this.slug() ? this.registry.getConfig(this.slug()) : null));
  readonly kvkTheme = computed(() => this.config()?.kvkTheme ?? 'generic');

  /** Which tab is active (seeded to the first tab; user-switchable). */
  private readonly activeTab = signal<string | null>(null);
  readonly activeTabId = computed(() => this.activeTab() ?? this.config()?.tabs[0]?.id ?? '');
  readonly activeWidgets = computed(() => {
    const cfg = this.config();
    if (!cfg) return [];
    return (cfg.tabs.find(t => t.id === this.activeTabId()) ?? cfg.tabs[0])?.widgets ?? [];
  });

  /** Data load, re-run whenever the config (slug) changes. */
  readonly load = toSignal(
    toObservable(this.config).pipe(
      switchMap(cfg => {
        if (!cfg) return of<LoadState>({ status: 'error' });
        return this.dataSource.load(cfg.dataSource).pipe(
          map((data): LoadState => ({ status: 'ready', data })),
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

  constructor() {
    // Feed the frozen top bar's breadcrumb with the translated event title.
    effect(() => {
      const cfg = this.config();
      this.pageTitle.set(cfg ? this.translate.instant(cfg.titleKey) : null);
    });
  }

  selectTab(id: string): void {
    this.activeTab.set(id);
  }
}
