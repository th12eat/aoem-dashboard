import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { EventRegistryService } from '@core/services/event-registry.service';
import { PageTitleService } from '@core/services/page-title.service';

/**
 * Admin hub (preview build — UNGUARDED for now; Phase C adds AuthGuard +
 * Supabase persistence). Lists the registered events and links each to its map
 * editor. Future slices add event create/edit/archive + text-field editors.
 */
@Component({
  selector: 'app-admin-hub',
  imports: [RouterLink, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="kvk-header" data-kvk="generic">
      <div class="kvk-tag">Admin · Preview</div>
      <h1 class="kvk-title">EVENT ADMIN</h1>
      <div class="kvk-subtitle">Create & publish events · edit maps & data</div>
    </header>
    <div class="ah-top">
      <a routerLink="/admin/events" class="ah-cta">🗓 Create / publish events</a>
    </div>
    <main class="ah-grid">
      @for (cfg of events; track cfg.slug) {
        <div class="ah-card" [attr.data-kvk]="cfg.kvkTheme">
          <span class="ah-name">{{ cfg.titleKey | translate }}</span>
          <div class="ah-actions">
            <a [routerLink]="['/dashboards', cfg.slug]">↗ View</a>
          </div>
        </div>
      }
    </main>
  `,
  styles: [
    `
      .ah-top {
        max-width: var(--w-content);
        margin: 0 auto;
        padding: 0 20px 4px;
      }
      .ah-cta {
        display: inline-block;
        background: var(--kvk-accent);
        color: #0a0c14;
        font-weight: 700;
        text-decoration: none;
        border-radius: 8px;
        padding: 8px 14px;
      }
      .ah-grid {
        max-width: var(--w-content);
        margin: 0 auto;
        padding: 0 20px 48px;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 16px;
      }
      .ah-card {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-left: 3px solid var(--kvk-accent);
        border-radius: 10px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .ah-name {
        font-family: var(--font-display);
        font-size: var(--fs-h2);
        letter-spacing: 1px;
        color: var(--text-primary);
      }
      .ah-actions {
        display: flex;
        gap: 14px;
        font-size: var(--fs-label);
      }
      .ah-actions a {
        color: var(--kvk-accent);
        text-decoration: none;
      }
      .ah-none {
        color: var(--text-muted);
        font-size: var(--fs-label);
      }
    `,
  ],
})
export class AdminHubPage {
  private readonly registry = inject(EventRegistryService);
  private readonly pageTitle = inject(PageTitleService);
  readonly events = this.registry.list();

  constructor() {
    this.pageTitle.set('Admin');
    this.pageTitle.setTheme('generic');
  }
}
