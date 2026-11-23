import { ChangeDetectionStrategy, Component, HostListener, computed, effect, inject, input, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { EventRegistryService } from '@core/services/event-registry.service';
import { ClockService } from '@core/services/clock.service';
import { MapStateStore, type MapKind } from '@core/services/map-state.store';
import { ACCESS } from '@core/access/access.service';
import { deriveMapView } from '@core/services/derive-map-view';
import { serializeGeometryToTs } from '@core/admin/map-geometry.serializer';
import { shadeSpread, dimHex } from '@shared/utils/numeric';
import { otherTagFor, displayTag } from '@shared/utils/alliance-tag';
import { environment } from '../../../../environments/environment';
import type { Kingdom } from '@shared/models/event-data.model';
import type { MapGeometry, MapNodeGeo, MapNodeState, MapRoute, StrongholdState } from '@shared/models/map.model';
import type { Pt } from '@core/admin/svg-coords';
import { EditableMapCanvasComponent, type CanvasEdge } from './editable-map-canvas.component';
import { NodeInspectorComponent } from './node-inspector.component';

type EditorMode = 'state' | 'details';

/** A legend chip: an alliance (or an OTHER@server sentinel) with its shade. */
interface LegendAlliance {
  tag: string;
  label: string;
  color: string;
}
interface LegendServer {
  server: string;
  label: string;
  alliances: LegendAlliance[];
}

/** The raw data doc + per-server alliance legend derived from scouting. */
interface LoadedData {
  raw: Record<string, unknown>;
  kingdoms: Kingdom[];
  allianceServer: Record<string, string>;
  legend: LegendServer[];
  eventStartMs: number;
}

/** A canonical edge key (order-independent) for shared-edge merging. */
function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Admin map editor, redesigned. Two modes:
 *   • STATE — the live/plan map editor (strategist+). A color-coded alliance
 *     legend (all 4 servers + an "Other" chip each) arms an alliance; click a
 *     node to occupy/toggle; drag node→node to draw a single edge; click an
 *     edge to delete it or set lifecycle / siege / cut. Connectivity
 *     (active/inactive/severed) is derived automatically. A Live/Plan switch
 *     edits two independent maps, each saved to its own row.
 *   • MAP DETAILS — node geometry (developer-edit behind Unlock, strategist
 *     view-only). Positions/attributes change only when the game devs change
 *     the map.
 */
@Component({
  selector: 'app-map-editor',
  imports: [RouterLink, EditableMapCanvasComponent, NodeInspectorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.me-max]': 'maximized()' },
  template: `
    @if (!geometry()) {
      <div class="me-shell">
        <p>No map geometry for "{{ activeSlug() }}".</p>
        <a routerLink="/admin">← Admin</a>
      </div>
    } @else {
      <div class="me-bar">
        <a routerLink="/admin" class="me-back">← Admin</a>
        <strong class="me-title">Map Editor — {{ activeSlug() }}</strong>
        <span class="me-modes">
          <button type="button" [class.on]="mode() === 'state'" (click)="setMode('state')">Live State</button>
          <button type="button" [class.on]="mode() === 'details'" (click)="setMode('details')">Map Details</button>
        </span>
        <span class="me-spacer"></span>
        @if (mode() === 'state') {
          <span class="me-kinds">
            <button type="button" [class.on]="mapKind() === 'live'" (click)="setKind('live')">Live</button>
            <button type="button" [class.on]="mapKind() === 'plan'" (click)="setKind('plan')">Plan</button>
          </span>
          <button type="button" class="me-save" (click)="saveState()" [disabled]="!loaded() || saving()">
            {{ saving() ? 'Saving…' : '☁ Save ' + mapKind() }}
          </button>
        } @else if (canGeometry()) {
          <button type="button" class="me-lock" [class.on]="geometryUnlocked()" (click)="toggleUnlock()">
            {{ geometryUnlocked() ? '🔓 Structure unlocked' : '🔒 Unlock structure' }}
          </button>
          <button type="button" [class.on]="placeMode()" (click)="placeMode.set(!placeMode())" [disabled]="!geometryUnlocked()">
            {{ placeMode() ? '✓ Placing…' : '+ Place node' }}
          </button>
          <button type="button" (click)="downloadGeometry()">⬇ Download .map.ts</button>
        }
        <button type="button" class="me-maxbtn" (click)="maximized.set(!maximized())" [title]="maximized() ? 'Minimize (Esc)' : 'Maximize the map'">
          {{ maximized() ? '🗗 Minimize' : '⛶ Maximize' }}
        </button>
      </div>

      @if (mode() === 'state' && saveMsg()) {
        <p class="me-save-msg" [class.err]="saveErr()">{{ saveMsg() }}</p>
      }
      @if (mode() === 'state' && !loaded()) {
        <p class="me-warn">No data file for "{{ activeSlug() }}" — edits can't be saved.</p>
      }
      @if (mode() === 'details' && !canGeometry()) {
        <p class="me-note">👁 Map Details is read-only — only a developer can change node positions or attributes.</p>
      } @else if (mode() === 'details' && !geometryUnlocked()) {
        <p class="me-note">🔒 Structure is locked. Click <strong>Unlock structure</strong> to change node positions/attributes (only when the game devs change the map).</p>
      }

      <div class="me-grid">
        <div class="me-canvas">
          <app-editable-map-canvas
            [geometry]="geometry()!"
            [selectedId]="selectedId()"
            [placeMode]="placeMode() && mode() === 'details' && geometryUnlocked()"
            [geometryLocked]="mode() === 'details' && !geometryUnlocked()"
            [stateMode]="mode() === 'state'"
            [allowDraw]="tool() === 'select' && !!armed()"
            [occupantColor]="occupantColor()"
            [siegeIds]="siegeIds()"
            [edges]="canvasEdges()"
            [strongholds]="strongholdViews()"
            [nodeStatus]="nodeStatus()"
            (nodeSelect)="onNodeSelect($event)"
            (nodeTap)="onNodeTap($event)"
            (edgeDraw)="onEdgeDraw($event)"
            (edgeTap)="onEdgeTap($event)"
            (place)="onPlace($event)"
            (move)="onMove($event)"
          />

          @if (mode() === 'state' && loaded()) {
            <!-- MS-Paint style: pick a TOOL, then (for Select) an alliance colour -->
            <div class="me-tools">
              <span class="me-tools-label">Tool</span>
              <button type="button" class="me-tool" [class.on]="tool() === 'none'" (click)="setTool('none')" title="Inert — hover a node/edge for info">🚫 None</button>
              <button type="button" class="me-tool" [class.on]="tool() === 'select'" (click)="setTool('select')" title="Occupy nodes + draw paths with the armed alliance">✏️ Select</button>
              <button type="button" class="me-tool" [class.on]="tool() === 'siege'" (click)="setTool('siege')" title="Click a node or edge to toggle siege">⚔ Siege</button>
              <button type="button" class="me-tool" [class.on]="tool() === 'cut'" (click)="setTool('cut')" title="Click an edge to toggle enemy cut">✂ Cut</button>
              <button type="button" class="me-tool" [class.on]="tool() === 'erase'" (click)="setTool('erase')" title="Click an edge to delete it, or a node to clear its occupant">🗑 Erase</button>
            </div>

            @if (tool() === 'select') {
              <div class="me-legend">
                @for (srv of loaded()!.legend; track srv.server) {
                  <div class="me-legend-server">
                    <span class="me-legend-label">{{ srv.label }}</span>
                    @for (a of srv.alliances; track a.tag) {
                      <button
                        type="button"
                        class="me-chip"
                        [class.armed]="armed() === a.tag"
                        [style.--chip]="a.color"
                        (click)="arm(a.tag)"
                      >
                        <span class="me-chip-sw" [style.background]="a.color"></span>{{ a.label }}
                      </button>
                    }
                  </div>
                }
              </div>
            }

            <p class="me-legend-hint">
              @switch (tool()) {
                @case ('select') {
                  @if (armed(); as t) {
                    <strong>{{ displayTag(t) }}</strong> armed — click a node to occupy (click its own node again to clear); drag node→node to path (starts <em>pathing</em>; click the edge to mark it complete).
                  } @else {
                    Pick an alliance colour above, then click nodes to occupy and drag to path.
                  }
                }
                @case ('siege') { ⚔ Siege tool — click a node or an edge to toggle its siege state. }
                @case ('cut') { ✂ Cut tool — click an edge to toggle whether the enemy has severed it. }
                @case ('erase') { 🗑 Erase tool — click an edge to delete it, or a node to clear its occupant. }
                @default { 🚫 None — clicks are inert; hover a node or edge for info. Pick a tool to make changes. }
              }
            </p>
          }
        </div>

        <aside class="me-panel">
          @if (mode() === 'details') {
            @if (canGeometry() && geometryUnlocked()) {
              <app-node-inspector [node]="selected()" (nodeChange)="onNodeChange($event)" (removeNode)="onNodeRemove($event)" />
            } @else if (selected(); as n) {
              <div class="me-ro">
                <div class="me-ro-head"><strong>{{ n.subtype || n.type }}</strong><span>{{ n.id }}</span></div>
                <dl>
                  <dt>Type</dt><dd>{{ n.type }}</dd>
                  @if (n.subtype) { <dt>Subtype</dt><dd>{{ n.subtype }}</dd> }
                  @if (n.transition) { <dt>Transition</dt><dd>{{ n.transition }}</dd> }
                  @if (n.buff) { <dt>Buff</dt><dd>{{ n.buff.label }} {{ n.buff.magnitude }}</dd> }
                  @if (n.effect) { <dt>Effect</dt><dd>{{ n.effect.label }}</dd> }
                  <dt>Energy/hr</dt><dd>{{ n.energyPerHour ?? 0 }}</dd>
                  <dt>Pos</dt><dd>{{ n.x }}, {{ n.y }}</dd>
                </dl>
                <p class="me-ro-note">Read-only.</p>
              </div>
            } @else {
              <p class="me-ro-hint">Click a node to inspect it.</p>
            }
          } @else {
            <!-- state-mode side panel: selected node quick-actions -->
            @if (selected(); as n) {
              <div class="me-sp">
                <div class="me-ro-head"><strong>{{ n.subtype || n.type }}</strong><span>{{ n.id }}</span></div>
                <p class="me-sp-line">Occupant: <strong>{{ occupantOf(n.id) || '—' }}</strong></p>
                @if (occupantOf(n.id)) {
                  <p class="me-sp-line" [class.me-sp-inactive]="!isConnected(n.id)">
                    {{ isConnected(n.id) ? '🟢 Connected' : '⚪ Inactive — not tied to an SH/SSH' }}
                  </p>
                }
                @if (occupantOf(n.id)) {
                  <label class="me-sp-check"><input type="checkbox" [checked]="isNodeSiege(n.id)" (change)="toggleNodeSiege(n.id)" /> Under siege</label>
                  <!-- Stronghold placement — strategist+ (lives in the state editor).
                       SH only on Z1→Z2 gates; SSH on any node except the central
                       objective. SL's stronghold nodes are static SSH (seed), so
                       they aren't re-placed here. -->
                  @if (!n.seed) {
                    <div class="me-sp-sh">
                      <span class="me-sp-shlabel">Stronghold here:</span>
                      @if (canPlaceSh(n)) {
                        <button type="button" class="me-sp-btn" [class.on]="shKind(n.id) === 'sh'" (click)="toggleStronghold(n.id, 'sh')">SH</button>
                      }
                      @if (canPlaceSsh(n)) {
                        <button type="button" class="me-sp-btn" [class.on]="shKind(n.id) === 'ssh'" (click)="toggleStronghold(n.id, 'ssh')">SSH</button>
                      }
                      @if (!canPlaceSh(n) && !canPlaceSsh(n)) {
                        <span class="me-sp-na">n/a here</span>
                      }
                    </div>
                  } @else {
                    <p class="me-sp-na">
                      Forward stronghold node.
                      @if (isActiveSeed(n.id)) {
                        <strong>Active</strong> — seeds connectivity.
                      } @else {
                        Inactive — only one stronghold can be active at a time; occupy it to activate.
                      }
                    </p>
                  }
                  <button type="button" class="me-sp-clear" (click)="clearOccupant(n.id)">Clear occupant</button>
                }
              </div>
            } @else {
              <p class="me-ro-hint">Arm an alliance in the legend, then click a node. Click a node here to see its status + siege/stronghold actions.</p>
            }
          }
        </aside>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        padding: 16px;
        max-width: var(--w-content);
        margin: 0 auto;
      }
      /* Maximized: pin to the viewport so the map canvas fills the screen. The
         canvas scales to its container, so a wide --map-max-width + the full
         width gives comfortable, granular dragging. */
      :host.me-max {
        position: fixed;
        inset: 0;
        z-index: 1100; /* above the frozen site header (z-index 1000) */
        max-width: none;
        margin: 0;
        padding: 12px 16px;
        overflow: auto;
        background: var(--bg-body, #0a0c14);
        --map-max-width: 96vmin;
      }
      .me-maxbtn {
        background: var(--bg-card2);
        color: var(--text-secondary);
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 6px 12px;
        font-weight: 700;
        cursor: pointer;
      }
      .me-shell {
        padding: 40px;
        text-align: center;
        color: var(--text-secondary);
      }
      .me-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 14px;
        flex-wrap: wrap;
      }
      .me-back {
        color: var(--text-muted);
        text-decoration: none;
      }
      .me-title {
        font-family: var(--font-display);
        letter-spacing: 1px;
        color: var(--kvk-accent);
      }
      .me-modes,
      .me-kinds {
        display: inline-flex;
        border: 1px solid var(--border);
        border-radius: 6px;
        overflow: hidden;
      }
      .me-modes button,
      .me-kinds button {
        border: none;
        border-radius: 0;
        background: var(--bg-card);
      }
      .me-spacer {
        flex: 1;
      }
      .me-bar button {
        background: var(--bg-card2);
        color: var(--text-secondary);
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 6px 12px;
        font-weight: 700;
        cursor: pointer;
      }
      .me-bar button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .me-bar button.on {
        background: var(--kvk-accent);
        color: #0a0c14;
        border-color: var(--kvk-accent);
      }
      .me-lock.on {
        background: #1f6f43;
        color: #fff;
        border-color: #2e8b57;
      }
      .me-save {
        background: var(--kvk-accent) !important;
        color: #0a0c14 !important;
        border-color: var(--kvk-accent) !important;
      }
      .me-warn {
        color: var(--accent-red);
        font-size: var(--fs-label);
        margin: 0 0 10px;
      }
      .me-note {
        color: var(--text-muted);
        font-size: var(--fs-label);
        line-height: 1.5;
        margin: 0 0 10px;
        padding: 8px 10px;
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 8px;
      }
      .me-save-msg {
        margin: 0 0 10px;
        font-size: var(--fs-label);
        color: #22c55e;
      }
      .me-save-msg.err {
        color: var(--accent-red);
      }
      .me-grid {
        display: grid;
        grid-template-columns: 1fr 260px;
        gap: 16px;
        align-items: start;
      }
      @media (max-width: 820px) {
        .me-grid {
          grid-template-columns: 1fr;
        }
      }
      .me-legend {
        margin-top: 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .me-legend-server {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
      }
      .me-legend-label {
        font-size: var(--fs-micro);
        color: var(--text-muted);
        min-width: 44px;
        text-transform: uppercase;
      }
      .me-chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: var(--bg-card2);
        border: 1px solid var(--border);
        border-radius: 999px;
        padding: 3px 9px;
        font-size: var(--fs-label);
        color: var(--text-secondary);
        cursor: pointer;
      }
      .me-chip.armed {
        border-color: var(--chip);
        box-shadow: 0 0 0 2px var(--chip) inset;
        color: var(--text-primary);
      }
      .me-chip-sw {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        display: inline-block;
      }
      .me-legend-hint {
        font-size: var(--fs-sub);
        color: var(--text-muted);
        line-height: 1.5;
        margin: 2px 0 0;
      }
      .me-panel {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 14px;
      }
      .me-ro-head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 6px;
      }
      .me-ro-head span {
        font-family: var(--font-mono);
        font-size: var(--fs-micro);
        color: var(--text-muted);
      }
      .me-ro dl {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 2px 10px;
        margin: 0;
      }
      .me-ro dt {
        color: var(--text-muted);
        text-transform: uppercase;
        font-size: var(--fs-micro);
      }
      .me-ro-note,
      .me-ro-hint {
        color: var(--text-muted);
        font-size: var(--fs-sub);
        margin-top: 8px;
      }
      .me-sp {
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: var(--fs-label);
      }
      .me-sp-check {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .me-sp-row {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .me-sp-row span {
        font-size: var(--fs-micro);
        color: var(--text-muted);
        text-transform: uppercase;
      }
      .me-sp-row select {
        background: var(--bg-card2);
        border: 1px solid var(--border);
        border-radius: 5px;
        color: var(--text-primary);
        padding: 4px 6px;
      }
      .me-sp-clear {
        margin-top: 4px;
        background: rgba(196, 61, 61, 0.14);
        color: var(--accent-red);
        border: 1px solid var(--accent-red);
        border-radius: 6px;
        padding: 6px;
        cursor: pointer;
      }
      .me-sp-sh {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .me-sp-shlabel {
        font-size: var(--fs-micro);
        color: var(--text-muted);
        text-transform: uppercase;
      }
      .me-sp-btn {
        background: var(--bg-card2);
        border: 1px solid var(--border);
        border-radius: 6px;
        color: var(--text-secondary);
        padding: 3px 10px;
        font-weight: 700;
        cursor: pointer;
      }
      .me-sp-btn.on {
        background: #d9b48a;
        color: #0a0c14;
        border-color: #d9b48a;
      }
      .me-sp-na {
        font-size: var(--fs-sub);
        color: var(--text-muted);
      }
      .me-sp-inactive {
        color: var(--text-muted);
      }
      .me-tools {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 12px;
      }
      .me-tools-label {
        font-size: var(--fs-micro);
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .me-tool {
        background: var(--bg-card2);
        border: 1px solid var(--border);
        border-radius: 7px;
        color: var(--text-secondary);
        padding: 5px 11px;
        font-weight: 700;
        cursor: pointer;
      }
      .me-tool.on {
        background: var(--kvk-accent);
        color: #0a0c14;
        border-color: var(--kvk-accent);
      }
    `,
  ],
})
export class MapEditorPage {
  private readonly route = inject(ActivatedRoute);
  private readonly registry = inject(EventRegistryService);
  private readonly http = inject(HttpClient);
  private readonly clock = inject(ClockService);
  private readonly access = inject(ACCESS);
  private readonly mapStore = inject(MapStateStore);

