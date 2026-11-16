import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';
import type { AlliancePointsRow, NumericValue, ScoreboardRow } from '@shared/models/event-data.model';
import { BigNumberPipe } from '@shared/pipes/big-number.pipe';

/** Row shapes this widget accepts, normalized to a common render row. */
interface RenderRow {
  label: string;
  points: NumericValue;
  isOurs: boolean;
}

interface ScoreboardOptions {
  /** 'server' (default) for kingdomScoreboard, 'alliance' for alliancePoints. */
  rowType?: 'server' | 'alliance';
  /** i18n key for the label-column header; defaults by rowType. */
  labelKey?: string;
}

/**
 * Ranked points scoreboard. Binds to either a ScoreboardRow[] (kingdom/server
 * points — highlights our server) or an AlliancePointsRow[] (alliance points),
 * selected by options.rowType. Both normalize to the same ranked render and use
 * the shared `.points-table` look so every event's scoreboards read identically.
 */
@Component({
  selector: 'app-scoreboard-table',
  imports: [TranslateModule, BigNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (title()) {
      <h3 class="widget-title">{{ title()! | translate }}</h3>
    }
    <table class="points-table">
      <thead>
        <tr>
          <th>#</th>
          <th>{{ labelKey() | translate }}</th>
          <th>{{ 'widget.scoreboard.points' | translate }}</th>
        </tr>
      </thead>
      <tbody>
        @for (row of sorted(); track row.label; let i = $index) {
          <tr [class.is-ours]="row.isOurs">
            <td>{{ i + 1 }}</td>
            <td class="name">
              {{ row.label }}
              @if (row.isOurs) {
                <span class="kvk-accent"> ({{ 'common.us' | translate }})</span>
              }
            </td>
            <td>{{ row.points | bigNumber }}</td>
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      tr.is-ours td {
        background: rgba(var(--kvk-accent-rgb), 0.07);
      }
    `,
  ],
})
export class ScoreboardTableComponent {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  private readonly opts = computed<ScoreboardOptions>(() => (this.config().options as ScoreboardOptions) ?? {});
  readonly title = computed(() => this.config().titleKey);
  readonly labelKey = computed(() => {
    if (this.opts().labelKey) return this.opts().labelKey!;
    return this.opts().rowType === 'alliance' ? 'widget.scoreboard.alliance' : 'widget.scoreboard.server';
  });

  readonly sorted = computed<RenderRow[]>(() => {
    const rows = this.toRenderRows(this.data());
    // NaN points (e.g. "—") sort last; otherwise descending by value.
    return rows.sort((a, b) => sortKey(b.points) - sortKey(a.points));
  });

  private toRenderRows(data: unknown): RenderRow[] {
    const list = Array.isArray(data) ? data : [];
    if (this.opts().rowType === 'alliance') {
      return (list as AlliancePointsRow[]).map(r => ({ label: r.tag, points: r.points, isOurs: false }));
    }
    return (list as ScoreboardRow[]).map(r => ({ label: r.server, points: r.points, isOurs: !!r.isOurs }));
  }
}

function sortKey(n: NumericValue): number {
  return Number.isFinite(n.value) ? n.value : -Infinity;
}
