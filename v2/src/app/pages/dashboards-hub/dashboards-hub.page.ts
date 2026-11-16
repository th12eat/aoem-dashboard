import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { EventRegistryService } from '@core/services/event-registry.service';
import { PageTitleService } from '@core/services/page-title.service';

/**
 * Landing hub — a card grid of every registered dashboard. Each card links to
 * `/dashboards/:slug`. As configs are added to EventRegistryService they appear
 * here automatically; no hand-maintained list.
 */
@Component({
  selector: 'app-dashboards-hub',
  imports: [RouterLink, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="kvk-header" data-kvk="generic">
      <div class="kvk-tag">{{ 'hub.tag' | translate }}</div>
      <h1 class="kvk-title">{{ 'hub.title' | translate }}</h1>
      <div class="kvk-subtitle">{{ 'hub.subtitle' | translate }}</div>
    </header>

    <main class="grid">
      @for (cfg of dashboards; track cfg.slug) {
        <a class="card" [attr.data-kvk]="cfg.kvkTheme" [routerLink]="['/dashboards', cfg.slug]">
          <span class="card-tag">{{ 'hub.beta' | translate }}</span>
          <span class="card-title">{{ cfg.titleKey | translate }}</span>
          @if (cfg.subtitleKey) {
            <span class="card-sub">{{ cfg.subtitleKey | translate }}</span>
          }
        </a>
      }
    </main>
  `,
  styles: [
    `
      .grid {
        max-width: var(--w-content);
        margin: 0 auto;
        padding: 0 20px 48px;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 16px;
      }
      .card {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 20px;
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-left: 3px solid var(--kvk-accent);
        border-radius: 10px;
        text-decoration: none;
        transition:
          transform 0.12s,
          border-color 0.12s;
      }
      .card:hover {
        transform: translateY(-2px);
        border-color: var(--kvk-accent-dim);
      }
      .card-tag {
        font-family: var(--font-ui);
        font-size: var(--fs-micro);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--kvk-accent);
      }
      .card-title {
        font-family: var(--font-display);
        font-size: var(--fs-h2);
        letter-spacing: 1px;
        color: var(--text-primary);
      }
      .card-sub {
        font-family: var(--font-ui);
        font-size: var(--fs-label);
        color: var(--text-secondary);
      }
    `,
  ],
})
export class DashboardsHubPage {
  private readonly registry = inject(EventRegistryService);
  private readonly pageTitle = inject(PageTitleService);
  readonly dashboards = this.registry.list();

  constructor() {
    // Hub shows no breadcrumb crumb (matches 1.0 home).
    this.pageTitle.set(null);
  }
}

