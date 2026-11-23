/**
 * Map model — the data contracts for the interactive KvK map.
 *
 * Split into two halves, deliberately:
 *   • GEOMETRY (static, template): where nodes sit, their type, the buff they
 *     grant, the schedule that activates them, server-corner positions. Same for
 *     every occurrence of an event — lives in a per-event geometry definition.
 *   • STATE (per-occurrence, data): who occupies/connects each node, sieges,
 *     and the route paths. Lives in the data file (mapState / mapRoutes).
 *
 * The normalizer joins the two into a DERIVED model (MapView) that is the single
 * source of truth: the buff table, placer-gold balances, node counts, and
 * achievement progress all read from it. An admin connecting two nodes mutates
 * STATE → the derivation recomputes → every derived table updates.
 */

/** Node kinds (shape + behaviour differ per kind). `stronghold` is occupiable
 * AND seeds connectivity for its occupant (Stormlands); `altar` is a plain
 * occupiable site; `aaru`/`palace` is the central objective. */
export type MapNodeType = 'gate' | 'city' | 'tower' | 'altar' | 'stronghold' | 'aaru' | 'anchor';

/** Gate zone transitions, which also set capture schedule + placer rate. */
export type ZoneTransition = 'Z1->Z2' | 'Z2<->Z2' | 'Z2->Z3' | 'Z3->Z4';

/** A buff a node grants while connected + occupied. `key` groups identical
 * buffs into one Node-Control column; `label` is the column header; `magnitude`
 * is the per-node display value (e.g. "+10%"). Buff columns are derived from
 * the distinct buffs present in an event's geometry (per-event, data-driven). */
export interface NodeBuff {
  key: string;
  label: string;
  magnitude: string;
}

/** A non-buff effect note (artisan +1 machine, storage +200k cap, SE/hr) shown
 * in tooltips/tables but NOT as a buff column. */
export interface NodeEffect {
  label: string;
}

/** A static node in the map geometry. */
export interface MapNodeGeo {
  id: string;
  x: number;
  y: number;
  type: MapNodeType;
  /** Verbatim label (tooltip). */
  label: string;
  /** Subtype label, e.g. "Intermediate Energy City" / "Basic Storm Stronghold". */
  subtype?: string;
  /** For gates: which zone boundary it crosses (drives schedule). */
  transition?: ZoneTransition;
  /** Buff granted while connected+occupied (energy cities etc.). */
  buff?: NodeBuff;
  /** Non-buff effect (artisan/storage), shown as a note not a column. */
  effect?: NodeEffect;
  /** Storm Energy / placer gold generated per hour while OCCUPIED. */
  energyPerHour?: number;
  /** True if occupying this node seeds connectivity for its occupant
   * (strongholds). */
  seed?: boolean;
  /** Day offset from eventStart when this node becomes active/capturable.
   * Omit for anchors (never rendered). */
  activeDayOffset?: number;
}

/** A server corner crest hit-area (click-to-focus). */
export interface ServerBadgeGeo {
  server: string;
  x: number;
  y: number;
}

/** Static geometry for one event's map. */
export interface MapGeometry {
  /** SVG viewBox, e.g. "0 0 100 100". */
  viewBox: string;
  /** Raster underlay (relative to app base). */
  underlayAsset: string;
  nodes: MapNodeGeo[];
  serverBadges: ServerBadgeGeo[];
}

// ── per-occurrence STATE (from the data file) ────────────────────────────────

/** Live status of a single node (all optional; sensible defaults applied). */
export interface MapNodeState {
  /** Alliance tag occupying the node (only one). */
  occupant?: string;
  /** Explicit connection flag — used ONLY as a fallback when no SH/SSH seed
   * data exists (historical files). When strongholds are present, connectivity
   * is DERIVED from reachability and this is ignored. */
  connected?: boolean;
  /** Under siege right now. */
  siege?: boolean;
  /** Override the schedule-derived active flag (rare). */
  active?: boolean;
  /** SL only: this Basic/Advanced Stronghold node is the ONE currently-active
   * forward stronghold (only one may seed connectivity at a time, besides the
   * Z1 SH). When set, only this seed:true node seeds for its occupant. */
  activeSeed?: boolean;
}

