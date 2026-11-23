import { describe, it, expect } from 'vitest';
import { normalizeLegacy, placementOf, topSum, mpPct, mpClass, typeInfo, type RawHistoryEvent } from './history.model';

describe('history.model', () => {
  it('sums top-4 power + merits', () => {
    expect(topSum([['a', 10, 1], ['b', 20, 2]])).toEqual({ power: 30, merits: 3 });
    expect(topSum(undefined)).toEqual({ power: 0, merits: 0 });
  });

  it('M:P % + colour buckets', () => {
    expect(mpPct({ power: 100, merits: 9 })).toBeCloseTo(9);
    expect(mpClass(9)).toBe('mp-hi');
    expect(mpClass(5)).toBe('mp-mid');
    expect(mpClass(2)).toBe('mp-lo');
    expect(mpPct({ power: 0, merits: 5 })).toBe(0);
  });

  it('resolves event type name drift → slug/theme', () => {
    expect(typeInfo('Primordial').slug).toBe('primordial');
    expect(typeInfo('Primordial Conflict').slug).toBe('primordial');
    expect(typeInfo('TME').slug).toBe('tme');
    expect(typeInfo('Desolate Desert').slug).toBe('desolate');
    expect(typeInfo('Golden').slug).toBe('');
  });

  it('placement: kingdomFinal rank of Era 8 wins over everything', () => {
    const e: RawHistoryEvent = {
      event: 'Desolate Desert',
      date: '2026-07-13',
      opp: 'x',
      result: 'Loss',
      kingdomFinal: { 'Era #019': '123,000,000', 'Era 8': '25,000,000', 'Era #014': '84,000,000' },
    };
    expect(placementOf(e)).toBe(3); // 019, 014, 8 → 3rd
  });

  it('placement fallbacks: explicit → Win=1/Loss=4', () => {
    expect(placementOf({ event: 'x', date: 'd', opp: 'o', result: 'Loss', placement: 2 })).toBe(2);
    expect(placementOf({ event: 'x', date: 'd', opp: 'o', result: 'Win' })).toBe(1);
    expect(placementOf({ event: 'x', date: 'd', opp: 'o', result: 'Loss' })).toBe(4);
    expect(placementOf({ event: 'x', date: 'd', opp: 'o', result: 'Live' })).toBeNull();
  });

  it('normalizes a 1v1 event', () => {
    const e: RawHistoryEvent = {
      event: 'TME',
      date: '2026-05-18',
      opp: 'Era #038',
      result: 'Loss',
      ours: [['WC1', 17_000_000_000, 1_000_000_000]],
      oppA: [['E38', 18_000_000_000, 1_700_000_000]],
    };
    const h = normalizeLegacy(e);
    expect(h.typeSlug).toBe('tme');
    expect(h.multi).toBe(false);
    expect(h.ours.power).toBe(17_000_000_000);
    expect(h.opp_.power).toBe(18_000_000_000);
    expect(h.placement).toBe(4);
  });

  it('normalizes a multi-server event: opp combined = average, per-server ranked', () => {
    const e: RawHistoryEvent = {
      event: 'Desolate Desert',
      date: '2026-09-28',
      opp: 'A / B',
      result: 'Loss',
      multi: true,
      ourRoster: [['eRa', 24_000_000_000, 2_000_000_000]],
      oppRosters: {
        'Era #028': [['x', 20_000_000_000, 2_000_000_000]],
        'Era #066': [['y', 10_000_000_000, 1_000_000_000]],
      },
      kingdomFinal: { 'Era #028': '81,000,000,000', 'Era 8': '46,000,000,000', 'Era #066': '33,000,000,000' },
    };
    const h = normalizeLegacy(e);
    expect(h.multi).toBe(true);
    expect(h.ours.power).toBe(24_000_000_000);
    expect(h.opp_.power).toBe(15_000_000_000); // (20B + 10B)/2
    expect(h.oppServers).toHaveLength(2);
    expect(h.oppServers!.find(s => s.server === 'Era #028')!.rank).toBe(1);
    expect(h.placement).toBe(2); // Era 8 is 2nd of 3 in kingdomFinal
  });
});
