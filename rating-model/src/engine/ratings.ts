import type { Band, MacroOption } from './engine.types';

// 20-notch scale, best to worst. Ported verbatim from the model page.
export const RATINGS = [
  'AAA', 'AA+', 'AA', 'AA−', 'A+', 'A', 'A−', 'BBB+', 'BBB', 'BBB−',
  'BB+', 'BB', 'BB−', 'B+', 'B', 'B−', 'CCC+', 'CCC', 'CC', 'C',
] as const;

// Parallel array: minimum adjusted score to reach the rating at the same
// index. THRESH.length === RATINGS.length.
export const THRESH = [93, 89, 85, 81, 77, 73, 69, 64, 59, 54, 49, 44, 39, 34, 29, 24, 19, 15, 12] as const;

export const MACROS: MacroOption[] = [
  { v: 'supportive', label: 'Supportive (+3)', adj: 3 },
  { v: 'neutral', label: 'Neutral (0)', adj: 0 },
  { v: 'challenging', label: 'Challenging (−4)', adj: -4 },
  { v: 'stressed', label: 'Stressed (−8)', adj: -8 },
];

// Band-score curve helpers — each takes N ordered descriptions (best to
// worst) and pairs them with a fixed score curve.
export const B5 = (...t: string[]): Band[] => t.map((x, i) => ({ t: x, s: [100, 75, 50, 25, 0][i] }));
export const B6 = (...t: string[]): Band[] => t.map((x, i) => ({ t: x, s: [50, 100, 75, 50, 25, 0][i] }));
export const B4 = (...t: string[]): Band[] => t.map((x, i) => ({ t: x, s: [100, 66, 33, 0][i] }));
export const B4P = (...t: string[]): Band[] => t.map((x, i) => ({ t: x, s: [100, 50, 25, 0][i] }));
