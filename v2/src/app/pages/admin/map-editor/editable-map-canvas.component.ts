import { ChangeDetectionStrategy, Component, ElementRef, computed, input, output, signal, viewChild } from '@angular/core';
import type { MapGeometry, MapNodeGeo, StrongholdView } from '@shared/models/map.model';
import { clientToUser, clampToViewBox, type Pt } from '@core/admin/svg-coords';

/** Node-type → marker fill, so the editor is legible before live state exists. */
const TYPE_COLOR: Record<string, string> = {
  gate: '#3d7cc4',
  city: '#c43d3d',
  altar: '#3daa6d',
  stronghold: '#d9b48a',
  tower: '#9a6dd4',
  aaru: '#f5d24a',
  anchor: '#64748b',
};

/** A route edge to draw in state mode. Endpoints are node ids; the parent
 * resolves owner colours (one or two, for candy-stripe) + visual flags. */
export interface CanvasEdge {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Base colour (owner 0, or severed grey). */
  color: string;
  /** Second owner's colour for a shared edge (candy-stripe), else null. */
  stripe: string | null;
  /** Dashed = pathing (still building) or severed. */
  dashed?: boolean;
  /** Pathing: animate the owner-colour dash (marching), matching the dashboard. */
  pathing?: boolean;
  siege?: boolean;
  severed?: boolean;
}

/**
 * The authoring canvas: the event underlay with the geometry overlaid.
 *
 * GEOMETRY ("Map Details") mode — developer-only, behind Unlock: drag/place/
 * select nodes + crests (emits move/place/nodeSelect).
 *
 * STATE mode — the live/plan editor: nodes colour by occupant; clicking a node
 * occupies it with the armed alliance (or toggles off); dragging node→node
 * draws a single edge (ghost line follows the cursor, drops on the target);
 * clicking an edge opens the parent's edit prompt. The parent owns all data and
 * applies the intents.
 */
