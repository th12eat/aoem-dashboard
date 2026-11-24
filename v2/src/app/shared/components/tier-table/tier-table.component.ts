import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';
import type { TierMatrix } from '@shared/models/event-data.model';
import { extremeCell } from '@shared/utils/extreme';
import { LeanIndicatorComponent } from '../lean-indicator/lean-indicator.component';

/**
 * Power Tier Distribution (1.0): power brackets as ROWS, servers as COLUMNS,
 * cells = player count at or above that bracket. In a 1v1 (exactly two servers)
 * the comparison reads as a centred "lean" chevron between the two columns
 * (green toward us, red toward them) — the 1.0 TME treatment. With 3+ servers
 * it keeps the per-row best=green / worst=red cell tint. Column headers are
 * tinted by each server's corner colour (data-driven from the matrix).
 */
@Component({
  selector: 'app-tier-table',
  imports: [TranslateModule, LeanIndicatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tt-scroll">
      <table class="points-table">
        <thead>
          <tr>
            <th>{{ 'widget.tier.threshold' | translate }}</th>
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
          @for (row of rows(); track row.label) {
            <tr>
              <td class="name">{{ row.label }}</td>
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
    @if (!duel()) {
      <p class="tt-foot">{{ 'widget.tier.foot' | translate }}</p>
    }
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
      /* Duel layout: the two metric columns + the lean column share one fixed
         width and are centred, so neither side reads as left/right-aligned. */
      .metric-col {
        width: 72px;
        text-align: center;
        font-variant-numeric: tabular-nums;
      }
      .lean-col {
        width: 72px;
        text-align: center;
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
  /** 1v1 → render the lean chevron; 3+ servers → per-row best/worst tint. The
   * first server is "us" (left/green), the second is "them" (right/red). */
  readonly duel = computed(() => this.servers().length === 2);

  readonly rows = computed(() => {
    const m = this.matrix();
    const servers = this.servers();
    return m.labels.map((label, ri) => {
      const vals = servers.map(s => m.byServer[s]?.[ri] ?? null);
      return { label, raw: vals, cells: vals.map(v => extremeCell(vals, v, v == null ? '—' : String(v))) };
    });
  });

  label(server: string): string {
    const short = server.replace('Era ', '');
    return server === this.matrix().ourServer ? `${short} · Us` : short;
  }
}
