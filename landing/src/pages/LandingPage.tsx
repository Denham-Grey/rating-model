import type { ReactNode } from 'react';

/* Public, ungated module directory. This replaces the prototype's
   sign-in-gated "home/launcher" screen — no personalization, no session
   chrome (greeting, role note, status dot, avatar, sign-out, admin
   strip, "your access" panel). Every module opens in a new tab; modules
   without a real deployed URL yet render disabled with a "Coming soon"
   badge rather than linking anywhere. */

const RATING_MODEL_URL = import.meta.env.VITE_RATING_MODEL_URL as
  | string
  | undefined;

function barRow(label: string, pct: number) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 9 }} key={label}>
      <span
        style={{
          width: 82,
          fontSize: 10.5,
          color: 'color-mix(in srgb, var(--color-text) 46%, transparent)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          flex: 1,
          height: 3,
          borderRadius: 2,
          background: 'color-mix(in srgb, var(--color-text) 10%, transparent)',
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            display: 'block',
            height: '100%',
            width: `${pct}%`,
            background: 'color-mix(in srgb, var(--color-accent) 62%, transparent)',
          }}
        />
      </span>
    </span>
  );
}

function CreditRatingPreview() {
  const bars = [1, 1, 1, 1, 1, 1, 0, 0, 0, 0];
  return (
    <>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ font: '10px/1 ui-monospace,Menlo,monospace', letterSpacing: '.12em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--color-text) 42%, transparent)' }}>
          Institutional score
        </span>
        <i className="ph ph-gauge" style={{ fontSize: 16, color: 'var(--color-accent)' }} />
      </span>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
        <span style={{ font: '600 34px/1 var(--font-heading)', color: 'var(--color-accent-200)', fontVariantNumeric: 'lining-nums proportional-nums' }}>BBB</span>
        <span style={{ fontSize: 11, color: 'color-mix(in srgb, var(--color-text) 50%, transparent)' }}>outlook stable</span>
      </span>
      <span style={{ display: 'flex', gap: 3 }}>
        {bars.map((filled, i) => (
          <span
            key={i}
            style={{
              flex: 1,
              height: 5,
              borderRadius: 2,
              background: filled ? 'var(--color-accent)' : 'color-mix(in srgb, var(--color-text) 10%, transparent)',
            }}
          />
        ))}
      </span>
      <span style={{ display: 'grid', gap: 8, marginTop: 'auto' }}>
        {barRow('Capital', 72)}
        {barRow('Governance', 56)}
        {barRow('Book quality', 83)}
      </span>
    </>
  );
}

function GreenRatingPreview() {
  const rows: [string, number, number][] = [
    ['Environmental', 84, 61],
    ['Social', 73, 55],
    ['Governance', 89, 72],
    ['Disclosure', 76, 43],
  ];
  return (
    <>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ font: '10px/1 ui-monospace,Menlo,monospace', letterSpacing: '.12em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--color-text) 42%, transparent)' }}>
          ESG assessment
        </span>
        <i className="ph ph-leaf" style={{ fontSize: 16, color: 'var(--color-accent)' }} />
      </span>
      <span style={{ display: 'grid', gap: 9 }}>
        {rows.map(([label, target, actual]) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 82, fontSize: 10.5, color: 'color-mix(in srgb, var(--color-text) 46%, transparent)' }}>{label}</span>
            <span style={{ flex: 1, position: 'relative', height: 4, borderRadius: 2, background: 'color-mix(in srgb, var(--color-text) 10%, transparent)', overflow: 'hidden' }}>
              <span style={{ position: 'absolute', inset: '0 auto 0 0', width: `${target}%`, background: 'color-mix(in srgb, var(--color-accent) 24%, transparent)' }} />
              <span style={{ position: 'absolute', inset: '0 auto 0 0', width: `${actual}%`, background: 'color-mix(in srgb, var(--color-accent) 70%, transparent)' }} />
            </span>
          </span>
        ))}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 'auto', paddingTop: 9, borderTop: '1px solid color-mix(in srgb, var(--color-text) 9%, transparent)' }}>
        <span style={{ fontSize: 10.5, color: 'color-mix(in srgb, var(--color-text) 46%, transparent)' }}>Today · agreed target</span>
        <span style={{ fontSize: 10, letterSpacing: '.05em', padding: '2px 7px', borderRadius: 4, border: '1px solid color-mix(in srgb, var(--color-accent) 45%, transparent)', color: 'var(--color-accent-200)', whiteSpace: 'nowrap' }}>B → A</span>
      </span>
    </>
  );
}

