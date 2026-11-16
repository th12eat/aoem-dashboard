import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';

/** A column in the escalating fight ladder (Open Field, Storm Erosion, …). */
interface RoeColumn {
  key: string;
  /** Verbatim column header. */
  label: string;
}

/** Per-server rules of engagement (carried verbatim from 1.0 DIPLOMACY_ROE). */
interface RoeRow {
  server: string;
  /** Accent colour for the server name (its map corner). */
  color?: string;
  ally?: boolean;
  neutral?: boolean;
  /** Per-column fight flags, keyed by RoeColumn.key. */
  fight?: Record<string, boolean>;
  /** Columns where we're explicitly allied (shown with 🤝). */
  allyCols?: string[];
}

interface RoeOptions {
  columns?: RoeColumn[];
  rows?: RoeRow[];
}

const GREEN = '#22c55e';
const RED = '#ef4444';
const GREY = '#9ca3af';
const ORANGE = '#f97316';
const YELLOW = '#facc15';

/**
 * Rules of Engagement table — the real 1.0 DiplomacyStatus. NOT a plain
 * relation table: it derives a stance chip (Ally / Neutral / Retaliate-only /
 * Cautious / Aggressive / Hostile) from how many of the escalating fight
 * columns are enabled, and renders a coloured ⚔️ / ✋ / 🤝 circle per column.
 * Data + column labels are carried verbatim in config.options.
 */
@Component({
  selector: 'app-roe-table',
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (title()) {
      <h3 class="widget-title">{{ title()! | translate }}</h3>
    }
    <div class="roe-scroll">
      <table class="roe-tbl">
        <thead>
          <tr>
            <th>{{ 'widget.roe.server' | translate }}</th>
            <th class="ctr">{{ 'widget.roe.stance' | translate }}</th>
            @for (c of columns(); track c.key) {
              <th class="ctr">{{ c.label }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.server) {
            @let st = stance(row);
            <tr>
              <td class="roe-srv" [style.color]="row.color ?? 'var(--text-primary)'">{{ row.server }}</td>
              <td class="ctr">
                <span
                  class="roe-chip"
                  [style.background]="st.color + '26'"
                  [style.color]="st.color"
                  [style.border]="'1px solid ' + st.color"
                  [title]="st.desc"
                  >{{ st.label }}</span
                >
              </td>
              @for (c of columns(); track c.key) {
                @let cell = cellFor(row, c.key);
                <td class="ctr">
                  <span
                    class="roe-dot"
                    [style.background]="cell.color"
                    [style.box-shadow]="'0 0 8px ' + cell.color + '99'"
                    [title]="cell.title"
                    >{{ cell.glyph }}</span
                  >
                </td>
              }
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
      .roe-scroll {
        overflow-x: auto;
      }
      .roe-tbl {
        width: 100%;
        min-width: 620px;
        border-collapse: collapse;
        font-size: var(--fs-label);
      }
      .roe-tbl th {
        font-family: var(--font-ui);
        font-size: var(--fs-micro);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-muted);
        text-align: left;
        padding: 8px;
        border-bottom: 1px solid var(--border);
      }
      .roe-tbl th.ctr {
        text-align: center;
      }
      .roe-tbl td {
        padding: 8px;
        border-bottom: 1px solid var(--border);
        color: var(--text-secondary);
      }
      .roe-tbl td.ctr {
        text-align: center;
      }
      .roe-tbl tr:last-child td {
        border-bottom: none;
      }
      .roe-srv {
        font-weight: 700;
        white-space: nowrap;
      }
      .roe-chip {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .roe-dot {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        font-size: 11px;
      }
    `,
  ],
})
export class RoeTableComponent {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  private readonly opts = computed<RoeOptions>(() => (this.config().options as RoeOptions) ?? {});
  readonly title = computed(() => this.config().titleKey);
  readonly columns = computed<RoeColumn[]>(() => this.opts().columns ?? []);
  readonly rows = computed<RoeRow[]>(() => this.opts().rows ?? []);

  /** Derive the stance chip from the fight-column count (verbatim 1.0 logic). */
  stance(row: RoeRow): { color: string; label: string; desc: string } {
    if (row.ally) return { color: GREEN, label: 'Ally', desc: 'Side with them everywhere' };
    if (row.neutral) return { color: GREY, label: 'Neutral', desc: 'No pact — avoid unprovoked engagements' };
    const cols = this.columns();
    const n = cols.filter(c => row.fight?.[c.key]).length;
    const total = cols.length || 1;
    if (n === 0) return { color: GREY, label: 'Retaliate only', desc: "Don't initiate — hit back only" };
    if (n === total) return { color: RED, label: 'Hostile', desc: 'Fight on all fronts' };
    if (n >= total / 2) return { color: ORANGE, label: 'Aggressive', desc: `Fight ${n}/${total} fronts` };
    return { color: YELLOW, label: 'Cautious', desc: `Fight ${n}/${total} fronts` };
  }

  cellFor(row: RoeRow, key: string): { color: string; glyph: string; title: string } {
    const allyCol = row.ally || (row.allyCols ?? []).includes(key);
    const fight = allyCol ? false : !!row.fight?.[key];
    if (allyCol) return { color: GREEN, glyph: '🤝', title: 'Ally' };
    if (fight) return { color: RED, glyph: '⚔️', title: 'Fight' };
    return { color: GREY, glyph: '✋', title: 'Leave alone / retaliate only' };
  }
}
