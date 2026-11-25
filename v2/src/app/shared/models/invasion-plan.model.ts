/**
 * Invasion-plan data model — the PLAN overlay for the TME Imperial City map.
 *
 * This is deliberately NOT the deriveMapView occupy/connect state (that engine
 * models who-holds-what over time). The invasion plan is a strategist's battle
 * drawing: where each alliance's rally + siege leaders stand, which node/point
 * they march on, where siege hazard zones are, and which quarter of the staging
 * tile each alliance teleports into. It is stored verbatim under the TME
 * occurrence doc's `invasionPlan` key (no new table) and rendered by the shared
 * IC map in both the dashboard (read-only) and the data editor (editable).
 *
 * All coordinates are in the battlefield's screenshot-pixel space (same frame
 * as imperial-city.geo.ts), so points and node ids interoperate directly.
 */

/** Which side we are this occurrence. Attacker holds the blue (left) zone;
 * defender holds the red (right) zone. Derived from prep totals (the prep
 * leader attacks) but can be pinned explicitly on the plan. */
export type InvasionSide = 'attack' | 'defend';

/** A leader marker — one rally lead and/or one siege lead per alliance. */
export type LeaderRole = 'rally' | 'siege';

export interface InvasionLeader {
  /** Alliance tag this leader belongs to. */
  tag: string;
  role: LeaderRole;
  x: number;
  y: number;
}

/** A march line from a leader toward a target. Rally lines render solid; siege
 * lines render dashed + animated. When the target is the walled Imperial City,
 * the renderer bends the line through the nearest gate (no wall-hopping). */
export interface InvasionArrow {
  tag: string;
  role: LeaderRole;
  /** Source leader anchor. */
  from: { x: number; y: number };
  /** Target: a node id (`toNode`) OR a free point (`to`). */
  toNode?: string;
  to?: { x: number; y: number };
}

/** A siege-hazard marker — an area to avoid / expect bombardment. */
export interface InvasionHazard {
  x: number;
  y: number;
  /** Optional short note (e.g. "treb line"). */
  note?: string;
}

/** A teleport-quarter assignment: an alliance claims one quarter (NW/NE/SE/SW)
 * of the staging zone. Alliances may hold more than one quarter. The quarter is
 * resolved against whichever zone is ours this occurrence (attack=left,
 * defend=right), so the tint lands on the correct half automatically. */
export type TeleportQuarter = 'NW' | 'NE' | 'SE' | 'SW';

export interface InvasionTeleport {
  tag: string;
  quarter: TeleportQuarter;
}

export interface InvasionPlan {
  /** Explicit side override; when absent the renderer falls back to the prep
   * totals (prep leader = attacker). */
  side?: InvasionSide;
  leaders: InvasionLeader[];
  arrows: InvasionArrow[];
  hazards: InvasionHazard[];
  teleport: InvasionTeleport[];
}

/** An empty plan (editor fresh-start / missing data). */
export function emptyInvasionPlan(): InvasionPlan {
  return { leaders: [], arrows: [], hazards: [], teleport: [] };
}

/**
 * Alliance marker palette — amber / teal / violet / lime. Chosen to stay
 * distinct from each other AND readable on BOTH the blue (us) and red (them)
 * zone tints: none is a pure blue or red, so a marker never camouflages into
 * its zone. Assigned by the alliance's order in Event Setup (index 0..3); a 5th+
 * alliance wraps. Keep in sync with the editor legend + dashboard legend.
 */
export const INVASION_ALLIANCE_COLORS = ['#f5a623', '#2dd4bf', '#a855f7', '#84cc16'] as const;

/** Colour for an alliance by its index among our alliances (wraps past 4). */
export function invasionAllianceColor(index: number): string {
  return INVASION_ALLIANCE_COLORS[((index % INVASION_ALLIANCE_COLORS.length) + INVASION_ALLIANCE_COLORS.length) % INVASION_ALLIANCE_COLORS.length];
}
