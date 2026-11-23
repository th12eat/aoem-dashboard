import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { WidgetConfig } from '@shared/models/event-dashboard-config.model';
import type { AllianceHoldings, MapGeometry, MapNodeView, MapRoute, MapView } from '@shared/models/map.model';
import { dimHex } from '@shared/utils/numeric';

interface MapOptions {
  geometry?: MapGeometry;
}

const NEUTRAL = '#d9dde6';
/** Colour for an enemy-cut (severed) edge — broken grey, no owner candy-stripe. */
const SEVERED = '#6b7280';

interface RenderNode {
  id: string;
  cx: number;
  cy: number;
  r: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  siege: boolean;
  occupant: string | null;
  tip: string;
}

/**
 * A rendered edge as a candy-cane: a solid `base` line with a dashed `stripe`
 * overlay in a second colour. Static when the edge is established (two owners →
 * two-tone; one owner → no overlay). Animated (moving stripes) when pathing,
 * with the stripe colour white (mirrors the Event Timeline barber-pole).
 */
interface RenderEdge {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  base: string;
  stripe: string | null;
  strokeWidth: number;
  opacity: number;
  animated: boolean;
  /** Pathing (building): the base line itself is a marching owner-colour dash. */
  pathing: boolean;
  owners: string[];
  siege: boolean;
  severed: boolean;
}

/**
 * Interactive KvK map (1.0 MapOverlay) — a raster underlay with an SVG overlay
 * of territory routes + nodes. Reusable across events: all geometry comes from
 * options.geometry, all live ownership/sieges from the bound MapView (the
 * derived single source of truth).
 *
 * Interactions: hover a node/route to highlight that alliance (others dim);
 * click a node to pin the highlight; click a server corner to focus that
 * server; Live vs Plan toggle. Siege nodes/routes pulse red.
 */
@Component({
  selector: 'app-kvk-map',
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kvk-map.component.html',
  styleUrl: './kvk-map.component.scss',
})
export class KvkMapComponent {
  readonly config = input.required<WidgetConfig>();
  readonly data = input.required<unknown>();

  private readonly geometry = computed<MapGeometry | null>(() => (this.config().options as MapOptions)?.geometry ?? null);

  /** The widget binds to `mapViews: {live, plan}` (two full independent maps).
   * Back-compat: a bare MapView (older binding) is treated as the live view. */
  private readonly views = computed<{ live: MapView; plan: MapView } | null>(() => {
    const d = this.data() as { live?: MapView; plan?: MapView } | MapView | undefined;
    if (!d) return null;
    if ('live' in d && d.live) return { live: d.live, plan: d.plan ?? d.live };
    const single = d as MapView;
    return { live: single, plan: single };
  });
  /** Active view follows the Live/Plan toggle — each is a complete state. */
  private readonly view = computed<MapView | null>(() => {
    const vs = this.views();
    if (!vs) return null;
    return this.mode() === 'plan' ? vs.plan : vs.live;
  });

  readonly mode = signal<'live' | 'plan'>('live');
  /** Highlighted alliance (hover or pinned). */
  readonly hl = signal<string | null>(null);
  readonly pinned = signal(false);
  /** Focused server (click a corner crest). */
  readonly focus = signal<string | null>(null);

  readonly hasMap = computed(() => !!this.geometry() && !!this.view());
  readonly viewBox = computed(() => this.geometry()?.viewBox ?? '0 0 100 100');
  readonly underlay = computed(() => this.geometry()?.underlayAsset ?? '');
  readonly serverBadges = computed(() => this.geometry()?.serverBadges ?? []);
  readonly title = computed(() => this.config().titleKey);

  /** node id → view (for route endpoint lookup). */
  private readonly nodeById = computed(() => {
    const map = new Map<string, MapNodeView>();
    for (const n of this.view()?.nodes ?? []) map.set(n.id, n);
    return map;
  });

  /** alliance tag → holdings (server, flat colour, distinct shade). */
  private readonly holdingOf = computed(() => {
    const m = new Map<string, AllianceHoldings>();
    for (const h of this.view()?.holdings ?? []) m.set(h.tag, h);
    return m;
  });

  private outOfFocus(owner: string): boolean {
    const f = this.focus();
    return !!f && this.holdingOf().get(owner)?.server !== f;
  }
  /**
   * Colour for an owner's nodes/routes. When a server is focused, its alliances
   * break out into distinct shades; otherwise our alliances use their shade and
   * opponents render as their flat server colour (1.0 ownerColor behaviour).
   */
  private colorFor(owner: string): string {
    const h = this.holdingOf().get(owner);
    if (!h) return NEUTRAL;
    const focus = this.focus();
    if (focus && h.server === focus) return h.shade;
    return h.shade; // shades are distinct per alliance; keeps hover legible everywhere
  }