function PortfolioMonitorPreview() {
  const rows: [string, string, number, string, string][] = [
    ['NPL', '#7fbf95', 34, '4.2%', '▼0.3'],
    ['CAR', '#9184d9', 61, '18.6%', '▲0.4'],
    ['SHF', '#d8ab5f', 48, '2.1x', '▼0.1'],
    ['PBT', '#7fbf95', 70, '6.8M', '▲1.2'],
  ];
  return (
    <>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ font: '10px/1 ui-monospace,Menlo,monospace', letterSpacing: '.12em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--color-text) 42%, transparent)' }}>
          Portfolio monitor
        </span>
        <i className="ph ph-pulse" style={{ fontSize: 16, color: 'var(--color-accent)' }} />
      </span>
      <span style={{ display: 'grid', gap: 8 }}>
        {rows.map(([code, tone, width, val, delta]) => (
          <span key={code} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'ui-monospace,Menlo,monospace' }}>
            <span style={{ flex: 'none', width: 6, height: 6, borderRadius: '50%', background: tone }} />
            <span style={{ width: 30, fontSize: 10.5, letterSpacing: '.06em', color: 'color-mix(in srgb, var(--color-text) 62%, transparent)' }}>{code}</span>
            <span style={{ flex: 1, height: 3, borderRadius: 2, background: 'color-mix(in srgb, var(--color-text) 10%, transparent)', overflow: 'hidden' }}>
              <span style={{ display: 'block', height: '100%', width: `${width}%`, background: tone }} />
            </span>
            <span style={{ width: 50, textAlign: 'right', fontSize: 11, fontVariantNumeric: 'tabular-nums', color: 'color-mix(in srgb, var(--color-text) 88%, transparent)' }}>{val}</span>
            <span style={{ width: 34, textAlign: 'right', fontSize: 10, fontVariantNumeric: 'tabular-nums', color: tone }}>{delta}</span>
          </span>
        ))}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 'auto', paddingTop: 9, borderTop: '1px solid color-mix(in srgb, var(--color-text) 12%, transparent)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: 'color-mix(in srgb, var(--color-text) 46%, transparent)' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-accent)', animation: 'dgpulse 1.6s ease-in-out infinite' }} />
          <span style={{ whiteSpace: 'nowrap' }}>Covenant status</span>
        </span>
        <span style={{ font: '10.5px ui-monospace,Menlo,monospace', whiteSpace: 'nowrap', color: 'color-mix(in srgb, var(--color-text) 62%, transparent)' }}>6 within limits</span>
      </span>
    </>
  );
}

function AmlPreview() {
  const rows: [string, string, number, string, string][] = [
    ['#cf7f77', 'color-mix(in srgb, #cf7f77 42%, transparent)', 42, 'Flagged · PEP', '96%'],
    ['#d8ab5f', 'color-mix(in srgb, #d8ab5f 34%, transparent)', 34, 'High risk', '74%'],
    ['#7fbf95', 'color-mix(in srgb, var(--color-text) 13%, transparent)', 13, 'Low risk', '11%'],
    ['color-mix(in srgb, var(--color-text) 22%, transparent)', 'color-mix(in srgb, var(--color-text) 8%, transparent)', 8, 'Cleared', '02%'],
  ];
  return (
    <>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ font: '10px/1 ui-monospace,Menlo,monospace', letterSpacing: '.12em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--color-text) 42%, transparent)' }}>
          AML screening
        </span>
        <i className="ph ph-shield-warning" style={{ fontSize: 16, color: 'var(--color-accent)' }} />
      </span>
      <span style={{ display: 'grid', gap: 9 }}>
        {rows.map(([dot, barBg, barW, label, pct], i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ flex: 'none', width: 6, height: 6, borderRadius: '50%', background: dot }} />
            <span style={{ flex: 1, height: 4, borderRadius: 2, background: barBg, width: `${barW}%` }} />
            <span style={{ width: 76, textAlign: 'right', fontSize: 10, whiteSpace: 'nowrap', color: dot }}>{label}</span>
            <span style={{ width: 30, textAlign: 'right', font: '10px ui-monospace,Menlo,monospace', color: 'color-mix(in srgb, var(--color-text) 48%, transparent)' }}>{pct}</span>
          </span>
        ))}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto', paddingTop: 9, borderTop: '1px solid color-mix(in srgb, var(--color-text) 12%, transparent)' }}>
        {['SANCTIONS', 'PEP', 'ADVERSE MEDIA'].map((t) => (
          <span key={t} style={{ flex: '0 0 auto', fontSize: 9.5, letterSpacing: '.05em', padding: '2px 6px', borderRadius: 4, border: '1px solid color-mix(in srgb, var(--color-text) 16%, transparent)', color: 'color-mix(in srgb, var(--color-text) 52%, transparent)', whiteSpace: 'nowrap' }}>{t}</span>
        ))}
      </span>
    </>
  );
}

