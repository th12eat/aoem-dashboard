import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';

interface RichTextOptions {
  /** i18n keys, each rendered as a paragraph. */
  paragraphKeys?: string[];
}

/**
 * Escape-hatch widget: a titled block of localized paragraphs. Used for genuine
 * one-off prose (guides, notes) that doesn't warrant a bespoke widget — so no
 * event is ever blocked on the config model. Content comes from i18n keys in
 * config.options, keeping it translatable like everything else.
 */
@Component({
  selector: 'app-rich-text',
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (title()) {
      <h3 class="widget-title">{{ title()! | translate }}</h3>
    }
    @for (key of paragraphKeys(); track $index) {
      <p class="rt-p">{{ key | translate }}</p>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .rt-p {
        color: var(--text-secondary);
        line-height: 1.6;
        margin: 0 0 10px;
      }
    `,
  ],
})
export class RichTextComponent {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  readonly title = computed(() => this.config().titleKey);
  readonly paragraphKeys = computed<string[]>(() => (this.config().options as RichTextOptions)?.paragraphKeys ?? []);
}
