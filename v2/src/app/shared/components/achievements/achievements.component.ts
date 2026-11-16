import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';
import type { EventData } from '@shared/models/event-data.model';

/** One achievement row (carried verbatim from 1.0 ACHIEVEMENTS). */
interface Achievement {
  name: string;
  req: string;
  /** Numeric target (for derive/numeric rows). */
  target?: number;
  /** Boolean (done/not-done) achievement. */
  bool?: boolean;
  /** Verbatim personal-reward text. */
  personal: string;
  /** How to derive current progress: 'flags' | 'pillars' | 'points'. */
  derive?: 'flags' | 'pillars' | 'points' | 'stronghold';
  /** Manual per-alliance override (wins over derive). */
  cur?: Record<string, number | boolean>;
}

interface AchievementsOptions {
  /** Alliance tags shown as columns, in order (e.g. ['eRa','REU','Myt','AuR']). */
  columns?: string[];
  achievements?: Achievement[];
}

/**
 * Conquest Achievements — Alliance Progress (1.0 PointsTab achievements table +
 * achievementCur() derive hooks). For each alliance column it shows ✓ (met,
 * green) / cur/target / — (no data), deriving live progress from EventData:
 *   • flags/pillars → high-water mark from placerGold (permanent once earned)
 *   • points        → alliancePoints for that tag
 *   • manual `cur`   → overrides the derive
 * Achievements + targets are authored verbatim in config.options.
 */
@Component({
  selector: 'app-achievements',
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (title()) {
      <h3 class="widget-title">{{ title()! | translate }}</h3>
    }
    <p class="ach-sub">{{ 'widget.achievements.sub' | translate }}</p>
    <div class="ach-scroll">
      <table class="points-table">
        <thead>
          <tr>
            <th>{{ 'widget.achievements.achievement' | translate }}</th>
            <th>{{ 'widget.achievements.requirement' | translate }}</th>
            @for (tag of columns(); track tag) {
              <th class="ctr">{{ tag }}</th>
            }
            <th>{{ 'widget.achievements.personal' | translate }}</th>
          </tr>
        </thead>
        <tbody>
          @for (a of achievements(); track a.name) {
            <tr>
              <td class="name">{{ a.name }}</td>
              <td class="ach-req">{{ reqLabel(a) }}</td>
              @for (tag of columns(); track tag) {
                @let cell = cellFor(a, tag);
                <td class="ctr" [class.ach-met]="cell.met" [class.ach-none]="cell.none">{{ cell.text }}</td>
              }
              <td class="ach-personal">{{ a.personal }}</td>
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
      .ach-sub {
        font-size: var(--fs-micro);
        color: var(--text-muted);
        line-height: 1.5;
        margin: 0 0 10px;
      }
      .ach-scroll {
        overflow-x: auto;
      }
      .ctr {
        text-align: center;
      }
      .ach-req {
        font-size: var(--fs-sub);
        color: var(--text-secondary);
      }
      .ach-personal {
        font-size: var(--fs-micro);
        color: var(--text-muted);
      }
      .ach-met {
        color: #3daa6d;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .ach-none {
        color: #475569;
      }
      td.ctr {
        font-variant-numeric: tabular-nums;
      }
    `,
  ],
})
export class AchievementsComponent {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  private readonly opts = computed<AchievementsOptions>(() => (this.config().options as AchievementsOptions) ?? {});
  readonly title = computed(() => this.config().titleKey);
  readonly columns = computed(() => this.opts().columns ?? []);
  readonly achievements = computed<Achievement[]>(() => this.opts().achievements ?? []);
  private readonly event = computed(() => this.data() as EventData | undefined);

  reqLabel(a: Achievement): string {
    if (a.bool || a.target == null) return a.req;
    if (a.target >= 1e6) return `${a.req} (${this.abbr(a.target)})`;
    if (a.target > 1) return `${a.req} (${a.target})`;
    return a.req;
  }

  cellFor(a: Achievement, tag: string): { text: string; met: boolean; none: boolean } {
    const cur = this.achievementCur(a, tag);
    if (cur == null) return { text: '—', met: false, none: true };
    if (a.bool) return cur ? { text: '✓', met: true, none: false } : { text: '—', met: false, none: true };
    const curN = Number(cur);
    const met = a.target != null && curN >= a.target;
    const label =
      a.target != null && a.target >= 1e6 ? `${this.abbr(curN)}/${this.abbr(a.target)}` : `${curN}/${a.target}`;
    return { text: (met ? '✓ ' : '') + label, met, none: false };
  }

  /** 1.0 achievementCur(): manual cur wins, else derive from live data. */
  private achievementCur(a: Achievement, tag: string): number | boolean | null {
    if (a.cur && a.cur[tag] != null) return a.cur[tag];
    if (a.derive) {
      const pg = this.event()?.placerGold.find(x => x.tag === tag);
      if (a.derive === 'flags') return Math.max(pg?.flags ?? 0, pg?.flagsPeak ?? 0);
      if (a.derive === 'pillars') return Math.max(pg?.pillarCities ?? 0, pg?.pillarsPeak ?? 0);
      if (a.derive === 'stronghold')
        return (pg?.flags ?? 0) > 0 || (pg?.flagsPeak ?? 0) > 0 || (pg?.gates ?? 0) > 0 || (pg?.pillarCities ?? 0) > 0 ? 1 : 0;
      if (a.derive === 'points') {
        const ap = this.event()?.alliancePoints.find(x => x.tag === tag);
        return ap && Number.isFinite(ap.points.value) ? ap.points.value : null;
      }
    }
    return a.cur ? (a.cur[tag] ?? null) : null;
  }

  private abbr(n: number): string {
    if (n >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(0) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
    return String(n);
  }
}
