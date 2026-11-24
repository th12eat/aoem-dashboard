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

  it('emits a polyline string + last-value marker formatted via fmtY', () => {
    const g = plotTrend(S, n => `${n}u`);
    expect(g.series[0].polyline.split(' ')).toHaveLength(3);
    expect(g.series[0].last).not.toBeNull();
    expect(g.series[0].last!.text).toBe('100u');
  });

  it('prefers a per-series fmt over fmtY for the last-value label', () => {
    const mixed: TrendSeries[] = [
      { label: 'B', color: '#f00', fmt: n => `${n}B`, points: [{ label: '1', y: 17 }] },
    ];
    const g = plotTrend(mixed, n => `${n}%`);
    expect(g.series[0].last!.text).toBe('17B'); // not "17%"
  });

  it('adds a zero baseline only when values straddle 0 (%-growth)', () => {
    const flat = plotTrend([{ label: 'P', color: '#0f0', points: [{ label: 'a', y: 10 }, { label: 'b', y: 20 }] }], n => String(n));
    expect(flat.zeroY).toBeNull();
    const cross = plotTrend([{ label: 'P', color: '#0f0', points: [{ label: 'a', y: -5 }, { label: 'b', y: 15 }] }], n => String(n));
    expect(cross.zeroY).not.toBeNull();
  });

  it('gives 5 y ticks and one x label per point (ungrouped)', () => {
    const g = plotTrend(S, n => String(n));
    expect(g.yTicks).toHaveLength(5);
    expect(g.xLabels.map(l => l.label)).toEqual(['1', '2', '3']);
    expect(g.xTicks).toHaveLength(0);
  });

  it('collapses consecutive same-group points into one centered x label', () => {
    const grouped: TrendSeries[] = [
      {
        label: 'G',
        color: '#f00',
        points: [
          { label: '10-01', group: 'Oct', y: 1 },
          { label: '10-20', group: 'Oct', y: 2 },
          { label: '11-05', group: 'Nov', y: 3 },
          { label: '12-01', group: 'Dec', y: 4 },
        ],
      },
    ];
    const g = plotTrend(grouped, n => String(n));
    // one label per month, in order
    expect(g.xLabels.map(l => l.label)).toEqual(['Oct', 'Nov', 'Dec']);
    // the "Oct" label sits between its two points (centered over the span)
    const octDots = g.series[0].dots.slice(0, 2);
    const octMid = (octDots[0].x + octDots[1].x) / 2;
    expect(g.xLabels[0].x).toBeCloseTo(octMid, 1);
    // boundary ticks between the 3 groups → 2 ticks
    expect(g.xTicks).toHaveLength(2);
  });
});
