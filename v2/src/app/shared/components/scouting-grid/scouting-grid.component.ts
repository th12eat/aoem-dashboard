import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';
import type { ResearchData, ServerRoster } from '@shared/models/event-data.model';
import { formatRoster } from '@shared/utils/numeric';

interface ScoutingOptions {
  /** 'alliances' (Top-4 total row + alliance M:P thresholds) or 'players'. */
  show?: 'alliances' | 'players';
}

interface Cell {
  rank: number | string;
  /** Primary name markup pieces. */
  name: string;
  tag: string;
  powerText: string;
  mpText: string;
  mpClass: '' | 'hi' | 'mid' | 'lo';
  isTotal?: boolean;
}

interface Card {
  server: string;
  display: string;
  color: string;
  rgb: string;
  isOurs: boolean;
  sdRank: number | null;
  priority?: string;
  rows: Cell[];
  empty: boolean;
}

/**
 * Full scouting grid (1.0 ResearchTab "Top Alliances" / "Top Players"): a card
 * per server — OURS first, then every opponent — each tinted by that server's
 * MAP-CORNER colour (data-driven from the roster's kingdom join; the corner,
 * and thus colour, changes per event). Columns match 1.0: # | Name[tag] |
 * Power (shorthand) | M:P% (merits÷power, green/amber/red). Alliance cards add
 * a Top-4 total row.
 *
 * M:P thresholds (verbatim 1.0): alliances hi≥8 / mid≥4 / lo; players hi≥65 /
 * mid≥35 / lo.
 */
@Component({
  selector: 'app-scouting-grid',
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cmp-grid">
      @for (card of cards(); track card.server) {
        <div class="cmp-card" [style.border-color]="'rgba(' + card.rgb + ',0.4)'">
          <div
            class="cmp-head"
            [style.background]="'rgba(' + card.rgb + ',0.12)'"
            [style.border-bottom-color]="'rgba(' + card.rgb + ',0.4)'"
            [style.color]="card.color"
          >
            <span>{{ card.display }}@if (card.isOurs) { · {{ 'common.us' | translate }} }</span>
            @if (card.sdRank !== null) {
              <span class="sg-sd">SD #{{ card.sdRank }}</span>
            }
            @if (card.priority && card.priority !== 'TBD') {
              <span class="sg-priority">{{ card.priority }}</span>
            }
          </div>
          @if (card.empty) {
            <div class="sg-empty">{{ 'widget.scouting.awaiting' | translate }}</div>
          } @else {
            <table class="cmp-tbl cmp-tbl-wrap">
              <thead>
                <tr>
                  <th class="c-rk">#</th>
                  <th class="c-nm"></th>
                  <th class="c-p">{{ 'widget.leaderboard.power' | translate }}</th>
                  <th class="c-mp">{{ 'widget.scouting.mp' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (row of card.rows; track $index) {
                  <tr [class.sg-total]="row.isTotal">
                    <td class="c-rk">{{ row.rank }}</td>
                    <td class="c-nm">{{ row.name }} <span class="tg">{{ row.tag }}</span></td>
                    <td class="c-p" [style.color]="card.color">{{ row.powerText }}</td>
                    <td class="c-mp" [class]="row.mpClass">{{ row.mpText }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .sg-sd {
        font-size: 10px;
        font-family: var(--font-ui);
        font-weight: 700;
        letter-spacing: 0.5px;
        color: #cbd5e1;
        background: rgba(255, 255, 255, 0.06);
        padding: 1px 6px;
        border-radius: 4px;
        margin-left: 8px;
      }
      .sg-priority {
        margin-left: auto;
        font-size: 9.5px;
        font-family: var(--font-ui);
        font-weight: 700;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: var(--accent-red);
      }
      .cmp-head {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .sg-empty {
        padding: 14px 12px;
        font-size: 12px;
        color: var(--text-muted);
        font-style: italic;
      }
      .sg-total td {
        border-top: 2px solid var(--border);
        font-weight: 700;
      }
    `,
  ],
})
export class ScoutingGridComponent {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  private readonly opts = computed<ScoutingOptions>(() => (this.config().options as ScoutingOptions) ?? {});
  readonly show = computed(() => this.opts().show ?? 'alliances');

  readonly cards = computed<Card[]>(() => {
    const research = this.data() as ResearchData | undefined;
    if (!research) return [];
    const rosters: ServerRoster[] = [research.ours, ...research.opponents];
    const players = this.show() === 'players';
    return rosters.map(r => this.buildCard(r, r === research.ours, players));
  });

  private buildCard(r: ServerRoster, isOurs: boolean, players: boolean): Card {
    const rows: Cell[] = players
      ? r.players.map(p => this.cell(p.rank, p.name, `[${p.alliance}]`, p.power.value, p.merits.value, true))
      : r.alliances.map((a, i) => this.cell(i + 1, a.name, `[${a.tag}]`, a.power.value, a.merits.value, false));

    if (!players && r.alliances.length) {
      const totPower = r.alliances.reduce((s, a) => s + (Number.isFinite(a.power.value) ? a.power.value : 0), 0);
      const totMerits = r.alliances.reduce((s, a) => s + (Number.isFinite(a.merits.value) ? a.merits.value : 0), 0);
      rows.push({ ...this.cell('', 'Top-4 Total', '', totPower, totMerits, false), isTotal: true });
    }

    return {
      server: r.server,
      display: r.display || r.server,
      color: r.color,
      rgb: r.rgb,
      isOurs,
      sdRank: r.sdRank,
      priority: r.priority,
      rows,
      empty: rows.length === 0,
    };
  }

  private cell(rank: number | string, name: string, tag: string, power: number, merits: number, player: boolean): Cell {
    const has = Number.isFinite(merits) && Number.isFinite(power) && power > 0;
    const pct = has ? (merits / power) * 100 : NaN;
    return {
      rank,
      name,
      tag,
      powerText: formatRoster(power),
      mpText: has ? `${pct.toFixed(1)}%` : '—',
      mpClass: has ? this.mpClass(pct, player) : '',
    };
  }

  private mpClass(pct: number, player: boolean): 'hi' | 'mid' | 'lo' {
    const [hi, mid] = player ? [65, 35] : [8, 4];
    if (pct >= hi) return 'hi';
    if (pct >= mid) return 'mid';
    return 'lo';
  }
}
