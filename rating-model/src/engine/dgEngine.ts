// Ported verbatim from the DGEngine module in DG-Rating-Model.html
// (model_res — the ~15KB module shared by the landing/model/engine pages).
import { B4, B4P, B5, B6 } from './ratings';
import type {
  FactorDef,
  InstitutionCategoryDef,
  RawCategoryConfig,
  ResolvedConfig,
  WeightMap,
} from './engine.types';

export const FACTORS: FactorDef[] = [
  {
    key: 'capital', title: 'Capital adequacy', stage: 2, subs: [
      { key: 'cap_t1', label: 'Regulatory Tier 1 Capital to Risk-Weighted Assets', bands: B5('Extremely strong capital base (>15%)', 'Strong capital base (11-15%)', 'Good capital base (7-10%)', 'Adequate capital base (3-6%)', 'Weak capital base (<3%)') },
      { key: 'cap_lev', label: "Leverage Ratio (LTD above 1 year / Total Shareholders' Fund)", bands: B5('Very Low Leverage Ratio (<10%)', 'Low Leverage Ratio (11-20%)', 'Moderate Leverage Ratio (21-30%)', 'High Leverage Ratio (31-40%)', 'Very High Leverage Ratio (>40%)') },
      { key: 'cap_fl', label: "Total Assets to Total Shareholders' Fund", bands: B5('Very Low Financial Leverage (<1.5)', 'Low Financial Leverage (1.5-3)', 'Moderate Financial Leverage (4-5)', 'High Financial Leverage (6-8)', 'Very High Financial Leverage (>8)') },
      { key: 'cap_sh', label: 'Category of Shareholders', bands: B5('International Financial Institutions', 'Tier 1 National Financial Institutions', 'Other Corporate Institutional Investors (International)', 'Other Corporate Institutional Investors (National)', 'Largely Retail / Individual Investors') },
      { key: 'cap_rwa', label: 'RWA to Total Assets', bands: B4('Low Risk (<60%)', 'Medium Risk (60-70%)', 'High to Medium Risk (70-80%)', 'High Risk (>80%)') },
      { key: 'cap_plan', label: 'Credibility of capital plan', bands: B5('Fully funded, stress tested and credible board approved plan with committed investors', 'Strong and mostly funded board approved plan with minor gaps', 'Reasonable board approved plan but mainly assumptions', 'Weak and unfunded plan', 'No credible and actionable plan') },
      { key: 'cap_eq', label: 'Access to Fresh Equity', bands: B5('Immediate access with strong sponsors backed by signed commitments and market access', 'Good access with strong sponsors with no signed commitments', 'Moderate access with potential sponsors', 'Limited access to fresh equity from credible sponsors', 'No access to reliable sponsors') },
      { key: 'cap_div', label: 'Dividend Policy', bands: B5('Highly conservative and aimed to build core capital', 'Prudent in line with regulatory expectations', 'Balanced to provide returns to shareholders and retain some capital', 'Aggressive and geared primarily towards ensuring payout to shareholders', 'Unsustainable and not focused on growing the capital of the institution') },
    ],
  },
  {
    key: 'asset', title: 'Asset quality', stage: 2, subs: [
      { key: 'aq_npc', label: 'Non-performing loans net of provisions to Capital', bands: B5('Very Low Problem Loan to Capital Ratio (<8%)', 'Low Problem Loan to Capital Ratio (8-11%)', 'Moderate Problem Loan to Capital Ratio (12-15%)', 'High Problem Loan to Capital Ratio (16-20%)', 'Very High Problem Loan to Capital Ratio (>20%)') },
      { key: 'aq_npl', label: 'Non-Performing Loans (NPLs) to Total Loans', bands: B5('NPL <3% of gross loans and well above the peer group average', 'NPL between 3-5% of gross loans and well above peer group average', 'NPL between 5-10% of gross loans and in line with peer group average', 'NPL between 10-20% of gross loans and slightly below national industry average', 'NPL above 20% of gross loans and well above national industry average') },
      { key: 'aq_prov', label: 'Total Impairment Provisions to Gross NPLs', bands: B5('Impairment Provision >79% of gross non-performing loans', 'Impairment Provision between 60-79% of gross non-performing loans', 'Impairment Provision between 40-59% of gross non-performing loans', 'Impairment Provision between 20-39% of gross non-performing loans', 'Impairment Provision below 20% of gross non-performing loans') },
      { key: 'aq_ppop', label: 'Pre-provisioning operating profit to provisions', bands: B4P('>350%', '200-350%', '130-200%', '0-130%') },
      { key: 'aq_geo', label: 'Geographical Distribution Risk', bands: B5('Highly diversified in terms of geography with presence in 36 states of Nigeria', 'Highly diversified in terms of geography with presence in 15 states of Nigeria', 'Somewhat diversified in terms of geography with presence in at least two regions of Nigeria', 'Concentrated in a region of Nigeria', 'Not diversified') },
      { key: 'aq_par', label: 'Portfolio-at-Risk to Total Loans', bands: B5('PAR <3% of gross loans and well above the peer group average', 'PAR between 3-5% of gross loans and well above peer group average', 'PAR between 5-10% of gross loans and in line with peer group average', 'PAR between 10-20% of gross loans and slightly below national industry average', 'PAR above 20% of gross loans and well above national industry average') },
      { key: 'aq_sect', label: 'Sectoral Concentration Risk', bands: B5('Highly diversified in terms of products, sector, customer base and maturity', 'Well diversified in terms of products, sector, customer base and maturity', 'Somewhat diversified with minor concentrations', 'Concentrated in few industries', 'Not diversified') },
      { key: 'aq_lost', label: "Portfolio classified as 'lost'", bands: B5('Lost Portfolio <1%', 'Lost Portfolio >1% and <2.5%', 'Lost Portfolio >2.5% and <4%', 'Lost Portfolio >4% and <6%', 'Lost Portfolio >6%') },
      { key: 'aq_rag', label: 'Risk asset growth rate', bands: B5('Growth ≤20%, or higher growth fully supported by capital and asset quality; CAR remains comfortably above regulatory minimum', 'Growth of 20-30% with adequate capital and stable asset quality; CAR slightly above prudential requirements', 'Growth of 30-40%; no capital growth; CAR in line with regulatory minimum', 'Growth above 40% with limited capital support, declining CAR, or asset quality', 'Growth above 40% unsupported by capital or funding, significant deterioration in CAR, liquidity, or asset quality') },
    ],
  },
  {
    key: 'mgmt', title: 'Management', stage: 3, subs: [
      { key: 'm_strat', label: 'Strategy (Earnings Volatility, last 5 years)', bands: B5('Consistent Year on Year growth in Pretax Profit in last 4 consecutive years', 'Growth in Pretax Profit in 2 of last 4 years (last two consecutive years inclusive)', 'Growth in Pretax Profit in 2 of last 4 years (last year inclusive)', 'Growth in Pretax Profit in 2 of last 4 years', 'Less than 2 years of growth in the last 4 years') },
      { key: 'm_cbn', label: 'Most recent CBN/NDIC Composite Rating', bands: B5('Low Composite Risk', 'Moderate Composite Risk', 'Above Average Risk', 'High Composite Risk', 'No Rating') },
      { key: 'm_ins', label: "Insider Related Exposure to Shareholders' Fund", bands: B5('0-5%', '5-10%', '10-15%', '15-20%', '>20%') },
      { key: 'm_acc', label: 'CBN Approval of Annual Accounts', bands: B5('Within 4 months of the Financial Year-End', 'Within 6 months of the Financial Year-End', 'Within 9 months of the Financial Year-End', 'Within 12 months of the Financial Year-End', 'Over 12 months after the Financial Year-End') },
      { key: 'm_appr', label: 'CBN Approval of Board & Management', bands: B5('All Board and Management are CBN approved', '80% of Board and Management, including the MD, are CBN approved', '50% of Board and Management, including the MD, are CBN approved', '50% of Board and Management, except the MD, are CBN approved', 'Less than 50% of Board and Management, including the MD, are CBN approved') },
      { key: 'm_pub', label: 'Publication of audited financial statements & Tier of Auditor', bands: B5('Reputable International auditor and prompt publication of financials', 'Reputable International auditor with some delay in publication of financials', 'Well known regional auditor and prompt publication of financials', 'Well known regional auditor with some delay in publication of financials', 'Significant delay in publication of financials') },
      { key: 'm_gov', label: 'Corporate Governance', bands: B5('Effective board with competent/autonomous committees & satisfactory corporate governance report', 'Effective board with autonomous committees', 'Passive board with competent, strong and autonomous committees', 'Passive board with autonomous committees', 'Board exercises limited oversight over business activities') },
      { key: 'm_tech', label: 'Technology, Cybersecurity & Operational Resilience', bands: B5('Robust and International Best Practice', 'Robust and National Best Practice', 'Adequate with some room for improvement', 'Inadequate and requires an overhaul', 'Little to no IT infrastructure') },
      { key: 'm_sanc', label: 'Regulatory sanctions', bands: B5('None', 'Single minor sanction/penalty in the last three years', 'One major sanction/penalty in the last three years', 'Multiple sanctions in the last three years', 'Severe regulatory action') },
      { key: 'm_succ', label: 'Succession plan', bands: B5('Well documented, Board approved and tested', 'Well documented, Board approved but untested', 'Documented, unapproved/untested', 'Informal succession plan', 'No succession plan') },
    ],
  },
  {
    key: 'earn', title: 'Earnings', stage: 2, subs: [
      { key: 'e_nim', label: 'Adjusted Net Interest Margin', bands: B5('Very High Net Interest Margin (>6%)', 'High Net Interest Margin (4-6%)', 'Moderate Net Interest Margin (2-4%)', 'Low Net Interest Margin (0-2%)', 'Very Low Net Interest Margin (<0%)') },
      { key: 'e_roa', label: 'Return on Assets (ROA)', bands: B5('Extremely strong - well above Peer group average and >3.5%', 'Strong - Peer group average and between 2.51 and 3.5%', 'Good - in line with Peer group average and between 2.0 and 2.5%', 'Adequate - slightly below Peer group average and between 1.5 and 2.0%', 'Poor - well below Peer group average and <1.5%') },
      { key: 'e_roe', label: 'Return on Equity (ROE)', bands: B5('Extremely strong - well above Peer group average and >26%', 'Strong - Peer group average and between 21 and 25%', 'Good - in line with Peer group average and between 16 and 20%', 'Adequate - slightly below Peer group average and between 10 and 15%', 'Poor - well below Peer group average and <10%') },
      { key: 'e_cir', label: 'Cost to income ratio', bands: B6('<35%', '35-45%', '45-55%', '55-65%', '65-75%', '>75%') },
      { key: 'e_oneoff', label: 'One-off gains (asset sales/revaluation) to total income', bands: B5('<5%', '5-10%', '10-20%', '20-35%', '>35%') },
    ],
  },
  {
    key: 'liq', title: 'Liquidity', stage: 2, subs: [
      { key: 'l_ldr', label: 'Loans to Deposit Ratio', bands: B6('Below 40%', 'Between 40 and 50%', 'Between 51 and 60%', 'Between 61 and 70%', 'Between 71 and 80%', 'Exceeds 81%') },
      { key: 'l_wacf', label: 'Weighted average cost of funds', bands: B6('0-3%', '3-5%', '5-8%', '8-12%', '12-15%', '>15%') },
      { key: 'l_liq', label: 'Liquid Assets to Short-Term Liabilities', bands: B5('>40%', '31-40%', '21-30%', '11-20%', '<10%') },
      { key: 'l_fm', label: 'Funding maturity', bands: B5('Long-tenor, well-matched funding with contractually committed sources', 'Predominantly stable medium-to-long term funding with modest mismatches', 'Mixed funding profile with material reliance on short-term or rollover-dependent sources', 'Predominantly short-term funding with significant asset-liability mismatch', 'Acute maturity mismatch with concentrated, confidence-sensitive funding') },
      { key: 'l_cfp', label: 'Liquidity contingency funding plan', bands: B5('Fully operational, tested and board approved plan with committed facilities', 'Strong board approved plan with largely secured funding sources and minor gaps', 'Reasonable board approved plan but reliant on uncommitted and untested sources', 'Weak plan with unsecured sources and no testing', 'No credible and actionable contingency funding plan') },
      { key: 'l_ret', label: 'Retail deposit growth', bands: B5('Above 25%', '20-25%', '10-20%', 'Below 10%', 'Reduction in retail deposits') },
    ],
  },
  {
    key: 'sens', title: 'Sensitivity to market factors', stage: 3, subs: [
      { key: 's_trade', label: 'Traded Assets to Total Assets', bands: B5('0-10%', '10-20%', '20-30%', '30-40%', '>40%') },
      { key: 's_fv', label: 'Fair Value Gain (Loss) to AFS portfolio', bands: B4('>20%', '11-20%', '0-10%', '<0') },
      { key: 's_fx', label: 'Net open FX position to Capital', bands: B5('<5%', '5-10%', '10-15%', '15-20%', '>20%') },
    ],
  },
];

