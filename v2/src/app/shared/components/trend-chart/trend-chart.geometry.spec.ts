import { describe, it, expect } from 'vitest';
import { plotTrend, type TrendSeries } from './trend-chart.geometry';

const S: TrendSeries[] = [
  { label: 'A', color: '#f00', points: [{ label: '1', y: 0 }, { label: '2', y: 50 }, { label: '3', y: 100 }] },
];

describe('plotTrend', () => {
  it('maps the lowest value to the bottom and highest to the top of the plot', () => {
    const g = plotTrend(S, n => String(n));
    const dots = g.series[0].dots;
    expect(dots).toHaveLength(3);
    // y increases downward in SVG: min value → largest y, max value → smallest y
    expect(dots[0].y).toBeGreaterThan(dots[2].y);
  });

  it('spreads points evenly across the plot width', () => {
    const g = plotTrend(S, n => String(n));
    const xs = g.series[0].dots.map(d => d.x);
    expect(xs[0]).toBeLessThan(xs[1]);
    expect(xs[1]).toBeLessThan(xs[2]);
  });

  it('emits a polyline string + last-value marker', () => {
    const g = plotTrend(S, n => `${n}u`);
    expect(g.series[0].polyline.split(' ')).toHaveLength(3);
    expect(g.series[0].last).not.toBeNull();
    expect(g.series[0].last!.value).toBe(100);
  });

  it('adds a zero baseline only when values straddle 0 (%-growth)', () => {
    const flat = plotTrend([{ label: 'P', color: '#0f0', points: [{ label: 'a', y: 10 }, { label: 'b', y: 20 }] }], n => String(n));
    expect(flat.zeroY).toBeNull();
    const cross = plotTrend([{ label: 'P', color: '#0f0', points: [{ label: 'a', y: -5 }, { label: 'b', y: 15 }] }], n => String(n));
    expect(cross.zeroY).not.toBeNull();
  });

  it('gives 5 y ticks and one x label per point', () => {
    const g = plotTrend(S, n => String(n));
    expect(g.yTicks).toHaveLength(5);
    expect(g.xLabels.map(l => l.label)).toEqual(['1', '2', '3']);
  });
});
