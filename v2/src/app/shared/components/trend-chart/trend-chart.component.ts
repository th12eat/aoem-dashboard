import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { plotTrend, type TrendSeries } from './trend-chart.geometry';

/**
 * A small inline-SVG multi-series line chart (v2 has no chart lib). Pure
 * presentational: feed it `series` + a y-formatter; it draws axes, gridlines,
 * polylines, markers and last-value labels. Used by the KvK History trend
 * panels (M:P over time; Power/Merits absolute vs %-growth).
 */
@Component({
  selector: 'app-trend-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (g(); as geo) {
      <figure class="tc">
        <svg [attr.viewBox]="'0 0 ' + geo.width + ' ' + geo.height" preserveAspectRatio="none" class="tc-svg">
          <!-- gridlines + y labels -->
          @for (t of geo.yTicks; track t.y) {
            <line class="tc-grid" [attr.x1]="geo.padL" [attr.y1]="t.y" [attr.x2]="geo.width - geo.padR" [attr.y2]="t.y" />
            <text class="tc-ylab" [attr.x]="geo.padL" [attr.y]="t.y - 0.6">{{ t.label }}</text>
          }
          @if (geo.zeroY !== null) {
            <line class="tc-zero" [attr.x1]="geo.padL" [attr.y1]="geo.zeroY" [attr.x2]="geo.width - geo.padR" [attr.y2]="geo.zeroY" />
          }
          <!-- series -->
          @for (s of geo.series; track s.label) {
            <polyline class="tc-line" [attr.points]="s.polyline" [attr.stroke]="s.color" />
            @for (d of s.dots; track $index) {
              <circle [attr.cx]="d.x" [attr.cy]="d.y" r="0.7" [attr.fill]="s.color" />
            }
            @if (s.last) {
              <text class="tc-last" [attr.x]="s.last.x + 1" [attr.y]="s.last.y" [attr.fill]="s.color">{{ fmtY()(s.last.value) }}</text>
            }
          }
          <!-- x labels -->
          @for (x of geo.xLabels; track $index) {
            <text class="tc-xlab" [attr.x]="x.x" [attr.y]="geo.height - 1.5" text-anchor="middle">{{ x.label }}</text>
          }
        </svg>
        <figcaption class="tc-legend">
          @for (s of series(); track s.label) {
            <span class="tc-key"><span class="tc-sw" [style.background]="s.color"></span>{{ s.label }}</span>
          }
        </figcaption>
      </figure>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .tc {
        margin: 0;
      }
      .tc-svg {
        width: 100%;
        height: auto;
        display: block;
        background: var(--bg-card2);
        border: 1px solid var(--border);
        border-radius: 8px;
      }
      .tc-grid {
        stroke: var(--border);
        stroke-width: 0.15;
      }
      .tc-zero {
        stroke: var(--text-muted);
        stroke-width: 0.25;
        stroke-dasharray: 0.8 0.8;
      }
      .tc-line {
        fill: none;
        stroke-width: 0.6;
        stroke-linejoin: round;
        stroke-linecap: round;
      }
      .tc-ylab {
        font-size: 2px;
        fill: var(--text-muted);
      }
      .tc-xlab {
        font-size: 1.8px;
        fill: var(--text-muted);
      }
      .tc-last {
        font-size: 2px;
        font-weight: 700;
      }
      .tc-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 6px;
        font-size: var(--fs-label);
        color: var(--text-secondary);
      }
      .tc-key {
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      .tc-sw {
        width: 12px;
        height: 3px;
        border-radius: 2px;
        display: inline-block;
      }
    `,
  ],
})
export class TrendChartComponent {
  readonly series = input.required<TrendSeries[]>();
  /** y-value formatter for ticks + last-value labels (e.g. "17.2B", "8.5%"). */
  readonly fmtY = input<(n: number) => string>((n: number) => String(Math.round(n)));

  readonly g = computed(() => plotTrend(this.series(), this.fmtY()));
}
