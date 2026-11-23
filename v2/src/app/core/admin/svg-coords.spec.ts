import { describe, it, expect } from 'vitest';
import { clientToPercent, clampToViewBox, parseViewBox } from './svg-coords';

const rect = { left: 100, top: 50, width: 200, height: 200 };
const VB = '0 0 100 100';

describe('clientToPercent', () => {
  it('maps the rect centre to the viewBox centre', () => {
    expect(clientToPercent(rect, VB, 200, 150)).toEqual({ x: 50, y: 50 });
  });
  it('maps the top-left corner to the viewBox origin', () => {
    expect(clientToPercent(rect, VB, 100, 50)).toEqual({ x: 0, y: 0 });
  });
  it('maps the bottom-right corner to the viewBox max', () => {
    expect(clientToPercent(rect, VB, 300, 250)).toEqual({ x: 100, y: 100 });
  });
  it('rounds to one decimal', () => {
    const p = clientToPercent(rect, VB, 133, 83); // 16.5%, 16.5%
    expect(p.x).toBe(16.5);
    expect(p.y).toBe(16.5);
  });
  it('honours a non-origin / non-100 viewBox', () => {
    expect(clientToPercent(rect, '0 0 100 100', 200, 150)).toEqual({ x: 50, y: 50 });
    expect(clientToPercent(rect, '0 0 50 50', 300, 250)).toEqual({ x: 50, y: 50 });
  });
});

describe('clampToViewBox', () => {
  it('clamps points outside the box', () => {
    expect(clampToViewBox({ x: -5, y: 120 }, VB)).toEqual({ x: 0, y: 100 });
  });
  it('leaves interior points untouched', () => {
    expect(clampToViewBox({ x: 42, y: 7 }, VB)).toEqual({ x: 42, y: 7 });
  });
});

describe('parseViewBox', () => {
  it('parses four numbers', () => {
    expect(parseViewBox('0 0 100 100')).toEqual([0, 0, 100, 100]);
  });
});
