import { ChangeDetectionStrategy, Component, ElementRef, computed, input, output, signal, viewChild } from '@angular/core';
import {
  IMPERIAL_CITY_GEOMETRY as GEO,
  IC_GATE_IDS,
  icNode,
  nearestGate,
  type IcNode,
} from '../../../configs/imperial-city.geo';
import {
  type InvasionPlan,
  type InvasionSide,
  type InvasionArrow,
  type InvasionLeader,
  type LeaderRole,
  type TeleportQuarter,
  emptyInvasionPlan,
} from '@shared/models/invasion-plan.model';

/** Editor tool (editable mode only). `none` = read/hover. */
export type IcTool = 'none' | 'rally' | 'siege' | 'arrow' | 'hazard' | 'teleport' | 'erase';

/** An alliance with its assigned marker colour (from the editor legend). */
export interface IcAlliance {
  tag: string;
  color: string;
}

interface PtXY {
  x: number;
  y: number;
}

/** Perpendicular spacing (user units) between fanned parallel march lines. */
const PARALLEL_GAP = 22;

/** Parse an SVG points string "x,y x,y …" → [[x,y],…]. */
function parsePoly(s: string): number[][] {
  return s
    .trim()
    .split(/\s+/)
    .map(p => p.split(',').map(Number));
}

/** Ray-cast point-in-polygon. */
function inPoly(x: number, y: number, poly: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const hit = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

/** Area-weighted centroid of a polygon (the shoelace centroid). Falls back to
 * the vertex mean for a degenerate (zero-area) polygon. */
function polygonCentroid(poly: number[][]): { x: number; y: number } {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const cross = xj * yi - xi * yj;
    a += cross;
    cx += (xi + xj) * cross;
    cy += (yi + yj) * cross;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-6) {
    const n = poly.length || 1;
    return { x: poly.reduce((s, p) => s + p[0], 0) / n, y: poly.reduce((s, p) => s + p[1], 0) / n };
  }
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

/** Clip a convex-ish half-plane out of a polygon (Sutherland–Hodgman against a
 * single edge). `keep(p)` returns true for points to retain; `isect` finds the
 * crossing of segment a→b with the clip line. Used to carve a quarter wedge. */
function clipHalfPlane(
  poly: number[][],
  keep: (p: number[]) => boolean,
  isect: (a: number[], b: number[]) => number[],
): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ain = keep(a);
    const bin = keep(b);
    if (ain) out.push(a);
    if (ain !== bin) out.push(isect(a, b));
  }
  return out;
}

/** Carve one quarter wedge from a tile polygon: the set of tile points on the
 * chosen side of BOTH axes through the centroid. `wantWest`/`wantNorth` pick the
 * quarter. Returns the clipped sub-polygon's point string (may be empty). */
function quarterWedge(poly: number[][], c: { x: number; y: number }, wantWest: boolean, wantNorth: boolean): string {
  // vertical split at c.x
  let p = clipHalfPlane(
    poly,
    pt => (wantWest ? pt[0] <= c.x : pt[0] >= c.x),
    (a, b) => {
      const t = (c.x - a[0]) / (b[0] - a[0]);
      return [c.x, a[1] + t * (b[1] - a[1])];
    },
  );
  if (!p.length) return '';
  // horizontal split at c.y
  p = clipHalfPlane(
    p,
    pt => (wantNorth ? pt[1] <= c.y : pt[1] >= c.y),
    (a, b) => {
      const t = (c.y - a[1]) / (b[1] - a[1]);
      return [a[0] + t * (b[0] - a[0]), c.y];
    },
  );
  return p.map(pt => `${Math.round(pt[0] * 10) / 10},${Math.round(pt[1] * 10) / 10}`).join(' ');
}

/**
 * Imperial City invasion-PLAN map. A pure-vector battlefield (two halves, the
 * walled courtyard with four gate roads, nine nodes) that re-colours + flips by
 * attack side, and overlays a strategist's plan: rally/siege leaders, their
 * march lines (rally solid, siege dashed + animated, IC routed through the
 * nearest gate), siege-hazard markers, and teleport-quarter tints.
 *
 * Two modes:
 *   • read-only (dashboard): draw the plan, hover tooltips, zoom/pan.
 *   • editable (data editor): a `tool` + `armed` alliance drive click/drag edits;
 *     every edit emits a fully-updated InvasionPlan via (planChange) — the host
 *     owns persistence, this component owns the geometry math.
 */
