/**
 * Missing-data detection for the data-entry editor + dashboard notices.
 * A section is "missing" when it holds no meaningful data (empty/default) —
 * fully automatic, no manual complete-toggle. Operates on the RAW doc shape
 * (eventConfig + sections), the same shape normalizeEventData consumes.
 */

export type DataSection =
  | 'eventConfig'
  | 'kingdomScoreboard'
  | 'alliancePoints'
  | 'diplomacy'
  | 'scouting'
  | 'serverTiers'
  | 'serverDepth'
  | 'placerGold'
  | 'map';

type Doc = Record<string, unknown>;

function obj(v: unknown): Doc {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Doc) : {};
}
function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** True when `section` has no meaningful data in `doc`. */
export function isSectionMissing(doc: Doc, section: DataSection): boolean {
  switch (section) {
    case 'eventConfig': {
      const ec = obj(doc['eventConfig']);
      // The one section needed even pre-matchmaking: present iff it has dates.
      return !ec['eventStart'] || !ec['eventEnd'];
    }
    case 'kingdomScoreboard':
      return arr(doc['kingdomScoreboard']).length === 0;
    case 'alliancePoints':
      return arr(doc['alliancePoints']).length === 0;
    case 'diplomacy':
      return arr(doc['diplomacy']).length === 0;
    case 'scouting': {
      const research = obj(doc['research']);
      const ours = obj(research['ours']);
      const oursEmpty = arr(ours['alliances']).length === 0 && arr(ours['players']).length === 0;
      const opponents = arr(research['opponents']);
      const oppEmpty = opponents.every(o => {
        const r = obj(o);
        return arr(r['alliances']).length === 0 && arr(r['players']).length === 0;
      });
      return oursEmpty && oppEmpty;
    }
    case 'serverTiers': {
      const t = obj(doc['serverTiers']);
      return Object.keys(obj(t['byServer'])).length === 0;
    }
    case 'serverDepth': {
      const d = obj(doc['serverDepth']);
      return Object.keys(obj(d['byServer'])).length === 0;
    }
    case 'placerGold': {
      const p = obj(doc['placerGold']);
      return arr(p['alliances']).length === 0;
    }
    case 'map':
      // occupancy comes from event_map_state, but the raw doc's mapState is the
      // static seed; "missing" = no occupied nodes at all.
      return Object.keys(obj(doc['mapState'])).length === 0;
  }
}

/** The sections that are empty in `doc` (for editor ⚠ badges / a summary). */
export function missingSections(doc: Doc, sections: readonly DataSection[]): DataSection[] {
  return sections.filter(s => isSectionMissing(doc, s));
}
