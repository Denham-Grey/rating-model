export interface Band {
  t: string;
  s: number;
}

export interface SubFactorDef {
  key: string;
  label: string;
  bands: Band[];
}

export interface FactorDef {
  key: string;
  title: string;
  stage: 2 | 3;
  subs: SubFactorDef[];
}

export type WeightMap = Record<string, number>;

export interface ResolvedSubFactor {
  key: string;
  label: string;
  factor: string;
  ftitle: string;
  quant: boolean;
  bands: Band[];
}

export interface ResolvedFactorConfig {
  key: string;
  title: string;
  stage: 2 | 3;
  hue: string;
  weight: number;
  subs: ResolvedSubFactor[];
}

export interface ResolvedConfig {
  factors: ResolvedFactorConfig[];
  weights: WeightMap;
  allSubs: ResolvedSubFactor[];
  total: number;
}

// The shape a category's raw config can take before resolve(): either an
// already-structured factors array, or a sparse {weights, scores} overlay
// on the static FACTORS defaults.
export interface RawCategoryConfig {
  factors?: Array<{
    key: string;
    title: string;
    stage: 2 | 3;
    weight: number;
    subs: Array<{ key: string; label: string; quant?: boolean; bands: Band[] }>;
  }>;
  weights?: WeightMap;
  scores?: Record<string, number[]>;
}

export interface InstitutionCategoryDef {
  key: 'microfinance' | 'commercial' | 'finance';
  label: string;
  licenses: string[];
  config: RawCategoryConfig | null;
}

export interface MacroOption {
  v: 'supportive' | 'neutral' | 'challenging' | 'stressed';
  label: string;
  adj: number;
}

export interface ComputeResult {
  scores: Record<string, number | null>;
  w: WeightMap;
  base: number | null;
  macro: MacroOption;
  adj: number | null;
  idx: number | null;
  fIdx: number | null;
  missing: number;
  factors: ResolvedFactorConfig[];
  allSubs: ResolvedSubFactor[];
  total: number;
  hues: Record<string, string>;
}
