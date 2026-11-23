import { describe, it, expect } from 'vitest';
import { eventLengthDays, kingdomCount, deriveEndDate, isKvkType } from './kvk-schedule';

describe('kvk-schedule', () => {
  it('knows event lengths per type (from Catherine KVK_DEFS day-sums)', () => {
    expect(eventLengthDays('stormlands')).toBe(15);
    expect(eventLengthDays('desolate')).toBe(8);
    expect(eventLengthDays('tme')).toBe(9);
    expect(eventLengthDays('behemoth')).toBe(6);
    expect(eventLengthDays('primordial')).toBe(7);
    expect(eventLengthDays('unknown')).toBe(0);
  });

  it('knows kingdom counts (SL/DD/PC=4, TME/BC=2)', () => {
    expect(kingdomCount('stormlands')).toBe(4);
    expect(kingdomCount('primordial')).toBe(4);
    expect(kingdomCount('tme')).toBe(2);
    expect(kingdomCount('behemoth')).toBe(2);
  });

  it('derives end date from the MATCHMAKING start (day 1) + 2 recovery', () => {
    // SL matchmaking start 2026-11-01 → recoveryEnd 2026-11-17 (15 days incl. mm,
    // last event day Nov 15, +2 recovery) — matches the real data.
    expect(deriveEndDate('stormlands', '2026-11-01')).toBe('2026-11-17');
    // DD matchmaking start 2026-09-26 → Sep 26 + (8-1) + 2 = 2026-10-05.
    expect(deriveEndDate('desolate', '2026-09-26')).toBe('2026-10-05');
  });

  it('returns empty on blank/unknown', () => {
    expect(deriveEndDate('stormlands', '')).toBe('');
    expect(deriveEndDate('nope', '2026-01-01')).toBe('');
    expect(isKvkType('tme')).toBe(true);
    expect(isKvkType('golden')).toBe(false);
  });
});