  /**
   * Rendered edges as candy-canes. Owners are aggregated per segment:
   *   • one owner, established  → solid alliance line (no stripe)
   *   • one owner, pathing      → alliance base + WHITE moving stripes
   *   • two owners, established → two-tone static candy-cane (both colours)
   *   • two owners, any pathing → first colour base + WHITE moving stripes
   * Siege flags the edge (red blink overlay, drawn separately). hl dims others.
   */
  readonly lines = computed<RenderEdge[]>(() => {
    const v = this.view();
    const nodes = this.nodeById();
    if (!v) return [];
    // Each view (live/plan) is now a FULL state — always read its actual web.
    const routes: MapRoute[] = v.routes.actual;
    const hl = this.hl();

    interface Edge {
      a: string;
      b: string;
      owners: string[];
      pathing: boolean;
      siege: boolean;
      severed: boolean;
    }
    const edges = new Map<string, Edge>();
    for (const r of routes) {
      if (r.noLine || this.outOfFocus(r.owner)) continue;
      const pathing = r.lifecycle === 'pathing' || !!r.building || !!r.partial;
      for (let k = 0; k < r.path.length - 1; k++) {
        const ak = r.path[k];
        const bk = r.path[k + 1];
        if (!nodes.get(ak) || !nodes.get(bk)) continue;
        const key = ak < bk ? `${ak}|${bk}` : `${bk}|${ak}`;
        const e = edges.get(key) ?? { a: ak, b: bk, owners: [], pathing: false, siege: false, severed: false };
        if (!e.owners.includes(r.owner)) e.owners.push(r.owner);
        if (pathing) e.pathing = true;
        if (r.siege) e.siege = true;
        if (r.severed) e.severed = true;
        edges.set(key, e);
      }
    }

    const out: RenderEdge[] = [];
    for (const [key, e] of edges) {
      const a = nodes.get(e.a)!;
      const b = nodes.get(e.b)!;
      // A severed (enemy-cut) edge renders broken grey with no candy-stripe.
      const base = e.severed ? SEVERED : this.colorFor(e.owners[0]);
      // Pathing (building) keeps the OWNER's colour as an animated marching
      // dash (v1.0 routeFlow) — far more legible than a white overlay. A shared
      // established edge still candy-stripes the 2nd owner's colour.
      let stripe: string | null = null;
      if (!e.severed && !e.pathing && e.owners.length > 1) stripe = this.colorFor(e.owners[1]);
      const dim = hl != null && !e.owners.includes(hl);
      out.push({
        key,
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        base,
        stripe,
        // pathing lines a touch thicker so small segments read clearly
        strokeWidth: (hl && e.owners.includes(hl) ? 1.3 : 0.9) * (e.pathing ? 1.25 : 1),
        opacity: e.severed ? 0.55 : dim ? 0.15 : 0.95,
        animated: e.pathing && !e.severed,
        pathing: e.pathing && !e.severed,
        owners: e.owners,
        siege: e.siege && !dim && !e.severed,
        severed: e.severed,
      });
    }
    return out;
  });

  /** Rendered strongholds (SH/SSH), dimmed when a highlight excludes the owner. */
  readonly strongholds = computed(() => {
    const v = this.view();
    const hl = this.hl();
    if (!v) return [];
    return v.strongholds
      .filter(s => !this.outOfFocus(s.owner))
      .map(s => ({ ...s, fade: !!hl && s.owner !== hl }));
  });

  /** Rendered nodes — each view (live/plan) is a full state with its own
   * occupancy. Plan omits live-siege pulses but otherwise renders identically. */
  readonly renderNodes = computed<RenderNode[]>(() => {
    const v = this.view();
    if (!v) return [];
    const hl = this.hl();
    const focus = this.focus();
    const plan = this.mode() === 'plan';
    return v.nodes
      .filter(n => n.type !== 'anchor')
      .map(n => {
        const occ = n.occupant && !this.outOfFocus(n.occupant) ? n.occupant : null;
        let fill: string;
        if (occ) fill = n.connected ? this.colorFor(occ) : dimHex(this.colorFor(occ), 0.42);
        else fill = n.active ? NEUTRAL : dimHex(NEUTRAL, 0.42);
        const fade = occ ? !!hl && occ !== hl : (!!hl && !focus) || this.outOfFocusNode(n);
        const siege = !plan && n.siege;
        const status = n.occupant
          ? `${n.occupant}${n.connected ? ' · connected' : ' · disconnected (no buff)'}`
          : n.active
            ? 'unoccupied'
            : 'inactive (not yet capturable)';
        return {
          id: n.id,
          cx: n.x,
          cy: n.y,
          r: n.type === 'aaru' ? 1.6 : 1.0,
          fill,
          stroke: siege ? '#ef4444' : '#0a0c14',
          strokeWidth: 0.3,
          opacity: fade ? 0.18 : 1,
          siege,
          occupant: occ,
          tip: `${n.label}${n.buff ? ' — ' + n.buff : ''} · ${status}${siege ? ' · UNDER SIEGE' : ''}`,
        };
      });
  });

