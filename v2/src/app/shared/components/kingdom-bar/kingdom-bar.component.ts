import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';
import type { ScoreboardRow } from '@shared/models/event-data.model';
import { BigNumberPipe } from '@shared/pipes/big-number.pipe';

/**
 * Persistent kingdom standings bar (1.0 KingdomBar). Labels sit in a row ABOVE
 * the bar; the bar itself is a stacked set of proportional segments, each a
 * left-to-right gradient of that kingdom's colour with a 1px divider between
 * segments. Colours are data-driven (from the enriched ScoreboardRow — the
 * corner colour changes per event). The gradient's dark end is derived from the
 * single base colour via color-mix, so only one colour per kingdom is stored.
 * Before any points exist, segments render equal.
 */
@Component({
  selector: 'app-kingdom-bar',
  imports: [TranslateModule, BigNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="kb">
      <div class="kb-labels">
        @for (seg of segments(); track seg.server) {
          <div class="kb-label-cell" [style.width.%]="seg.pct">
            @if (seg.pct >= 8) {
              <div class="kb-label-name" [style.color]="seg.color">
                {{ seg.display }}@if (seg.isOurs) { ({{ 'common.us' | translate }}) }
              </div>
              <div class="kb-label-pts">{{ seg.points | bigNumber }}</div>
            }
          </div>
        }
      </div>
      <div class="kb-bar">
        @for (seg of segments(); track seg.server) {
          <div
            class="kb-seg"
            [style.width.%]="seg.pct"
            [style.background]="seg.gradient"
            [title]="seg.display + ': ' + (seg.points | bigNumber) + ' (' + seg.pctLabel + ')'"
          ></div>
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
      .kb-labels {
        display: flex;
        width: 100%;
        margin-bottom: 6px;
      }
      .kb-label-cell {
        text-align: center;
        padding: 0 2px;
        overflow: hidden;
      }
      .kb-label-name {
        font-size: 12px;
        font-weight: 700;
        line-height: 1.2;
        white-space: nowrap;
      }
      .kb-label-pts {
        font-size: 12px;
        font-weight: 600;
        color: #cbd5e1;
        line-height: 1.2;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .kb-bar {
        display: flex;
        width: 100%;
        height: 22px;
        border: 1px solid #334155;
        border-radius: 6px;
        overflow: hidden;
      }
      .kb-seg {
        border-right: 1px solid rgba(0, 0, 0, 0.3);
      }
      .kb-seg:last-child {
        border-right: none;
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

  /** Optional last-updated label (passed via options; purely presentational). */
  readonly updatedLabel = computed(() => (this.config().options as { updatedLabel?: string })?.updatedLabel);

  readonly segments = computed(() => {
    const rows = (this.data() as ScoreboardRow[] | undefined) ?? [];
    const total = rows.reduce((sum, r) => sum + (Number.isFinite(r.points.value) ? r.points.value : 0), 0);
    return rows.map(r => {
      const val = Number.isFinite(r.points.value) ? r.points.value : 0;
      const pct = total > 0 ? (val / total) * 100 : 100 / (rows.length || 1);
      // Gradient uses the brighter barColor (v1.0 GRAD) as the light end, with a
      // gentle darkening for the dark end. Matches 1.0's vivid bar even though
      // the map/scouting use the muted `color`.
      const light = r.barColor || r.color;
      const dark = `color-mix(in srgb, ${light} 70%, #000)`;
      return {
        server: r.server,
        display: r.display || r.server,
        isOurs: r.isOurs,
        points: r.points,
        color: light,
        gradient: `linear-gradient(90deg, ${dark}, ${light})`,
        pct,
        pctLabel: total > 0 ? `${pct.toFixed(1)}%` : 'awaiting data',
      };
    });
  });
}
