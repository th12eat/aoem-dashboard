import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';

type CalloutTone = 'info' | 'warning' | 'important' | 'strategy';

interface CalloutItem {
  tone?: CalloutTone;
  /** i18n key for the callout title. */
  titleKey?: string;
  /** i18n key for the callout body. */
  bodyKey: string;
}

interface CalloutOptions {
  items?: CalloutItem[];
}

/**
 * A list of callout boxes (info/warning/important/strategy) authored entirely
 * in config as i18n keys. Replaces the per-dashboard ad-hoc `.callout` markup
 * with one localizable widget. Content-only widgets like this read from
 * `config.options`, not from EventData.
 */
@Component({
  selector: 'app-callout-list',
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (title()) {
      <h3 class="widget-title">{{ title()! | translate }}</h3>
    }
    @for (item of items(); track $index) {
      <div class="callout" [class]="'tone-' + (item.tone ?? 'info')">
        @if (item.titleKey) {
          <div class="callout-title">{{ item.titleKey | translate }}</div>
        }
        <div class="callout-body">{{ item.bodyKey | translate }}</div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .callout {
        border: 1px solid var(--border);
        border-left-width: 3px;
        border-radius: 8px;
        background: var(--bg-card);
        padding: 10px 14px;
        margin-bottom: 10px;
      }
      .callout-title {
        font-family: var(--font-ui);
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        font-size: var(--fs-label);
        margin-bottom: 4px;
      }
      .callout-body {
        color: var(--text-secondary);
        line-height: 1.5;
      }
      .tone-info {
        border-left-color: var(--accent-blue);
      }
      .tone-info .callout-title {
        color: var(--accent-blue);
      }
      .tone-warning {
        border-left-color: var(--accent-gold);
      }
      .tone-warning .callout-title {
        color: var(--accent-gold);
      }
      .tone-important {
        border-left-color: var(--accent-red);
      }
      .tone-important .callout-title {
        color: var(--accent-red);
      }
      .tone-strategy {
        border-left-color: var(--accent-purple);
      }
      .tone-strategy .callout-title {
        color: var(--accent-purple);
      }
    `,
  ],
})
export class CalloutListComponent {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  readonly title = computed(() => this.config().titleKey);
  readonly items = computed<CalloutItem[]>(() => (this.config().options as CalloutOptions)?.items ?? []);
}
