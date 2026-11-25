/**
 * Imperial City (TME Invasion) battlefield geometry — a PURE VECTOR layout.
 *
 * Unlike Desolate/Stormlands (raster underlay + the deriveMapView occupy/connect
 * engine), the invasion map is drawn entirely from these coordinates so the two
 * halves can be RE-COLOURED and FLIPPED at runtime (attacker = blue, defender =
 * red, keyed to who leads prep). A baked image can't do that; vectors can, and
 * they stay crisp at any zoom while shipping in ~3 KB instead of a 10 MB PNG.
 *
 * Coordinate space is the original screenshot's pixel frame (the build kit's
 * JSON); the component renders it under a fitted SVG viewBox. The rotated-axes
 * note from the kit: a = x + y, b = x - y — every non-cliff wall is constant in
 * a or b, so all those corners are true 90°.
 *
 * Nine nodes total, matching the in-game battlefield:
 *   • 1 Imperial City  — centre objective, occupiable (r≈89)
 *   • 4 Sacred Towers  — N Sword · E Arrow · S Cavalry · W Pike, each a unique
 *                        buff, occupiable (r≈40)
 *   • 4 City Gates     — on the courtyard-wall diagonals; NOT occupiable, only
 *                        destroyed to walk through (the path into the IC).
 * The IC sits inside a circular wall; the ONLY ways in are the four gates, so a
 * march targeting the IC must route through its nearest gate (no wall-hopping).
 */

export type IcNodeKind = 'city' | 'tower' | 'gate';
export type IcCompass = 'N' | 'E' | 'S' | 'W';

export interface IcNode {
  id: string;
  kind: IcNodeKind;
  label: string;
  /** Centre in screenshot-pixel space. */
  x: number;
  y: number;
  /** Render radius (towers/city); gates use a fixed small marker. */
  r?: number;
  /** Compass position (towers + gates). */
  compass?: IcCompass;
  /** Tower sprite hint from the kit (square vs round) — purely cosmetic. */
  model?: 'square' | 'round';
  /** Tower buff descriptor (unique per tower). */
  buff?: string;
  /** Can an alliance occupy/hold this node? Gates cannot (destroy-only). */
  occupiable: boolean;
}

/** A point in battlefield (screenshot-pixel) space. */
export interface IcPoint {
  x: number;
  y: number;
}

export interface ImperialCityGeometry {
  /** Fitted SVG viewBox "minX minY width height". */
  viewBox: string;
  /** Outer battlefield diamond (the fightable bounds). */
  diamond: string;
  /** The two halves. `left` is the NW half, `right` the SE half. By design the
   * ATTACKER holds `left` (blue) and the DEFENDER holds `right` (red); the
   * renderer swaps the tint when we're on defence. */
  zoneLeft: string;
  zoneRight: string;
  /** Imperial City courtyard: the circular wall + the four radial gate roads. */
  courtyard: {
    center: IcPoint;
    wallRadius: number;
    plazaRadius: number;
    roadWidth: number;
    /** gate id → [innerEnd, gateCenter] road segment. */
    roads: Record<string, [IcPoint, IcPoint]>;
  };
  nodes: IcNode[];
  /** For each node, the gate a march must pass through to legally reach it (the
   * IC + towers are walled; gates route to themselves). Used to bend a rally /
   * siege line to the IC through its nearest gate rather than over the wall. */
  gateFor: Record<string, string>;
}

// ── polygons (simplified from the build kit; ~3 KB total) ───────────────────
const DIAMOND = '908.5,109.5 1425,626 1386,665 1454.5,733.5 1008,1180 423,595';

const ZONE_LEFT =
  '908.5,109.5 860,61 857,89.3 813.5,106.7 790.8,128.1 776.8,150.3 766,158.3 722.7,168.3 656.2,190.6 535.2,194.6 485.7,211.8 457,245.9 420.8,259.2 398.6,274.4 359.2,326.3 348.9,330.3 331.5,325.5 183.5,473.5 213,503 105.5,610.5 274,779 289.2,759.4 297.3,755.7 338.2,782.8 348.2,796.5 361.7,828.6 400.5,869.1 428.5,919.8 445.3,942.3 464.4,953.1 507.1,963.6 533.1,982.8 545.1,1001.7 554,1030.2 555.2,1053.6 549.8,1098.8 568.2,1119.4 614.9,1145.4 745,1181.8 867.7,1209.2 928.5,1232.2 975,1244.9 1012.5,1262.5 1051.5,1223.5 423,595';

