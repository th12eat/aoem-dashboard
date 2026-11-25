/**
 * EventData — the NORMALIZED runtime shape every data source resolves to.
 *
 * This is the seam that insulates widgets from (a) the raw 1.0 JSON and (b) the
 * future Supabase schema. Both StaticEventDataSource and (later)
 * SupabaseEventDataSource return this exact shape, so widgets — and the config
 * `bind` paths that target them — never change when the backend does.
 *
 * Normalization rules applied by the data source:
 *  - Numeric-but-string fields ("50,200,000,000", "21,613,610,877", "—") become
 *    a {@link NumericValue}: a sortable `value` plus the exact `display` text.
 *  - Missing arrays default to [] and missing objects to {} so widgets can bind
 *    without null checks.
 *  - Keys stay close to the source names (already camelCase-ish) to keep the
 *    1.0 JSON readable as the single source of truth during coexistence.
 */

/** A number that also carries its original display string (commas, em-dash,
 * suffixes). `value` is NaN when the source was non-numeric (e.g. "—"). */
export interface NumericValue {
  value: number;
  display: string;
}

/** A participating kingdom/server with its map-corner identity + colour. The
 * colour is instance data (the starting corner — and thus the colour — changes
 * per event), so every per-server visual reads it from here, never hardcoded. */
export interface Kingdom {
  server: string;
  /** Display label (e.g. "Era #008"). */
  display: string;
  /** Map corner (e.g. "East"). */
  corner?: string;
  /** Corner colour (hex) — muted, used on the map/scouting/crests. */
  color: string;
  /** Brighter colour for the Kingdom Bar gradient's light end (v1.0 GRAD.top).
   * Optional; falls back to `color` when absent. */
  barColor?: string;
  /** rgb triplet for translucent tints/glows. */
  rgb: string;
  us: boolean;
}

export interface EventMeta {
  eventStart: string;
  eventEnd: string;
  recoveryEnd?: string;
  matchingStart?: string;
  servers: string[];
  ourServer: string;
  ourAlliances: string[];
  corners: Record<string, string>;
  /** Structured per-server identity + colour (data-driven). */
  kingdoms: Kingdom[];
  /** Verbatim headline fight time (e.g. Temple of Zeus), shown in the header. */
  zeusTime?: string;
  notes: string;
  eventOver: boolean;
  /** Prep-war standing (TME): whether prep has begun and the summed totals, so
   * the header can render the dynamic attack/defense badge. Undefined for
   * events without a prep phase. */
  prepStarted?: boolean;
  prepOursTotal?: number;
  prepOppTotal?: number;
}

export interface ScoreboardRow {
  server: string;
  points: NumericValue;
  isOurs: boolean;
  /** Kingdom display label + colour (joined from meta.kingdoms). */
  display: string;
  color: string;
  /** Brighter bar colour (kingdoms.barColor), falls back to color. */
  barColor: string;
  rgb: string;
}

export interface AlliancePointsRow {
  tag: string;
  points: NumericValue;
}

export interface DiplomacyRow {
  id: number;
  server: string;
  alliance: string;
  relation: string;
  notes: string;
  /** Server corner colour (joined from meta.kingdoms). */
  color: string;
  /** Which fronts we fight on: "all" | "none" | a list of front keys. The ROE
   * widget expands this against the front columns the config defines, so the
   * front vocabulary stays in the template and only the per-occurrence value
   * lives in data. */
  fronts: 'all' | 'none' | string[];
  /** Explicit ally flag (relation === 'ally'). */
  ally: boolean;
}

export interface RosterAlliance {
  tag: string;
  name: string;
  power: NumericValue;
  merits: NumericValue;
}

export interface RosterPlayer {
  rank: number;
  name: string;
  alliance: string;
  power: NumericValue;
  merits: NumericValue;
}

export interface ServerRoster {
  server: string;
  sdRank: number | null;
  priority?: string;
  note?: string;
  /** Kingdom display label + colour (joined from meta.kingdoms). */
  display: string;
  color: string;
  rgb: string;
  alliances: RosterAlliance[];
  players: RosterPlayer[];
}

export interface ResearchData {
  ours: ServerRoster;
  opponents: ServerRoster[];
}

/** Matrix: counts per power bracket, per server. */
export interface TierMatrix {
  labels: string[];
  byServer: Record<string, number[]>;
  /** server → corner colour (joined from meta.kingdoms) for column headers. */
  colors: Record<string, string>;
  /** our server name, for the "· Us" marker. */
  ourServer: string;
}

/** Matrix: power/merit curves sampled at rank cut-offs, per server. */
export interface DepthMatrix {
  ranks: number[];
  byServer: Record<string, { power: number[]; merits: number[] }>;
  /** server → corner colour (joined from meta.kingdoms) for column headers. */
  colors: Record<string, string>;
  ourServer: string;
}

/** One prep stage of a two-phase war (TME): a us-vs-opponent point tug. */
export interface PrepStage {
  /** Verbatim stage label (e.g. "Forging Gear"). */
  label: string;
  /** Our points for this stage (already in the chart's unit — billions). */
  ours: number;
  /** Opponent points for this stage. */
  opp: number;
}

