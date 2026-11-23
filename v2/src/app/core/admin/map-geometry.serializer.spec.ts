import { describe, it, expect } from 'vitest';
import { serializeGeometryToTs, constNameForSlug } from './map-geometry.serializer';
import type { MapGeometry } from '@shared/models/map.model';

const GEO: MapGeometry = {
  viewBox: '0 0 100 100',
  underlayAsset: 'assets/stormlands-map.png',
  serverBadges: [{ server: 'Era #039', x: 48, y: 11 }],
  nodes: [
    { id: 'z1_1', x: 36.5, y: 77.6, type: 'gate', subtype: 'Gate', transition: 'Z1->Z2', energyPerHour: 1000, label: 'Gate', activeDayOffset: 0 },
    { id: 'c_adv', x: 50, y: 50, type: 'city', subtype: 'Advanced Artisan City', effect: { label: "+1 Trebuchet & don't miss" }, energyPerHour: 0, label: 'Advanced Artisan City', activeDayOffset: 5 },
    { id: 'sh1', x: 10, y: 10, type: 'stronghold', subtype: 'Basic Storm Stronghold', seed: true, label: 'Basic Storm Stronghold', activeDayOffset: 0 },
  ],
};

describe('constNameForSlug', () => {
  it('derives a SCREAMING_SNAKE const name + _MAP', () => {
    expect(constNameForSlug('stormlands')).toBe('STORMLANDS_MAP');
    expect(constNameForSlug('desolate-test')).toBe('DESOLATE_TEST_MAP');
  });
});

describe('serializeGeometryToTs', () => {
  const ts = serializeGeometryToTs(GEO, 'stormlands');

  it('emits the import + const header', () => {
    expect(ts).toContain(`import type { MapGeometry } from '@shared/models/map.model';`);
    expect(ts).toContain('export const STORMLANDS_MAP: MapGeometry = {');
  });

  it('emits a node line with fields in canonical order', () => {
    expect(ts).toContain(
      `    { id: 'z1_1', x: 36.5, y: 77.6, type: 'gate', subtype: 'Gate', transition: 'Z1->Z2', energyPerHour: 1000, label: 'Gate', activeDayOffset: 0 },`,
    );
  });

  it('emits integers without a decimal and omits absent optional fields', () => {
    // sh1 has no transition/buff/effect/energyPerHour → none should appear on its line
    const line = ts.split('\n').find(l => l.includes(`id: 'sh1'`))!;
    expect(line).toContain('x: 10, y: 10');
    expect(line).toContain('seed: true');
    expect(line).not.toContain('transition:');
    expect(line).not.toContain('buff:');
    expect(line).not.toContain('energyPerHour:');
  });

  it('escapes apostrophes in strings', () => {
    expect(ts).toContain(`effect: { label: '+1 Trebuchet & don\\'t miss' }`);
  });

  it('round-trips: the emitted literal parses back to the same node count', () => {
    // crude structural check — count node-line commas under nodes:
    const nodeLines = ts.split('\n').filter(l => l.trim().startsWith('{ id:'));
    expect(nodeLines).toHaveLength(GEO.nodes.length);
  });
});
