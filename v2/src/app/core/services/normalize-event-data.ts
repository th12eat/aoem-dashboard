import type {
  EventData,
  ScoreboardRow,
  AlliancePointsRow,
  DiplomacyRow,
  ServerRoster,
  RosterAlliance,
  RosterPlayer,
  TierMatrix,
  DepthMatrix,
  EventMeta,
  Kingdom,
  PrepData,
} from '@shared/models/event-data.model';
import { toNumericValue } from '@shared/utils/numeric';

/** Raw record coming off the wire (1.0 schemaVersion 2 JSON). Deliberately
 * loose — normalization is the one place that touches raw shapes. */
type Raw = Record<string, unknown>;

/** Neutral fallback colour for a server with no kingdoms entry. */
const UNKNOWN_KINGDOM = { display: '', color: '#8a90a5', rgb: '138,144,165' };

function asArray(v: unknown): Raw[] {
  return Array.isArray(v) ? (v as Raw[]) : [];
}
function asObject(v: unknown): Raw {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : {};
}
function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function normalizeKingdoms(raw: Raw): Kingdom[] {
  return asArray(raw['kingdoms']).map(k => ({
    server: str(k['server']),
    display: str(k['display']) || str(k['server']),
    corner: str(k['corner']) || undefined,
    color: str(k['color']) || UNKNOWN_KINGDOM.color,
    barColor: str(k['barColor']) || undefined,
    rgb: str(k['rgb']) || UNKNOWN_KINGDOM.rgb,
    us: k['us'] === true,
  }));
}

function normalizeMeta(raw: Raw): EventMeta {
  const c = asObject(raw['eventConfig']);
  const prep = asObject(raw['prep']);
  const prepStages = asArray(prep['stages']);
  const hasPrep = prepStages.length > 0;
  return {
    eventStart: str(c['eventStart']),
    eventEnd: str(c['eventEnd']),
    recoveryEnd: str(c['recoveryEnd']) || undefined,
    matchingStart: str(c['matchingStart']) || undefined,
    servers: asArray(c['servers']).map(String) as unknown as string[],
    ourServer: str(c['ourServer']),
    ourAlliances: asArray(c['ourAlliances']).map(String) as unknown as string[],
    corners: asObject(c['corners']) as Record<string, string>,
    kingdoms: normalizeKingdoms(c),
    zeusTime: str(c['zeusTime']) || undefined,
    notes: str(c['notes']),
    eventOver: c['eventOver'] === true,
    // Prep standing for the header's attack/defense badge: "started" once any
    // stage has points; totals are the summed tug (already in billions).
    prepStarted: hasPrep ? prepStages.some(s => num(s['ours']) > 0 || num(s['opp']) > 0) : undefined,
    prepOursTotal: hasPrep ? num(prep['totalOurs']) : undefined,
    prepOppTotal: hasPrep ? num(prep['totalOpp']) : undefined,
  };
}

/** Lookup from server name → its kingdom identity/colour (data-driven). */
type KingdomLookup = (server: string) => { display: string; color: string; barColor: string; rgb: string };
function kingdomLookup(kingdoms: Kingdom[]): KingdomLookup {
  const map = new Map(kingdoms.map(k => [k.server, k]));
  return server => {
    const k = map.get(server);
    return k
      ? { display: k.display, color: k.color, barColor: k.barColor ?? k.color, rgb: k.rgb }
      : { ...UNKNOWN_KINGDOM, display: server, barColor: UNKNOWN_KINGDOM.color };
  };
}

function normalizeRoster(raw: Raw, kd: KingdomLookup): ServerRoster {
  const server = str(raw['server']);
  const k = kd(server);
  return {
    server,
    sdRank: typeof raw['sdRank'] === 'number' ? (raw['sdRank'] as number) : null,
    priority: str(raw['priority']) || undefined,
    note: str(raw['note']) || undefined,
    display: k.display || server,
    color: k.color,
    rgb: k.rgb,
    alliances: asArray(raw['alliances']).map(
      (a): RosterAlliance => ({
        tag: str(a['tag']),
        name: str(a['name']),
        power: toNumericValue(a['power']),
        merits: toNumericValue(a['merits']),
      }),
    ),
    players: asArray(raw['players']).map(
      (p): RosterPlayer => ({
        rank: typeof p['rank'] === 'number' ? (p['rank'] as number) : 0,
        name: str(p['name']),
        alliance: str(p['alliance']),
        power: toNumericValue(p['power']),
        merits: toNumericValue(p['merits']),
      }),
    ),
  };
}

/**
 * Map a raw event JSON document into the normalized {@link EventData}.
 * Pure + total: any missing/garbage field degrades to a sane default so the
 * widgets can bind without null guards. This is the ONLY code that knows the
 * raw 1.0 shape; everything downstream speaks EventData.
 */
