import { describe, it, expect } from 'vitest';
import { reconcileStage } from './stage-reconcile';

describe('reconcileStage', () => {
  it('trues up the PRIOR stage to absorb the missing points', () => {
    // stage1=1000, stage2=900 known; on stage 3 we enter stage3=300, total=2300.
    // missing 100 lands on stage 2 → 2300 − (1000 + 300) = 1000.
    const r = reconcileStage([1000, 900, 0, 0, 0], 2, 300, 2300);
    expect(r.values).toEqual([1000, 1000, 300, 0, 0]);
    expect(r.clamped).toBe(false);
  });

  it('sets stage 1 to the grand total (nothing prior to true-up)', () => {
    const r = reconcileStage([0, 0, 0], 0, 50, 1200);
    expect(r.values[0]).toBe(1200);
    expect(r.clamped).toBe(false);
  });

  it('writes the current stage value even without changing the total', () => {
    // enter stage 2 = 500 on a fresh board, total 1500, stage1 known 1000.
    const r = reconcileStage([1000, 0, 0], 1, 500, 1500);
    // prior (stage1) = 1500 − (current 500 + others 0) = 1000
    expect(r.values).toEqual([1000, 500, 0]);
  });

  it('clamps a negative prior to 0 and flags it', () => {
    // stage3=300, total=1000, but others (stage1=1200) already exceed it →
    // prior (stage2) = 1000 − (1200 + 300) = −500 → clamp 0 + warn.
    const r = reconcileStage([1200, 0, 300, 0], 2, 300, 1000);
    expect(r.values[1]).toBe(0);
    expect(r.clamped).toBe(true);
  });

  it('leaves the current stage untouched when its value is null', () => {
    const r = reconcileStage([1000, 900, 400], 2, null, 2400);
    // current (idx2) stays 400; prior (idx1) = 2400 − (1000 + 400) = 1000
    expect(r.values).toEqual([1000, 1000, 400]);
  });

  it('rounds to 3 decimals (billions precision)', () => {
    const r = reconcileStage([1.111, 0], 1, 0.333, 1.5);
    expect(r.values[0]).toBe(1.167); // 1.5 − 0.333
  });
});
