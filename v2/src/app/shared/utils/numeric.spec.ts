import { describe, it, expect } from 'vitest';
import { toNumericValue, formatCompact } from './numeric';

describe('toNumericValue', () => {
  it('parses a grouped display string, preserving the original text', () => {
    const r = toNumericValue('50,200,000,000');
    expect(r.value).toBe(50200000000);
    expect(r.display).toBe('50,200,000,000');
  });

  it('passes a raw number through and derives a compact display', () => {
    const r = toNumericValue(76600000000);
    expect(r.value).toBe(76600000000);
    expect(r.display).toBe('76.6B');
  });

  it('treats the em-dash placeholder as NaN but keeps the dash for display', () => {
    const r = toNumericValue('—');
    expect(Number.isNaN(r.value)).toBe(true);
    expect(r.display).toBe('—');
  });

  it('handles null/undefined/objects gracefully', () => {
    expect(Number.isNaN(toNumericValue(null).value)).toBe(true);
    expect(toNumericValue(undefined).display).toBe('—');
    expect(Number.isNaN(toNumericValue({}).value)).toBe(true);
  });
});

describe('formatCompact', () => {
  it('scales into T/B/M/K with one decimal, dropping trailing .0', () => {
    expect(formatCompact(50200000000)).toBe('50.2B');
    expect(formatCompact(1000000000)).toBe('1B');
    expect(formatCompact(1500000)).toBe('1.5M');
    expect(formatCompact(2500)).toBe('2.5K');
    expect(formatCompact(999)).toBe('999');
  });

  it('returns a dash for non-finite input', () => {
    expect(formatCompact(NaN)).toBe('—');
  });
});
