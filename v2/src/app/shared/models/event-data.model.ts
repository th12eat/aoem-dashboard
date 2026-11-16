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

export interface EventMeta {
  eventStart: string;
  eventEnd: string;
  recoveryEnd?: string;
  matchingStart?: string;
  servers: string[];
  ourServer: string;
  ourAlliances: string[];
  corners: Record<string, string>;
  notes: string;
  eventOver: boolean;
}

export interface ScoreboardRow {
  server: string;
  points: NumericValue;
  isOurs: boolean;
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
}

/** Matrix: power/merit curves sampled at rank cut-offs, per server. */
export interface DepthMatrix {
  ranks: number[];
  byServer: Record<string, { power: number[]; merits: number[] }>;
}

export interface EventData {
  schemaVersion: number;
  meta: EventMeta;
  /** Last-updated label for the headline kingdom points, if present. */
  pointsUpdatedLabel?: string;
  kingdomScoreboard: ScoreboardRow[];
  alliancePoints: AlliancePointsRow[];
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
}

/** Per-alliance flag/city economy used by achievement progress derives. */
export interface PlacerGoldAlliance {
  tag: string;
  flags: number;
  flagsPeak: number;
  pillarCities: number;
  pillarsPeak: number;
  gates: number;
}