@Component({
  selector: 'app-ic-invasion-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ic-invasion-map.component.html',
  styleUrl: './ic-invasion-map.component.scss',
})
export class IcInvasionMapComponent {
  // ── inputs ────────────────────────────────────────────────────────────────
  readonly plan = input<InvasionPlan>(emptyInvasionPlan());
  /** Resolved side (attacker holds blue/left, defender holds red/right). */
  readonly side = input<InvasionSide>('attack');
  /** Our alliances + their legend colours (index-assigned amber/teal/violet/lime). */
  readonly alliances = input<IcAlliance[]>([]);
  readonly editable = input(false);
  /** Active editor tool (editable only). */
  readonly tool = input<IcTool>('none');
  /** Armed alliance tag for place/teleport tools (editable only). */
  readonly armedTag = input<string | null>(null);

  // ── outputs ───────────────────────────────────────────────────────────────
  readonly planChange = output<InvasionPlan>();

  readonly geo = GEO;
  readonly gateIds = IC_GATE_IDS;

  // ── zoom / pan ──────────────────────────────────────────────────────────────
  readonly zoom = signal(1);
  readonly panX = signal(0);
  readonly panY = signal(0);
  private readonly svgRef = viewChild<ElementRef<SVGSVGElement>>('svg');
  private readonly sceneRef = viewChild<ElementRef<SVGGElement>>('scene');

  /** viewBox numbers (minX minY w h). */
  readonly vb = computed(() => GEO.viewBox.split(/\s+/).map(Number));

  readonly sceneTransform = computed(() => {
    const [minX, minY, w, h] = this.vb();
    // zoom about the viewBox centre, then pan (pan is in user units).
    const cx = minX + w / 2;
    const cy = minY + h / 2;
    const z = this.zoom();
    return `translate(${this.panX()} ${this.panY()}) translate(${cx} ${cy}) scale(${z}) translate(${-cx} ${-cy})`;
  });

  // ── which zone is ours (blue) vs theirs (red) ──────────────────────────────
  /** Attacker = left zone (blue). Defender = right zone (blue is still US, so on
   * defence our blue tint moves to the right zone and red to the left). */
  readonly ourZonePoly = computed(() => (this.side() === 'attack' ? GEO.zoneLeft : GEO.zoneRight));
  readonly theirZonePoly = computed(() => (this.side() === 'attack' ? GEO.zoneRight : GEO.zoneLeft));

  /** Our tile parsed to points + its area-centroid (for quarter wedges + the
   * placement constraint). Recomputed only when the side flips. */
  private readonly ourPoly = computed(() => parsePoly(this.ourZonePoly()));
  private readonly ourCentroid = computed(() => polygonCentroid(this.ourPoly()));

  // ── colour lookup for an alliance tag ──────────────────────────────────────
  private readonly colorByTag = computed(() => {
    const m = new Map<string, string>();
    for (const a of this.alliances()) m.set(a.tag, a.color);
    return m;
  });
  colorFor(tag: string): string {
    return this.colorByTag().get(tag) ?? '#9ca3af';
  }

  // ── nodes (render model) ────────────────────────────────────────────────────
  readonly nodes = computed(() => GEO.nodes);

  /** Gate marker radius in user units. */
  readonly gateR = 30;
  readonly leaderR = 30;
  readonly hazardR = 34;

  // ── leaders ─────────────────────────────────────────────────────────────────
  readonly leaders = computed(() => this.plan().leaders ?? []);

  // ── arrows (resolved to concrete geometry, IC routed through nearest gate) ──
  readonly arrowPaths = computed(() => {
    const arrows = this.plan().arrows ?? [];
    // Group arrows that converge on the SAME target (node id, or a rounded free
    // point) AND the same role, so e.g. all four alliances marching through one
    // gate to the IC get fanned out perpendicular instead of drawn on top of one
    // another. Offset index is assigned within each group.
    const groupKey = (a: InvasionArrow) => `${a.role}|${a.toNode ?? `${Math.round((a.to?.x ?? 0) / 20)},${Math.round((a.to?.y ?? 0) / 20)}`}`;
    const groups = new Map<string, number>();
    const seq = new Map<InvasionArrow, number>();
    const counts = new Map<string, number>();
    for (const a of arrows) counts.set(groupKey(a), (counts.get(groupKey(a)) ?? 0) + 1);
    for (const a of arrows) {
      const k = groupKey(a);
      const i = groups.get(k) ?? 0;
      seq.set(a, i);
      groups.set(k, i + 1);
    }

    const out: { tag: string; role: LeaderRole; color: string; d: string; siege: boolean }[] = [];
    for (const a of arrows) {
      const target = this.resolveArrowTarget(a);
      if (!target) continue;
      const k = groupKey(a);
      const n = counts.get(k) ?? 1;
      // Centre the fan: offsets like -1.5,-0.5,0.5,1.5 × spacing for n=4.
      const idx = seq.get(a) ?? 0;
      const offset = n > 1 ? (idx - (n - 1) / 2) * PARALLEL_GAP : 0;
      out.push({
        tag: a.tag,
        role: a.role,
        color: this.colorFor(a.tag),
        d: this.buildArrowPath(a.from, target, a.toNode, offset),
        siege: a.role === 'siege',
      });
    }
    return out;
  });

