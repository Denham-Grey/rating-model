import { Link } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useAssessments } from '../hooks/useAssessments';
import { usePublishedEngineConfig } from '../hooks/useEngineConfig';
import { DEFAULT_WEIGHTS } from '../engine/dgEngine';
import { HUES } from '../engine/dgEngine';

const PILLAR_DEFS = [
  { key: 'capital', title: 'Capital adequacy', n: 8, desc: 'Tier 1 strength, leverage, the shareholder base and the credibility of the capital plan.' },
  { key: 'asset', title: 'Asset quality', n: 9, desc: 'NPLs and provisioning cover, portfolio-at-risk, concentration and the pace of risk-asset growth.' },
  { key: 'mgmt', title: 'Management', n: 10, desc: 'Strategy, governance, regulatory standing, disclosure and succession.' },
  { key: 'earn', title: 'Earnings', n: 5, desc: 'Margin, returns, cost discipline and the quality of income.' },
  { key: 'liq', title: 'Liquidity', n: 5, desc: 'The funding mix, cost of funds, contingency planning and deposit growth.' },
  { key: 'sens', title: 'Sensitivity', n: 4, desc: 'Traded assets, fair-value movement and exposure to market factors.' },
] as const;

const TOP_BAR_ACCENT =
  'linear-gradient(90deg, oklch(66% 0.12 290), oklch(72% 0.11 185), oklch(76% 0.11 85), oklch(71% 0.13 150), oklch(70% 0.10 235), oklch(69% 0.13 350))';

const CATEGORY_LABELS: Record<string, string> = {
  microfinance: 'Microfinance Banks',
  commercial: 'Commercial Banks',
  finance: 'Finance Companies',
};