export function normalizeEventData(input: unknown): EventData {
  const raw = asObject(input);
  const points = asObject(raw['kingdomPoints']);
  const meta = normalizeMeta(raw);
  const ourServer = meta.ourServer;
  const kd = kingdomLookup(meta.kingdoms);

  const research = asObject(raw['research']);

  // alliance tag → server: our alliances map to ourServer; each opponent
  // roster's alliances map to that roster's server. Used by the map to colour
  // opponent-held nodes by their corner.
  const allianceServer: Record<string, string> = {};
  for (const tag of meta.ourAlliances) allianceServer[tag] = ourServer;
  const oursRoster = asObject(research['ours']);
  for (const a of asArray(oursRoster['alliances'])) {
    const tag = str(a['tag']);
    if (tag) allianceServer[tag] = ourServer;
  }
  for (const opp of asArray(research['opponents'])) {
    const server = str(opp['server']);
    for (const a of asArray(opp['alliances'])) {
      const tag = str(a['tag']);
      if (tag) allianceServer[tag] = server;
    }
  }

  return {
    schemaVersion: typeof raw['schemaVersion'] === 'number' ? (raw['schemaVersion'] as number) : 0,
    meta,
    pointsUpdatedLabel: str(points['lastUpdated']) || undefined,
    kingdomScoreboard: asArray(raw['kingdomScoreboard']).map((r): ScoreboardRow => {
      const server = str(r['server']);
      const k = kd(server);
      return {
        server,
        points: toNumericValue(r['points']),
        isOurs: server === ourServer,
        display: k.display || server,
        color: k.color,
        barColor: k.barColor,
        rgb: k.rgb,
      };
    }),
    alliancePoints: asArray(raw['alliancePoints']).map(
      (r): AlliancePointsRow => ({
        tag: str(r['tag']),
        points: toNumericValue(r['points']),
      }),
    ),
    prep: normalizePrep(asObject(raw['prep'])),
    diplomacy: asArray(raw['diplomacy']).map((r): DiplomacyRow => {
      const server = str(r['server']);
      const relation = str(r['relation']);
      const rawFronts = r['fronts'];
      const fronts: 'all' | 'none' | string[] = Array.isArray(rawFronts)
        ? (rawFronts as unknown[]).map(String)
        : rawFronts === 'all'
          ? 'all'
          : 'none';
      return {
        id: typeof r['id'] === 'number' ? (r['id'] as number) : 0,
        server,
        alliance: str(r['alliance']),
        relation,
        notes: str(r['notes']),
        color: kd(server).color,
        fronts,
        ally: relation.toLowerCase() === 'ally',
      };
    }),
    research: {
      ours: normalizeRoster(asObject(research['ours']), kd),
      opponents: asArray(research['opponents']).map(o => normalizeRoster(o, kd)),
    },
    serverTiers: normalizeTiers(asObject(raw['serverTiers']), kd, ourServer),
    serverDepth: normalizeDepth(asObject(raw['serverDepth']), kd, ourServer),
    mapState: asObject(raw['mapState']),
    mapRoutes: {
      actual: asArray(asObject(raw['mapRoutes'])['actual']),
      planned: asArray(asObject(raw['mapRoutes'])['planned']),
    },
    placerGold: asArray(asObject(raw['placerGold'])['alliances']).map(a => ({
      tag: str(a['tag']),
      flags: num(a['flags']),
      flagsPeak: num(a['flagsPeak']),
      pillarCities: num(a['pillarCities']),
      pillarsPeak: num(a['pillarsPeak']),
      gates: num(a['gates']),
      current: typeof a['current'] === 'number' ? (a['current'] as number) : null,
      flagsBuilding: num(a['flagsBuilding']),
    })),
    placer: {
      cap: num(asObject(raw['placerGold'])['cap']) || 500000,
      alliances: asArray(asObject(raw['placerGold'])['alliances']).map(a => ({
        tag: str(a['tag']),
        flags: num(a['flags']),
        flagsPeak: num(a['flagsPeak']),
        pillarCities: num(a['pillarCities']),
        pillarsPeak: num(a['pillarsPeak']),
        gates: num(a['gates']),
        current: typeof a['current'] === 'number' ? (a['current'] as number) : null,
        flagsBuilding: num(a['flagsBuilding']),
      })),
    },
    mapRaw: {
      state: asObject(raw['mapState']),
      routes: {
        actual: asArray(asObject(raw['mapRoutes'])['actual']),
        planned: asArray(asObject(raw['mapRoutes'])['planned']),
      },
      strongholds: asArray(raw['strongholds']),
    },
    allianceServer,
    nodeControl: asArray(raw['nodeControl']).map(n => {
      const server = str(n['server']);
      const k = kd(server);
      return {
        tag: str(n['tag']),
        server,
        color: k.color,
        rgb: k.rgb,
        buffs: Array.isArray(n['buffs']) ? (n['buffs'] as unknown[]).map(String) : [],
        perHour: num(n['perHour']),
      };
    }),
    invasionPlan: normalizeInvasionPlan(asObject(raw['invasionPlan'])),
  };
}