export const DEFAULT_WEIGHTS: WeightMap = { capital: 25, asset: 25, mgmt: 20, earn: 15, liq: 10, sens: 5 };

export const PRESETS: Record<string, WeightMap> = {
  standard: { capital: 25, asset: 25, mgmt: 20, earn: 15, liq: 10, sens: 5 },
  'capital-focused': { capital: 35, asset: 25, mgmt: 10, earn: 10, liq: 15, sens: 5 },
  conservative: { capital: 30, asset: 30, mgmt: 10, earn: 10, liq: 15, sens: 5 },
};

export const HUES: Record<string, string> = {
  capital: 'oklch(66% 0.12 290)', asset: 'oklch(72% 0.11 185)', mgmt: 'oklch(76% 0.11 85)',
  earn: 'oklch(71% 0.13 150)', liq: 'oklch(70% 0.10 235)', sens: 'oklch(69% 0.13 350)',
};

export const PALETTE = [
  'oklch(66% 0.12 290)', 'oklch(72% 0.11 185)', 'oklch(76% 0.11 85)', 'oklch(71% 0.13 150)',
  'oklch(70% 0.10 235)', 'oklch(69% 0.13 350)', 'oklch(70% 0.13 30)', 'oklch(72% 0.11 130)',
  'oklch(68% 0.13 320)', 'oklch(74% 0.11 55)', 'oklch(70% 0.12 260)', 'oklch(72% 0.10 165)',
];

