/**
 * Adopt adapters — map a committed 1.0 static JSON doc into the v2 normalized
 * doc shape (the one {@link normalizeEventData} reads + the data-editor writes).
 *
 * Context: Stormlands/Desolate were rebuilt into the v2 shape when their configs
 * were authored, so their static JSON needs no adaptation. The other event types
 * (TME, Behemoth, Primordial) still carry their ORIGINAL 1.0 per-event schemas.
 * When an admin "adopts" one — turning a static-only dashboard into an editable
 * DB occurrence — we seed the occurrence's doc from the static JSON so the
 * existing scouting/points data survives. This file is the ONE place that knows
 * each legacy shape; everything downstream speaks the v2 doc.
 *
 * Each adapter is pure: (rawStaticJson) → v2 doc. A slug with no adapter is
 * assumed already-v2-shaped and passed through verbatim.
 */
import { toNumericValue } from '@shared/utils/numeric';

type Doc = Record<string, unknown>;

function asArray(v: unknown): Doc[] {
  return Array.isArray(v) ? (v as Doc[]) : [];
}
function asObject(v: unknown): Doc {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Doc) : {};
}
function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}
// The adapter emits the RAW doc shape (the one normalizeEventData reads) — NOT
// the normalized shape. So power/merits/points stay as their original 1.0
// values (comma strings or numbers); the normalizer runs toNumericValue once.
function rosterAlliance(a: Doc): Doc {
  return { tag: str(a['tag']), name: str(a['name']), power: a['power'], merits: a['merits'] };
}
function rosterPlayer(p: Doc): Doc {
  return {
    rank: typeof p['rank'] === 'number' ? p['rank'] : 0,
    name: str(p['name']),
    alliance: str(p['alliance']),
    power: p['power'],
    merits: p['merits'],
  };
}

/** TME prep stage nameKey → readable label (the five daily scoring stages). */
const TME_STAGE_LABELS: Record<string, string> = {
  prepStage1: 'Forging Gear',
  prepStage2: 'Enhancing Buildings',
  prepStage3: 'Enhancing Technologies',
  prepStage4: 'Unit Training',
  prepStage5: 'Power Boost',
};

/** Build the prep-tug block from the 1.0 `prepStages` + totals. Point values are
 * already in billions in the 1.0 data (ourPts/oppPts/totalOur/totalOpp). Also
 * emits the merged alliance rankings: our side ranked by prepPoints, the
 * opponent by power (their prep points are often "TBD" in 1.0). */
function buildPrep(raw: Doc, ourLabel: string, oppLabel: string): Doc {
  const stages = asArray(raw['prepStages']).map((s, i) => {
    const key = str(s['nameKey']);
    return {
      label: TME_STAGE_LABELS[key] || key || `Stage ${i + 1}`,
      ours: typeof s['ourPts'] === 'number' ? s['ourPts'] : 0,
      opp: typeof s['oppPts'] === 'number' ? s['oppPts'] : 0,
    };
  });
  const ourRankings = asArray(raw['alliances']).map(a => ({
    tag: str(a['tag']),
    prepPoints: toNumericValue(a['prepPoints']).value || 0,
  }));
  // Opponent prep points are usually unknown in 1.0, so rank them by power as a
  // proxy (matches 1.0's computedOppAlliances) and store that as prepPoints.
  const oppRankings = asArray(raw['oppAlliances']).map(a => {
    const pp = toNumericValue(a['prepPoints']).value;
    return { tag: str(a['tag']), prepPoints: Number.isFinite(pp) ? pp : toNumericValue(a['power']).value || 0 };
  });
  return {
    stages,
    totalOurs: typeof raw['totalOur'] === 'number' ? raw['totalOur'] : 0,
    totalOpp: typeof raw['totalOpp'] === 'number' ? raw['totalOpp'] : 0,
    ourLabel,
    oppLabel,
    ourRankings,
    oppRankings,
  };
}

