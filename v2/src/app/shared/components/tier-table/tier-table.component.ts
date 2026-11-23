import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';
import type { TierMatrix } from '@shared/models/event-data.model';
import { extremeCell } from '@shared/utils/extreme';

/**
 * Power Tier Distribution (1.0): power brackets as ROWS, servers as COLUMNS,
 * cells = player count at or above that bracket. Per row the best (most) is
 * green and the worst (fewest) is red — a server-vs-server read. Column headers
 * are tinted by each server's corner colour (data-driven from the matrix).
 */
@Component({
  selector: 'app-tier-table',
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tt-scroll">
      <table class="points-table">
        <thead>
          <tr>
            <th>{{ 'widget.tier.threshold' | translate }}</th>
            @for (server of servers(); track server) {
              <th class="rt" [style.color]="matrix().colors[server]">{{ label(server) }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.label) {
            <tr>
              <td class="name">{{ row.label }}</td>
              @for (c of row.cells; track $index) {
                <td class="rt" [style.color]="c.color" [style.font-weight]="c.weight">{{ c.text }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
    <p class="tt-foot">{{ 'widget.tier.foot' | translate }}</p>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .tt-scroll {
        overflow-x: auto;
      }
      th.rt,
      td.rt {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      .tt-foot {
        color: var(--text-muted);
        font-size: var(--fs-sub);
        line-height: 1.5;
        margin: 8px 0 0;
      }
    `,
  ],
})
export class TierTableComponent {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  readonly matrix = computed<TierMatrix>(
    () => (this.data() as TierMatrix | undefined) ?? { labels: [], byServer: {}, colors: {}, ourServer: '' },
  );
  readonly servers = computed(() => Object.keys(this.matrix().byServer));

  readonly rows = computed(() => {
    const m = this.matrix();
    const servers = this.servers();
    return m.labels.map((label, ri) => {
      const vals = servers.map(s => m.byServer[s]?.[ri] ?? null);
      return { label, cells: vals.map(v => extremeCell(vals, v, v == null ? '—' : String(v))) };
    });
  });

  label(server: string): string {
    const short = server.replace('Era ', '');
    return server === this.matrix().ourServer ? `${short} · Us` : short;
  }
}
