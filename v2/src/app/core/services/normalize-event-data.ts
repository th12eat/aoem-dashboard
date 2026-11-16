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
} from '@shared/models/event-data.model';
import { toNumericValue } from '@shared/utils/numeric';

/** Raw record coming off the wire (1.0 schemaVersion 2 JSON). Deliberately
 * loose — normalization is the one place that touches raw shapes. */
type Raw = Record<string, unknown>;

function asArray(v: unknown): Raw[] {
  return Array.isArray(v) ? (v as Raw[]) : [];
}
function asObject(v: unknown): Raw {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : {};
}
function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function normalizeMeta(raw: Raw): EventMeta {
  const c = asObject(raw['eventConfig']);
  return {
    eventStart: str(c['eventStart']),
    eventEnd: str(c['eventEnd']),
    recoveryEnd: str(c['recoveryEnd']) || undefined,
    matchingStart: str(c['matchingStart']) || undefined,
    servers: asArray(c['servers']).map(String) as unknown as string[],
    ourServer: str(c['ourServer']),
    ourAlliances: asArray(c['ourAlliances']).map(String) as unknown as string[],
    corners: asObject(c['corners']) as Record<string, string>,
    notes: str(c['notes']),
    eventOver: c['eventOver'] === true,
  };
}

function normalizeRoster(raw: Raw): ServerRoster {
  return {
    server: str(raw['server']),
    sdRank: typeof raw['sdRank'] === 'number' ? (raw['sdRank'] as number) : null,
    priority: str(raw['priority']) || undefined,
    note: str(raw['note']) || undefined,
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

  const research = asObject(raw['research']);

  return {
    schemaVersion: typeof raw['schemaVersion'] === 'number' ? (raw['schemaVersion'] as number) : 0,
    meta,
    pointsUpdatedLabel: str(points['lastUpdated']) || undefined,
    kingdomScoreboard: asArray(raw['kingdomScoreboard']).map(
      (r): ScoreboardRow => ({
        server: str(r['server']),
        points: toNumericValue(r['points']),
        isOurs: str(r['server']) === ourServer,
      }),
    ),
    alliancePoints: asArray(raw['alliancePoints']).map(
      (r): AlliancePointsRow => ({
        tag: str(r['tag']),
        points: toNumericValue(r['points']),
      }),
    ),
    diplomacy: asArray(raw['diplomacy']).map(
      (r): DiplomacyRow => ({
        id: typeof r['id'] === 'number' ? (r['id'] as number) : 0,
        server: str(r['server']),
        alliance: str(r['alliance']),
        relation: str(r['relation']),
        notes: str(r['notes']),
      }),
    ),
    research: {
      ours: normalizeRoster(asObject(research['ours'])),
      opponents: asArray(research['opponents']).map(normalizeRoster),
    },
    serverTiers: normalizeTiers(asObject(raw['serverTiers'])),
    serverDepth: normalizeDepth(asObject(raw['serverDepth'])),
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
    })),
  };
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function normalizeTiers(raw: Raw): TierMatrix {
  const byServerRaw = asObject(raw['byServer']);
  const byServer: Record<string, number[]> = {};
  for (const [server, counts] of Object.entries(byServerRaw)) {
    byServer[server] = asArray(counts).map(n => (typeof n === 'number' ? n : 0)) as unknown as number[];
  }
  return {
    labels: asArray(raw['labels']).map(String) as unknown as string[],
    byServer,
  };
}

function normalizeDepth(raw: Raw): DepthMatrix {
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
  };
}
