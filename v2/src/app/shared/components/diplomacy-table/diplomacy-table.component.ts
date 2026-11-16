import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';
import type { DiplomacyRow } from '@shared/models/event-data.model';

/**
 * Rules-of-engagement / diplomacy table. Binds to DiplomacyRow[]. Relation is
 * colour-coded (ally=green, neutral=gold, hostile=red) via a semantic class so
 * every event's diplomacy board reads the same.
 */
@Component({
  selector: 'app-diplomacy-table',
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (title()) {
      <h3 class="widget-title">{{ title()! | translate }}</h3>
    }
    <table class="rank-table">
      <thead>
        <tr>
          <th>{{ 'widget.diplomacy.server' | translate }}</th>
          <th>{{ 'widget.diplomacy.alliance' | translate }}</th>
          <th>{{ 'widget.diplomacy.relation' | translate }}</th>
          <th>{{ 'widget.diplomacy.notes' | translate }}</th>
        </tr>
      </thead>
      <tbody>
        @for (row of rows(); track row.id) {
          <tr>
            <td class="name">{{ row.server }}</td>
            <td class="tag">{{ row.alliance }}</td>
            <td>
              <span class="rel" [class]="'rel-' + relClass(row.relation)">{{ row.relation }}</span>
            </td>
            <td>{{ row.notes }}</td>
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
      .rel {
        font-family: var(--font-ui);
        font-size: var(--fs-micro);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        padding: 2px 8px;
        border-radius: 999px;
      }
      .rel-ally {
        color: var(--accent-green);
        background: rgba(61, 170, 109, 0.12);
      }
      .rel-neutral {
        color: var(--accent-gold);
        background: rgba(212, 168, 67, 0.12);
      }
      .rel-hostile {
        color: var(--accent-red);
        background: rgba(196, 61, 61, 0.12);
      }
    `,
  ],
})
export class DiplomacyTableComponent {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  readonly title = computed(() => this.config().titleKey);
  readonly rows = computed<DiplomacyRow[]>(() => (this.data() as DiplomacyRow[] | undefined) ?? []);

  relClass(relation: string): string {
    const r = relation.toLowerCase();
    if (r.includes('ally') || r.includes('friend') || r.includes('pact')) return 'ally';
    if (r.includes('hostile') || r.includes('enemy') || r.includes('target')) return 'hostile';
    return 'neutral';
  }
}