/** A stronghold seed — an alliance's SH (Z1 home) or an SSH (forward base).
 * Connectivity flows outward from these through the alliance's established
 * routes. An SH is attached to a Z1 gate (and drawn on the corner→gate lane);
 * an SSH is attached to any node it was built next to. */
export interface StrongholdState {
  owner: string;
  /** 'sh' = Z1 home stronghold; 'ssh' = forward sub-stronghold. */
  kind: 'sh' | 'ssh';
  /** Node id this stronghold is attached to (its connection anchor). */
  attachedTo: string;
  siege?: boolean;
}

/** A route/flag path owned by an alliance (candy-striped when shared).
 *
 * Going forward routes are SINGLE EDGES (path length 2), one owner each; the
 * renderer merges per node-pair so two owners candy-stripe. Legacy DD data may
 * still carry multi-node paths — the per-segment split handles both. */
export interface MapRoute {
  owner: string;
  path: string[];
  /** Build lifecycle: `pathing` = still being built (dashed/animated),
   * `complete` = established. Supersedes building/partial for new data. */
  lifecycle?: 'pathing' | 'complete';
  /** Enemy severed this edge: it stops conducting connectivity (removed from
   * the BFS graph) and renders severed. The non-SH/SSH side goes inactive. */
  cut?: boolean;
  ssh?: boolean;
  connected?: boolean;
  building?: boolean;
  partial?: boolean;
  siege?: boolean;
  sshSiege?: boolean;
  sshAt?: number;
  sshOutward?: boolean;
  sshOutDist?: number;
  sshFrac?: number;
  noLine?: boolean;
  /** Derived by deriveMapView (not stored): both endpoints reachable to an
   * SH/SSH over non-cut edges for this owner. */
  active?: boolean;
  /** Derived: === !!cut — render the edge as severed. */
  severed?: boolean;
}

// ── DERIVED model (normalizer output; single source of truth) ────────────────

/** A node joined with its live status + derived flags, ready to render. */
export interface MapNodeView extends MapNodeGeo {
  occupant: string | null;
  connected: boolean;
  siege: boolean;
  active: boolean;
  /** buff is counted (node connected AND occupied). */
  buffActive: boolean;
  /** energy / placer gold per hour this node yields (occupied only;
   * independent of connection). */
  placerPerHour: number;
}

/** Per-alliance holdings derived from the occupied nodes. Feeds the buff table,
 * placer-gold balances, node counts, and achievement progress. */
export interface AllianceHoldings {
  tag: string;
  server: string;
  /** Flat server corner colour. */
  color: string;
  /** Distinct in-family shade (so a server's 4 alliances are individually
   * legible on the map / in the focus breakout). */
  shade: string;
  rgb: string;
  /** Active buff keys (from connected+occupied buff nodes; no stacking). */
  buffs: string[];
  placerPerHour: number;
  cities: number;
  /** Total gates held (back-compat flat count). */
  gates: number;
  /** Gates held broken out by transition — each yields different placer gold
   * (Z1→Z2 = 3k/h, Z2↔Z2 = 4k/h, Z2→Z3 = 8k/h). Sums to `gates`. */
  gatesZ1Z2: number;
  gatesZ2Z2: number;
  gatesZ2Z3: number;
  /** Pillar cities held. Pillars grant buffs/achievements but NO placer gold. */
  pillars: number;
  towers: number;
  /** Holds the central objective (Aaru / Temple of Zeus core). */
  aaru: boolean;
}

/** A buff column for the Node-Control table, derived from the event's geometry
 * (the distinct buffs present). */
export interface BuffColumn {
  key: string;
  label: string;
}

/** A stronghold positioned for rendering (SH on the corner→gate lane; SSH next
 * to its attached node). */
export interface StrongholdView {
  owner: string;
  kind: 'sh' | 'ssh';
  x: number;
  y: number;
  color: string;
  siege: boolean;
  fade: boolean;
}

/** The fully-derived map view — everything downstream reads this. */
export interface MapView {
  nodes: MapNodeView[];
  routes: { actual: MapRoute[]; planned: MapRoute[] };
  strongholds: StrongholdView[];
  holdings: AllianceHoldings[];
  /** Distinct buff columns present in this event's geometry (per-event). */
  buffColumns: BuffColumn[];
  /** Our server name (from the kingdom marked `us`) — for the legend's alliance
   * key vs opponent server key split. */
  ourServer: string;
}