@Component({
  selector: 'app-editable-map-canvas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ec-wrap">
      <img class="ec-underlay" [src]="geometry().underlayAsset" alt="" draggable="false" />
      <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
      <svg
        #svg
        class="ec-svg"
        [attr.viewBox]="geometry().viewBox"
        preserveAspectRatio="none"
        [class.placing]="placeMode()"
        (click)="onSvgClick($event)"
        (pointermove)="onPointerMove($event)"
      >
        @if (showBadges()) {
          @for (b of geometry().serverBadges; track b.server) {
            <g class="ec-badge" (pointerdown)="startDrag($event, 'badge', b.server)">
              <circle [attr.cx]="b.x" [attr.cy]="b.y" r="0.9" fill="none" stroke="#ffffff" stroke-width="0.3" stroke-dasharray="0.6 0.5" />
              <text [attr.x]="b.x" [attr.y]="b.y - 1.6" class="ec-badge-label" text-anchor="middle">{{ shortServer(b.server) }}</text>
            </g>
          }
        }
        @if (stateMode()) {
          <!-- route edges (candy-striped when shared), click to edit -->
          @for (e of edges(); track e.id) {
            @if (e.siege) {
              <line class="ec-edge-siege" [attr.x1]="e.x1" [attr.y1]="e.y1" [attr.x2]="e.x2" [attr.y2]="e.y2" />
            }
            <line
              class="ec-edge"
              [class.ec-edge-building]="e.pathing"
              [attr.x1]="e.x1"
              [attr.y1]="e.y1"
              [attr.x2]="e.x2"
              [attr.y2]="e.y2"
              [attr.stroke]="e.color"
              [attr.stroke-width]="e.pathing ? 0.65 : 0.5"
              [attr.stroke-dasharray]="e.severed ? '0.8 1.2' : e.pathing ? '1.6 1.1' : null"
              (click)="onEdgeClick($event, e.id)"
            />
            @if (e.stripe) {
              <line
                class="ec-edge-stripe"
                [attr.x1]="e.x1"
                [attr.y1]="e.y1"
                [attr.x2]="e.x2"
                [attr.y2]="e.y2"
                [attr.stroke]="e.stripe"
                stroke-dasharray="1 1"
              />
            }
          }
          <!-- ghost edge while dragging node→node -->
          @if (edgeDrag(); as g) {
            <line class="ec-ghost" [attr.x1]="g.x1" [attr.y1]="g.y1" [attr.x2]="g.x2" [attr.y2]="g.y2" />
          }
          <!-- strongholds (SH home / SSH forward) as rotated diamonds -->
          @for (s of strongholds(); track $index) {
            <rect
              class="ec-sh"
              [attr.x]="s.x - 0.95"
              [attr.y]="s.y - 0.95"
              width="1.9"
              height="1.9"
              [attr.fill]="s.color"
              [attr.stroke]="s.siege ? '#ef4444' : '#0a0c14'"
              [attr.transform]="'rotate(45 ' + s.x + ' ' + s.y + ')'"
            >
              <title>{{ s.kind === 'sh' ? 'Stronghold' : 'Sub-Stronghold' }} ({{ s.owner }})</title>
            </rect>
          }
        }
        <!-- nodes -->
        @for (n of geometry().nodes; track n.id) {
          <circle
            class="ec-node"
            [class.sel]="n.id === selectedId()"
            [attr.data-node-id]="n.id"
            [attr.cx]="n.x"
            [attr.cy]="n.y"
            [attr.r]="n.id === selectedId() ? 0.9 : 0.55"
            [attr.fill]="color(n)"
            [attr.stroke]="nodeStroke(n.id)"
            [attr.stroke-width]="nodeStrokeW(n.id)"
            [style.cursor]="stateMode() ? 'pointer' : geometryLocked() ? 'pointer' : 'grab'"
            (pointerdown)="onNodePointerDown($event, n.id)"
            (click)="onNodeClick($event, n.id)"
          >
            <title>{{ nodeTip(n) }}</title>
          </circle>
          @if (isSiege(n.id)) {
            <circle class="ec-siege" [attr.cx]="n.x" [attr.cy]="n.y" r="1.1" fill="none" />
          }
        }
      </svg>
      <div class="ec-readout">{{ readout() }}</div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .ec-wrap {
        position: relative;
        width: 100%;
        max-width: var(--map-max-width, 760px);
        margin: 0 auto;
        user-select: none;
      }
      .ec-underlay {
        width: 100%;
        display: block;
        border-radius: 10px;
        border: 1px solid #334155;
      }
      .ec-svg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }
      .ec-svg.placing {
        cursor: crosshair;
      }
      .ec-node {
        stroke: #0a0c14;
        stroke-width: 0.15;
      }
      .ec-node.sel {
        stroke: #fff;
        stroke-width: 0.4;
      }
      .ec-edge {
        stroke-width: 0.5;
        stroke-linecap: round;
        opacity: 0.9;
        cursor: pointer;
      }
      .ec-edge-building {
        animation: ecRouteFlow 1.1s linear infinite;
      }
      @keyframes ecRouteFlow {
        to {
          stroke-dashoffset: -2.7;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .ec-edge-building {
          animation: none;
        }
      }
      .ec-edge-stripe {
        stroke-width: 0.5;
        stroke-linecap: round;
        opacity: 0.9;
        pointer-events: none;
      }
      .ec-edge-siege {
        stroke: #ef4444;
        stroke-width: 1.1;
        opacity: 0.5;
        pointer-events: none;
      }
      .ec-ghost {
        stroke: #fbbf24;
        stroke-width: 0.5;
        stroke-dasharray: 0.8 0.8;
        pointer-events: none;
      }
      .ec-siege {
        stroke: #ef4444;
        stroke-width: 0.35;
        opacity: 0.9;
        pointer-events: none;
      }
      .ec-sh {
        stroke-width: 0.25;
        pointer-events: none;
      }
      .ec-badge {
        cursor: grab;
      }
      .ec-badge-label {
        font-family: var(--font-ui);
        font-size: 1.6px;
        fill: #fff;
      }
      .ec-readout {
        position: absolute;
        left: 8px;
        bottom: 8px;
        font-family: var(--font-mono);
        font-size: 11px;
        color: #cbd5e1;
        background: rgba(10, 12, 20, 0.7);
        padding: 2px 6px;
        border-radius: 4px;
        pointer-events: none;
      }
    `,
  ],
})
export class EditableMapCanvasComponent {
  readonly geometry = input.required<MapGeometry>();
  readonly selectedId = input<string | null>(null);
  readonly placeMode = input(false);
  readonly showBadges = input(false);
  readonly geometryLocked = input(false);
  readonly stateMode = input(false);
  /** node id → occupant colour (only occupied nodes present). */
  readonly occupantColor = input<Record<string, string>>({});
  readonly siegeIds = input<readonly string[]>([]);
  readonly edges = input<readonly CanvasEdge[]>([]);
  /** Positioned SH/SSH diamonds (from deriveMapView.strongholds). */
  readonly strongholds = input<readonly StrongholdView[]>([]);
  /** node id → tooltip status line (connected/inactive…), state mode only. */
  readonly nodeStatus = input<Record<string, string>>({});

  /** State mode: allow drag-to-draw an edge (only when the Select tool is on). */
  readonly allowDraw = input(false);

  readonly place = output<Pt>();
  readonly nodeSelect = output<string>();
  readonly move = output<{ kind: 'node' | 'badge'; id: string; pt: Pt }>();
  /** State mode: a plain tap on a node (no drag). Parent routes by active tool. */
  readonly nodeTap = output<string>();
  /** State mode: a drag from one node to another. */
  readonly edgeDraw = output<{ from: string; to: string }>();
  /** State mode: a tap on an existing edge. Parent routes by active tool. */
  readonly edgeTap = output<string>();

  private readonly svgRef = viewChild.required<ElementRef<SVGSVGElement>>('svg');
  private readonly drag = signal<{ kind: 'node' | 'badge'; id: string } | null>(null);
  private readonly cursor = signal<Pt | null>(null);
  // state-mode edge drag: the source node + a live ghost endpoint
  private readonly edgeFrom = signal<string | null>(null);
  private readonly ghostTo = signal<Pt | null>(null);
  private movedWhileDown = false;

  readonly readout = computed(() => {
    const c = this.cursor();
    return c ? `x ${c.x}  y ${c.y}` : '';
  });

  /** Ghost line from the edge-drag source to the cursor, if dragging. */
  readonly edgeDrag = computed<{ x1: number; y1: number; x2: number; y2: number } | null>(() => {
    const from = this.edgeFrom();
    const to = this.ghostTo();
    if (!from || !to) return null;
    const a = this.geometry().nodes.find(n => n.id === from);
    if (!a) return null;
    return { x1: a.x, y1: a.y, x2: to.x, y2: to.y };
  });

  private toUser(e: PointerEvent | MouseEvent): Pt {
    return clampToViewBox(clientToUser(this.svgRef().nativeElement, e.clientX, e.clientY), this.geometry().viewBox);
  }

  onPointerMove(e: PointerEvent): void {
    const pt = this.toUser(e);
    this.cursor.set(pt);
    const d = this.drag();
    if (d) {
      this.movedWhileDown = true;
      this.move.emit({ kind: d.kind, id: d.id, pt });
    }
    if (this.edgeFrom()) {
      this.movedWhileDown = true;
      this.ghostTo.set(pt);
    }
  }

  // ── geometry drag (nodes/crests) ────────────────────────────────────────────
  startDrag(e: PointerEvent, kind: 'node' | 'badge', id: string): void {
    e.stopPropagation();
    if (this.stateMode() || this.geometryLocked()) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    this.drag.set({ kind, id });
    const end = () => {
      this.drag.set(null);
      window.removeEventListener('pointerup', end);
    };
    window.addEventListener('pointerup', end);
  }

  // ── node pointer handling (geometry drag vs state edge-draw vs occupy) ───────
  onNodePointerDown(e: PointerEvent, id: string): void {
    this.movedWhileDown = false;
    if (this.stateMode()) {
      // Only arm an edge-draw when the Select tool permits drawing; otherwise a
      // node tap (siege/cut/info/occupy) is routed by the parent on (click).
      if (!this.allowDraw()) return;
      e.stopPropagation();
      // NB: do NOT setPointerCapture here — capture would redirect pointerup to
      // the source node, so we could never detect the drop TARGET. Instead we
      // listen on the window and hit-test what's under the cursor on release.
      this.edgeFrom.set(id);
      this.ghostTo.set(null);
      const onUp = (ev: PointerEvent) => {
        window.removeEventListener('pointerup', onUp);
        const from = this.edgeFrom();
        this.edgeFrom.set(null);
        this.ghostTo.set(null);
        if (!from || !this.movedWhileDown) return; // a plain click → handled by (click)
        const target = this.nodeUnderPoint(ev.clientX, ev.clientY);
        if (target && target !== from) this.edgeDraw.emit({ from, to: target });
      };
      window.addEventListener('pointerup', onUp);
      return;
    }
    this.startDrag(e, 'node', id);
  }

  /** The node id under a client point (for drop hit-testing), or null. */
  private nodeUnderPoint(clientX: number, clientY: number): string | null {
    const el = document.elementFromPoint(clientX, clientY) as Element | null;
    return el?.getAttribute('data-node-id') ?? null;
  }

  /** A plain click (no drag). Geometry → select; State → parent routes by tool. */
  onNodeClick(e: MouseEvent, id: string): void {
    e.stopPropagation();
    if (this.stateMode()) {
      if (!this.movedWhileDown) this.nodeTap.emit(id);
      return;
    }
    this.nodeSelect.emit(id);
  }

  onEdgeClick(e: MouseEvent, edgeId: string): void {
    e.stopPropagation();
    this.edgeTap.emit(edgeId);
  }

  /** Click on empty svg in place-mode adds a node at that point. */
  onSvgClick(e: MouseEvent): void {
    if (!this.placeMode()) return;
    this.place.emit(this.toUser(e));
  }

  color(n: MapNodeGeo): string {
    if (this.stateMode()) {
      return this.occupantColor()[n.id] ?? '#2c3444';
    }
    return TYPE_COLOR[n.type] ?? '#8a90a5';
  }
  nodeStroke(id: string): string {
    if (this.edgeFrom() === id) return '#fbbf24';
    return id === this.selectedId() ? '#fff' : '#0a0c14';
  }
  nodeStrokeW(id: string): number {
    if (this.edgeFrom() === id) return 0.5;
    return id === this.selectedId() ? 0.4 : 0.15;
  }
  isSiege(id: string): boolean {
    return this.stateMode() && this.siegeIds().includes(id);
  }
  nodeTip(n: MapNodeGeo): string {
    const status = this.stateMode() ? this.nodeStatus()[n.id] : '';
    return `${n.subtype || n.type} (${n.id})${status ? ' — ' + status : ''}`;
  }
  shortServer(s: string): string {
    return s.replace('Era ', '');
  }
}
