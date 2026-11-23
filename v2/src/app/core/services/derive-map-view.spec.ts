import { describe, it, expect } from 'vitest';
import { deriveMapView } from './derive-map-view';
import type { MapGeometry, MapNodeState, MapRoute } from '@shared/models/map.model';
import type { Kingdom } from '@shared/models/event-data.model';

const GEO: MapGeometry = {
  viewBox: '0 0 100 100',
  underlayAsset: 'x.jpg',
  serverBadges: [],
  nodes: [
    { id: 'city_a', x: 10, y: 10, type: 'city', buff: { key: 'attack', label: 'Attack', magnitude: '+10%' }, label: 'City A', activeDayOffset: 1 },
    { id: 'tower_a', x: 20, y: 20, type: 'tower', buff: { key: 'damage', label: 'Damage', magnitude: '+6%' }, label: 'Tower A', activeDayOffset: 2 },
    { id: 'gate_z3', x: 30, y: 30, type: 'gate', transition: 'Z2->Z3', label: 'Inner Gate', activeDayOffset: 5 },
    { id: 'aaru', x: 50, y: 50, type: 'aaru', label: 'Aaru', activeDayOffset: 6 },
  ],
};
const KINGDOMS: Kingdom[] = [{ server: 'Era 8', display: 'Era #008', color: '#5b8bc4', rgb: '91,139,196', us: true }];
const ALLIANCE_SERVER = { eRa: 'Era 8' };
const START = Date.parse('2026-09-28T00:00:00Z');
const routes = { actual: [] as MapRoute[], planned: [] as MapRoute[] };

describe('deriveMapView', () => {
  it('counts a buff only when the node is connected AND occupied', () => {
    const state: Record<string, MapNodeState> = { city_a: { occupant: 'eRa', connected: true } };
    const v = deriveMapView(GEO, state, routes, [], KINGDOMS, ALLIANCE_SERVER, START, Date.parse('2026-10-01T00:00:00Z'));
    const h = v.holdings.find(x => x.tag === 'eRa')!;
    expect(h.buffs).toContain('attack');
    expect(h.cities).toBe(1);
    expect(v.nodes.find(n => n.id === 'city_a')!.buffActive).toBe(true);
  });

  it('drops the buff when connection is lost, but keeps placer gold (occupied)', () => {
    const state: Record<string, MapNodeState> = { city_a: { occupant: 'eRa', connected: false } };
    const v = deriveMapView(GEO, state, routes, [], KINGDOMS, ALLIANCE_SERVER, START, Date.parse('2026-10-01T00:00:00Z'));
    const h = v.holdings.find(x => x.tag === 'eRa')!;
    expect(h.buffs).not.toContain('attack'); // buff gone (disconnected)
    expect(h.placerPerHour).toBe(8000); // placer still accrues (occupied)
    expect(v.nodes.find(n => n.id === 'city_a')!.buffActive).toBe(false);
  });

  it('applies placer rates by node type/transition (city 8k, Z2→Z3 gate 8k, tower 0)', () => {
    const state: Record<string, MapNodeState> = {
      city_a: { occupant: 'eRa' },
      tower_a: { occupant: 'eRa' },
      gate_z3: { occupant: 'eRa' },
    };
    const v = deriveMapView(GEO, state, routes, [], KINGDOMS, ALLIANCE_SERVER, START, Date.parse('2026-10-10T00:00:00Z'));
    const h = v.holdings.find(x => x.tag === 'eRa')!;
    expect(h.placerPerHour).toBe(16000); // 8k city + 8k Z2→Z3 gate + 0 tower
    expect(h.towers).toBe(1);
    expect(h.gates).toBe(1);
  });

  it('schedule-gates node activation from eventStart + activeDayOffset', () => {
    const state: Record<string, MapNodeState> = {};
    // Day 1 (offset 1 = Sep 29): city active, inner gate (offset 5) not yet.
    const v = deriveMapView(GEO, state, routes, [], KINGDOMS, ALLIANCE_SERVER, START, Date.parse('2026-09-29T12:00:00Z'));
    expect(v.nodes.find(n => n.id === 'city_a')!.active).toBe(true);
    expect(v.nodes.find(n => n.id === 'gate_z3')!.active).toBe(false);
    expect(v.nodes.find(n => n.id === 'aaru')!.active).toBe(false);
  });

  it('marks siege only when occupied', () => {
    const state: Record<string, MapNodeState> = { city_a: { siege: true } };
    const v = deriveMapView(GEO, state, routes, [], KINGDOMS, ALLIANCE_SERVER, START, Date.parse('2026-10-01T00:00:00Z'));
    expect(v.nodes.find(n => n.id === 'city_a')!.siege).toBe(false); // no occupant → no siege
  });
});

