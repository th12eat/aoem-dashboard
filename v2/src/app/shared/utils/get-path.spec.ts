import { describe, it, expect } from 'vitest';
import { getPath } from './get-path';

describe('getPath', () => {
  const obj = { a: { b: { c: 42 } }, list: [1, 2, 3], research: { opponents: ['x'] } };

  it('resolves a nested dot path', () => {
    expect(getPath(obj, 'a.b.c')).toBe(42);
    expect(getPath(obj, 'research.opponents')).toEqual(['x']);
  });

  it('returns the whole object for an empty/undefined path', () => {
    expect(getPath(obj, undefined)).toBe(obj);
    expect(getPath(obj, '')).toBe(obj);
  });

  it('returns undefined for a missing segment', () => {
    expect(getPath(obj, 'a.x.y')).toBeUndefined();
    expect(getPath(obj, 'nope')).toBeUndefined();
  });

  it('is safe on null/primitives mid-path', () => {
    expect(getPath(null, 'a')).toBeUndefined();
    expect(getPath({ a: 5 }, 'a.b')).toBeUndefined();
  });
});
