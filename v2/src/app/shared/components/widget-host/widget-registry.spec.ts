import { describe, it, expect } from 'vitest';
import { WIDGET_REGISTRY } from './widget-registry';
import { WIDGET_KINDS } from '@shared/models/event-dashboard-config.model';

describe('WIDGET_REGISTRY', () => {
  it('has a component for every declared widget kind', () => {
    for (const kind of WIDGET_KINDS) {
      expect(WIDGET_REGISTRY[kind], `missing registry entry for "${kind}"`).toBeTruthy();
    }
  });

  it('declares no components for kinds outside WIDGET_KINDS', () => {
    const known = new Set<string>(WIDGET_KINDS);
    for (const key of Object.keys(WIDGET_REGISTRY)) {
      expect(known.has(key), `registry has unexpected kind "${key}"`).toBe(true);
    }
  });
});