describe('deriveMapView — derived connectivity (SH/SSH reachability)', () => {
  const now = Date.parse('2026-10-10T00:00:00Z');

  it('connects a node reachable from the SH through established routes', () => {
    const state: Record<string, MapNodeState> = { city_a: { occupant: 'eRa' }, tower_a: { occupant: 'eRa' } };
    const strongholds = [{ owner: 'eRa', kind: 'sh' as const, attachedTo: 'city_a' }];
    const rts = { actual: [{ owner: 'eRa', path: ['city_a', 'tower_a'] }], planned: [] };
    const v = deriveMapView(GEO, state, rts, strongholds, KINGDOMS, ALLIANCE_SERVER, START, now);
    expect(v.nodes.find(n => n.id === 'city_a')!.connected).toBe(true);
    expect(v.nodes.find(n => n.id === 'tower_a')!.connected).toBe(true);
  });

  it('disconnects a node with no path back to any stronghold', () => {
    const state: Record<string, MapNodeState> = { city_a: { occupant: 'eRa' }, tower_a: { occupant: 'eRa' } };
    const strongholds = [{ owner: 'eRa', kind: 'sh' as const, attachedTo: 'city_a' }];
    // tower_a is occupied but has NO route linking it to the SH's component.
    const rts = { actual: [{ owner: 'eRa', path: ['city_a', 'gate_z3'] }], planned: [] };
    const v = deriveMapView(GEO, state, rts, strongholds, KINGDOMS, ALLIANCE_SERVER, START, now);
    expect(v.nodes.find(n => n.id === 'tower_a')!.connected).toBe(false);
  });

  it('an SSH seeds connectivity even when the Z1 path is severed', () => {
    const state: Record<string, MapNodeState> = { tower_a: { occupant: 'eRa' } };
    // Only an SSH attached to tower_a — no SH route reaches it, but the SSH does.
    const strongholds = [{ owner: 'eRa', kind: 'ssh' as const, attachedTo: 'tower_a' }];
    const v = deriveMapView(GEO, state, { actual: [], planned: [] }, strongholds, KINGDOMS, ALLIANCE_SERVER, START, now);
    expect(v.nodes.find(n => n.id === 'tower_a')!.connected).toBe(true);
  });

  it('a building (pathing) route does NOT carry connection', () => {
    const state: Record<string, MapNodeState> = { city_a: { occupant: 'eRa' }, aaru: { occupant: 'eRa' } };
    const strongholds = [{ owner: 'eRa', kind: 'sh' as const, attachedTo: 'city_a' }];
    const rts = { actual: [{ owner: 'eRa', path: ['city_a', 'aaru'], building: true }], planned: [] };
    const v = deriveMapView(GEO, state, rts, strongholds, KINGDOMS, ALLIANCE_SERVER, START, now);
    expect(v.nodes.find(n => n.id === 'aaru')!.connected).toBe(false);
  });

  it('positions an SH in strongholds output', () => {
    const strongholds = [{ owner: 'eRa', kind: 'sh' as const, attachedTo: 'city_a' }];
    const v = deriveMapView(GEO, {}, { actual: [], planned: [] }, strongholds, KINGDOMS, ALLIANCE_SERVER, START, now);
    expect(v.strongholds).toHaveLength(1);
    expect(v.strongholds[0].owner).toBe('eRa');
  });

  // ── cut scenarios ──────────────────────────────────────────────────────────
  // Chain seeded from an SH at city_a: city_a — tower_a — gate_z3.
  const chainState: Record<string, MapNodeState> = {
    city_a: { occupant: 'eRa' },
    tower_a: { occupant: 'eRa' },
    gate_z3: { occupant: 'eRa' },
  };
  const sh = [{ owner: 'eRa', kind: 'sh' as const, attachedTo: 'city_a' }];

  it('(a) clean web: all nodes connected, all edges active, none severed', () => {
    const rts = {
      actual: [
        { owner: 'eRa', path: ['city_a', 'tower_a'] },
        { owner: 'eRa', path: ['tower_a', 'gate_z3'] },
      ],
      planned: [],
    };
    const v = deriveMapView(GEO, chainState, rts, sh, KINGDOMS, ALLIANCE_SERVER, START, now);
    expect(v.nodes.find(n => n.id === 'gate_z3')!.connected).toBe(true);
    expect(v.routes.actual.every(r => r.active && !r.severed)).toBe(true);
  });

  it('(b) cut mid-web: severed side goes inactive, SH side stays connected', () => {
    const rts = {
      actual: [
        { owner: 'eRa', path: ['city_a', 'tower_a'] },
        { owner: 'eRa', path: ['tower_a', 'gate_z3'], cut: true }, // enemy severed this edge
      ],
      planned: [],
    };
    const v = deriveMapView(GEO, chainState, rts, sh, KINGDOMS, ALLIANCE_SERVER, START, now);
    expect(v.nodes.find(n => n.id === 'city_a')!.connected).toBe(true);
    expect(v.nodes.find(n => n.id === 'tower_a')!.connected).toBe(true);
    expect(v.nodes.find(n => n.id === 'gate_z3')!.connected).toBe(false); // beyond the cut
    const cutEdge = v.routes.actual.find(r => r.path.includes('gate_z3'))!;
    expect(cutEdge.severed).toBe(true);
    expect(cutEdge.active).toBe(false);
    const liveEdge = v.routes.actual.find(r => !r.path.includes('gate_z3'))!;
    expect(liveEdge.active).toBe(true);
  });

  it('(c) SSH beyond the cut: both sides connected, only the cut edge inactive', () => {
    const rts = {
      actual: [
        { owner: 'eRa', path: ['city_a', 'tower_a'] },
        { owner: 'eRa', path: ['tower_a', 'gate_z3'], cut: true },
      ],
      planned: [],
    };
    const strongholds = [...sh, { owner: 'eRa', kind: 'ssh' as const, attachedTo: 'gate_z3' }];
    const v = deriveMapView(GEO, chainState, rts, strongholds, KINGDOMS, ALLIANCE_SERVER, START, now);
    // the SSH re-seeds the far side, so gate_z3 is connected again
    expect(v.nodes.find(n => n.id === 'gate_z3')!.connected).toBe(true);
    expect(v.nodes.find(n => n.id === 'city_a')!.connected).toBe(true);
    // but the cut edge itself still displays severed / inactive
    const cutEdge = v.routes.actual.find(r => r.path.includes('gate_z3') && r.path.includes('tower_a'))!;
    expect(cutEdge.severed).toBe(true);
    expect(cutEdge.active).toBe(false);
  });
});
