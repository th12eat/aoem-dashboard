import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';

interface SpecColumn {
  /** Verbatim header text. */
  header: string;
  /** Alignment of this column's cells. Default left. */
  align?: 'left' | 'center' | 'right';
  /** Optional CSS color applied to every cell in this column. */
  color?: string;
}

interface SpecTableOptions {
  /** Optional verbatim intro paragraph above the table. */
  intro?: string;
  columns?: SpecColumn[];
  /** Each row is an array of verbatim cell strings, aligned to `columns`. */
  rows?: string[][];
  /** Optional verbatim footnote under the table. */
  footnote?: string;
}

/**
 * Generic reference table with coloured, aligned columns and verbatim rows.
 * One widget covers the many fixed-content 1.0 tables (Storm Points sources,
 * daily caps, battle points by tier, weapon level scaling, flag costs,
 * Storm-Power debuff scaling). Content is authored verbatim in config.options.
 * Uses the shared `.points-table` look.
 */
@Component({
  selector: 'app-spec-table',
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (title()) {
      <h3 class="widget-title">{{ title()! | translate }}</h3>
    }
    @if (intro()) {
      <p class="st-intro">{{ intro() }}</p>
    }
    <table class="points-table">
      <thead>
        <tr>
          @for (col of columns(); track $index) {
            <th [style.text-align]="col.align ?? 'left'">{{ col.header }}</th>
          }
        </tr>
      </thead>
      <tbody>
        @for (row of rows(); track $index) {
          <tr>
            @for (cell of row; track $index; let c = $index) {
              <td [style.text-align]="columns()[c]?.align ?? 'left'" [style.color]="columns()[c]?.color || null">
                {{ cell }}
              </td>
            }
          </tr>
        }
      </tbody>
    </table>
    @if (footnote()) {
      <p class="st-foot">{{ footnote() }}</p>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .st-intro {
        color: var(--text-secondary);
        line-height: 1.55;
        margin: 0 0 12px;
      }
      .st-foot {
        color: var(--text-muted);
        font-size: var(--fs-sub);
        line-height: 1.5;
        margin: 8px 0 0;
      }
    `,
  ],
})
export class SpecTableComponent {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  private readonly opts = computed<SpecTableOptions>(() => (this.config().options as SpecTableOptions) ?? {});
  readonly title = computed(() => this.config().titleKey);
  readonly intro = computed(() => this.opts().intro);
  readonly columns = computed<SpecColumn[]>(() => this.opts().columns ?? []);
  readonly rows = computed<string[][]>(() => this.opts().rows ?? []);
  readonly footnote = computed(() => this.opts().footnote);
}
