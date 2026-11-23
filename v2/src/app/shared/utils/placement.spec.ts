import { describe, it, expect } from 'vitest';
import { withPlacements } from './placement';

describe('withPlacements', () => {
  const doc = {
    kingdomScoreboard: [
      { server: 'Era 8', points: '50,000,000' },
      { server: 'Era #039', points: '113,600,000' },
      { server: 'Era #038', points: '70,100,000' },
      { server: 'Era #015', points: '66,100,000' },
    ],
    eventConfig: {
      kingdoms: [
        { server: 'Era 8' },
        { server: 'Era #039' },
        { server: 'Era #038' },
        { server: 'Era #015' },
      ],
    },
  };

  it('ranks servers by points desc into a placements map', () => {
    const out = withPlacements(doc);
    expect(out['placements']).toEqual({
      'Era #039': 1,
      'Era #038': 2,
      'Era #015': 3,
      'Era 8': 4,
    });
  });

  it('stamps placement onto each kingdom entry', () => {
    const out = withPlacements(doc);
    const kingdoms = (out['eventConfig'] as Record<string, unknown>)['kingdoms'] as Record<string, unknown>[];
    expect(kingdoms.find(k => k['server'] === 'Era #039')!['placement']).toBe(1);
    expect(kingdoms.find(k => k['server'] === 'Era 8')!['placement']).toBe(4);
  });

  it('does not mutate the input and no-ops with an empty scoreboard', () => {
    const empty = { kingdomScoreboard: [] };
    expect(withPlacements(empty)).toBe(empty);
    const before = JSON.stringify(doc);
    withPlacements(doc);
    expect(JSON.stringify(doc)).toBe(before);
  });
});
