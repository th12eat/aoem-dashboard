import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';
import type { ResearchData, RosterAlliance, RosterPlayer, ServerRoster } from '@shared/models/event-data.model';
import { BigNumberPipe } from '@shared/pipes/big-number.pipe';

interface ScoutingOptions {
  /** 'alliances' (adds a Top-4 total row + M:P thresholds for alliances) or
   * 'players' (per-player M:P thresholds). Default 'alliances'. */
  show?: 'alliances' | 'players';
}

interface Card {
  server: string;
  isOurs: boolean;
  sdRank: number | null;
  priority?: string;
  note?: string;
  alliances: RosterAlliance[];
  players: RosterPlayer[];
  totalPower: number;
  totalMerits: number;
}

/**
 * Full scouting grid (1.0 ResearchTab "Top Alliances" / "Top Players"): a card
 * per server — OURS first, then every opponent — each with a ranked table,
 * M:P% colouring, and (for alliances) a Top-4 total row. Binds to the whole
 * `research` object so all four servers render, not just ours.
 *
 * M:P thresholds differ by list (matching 1.0): alliances hi≥8% / mid 4–8% /
 * lo<4%; players hi≥65% / mid 35–65% / lo<35%.
 */
@Component({
  selector: 'app-scouting-grid',
  imports: [TranslateModule, BigNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (title()) {
      <h3 class="widget-title">{{ title()! | translate }}</h3>
    }
    <div class="sg-grid">
      @for (card of cards(); track card.server) {
        <div class="cmp-card">
          <div class="cmp-head" [class.us]="card.isOurs">
            {{ card.server }}@if (card.isOurs) { · {{ 'common.us' | translate }} }
            @if (card.priority && card.priority !== 'TBD') {
              <span class="sg-priority">{{ card.priority }}</span>
            }
          </div>
          @if (show() === 'alliances') {
            <table class="cmp-tbl">
              <thead>
                <tr>
                  <th class="c-rk">#</th>
                  <th class="c-nm">{{ 'widget.leaderboard.alliance' | translate }}</th>
                  <th class="c-p">{{ 'widget.leaderboard.power' | translate }}</th>
                  <th class="c-mp">{{ 'widget.scouting.mp' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (a of card.alliances; track a.tag; let i = $index) {
                  <tr>
                    <td class="c-rk">{{ i + 1 }}</td>
                    <td class="c-nm">{{ a.name }} <span class="tg">[{{ a.tag }}]</span></td>
                    <td class="c-p">{{ a.power | bigNumber }}</td>
                    <td class="c-mp" [class]="mpClass(a.merits.value, a.power.value, 'alliance')">{{ mpPct(a.merits.value, a.power.value) }}</td>
                  </tr>
                }
                @if (card.alliances.length) {
                  <tr class="total">
                    <td class="c-rk"></td>
                    <td class="c-nm">{{ 'widget.scouting.top4' | translate }}</td>
                    <td class="c-p">{{ card.totalPower | bigNumber }}</td>
                    <td class="c-mp" [class]="mpClass(card.totalMerits, card.totalPower, 'alliance')">{{ mpPct(card.totalMerits, card.totalPower) }}</td>
                  </tr>
                } @else {
                  <tr><td colspan="4" class="sg-empty">{{ 'widget.scouting.awaiting' | translate }}</td></tr>
                }
              </tbody>
            </table>
          } @else {
            <table class="cmp-tbl">
              <thead>
                <tr>
                  <th class="c-rk">#</th>
                  <th class="c-nm">{{ 'widget.leaderboard.player' | translate }}</th>
                  <th class="c-p">{{ 'widget.leaderboard.power' | translate }}</th>
                  <th class="c-mp">{{ 'widget.scouting.mp' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (p of card.players; track p.rank) {
                  <tr>
                    <td class="c-rk">{{ p.rank }}</td>
                    <td class="c-nm">{{ p.name }} <span class="tg">[{{ p.alliance }}]</span></td>
                    <td class="c-p">{{ p.power | bigNumber }}</td>
                    <td class="c-mp" [class]="mpClass(p.merits.value, p.power.value, 'player')">{{ mpPct(p.merits.value, p.power.value) }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="4" class="sg-empty">{{ 'widget.scouting.awaiting' | translate }}</td></tr>
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
      .sg-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      @media (max-width: 760px) {
        .sg-grid {
          grid-template-columns: 1fr;
        }
      }
      .sg-priority {
        float: right;
        font-size: var(--fs-micro);
        letter-spacing: 0.06em;
        color: var(--accent-red);
      }
      .sg-empty {
        text-align: center;
        color: var(--text-muted);
        font-style: italic;
        padding: 14px;
      }
    `,
  ],
})
export class ScoutingGridComponent {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  private readonly opts = computed<ScoutingOptions>(() => (this.config().options as ScoutingOptions) ?? {});
  readonly title = computed(() => this.config().titleKey);
  readonly show = computed(() => this.opts().show ?? 'alliances');

  readonly cards = computed<Card[]>(() => {
    const research = this.data() as ResearchData | undefined;
    if (!research) return [];
    const rosters: ServerRoster[] = [research.ours, ...research.opponents];
    return rosters.map(r => {
      const totalPower = r.alliances.reduce((s, a) => s + (Number.isFinite(a.power.value) ? a.power.value : 0), 0);
      const totalMerits = r.alliances.reduce((s, a) => s + (Number.isFinite(a.merits.value) ? a.merits.value : 0), 0);
      return {
        server: r.server,
        isOurs: r === research.ours,
        sdRank: r.sdRank,
        priority: r.priority,
        note: r.note,
        alliances: r.alliances,
        players: r.players,
        totalPower,
        totalMerits,
      };
    });
  });

  mpPct(merits: number, power: number): string {
    if (!Number.isFinite(merits) || !Number.isFinite(power) || power <= 0) return '—';
    return `${Math.round((merits / power) * 100)}%`;
  }

  mpClass(merits: number, power: number, kind: 'alliance' | 'player'): string {
    if (!Number.isFinite(merits) || !Number.isFinite(power) || power <= 0) return '';
    const pct = (merits / power) * 100;
    const [hi, mid] = kind === 'alliance' ? [8, 4] : [65, 35];
    if (pct >= hi) return 'hi';
    if (pct >= mid) return 'mid';
    return 'lo';
  }
}