  /** Embedded use binds `slug`; standalone route use falls back to the :slug
   * param. The input wins when provided (non-empty). */
  readonly slug = input<string>('');
  /** The occurrence this map belongs to. When set (embedded in the data editor
   * for a real DB occurrence), map state is keyed by it and does NOT inherit the
   * static JSON — a fresh occurrence starts with an empty map. Null = legacy /
   * standalone use, which keeps the (slug,kind) row + static-live fallback. */
  readonly eventId = input<string | null>(null);
  private readonly routeSlug = toSignal(this.route.paramMap.pipe(map(p => p.get('slug') ?? '')), { initialValue: '' });
  readonly activeSlug = computed(() => this.slug() || this.routeSlug());
  readonly displayTag = displayTag;

  // save feedback
  readonly saving = signal(false);
  readonly saveMsg = signal<string | null>(null);
  readonly saveErr = signal(false);

  /** Full-screen overlay for comfortable editing (works embedded or standalone). */
  readonly maximized = signal(false);
  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.maximized()) this.maximized.set(false);
  }

  readonly canGeometry = computed(() => this.access.can('edit-geometry'));
  readonly geometryUnlocked = signal(false);
  toggleUnlock(): void {
    if (this.canGeometry()) this.geometryUnlocked.update(v => !v);
  }

  // geometry (Map Details)
  readonly geometry = signal<MapGeometry | null>(null);
  readonly selectedId = signal<string | null>(null);
  readonly placeMode = signal(false);
  private placeSeq = 0;
  readonly selected = computed<MapNodeGeo | null>(() => {
    const g = this.geometry();
    const id = this.selectedId();
    return g && id ? (g.nodes.find(n => n.id === id) ?? null) : null;
  });

  // mode + live/plan state
  readonly mode = signal<EditorMode>('state');
  readonly mapKind = signal<MapKind>('live');
  readonly nodeState = signal<Record<string, MapNodeState>>({});
  readonly routes = signal<{ actual: MapRoute[]; planned: MapRoute[] }>({ actual: [], planned: [] });
  readonly strongholds = signal<StrongholdState[]>([]);
  readonly loaded = signal<LoadedData | null>(null);

  /** The armed alliance (legend chip) that Select-tool clicks/drags apply. */
  readonly armed = signal<string | null>(null);
  /** The active MS-Paint-style tool. */
  readonly tool = signal<'none' | 'select' | 'siege' | 'cut' | 'erase'>('none');

  setTool(t: 'none' | 'select' | 'siege' | 'cut' | 'erase'): void {
    this.tool.set(t);
    this.saveMsg.set(null);
    this.saveErr.set(false);
  }

  private loadedKey = '';
  constructor() {
    // React to the slug/occurrence resolving (works for both route param + input
    // binding). Keyed by slug+eventId so switching occurrences reloads the map.
    effect(() => {
      const slug = this.activeSlug();
      const eventId = this.eventId();
      const key = `${slug}|${eventId ?? ''}`;
      if (!slug || key === this.loadedKey) return;
      const cfg = this.registry.getConfig(slug);
      if (!cfg?.mapGeometry) return;
      this.loadedKey = key;
      this.geometry.set(structuredClone(cfg.mapGeometry));
      this.loadData(slug, eventId);
    });
  }

  // ── load raw data → build legend, then overlay DB state for the kind ─────────
  private loadData(slug: string, eventId: string | null): void {
    const url = `${environment.dataBaseUrl}live/${slug}.json`;
    this.http
      .get<Record<string, unknown>>(url)
      .pipe(catchError(() => of(null)))
      .subscribe(raw => {
        if (!raw) return;
        const ec = (raw['eventConfig'] ?? {}) as Record<string, unknown>;
        const kingdoms = (ec['kingdoms'] ?? []) as Kingdom[];
        const research = (raw['research'] ?? {}) as Record<string, unknown>;
        const allianceServer: Record<string, string> = {};
        const legend: LegendServer[] = [];

        const addServer = (roster: Record<string, unknown>) => {
          const server = String(roster['server'] ?? '');
          if (!server) return;
          const base = kingdoms.find(k => k.server === server)?.color ?? '#8a90a5';
          const alliances = ((roster['alliances'] ?? []) as { tag?: string }[])
            .map(a => String(a.tag ?? ''))
            .filter(Boolean);
          for (const t of alliances) allianceServer[t] = server;
          // distinct shade per alliance + an "Other" chip (base colour) last.
          const shades = shadeSpread(base, alliances.length);
          const chips: LegendAlliance[] = alliances.map((tag, i) => ({ tag, label: tag, color: shades[i] }));
          chips.push({ tag: otherTagFor(server), label: 'Other', color: base });
          legend.push({ server, label: server.replace('Era ', ''), alliances: chips });
        };
        addServer(research['ours'] as Record<string, unknown>);
        for (const opp of (research['opponents'] ?? []) as Record<string, unknown>[]) addServer(opp);

        this.loaded.set({
          raw,
          kingdoms,
          allianceServer,
          legend,
          eventStartMs: Date.parse(String(ec['eventStart'] ?? '')),
        });
        void this.loadKind(eventId, slug, this.mapKind(), raw);
      });
  }

  /** Load one map kind's state. For a real OCCURRENCE (eventId set) the map is
   * per-occurrence: a missing row means an EMPTY map — no static fallback, so a
   * fresh occurrence starts blank. Legacy/standalone use (eventId null) keeps
   * the old behaviour: fall back to the static file's live map. */
  private async loadKind(eventId: string | null, slug: string, kind: MapKind, raw: Record<string, unknown>): Promise<void> {
    const saved = await this.mapStore.load(eventId, slug, kind);
    if (saved) {
      this.nodeState.set(saved.state);
      this.routes.set(saved.routes);
      this.strongholds.set(saved.strongholds);
      return;
    }
    if (kind === 'live' && !eventId) {
      // Legacy standalone: seed from the committed static live map.
      this.nodeState.set((raw['mapState'] ?? {}) as Record<string, MapNodeState>);
      const mr = (raw['mapRoutes'] ?? {}) as { actual?: MapRoute[]; planned?: MapRoute[] };
      this.routes.set({ actual: mr.actual ?? [], planned: mr.planned ?? [] });
      this.strongholds.set((raw['strongholds'] ?? []) as StrongholdState[]);
    } else {
      // Fresh occurrence (any kind) or a fresh plan: start empty.
      this.nodeState.set({});
      this.routes.set({ actual: [], planned: [] });
      this.strongholds.set([]);
    }
  }

  setMode(m: EditorMode): void {
    if (m === 'details' && !this.canGeometry()) {
      // strategists may still VIEW details (read-only); developers can edit.
    }
    this.mode.set(m);
    if (m !== 'details') this.placeMode.set(false);
  }

  setKind(k: MapKind): void {
    if (k === this.mapKind()) return;
    this.mapKind.set(k);
    this.saveMsg.set(null);
    const ld = this.loaded();
    if (ld) void this.loadKind(this.eventId(), this.activeSlug(), k, ld.raw);
  }

  // ── derived rendering (via deriveMapView, same engine as the dashboard) ──────
  private readonly view = computed(() => {
    const g = this.geometry();
    const ld = this.loaded();
    if (!g || !ld) return null;
    return deriveMapView(
      g,
      this.nodeState(),
      this.routes(),
      this.strongholds(),
      ld.kingdoms,
      ld.allianceServer,
      ld.eventStartMs,
      this.clock.now(),
    );
  });

  /** Positioned SH/SSH diamonds for the canvas (same derivation the dashboard
   * uses, so SH sits on the Z1 side of its gate, SSH on the Z2 side, etc.). */
  readonly strongholdViews = computed(() => this.view()?.strongholds ?? []);

  /** SL has geometry `seed:true` stronghold nodes; DD/other events do not.
   * Drives: no manual SSH there (the seed nodes ARE the forward strongholds),
   * and the one-active-stronghold toggle. */
  readonly isSeedEvent = computed(() => this.geometry()?.nodes.some(n => n.seed) ?? false);

  readonly occupantColor = computed<Record<string, string>>(() => {
    const v = this.view();
    if (!v) return {};
    const shadeByTag = new Map(v.holdings.map(h => [h.tag, h.shade]));
    const out: Record<string, string> = {};
    for (const n of v.nodes) {
      if (!n.occupant) continue;
      const base = shadeByTag.get(n.occupant) ?? '#8a90a5';
      // INACTIVE (occupied but not connected to an SH/SSH/active stronghold) →
      // dimmed, mirroring the dashboard. Recomputes the moment a seed's
      // occupant is cleared, so the whole severed branch dims at once.
      out[n.id] = n.connected ? base : dimHex(base, 0.5);
    }
    return out;
  });
  readonly siegeIds = computed<string[]>(() => {
    const st = this.nodeState();
    return Object.keys(st).filter(id => st[id].siege);
  });
  readonly nodeStatus = computed<Record<string, string>>(() => {
    const v = this.view();
    if (!v) return {};
    const out: Record<string, string> = {};
    for (const n of v.nodes) {
      // `active` here = OPEN (schedule-unlocked); `connected` = tied to an
      // SH/SSH/active stronghold. Occupied-but-disconnected reads "inactive".
      if (!n.occupant) {
        out[n.id] = n.active ? 'open · unoccupied' : 'not open yet';
        continue;
      }
      out[n.id] = `${n.occupant}${n.connected ? ' · connected' : ' · inactive (disconnected)'}${n.siege ? ' · under siege' : ''}`;
    }
    return out;
  });

  /** Merge per-owner routes into candy-striped canvas edges (fixes the old
   * last-writer-wins collision). Two owners on one segment → base+stripe. */
  readonly canvasEdges = computed<CanvasEdge[]>(() => {
    const g = this.geometry();
    const v = this.view();
    if (!g || !v) return [];
    const pos = new Map(g.nodes.map(n => [n.id, n]));
    const shadeByTag = new Map(v.holdings.map(h => [h.tag, h.shade]));
    interface Agg {
      a: string;
      b: string;
      owners: string[];
      pathing: boolean;
      siege: boolean;
      severed: boolean;
      /** every contributing route is disconnected (inactive) + none pathing */
      inactive: boolean;
    }
    const agg = new Map<string, Agg>();
    for (const r of v.routes.actual) {
      const pathing = r.lifecycle === 'pathing' || !!r.building;
      // route.active is derived by deriveMapView (reachable to an SH/SSH over
      // non-cut edges). A non-pathing, non-cut edge whose owner isn't reachable
      // is INACTIVE and should dim.
      const inactive = !pathing && !r.cut && r.active === false;
      for (let i = 0; i < r.path.length - 1; i++) {
        const a = r.path[i];
        const b = r.path[i + 1];
        if (!pos.get(a) || !pos.get(b)) continue;
        const key = edgeKey(a, b);
        const e = agg.get(key) ?? { a, b, owners: [], pathing: false, siege: false, severed: false, inactive: true };
        if (!e.owners.includes(r.owner)) e.owners.push(r.owner);
        if (pathing) e.pathing = true;
        if (r.siege) e.siege = true;
        if (r.severed) e.severed = true;
        if (!inactive) e.inactive = false; // any active owner keeps the edge lit
        agg.set(key, e);
      }
    }
    const SEVERED = '#6b7280';
    const out: CanvasEdge[] = [];
    for (const [key, e] of agg) {
      const a = pos.get(e.a)!;
      const b = pos.get(e.b)!;
      const dim = (hex: string) => (e.inactive && !e.severed && !e.pathing ? dimHex(hex, 0.5) : hex);
      out.push({
        id: key,
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        color: e.severed ? SEVERED : dim(shadeByTag.get(e.owners[0]) ?? '#8a90a5'),
        stripe: !e.severed && !e.pathing && e.owners.length > 1 ? dim(shadeByTag.get(e.owners[1]) ?? '#8a90a5') : null,
        dashed: e.pathing || e.severed,
        pathing: e.pathing && !e.severed,
        siege: e.siege && !e.severed,
        severed: e.severed,
      });
    }
    return out;
  });

  // ── geometry handlers (Map Details) ──────────────────────────────────────────
  onMove(ev: { kind: 'node' | 'badge'; id: string; pt: Pt }): void {
    const g = this.geometry();
    if (!g) return;
    if (ev.kind === 'node') {
      this.geometry.set({ ...g, nodes: g.nodes.map(n => (n.id === ev.id ? { ...n, x: ev.pt.x, y: ev.pt.y } : n)) });
    } else {
      this.geometry.set({
        ...g,
        serverBadges: g.serverBadges.map(b => (b.server === ev.id ? { ...b, x: ev.pt.x, y: ev.pt.y } : b)),
      });
    }
  }
  onPlace(pt: Pt): void {
    const g = this.geometry();
    if (!g) return;
    let id = `node_${++this.placeSeq}`;
    while (g.nodes.some(n => n.id === id)) id = `node_${++this.placeSeq}`;
    this.geometry.set({ ...g, nodes: [...g.nodes, { id, x: pt.x, y: pt.y, type: 'city', label: 'New node', activeDayOffset: 0 }] });
    this.selectedId.set(id);
  }
  onNodeChange(updated: MapNodeGeo): void {
    const g = this.geometry();
    const prevId = this.selectedId();
    if (!g || !prevId) return;
    this.geometry.set({ ...g, nodes: g.nodes.map(n => (n.id === prevId ? updated : n)) });
    if (updated.id !== prevId) this.selectedId.set(updated.id);
  }
  onNodeRemove(id: string): void {
    const g = this.geometry();
    if (!g) return;
    this.geometry.set({ ...g, nodes: g.nodes.filter(n => n.id !== id) });
    this.selectedId.set(null);
  }
  onNodeSelect(id: string): void {
    this.selectedId.set(id);
  }

  // ── state handlers ────────────────────────────────────────────────────────
  arm(tag: string): void {
    this.armed.set(this.armed() === tag ? null : tag);
    // picking a colour clears any stale "arm an alliance" hint
    this.saveMsg.set(null);
    this.saveErr.set(false);
  }

  occupantOf(id: string): string {
    return this.nodeState()[id]?.occupant ?? '';
  }
  isNodeSiege(id: string): boolean {
    return this.nodeState()[id]?.siege === true;
  }
  isActiveSeed(id: string): boolean {
    return this.nodeState()[id]?.activeSeed === true;
  }
  /** Derived connection state of a node (tied to an SH/SSH/active stronghold). */
  isConnected(id: string): boolean {
    return this.view()?.nodes.find(n => n.id === id)?.connected === true;
  }

  private patchNode(id: string, patch: Partial<MapNodeState>): void {
    const next = { ...this.nodeState() };
    const cur = { ...(next[id] ?? {}), ...patch };
    const clean: MapNodeState = {};
    if (cur.occupant) clean.occupant = cur.occupant;
    if (cur.siege) clean.siege = true;
    if (cur.activeSeed) clean.activeSeed = true;
    if (Object.keys(clean).length) next[id] = clean;
    else delete next[id];
    this.nodeState.set(next);
  }

  /** Node tap routing by active tool. */
  onNodeTap(id: string): void {
    this.selectedId.set(id);
    switch (this.tool()) {
      case 'select':
        this.occupyNode(id);
        break;
      case 'siege':
        this.toggleNodeSiege(id);
        break;
      case 'erase':
        this.clearNode(id);
        break;
      // 'cut' acts on edges only; 'none' is inert (selection shows info).
    }
  }

  /** Select tool: occupy with the armed alliance, or clear if it already holds
   * that alliance. */
  private occupyNode(id: string): void {
    const armed = this.armed();
    if (!armed) return; // no colour picked → just selected (info)
    if (this.occupantOf(id) === armed) {
      this.clearNode(id);
      return;
    }
    const g = this.geometry();
    const node = g?.nodes.find(n => n.id === id);
    const patch: Partial<MapNodeState> = { occupant: armed };
    // SL: occupying a seed (Basic/Advanced Stronghold) node makes it the ONE
    // active forward stronghold for that owner — clear the flag on its others.
    if (node?.seed) {
      this.clearActiveSeedFor(armed);
      patch.activeSeed = true;
    }
    this.patchNode(id, patch);
  }

  private clearNode(id: string): void {
    this.patchNode(id, { occupant: undefined, siege: undefined, activeSeed: undefined });
    this.strongholds.set(this.strongholds().filter(s => s.attachedTo !== id));
  }
  /** Public clear (side-panel button). */
  clearOccupant(id: string): void {
    this.clearNode(id);
  }

  /** Remove the activeSeed flag from all of an owner's seed nodes (SL rule). */
  private clearActiveSeedFor(owner: string): void {
    const st = this.nodeState();
    const next = { ...st };
    for (const [nid, s] of Object.entries(st)) {
      if (s.occupant === owner && s.activeSeed) next[nid] = { ...s, activeSeed: undefined };
    }
    this.nodeState.set(next);
  }

  toggleNodeSiege(id: string): void {
    if (!this.occupantOf(id)) return; // only occupied nodes can be sieged
    this.patchNode(id, { siege: !this.isNodeSiege(id) || undefined });
  }

  shKind(id: string): string {
    return this.strongholds().find(s => s.attachedTo === id)?.kind ?? '';
  }
  /** SH may only be placed on a Z1→Z2 gate (anchors to the Z1/corner side). */
  canPlaceSh(n: MapNodeGeo): boolean {
    return n.type === 'gate' && n.transition === 'Z1->Z2';
  }
  /** SSH is a DD-style forward base — any node except the central objective.
   * NOT applicable to SL (its Basic/Advanced Stronghold nodes are the forward
   * strongholds, placed by occupying them). */
  canPlaceSsh(n: MapNodeGeo): boolean {
    return !this.isSeedEvent() && n.type !== 'aaru';
  }
  /** Toggle an SH/SSH on a node for its occupant. DD allows only ONE SSH per
   * owner — placing a new one MOVES it (removes the owner's prior SSH). */
  toggleStronghold(id: string, kind: 'sh' | 'ssh'): void {
    const owner = this.occupantOf(id);
    if (!owner) return;
    const already = this.shKind(id) === kind;
    let rest = this.strongholds().filter(s => s.attachedTo !== id);
    if (!already) {
      if (kind === 'ssh') rest = rest.filter(s => !(s.owner === owner && s.kind === 'ssh')); // single SSH per owner
      rest.push({ owner, kind, attachedTo: id });
    }
    this.strongholds.set(rest);
  }

  /** Drag node→node (Select tool): create a single-edge PATHING route for the
   * armed alliance; also occupy the target. Click the edge later to complete. */
  onEdgeDraw(ev: { from: string; to: string }): void {
    const owner = this.armed();
    if (!owner) return; // guarded by allowDraw, but be safe
    const key = edgeKey(ev.from, ev.to);
    const exists = this.routes().actual.some(r => r.owner === owner && r.path.length === 2 && edgeKey(r.path[0], r.path[1]) === key);
    if (!exists) {
      this.routes.set({
        ...this.routes(),
        actual: [...this.routes().actual, { owner, path: [ev.from, ev.to], lifecycle: 'pathing' }],
      });
    }
    if (!this.occupantOf(ev.to)) this.occupyNodeFor(owner, ev.to);
    this.selectedId.set(ev.to);
  }

  private occupyNodeFor(owner: string, id: string): void {
    const node = this.geometry()?.nodes.find(n => n.id === id);
    const patch: Partial<MapNodeState> = { occupant: owner };
    if (node?.seed) {
      this.clearActiveSeedFor(owner);
      patch.activeSeed = true;
    }
    this.patchNode(id, patch);
  }

  private edgeMatches(edgeId: string): MapRoute[] {
    return this.routes().actual.filter(r => r.path.length === 2 && edgeKey(r.path[0], r.path[1]) === edgeId);
  }

  /** Edge tap routing by active tool:
   *   • Select → toggle pathing ↔ complete
   *   • Siege  → toggle edge siege
   *   • Cut    → toggle enemy cut
   *   • None   → inert
   * A double-purpose fallback: Select-tapping a pathing edge completes it. */
  onEdgeTap(edgeId: string): void {
    const matches = this.edgeMatches(edgeId);
    if (!matches.length) return;
    const tool = this.tool();
    if (tool === 'erase') {
      this.deleteEdge(edgeId);
      return;
    }
    const apply = (r: MapRoute): MapRoute => {
      if (tool === 'siege') return { ...r, siege: !r.siege || undefined };
      if (tool === 'cut') return { ...r, cut: !r.cut || undefined };
      if (tool === 'select') {
        const next = r.lifecycle === 'pathing' ? 'complete' : 'pathing';
        return { ...r, lifecycle: next, building: undefined };
      }
      return r; // none → inert
    };
    if (tool === 'none') return;
    this.routes.set({ ...this.routes(), actual: this.routes().actual.map(r => (matches.includes(r) ? apply(r) : r)) });
  }

  /** Delete all route records on an edge (Erase tool). */
  deleteEdge(edgeId: string): void {
    const matches = this.edgeMatches(edgeId);
    this.routes.set({ ...this.routes(), actual: this.routes().actual.filter(r => !matches.includes(r)) });
  }

  // ── save ────────────────────────────────────────────────────────────────────
  async saveState(): Promise<void> {
    if (!this.loaded() || this.saving()) return;
    this.saving.set(true);
    this.saveMsg.set(null);
    this.saveErr.set(false);
    const { error } = await this.mapStore.save(this.eventId(), this.activeSlug(), this.mapKind(), {
      state: this.nodeState(),
      routes: this.routes(),
      strongholds: this.strongholds(),
    });
    this.saving.set(false);
    if (error) {
      this.saveErr.set(true);
      this.saveMsg.set(`Save failed: ${error}`);
    } else {
      this.saveMsg.set(`✓ Saved ${this.mapKind()} map — live on the dashboard now.`);
    }
  }

  downloadGeometry(): void {
    const g = this.geometry();
    if (!g) return;
    const ts = serializeGeometryToTs(g, this.activeSlug());
    const blob = new Blob([ts], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.activeSlug()}.map.ts`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
