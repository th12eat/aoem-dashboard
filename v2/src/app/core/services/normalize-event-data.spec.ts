import { describe, it, expect } from 'vitest';
import { normalizeEventData } from './normalize-event-data';

// Representative slice of the real data/live/stormlands.json (schemaVersion 2),
// trimmed to exercise every normalization branch.
const RAW = {
  schemaVersion: 2,
  eventConfig: {
    eventStart: '2026-11-02',
    eventEnd: '2026-11-15',
    recoveryEnd: '2026-11-17',
    servers: ['Era 8', 'Era #039'],
    ourServer: 'Era 8',
    ourAlliances: ['eRa', 'REU'],
    corners: { 'Era 8': 'East/purple' },
    notes: '4-kingdom Stormlands.',
    eventOver: false,
  },
  kingdomPoints: { era8: '50,200,000,000', lastUpdated: '2026-11-04 — Day 3' },
  kingdomScoreboard: [
    { server: 'Era #039', points: 76600000000 },
    { server: 'Era 8', points: 50200000000 },
  ],
  alliancePoints: [
    { tag: 'eRa', points: '21,613,610,877' },
    { tag: 'AuR', points: '—' },
  ],
  diplomacy: [{ id: 3, server: 'Era #015', alliance: 'TBD', relation: 'hostile', notes: 'Target.' }],
  research: {
    ours: {
      server: 'Era 8',
      sdRank: null,
      alliances: [{ tag: 'eRa', name: 'WorldClass', power: '26,189,743,346', merits: '3,043,208,404' }],
      players: [{ rank: 1, name: 'Collin6666', alliance: 'eRa', power: '487,855,154', merits: '168,086,566' }],
    },
    opponents: [
      {
        server: 'Era #039',
        sdRank: null,
        priority: 'TBD',
        note: 'North corner (blue).',
        alliances: [],
        players: [],
      },
    ],
  },
  serverTiers: { labels: ['100M+', '200M+'], byServer: { 'Era 8': [264, 28] } },
  serverDepth: { ranks: [1, 10], byServer: { 'Era 8': { power: [487, 254], merits: [376, 163] } } },
  mapState: {},
  mapRoutes: { actual: [], planned: [] },
};

describe('normalizeEventData', () => {
  const data = normalizeEventData(RAW);

  it('carries schema + meta', () => {
    expect(data.schemaVersion).toBe(2);
    expect(data.meta.ourServer).toBe('Era 8');
    expect(data.meta.eventOver).toBe(false);
    expect(data.meta.servers).toEqual(['Era 8', 'Era #039']);
  });

  it('coerces scoreboard points to NumericValue and flags our server', () => {
    const ours = data.kingdomScoreboard.find(r => r.server === 'Era 8')!;
    expect(ours.points.value).toBe(50200000000);
    expect(ours.isOurs).toBe(true);
    const other = data.kingdomScoreboard.find(r => r.server === 'Era #039')!;
    expect(other.isOurs).toBe(false);
  });

  it('preserves display text while parsing alliance points, incl. em-dash', () => {
    const era = data.alliancePoints.find(a => a.tag === 'eRa')!;
    expect(era.points.value).toBe(21613610877);
    expect(era.points.display).toBe('21,613,610,877');
    const aur = data.alliancePoints.find(a => a.tag === 'AuR')!;
    expect(Number.isNaN(aur.points.value)).toBe(true);
    expect(aur.points.display).toBe('—');
  });

  it('normalizes research rosters (power/merits → NumericValue)', () => {
    expect(data.research.ours.players[0].power.value).toBe(487855154);
    expect(data.research.ours.alliances[0].name).toBe('WorldClass');
    expect(data.research.opponents[0].note).toBe('North corner (blue).');
  });

  it('carries the tier and depth matrices', () => {
    expect(data.serverTiers.labels).toEqual(['100M+', '200M+']);
    expect(data.serverTiers.byServer['Era 8']).toEqual([264, 28]);
    expect(data.serverDepth.byServer['Era 8'].power).toEqual([487, 254]);
  });

  it('defaults missing collections instead of throwing', () => {
    const empty = normalizeEventData({});
    expect(empty.kingdomScoreboard).toEqual([]);
    expect(empty.research.opponents).toEqual([]);
    expect(empty.serverTiers.labels).toEqual([]);
    expect(empty.meta.ourServer).toBe('');
  });

  it('is total on garbage input', () => {
    expect(() => normalizeEventData(null)).not.toThrow();
    expect(() => normalizeEventData('nonsense')).not.toThrow();
    expect(normalizeEventData(42).schemaVersion).toBe(0);
  });
});