const ZONE_RIGHT =
  '908.5,109.5 1425,626 1386,665 1454.5,733.5 1008,1180 1051.5,1223.5 1012.5,1262.5 1019.2,1295 1015.4,1316.5 1001.7,1327.8 988,1328 1146,1486 1287,1345 1223.5,1281.5 1475.5,1029.5 1456,985.7 1456.4,967.9 1464.7,951 1481.5,934.4 1513.8,913 1597.2,877.4 1614,857.2 1616.4,832.9 1607.9,747.1 1600,710.9 1553.1,613.5 1532.5,557.9 1493.1,507.9 1484.8,485.2 1486.6,460.8 1497.8,438.6 1519.1,417.9 1544.5,404.5 1461.5,321.5 1396.5,386.5 934,-76 838,20 856.6,33.6 860,61';

export const IMPERIAL_CITY_GEOMETRY: ImperialCityGeometry = {
  viewBox: '76 -106 1571 1622',
  diamond: DIAMOND,
  zoneLeft: ZONE_LEFT,
  zoneRight: ZONE_RIGHT,
  courtyard: {
    center: { x: 958.2, y: 644.8 },
    wallRadius: 168,
    plazaRadius: 96,
    roadWidth: 22,
    roads: {
      'gate-north': [{ x: 890.4, y: 576.9 }, { x: 839.5, y: 526.0 }],
      'gate-east': [{ x: 1026.1, y: 576.9 }, { x: 1077.0, y: 526.0 }],
      'gate-south': [{ x: 1026.1, y: 712.6 }, { x: 1077.0, y: 763.5 }],
      'gate-west': [{ x: 890.4, y: 712.6 }, { x: 839.5, y: 763.5 }],
    },
  },
  nodes: [
    { id: 'imperial-city', kind: 'city', label: 'Imperial City', x: 958.2, y: 644.8, r: 89, occupiable: true },
    { id: 'tower-sword', kind: 'tower', label: 'Sword Sacred Tower', x: 958.2, y: 334.8, r: 40, compass: 'N', model: 'square', buff: 'Attack', occupiable: true },
    { id: 'tower-arrow', kind: 'tower', label: 'Arrow Sacred Tower', x: 1268.2, y: 644.8, r: 40, compass: 'E', model: 'round', buff: 'Damage', occupiable: true },
    { id: 'tower-cavalry', kind: 'tower', label: 'Cavalry Sacred Tower', x: 958.2, y: 954.8, r: 40, compass: 'S', model: 'square', buff: 'Defense', occupiable: true },
    { id: 'tower-pike', kind: 'tower', label: 'Pike Sacred Tower', x: 648.2, y: 644.8, r: 40, compass: 'W', model: 'round', buff: 'Health', occupiable: true },
    { id: 'gate-north', kind: 'gate', label: 'North City Gate', x: 839.5, y: 526.0, compass: 'N', occupiable: false },
    { id: 'gate-east', kind: 'gate', label: 'East City Gate', x: 1077.0, y: 526.0, compass: 'E', occupiable: false },
    { id: 'gate-south', kind: 'gate', label: 'South City Gate', x: 1077.0, y: 763.5, compass: 'S', occupiable: false },
    { id: 'gate-west', kind: 'gate', label: 'West City Gate', x: 839.5, y: 763.5, compass: 'W', occupiable: false },
  ],
  // The IC is walled — reach it only through a gate. Towers sit OUTSIDE the wall
  // so they route to themselves; gates are their own pass-through.
  gateFor: {
    'imperial-city': '', // resolved per-source to the NEAREST gate (see nearestGate)
    'tower-sword': 'tower-sword',
    'tower-arrow': 'tower-arrow',
    'tower-cavalry': 'tower-cavalry',
    'tower-pike': 'tower-pike',
    'gate-north': 'gate-north',
    'gate-east': 'gate-east',
    'gate-south': 'gate-south',
    'gate-west': 'gate-west',
  },
};

/** The four gate ids (the only legal entries to the IC). */
export const IC_GATE_IDS = ['gate-north', 'gate-east', 'gate-south', 'gate-west'] as const;

/** Look up a node by id. */
export function icNode(id: string): IcNode | undefined {
  return IMPERIAL_CITY_GEOMETRY.nodes.find(n => n.id === id);
}

/** The gate nearest a given point (for routing a march into the walled IC from
 * wherever the source leader stands — "can't hop over the wall"). */
export function nearestGate(from: IcPoint): IcNode {
  let best = icNode(IC_GATE_IDS[0])!;
  let bestD = Infinity;
  for (const gid of IC_GATE_IDS) {
    const g = icNode(gid)!;
    const d = (g.x - from.x) ** 2 + (g.y - from.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = g;
    }
  }
  return best;
}
