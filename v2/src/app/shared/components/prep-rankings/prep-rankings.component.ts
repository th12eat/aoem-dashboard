import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';
import type { PrepData, PrepRankingAlliance } from '@shared/models/event-data.model';

/** A rendered ranking row (merged us+opp, sorted, with teleport offset). */
interface RankRow {
  rank: number;
  tag: string;
  side: 'us' | 'opp';
  prepPoints: number;
  serverRank: number;
  /** Projected teleport offset label, e.g. "30' early" / "on time". */
  teleport: string;
}

/** Per-server-rank teleport offset in minutes (1-based): #1=30, #2=20, #3=10. */
const TP_OFFSET = [30, 20, 10];

/**
 * TME alliance rankings. Merges our + enemy alliances, sorts by prep points
 * desc, colour-codes rows (blue us / red them) and shows each alliance's
 * projected teleport offset from its per-server rank (#1 up to 30' early, #2
 * 20', #3 10', the rest on time). Binds to EventData.prep.
 */
@Component({
  selector: 'app-prep-rankings',
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pr-scroll">
      <table class="points-table pr">
        <thead>
          <tr>
            <th class="pr-rank">#</th>
            <th>Alliance</th>
            <th class="rt">Prep Pts</th>
            <th class="rt">Teleport</th>
          </tr>
        </thead>
        <tbody>
          @for (r of rows(); track r.tag) {
            <tr [attr.data-side]="r.side">
              <td class="pr-rank">{{ r.rank }}</td>
              <td class="pr-tag">{{ r.tag }}</td>
              <td class="rt">{{ r.prepPoints > 0 ? (r.prepPoints | number) : '—' }}</td>
              <td class="rt pr-tp">{{ r.teleport }}</td>
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
      .pr-scroll {
        overflow-x: auto;
      }
      .pr {
        width: 100%;
      }
      th.rt,
      td.rt {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      .pr-rank {
        width: 36px;
        text-align: center;
        color: var(--kvk-accent);
        font-weight: 700;
      }
      tr[data-side='us'] {
        border-left: 3px solid #60a5fa;
      }
      tr[data-side='opp'] {
        border-left: 3px solid #f87171;
      }
      tr[data-side='us'] .pr-tag,
      tr[data-side='us'] .pr-tp {
        color: #60a5fa;
      }
      tr[data-side='opp'] .pr-tag,
      tr[data-side='opp'] .pr-tp {
        color: #f87171;
      }
      .pr-tag {
        font-weight: 700;
      }
    `,
  ],
})
export class PrepRankingsComponent {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  private readonly prep = computed(() => (this.data() as PrepData | undefined) ?? null);

  readonly rows = computed<RankRow[]>(() => {
    const list = this.prep()?.rankings ?? [];
    return [...list]
      .sort((a, b) => b.prepPoints - a.prepPoints)
      .map((a: PrepRankingAlliance, i) => ({
        rank: i + 1,
        tag: a.tag,
        side: a.side,
        prepPoints: a.prepPoints,
        serverRank: a.serverRank,
        teleport: a.serverRank <= TP_OFFSET.length ? `${TP_OFFSET[a.serverRank - 1]}'` : `0'`,
      }));
  });
}