  /** Where an arrow points: a node centre or a free point. */
  private resolveArrowTarget(a: InvasionArrow): PtXY | null {
    if (a.toNode) {
      const n = icNode(a.toNode);
      return n ? { x: n.x, y: n.y } : null;
    }
    return a.to ?? null;
  }

  /** Build the march path. If the target is the walled Imperial City, bend the
   * line through the gate nearest the SOURCE (can't hop the wall). `offset` fans
   * converging lines apart: each segment is shifted perpendicular to its own
   * direction so parallel marches stay individually legible. */
  private buildArrowPath(from: PtXY, target: PtXY, toNode: string | undefined, offset: number): string {
    const waypoints: PtXY[] = toNode === 'imperial-city' ? [from, nearestGate(from), target] : [from, target];
    if (!offset) return 'M ' + waypoints.map(p => `${p.x} ${p.y}`).join(' L ');
    // Shift each segment sideways by `offset` along its own normal; join at the
    // shifted endpoints (good enough for the short, few-segment marches here).
    const shifted: PtXY[] = waypoints.map((p, i) => {
      // use the direction of the segment this point leads into (or the previous
      // one for the last point) to pick a stable normal.
      const a = waypoints[Math.min(i, waypoints.length - 2)];
      const b = waypoints[Math.min(i + 1, waypoints.length - 1)];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      return { x: p.x + nx * offset, y: p.y + ny * offset };
    });
    return 'M ' + shifted.map(p => `${Math.round(p.x)} ${Math.round(p.y)}`).join(' L ');
  }

  // ── teleport quarters (real tile wedges, split by area from the centroid) ──
  readonly teleportWedges = computed(() => {
    const poly = this.ourPoly();
    const c = this.ourCentroid();
    const out: { tag: string; color: string; points: string }[] = [];
    for (const t of this.plan().teleport ?? []) {
      const west = t.quarter === 'NW' || t.quarter === 'SW';
      const north = t.quarter === 'NW' || t.quarter === 'NE';
      const points = quarterWedge(poly, c, west, north);
      if (points) out.push({ tag: t.tag, color: this.colorFor(t.tag), points });
    }
    return out;
  });

  readonly hazards = computed(() => this.plan().hazards ?? []);

  // ── hover tooltip ───────────────────────────────────────────────────────────
  readonly hover = signal<{ x: number; y: number; label: string } | null>(null);
  showNode(n: IcNode): void {
    const buff = n.buff ? ` · +${n.buff}` : '';
    const occ = n.occupiable ? '' : ' · destroy to pass';
    this.hover.set({ x: n.x, y: n.y - (n.r ?? this.gateR) - 14, label: `${n.label}${buff}${occ}` });
  }
  clearHover(): void {
    this.hover.set(null);
  }

  // ── pointer → user-space conversion (accounts for zoom/pan scene transform) ─
  private toUser(ev: PointerEvent | WheelEvent): PtXY | null {
    const scene = this.sceneRef()?.nativeElement;
    const svg = this.svgRef()?.nativeElement;
    if (!scene || !svg) return null;
    const ctm = scene.getScreenCTM();
    if (!ctm) return null;
    const pt = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(ctm.inverse());
    return { x: pt.x, y: pt.y };
  }

  // ── wheel zoom (toward cursor), clamped ─────────────────────────────────────
  onWheel(ev: WheelEvent): void {
    ev.preventDefault();
    const next = Math.min(5, Math.max(1, this.zoom() * (ev.deltaY < 0 ? 1.15 : 1 / 1.15)));
    this.zoom.set(Math.round(next * 100) / 100);
    if (next === 1) {
      this.panX.set(0);
      this.panY.set(0);
    }
  }
  zoomBy(f: number): void {
    const next = Math.min(5, Math.max(1, Math.round(this.zoom() * f * 100) / 100));
    this.zoom.set(next);
    if (next === 1) {
      this.panX.set(0);
      this.panY.set(0);
    }
  }
  resetView(): void {
    this.zoom.set(1);
    this.panX.set(0);
    this.panY.set(0);
  }