/** Normalize the TME Invasion plan (leaders/arrows/hazards/teleport). Pure +
 * total: any missing field yields an empty-but-present plan so the IC map always
 * has something to render. The one place that knows the raw plan shape. */
function normalizeInvasionPlan(raw: Raw): import('@shared/models/invasion-plan.model').InvasionPlan {
  const role = (v: unknown): 'rally' | 'siege' => (v === 'siege' ? 'siege' : 'rally');
  const pt = (v: unknown): { x: number; y: number } => ({ x: num(asObject(v)['x']), y: num(asObject(v)['y']) });
  const side = raw['side'] === 'defend' ? 'defend' : raw['side'] === 'attack' ? 'attack' : undefined;
  return {
    side,
    leaders: asArray(raw['leaders']).map(l => ({ tag: str(l['tag']), role: role(l['role']), x: num(l['x']), y: num(l['y']) })),
    arrows: asArray(raw['arrows']).map(a => {
      const base = { tag: str(a['tag']), role: role(a['role']), from: pt(a['from']) };
      return a['toNode'] ? { ...base, toNode: str(a['toNode']) } : { ...base, to: pt(a['to']) };
    }),
    hazards: asArray(raw['hazards']).map(h => ({ x: num(h['x']), y: num(h['y']), note: str(h['note']) || undefined })),
    teleport: asArray(raw['teleport']).map(t => ({
      tag: str(t['tag']),
      quarter: (['NW', 'NE', 'SE', 'SW'].includes(str(t['quarter'])) ? str(t['quarter']) : 'NW') as 'NW' | 'NE' | 'SE' | 'SW',
    })),
  };
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function colorMap(servers: string[], kd: KingdomLookup): Record<string, string> {
  const colors: Record<string, string> = {};
  for (const s of servers) colors[s] = kd(s).color;
  return colors;
}

/** Normalize the prep-war tug block (TME). Returns undefined when absent so the
 * page only renders the prep bar for events that actually have stages. Point
 * values pass through as plain numbers (already in the chart's billions unit). */
function normalizePrep(raw: Raw): PrepData | undefined {
  const stagesRaw = asArray(raw['stages']);
  if (!stagesRaw.length) return undefined;
  // Rankings: rank each side internally by prep points (desc), then carry both.
  const rankSide = (list: Raw[], side: 'us' | 'opp') =>
    list
      .map(a => ({ tag: str(a['tag']), side, prepPoints: num(a['prepPoints']) }))
      .sort((x, y) => y.prepPoints - x.prepPoints)
      .map((a, i) => ({ ...a, serverRank: i + 1 }));
  const rankings = [...rankSide(asArray(raw['ourRankings']), 'us'), ...rankSide(asArray(raw['oppRankings']), 'opp')];
  return {
    stages: stagesRaw.map(s => ({
      label: str(s['label']),
      ours: num(s['ours']),
      opp: num(s['opp']),
    })),
    totalOurs: num(raw['totalOurs']),
    totalOpp: num(raw['totalOpp']),
    oppLabel: str(raw['oppLabel']) || 'Opponent',
    ourLabel: str(raw['ourLabel']) || 'Us',
    rankings: rankings.length ? rankings : undefined,
  };
}

function normalizeTiers(raw: Raw, kd: KingdomLookup, ourServer: string): TierMatrix {
  const byServerRaw = asObject(raw['byServer']);
  const byServer: Record<string, number[]> = {};
  for (const [server, counts] of Object.entries(byServerRaw)) {
    byServer[server] = asArray(counts).map(n => (typeof n === 'number' ? n : 0)) as unknown as number[];
  }
  return {
    labels: asArray(raw['labels']).map(String) as unknown as string[],
    byServer,
    colors: colorMap(Object.keys(byServer), kd),
    ourServer,
  };
}

function normalizeDepth(raw: Raw, kd: KingdomLookup, ourServer: string): DepthMatrix {
  const byServerRaw = asObject(raw['byServer']);
  const byServer: Record<string, { power: number[]; merits: number[] }> = {};
  for (const [server, curves] of Object.entries(byServerRaw)) {
    const c = asObject(curves);
    byServer[server] = {
      power: asArray(c['power']).map(n => (typeof n === 'number' ? n : 0)) as unknown as number[],
      merits: asArray(c['merits']).map(n => (typeof n === 'number' ? n : 0)) as unknown as number[],
    };
  }
  return {
    ranks: asArray(raw['ranks']).map(n => (typeof n === 'number' ? n : 0)) as unknown as number[],
    byServer,
    colors: colorMap(Object.keys(byServer), kd),
    ourServer,
  };
}
