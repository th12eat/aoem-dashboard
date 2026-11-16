import { describe, it, expect } from 'vitest';
import { validateConfig } from './validate-config';
import type { EventDashboardConfig } from '@shared/models/event-dashboard-config.model';

const VALID: EventDashboardConfig = {
  slug: 'stormlands',
  kvkTheme: 'stormlands',
  titleKey: 'stormlands.title',
  dataSource: { kind: 'static', slug: 'stormlands' },
  tabs: [
    {
      id: 'overview',
      labelKey: 'stormlands.tabs.overview',
      widgets: [
        { kind: 'countdown', bind: 'meta' },
        { kind: 'scoreboard', bind: 'kingdomScoreboard' },
      ],
    },
  ],
};

describe('validateConfig', () => {
  it('accepts a well-formed config', () => {
    expect(validateConfig(VALID)).toEqual([]);
  });

  it('rejects a non-object', () => {
    expect(validateConfig(null)).toContain('config must be an object');
  });

  it('flags missing required top-level fields', () => {
    const errors = validateConfig({ tabs: [] });
    expect(errors.some(e => e.includes('slug'))).toBe(true);
    expect(errors.some(e => e.includes('kvkTheme'))).toBe(true);
    expect(errors.some(e => e.includes('titleKey'))).toBe(true);
  });

  it('rejects an unknown widget kind', () => {
    const bad = structuredClone(VALID);
    (bad.tabs[0].widgets[0] as { kind: string }).kind = 'bogus';
    expect(validateConfig(bad).some(e => e.includes('unknown kind "bogus"'))).toBe(true);
  });

  it('rejects a bad dataSource kind', () => {
    const bad = structuredClone(VALID);
    (bad.dataSource as { kind: string }).kind = 'csv';
    expect(validateConfig(bad).some(e => e.includes('dataSource.kind'))).toBe(true);
  });

  it('rejects duplicate tab ids and empty widget lists', () => {
    const bad = structuredClone(VALID);
    bad.tabs.push({ id: 'overview', labelKey: 'x', widgets: [] });
    const errors = validateConfig(bad);
    expect(errors.some(e => e.includes('duplicate tab id'))).toBe(true);
    expect(errors.some(e => e.includes('at least one widget'))).toBe(true);
  });

  it('rejects an empty-string bind', () => {
    const bad = structuredClone(VALID);
    bad.tabs[0].widgets[1].bind = '';
    expect(validateConfig(bad).some(e => e.includes('bind must be a non-empty string'))).toBe(true);
  });
});
