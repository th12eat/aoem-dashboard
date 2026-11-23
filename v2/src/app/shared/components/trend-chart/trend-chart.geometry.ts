/** A data point: x position (0-based index), its label, and the y value. */
export interface TrendPoint {
  label: string;
  y: number;
}
export interface TrendSeries {
  label: string;
  color: string;
  points: TrendPoint[];
}

export interface PlottedSeries {
  label: string;
  color: string;
  /** SVG polyline "x,y x,y …" in viewBox units. */
  polyline: string;
  dots: { x: number; y: number }[];
  last: { x: number; y: number; value: number } | null;
}
export interface TrendGeometry {
  width: number;
  height: number;
  padL: number;
  padR: number;
  padT: number;
  padB: number;
  yTicks: { y: number; label: string }[];
  xLabels: { x: number; label: string }[];
  series: PlottedSeries[];
  /** y of the zero baseline when the range crosses 0 (for %-growth), else null. */
  zeroY: number | null;
}

const W = 100;
const H = 56;
const PAD_L = 2;
const PAD_R = 12; // room for last-value labels
const PAD_T = 3;
const PAD_B = 8; // room for x labels

/** Map series into viewBox geometry (pure — the component just renders this).
 * All series share the x-axis (same number of points, by index) and a common
 * y-range spanning every series. `fmtY` formats the tick + last-value labels. */
export function plotTrend(series: TrendSeries[], fmtY: (n: number) => string): TrendGeometry {
  const n = Math.max(0, ...series.map(s => s.points.length));
  const allY = series.flatMap(s => s.points.map(p => p.y));
  let min = allY.length ? Math.min(...allY) : 0;
  let max = allY.length ? Math.max(...allY) : 1;
  if (min === max) {
    // flat line — pad so it draws mid-height
    min -= 1;
    max += 1;
  }
  // include 0 in the range when values straddle it (%-growth)
  const crossesZero = min < 0 && max > 0;

  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const xFor = (i: number) => PAD_L + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yFor = (v: number) => PAD_T + plotH - ((v - min) / (max - min)) * plotH;

  const plotted: PlottedSeries[] = series.map(s => {
    const dots = s.points.map((p, i) => ({ x: round(xFor(i)), y: round(yFor(p.y)) }));
    const lastPt = s.points[s.points.length - 1];
    return {
      label: s.label,
      color: s.color,
      polyline: dots.map(d => `${d.x},${d.y}`).join(' '),
      dots,
      last: dots.length ? { ...dots[dots.length - 1], value: lastPt.y } : null,
    };
  });

  // 5 y-axis ticks
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const v = min + ((max - min) * i) / 4;
    return { y: round(yFor(v)), label: fmtY(v) };
  });

  // x labels from the first series that has points
  const ref = series.find(s => s.points.length)?.points ?? [];
  const xLabels = ref.map((p, i) => ({ x: round(xFor(i)), label: p.label }));

  return {
    width: W,
    height: H,
    padL: PAD_L,
    padR: PAD_R,
    padT: PAD_T,
    padB: PAD_B,
    yTicks,
    xLabels,
    series: plotted,
    zeroY: crossesZero ? round(yFor(0)) : null,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
