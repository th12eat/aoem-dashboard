import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ClockService } from '@core/services/clock.service';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';

interface TimeWindow {
  /** Verbatim label, e.g. "19:00 – 20:00 UTC". */
  label: string;
  /** Window start minutes-from-UTC-midnight. */
  startMin: number;
  /** Window end minutes-from-UTC-midnight. */
  endMin: number;
}

interface ScheduleOptions {
  /** Verbatim intro text. */
  intro?: string;
  /** Daily recurring windows (UTC). */
  windows?: TimeWindow[];
  /** Verbatim footnote. */
  footnote?: string;
  /** Active date range (YYYY-MM-DD). Outside it, the widget shows a locked
   * state with the matching message instead of the windows. */
  startDate?: string;
  endDate?: string;
  /** Verbatim locked-before / locked-after messages. */
  lockedBefore?: string;
  lockedAfter?: string;
  /** Emoji shown in the locked state (e.g. ⚡ / 🐉). */
  lockGlyph?: string;
}

type WindowState = 'live' | 'next' | 'passed' | 'upcoming';

/**
 * Daily recurring event windows with live status (1.0 Storm Erosion / Storm
 * Incursion schedules). Each window shows LIVE / NEXT / passed based on the
 * current UTC time-of-day; the live one pulses and shows a countdown to close.
 * Windows + prose are authored verbatim in config.options. 1-second tick.
 */
@Component({
  selector: 'app-schedule-windows',
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (title()) {
      <h3 class="widget-title">{{ title()! | translate }}</h3>
    }
    @if (lockState(); as lock) {
      <div class="sw-locked">
        <div class="sw-lock-glyph">{{ lock.glyph }}🔒</div>
        <div class="sw-lock-msg">{{ lock.message }}</div>
      </div>
    } @else {
      @if (intro()) {
        <p class="sw-intro">{{ intro() }}</p>
      }
      <div class="sw-grid">
        @for (w of computedWindows(); track $index) {
          <div class="sw-slot" [class.is-live]="w.state === 'live'" [class.is-next]="w.state === 'next'" [class.is-passed]="w.state === 'passed'">
            <div class="sw-label">{{ w.label }}</div>
            <div class="sw-state">
              @switch (w.state) {
                @case ('live') {
                  <span class="sw-dot"></span>{{ 'widget.schedule.liveNow' | translate }} · {{ w.countdown }}
                }
                @case ('next') {
                  {{ 'widget.schedule.next' | translate }}
                }
                @case ('passed') {
                  {{ 'widget.schedule.passed' | translate }}
                }
                @default {
                  {{ 'widget.schedule.upcoming' | translate }}
                }
              }
            </div>
          </div>
        }
      </div>
      @if (footnote()) {
        <p class="sw-foot">{{ footnote() }}</p>
      }
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .sw-intro {
        color: var(--text-secondary);
        line-height: 1.55;
        margin: 0 0 12px;
      }
      .sw-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 10px;
      }
      .sw-slot {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 9px;
        padding: 12px 14px;
        text-align: center;
      }
      .sw-slot.is-passed {
        opacity: 0.5;
      }
      .sw-slot.is-next {
        border-color: var(--accent-blue-dim);
      }
      .sw-slot.is-live {
        border-color: var(--kvk-accent);
        box-shadow: 0 0 10px rgba(var(--kvk-accent-rgb), 0.4);
      }
      .sw-label {
        font-family: var(--font-ui);
        font-weight: 700;
        font-size: var(--fs-lead);
        color: var(--text-primary);
      }
      .sw-state {
        margin-top: 4px;
        font-family: var(--font-ui);
        font-size: var(--fs-micro);
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--text-muted);
      }
      .is-next .sw-state {
        color: var(--accent-blue);
      }
      .is-live .sw-state {
        color: var(--kvk-accent);
      }
      .sw-dot {
        display: inline-block;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--kvk-accent);
        margin-right: 5px;
        animation: tabNowPulse 1.4s ease-in-out infinite;
      }
      .sw-foot {
        color: var(--text-muted);
        font-size: var(--fs-sub);
        line-height: 1.5;
        margin: 10px 0 0;
      }
      .sw-locked {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 28px 16px;
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 9px;
        opacity: 0.75;
      }
      .sw-lock-glyph {
        font-size: 26px;
        filter: grayscale(0.4);
      }
      .sw-lock-msg {
        font-family: var(--font-ui);
        font-size: var(--fs-label);
        letter-spacing: 0.04em;
        color: var(--text-muted);
        text-align: center;
      }
    `,
  ],
})
export class ScheduleWindowsComponent {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  private readonly clock = inject(ClockService);
  private readonly now = this.clock.now;

  private readonly opts = computed<ScheduleOptions>(() => (this.config().options as ScheduleOptions) ?? {});
  readonly title = computed(() => this.config().titleKey);
  readonly intro = computed(() => this.opts().intro);
  readonly footnote = computed(() => this.opts().footnote);

  /** Locked before startDate / after endDate (1.0 lock overlay). */
  readonly lockState = computed<{ glyph: string; message: string } | null>(() => {
    const o = this.opts();
    if (!o.startDate && !o.endDate) return null;
    const today = new Date(this.now()).toISOString().slice(0, 10);
    const glyph = o.lockGlyph ?? '⚡';
    if (o.startDate && today < o.startDate) return { glyph, message: o.lockedBefore ?? '' };
    if (o.endDate && today > o.endDate) return { glyph, message: o.lockedAfter ?? '' };
    return null;
  });

  readonly computedWindows = computed(() => {
    const windows = this.opts().windows ?? [];
    const d = new Date(this.now());
    const nowMin = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;

    // The "next" window is the earliest one that hasn't started yet today.
    let nextIdx = -1;
    windows.forEach((w, i) => {
      if (nowMin < w.startMin && nextIdx === -1) nextIdx = i;
    });

    return windows.map((w, i) => {
      let state: WindowState;
      if (nowMin >= w.startMin && nowMin < w.endMin) state = 'live';
      else if (nowMin >= w.endMin) state = 'passed';
      else if (i === nextIdx) state = 'next';
      else state = 'upcoming';

      let countdown = '';
      if (state === 'live') {
        const msLeft = (w.endMin - nowMin) * 60000;
        const m = Math.floor(msLeft / 60000);
        const s = Math.floor((msLeft % 60000) / 1000);
        countdown = `${m}m ${s}s`;
      }
      return { label: w.label, state, countdown };
    });
  });
}
