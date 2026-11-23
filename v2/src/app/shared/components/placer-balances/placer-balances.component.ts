import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';
import type { EventData } from '@shared/models/event-data.model';

interface Row {
  tag: string;
  pct: number;
  capped: boolean;
  balanceText: string;
  genPerHour: number;
  gates: number;
  pillars: number;
  flagsText: string;
}

/**
 * Placer Gold — Estimated Balances (1.0). Per alliance: a balance bar vs the
 * storage cap, generation/hour, and gate / pillar / flag counts. The COUNTS and
 * generation are derived from the live map (mapView.holdings — the single source
 * of truth), while the accrued balance + flags come from the tracked placer
 * data. Binds to the whole EventData.
 */
@Component({
  selector: 'app-placer-balances',
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pb-scroll">
      <table class="points-table">
        <thead>
          <tr>
            <th>{{ 'widget.placer.alliance' | translate }}</th>
            <th class="pb-bar-h">{{ 'widget.placer.balance' | translate }}</th>
            <th class="rt">{{ 'widget.placer.gen' | translate }}</th>
            <th class="ctr">{{ 'widget.placer.gates' | translate }}</th>
            <th class="ctr">{{ 'widget.placer.pillars' | translate }}</th>
            <th class="ctr">{{ 'widget.placer.flags' | translate }}</th>
          </tr>
        </thead>
        <tbody>
          @for (r of rows(); track r.tag) {
            <tr>
              <td class="name">{{ r.tag }}</td>
              <td>
                <div class="pb-bar">
                  <div class="pb-track">
                    <div class="pb-fill" [class.capped]="r.capped" [style.width.%]="r.pct"></div>
                  </div>
                  <span class="pb-val" [class.capped]="r.capped">{{ r.balanceText }}</span>
                </div>
              </td>
              <td class="rt" [style.color]="r.genPerHour > 0 ? '#3daa6d' : 'var(--text-muted)'">
                {{ r.genPerHour > 0 ? '+' + fmt(r.genPerHour) : '0' }}
              </td>
              <td class="ctr" [style.color]="r.gates ? 'var(--text-primary)' : 'var(--text-muted)'">{{ r.gates }}</td>
              <td class="ctr" [style.color]="r.pillars ? 'var(--kvk-accent)' : 'var(--text-muted)'" [style.font-weight]="r.pillars ? 600 : 400">{{ r.pillars }}</td>
              <td class="ctr" [style.color]="'var(--text-secondary)'">{{ r.flagsText }}</td>
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
      .pb-scroll {
        overflow-x: auto;
      }
      th.rt,
      td.rt {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      th.ctr,
      td.ctr {
        text-align: center;
      }
      .pb-bar-h {
        min-width: 160px;
      }
      .pb-bar {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .pb-track {
        flex: 1;
        height: 6px;
        background: #0f172a;
        border-radius: 3px;
        overflow: hidden;
      }
      .pb-fill {
        height: 100%;
        background: var(--kvk-accent);
        border-radius: 3px;
      }
      .pb-fill.capped {
        background: #ef4444;
      }
      .pb-val {
        font-size: 11px;
        font-variant-numeric: tabular-nums;
        color: var(--text-primary);
        min-width: 90px;
        text-align: right;
        white-space: nowrap;
      }
      .pb-val.capped {
        color: #ef4444;
      }
    `,
  ],
})
export class PlacerBalancesComponent {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  private readonly event = computed(() => this.data() as EventData | undefined);

  readonly rows = computed<Row[]>(() => {
    const d = this.event();
    if (!d) return [];
    const cap = d.placer.cap || 500000;
    const capTxt = `${Math.round(cap / 1000)}k`;
    // derived counts/gen from the map truth, keyed by alliance tag
    const holding = new Map(d.mapView?.holdings.map(h => [h.tag, h]) ?? []);
    return d.placer.alliances.map(a => {
      const h = holding.get(a.tag);
      const gen = h?.placerPerHour ?? 0;
      const gates = h?.gates ?? a.gates;
      const pillars = h?.cities ?? a.pillarCities;
      const has = a.current != null;
      const pct = has ? Math.min(100, Math.round((a.current! / cap) * 100)) : 0;
      const capped = has && a.current! >= cap;
      return {
        tag: a.tag,
        pct,
        capped,
        balanceText: has ? `${a.current!.toLocaleString()} / ${capTxt}` : `— / ${capTxt}`,
        genPerHour: gen,
        gates,
        pillars,
        flagsText: a.flags ? `${a.flags}${a.flagsBuilding ? ` (+${a.flagsBuilding})` : ''}` : '0',
      };
    });
  });

  fmt(n: number): string {
    return n >= 1e6 ? `${n / 1e6}M` : n >= 1e3 ? `${n / 1e3}k` : String(n);
  }
}
