import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ClockService } from '@core/services/clock.service';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';
import type { EventMeta } from '@shared/models/event-data.model';

/** A zone band — a contiguous run of stages sharing a colour + label. */
interface TimelineZone {
  id: string;
  /** Verbatim band label (e.g. "Zone 1"). */
  label: string;
  /** Reached/current colour. */
  bright: string;
  /** Not-yet-reached colour. */
  dark: string;
}

interface TimelineStage {
  /** Verbatim stage label (e.g. "Zone 2 — Forts & Cities"). */
  label: string;
  /** Verbatim day label (e.g. "Day 2–5"). */
  dayLabel: string;
  /** Zone id (keys into `zones`). */
  zone: string;
  /** Days from the event's eventStart at which this stage opens (data-driven:
   * no hardcoded dates — resolved against the live meta.eventStart). */
  dayOffset: number;
}

interface TimelineOptions {
  zones?: TimelineZone[];
  stages?: TimelineStage[];
}

/**
 * Event timeline (1.0 StageLine) — a zone-banded dot-and-line track:
 *   • a zone-label row, each label centred on its zone's span, bright once
 *     reached and dark before;
 *   • per-node dots coloured bright (reached) / dark (future), the current node
 *     pulsing;
 *   • connecting lines bright up to the current node; the segment LEAVING the
 *     current node runs a barber-pole animation (white over the zone colour).
 *
 * Fully data-driven: stage dates are computed from the bound meta.eventStart +
 * each stage's dayOffset, so a new occurrence needs only new dates in its data.
 */
@Component({
  selector: 'app-timeline',
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (title()) {
      <h3 class="widget-title">{{ title()! | translate }}</h3>
    }
    <div class="sl">
      <!-- zone labels, centred on each zone's span midpoint -->
      <div class="sl-zones">
        @for (run of zoneRuns(); track run.firstIdx) {
          <span
            class="sl-zone"
            [style.left.%]="run.centerPct"
            [style.color]="run.reached ? run.bright : run.dark"
            >{{ run.label }}</span
          >
        }
      </div>
      <!-- dots + connecting lines -->
      <div class="sl-track">
        @for (n of nodes(); track n.idx) {
          <div class="sl-node">
            @if (!n.isLast) {
              <div
                class="sl-line"
                [class.sl-line-active]="n.lineActive"
                [style.background]="n.lineActive ? null : n.lineColor"
                [style.--seg]="n.bright"
              ></div>
            }
            <div
              class="sl-dot"
              [class.sl-dot-pulse]="n.isCurrent"
              [style.background]="n.dotColor"
              [style.border-color]="n.dotColor"
            ></div>
            <div class="sl-day" [style.color]="n.labelColor">{{ n.dayLabel }}</div>
            <div class="sl-label" [style.color]="n.textColor">{{ n.label }}</div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .sl-zones {
        position: relative;
        height: 18px;
        margin-bottom: 6px;
      }
      .sl-zone {
        position: absolute;
        transform: translateX(-50%);
        font-family: var(--font-ui);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 1px;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .sl-track {
        display: flex;
        align-items: flex-start;
        gap: 0;
      }
      .sl-node {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        position: relative;
      }
      .sl-line {
        position: absolute;
        top: 7px;
        left: 50%;
        width: 100%;
        height: 3px;
      }
      .sl-dot {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid;
        position: relative;
        z-index: 2;
      }
      .sl-day {
        font-size: 10px;
        font-weight: 700;
        margin-top: 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .sl-label {
        font-size: 11px;
        margin-top: 2px;
        line-height: 1.25;
        padding: 0 4px;
      }
    `,
  ],
})
export class TimelineComponent {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  private readonly clock = inject(ClockService);
  private readonly now = this.clock.now;

  readonly title = computed(() => this.config().titleKey);
  private readonly opts = computed<TimelineOptions>(() => (this.config().options as TimelineOptions) ?? {});
  private readonly zones = computed(() => {
    const map = new Map<string, TimelineZone>();
    for (const z of this.opts().zones ?? []) map.set(z.id, z);
    return map;
  });
  private readonly stages = computed<TimelineStage[]>(() => this.opts().stages ?? []);

  /** eventStart (ms) from the bound meta — the anchor for all stage dates. */
  private readonly startMs = computed(() => Date.parse((this.data() as EventMeta | undefined)?.eventStart ?? ''));

  private stageStartMs(s: TimelineStage): number {
    return Number.isFinite(this.startMs()) ? this.startMs() + s.dayOffset * 86400000 : NaN;
  }

  /** Index of the latest stage whose start has passed; -1 before the first. */
  private readonly currentIndex = computed(() => {
    const t = this.now();
    let idx = -1;
    this.stages().forEach((s, i) => {
      const ms = this.stageStartMs(s);
      if (Number.isFinite(ms) && t >= ms) idx = i;
    });
    return idx;
  });

  /** Per-node render model (colours, current flag, active line). */
  readonly nodes = computed(() => {
    const cur = this.currentIndex();
    const stages = this.stages();
    const zones = this.zones();
    return stages.map((s, i) => {
      const z = zones.get(s.zone) ?? { bright: '#475569', dark: '#334155', label: '', id: s.zone };
      const reached = cur >= 0 && i <= cur;
      const isCurrent = i === cur;
      return {
        idx: i,
        dayLabel: s.dayLabel,
        label: s.label,
        bright: z.bright,
        isLast: i === stages.length - 1,
        isCurrent,
        dotColor: reached ? z.bright : z.dark,
        lineColor: cur >= i ? z.bright : z.dark,
        lineActive: i === cur && i < stages.length - 1,
        labelColor: reached ? z.bright : z.dark,
        textColor: isCurrent ? '#e8eaf0' : reached ? '#94a3b8' : '#64748b',
      };
    });
  });

  /** Contiguous zone runs, each positioned at its span midpoint. */
  readonly zoneRuns = computed(() => {
    const stages = this.stages();
    const zones = this.zones();
    const cur = this.currentIndex();
    const n = stages.length || 1;
    const dotPct = (i: number) => ((i + 0.5) / n) * 100;
    const runs: { zone: string; firstIdx: number; lastIdx: number }[] = [];
    stages.forEach((s, i) => {
      const last = runs[runs.length - 1];
      if (last && last.zone === s.zone) last.lastIdx = i;
      else runs.push({ zone: s.zone, firstIdx: i, lastIdx: i });
    });
    return runs.map(r => {
      const z = zones.get(r.zone) ?? { bright: '#475569', dark: '#334155', label: '', id: r.zone };
      return {
        firstIdx: r.firstIdx,
        label: z.label,
        bright: z.bright,
        dark: z.dark,
        reached: cur >= r.firstIdx,
        centerPct: (dotPct(r.firstIdx) + dotPct(Math.min(r.lastIdx + 1, n - 1))) / 2,
      };
    });
  });
}
