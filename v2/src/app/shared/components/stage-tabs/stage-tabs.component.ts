import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ClockService } from '@core/services/clock.service';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';
import type { EventMeta } from '@shared/models/event-data.model';

/** One stage tab's verbatim content (TME prep week). */
interface StageTab {
  /** Short tab label (e.g. "Stage 1" or "Matchmaking"). */
  label: string;
  /** Full stage title shown in the panel (e.g. "Forging Gear"). */
  title: string;
  /** Day offset from eventStart; the tab whose offset matches "today" is the
   * default-selected one. Matchmaking is negative, Invasion is beyond prep. */
  dayOffset: number;
  /** Amber buff-schedule note at the top (King's Rights), optional. */
  buff?: string;
  /** The "what to do / how to score today" list. */
  doList?: string[];
  /** Green, color-coded "prep ahead for the next stage" blurb, optional. */
  nextPrep?: string;
  /** For Matchmaking / Invasion tabs: a plain expectation blurb instead of a
   * do-list (what to expect / prep for Stage 1, or invasion-day guidance). */
  blurb?: string;
  /** Macro-phase label appended to the widget title when this tab is active
   * (e.g. "Matchmaking" / "Preparation Week" / "Invasion"). */
  macro?: string;
}

interface StageTabsOptions {
  tabs?: StageTab[];
}

/**
 * Stage-tabbed plan (TME). A row of tabs aligned to the prep-week stages; the
 * selected tab reveals that day's buff-schedule note, its do-list, and a
 * color-coded "prep ahead for next stage" blurb (Matchmaking/Invasion show an
 * expectation blurb). Defaults to the current day (clock + eventStart + each
 * tab's dayOffset). Content is authored VERBATIM in config.options. Binds to
 * `meta` for the event start date.
 */
@Component({
  selector: 'app-stage-tabs',
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (title()) {
      <h3 class="widget-title">{{ title()! | translate }}{{ macroSuffix() }}</h3>
    }
    <div class="stt">
      <div class="stt-tabs" role="tablist">
        @for (t of tabs(); track $index; let i = $index) {
          <button
            type="button"
            role="tab"
            class="stt-tab"
            [class.on]="i === selected()"
            [attr.aria-selected]="i === selected()"
            (click)="select(i)"
          >
            @if (i === currentIdx()) { <span class="stt-now" title="Current stage"></span> }
            <span class="stt-tab-lbl">{{ t.label }}</span>
          </button>
        }
      </div>

      @if (active(); as a) {
        <div class="stt-panel" role="tabpanel">
          <div class="stt-head">{{ panelTitle(a.title) }}</div>

          @if (a.buff) {
            <div class="stt-buff">👑 {{ a.buff }}</div>
          }

          @if (a.blurb) {
            <p class="stt-blurb">{{ a.blurb }}</p>
          }

          @if (a.doList && a.doList.length) {
            <ul class="stt-do">
              @for (d of a.doList; track $index) {
                <li>{{ d }}</li>
              }
            </ul>
          }

          @if (a.nextPrep) {
            <div class="stt-next">
              <span class="stt-next-k">↪ Prep ahead</span>
              <span class="stt-next-v">{{ a.nextPrep }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .widget-title {
        font-family: var(--font-display);
        font-size: var(--fs-h2);
        font-weight: 400;
        color: var(--kvk-accent);
        letter-spacing: 2px;
        padding: 0 0 6px;
        margin: 0 0 12px;
        border-bottom: 1px solid var(--border);
      }
      /* Tabs sit flush on top of the panel: centred, no gap, the active tab
         shares the panel's background + border and masks the seam below it. */
      .stt-tabs {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 2px;
        margin-bottom: -1px;
        position: relative;
        z-index: 1;
      }
      .stt-tab {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: var(--bg-card2);
        border: 1px solid var(--border);
        border-radius: 8px 8px 0 0;
        color: var(--text-secondary);
        padding: 8px 14px;
        font-weight: 700;
        font-size: var(--fs-label);
        cursor: pointer;
      }
      .stt-tab.on {
        color: var(--kvk-accent);
        background: var(--bg-card);
        border-bottom-color: var(--bg-card); /* erase the seam onto the panel */
      }
      .stt-now {
        display: inline-block;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #ef4444;
        box-shadow: 0 0 6px #ef4444;
        animation: sttNowBlink 1.2s ease-in-out infinite;
      }
      @keyframes sttNowBlink {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.25;
        }
      }
      .stt-panel {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 18px 16px 16px;
      }
      .stt-head {
        font-family: var(--font-display);
        font-size: var(--fs-h3, 18px);
        letter-spacing: 1px;
        color: var(--kvk-accent);
        margin-bottom: 10px;
      }
      .stt-buff {
        background: rgba(251, 191, 36, 0.08);
        border: 1px solid rgba(251, 191, 36, 0.3);
        border-radius: 8px;
        color: #fcd34d;
        padding: 8px 12px;
        font-size: var(--fs-label);
        line-height: 1.5;
        margin-bottom: 12px;
      }
      .stt-blurb {
        color: var(--text-secondary);
        line-height: 1.6;
        margin: 0 0 4px;
      }
      .stt-do {
        margin: 0 0 12px;
        padding-left: 18px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .stt-do li {
        color: var(--text-secondary);
        line-height: 1.5;
      }
      .stt-next {
        background: rgba(16, 185, 129, 0.08);
        border: 1px dashed rgba(52, 211, 153, 0.5);
        border-radius: 8px;
        padding: 10px 12px;
      }
      .stt-next-k {
        display: block;
        font-size: var(--fs-micro);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #34d399;
        margin-bottom: 3px;
        font-weight: 700;
      }
      .stt-next-v {
        color: #a7f3d0;
        line-height: 1.5;
      }
    `,
  ],
})
export class StageTabsComponent {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  private readonly clock = inject(ClockService);

  readonly title = computed(() => this.config().titleKey);
  readonly tabs = computed<StageTab[]>(() => (this.config().options as StageTabsOptions)?.tabs ?? []);
  /** " — <macro>" suffix for the widget title, reflecting the active tab's
   * macro phase (Matchmaking / Preparation Week / Invasion). Empty when the
   * active tab declares no macro. */
  readonly macroSuffix = computed(() => {
    const m = this.active()?.macro;
    return m ? ` — ${m}` : '';
  });

  /** Event start ms (from the bound meta). */
  private readonly startMs = computed(() => {
    const m = this.data() as EventMeta | undefined;
    return Date.parse(m?.eventStart ?? '');
  });

  /** Index of the tab matching "today" (by day offset from eventStart); the
   * closest tab at or before today, else the first. Drives the default + "now". */
  readonly currentIdx = computed(() => {
    const tabs = this.tabs();
    if (!tabs.length) return 0;
    const start = this.startMs();
    if (!Number.isFinite(start)) return 0;
    const dayNow = Math.floor((this.clock.now() - start) / 86400000);
    let idx = 0;
    tabs.forEach((t, i) => {
      if (dayNow >= t.dayOffset) idx = i;
    });
    return idx;
  });

  private readonly userSel = signal<number | null>(null);
  readonly selected = computed(() => this.userSel() ?? this.currentIdx());
  readonly active = computed<StageTab | null>(() => this.tabs()[this.selected()] ?? null);

  select(i: number): void {
    this.userSel.set(i);
  }

  /** Strip a leading "Stage N — " / "Stage N - " prefix from the panel heading
   * (the stage number already lives on its tab, so it's just clutter here). */
  panelTitle(title: string): string {
    return title.replace(/^Stage\s+\d+\s*[—-]\s*/u, '');
  }
}
