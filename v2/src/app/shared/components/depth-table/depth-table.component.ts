import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';
import type { DepthMatrix } from '@shared/models/event-data.model';

/**
 * Generic matrix renderer for a DepthMatrix ({ ranks, byServer:{power,merits} }):
 * shows the power (or merit) value at each rank cut-off, per server. The metric
 * is chosen by options.metric. Numbers are shown verbatim (already in millions
 * in the source) with an "M" suffix. Replaces per-dashboard "roster depth"
 * tables with one widget.
 */
interface DepthOptions {
  metric?: 'power' | 'merits';
  ourServer?: string;
}

@Component({
  selector: 'app-depth-table',
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
          @for (rank of matrix().ranks; track rank) {
            <th>#{{ rank }}</th>
          }
        </tr>
      </thead>
      <tbody>
        @for (server of servers(); track server) {
          <tr [class.is-ours]="server === ourServer()">
            <td class="name">{{ server }}</td>
            @for (v of curve(server); track $index) {
              <td>{{ v }}M</td>
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
export class DepthTableComponent {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  private readonly opts = computed<DepthOptions>(() => (this.config().options as DepthOptions) ?? {});
  readonly title = computed(() => this.config().titleKey);
  readonly matrix = computed<DepthMatrix>(() => (this.data() as DepthMatrix | undefined) ?? { ranks: [], byServer: {} });
  readonly servers = computed(() => Object.keys(this.matrix().byServer));
  readonly metric = computed(() => this.opts().metric ?? 'power');
  readonly ourServer = computed(() => this.opts().ourServer);

  curve(server: string): number[] {
    const s = this.matrix().byServer[server];
    if (!s) return [];
    return this.metric() === 'merits' ? s.merits : s.power;
  }
}
