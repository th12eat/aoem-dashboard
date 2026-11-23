import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';
import type { MapView } from '@shared/models/map.model';

/**
 * Node Control — Buffs & Energy (1.0 NodeControlTable). A per-alliance matrix:
 * each buff cell lights only if that alliance holds a connected+occupied node
 * granting it; the last column is energy/hour. Buff columns are DERIVED from
 * the event's geometry (mapView.buffColumns), so each event shows only its real
 * buffs (Stormlands: Attack/Defense; DD: Health/Attack/Defense/DmgRed/Damage).
 * Rows tinted by the alliance's server shade. Empty until map data exists.
 *
 * Binds to mapView (the derived single source of truth).
 */
@Component({
  selector: 'app-node-control',
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (rows().length === 0) {
      <p class="nc-empty">{{ 'widget.nodeControl.empty' | translate }}</p>
    } @else {
      <div class="nc-scroll">
        <table class="points-table nc-tbl">
          <thead>
            <tr>
              <th>{{ 'widget.leaderboard.alliance' | translate }}</th>
              @for (b of buffColumns(); track b.key) {
                <th class="ctr">{{ b.label }}</th>
              }
              <th class="rt">{{ 'widget.nodeControl.energyH' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.tag) {
              <tr [style.background]="'rgba(' + row.rgb + ',0.10)'">
                <td class="nc-tag" [style.color]="row.color">
                  {{ row.tag }} <span class="nc-srv">{{ shortServer(row.server) }}</span>
                </td>
                @for (b of buffColumns(); track b.key) {
                  @let on = row.buffs.includes(b.key);
                  <td class="ctr nc-buff" [class.on]="on">{{ on ? '✓' : '·' }}</td>
                }
                <td class="rt" [style.color]="row.perHour > 0 ? '#3daa6d' : 'var(--text-muted)'">
                  {{ row.perHour > 0 ? '+' + fmt(row.perHour) : '0' }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <p class="nc-foot">{{ 'widget.nodeControl.foot' | translate }}</p>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .nc-scroll {
        overflow-x: auto;
      }
      .nc-tbl {
        min-width: 420px;
      }
      th.ctr,
      td.ctr {
        text-align: center;
      }
      th.rt,
      td.rt {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      .nc-tag {
        font-weight: 700;
        white-space: nowrap;
      }
      .nc-srv {
        font-size: 10px;
        color: var(--text-muted);
      }
      .nc-buff {
        color: #475569;
      }
      .nc-buff.on {
        color: #3daa6d;
        font-weight: 700;
      }
      .nc-empty,
      .nc-foot {
        color: var(--text-muted);
        font-size: var(--fs-sub);
        line-height: 1.5;
      }
      .nc-foot {
        margin: 8px 0 0;
      }
      .nc-empty {
        text-align: center;
        padding: 16px;
      }
    `,
  ],
})
export class NodeControlComponent {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  private readonly view = computed(() => this.data() as MapView | undefined);
  readonly buffColumns = computed(() => this.view()?.buffColumns ?? []);
  readonly rows = computed(() =>
    (this.view()?.holdings ?? []).map(h => ({
      tag: h.tag,
      server: h.server,
      color: h.shade,
      rgb: h.rgb,
      buffs: h.buffs,
      perHour: h.placerPerHour,
    })),
  );

  shortServer(server: string): string {
    return server.replace('Era ', '#').replace('#Era', '');
  }
  fmt(n: number): string {
    return n >= 1e6 ? `${n / 1e6}M` : n >= 1e3 ? `${n / 1e3}k` : String(n);
  }
}