export const QUANT: Record<string, 1> = { cap_t1: 1, cap_lev: 1, cap_fl: 1, cap_rwa: 1 };

export function hueFor(key: string, index?: number): string {
  if (HUES[key]) return HUES[key];
  const i = index ?? 0;
  return PALETTE[((i % PALETTE.length) + PALETTE.length) % PALETTE.length];
}

interface StructuredFactor {
  key: string;
  title: string;
  stage: 2 | 3;
  weight: number;
  subs: Array<{ key: string; label: string; quant: boolean; bands: { t: string; s: number }[] }>;
}

function structFromFactors(fs: FactorDef[]): StructuredFactor[] {
  return fs.map((f) => ({
    key: f.key, title: f.title, stage: f.stage ?? 2,
    weight: DEFAULT_WEIGHTS[f.key] != null ? DEFAULT_WEIGHTS[f.key] : 0,
    subs: f.subs.map((s) => ({
      key: s.key, label: s.label, quant: !!QUANT[s.key],
      bands: s.bands.map((b) => ({ t: b.t, s: b.s })),
    })),
  }));
}

export function defaultConfig(): RawCategoryConfig {
  return { factors: structFromFactors(FACTORS) };
}

// Institution categories. Microfinance Banks is the adopted standard; the
// others carry config:null until their own factors/scores are configured.
export function categories(publishedConfig: RawCategoryConfig | null): InstitutionCategoryDef[] {
  return [
    {
      key: 'microfinance', label: 'Microfinance Banks',
      licenses: ['National Microfinance Bank', 'State Microfinance Bank', 'Unit Microfinance Bank'],
      config: publishedConfig || defaultConfig(),
    },
    {
      key: 'commercial', label: 'Commercial Banks',
      licenses: ['International Commercial Bank', 'National Commercial Bank', 'Regional Commercial Bank'],
      config: null,
    },
    {
      key: 'finance', label: 'Finance Companies',
      licenses: ['Finance Company', 'Money Lender'],
      config: null,
    },
  ];
}

