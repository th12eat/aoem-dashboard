import { describe, it, expect } from 'vitest';
import { extremeCell } from './extreme';

describe('extremeCell', () => {
  const row = [264, 300, 272, 227];

  it('paints the row maximum green+bold', () => {
    const c = extremeCell(row, 300, '300');
    expect(c.color).toBe('#4ade80');
    expect(c.weight).toBe('800');
  });

  it('paints the row minimum red', () => {
    const c = extremeCell(row, 227, '227');
    expect(c.color).toBe('#f87171');
  });

  it('leaves middle values neutral', () => {
    expect(extremeCell(row, 264, '264').color).toBe('#cbd5e1');
  });

  it('renders nulls muted with the placeholder text', () => {
    const c = extremeCell([5, null, 3], null, '—');
    expect(c.text).toBe('—');
    expect(c.color).toBe('var(--text-muted)');
  });

  it('does not colour when all values are equal (no best/worst)', () => {
    const c = extremeCell([10, 10, 10], 10, '10');
    expect(c.color).toBe('#cbd5e1');
  });
});