  private outOfFocusNode(n: MapNodeView): boolean {
    return !!n.occupant && this.outOfFocus(n.occupant);
  }

  // ── legend ─────────────────────────────────────────────────────────────
  private readonly holdings = computed(() => this.view()?.holdings ?? []);
  readonly ourServer = computed(() => this.view()?.ourServer ?? '');

  /** Our alliances with their distinct shade, for the colour key. */
  readonly ourKey = computed(() =>
    this.holdings()
      .filter(h => h.server === this.ourServer())
      .map(h => ({ tag: h.tag, color: h.shade })),
  );
  /** Opponent servers (flat colour) — click to focus. */
  readonly serverKey = computed(() => {
    const ours = this.ourServer();
    const seen = new Set<string>();
    const out: { server: string; label: string; color: string }[] = [];
    for (const h of this.holdings()) {
      if (h.server === ours || !h.server || seen.has(h.server)) continue;
      seen.add(h.server);
      out.push({ server: h.server, label: h.server.replace('Era ', ''), color: h.color });
    }
    return out;
  });
  /** When a server is focused, its alliances broken out into shades + reset. */
  readonly focusKey = computed(() => {
    const f = this.focus();
    if (!f) return null;
    const alliances = this.holdings()
      .filter(h => h.server === f)
      .map(h => ({ tag: h.tag, color: h.shade }));
    return { server: f, color: this.holdings().find(h => h.server === f)?.color ?? NEUTRAL, alliances };
  });

  // ── interactions ─────────────────────────────────────────────────────────
  hoverOwner(owner: string | null): void {
    if (!this.pinned()) this.hl.set(owner);
  }
  clickNode(occupant: string | null): void {
    if (!occupant) return;
    if (this.pinned() && this.hl() === occupant) {
      this.pinned.set(false);
      this.hl.set(null);
    } else {
      this.pinned.set(true);
      this.hl.set(occupant);
    }
  }
  clickBadge(server: string): void {
    this.focus.set(this.focus() === server ? null : server);
  }
  setMode(m: 'live' | 'plan'): void {
    this.mode.set(m);
    if (m === 'plan') this.focus.set(null);
  }

  // ── zoom + pan ─────────────────────────────────────────────────────────────
  // CSS-transform zoom on the .map-view wrapper (img + svg scale together).
  // Pointer-drag pans; wheel/pinch zooms toward the cursor. Clamped 1×–5×.
  readonly zoom = signal(1);
  readonly panX = signal(0);
  readonly panY = signal(0);
  readonly transform = computed(() => `translate(${this.panX()}px, ${this.panY()}px) scale(${this.zoom()})`);

  private panning = false;
  private lastX = 0;
  private lastY = 0;
  // active touch points for pinch
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinchDist = 0;

  private clampPan(): void {
    // keep the scaled content from drifting too far off-box
    const z = this.zoom();
    const limit = 300 * (z - 1);
    this.panX.set(Math.max(-limit, Math.min(limit, this.panX())));
    this.panY.set(Math.max(-limit, Math.min(limit, this.panY())));
  }
  private setZoom(next: number): void {
    this.zoom.set(Math.max(1, Math.min(5, next)));
    if (this.zoom() === 1) {
      this.panX.set(0);
      this.panY.set(0);
    } else {
      this.clampPan();
    }
  }

  onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.setZoom(this.zoom() * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
  }
  onPanStart(e: PointerEvent): void {
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    } else if (this.zoom() > 1) {
      this.panning = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    }
  }
  onPanMove(e: PointerEvent): void {
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.pinchDist) this.setZoom(this.zoom() * (d / this.pinchDist));
      this.pinchDist = d;
      return;
    }
    if (!this.panning) return;
    this.panX.update(v => v + (e.clientX - this.lastX));
    this.panY.update(v => v + (e.clientY - this.lastY));
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.clampPan();
  }
  onPanEnd(e: PointerEvent): void {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinchDist = 0;
    if (this.pointers.size === 0) this.panning = false;
  }
  resetZoom(): void {
    this.setZoom(1);
  }
}