export function resolve(cfg: RawCategoryConfig | null | undefined): ResolvedConfig {
  let structure: StructuredFactor[];
  if (cfg && Array.isArray(cfg.factors) && cfg.factors.length) {
    structure = cfg.factors.map((f) => ({
      ...f,
      subs: f.subs.map((s) => ({ ...s, quant: !!s.quant })),
    }));
  } else if (cfg && (cfg.weights || cfg.scores)) {
    const sc = cfg.scores || {};
    const wt = cfg.weights || {};
    structure = FACTORS.map((f) => ({
      key: f.key, title: f.title, stage: f.stage,
      weight: wt[f.key] != null ? wt[f.key] : DEFAULT_WEIGHTS[f.key],
      subs: f.subs.map((s) => ({
        key: s.key, label: s.label, quant: !!QUANT[s.key],
        bands: s.bands.map((b, i) => ({ t: b.t, s: sc[s.key]?.[i] != null ? sc[s.key][i] : b.s })),
      })),
    }));
  } else {
    structure = structFromFactors(FACTORS);
  }

  const factors = structure.map((f, fi) => ({
    key: f.key, title: f.title, stage: (Number(f.stage) === 3 ? 3 : 2) as 2 | 3,
    hue: hueFor(f.key, fi), weight: Number(f.weight) || 0,
    subs: (f.subs || []).map((s) => ({
      key: s.key, label: s.label, factor: f.key, ftitle: f.title, quant: !!s.quant,
      bands: (s.bands || []).map((b) => ({ t: b.t, s: Number(b.s) || 0 })),
    })),
  }));

  const weights: WeightMap = {};
  factors.forEach((f) => { weights[f.key] = f.weight; });
  const allSubs = factors.flatMap((f) => f.subs);
  return { factors, weights, allSubs, total: allSubs.length };
}
