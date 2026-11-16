import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';
import type { RosterAlliance, RosterPlayer, ServerRoster } from '@shared/models/event-data.model';
import { BigNumberPipe } from '@shared/pipes/big-number.pipe';

interface LeaderboardOptions {
  /** 'alliances' | 'players' — which roster list to render. Default 'players'. */
  show?: 'alliances' | 'players';
  /** when true, tints the card header as "us" (blue) vs "them" (red). */
  side?: 'us' | 'them';
}

/**
 * Scouting leaderboard — renders a ServerRoster's alliances or players using
 * the shared comparison-table look. One widget serves both "our" and "opponent"
 * rosters (the config picks the roster via `bind` and the list via options),
 * replacing the per-dashboard bespoke scouting tables.
 */
@Component({
  selector: 'app-leaderboard',
  imports: [TranslateModule, BigNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cmp-card">
      <div class="cmp-head" [class.us]="side() === 'us'" [class.them]="side() === 'them'">
        {{ heading() }}
      </div>
      @if (show() === 'alliances') {
        <table class="cmp-tbl cmp-tbl-wrap">
          <thead>
            <tr>
              <th class="c-rk">#</th>
              <th class="c-nm">{{ 'widget.leaderboard.alliance' | translate }}</th>
              <th class="c-p">{{ 'widget.leaderboard.power' | translate }}</th>
              <th class="c-cb">{{ 'widget.leaderboard.merits' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            @for (a of alliances(); track a.tag; let i = $index) {
              <tr>
                <td class="c-rk">{{ i + 1 }}</td>
                <td class="c-nm">{{ a.name }} <span class="tg">[{{ a.tag }}]</span></td>
                <td class="c-p">{{ a.power | bigNumber }}</td>
                <td class="c-cb">{{ a.merits | bigNumber }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <table class="cmp-tbl cmp-tbl-wrap">
          <thead>
            <tr>
              <th class="c-rk">#</th>
              <th class="c-nm">{{ 'widget.leaderboard.player' | translate }}</th>
              <th class="c-rk">{{ 'widget.leaderboard.tag' | translate }}</th>
              <th class="c-p">{{ 'widget.leaderboard.power' | translate }}</th>
              <th class="c-cb">{{ 'widget.leaderboard.merits' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            @for (p of players(); track p.rank) {
              <tr>
                <td class="c-rk">{{ p.rank }}</td>
                <td class="c-nm">{{ p.name }}</td>
                <td class="c-rk tg">{{ p.alliance }}</td>
                <td class="c-p">{{ p.power | bigNumber }}</td>
                <td class="c-cb">{{ p.merits | bigNumber }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
  styles: [':host { display: block; }'],
})
export class LeaderboardComponent {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  private readonly opts = computed<LeaderboardOptions>(() => (this.config().options as LeaderboardOptions) ?? {});
  private readonly roster = computed<ServerRoster | undefined>(() => this.data() as ServerRoster | undefined);

  readonly show = computed(() => this.opts().show ?? 'players');
  readonly side = computed(() => this.opts().side);
  readonly alliances = computed<RosterAlliance[]>(() => this.roster()?.alliances ?? []);
  readonly players = computed<RosterPlayer[]>(() => this.roster()?.players ?? []);
  readonly heading = computed(() => {
    const r = this.roster();
    if (!r) return '';
    return r.note ? `${r.server} — ${r.note}` : r.server;
  });
}
