// Extracted verbatim from the model page's Component.compute()/subScore() in
// DG-Rating-Model.html into a pure function — same algorithm, no UI/state
// coupling, so both the wizard's live preview and the certificate view can
// share one implementation.
import { HUES, resolve } from './dgEngine';
import { MACROS, RATINGS, THRESH } from './ratings';
import type { ComputeResult, RawCategoryConfig, ResolvedSubFactor } from './engine.types';
import type { CamelsState, OverlayState } from '../types/domain';

export function subScore(camels: CamelsState, s: ResolvedSubFactor): number | null {
  const i = camels[s.key];
  if (i === '' || i == null) return null;
  const b = s.bands[+i];
  return b ? b.s : null;
}

export function compute(camels: CamelsState, overlay: OverlayState, categoryConfig: RawCategoryConfig | null): ComputeResult {
  const R = resolve(categoryConfig);
  const w = R.weights;
  const scores: Record<string, number | null> = {};

  for (const f of R.factors) {
    const ss = f.subs.map((s) => subScore(camels, s)).filter((x): x is number => x != null);
    scores[f.key] = ss.length ? ss.reduce((a, c) => a + c, 0) / ss.length : null;
  }

  let tw = 0;
  let sum = 0;
  for (const k in scores) {
    const v = scores[k];
    if (v != null) { tw += w[k] || 0; sum += v * (w[k] || 0); }
  }
  const base = tw > 0 ? sum / tw : null;

  const macro = MACROS.find((m) => m.v === overlay.macro) || MACROS[1];
  const adj = base == null ? null : Math.max(0, Math.min(100, base + macro.adj));

  let idx: number | null = null;
  if (adj != null) {
    idx = THRESH.findIndex((b) => adj >= b);
    if (idx < 0) idx = RATINGS.length - 1;
  }
  const fIdx = idx == null ? null : Math.max(0, Math.min(RATINGS.length - 1, idx - overlay.notch));

  const missing = R.allSubs.filter((s) => subScore(camels, s) == null).length;

  return { scores, w, base, macro, adj, idx, fIdx, missing, factors: R.factors, allSubs: R.allSubs, total: R.total, hues: HUES };
}

export function ratingForIndex(idx: number | null): string | null {
  return idx == null ? null : RATINGS[idx];
}
