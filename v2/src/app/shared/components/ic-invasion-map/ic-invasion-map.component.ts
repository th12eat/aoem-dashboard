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

/** Parse an SVG points string "x,y x,y …" → [[x,y],…]. */
function parsePoly(s: string): number[][] {
  return s
    .trim()
    .split(/\s+/)
    .map(p => p.split(',').map(Number));
}

/** Axis-aligned bounds of a polygon. */
function bbox(poly: number[][]): { minX: number; minY: number; maxX: number; maxY: number; cx: number; cy: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of poly) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
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
    const out: { tag: string; role: LeaderRole; color: string; d: string; siege: boolean }[] = [];
    for (const a of this.plan().arrows ?? []) {
      const from: PtXY = a.from;
      const target = this.resolveArrowTarget(a);
      if (!target) continue;
      out.push({
        tag: a.tag,
        role: a.role,
        color: this.colorFor(a.tag),
        d: this.buildArrowPath(from, target, a.toNode),
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
   * line through the gate nearest the SOURCE (can't hop the wall). Otherwise a
   * straight segment. */
  private buildArrowPath(from: PtXY, target: PtXY, toNode?: string): string {
    if (toNode === 'imperial-city') {
      const g = nearestGate(from);
      return `M ${from.x} ${from.y} L ${g.x} ${g.y} L ${target.x} ${target.y}`;
    }
    return `M ${from.x} ${from.y} L ${target.x} ${target.y}`;
  }

  // ── teleport quarters (tinted rects clipped to the owned zone) ──────────────
  readonly teleportRects = computed(() => {
    const ours = parsePoly(this.ourZonePoly());
    const bb = bbox(ours);
    const rects: { tag: string; color: string; x: number; y: number; w: number; h: number }[] = [];
    for (const t of this.plan().teleport ?? []) {
      const west = t.quarter === 'NW' || t.quarter === 'SW';
      const north = t.quarter === 'NW' || t.quarter === 'NE';
      rects.push({
        tag: t.tag,
        color: this.colorFor(t.tag),
        x: west ? bb.minX : bb.cx,
        y: north ? bb.minY : bb.cy,
        w: (bb.maxX - bb.minX) / 2,
        h: (bb.maxY - bb.minY) / 2,
      });
    }
    return rects;
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

  private placeLeader(role: LeaderRole, u: PtXY): void {
    const tag = this.armedTag();
    if (!tag) return;
    const p = this.clone();
    // One leader per (tag, role): replace if it exists, else add.
    p.leaders = p.leaders.filter(l => !(l.tag === tag && l.role === role));
    p.leaders.push({ tag, role, x: Math.round(u.x), y: Math.round(u.y) });
    this.emit(p);
  }

  private placeHazard(u: PtXY): void {
    const p = this.clone();
    p.hazards.push({ x: Math.round(u.x), y: Math.round(u.y) });
    this.emit(p);
  }

  private paintTeleport(u: PtXY): void {
    const tag = this.armedTag();
    if (!tag) return;
    const ours = parsePoly(this.ourZonePoly());
    if (!inPoly(u.x, u.y, ours)) return; // only paint inside our tile
    const bb = bbox(ours);
    const quarter: TeleportQuarter = (u.y < bb.cy ? (u.x < bb.cx ? 'NW' : 'NE') : u.x < bb.cx ? 'SW' : 'SE');
    const p = this.clone();
    const exists = p.teleport.some(t => t.tag === tag && t.quarter === quarter);
    // Toggle: clicking an owned quarter again clears it.
    p.teleport = exists ? p.teleport.filter(t => !(t.tag === tag && t.quarter === quarter)) : [...p.teleport, { tag, quarter }];
    this.emit(p);
  }

  private commitArrow(lead: InvasionLeader, u: PtXY): void {
    const node = this.nodeAt(u);
    const p = this.clone();
    // One arrow per (tag, role) — replace any previous target for this leader.
    p.arrows = p.arrows.filter(a => !(a.tag === lead.tag && a.role === lead.role));
    p.arrows.push({
      tag: lead.tag,
      role: lead.role,
      from: { x: lead.x, y: lead.y },
      ...(node ? { toNode: node.id } : { to: { x: Math.round(u.x), y: Math.round(u.y) } }),
    });
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