/**
 * TME (The Mightiest Empire) — a 1v1 prep-war. The 1.0 shape stores our side in
 * `alliances` + `ourTop`, the opponent in `oppAlliances` + `krakens`, prep tug
 * totals in `prepStages`, and `serverTiers/serverDepth` keyed by `us`/`opp`. We
 * fold that into the v2 doc: two kingdoms (us blue / opponent red), research.ours
 * + a single research.opponents entry, alliancePoints from prep points, and the
 * tier/depth matrices re-keyed by server name.
 */
function adoptTme(raw: Doc): Doc {
  const ourServer = 'Era 8';
  const ourDisplay = 'Era #008';
  const oppServer = str(raw['oppServer']) || 'Opponent';
  // TME is a 1v1 — not a corner-based land war. Match the v1.0 prep/status bar
  // exactly: us = blue, opponent = red, each with a darker fade. `barColor` is
  // the bright (light) end the kingdom-bar gradient uses; `color` is the muted
  // tint for scouting/crests. Values lifted from the 1.0 PrepChart tug fills
  // (rgba(91,141,239) blue / rgba(248,113,113) red).
  const US_BLUE = { color: '#3d7cc4', barColor: '#5b8def', rgb: '91,141,239' };
  const OPP_RED = { color: '#c43d3d', barColor: '#f87171', rgb: '248,113,113' };

  const ourAlliances = asArray(raw['alliances']);
  const oppAlliancesRaw = asArray(raw['oppAlliances']);

  // Per-kingdom alliance tags so the Event Setup grid shows them (not just the
  // top-level ourAlliances the normalizer reads).
  const ourTags = ourAlliances.map(a => str(a['tag'])).filter(Boolean);
  const oppTags = oppAlliancesRaw.map(a => str(a['tag'])).filter(Boolean);
  const kingdoms = [
    { server: ourServer, display: ourDisplay, color: US_BLUE.color, barColor: US_BLUE.barColor, rgb: US_BLUE.rgb, us: true, alliances: ourTags },
    { server: oppServer, display: oppServer, color: OPP_RED.color, barColor: OPP_RED.barColor, rgb: OPP_RED.rgb, us: false, alliances: oppTags },
  ];

  const tiers = asObject(raw['serverTiers']);
  const depth = asObject(raw['serverDepth']);
  const depthUs = asObject(depth['us']);
  const depthOpp = asObject(depth['opp']);

  // The persistent bar above the tabs is the prep tug: our total vs the
  // opponent's. v1.0 stores these in BILLIONS (e.g. 1.47), so scale to raw
  // points the bar formats back to "1.47B".
  const toRaw = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v * 1e9 : 0);

  return {
    schemaVersion: 2,
    eventConfig: {
      eventStart: str(raw['prepStart']),
      eventEnd: str(raw['invasionStart']),
      ourServer,
      ourAlliances: ourAlliances.map(a => str(a['tag'])).filter(Boolean),
      servers: [ourServer, oppServer],
      kingdoms,
      eventOver: raw['eventOver'] === true,
    },
    // Prep tug totals → the persistent kingdom-standings bar (us vs opponent).
    kingdomScoreboard: [
      { server: ourServer, points: toRaw(raw['totalOur']) },
      { server: oppServer, points: toRaw(raw['totalOpp']) },
    ],
    // Per-stage tug data → the prepTug widget (current stage + total, expandable
    // to all stages). Values stay in BILLIONS (the chart's unit, as v1.0).
    prep: buildPrep(raw, ourDisplay, oppServer),
    // Prep points double as the alliance-points scoreboard (our side). Raw
    // value — the normalizer applies toNumericValue.
    alliancePoints: ourAlliances.map(a => ({ tag: str(a['tag']), points: a['prepPoints'] })),
    research: {
      ours: {
        server: ourServer,
        alliances: ourAlliances.map(rosterAlliance),
        players: asArray(raw['ourTop']).map(rosterPlayer),
      },
      opponents: [
        {
          server: oppServer,
          alliances: oppAlliancesRaw.map(rosterAlliance),
          players: asArray(raw['krakens']).map(rosterPlayer),
        },
      ],
    },
    serverTiers: {
      labels: asArray(tiers['labels']).map(String),
      byServer: {
        [ourServer]: asArray(tiers['us']).map(n => (typeof n === 'number' ? n : 0)),
        [oppServer]: asArray(tiers['opp']).map(n => (typeof n === 'number' ? n : 0)),
      },
    },
    serverDepth: {
      ranks: asArray(depth['ranks']).map(n => (typeof n === 'number' ? n : 0)),
      byServer: {
        [ourServer]: {
          power: asArray(depthUs['power']).map(n => (typeof n === 'number' ? n : 0)),
          merits: asArray(depthUs['merits']).map(n => (typeof n === 'number' ? n : 0)),
        },
        [oppServer]: {
          power: asArray(depthOpp['power']).map(n => (typeof n === 'number' ? n : 0)),
          merits: asArray(depthOpp['merits']).map(n => (typeof n === 'number' ? n : 0)),
        },
      },
    },
  };
}

