/**
 * Prep stage-point reconciliation (TME). Given the per-stage values for one
 * side, the stage being entered, that stage's value and the grand total, true
 * up the stages so they sum to the grand total — the "missing" points land on
 * the PRIOR stage (yesterday's under-count), per the admin workflow. Stage 1
 * (no prior) simply becomes the grand total. A prior that would go negative is
 * clamped to 0 and flagged.
 *
 * Pure + total — no I/O. Returns the new values + whether it had to clamp.
 */
export interface ReconcileResult {
  values: number[];
  /** True when the prior stage would have gone negative (clamped to 0). */
  clamped: boolean;
}

export function reconcileStage(values: number[], stageIdx: number, stageValue: number | null, grandTotal: number): ReconcileResult {
  const out = values.slice();
  const idx = Math.max(0, Math.min(stageIdx, out.length - 1));
  if (stageValue != null && Number.isFinite(stageValue)) out[idx] = stageValue;
  if (idx === 0) {
    // nothing prior to true-up — stage 1 absorbs the whole total
    out[0] = round3(grandTotal);
    return { values: out, clamped: false };
  }
  const others = out.reduce((a, v, i) => (i === idx - 1 ? a : a + v), 0);
  const prior = round3(grandTotal - others);
  out[idx - 1] = Math.max(0, prior);
  return { values: out, clamped: prior < 0 };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
