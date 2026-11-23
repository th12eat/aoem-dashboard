import { describe, it, expect } from 'vitest';
import { isSectionMissing, missingSections, type DataSection } from './event-data-status';

describe('isSectionMissing', () => {
  it('eventConfig missing without both dates', () => {
    expect(isSectionMissing({}, 'eventConfig')).toBe(true);
    expect(isSectionMissing({ eventConfig: { eventStart: '2026-11-02' } }, 'eventConfig')).toBe(true);
    expect(isSectionMissing({ eventConfig: { eventStart: '2026-11-02', eventEnd: '2026-11-15' } }, 'eventConfig')).toBe(false);
  });

  it('list sections missing when empty', () => {
    expect(isSectionMissing({ alliancePoints: [] }, 'alliancePoints')).toBe(true);
    expect(isSectionMissing({ alliancePoints: [{ tag: 'eRa', points: '1' }] }, 'alliancePoints')).toBe(false);
    expect(isSectionMissing({ diplomacy: [] }, 'diplomacy')).toBe(true);
    expect(isSectionMissing({ kingdomScoreboard: [{ server: 'Era 8', points: 1 }] }, 'kingdomScoreboard')).toBe(false);
  });

  it('scouting missing only when ours AND all opponents are empty', () => {
    expect(isSectionMissing({}, 'scouting')).toBe(true);
    const oursOnly = { research: { ours: { alliances: [{ tag: 'eRa' }], players: [] }, opponents: [] } };
    expect(isSectionMissing(oursOnly, 'scouting')).toBe(false);
    const oppOnly = { research: { ours: { alliances: [], players: [] }, opponents: [{ alliances: [], players: [{ name: 'x' }] }] } };
    expect(isSectionMissing(oppOnly, 'scouting')).toBe(false);
  });

  it('tiers/depth missing when byServer empty', () => {
    expect(isSectionMissing({ serverTiers: { byServer: {} } }, 'serverTiers')).toBe(true);
    expect(isSectionMissing({ serverTiers: { byServer: { 'Era 8': [1] } } }, 'serverTiers')).toBe(false);
    expect(isSectionMissing({ serverDepth: { byServer: { 'Era 8': {} } } }, 'serverDepth')).toBe(false);
  });

  it('placerGold missing when no alliances', () => {
    expect(isSectionMissing({ placerGold: { alliances: [] } }, 'placerGold')).toBe(true);
    expect(isSectionMissing({ placerGold: { alliances: [{ tag: 'eRa' }] } }, 'placerGold')).toBe(false);
  });

  it('map missing when no occupied nodes', () => {
    expect(isSectionMissing({ mapState: {} }, 'map')).toBe(true);
    expect(isSectionMissing({ mapState: { n1: { occupant: 'eRa' } } }, 'map')).toBe(false);
  });

  it('missingSections filters a list', () => {
    const doc = { alliancePoints: [{ tag: 'eRa' }], diplomacy: [] };
    const sections: DataSection[] = ['alliancePoints', 'diplomacy'];
    expect(missingSections(doc, sections)).toEqual(['diplomacy']);
  });
});
