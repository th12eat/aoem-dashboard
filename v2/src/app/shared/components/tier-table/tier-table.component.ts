import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';
import type { TierMatrix } from '@shared/models/event-data.model';

/**
 * Generic matrix renderer for a TierMatrix ({ labels, byServer }): servers as
 * rows, power brackets as columns, counts in cells. Highlights our server row.
 * Replaces per-dashboard bespoke "power tier" tables with one widget.
 *
 * options.ourServer (optional) marks the highlighted row; otherwise no row is
 * marked (the page can pass meta.ourServer).
 */
interface TierOptions {
  ourServer?: string;
}

@Component({
  selector: 'app-tier-table',
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (title()) {
      <h3 class="widget-title">{{ title()! | translate }}</h3>
    }
    <table class="points-table">
      <thead>
        <tr>
          <th>{{ 'widget.scoreboard.server' | translate }}</th>
          @for (label of matrix().labels; track label) {
            <th>{{ label }}</th>
          }
        </tr>
      </thead>
      <tbody>
        @for (server of servers(); track server) {
          <tr [class.is-ours]="server === ourServer()">
            <td class="name">{{ server }}</td>
            @for (count of matrix().byServer[server]; track $index) {
              <td>{{ count }}</td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      tr.is-ours td {
        background: rgba(var(--kvk-accent-rgb), 0.07);
      }
    `,
  ],
})
export class TierTableComponent {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  readonly title = computed(() => this.config().titleKey);
  readonly matrix = computed<TierMatrix>(
    () => (this.data() as TierMatrix | undefined) ?? { labels: [], byServer: {} },
  );
  readonly servers = computed(() => Object.keys(this.matrix().byServer));
  readonly ourServer = computed(() => (this.config().options as TierOptions)?.ourServer);
}
