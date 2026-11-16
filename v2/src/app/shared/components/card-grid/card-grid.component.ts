import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';

interface GridCard {
  /** Emoji / icon glyph. */
  icon?: string;
  /** Verbatim card title. */
  title: string;
  /** Optional accent colour for the title. */
  color?: string;
  /** Optional badge (e.g. "Unlocks Day 2"). */
  badge?: string;
  /** Verbatim body text. */
  desc: string;
}

interface CardGridOptions {
  /** Optional verbatim intro paragraph above the cards. */
  intro?: string;
  /** Columns at desktop width (default 2). */
  columns?: number;
  cards?: GridCard[];
}

/**
 * Icon/title/description card grid. Covers the many 1.0 reference sections built
 * from the same shape — PvE activities, currencies, Storm Machines, alliance
 * buildings, Storm Weapons, zones. All card content is authored VERBATIM in
 * config.options (not reworded), so the guide reads exactly as 1.0.
 */
@Component({
  selector: 'app-card-grid',
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (title()) {
      <h3 class="widget-title">{{ title()! | translate }}</h3>
    }
    @if (intro()) {
      <p class="cg-intro">{{ intro() }}</p>
    }
    <div class="cg-grid" [style.--cols]="columns()">
      @for (card of cards(); track $index) {
        <div class="cg-card">
          <div class="cg-head">
            @if (card.icon) {
              <span class="cg-icon">{{ card.icon }}</span>
            }
            <span class="cg-title" [style.color]="card.color ?? 'var(--text-primary)'">{{ card.title }}</span>
            @if (card.badge) {
              <span class="cg-badge">{{ card.badge }}</span>
            }
          </div>
          <div class="cg-desc">{{ card.desc }}</div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .cg-intro {
        color: var(--text-secondary);
        line-height: 1.55;
        margin: 0 0 14px;
      }
      .cg-grid {
        display: grid;
        grid-template-columns: repeat(var(--cols, 2), 1fr);
        gap: 12px;
      }
      @media (max-width: 640px) {
        .cg-grid {
          grid-template-columns: 1fr;
        }
      }
      .cg-card {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 9px;
        padding: 12px 14px;
      }
      .cg-head {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
        flex-wrap: wrap;
      }
      .cg-icon {
        font-size: 20px;
        line-height: 1;
      }
      .cg-title {
        font-family: var(--font-ui);
        font-weight: 700;
        font-size: var(--fs-lead);
        letter-spacing: 0.02em;
      }
      .cg-badge {
        font-family: var(--font-ui);
        font-size: var(--fs-micro);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--kvk-accent);
        border: 1px solid var(--kvk-accent-dim);
        border-radius: 999px;
        padding: 1px 8px;
      }
      .cg-desc {
        color: var(--text-secondary);
        line-height: 1.5;
        font-size: var(--fs-label);
      }
    `,
  ],
})
export class CardGridComponent {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  private readonly opts = computed<CardGridOptions>(() => (this.config().options as CardGridOptions) ?? {});
  readonly title = computed(() => this.config().titleKey);
  readonly intro = computed(() => this.opts().intro);
  readonly columns = computed(() => this.opts().columns ?? 2);
  readonly cards = computed<GridCard[]>(() => this.opts().cards ?? []);
}