/** One alliance in the prep rankings (TME): which side, its prep points, and
 * its per-server rank (drives the teleport offset). */
export interface PrepRankingAlliance {
  tag: string;
  /** 'us' or 'opp' — drives row colour. */
  side: 'us' | 'opp';
  /** Prep points (raw number) used to sort + rank. */
  prepPoints: number;
  /** Per-server rank (1-based) within its own side. */
  serverRank: number;
}

/** The prep-war tug data (TME): per-stage + rolled-up totals. Empty stages ⇒
 * the persistent prep bar shows "not started". */
export interface PrepData {
  stages: PrepStage[];
  /** Our running total across all stages (billions). */
  totalOurs: number;
  /** Opponent running total (billions). */
  totalOpp: number;
  /** Opponent display label (e.g. "Era 24"). */
  oppLabel: string;
  /** Our display label (e.g. "Era #008"). */
  ourLabel: string;
  /** Merged us+opp alliance rankings (for the prepRankings table). */
  rankings?: PrepRankingAlliance[];
}

export interface EventData {
  schemaVersion: number;
  meta: EventMeta;
  /** Last-updated label for the headline kingdom points, if present. */
  pointsUpdatedLabel?: string;
  kingdomScoreboard: ScoreboardRow[];
  alliancePoints: AlliancePointsRow[];
  /** Two-phase prep-war tug (TME). Undefined for events without prep stages. */
  prep?: PrepData;
  diplomacy: DiplomacyRow[];
  research: ResearchData;
  serverTiers: TierMatrix;
  serverDepth: DepthMatrix;
  /** Carried through verbatim for the map widget (shape still event-specific). */
  mapState: Record<string, unknown>;
  mapRoutes: { actual: unknown[]; planned: unknown[] };
  /** Per-alliance node/flag economy (1.0 placerGold). Drives achievement
   * derives (flags/pillars high-water marks). Empty when no live map data. */
  placerGold: PlacerGoldAlliance[];
  /** Placer-gold economy (cap + balances) for the balances table. */
  placer: PlacerGold;
  /** Node Control / buffs rows (derived from map ownership). Empty until live
   * map data exists. */
  nodeControl: NodeControlRow[];
  /** Raw per-node live state + routes (from the data file). The page joins this
   * with the event's map geometry into `mapView` — the single source of truth
   * the map + derived tables read. */
  mapRaw: {
    state: Record<string, unknown>;
    routes: { actual: unknown[]; planned: unknown[] };
    strongholds: unknown[];
    /** Dual-map blobs from the DB (event_map_state). Legacy fields above track
     * the LIVE doc so the economy tables are unaffected; these carry each full
     * map. `plan` is undefined when no plan row has been saved yet. */
    live?: { state: Record<string, unknown>; routes: { actual: unknown[]; planned: unknown[] }; strongholds: unknown[] };
    plan?: { state: Record<string, unknown>; routes: { actual: unknown[]; planned: unknown[] }; strongholds: unknown[] };
  };
  /** alliance tag → server name, derived from ourAlliances + scouting rosters.
   * Lets the map colour opponent-held nodes by their server corner. */
  allianceServer: Record<string, string>;
  /** Derived LIVE map view (single source of truth for the economy tables).
   * Undefined when the event has no map geometry. */
  mapView?: import('./map.model').MapView;
  /** Derived PLAN map view (our-server pre-set plan; falls back to live). */
  mapViewPlan?: import('./map.model').MapView;
  /** Both derived maps for the KvkMap widget's Live/Plan toggle. */
  mapViews?: { live: import('./map.model').MapView; plan: import('./map.model').MapView };
  /** TME Invasion plan overlay (leaders, march arrows, hazards, teleport
   * quarters) for the Imperial City map. Carried verbatim from the doc's
   * `invasionPlan` key; empty-but-present so the map always has something to
   * draw. */
  invasionPlan: import('./invasion-plan.model').InvasionPlan;
}

/** Per-alliance flag/city economy used by achievement progress derives. */
export interface PlacerGoldAlliance {
  tag: string;
  flags: number;
  flagsPeak: number;
  pillarCities: number;
  pillarsPeak: number;
  gates: number;
  /** Current accrued placer-gold balance (tracked value; null if unknown). */
  current: number | null;
  /** Flags currently under construction (shown as "+n"). */
  flagsBuilding: number;
}

/** Placer-gold economy config + per-alliance balances (1.0 placerGold). */
export interface PlacerGold {
  /** Storage cap (bar denominator). */
  cap: number;
  alliances: PlacerGoldAlliance[];
}

/** A row in the Node Control / buffs table — derived from map node ownership.
 * `buffs` is the set of granted buff keys (e.g. 'attack'); `perHour` is passive
 * energy generation. Empty until live map data exists. */
export interface NodeControlRow {
  tag: string;
  server: string;
  color: string;
  rgb: string;
  buffs: string[];
  perHour: number;
}
