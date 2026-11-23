import { describe, it, expect } from 'vitest';
import { roleHas, parseRole } from './access.model';

describe('roleHas', () => {
  it('member can only view dashboards', () => {
    expect(roleHas('member', 'view-dashboard')).toBe(true);
    expect(roleHas('member', 'edit-live-state')).toBe(false);
    expect(roleHas('member', 'edit-geometry')).toBe(false);
  });

  it('strategist can view + edit live state, but NOT geometry', () => {
    expect(roleHas('strategist', 'view-dashboard')).toBe(true);
    expect(roleHas('strategist', 'edit-live-state')).toBe(true);
    expect(roleHas('strategist', 'edit-geometry')).toBe(false);
  });

  it('developer can do everything (cumulative superset)', () => {
    expect(roleHas('developer', 'view-dashboard')).toBe(true);
    expect(roleHas('developer', 'edit-live-state')).toBe(true);
    expect(roleHas('developer', 'edit-geometry')).toBe(true);
  });
});

describe('parseRole', () => {
  it('maps known role strings case-insensitively', () => {
    expect(parseRole('Developer')).toBe('developer');
    expect(parseRole('dev')).toBe('developer');
    expect(parseRole('Strategist')).toBe('strategist');
    expect(parseRole('member')).toBe('member');
  });

  it('defaults unknown / empty / nullish to the least-privileged member', () => {
    expect(parseRole('admin')).toBe('member');
    expect(parseRole('')).toBe('member');
    expect(parseRole(null)).toBe('member');
    expect(parseRole(undefined)).toBe('member');
  });
});
