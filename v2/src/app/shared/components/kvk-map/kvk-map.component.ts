import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';

/** A labelled point on the map (coords in the viewBox space). */
interface MapNode {
  id: string;
  cx: number;
  cy: number;
  r?: number;
  fill?: string;
  /** i18n key for the node label; optional. */
  labelKey?: string;
}

/** A directed/undirected connector between two coordinates. */
interface MapRoute {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  dashed?: boolean;
}

interface MapOptions {
  /** SVG viewBox, e.g. "0 0 100 100". */
  viewBox?: string;
  /** Optional raster underlay (relative to app base), e.g. Desolate's stitched map. */
  underlayAsset?: string;
  nodes?: MapNode[];
  routes?: MapRoute[];
}

/**
 * One SVG map widget for all events. Geometry (viewBox, nodes, routes, optional
 * raster underlay) is declared in config.options — proven general enough for a
 * pure-SVG map (Stormlands) and a raster-underlay map (Desolate) without
 * per-event component code. Live overlays (sieges, captured nodes) will later
 * come through `data` (mapState); for now the static schema renders the board.
 */
@Component({
  selector: 'app-kvk-map',
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (title()) {
      <h3 class="widget-title">{{ title()! | translate }}</h3>
    }
    <div class="map-wrap">
      <svg [attr.viewBox]="viewBox()" preserveAspectRatio="xMidYMid meet" class="map-svg">
        @if (underlay()) {
          <image [attr.href]="underlay()" x="0" y="0" width="100" height="100" opacity="0.6" />
        }
        @for (route of routes(); track $index) {
          <line
            [attr.x1]="route.x1"
            [attr.y1]="route.y1"
            [attr.x2]="route.x2"
            [attr.y2]="route.y2"
            [attr.stroke]="route.color ?? 'var(--kvk-accent)'"
            [attr.stroke-dasharray]="route.dashed ? '3 2' : null"
            stroke-width="0.6"
          />
        }
        @for (node of nodes(); track node.id) {
          <circle
            [attr.cx]="node.cx"
            [attr.cy]="node.cy"
            [attr.r]="node.r ?? 2.4"
            [attr.fill]="node.fill ?? 'var(--kvk-accent)'"
          />
          @if (node.labelKey) {
            <text [attr.x]="node.cx" [attr.y]="node.cy - 3.2" class="map-label" text-anchor="middle">
              {{ node.labelKey | translate }}
            </text>
          }
        }
      </svg>
      @if (nodes().length === 0 && !underlay()) {
        <p class="map-empty">{{ 'widget.map.empty' | translate }}</p>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .map-wrap {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 9px;
        padding: 10px;
      }
      .map-svg {
        width: 100%;
        height: auto;
        display: block;
      }
      .map-label {
        font-family: var(--font-ui);
        font-size: 3px;
        fill: var(--text-secondary);
      }
      .map-empty {
        text-align: center;
        color: var(--text-muted);
        font-size: var(--fs-label);
        padding: 20px;
      }
    `,
  ],
})
export class KvkMapComponent {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  private readonly opts = computed<MapOptions>(() => (this.config().options as MapOptions) ?? {});
  readonly title = computed(() => this.config().titleKey);
  readonly viewBox = computed(() => this.opts().viewBox ?? '0 0 100 100');
  readonly underlay = computed(() => this.opts().underlayAsset);
  readonly nodes = computed<MapNode[]>(() => this.opts().nodes ?? []);
  readonly routes = computed<MapRoute[]>(() => this.opts().routes ?? []);
}
