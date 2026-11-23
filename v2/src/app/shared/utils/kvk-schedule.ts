/**
 * Per-type KvK scheduling — ported from Catherine's KVK_DEFS stage day-counts
 * (packages/game-data/src/kvk/defs.ts). Each type's EVENT length is the sum of
 * its stage days (the matchmaking stage is day 1, i.e. the start the admin
 * enters). The dashboard end date adds a flat 2-day recovery window (all KvKs
 * return up to 65% troops over 2 days). So:
 *   eventEnd = start + (eventLengthDays - 1) + recoveryDays
 * (−1 because the start date IS day 1, inclusive).
 */

export type KvkType = 'stormlands' | 'desolate' | 'tme' | 'behemoth' | 'primordial';

/** Event length in days (sum of Catherine's stage `days`, groups flattened). */
const EVENT_DAYS: Record<KvkType, number> = {
  // SL: mm1 + z1 1 + z2 4 + z3 3 + z4 3 + zeus1 1 + zeus2 2 = 15
  stormlands: 15,
  // DD: mm1 + z1 1 + z2 1 + tower 3 + z3 1 + aaru 1 = 8
  desolate: 8,
  // TME: mm2 + prep(forge1+bldg1+tech1+train1+boost2=6) + inv1 = 9
  tme: 9,
  // BC: mm1 + tame3 + ad2 = 6
  behemoth: 6,
  // PC: mm1 + battle3 + select1 + showdown1 + recovery1 = 7
  primordial: 7,
};

/** Kingdoms (servers) per type: 4-kingdom land/royale vs 2-kingdom head-to-head. */
const KINGDOMS: Record<KvkType, 2 | 4> = {
  stormlands: 4,
  desolate: 4,
  primordial: 4,
  tme: 2,
  behemoth: 2,
};

const RECOVERY_DAYS = 2;

export function isKvkType(slug: string): slug is KvkType {
  return slug in EVENT_DAYS;
}

/** Event length (days) for a type, or 0 if unknown. */
export function eventLengthDays(type: string): number {
  return isKvkType(type) ? EVENT_DAYS[type] : 0;
}

/** Number of kingdoms (2 or 4) for a type; defaults to 4. */
export function kingdomCount(type: string): 2 | 4 {
  return isKvkType(type) ? KINGDOMS[type] : 4;
}

/** Derived end date (YYYY-MM-DD) = start + event length + 2-day recovery.
 * Returns '' when start is blank or the type is unknown. Pure date math in UTC
 * to avoid timezone drift on the bare date string. */
export function deriveEndDate(type: string, startDate: string): string {
  const len = eventLengthDays(type);
  if (!len || !startDate) return '';
  const ms = Date.parse(`${startDate}T00:00:00Z`);
  if (!Number.isFinite(ms)) return '';
  // start IS day 1 → add (len − 1) event days, then the recovery window.
  const end = new Date(ms + (len - 1 + RECOVERY_DAYS) * 86400000);
  return end.toISOString().slice(0, 10);
}
