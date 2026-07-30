// Client-only document storage — ported as-is from DG-Rating-Model.html.
// This never went through the app's shared storage helper even in the
// original (a direct localStorage.setItem call bypassing it), and stays
// client-only per the migration's explicit scope decision.
import type { AssessmentDoc } from '../../types/domain';

export const DOC_LIMIT = 4 * 1024 * 1024;

export function docKeyFor(assessmentId: string): string {
  return 'dg-mfb-docs-' + assessmentId;
}

export function readDocs(docKey: string): AssessmentDoc[] {
  try {
    const v = JSON.parse(localStorage.getItem(docKey) || 'null');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function writeDocs(docKey: string, docs: AssessmentDoc[]): { ok: true } | { ok: false } {
  try {
    localStorage.setItem(docKey, JSON.stringify(docs));
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
