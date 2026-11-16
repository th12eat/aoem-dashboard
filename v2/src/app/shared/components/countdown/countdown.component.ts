import { ChangeDetectionStrategy, Component, OnDestroy, computed, input, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';
import type { EventMeta } from '@shared/models/event-data.model';

/**
 * Event countdown + stage indicator, driven by EventData.meta. Shows the
 * Start | End window and a live days/hours/min/sec countdown to the next
 * milestone (event start, then event end). After the end date it flips to
 * "Event Complete". Mirrors the 1.0 event-header.js behaviour but as a
 * data-bound Angular widget.
 *
 * Binds to `meta` (an EventMeta). Deterministic clock via a 1s signal tick.
 */
@Component({
  selector: 'app-countdown',
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cd">
      <div class="cd-window">
        <div class="cd-cell">
          <div class="cd-k">{{ 'widget.countdown.start' | translate }}</div>
          <div class="cd-v">{{ meta().eventStart }}</div>
        </div>
        <div class="cd-sep">→</div>
        <div class="cd-cell">
          <div class="cd-k">{{ 'widget.countdown.end' | translate }}</div>
          <div class="cd-v">{{ meta().eventEnd }}</div>
        </div>
      </div>
      <div class="cd-stage" [class.live-pulse]="phase() === 'running'">
        @switch (phase()) {
          @case ('before') {
            {{ 'widget.countdown.startsIn' | translate }} <strong>{{ remainingLabel() }}</strong>
          }
          @case ('running') {
            {{ 'widget.countdown.endsIn' | translate }} <strong>{{ remainingLabel() }}</strong>
          }
          @case ('over') {
            {{ 'widget.countdown.complete' | translate }}
          }
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .cd {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        margin: 4px 0 20px;
      }
      .cd-window {
        display: inline-flex;
        align-items: center;
        gap: 16px;
        background: rgba(var(--kvk-accent-rgb), 0.1);
        border: 1px solid var(--kvk-accent-dim);
        border-radius: 8px;
        padding: 8px 22px;
      }
      .cd-cell {
        text-align: center;
      }
      .cd-k {
        font-family: var(--font-ui);
        font-size: var(--fs-micro);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--text-muted);
      }
      .cd-v {
        font-family: var(--font-ui);
        font-size: var(--fs-lead);
        color: var(--text-primary);
      }
      .cd-sep {
        color: var(--kvk-accent);
      }
      .cd-stage {
        font-family: var(--font-ui);
        font-size: var(--fs-label);
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--text-secondary);
        padding: 6px 14px;
      }
      .cd-stage strong {
        color: var(--kvk-accent);
      }
    `,
  ],
})
export class CountdownComponent implements OnDestroy {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  /** 1s heartbeat; recomputes the countdown. */
  private readonly now = signal(Date.now());
  private readonly timer = setInterval(() => this.now.set(Date.now()), 1000);

  readonly meta = computed<EventMeta>(
    () =>
      (this.data() as EventMeta | undefined) ?? {
        eventStart: '',
        eventEnd: '',
        servers: [],
        ourServer: '',
        ourAlliances: [],
        corners: {},
        notes: '',
        eventOver: false,
      },
  );

  private readonly startMs = computed(() => Date.parse(this.meta().eventStart));
  private readonly endMs = computed(() => Date.parse(this.meta().eventEnd));

  readonly phase = computed<'before' | 'running' | 'over'>(() => {
    const t = this.now();
    if (this.meta().eventOver) return 'over';
    if (Number.isFinite(this.startMs()) && t < this.startMs()) return 'before';
    if (Number.isFinite(this.endMs()) && t >= this.endMs()) return 'over';
    return 'running';
  });

  readonly remainingLabel = computed(() => {
    const target = this.phase() === 'before' ? this.startMs() : this.endMs();
    if (!Number.isFinite(target)) return '—';
    const ms = Math.max(0, target - this.now());
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${d}d ${h}h ${m}m ${s}s`;
  });

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }
}
