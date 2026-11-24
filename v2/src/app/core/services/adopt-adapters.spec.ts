import { describe, it, expect } from 'vitest';
import { adaptLegacyDoc, hasAdoptAdapter } from './adopt-adapters';
import { normalizeEventData } from './normalize-event-data';

const TME_RAW = {
  schemaVersion: 1,
  oppServer: 'Era 24',
  prepStart: '2026-11-23',
  invasionStart: '2026-11-29',
  eventOver: false,
  totalOur: 1.47,
  totalOpp: 0.756,
  prepStages: [
    { nameKey: 'prepStage1', ourPts: 1.47, oppPts: 0.756, won: true },
    { nameKey: 'prepStage2', ourPts: 0, oppPts: 0, won: null },
  ],
  alliances: [
    { tag: 'ʀ★ᴡ', name: 'ʀᴀɢᴇᴡᴀʀʀɪᴏʀꜱ', power: '26,312,885,607', merits: '3,276,870,670', prepPoints: '833,693,600' },
    { tag: 'ʀ★ɢ', name: 'ʀᴀɢᴇᴏꜰɢᴏᴅꜱ', power: '13,073,698,341', merits: '355,429,850', prepPoints: '416,965,200' },
  ],
  oppAlliances: [{ tag: 'ROD', name: 'FoxyRabbits', power: '19,840,099,109', merits: '1,097,258,216', prepPoints: '357,300,800' }],
  ourTop: [{ rank: 1, name: 'Collin6666', alliance: 'ʀ★ᴡ', power: '523,850,478', merits: '195,644,074' }],
  krakens: [{ rank: 1, name: 'Nickel', alliance: 'ROD', power: '321,174,934', merits: '77,754,385', ratio: '' }],
  serverTiers: { labels: ['100M+', '200M+'], us: [120, 80], opp: [110, 70] },
  serverDepth: { ranks: [1, 100], us: { power: [500, 100], merits: [200, 40] }, opp: { power: [480, 90], merits: [180, 35] } },
};

describe('adoptAdapters', () => {
  it('knows which slugs have an adapter', () => {
    expect(hasAdoptAdapter('tme')).toBe(true);
    expect(hasAdoptAdapter('desolate')).toBe(false);
  });

  it('passes an unknown (already-v2) slug through verbatim', () => {
    const doc = { eventConfig: { ourServer: 'Era 8' }, alliancePoints: [{ tag: 'eRa', points: 5 }] };
    expect(adaptLegacyDoc('desolate', doc)).toEqual(doc);
  });

  it('maps the TME legacy shape into an editable v2 (raw-doc) shape', () => {
    const doc = adaptLegacyDoc('tme', TME_RAW) as Record<string, unknown>;
    const ec = doc['eventConfig'] as Record<string, unknown>;
    const kingdoms = ec['kingdoms'] as Record<string, unknown>[];
    // two kingdoms, us flagged
    expect(kingdoms).toHaveLength(2);
    expect(kingdoms[0]['us']).toBe(true);
    expect(kingdoms[1]['server']).toBe('Era 24');
    // per-kingdom alliance tags so Event Setup shows them
    expect(kingdoms[0]['alliances']).toEqual(['ʀ★ᴡ', 'ʀ★ɢ']);
    expect(kingdoms[1]['alliances']).toEqual(['ROD']);
    // prep points → alliancePoints, raw (normalizer converts later)
    const ap = doc['alliancePoints'] as Record<string, unknown>[];
    expect(ap[0]).toEqual({ tag: 'ʀ★ᴡ', points: '833,693,600' });
    // prep tug totals → kingdomScoreboard (billions scaled to raw points)
    const kb = doc['kingdomScoreboard'] as Record<string, unknown>[];
    expect(kb).toHaveLength(2);
    expect(kb[0]).toEqual({ server: 'Era 8', points: 1.47e9 });
    expect(kb[1]).toEqual({ server: 'Era 24', points: 0.756e9 });
    // prepStages → prep block (labels resolved, values in billions)
    const prep = doc['prep'] as Record<string, unknown>;
    const stages = prep['stages'] as Record<string, unknown>[];
    expect(stages).toHaveLength(2);
    expect(stages[0]).toEqual({ label: 'Forging Gear', ours: 1.47, opp: 0.756 });
    expect(prep['totalOurs']).toBe(1.47);
    expect(prep['oppLabel']).toBe('Era 24');
    // rankings carry both sides as raw prepPoints (us) / power-proxy (opp)
    const our = prep['ourRankings'] as Record<string, unknown>[];
    const opp = prep['oppRankings'] as Record<string, unknown>[];
    expect(our[0]).toEqual({ tag: 'ʀ★ᴡ', prepPoints: 833693600 });
    expect(opp[0]['tag']).toBe('ROD');
    expect(opp[0]['prepPoints']).toBe(357300800);
    // research split us vs opponent, raw power strings preserved
    const research = doc['research'] as Record<string, Record<string, unknown>[] | Record<string, unknown>>;
    const ours = research['ours'] as Record<string, Record<string, unknown>[]>;
    const opps = research['opponents'] as Record<string, unknown>[];
    expect(ours['alliances'][0]['power']).toBe('26,312,885,607');
    expect((opps[0] as Record<string, unknown>)['server']).toBe('Era 24');
    // tiers/depth re-keyed by server name
    const tiers = doc['serverTiers'] as Record<string, Record<string, number[]>>;
    const depth = doc['serverDepth'] as Record<string, Record<string, { power: number[]; merits: number[] }>>;
    expect(tiers['byServer']['Era 8']).toEqual([120, 80]);
    expect(depth['byServer']['Era 24'].power).toEqual([480, 90]);
  });

  it('produces a doc the v2 normalizer consumes without loss', () => {
    const doc = adaptLegacyDoc('tme', TME_RAW);
    const n = normalizeEventData(doc);
    expect(n.meta.ourServer).toBe('Era 8');
    expect(n.research.ours.alliances[0].tag).toBe('ʀ★ᴡ');
    expect(n.research.ours.alliances[0].power.value).toBe(26312885607);
    expect(n.research.opponents[0].alliances[0].tag).toBe('ROD');
    // points are parsed to a NumericValue by the normalizer
    expect(n.alliancePoints[0].points.value).toBe(833693600);
    // tier/depth matrices carry both servers
    expect(Object.keys(n.serverTiers.byServer)).toContain('Era 24');
    expect(n.serverDepth.byServer['Era 8'].power).toEqual([500, 100]);
    // the persistent prep-tug bar has both servers, us flagged
    expect(n.kingdomScoreboard).toHaveLength(2);
    expect(n.kingdomScoreboard[0].isOurs).toBe(true);
    expect(n.kingdomScoreboard[0].points.value).toBe(1.47e9);
    // prep tug data survives normalization (stages + totals)
    expect(n.prep?.stages).toHaveLength(2);
    expect(n.prep?.stages[0]).toEqual({ label: 'Forging Gear', ours: 1.47, opp: 0.756 });
    expect(n.prep?.totalOurs).toBe(1.47);
    // rankings merged + per-server ranked; header prep standing derived
    const us = n.prep?.rankings?.filter(r => r.side === 'us') ?? [];
    expect(us[0]).toEqual({ tag: 'ʀ★ᴡ', side: 'us', prepPoints: 833693600, serverRank: 1 });
    expect(n.meta.prepStarted).toBe(true);
    expect(n.meta.prepOursTotal).toBe(1.47);
  });
});
