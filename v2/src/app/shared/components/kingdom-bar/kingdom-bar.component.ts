import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';
import type { ScoreboardRow } from '@shared/models/event-data.model';
import { BigNumberPipe } from '@shared/pipes/big-number.pipe';

interface KingdomBarOptions {
  /** server → CSS color, for the proportional segments. */
  colors?: Record<string, string>;
  /** fixed left-to-right segment order; defaults to data order. */
  order?: string[];
  /** last-updated label shown under the bar. */
  updatedLabel?: string;
}

/**
 * Persistent kingdom standings bar (1.0 KingdomBar). A stacked proportional bar
 * of each server's points share, with our server emphasised. Binds to
 * ScoreboardRow[] (kingdomScoreboard). Before any points exist, segments render
 * equal. Colours/order come from config.options so each event can theme its
 * corners.
 */
@Component({
  selector: 'app-kingdom-bar',
  imports: [TranslateModule, BigNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="kb">
      <div class="kb-bar">
        @for (seg of segments(); track seg.server) {
          <div
            class="kb-seg"
            [style.width.%]="seg.pct"
            [style.background]="seg.color"
            [title]="seg.server + ': ' + (seg.points | bigNumber) + ' (' + seg.pctLabel + ')'"
          >
            @if (seg.pct >= 8) {
              <span class="kb-seg-label">{{ seg.server }}<span class="kb-seg-pts">{{ seg.points | bigNumber }}</span></span>
            }
          </div>
        }
      </div>
      @if (updatedLabel()) {
        <div class="kb-updated">{{ 'widget.kingdomBar.updated' | translate }}: {{ updatedLabel() }}</div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        max-width: var(--w-content);
        margin: 0 auto 10px;
      }
      .kb-bar {
        display: flex;
        height: 22px;
        border: 1px solid #334155;
        border-radius: 6px;
        overflow: hidden;
      }
      .kb-seg {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 0;
        transition: width 0.4s ease;
      }
      .kb-seg-label {
        font-family: var(--font-ui);
        font-size: var(--fs-micro);
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        padding: 0 6px;
      }
      .kb-seg-pts {
        margin-left: 6px;
        opacity: 0.85;
        font-variant-numeric: tabular-nums;
      }
      .kb-updated {
        text-align: right;
        margin-top: 8px;
        font-size: var(--fs-micro);
        color: var(--text-muted);
      }
    `,
  ],
})
export class KingdomBarComponent {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  private readonly opts = computed<KingdomBarOptions>(() => (this.config().options as KingdomBarOptions) ?? {});

  readonly updatedLabel = computed(() => this.opts().updatedLabel);

  readonly segments = computed(() => {
    const rows = (this.data() as ScoreboardRow[] | undefined) ?? [];
    const opts = this.opts();
    const ordered = opts.order
      ? opts.order.map(s => rows.find(r => r.server === s)).filter((r): r is ScoreboardRow => !!r)
      : rows;
    const total = ordered.reduce((sum, r) => sum + (Number.isFinite(r.points.value) ? r.points.value : 0), 0);
    return ordered.map(r => {
      const val = Number.isFinite(r.points.value) ? r.points.value : 0;
      const pct = total > 0 ? (val / total) * 100 : 100 / (ordered.length || 1);
      return {
        server: r.server,
        points: r.points,
        color: opts.colors?.[r.server] ?? 'var(--kvk-accent)',
        pct,
        pctLabel: total > 0 ? `${pct.toFixed(1)}%` : 'awaiting data',
      };
    });
  });
}