/**
 * Behemoth Conquest — a 1v1 like TME, but its 1.0 live JSON only stores scalars
 * (scoreUs/scoreThem/purity + the four phase dates + result); rosters/tiers live
 * in the HTML per-occurrence, so the adapter maps what it can and leaves the
 * rest for the editor. The Behemoth Points score race becomes the persistent
 * tug (kingdomScoreboard + prep block, one "stage"); purity is carried through.
 */
function adoptBehemoth(raw: Doc): Doc {
  const ourServer = 'Era 8';
  const ourDisplay = 'Era #008';
  const oppServer = `Era ${str(raw['opponent']).replace(/\D/g, '') || '?'}`;
  const US_BLUE = { color: '#3d7cc4', barColor: '#5b8def', rgb: '91,141,239' };
  const OPP_RED = { color: '#c43d3d', barColor: '#f87171', rgb: '248,113,113' };
  const toB = (v: unknown) => toNumericValue(v).value || 0; // "35B"/"63.9B" → 35 / 63.9

  return {
    schemaVersion: 2,
    eventConfig: {
      eventStart: isoDate(raw['tamingStartISO']) || isoDate(raw['eventStartISO']),
      eventEnd: isoDate(raw['eventEndISO']),
      ourServer,
      servers: [ourServer, oppServer],
      kingdoms: [
        { server: ourServer, display: ourDisplay, color: US_BLUE.color, barColor: US_BLUE.barColor, rgb: US_BLUE.rgb, us: true, alliances: [] },
        { server: oppServer, display: oppServer, color: OPP_RED.color, barColor: OPP_RED.barColor, rgb: OPP_RED.rgb, us: false, alliances: [] },
      ],
      eventOver: str(raw['result']) !== '',
    },
    // Score race → the persistent tug (billions, like TME's totals).
    kingdomScoreboard: [
      { server: ourServer, points: toB(raw['scoreUs']) * 1e9 },
      { server: oppServer, points: toB(raw['scoreThem']) * 1e9 },
    ],
    prep: {
      stages: [{ label: 'Behemoth Points', ours: toB(raw['scoreUs']), opp: toB(raw['scoreThem']) }],
      totalOurs: toB(raw['scoreUs']),
      totalOpp: toB(raw['scoreThem']),
      ourLabel: ourDisplay,
      oppLabel: oppServer,
    },
  };
}

/**
 * Primordial Conflict — a 4-kingdom land war. Its 1.0 JSON keys `research` by
 * SERVER NAME (e.g. "E#008") and carries a `kingdomScoreboard`. We map the
 * server-keyed research into the v2 `research.ours` + `research.opponents`
 * shape and pass the scoreboard through.
 */