function AcademyPreview() {
  const rows: [string, number][] = [
    ['Climate risk', 82],
    ['Carbon accounting', 61],
    ['Product development', 44],
    ['2X criteria', 73],
  ];
  return (
    <>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ font: '10px/1 ui-monospace,Menlo,monospace', letterSpacing: '.12em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--color-text) 42%, transparent)' }}>
          Certification
        </span>
        <i className="ph ph-graduation-cap" style={{ fontSize: 16, color: 'var(--color-accent)' }} />
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 16, margin: 'auto 0' }}>
        <span
          style={{
            flex: 'none', width: 62, height: 62, borderRadius: '50%',
            background: 'conic-gradient(var(--color-accent) 0 65%, color-mix(in srgb, var(--color-text) 11%, transparent) 65% 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <span style={{ width: 47, height: 47, borderRadius: '50%', background: 'color-mix(in srgb, var(--color-bg) 92%, var(--color-text))', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 14px var(--font-heading)', color: 'var(--color-accent-200)', fontVariantNumeric: 'lining-nums proportional-nums' }}>65%</span>
        </span>
        <span style={{ flex: 1, display: 'grid', gap: 8 }}>
          {rows.map(([label, pct]) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 104, fontSize: 10.5, whiteSpace: 'nowrap', color: 'color-mix(in srgb, var(--color-text) 46%, transparent)' }}>{label}</span>
              <span style={{ flex: 1, height: 3, borderRadius: 2, background: 'color-mix(in srgb, var(--color-text) 10%, transparent)', overflow: 'hidden' }}>
                <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: 'color-mix(in srgb, var(--color-accent) 62%, transparent)' }} />
              </span>
            </span>
          ))}
        </span>
      </span>
      <span style={{ fontSize: 10.5, color: 'color-mix(in srgb, var(--color-text) 40%, transparent)' }}>Credit officers certified, by module</span>
    </>
  );
}

function ImpactPreview() {
  return (
    <>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ font: '10px/1 ui-monospace,Menlo,monospace', letterSpacing: '.12em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--color-text) 42%, transparent)' }}>
          Quarterly reporting
        </span>
        <i className="ph ph-chart-line-up" style={{ fontSize: 16, color: 'var(--color-accent)' }} />
      </span>
      <span style={{ flex: 1, position: 'relative', display: 'block', minHeight: 56 }}>
        <span style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(180deg, color-mix(in srgb, var(--color-text) 8%, transparent) 0 1px, transparent 1px 17px)' }} />
        <span style={{ position: 'absolute', inset: 0, background: 'color-mix(in srgb, var(--color-text) 30%, transparent)', clipPath: 'polygon(0 90%,14% 86%,28% 84%,42% 79%,57% 75%,71% 70%,85% 64%,100% 59%,100% 63%,85% 68%,71% 74%,57% 79%,42% 83%,28% 88%,14% 90%,0 94%)' }} />
        <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 38%, transparent), transparent 88%)', clipPath: 'polygon(0 82%,14% 68%,28% 74%,42% 49%,57% 57%,71% 33%,85% 28%,100% 9%,100% 100%,0 100%)' }} />
        <span style={{ position: 'absolute', inset: 0, background: 'var(--color-accent)', clipPath: 'polygon(0 82%,14% 68%,28% 74%,42% 49%,57% 57%,71% 33%,85% 28%,100% 9%,100% 13%,85% 32%,71% 37%,57% 61%,42% 53%,28% 78%,14% 72%,0 86%)' }} />
      </span>
      <span style={{ display: 'flex', gap: 16, paddingTop: 8, borderTop: '1px solid color-mix(in srgb, var(--color-text) 12%, transparent)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: 'color-mix(in srgb, var(--color-text) 46%, transparent)' }}>
          <span style={{ width: 10, height: 2, background: 'var(--color-accent)' }} />tCO₂e avoided
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: 'color-mix(in srgb, var(--color-text) 46%, transparent)' }}>
          <span style={{ width: 10, height: 2, background: 'color-mix(in srgb, var(--color-text) 30%, transparent)' }} />2X-qualifying loans
        </span>
      </span>
    </>
  );
}

type Module = {
  key: string;
  icon: string;
  title: string;
  description: string;
  href?: string;
  preview: ReactNode;
};

