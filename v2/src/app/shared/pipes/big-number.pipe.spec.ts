import { describe, it, expect } from 'vitest';
import { BigNumberPipe } from './big-number.pipe';

describe('BigNumberPipe', () => {
  const pipe = new BigNumberPipe();

  it('uses a NumericValue display verbatim', () => {
    expect(pipe.transform({ value: 50200000000, display: '50,200,000,000' })).toBe('50,200,000,000');
  });

  it('compacts a raw number', () => {
    expect(pipe.transform(50200000000)).toBe('50.2B');
  });

  it('renders a dash for null/undefined', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
  });

  it('renders a dash when a NumericValue has empty display', () => {
    expect(pipe.transform({ value: NaN, display: '' })).toBe('—');
  });
});
