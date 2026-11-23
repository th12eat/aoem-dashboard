import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';
import type { DepthMatrix } from '@shared/models/event-data.model';
import { extremeCell } from '@shared/utils/extreme';

/**
 * Roster depth by rank (1.0 "Roster Depth by Rank"): rank cut-offs as ROWS,
 * servers as COLUMNS, showing the power (or merits) value in millions at each
 * rank. A Power|Merits TOGGLE at the top-right switches the metric in place.
 * Best value per row is green, worst red (shared extremeCell). Column headers
 * tinted by each server's corner colour (data-driven from the matrix).
 */
@Component({
  selector: 'app-depth-table',
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dt-toolbar">
      <div class="dt-toggle">
        <button type="button" [class.on]="metric() === 'power'" (click)="metric.set('power')">
          {{ 'widget.depth.power' | translate }}
        </button>
        <button type="button" [class.on]="metric() === 'merits'" (click)="metric.set('merits')">
          {{ 'widget.depth.merits' | translate }}
        </button>
      </div>
    </div>
    <div class="dt-scroll">
      <table class="points-table">
        <thead>
          <tr>
            <th>{{ 'widget.depth.rank' | translate }}</th>
            @for (server of servers(); track server) {
              <th class="rt" [style.color]="matrix().colors[server]">{{ label(server) }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.rank) {
            <tr>
              <td class="name">#{{ row.rank }}</td>
              @for (c of row.cells; track $index) {
                <td class="rt" [style.color]="c.color" [style.font-weight]="c.weight">{{ c.text }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .dt-toolbar {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 8px;
      }
      .dt-toggle {
        display: inline-flex;
        border: 1px solid var(--border);
        border-radius: 999px;
        overflow: hidden;
      }
      .dt-toggle button {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px 14px;
        font-family: var(--font-ui);
        font-size: var(--fs-label);
        font-weight: 600;
        letter-spacing: 0.04em;
        color: var(--text-muted);
      }
      .dt-toggle button.on {
        background: rgba(var(--kvk-accent-rgb), 0.16);
        color: var(--kvk-accent);
      }
      .dt-scroll {
        overflow-x: auto;
      }
      th.rt,
      td.rt {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
    `,
  ],
})
export class DepthTableComponent {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  readonly metric = signal<'power' | 'merits'>('power');

  readonly matrix = computed<DepthMatrix>(
    () => (this.data() as DepthMatrix | undefined) ?? { ranks: [], byServer: {}, colors: {}, ourServer: '' },
  );
  readonly servers = computed(() => Object.keys(this.matrix().byServer));

  readonly rows = computed(() => {
    const m = this.matrix();
    const metric = this.metric();
    const servers = this.servers();
    return m.ranks.map((rank, ri) => {
      const vals = servers.map(s => m.byServer[s]?.[metric]?.[ri] ?? null);
      return { rank, cells: vals.map(v => extremeCell(vals, v, v == null ? '—' : `${v}M`)) };
    });
  });

  label(server: string): string {
    const short = server.replace('Era ', '');
    return server === this.matrix().ourServer ? `${short} · Us` : short;
  }
}