function adoptPrimordial(raw: Doc): Doc {
  const research = asObject(raw['research']);
  const servers = Object.keys(research);
  // Our server is the one whose key resolves to 8 (E#008 / Era 8 / #008).
  const ourKey = servers.find(s => s.replace(/\D/g, '') === '8') ?? servers[0] ?? '';
  // 1.0 rows are POSITIONAL TUPLES with a column-order swap: alliances are
  // [tag, name, power, merits]; players are [name, tag, power, merits].
  const tuple = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  const allianceRow = (v: unknown) => {
    const t = tuple(v);
    return { tag: str(t[0]), name: str(t[1]), power: t[2] ?? 0, merits: t[3] ?? 0 };
  };
  const playerRow = (v: unknown, i: number) => {
    const t = tuple(v);
    return { rank: i + 1, name: str(t[0]), alliance: str(t[1]), power: t[2] ?? 0, merits: t[3] ?? 0 };
  };
  const toRoster = (key: string): Doc => {
    const r = asObject(research[key]);
    return {
      server: normServer(key),
      alliances: asArray(r['alliances']).length ? (r['alliances'] as unknown[]).map(allianceRow) : [],
      players: Array.isArray(r['players']) ? (r['players'] as unknown[]).map(playerRow) : [],
    };
  };
  // servers[] in the JSON carries per-server colour; fall back to a neutral tint.
  const serverMeta = asArray(raw['servers']);
  const metaByCode = new Map(serverMeta.map(s => [str(s['code']) || str(s['name']), s]));
  const kingdom = (code: string) => {
    const m = asObject(metaByCode.get(code));
    return {
      server: normServer(code),
      display: str(m['label']) || normServer(code),
      color: str(m['color']) || '#9b6dff',
      rgb: str(m['rgb']) || '155,109,255',
      us: code === ourKey,
      alliances: [] as string[],
    };
  };
  const ev = asObject(raw['event']);
  return {
    schemaVersion: 2,
    eventConfig: {
      eventStart: isoDate(ev['startISO']) || isoDate(raw['eventStartISO']) || str(raw['startDate']),
      eventEnd: isoDate(ev['endISO']) || isoDate(raw['eventEndISO']),
      ourServer: normServer(ourKey),
      servers: servers.map(normServer),
      kingdoms: servers.map(kingdom),
      eventOver: ev['eventOver'] === true,
    },
    kingdomScoreboard: asArray(raw['kingdomScoreboard']).map(r => ({
      server: normServer(str(r['server'])),
      points: r['points'],
      dew: r['dew'],
      essence: r['essence'],
    })),
    research: {
      ours: ourKey ? toRoster(ourKey) : { server: '', alliances: [], players: [] },
      opponents: servers.filter(s => s !== ourKey).map(toRoster),
    },
  };
}

/** "E#008" / "#008" / "Era 8" → canonical "Era 8" (spaced) for v2. */
function normServer(s: string): string {
  const digits = s.replace(/\D/g, '');
  if (!digits) return s;
  // Strip leading zeros so "E#008" → "Era 8" (matches the rest of the app;
  // "Era 008" !== "Era 8" was breaking placement lookups).
  return `Era ${parseInt(digits, 10)}`;
}
/** ISO datetime → "YYYY-MM-DD" (or '' if absent/invalid). */
function isoDate(v: unknown): string {
  const s = str(v);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '';
}

/** Per-slug adopt adapters. Slugs absent here are already v2-shaped (passthrough). */
const ADAPTERS: Record<string, (raw: Doc) => Doc> = {
  tme: adoptTme,
  behemoth: adoptBehemoth,
  primordial: adoptPrimordial,
};

/** True when a slug has a legacy→v2 adapter (i.e. its static JSON needs mapping
 * before it can seed an editable occurrence). */
export function hasAdoptAdapter(slug: string): boolean {
  return slug in ADAPTERS;
}

/**
 * Adapt a committed static JSON doc into the v2 doc shape for `slug`. Falls back
 * to the raw doc verbatim for already-v2-shaped types. Pure + total.
 */
export function adaptLegacyDoc(slug: string, raw: unknown): Doc {
  const fn = ADAPTERS[slug];
  return fn ? fn(asObject(raw)) : asObject(raw);
}
