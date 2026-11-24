import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';
import type { PrepData, PrepStage } from '@shared/models/event-data.model';

/** A single tug row ready to render (percent split + the display state). */
interface TugRow {
  label: string;
  ours: number;
  opp: number;
  uPct: number;
  oPct: number;
  /** Visual state: live/current, a past stage (dimmed), a future stage (greyed),
   * the always-on total, or the placeholder row for the stage shown up top. */
  state: 'live' | 'past' | 'future' | 'total' | 'placeholder';
  /** Us won this stage (ours ≥ opp) — tints the centre label. */
  won: boolean;
  /** No points yet (tied 50:50 split, neutral centre label). */
  pending: boolean;
}

/**
 * Prep-war tug chart (TME PrepChart, 1.0). The persistent bar above the tabs:
 * the CURRENT stage's us-vs-opponent tug on top, a running TOTAL tug below a
 * divider, and an expand toggle that reveals every stage in order (past dimmed,
 * future greyed). Blue = us, red = opponent, each a darkening gradient — the
 * exact 1.0 fills. Binds to EventData.prep.
 */
@Component({
  selector: 'app-prep-tug',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (prep(); as p) {
      <div class="pt">
        <!-- points line -->
        <div class="pt-points">
          <span><span class="sw us"></span> {{ p.ourLabel }}: <strong>{{ p.totalOurs }}B</strong></span>
          <span><span class="sw opp"></span> {{ p.oppLabel }}: <strong>{{ p.totalOpp }}B</strong></span>
        </div>

        <!-- current stage (or Stage 1 greyed before start) -->
        @if (current(); as c) {
          <div class="pt-tug" [attr.data-state]="c.state">
            <div class="pt-tug-head">
              <span class="pt-us" [class.muted]="c.pending">{{ c.ours }}B <span class="pt-side">US</span></span>
              <span class="pt-mid" [class.won]="c.won && !c.pending" [class.lost]="!c.won && !c.pending">
                {{ c.label }}@if (c.state === 'live') { · Live }
              </span>
              <span class="pt-opp" [class.muted]="c.pending"><span class="pt-side">{{ p.oppLabel }}</span> {{ c.opp }}B</span>
            </div>
            <div class="pt-bar">
              <div class="seg us" [style.width.%]="c.uPct"></div>
              <div class="seg opp" [style.width.%]="c.oPct"></div>
            </div>
          </div>
        }

        <!-- expand toggle -->
        @if (p.stages.length > 1) {
          <button type="button" class="pt-toggle" (click)="toggle()">
            <span class="pt-caret" [class.open]="expanded()">▸</span>
            {{ expanded() ? 'Hide stages' : 'Show all ' + p.stages.length + ' stages' }}
          </button>
        }

        <!-- all stages (past dimmed, future greyed); the current one is a placeholder -->
        @if (expanded()) {
          @for (s of allStages(); track $index) {
            <div class="pt-tug" [attr.data-state]="s.state">
              @if (s.state === 'placeholder') {
                <div class="pt-tug-head">
                  <span class="pt-mid muted">{{ s.label }}</span>
                </div>
                <div class="pt-placeholder">↑ shown above</div>
              } @else {
                <div class="pt-tug-head">
                  <span class="pt-us" [class.muted]="s.pending || s.state === 'future'">{{ s.ours }}B <span class="pt-side">US</span></span>
                  <span class="pt-mid" [class.won]="s.won && !s.pending && s.state !== 'future'" [class.lost]="!s.won && !s.pending && s.state !== 'future'">{{ s.label }}</span>
                  <span class="pt-opp" [class.muted]="s.pending || s.state === 'future'"><span class="pt-side">{{ p.oppLabel }}</span> {{ s.opp }}B</span>
                </div>
                <div class="pt-bar">
                  <div class="seg us" [style.width.%]="s.uPct"></div>
                  <div class="seg opp" [style.width.%]="s.oPct"></div>
                </div>
              }
            </div>
          }
        }

        <!-- running total -->
        <div class="pt-total">
          <div class="pt-tug" data-state="total">
            <div class="pt-tug-head">
              <span class="pt-us">{{ total().ours }}B <span class="pt-side">US</span></span>
              <span class="pt-mid strong">Total</span>
              <span class="pt-opp"><span class="pt-side">{{ p.oppLabel }}</span> {{ total().opp }}B</span>
            </div>
            <div class="pt-bar">
              <div class="seg us" [style.width.%]="total().uPct"></div>
              <div class="seg opp" [style.width.%]="total().oPct"></div>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        max-width: var(--w-content);
        margin: 0 auto 10px;
      }
      .pt-points {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 12px;
        color: var(--text-secondary);
      }
      .pt-points strong {
        color: var(--text-primary);
        font-variant-numeric: tabular-nums;
      }
      .sw {
        display: inline-block;
        width: 9px;
        height: 9px;
        border-radius: 2px;
      }
      .sw.us {
        background: #5b8def;
      }
      .sw.opp {
        background: #f87171;
      }
      .pt-tug {
        margin-bottom: 12px;
      }
      .pt-tug[data-state='future'] {
        opacity: 0.4;
      }
      .pt-tug[data-state='past'] {
        opacity: 0.68;
      }
      .pt-tug-head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 4px;
      }
      .pt-us {
        color: #5b8def;
      }
      .pt-opp {
        color: #f87171;
      }
      .pt-us.muted,
      .pt-opp.muted {
        color: var(--text-muted);
      }
      .pt-side {
        font-size: 11px;
        font-weight: 600;
        color: var(--text-muted);
      }
      .pt-mid {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: var(--text-muted);
      }
      .pt-mid.won {
        color: #4ade80;
      }
      .pt-mid.lost {
        color: #f87171;
      }
      .pt-mid.strong {
        color: var(--kvk-accent);
        font-weight: 800;
      }
      .pt-bar {
        display: flex;
        height: 22px;
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid #1e2435;
      }
      .seg.us {
        background: linear-gradient(90deg, rgba(61, 124, 196, 0.55), rgba(91, 141, 239, 0.85));
      }
      .seg.opp {
        background: linear-gradient(90deg, rgba(196, 61, 61, 0.85), rgba(196, 61, 61, 0.55));
      }
      .pt-tug[data-state='future'] .seg.us {
        background: #232a3a;
      }
      .pt-tug[data-state='future'] .seg.opp {
        background: #2a2230;
      }
      .pt-placeholder {
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px dashed var(--border);
        border-radius: 6px;
        font-size: 10px;
        letter-spacing: 1px;
        text-transform: uppercase;
        color: var(--text-muted);
      }
      .pt-toggle {
        display: flex;
        align-items: center;
        gap: 6px;
        width: 100%;
        justify-content: center;
        background: none;
        border: none;
        cursor: pointer;
        color: var(--text-muted);
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 1px;
        text-transform: uppercase;
        padding: 2px 0 8px;
      }
      .pt-caret {
        display: inline-block;
        transition: transform 0.15s;
      }
      .pt-caret.open {
        transform: rotate(90deg);
      }
      .pt-total {
        border-top: 1px solid var(--border);
        margin-top: 2px;
        padding-top: 12px;
      }
      .pt-total .pt-tug {
        margin-bottom: 0;
      }
    `,
  ],
})
export class PrepTugComponent {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  readonly prep = computed(() => (this.data() as PrepData | undefined) ?? null);

  /** Index of the live/current stage: the highest-index stage with any points,
   * else 0 (so Stage 1 shows greyed before the event starts). */
  private readonly liveIdx = computed(() => {
    const p = this.prep();
    if (!p) return -1;
    let idx = -1;
    p.stages.forEach((s, i) => {
      if (s.ours > 0 || s.opp > 0) idx = i;
    });
    return idx;
  });

  readonly expanded = signal(false);
  toggle(): void {
    this.expanded.update(v => !v);
  }

  private tug(s: PrepStage, state: TugRow['state']): TugRow {
    const pending = s.ours === 0 && s.opp === 0;
    const sum = s.ours + s.opp || 1;
    return {
      label: s.label,
      ours: s.ours,
      opp: s.opp,
      uPct: pending ? 50 : (s.ours / sum) * 100,
      oPct: pending ? 50 : (s.opp / sum) * 100,
      state,
      won: s.ours >= s.opp,
      pending,
    };
  }

  /** The always-visible current stage (live when any points exist, else Stage 1
   * shown greyed as the coming stage). */
  readonly current = computed<TugRow | null>(() => {
    const p = this.prep();
    if (!p || !p.stages.length) return null;
    const live = this.liveIdx();
    const idx = live >= 0 ? live : 0;
    return this.tug(p.stages[idx], live >= 0 ? 'live' : 'future');
  });

  /** All stages for the expanded list: the current one is a placeholder row,
   * earlier stages 'past' (dimmed), later stages 'future' (greyed). */
  readonly allStages = computed<TugRow[]>(() => {
    const p = this.prep();
    if (!p) return [];
    const live = this.liveIdx();
    const top = live >= 0 ? live : 0;
    return p.stages.map((s, i) => {
      if (i === top) return { ...this.tug(s, 'placeholder'), label: s.label };
      return this.tug(s, i < top ? 'past' : 'future');
    });
  });

  /** The running total tug. */
  readonly total = computed<TugRow>(() => {
    const p = this.prep();
    const o = p?.totalOurs ?? 0;
    const e = p?.totalOpp ?? 0;
    return this.tug({ label: 'Total', ours: o, opp: e }, 'total');
  });
}