const MODULES: Module[] = [
  { key: 'rating', icon: 'ph-gauge', title: 'FI Credit Rating', description: 'Institutional scoring, calibrated to second-tier lenders.', href: RATING_MODEL_URL, preview: <CreditRatingPreview /> },
  { key: 'green', icon: 'ph-leaf', title: 'FI Green Rating', description: 'The whole institution rated, and the path to A.', preview: <GreenRatingPreview /> },
  { key: 'monitor', icon: 'ph-pulse', title: 'Portfolio Monitor', description: 'NPL, CAR, SHF and PBT against covenant, daily.', preview: <PortfolioMonitorPreview /> },
  { key: 'aml', icon: 'ph-shield-warning', title: 'Compliance & AML', description: 'Sanctions, PEP and adverse media, every match scored.', preview: <AmlPreview /> },
  { key: 'academy', icon: 'ph-graduation-cap', title: 'Green Academy', description: 'Four modules. Credit officers certified before drawdown.', preview: <AcademyPreview /> },
  { key: 'impact', icon: 'ph-chart-line-up', title: 'Impact Reporting', description: 'Borrower-level data into the quarterly investor pack.', preview: <ImpactPreview /> },
];

function ModuleTile({ mod }: { mod: Module }) {
  const comingSoon = !mod.href;
  const inner = (
    <>
      <span
        aria-hidden="true"
        style={{
          display: 'flex', flexDirection: 'column', gap: 10, height: 230,
          borderRadius: 8, border: '1px solid color-mix(in srgb, var(--color-text) 13%, transparent)',
          background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-text) 6%, transparent), color-mix(in srgb, black 20%, transparent))',
          padding: '15px 16px', overflow: 'hidden',
        }}
      >
        {mod.preview}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '20px 0 10px' }}>
        <span style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 46, height: 46, borderRadius: 9, border: '1px solid var(--color-accent-700)', background: 'color-mix(in srgb, var(--color-accent-900) 45%, transparent)' }}>
          <i className={`ph ${mod.icon}`} style={{ fontSize: 23, color: 'var(--color-accent)' }} />
        </span>
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 22, letterSpacing: '-0.01em' }}>{mod.title}</span>
      </span>
      <span style={{ display: 'block', fontSize: 14.5, lineHeight: '23px', color: 'color-mix(in srgb, var(--color-text) 72%, transparent)' }}>{mod.description}</span>
      {comingSoon ? (
        <span style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 6, marginTop: 'auto', paddingTop: 18, fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--color-text) 46%, transparent)' }}>
          Coming soon
        </span>
      ) : (
        <span style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 6, marginTop: 'auto', paddingTop: 18, fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>
          Launch<i className="ph ph-arrow-right" style={{ fontSize: 13 }} />
        </span>
      )}
    </>
  );

  const sharedStyle = {
    display: 'flex', flexDirection: 'column' as const, alignItems: 'stretch', textAlign: 'left' as const,
    padding: 18, border: '1px solid var(--color-divider)', borderRadius: 10, background: 'var(--color-surface)',
    color: 'inherit', font: 'inherit',
  };

  if (comingSoon) {
    return (
      <div style={{ ...sharedStyle, opacity: 0.6, cursor: 'default' }}>{inner}</div>
    );
  }

  return (
    <a
      href={mod.href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ ...sharedStyle, cursor: 'pointer', textDecoration: 'none' }}
      className="module-tile"
    >
      {inner}
    </a>
  );
}

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: '24px' }}>
      <header className="nav" style={{ padding: '16px 40px', gap: 20, borderBottom: '1px solid var(--color-divider)' }}>
        <span className="nav-brand" style={{ fontSize: 17, letterSpacing: '-0.01em', marginRight: 'auto', whiteSpace: 'nowrap', flex: '0 0 auto' }}>
          Denham &amp; Grey
        </span>
        <a href="/signin" style={{ flex: '0 0 auto', fontSize: 13, color: 'color-mix(in srgb, var(--color-text) 58%, transparent)' }}>
          Staff sign in
        </a>
      </header>

      <div style={{ padding: '56px 40px 24px', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ maxWidth: '58ch', marginBottom: 40 }}>
          <span style={{ display: 'block', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-accent)', marginBottom: 18 }}>
            Internal systems
          </span>
          <h1 style={{ fontSize: 44, lineHeight: '50px', marginBottom: 16 }}>The tools we lend with.</h1>
          <p style={{ margin: 0, fontSize: 16, lineHeight: '27px', color: 'color-mix(in srgb, var(--color-text) 76%, transparent)' }}>
            Six live systems — rating, screening, monitoring and reporting — in one place, for the people who use them daily.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
          {MODULES.map((mod) => (
            <ModuleTile mod={mod} key={mod.key} />
          ))}
        </div>
      </div>
    </div>
  );
}