  // ── pan + edit gestures ──────────────────────────────────────────────────────
  private dragKind: 'pan' | 'arrow' | null = null;
  private dragStart: PtXY | null = null;
  private panStart = { x: 0, y: 0 };
  /** In-progress arrow being drawn (editable). */
  readonly ghostArrow = signal<{ from: PtXY; to: PtXY; role: LeaderRole; color: string } | null>(null);

  onPointerDown(ev: PointerEvent): void {
    const u = this.toUser(ev);
    if (!u) return;
    // Editable: the arrow tool starts a drag from the nearest leader under cursor.
    if (this.editable() && this.tool() === 'arrow') {
      const lead = this.leaderAt(u);
      if (lead) {
        this.dragKind = 'arrow';
        this.dragStart = { x: lead.x, y: lead.y };
        this.ghostArrow.set({ from: { x: lead.x, y: lead.y }, to: u, role: lead.role, color: this.colorFor(lead.tag) });
        (ev.target as Element).setPointerCapture?.(ev.pointerId);
        this.pendingArrowLeader = lead;
        return;
      }
    }
    // Otherwise a pan drag (any mode, when zoomed or just to reposition).
    this.dragKind = 'pan';
    this.dragStart = { x: ev.clientX, y: ev.clientY };
    this.panStart = { x: this.panX(), y: this.panY() };
    (ev.target as Element).setPointerCapture?.(ev.pointerId);
  }

  private pendingArrowLeader: InvasionLeader | null = null;

  onPointerMove(ev: PointerEvent): void {
    if (!this.dragKind) return;
    if (this.dragKind === 'pan' && this.dragStart) {
      this.panX.set(this.panStart.x + (ev.clientX - this.dragStart.x));
      this.panY.set(this.panStart.y + (ev.clientY - this.dragStart.y));
      return;
    }
    if (this.dragKind === 'arrow') {
      const u = this.toUser(ev);
      const g = this.ghostArrow();
      if (u && g) this.ghostArrow.set({ ...g, to: u });
    }
  }

  onPointerUp(ev: PointerEvent): void {
    if (this.dragKind === 'arrow' && this.pendingArrowLeader) {
      const u = this.toUser(ev);
      if (u) this.commitArrow(this.pendingArrowLeader, u);
    }
    this.dragKind = null;
    this.dragStart = null;
    this.pendingArrowLeader = null;
    this.ghostArrow.set(null);
  }

  /** A click that didn't become a drag → a place/erase/teleport action. */
  onSvgClick(ev: PointerEvent): void {
    if (!this.editable()) return;
    // A real pan/arrow drag already handled pointerup; ignore the trailing click.
    if (this.movedSinceDown(ev)) return;
    const u = this.toUser(ev);
    if (!u) return;
    const t = this.tool();
    if (t === 'rally' || t === 'siege') this.placeLeader(t, u);
    else if (t === 'hazard') this.placeHazard(u);
    else if (t === 'teleport') this.paintTeleport(u);
    else if (t === 'erase') this.eraseAt(u);
  }

  private downAt = { x: 0, y: 0 };
  private movedSinceDown(ev: PointerEvent): boolean {
    return Math.hypot(ev.clientX - this.downAt.x, ev.clientY - this.downAt.y) > 4;
  }
  recordDown(ev: PointerEvent): void {
    this.downAt = { x: ev.clientX, y: ev.clientY };
  }

  // ── plan mutations (emit a fresh plan each time) ────────────────────────────
  private emit(next: InvasionPlan): void {
    this.planChange.emit(next);
  }
  private clone(): InvasionPlan {
    const p = this.plan();
    return {
      side: p.side,
      leaders: [...(p.leaders ?? [])],
      arrows: [...(p.arrows ?? [])],
      hazards: [...(p.hazards ?? [])],
      teleport: [...(p.teleport ?? [])],
    };
  }

