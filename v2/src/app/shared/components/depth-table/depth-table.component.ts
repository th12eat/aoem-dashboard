import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';
import type { DepthMatrix } from '@shared/models/event-data.model';
import { extremeCell } from '@shared/utils/extreme';
import { LeanIndicatorComponent } from '../lean-indicator/lean-indicator.component';

/**
 * Roster depth by rank (1.0 "Roster Depth by Rank"): rank cut-offs as ROWS,
 * servers as COLUMNS, showing the power (or merits) value in millions at each
 * rank. A Power|Merits TOGGLE at the top-right switches the metric in place.
 * Best value per row is green, worst red (shared extremeCell). Column headers
 * tinted by each server's corner colour (data-driven from the matrix).
 */
@Component({
  selector: 'app-depth-table',
  imports: [TranslateModule, LeanIndicatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dt-head">
      @if (title()) {
        <h3 class="widget-title">{{ title()! | translate }}</h3>
      }
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
            @if (duel()) {
              <th class="metric-col" [style.color]="matrix().colors[servers()[0]]">{{ label(servers()[0]) }}</th>
              <th class="lean-col"></th>
              <th class="metric-col" [style.color]="matrix().colors[servers()[1]]">{{ label(servers()[1]) }}</th>
            } @else {
              @for (server of servers(); track server) {
                <th class="rt" [style.color]="matrix().colors[server]">{{ label(server) }}</th>
              }
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.rank) {
            <tr>
              <td class="name">#{{ row.rank }}</td>
              @if (duel()) {
                <td class="metric-col">{{ row.cells[0].text }}</td>
                <td class="lean-col"><app-lean-indicator [us]="row.raw[0]" [them]="row.raw[1]" /></td>
                <td class="metric-col">{{ row.cells[1].text }}</td>
              } @else {
                @for (c of row.cells; track $index) {
                  <td class="rt" [style.color]="c.color" [style.font-weight]="c.weight">{{ c.text }}</td>
                }
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
      /* Title row: title left, Power/Merits toggle right — shares the baseline
         so the two half-width tables (tier + depth) line up at the top. */
      .dt-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 0 0 6px;
        margin: 0 0 12px;
        border-bottom: 1px solid var(--border);
      }
      .widget-title {
        font-family: var(--font-display);
        font-size: var(--fs-h2);
        font-weight: 400;
        color: var(--kvk-accent);
        letter-spacing: 2px;
        margin: 0;
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
      /* Duel: two metric columns + lean column share one fixed centred width. */
      .metric-col {
        width: 72px;
        text-align: center;
        font-variant-numeric: tabular-nums;
      }
      .lean-col {
        width: 72px;
        text-align: center;
      }
    `,
  ],
})
export class DepthTableComponent {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  /** Own-title: the host sets `ownTitle` so this widget draws the title inline
   * with the Power/Merits toggle (keeps titleKey instead of stripping it). */
  readonly title = computed(() => this.config().titleKey);

  readonly metric = signal<'power' | 'merits'>('power');

  readonly matrix = computed<DepthMatrix>(
    () => (this.data() as DepthMatrix | undefined) ?? { ranks: [], byServer: {}, colors: {}, ourServer: '' },
  );
  readonly servers = computed(() => Object.keys(this.matrix().byServer));
  /** 1v1 → lean chevron; 3+ servers → per-row best/worst tint. */
  readonly duel = computed(() => this.servers().length === 2);

  readonly rows = computed(() => {
    const m = this.matrix();
    const metric = this.metric();
    const servers = this.servers();
    return m.ranks.map((rank, ri) => {
      const vals = servers.map(s => m.byServer[s]?.[metric]?.[ri] ?? null);
      return { rank, raw: vals, cells: vals.map(v => extremeCell(vals, v, v == null ? '—' : `${v}M`)) };
    });
  });

  label(server: string): string {
    const short = server.replace('Era ', '');
    return server === this.matrix().ourServer ? `${short} · Us` : short;
  }
}
