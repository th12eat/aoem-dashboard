import { ChangeDetectionStrategy, Component, OnDestroy, computed, input, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';

interface TimelineStage {
  /** Verbatim stage label (e.g. "Zone 2 — Forts & Cities"). */
  label: string;
  /** Verbatim day label (e.g. "Day 1", "Day 2–5"). */
  dayLabel: string;
  /** ISO datetime this stage opens; used to compute the current stage. */
  startISO: string;
  /** Zone color for the dot/segment. */
  color?: string;
}

interface TimelineOptions {
  stages?: TimelineStage[];
}

/**
 * Event timeline (1.0 StageLine): a horizontal dot-and-line track of event
 * stages, each with a day label and verbatim stage label, with the current
 * stage's dot pulsing. Stages are authored verbatim in config.options (labels +
 * ISO starts + zone colors). Clock-driven via a 1-minute tick.
 */
@Component({
  selector: 'app-timeline',
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (title()) {
      <h3 class="widget-title">{{ title()! | translate }}</h3>
    }
    <div class="tl">
      @for (stage of stages(); track $index; let i = $index) {
        <div class="tl-node" [class.is-current]="i === currentIndex()">
          <div class="tl-dot" [class.sl-dot-pulse]="i === currentIndex()" [style.background]="stage.color ?? 'var(--kvk-accent)'"></div>
          <div class="tl-day">{{ stage.dayLabel }}</div>
          <div class="tl-label" [style.color]="i === currentIndex() ? (stage.color ?? 'var(--kvk-accent)') : null">
            {{ stage.label }}
          </div>
        </div>
        @if (!$last) {
          <div class="tl-line" [class.sl-line-active]="i === currentIndex()" [style.--seg]="stage.color ?? '#94a3b8'"></div>
        }
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .tl {
        display: flex;
        align-items: flex-start;
        gap: 0;
        overflow-x: auto;
        padding: 10px 4px 4px;
        scrollbar-width: none;
      }
      .tl::-webkit-scrollbar {
        display: none;
      }
      .tl-node {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        flex: 0 0 auto;
        width: 104px;
        text-align: center;
      }
      .tl-dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid var(--bg-deep);
      }
      .tl-day {
        font-family: var(--font-ui);
        font-size: var(--fs-micro);
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--text-muted);
      }
      .tl-label {
        font-family: var(--font-ui);
        font-size: var(--fs-label);
        color: var(--text-secondary);
        line-height: 1.2;
      }
      .tl-line {
        flex: 1 1 auto;
        min-width: 24px;
        height: 3px;
        margin-top: 6px;
        border-radius: 2px;
        background: #334155;
        align-self: flex-start;
      }
    `,
  ],
})
export class TimelineComponent implements OnDestroy {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  private readonly now = signal(Date.now());
  private readonly timer = setInterval(() => this.now.set(Date.now()), 60000);

  readonly title = computed(() => this.config().titleKey);
  readonly stages = computed<TimelineStage[]>(() => (this.config().options as TimelineOptions)?.stages ?? []);

  /** Index of the latest stage whose start has passed; -1 before the first. */
  readonly currentIndex = computed(() => {
    const t = this.now();
    let idx = -1;
    this.stages().forEach((s, i) => {
      const start = Date.parse(s.startISO);
      if (Number.isFinite(start) && t >= start) idx = i;
    });
    return idx;
  });

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }
}
