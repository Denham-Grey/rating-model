// App-level shapes for the jsonb columns Supabase's generated types can't
// describe (assessments.state, configs.data). Table row types themselves
// come from ./supabase.ts (generated from the live schema).

import type { ResolvedFactorConfig } from '../engine/engine.types';

export type UserRole = 'analyst' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'inactive';

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  must_change_password: boolean;
  username: string | null;
  email: string | null;
  status: UserStatus;
  created_at: string;
}

export type InstitutionCategory = 'microfinance' | 'commercial' | 'finance';

export interface InstitutionInfo {
  category: InstitutionCategory;
  name: string;
  type: string;
  country: string;
  assets: string;
  analyst: string;
}

// Keyed by sub-factor key -> selected band index, stored as a string to
// match the original app's <select> value semantics ('' = unanswered).
export type CamelsState = Record<string, string>;

export type MacroOutlook = 'supportive' | 'neutral' | 'challenging' | 'stressed';

export interface OverlayState {
  macro: MacroOutlook;
  notch: number;
  just: string;
  outlook: 'Stable' | 'Positive' | 'Negative' | 'Developing';
  outlookJust: string;
}

export interface Certificate {
  no: string;
  issuedAt: number;
  rating: string;
  score: number;
}

export interface AssessmentComputed {
  name: string;
  category: InstitutionCategory;
  filled: number | null;
  total: number | null;
  score: number | null;
  rating: string | null;
  outlook: string;
  certNo: string | null;
}

// The full shape stored in assessments.state jsonb.
export interface AssessmentState {
  step: number;
  maxVisited: number;
  inst: InstitutionInfo;
  camels: CamelsState;
  overlay: OverlayState;
  cert: Certificate | null;
  __computed?: AssessmentComputed;
}

// App-level view of an assessments row (DB columns + parsed state).
export interface Assessment {
  id: string;
  ownerId: string;
  ownerName: string;
  docKey: string | null;
  state: AssessmentState;
  createdAt: number;
  updatedAt: number;
  // Denormalized from state.__computed, for list views.
  name: string;
  category: InstitutionCategory;
  filled: number | null;
  total: number | null;
  score: number | null;
  rating: string | null;
  outlook: string;
  certNo: string | null;
}

export interface EngineConfigPublished {
  factors: ResolvedFactorConfig[];
  weights: Record<string, number>;
  version: number;
  approvedBy: string;
  approvedById: string | null;
  approvedAt: number;
}

export interface EngineConfigDraft {
  factors: ResolvedFactorConfig[];
}

// The shape stored in configs.data jsonb.
export interface EngineConfigRow {
  draft: EngineConfigDraft | null;
  published: EngineConfigPublished | null;
}

export interface AuditLogEntry {
  ts: number;
  userId: string | null;
  userName: string;
  action: string;
  detail: string;
  aid: string | null;
}

// Doc upload metadata (client-only storage, out of scope for Supabase in
// this migration — kept as a plain type for the model page's local state).
export const DOC_KINDS = [
  'Audited financial statements',
  'Management accounts',
  'CBN / regulatory returns',
  'Board & governance papers',
  'Loan portfolio report',
  'Liquidity / ALCO report',
  'Other',
] as const;
export type DocKind = (typeof DOC_KINDS)[number];

export interface AssessmentDoc {
  name: string;
  file: string;
  kind: DocKind;
  otherKind?: string;
  size: number;
  added: number;
  data: string; // base64 data: URL
}