export function LandingPage() {
  const user = useCurrentUser();
  const userId = user.status === 'ready' ? user.userId : undefined;
  const { data: assessments } = useAssessments(userId);
  const { data: publishedConfig } = usePublishedEngineConfig();

  let weights: Record<string, number> = DEFAULT_WEIGHTS;
  let presetLabel = 'standard';
  let presetNote = 'Weights shown follow the standard preset; capital-focused and conservative presets are available inside the model.';
  if (publishedConfig?.weights) {
    weights = { ...weights, ...publishedConfig.weights };
    presetLabel = 'live engine';
    presetNote = 'Weights shown are the current rating-engine settings — last approved by an administrator and applied to every assessment.';
  }

  const pillars = PILLAR_DEFS.map((p) => ({
    title: p.title, desc: p.desc, hue: HUES[p.key], weight: (weights[p.key] ?? 0) + '%', count: p.n + ' of the 41 factors',
  }));

  const categories = [
    { key: 'microfinance', available: true },
    { key: 'commercial', available: false },
    { key: 'finance', available: false },
  ];

  const isAdmin = user.status === 'ready' && user.profile.role === 'admin';
  const recent = (assessments ?? []).slice(0, 3);
  const recentTitle = isAdmin ? 'Recent assessments — all analysts' : 'Your assessments';

  return (
    <PageShell variant="landing">
      <div style={{ minHeight: '100vh', background: 'radial-gradient(720px 340px at 14% -60px, rgba(145,132,217,0.13), transparent 70%), radial-gradient(560px 300px at 94% 6%, rgba(145,132,217,0.06), transparent 70%), var(--color-bg))', fontVariantNumeric: 'tabular-nums' }}>
        <main style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px' }}>
          <section style={{ display: 'grid', gridTemplateColumns: '1fr 296px', gap: 56, padding: '62px 0 58px', alignItems: 'start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10.5, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-neutral-400)' }}>
                <span style={{ width: 26, height: 2, background: TOP_BAR_ACCENT }} />
                Financial institution ratings · ICR-MFB v1.0
              </div>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 54, lineHeight: 1.04, margin: '18px 0 0', maxWidth: '13em' }}>
                Forty-one factors, six pillars, one considered rating.
              </h1>
              <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--color-neutral-300)', maxWidth: '56ch', margin: '20px 0 0' }}>
                The model scores a financial institution on Denham &amp; Grey's own proprietary twenty-notch scale, AAA to C — factoring
                the official CBN benchmark bands across capital, asset quality, management, earnings, liquidity and sensitivity to
                market factors, and weighting the six pillars into a composite. The analyst's overlay and a printable rating
                certificate complete the file.
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 28, alignItems: 'center' }}>
                <Link className="btn btn-primary" to="/model" style={{ textDecoration: 'none' }}>Begin an assessment</Link>
                <a className="btn btn-ghost" href="#method" style={{ textDecoration: 'none' }}>How it works</a>
              </div>
              <div style={{ marginTop: 26, maxWidth: 440 }}>
                <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--color-neutral-400)', marginBottom: 9 }}>
                  Select an institution category
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {categories.map((c) => c.available ? (
                    <Link key={c.key} to="/model" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-accent)', background: 'rgba(145,132,217,0.12)', color: 'var(--color-accent-200)', fontSize: 12.5 }}>
                      {CATEGORY_LABELS[c.key]}<span style={{ fontSize: 12, color: 'var(--color-accent-300)' }}>→</span>
                    </Link>
                  ) : (
                    <span key={c.key} title="Scoring system not configured yet" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-neutral-800)', color: 'var(--color-neutral-500)', fontSize: 12.5, cursor: 'default' }}>
                      {CATEGORY_LABELS[c.key]}
                      <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', border: '1px solid var(--color-neutral-700)', borderRadius: 999, padding: '1px 6px' }}>soon</span>
                    </span>
                  ))}
                </div>
              </div>
              {user.status === 'ready' && (
                <div style={{ marginTop: 26, maxWidth: 430 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--color-neutral-400)' }}>{recentTitle}</span>
                  </div>
                  {recent.length > 0 ? (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {recent.map((a) => (
                        <Link key={a.id} to={`/model?a=${a.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                          <div className="card" style={{ padding: '12px 16px', borderLeft: '2px solid var(--color-accent)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 18, color: 'var(--color-text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {a.name || 'Untitled assessment'}
                              </span>
                              <span style={{ fontSize: 12, color: 'var(--color-accent-300)', flex: 'none' }}>{a.rating || 'Resume →'}</span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--color-neutral-400)', marginTop: 2 }}>
                              {[a.ownerName ? 'by ' + a.ownerName : '', a.filled != null ? `${a.filled} of ${a.total || 41} inputs` : '', a.certNo ? 'cert ' + a.certNo : ''].filter(Boolean).join(' · ')}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted" style={{ fontSize: 12 }}>No assessments yet — begin your first above.</div>
                  )}
                </div>
              )}
            </div>
            <aside className="card" style={{ padding: '18px 18px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--color-neutral-400)' }}>The scale</span>
                <span style={{ fontSize: 11, color: 'var(--color-neutral-500)' }}>score / 100</span>
              </div>
              <div style={{ marginTop: 12 }}>
                {[
                  ['AAA', '93 and above', 'var(--color-text)'],
                  ['AA− to AA+', '81 – 92', 'var(--color-text)'],
                  ['A− to A+', '69 – 80', 'var(--color-text)'],
                  ['BBB− to BBB+', '54 – 68', 'var(--color-text)'],
                ].map(([label, range, color]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 17, color }}>{label}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--color-neutral-400)' }}>{range}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0' }}>
                  <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,var(--color-accent-600),transparent)' }} />
                  <span style={{ fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-accent-300)', whiteSpace: 'nowrap' }}>Investment grade above</span>
                </div>
                {[
                  ['BB− to BB+', '39 – 53'],
                  ['B− to B+', '24 – 38'],
                  ['CCC+ to C', 'below 24'],
                ].map(([label, range]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 17, color: 'var(--color-neutral-200)' }}>{label}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--color-neutral-400)' }}>{range}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid var(--color-neutral-800)', marginTop: 10, paddingTop: 9, fontSize: 11, color: 'var(--color-neutral-500)' }}>
                Twenty notches, AAA – C, before the analyst's overlay.
              </div>
            </aside>
          </section>

          <section style={{ padding: '0 0 58px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 30, margin: 0 }}>The six pillars</h2>
              <span style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--color-neutral-400)' }}>
                CAMELS · {presetLabel} weights
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {pillars.map((p) => (
                <div key={p.title} className="card" style={{ padding: 18 }}>
                  <div style={{ width: 22, height: 2, background: p.hue, boxShadow: `0 0 8px ${p.hue}` }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginTop: 12 }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 20, color: 'var(--color-text)' }}>{p.title}</span>
                    <span style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic', fontSize: 20, color: p.hue, flex: 'none' }}>{p.weight}</span>
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--color-neutral-400)', marginTop: 6 }}>{p.desc}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-neutral-500)', marginTop: 10 }}>{p.count}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--color-neutral-500)', marginTop: 12 }}>{presetNote}</div>
          </section>

          <section id="method" style={{ padding: '0 0 54px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 30, margin: 0 }}>From first entry to certificate</h2>
              <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,var(--color-neutral-700),transparent)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14 }}>
              {[
                ['i.', 'Institution', 'Who is being rated — licence type, location and the analyst of record.'],
                ['ii.', 'Financials', 'Capital, asset quality, earnings and liquidity, band by band against the CBN benchmarks.'],
                ['iii.', 'Mgmt & sensitivity', 'Governance, regulatory standing and exposure to market factors.'],
                ['iv.', 'Overlay', "The analyst's judgement — macro conditions, notching and the outlook, justified in writing."],
                ['v.', 'Rating', 'The composite score, its place on the scale, and a certificate ready to print.'],
              ].map(([numeral, title, desc]) => (
                <div key={title}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic', fontSize: 17, color: 'var(--color-accent-300)' }}>{numeral}</span>
                    <span style={{ fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, color: 'var(--color-neutral-200)' }}>{title}</span>
                  </div>
                  <div style={{ height: 2, margin: '8px 0 9px', background: 'var(--color-neutral-700)' }} />
                  <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--color-neutral-400)' }}>{desc}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 34, paddingTop: 22, borderTop: '1px solid var(--color-neutral-800)' }}>
              <Link className="btn btn-primary" to="/model" style={{ textDecoration: 'none' }}>Begin an assessment</Link>
              <span style={{ fontSize: 12, color: 'var(--color-neutral-500)' }}>
                Sign in with your analyst account — every assessment is saved to its analyst, and all activity is logged in the audit trail.
              </span>
            </div>
          </section>
        </main>
        <footer style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 18, borderTop: '1px solid var(--color-neutral-800)', fontSize: 11, color: 'var(--color-neutral-500)' }}>
            <span>Denham &amp; Grey — Financial Institutions</span>
            <span style={{ width: 26, height: 2, background: TOP_BAR_ACCENT, opacity: 0.85 }} />
            <span style={{ flex: 1 }} />
            <span>Internal use · ICR-MFB v1.0</span>
          </div>
        </footer>
      </div>
    </PageShell>
  );
}