  /** True when a point is a legal place for OUR markers: inside our blue tile,
   * and not inside the Imperial City courtyard wall (can't stage on the wall). */
  private placeableHere(u: PtXY): boolean {
    if (!inPoly(u.x, u.y, this.ourPoly())) return false;
    const c = GEO.courtyard;
    if (Math.hypot(u.x - c.center.x, u.y - c.center.y) <= c.wallRadius) return false;
    return true;
  }
  /** Flash a brief "stay in your tile" hint when a placement is rejected. */
  readonly rejectHint = signal(false);
  private reject(): void {
    this.rejectHint.set(true);
    // cleared on the next successful action or tool change (no timer — keeps it
    // resume-safe and avoids Date/setTimeout churn in tests).
  }

  private placeLeader(role: LeaderRole, u: PtXY): void {
    const tag = this.armedTag();
    if (!tag) return;
    if (!this.placeableHere(u)) {
      this.reject();
      return;
    }
    const p = this.clone();
    // One leader per (tag, role): replace if it exists, else add.
    p.leaders = p.leaders.filter(l => !(l.tag === tag && l.role === role));
    p.leaders.push({ tag, role, x: Math.round(u.x), y: Math.round(u.y) });
    this.rejectHint.set(false);
    this.emit(p);
  }

  private placeHazard(u: PtXY): void {
    if (!this.placeableHere(u)) {
      this.reject();
      return;
    }
    const p = this.clone();
    p.hazards.push({ x: Math.round(u.x), y: Math.round(u.y) });
    this.rejectHint.set(false);
    this.emit(p);
  }

  private paintTeleport(u: PtXY): void {
    const tag = this.armedTag();
    if (!tag) return;
    if (!inPoly(u.x, u.y, this.ourPoly())) {
      this.reject();
      return;
    }
    // Quarter by the SAME centroid split the wedges use, so the painted slice is
    // exactly the one the click landed in.
    const c = this.ourCentroid();
    const quarter: TeleportQuarter = u.y < c.y ? (u.x < c.x ? 'NW' : 'NE') : u.x < c.x ? 'SW' : 'SE';
    const p = this.clone();
    const exists = p.teleport.some(t => t.tag === tag && t.quarter === quarter);
    // Toggle: clicking an owned quarter again clears it.
    p.teleport = exists ? p.teleport.filter(t => !(t.tag === tag && t.quarter === quarter)) : [...p.teleport, { tag, quarter }];
    this.rejectHint.set(false);
    this.emit(p);
  }

  private commitArrow(lead: InvasionLeader, u: PtXY): void {
    const node = this.nodeAt(u);
    // A march targets a NODE (allowed anywhere — that's the objective) or a free
    // point, which must stay inside our tile (you don't rally into enemy ground).
    if (!node && !this.placeableHere(u)) {
      this.reject();
      return;
    }
    const p = this.clone();
    // One arrow per (tag, role) — replace any previous target for this leader.
    p.arrows = p.arrows.filter(a => !(a.tag === lead.tag && a.role === lead.role));
    p.arrows.push({
      tag: lead.tag,
      role: lead.role,
      from: { x: lead.x, y: lead.y },
      ...(node ? { toNode: node.id } : { to: { x: Math.round(u.x), y: Math.round(u.y) } }),
    });
    this.rejectHint.set(false);
    this.emit(p);
  }

  private eraseAt(u: PtXY): void {
    const p = this.clone();
    // Priority: a leader (and its arrow), then a loose arrow, then a hazard.
    const lead = this.leaderAt(u);
    if (lead) {
      p.leaders = p.leaders.filter(l => !(l.tag === lead.tag && l.role === lead.role));
      p.arrows = p.arrows.filter(a => !(a.tag === lead.tag && a.role === lead.role));
      this.emit(p);
      return;
    }
    const hzIdx = p.hazards.findIndex(h => Math.hypot(h.x - u.x, h.y - u.y) <= this.hazardR + 10);
    if (hzIdx >= 0) {
      p.hazards.splice(hzIdx, 1);
      this.emit(p);
    }
  }

  // ── hit tests (user space) ───────────────────────────────────────────────────
  private leaderAt(u: PtXY): InvasionLeader | null {
    for (const l of this.leaders()) {
      if (Math.hypot(l.x - u.x, l.y - u.y) <= this.leaderR + 8) return l;
    }
    return null;
  }
  private nodeAt(u: PtXY): IcNode | null {
    for (const n of this.nodes()) {
      const r = n.r ?? this.gateR;
      if (Math.hypot(n.x - u.x, n.y - u.y) <= r + 6) return n;
    }
    return null;
  }

  /** Marker glyph for a leader role. */
  roleGlyph(role: LeaderRole): string {
    return role === 'rally' ? '🚩' : '💥';
  }
}
