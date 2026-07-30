import type { ComputeResult } from '../../engine/engine.types';
import type { Certificate, InstitutionInfo, OverlayState } from '../../types/domain';

function fmt(n: number | null): string {
  return n == null ? '—' : (Math.round(n * 10) / 10).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function CertificateView({ cert, inst, overlay, compute, ratings, onPrint, display }: {
  cert: Certificate;
  inst: InstitutionInfo;
  overlay: OverlayState;
  compute: ComputeResult;
  ratings: readonly string[];
  onPrint: () => void;
  display: boolean;
}) {
  const cd = new Date(cert.issuedAt);
  const certDate = cd.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const validUntil = new Date(cd.getFullYear() + 1, cd.getMonth(), cd.getDate()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const certYear = String(cd.getFullYear());

  const finalRating = compute.fIdx == null ? '—' : ratings[compute.fIdx];
  const modelRating = compute.idx == null ? '—' : ratings[compute.idx];
  const igLabel = compute.fIdx == null ? '' : (compute.fIdx <= 9 ? 'Investment grade' : 'Sub-investment grade');
  const notchDisp = overlay.notch === 0 ? 'none' : (overlay.notch > 0 ? '+' : '') + overlay.notch + ' notch' + (Math.abs(overlay.notch) > 1 ? 'es' : '');
  const certBasis = compute.missing > 0 ? `${compute.total - compute.missing} of ${compute.total} model inputs` : `all ${compute.total} model inputs`;
  const outlookClause = overlay.outlook === 'Developing' ? ', to be resolved on greater clarity of the drivers cited by the analyst' : '';
  const pName = inst.name.trim() || 'Unnamed institution';
  const pMeta = [inst.type, inst.country.trim(), inst.assets ? `₦${inst.assets}m total assets` : ''].filter(Boolean).join(' · ');
  const pAnalyst = inst.analyst.trim() || '—';

  return (
    <div className="cert-sheet" style={{ display: display ? 'block' : 'none', padding: '10px 24px 52px' }}>
      <div className="no-print" style={{ maxWidth: 700, margin: '0 auto 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 14, height: 2, background: 'var(--color-accent)', display: 'inline-block' }} />
          <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-neutral-300)', fontWeight: 500, fontFamily: 'var(--font-body)' }}>Rating certificate</span>
        </div>
        <button className="btn btn-primary" onClick={onPrint}>Print / save as PDF</button>
      </div>
      <div id="dg-cert" style={{ maxWidth: 700, margin: '0 auto', background: '#fdfdfc', color: '#201f1d', fontFamily: "'Lora',serif", border: '2px solid #201f1d', padding: 7, boxShadow: '0 18px 60px rgba(0,0,0,0.5)' }}>
        <div className="cert-inner" style={{ border: '1px solid #7e71c9', padding: '44px 52px 30px', position: 'relative' }}>
          {compute.missing > 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', overflow: 'hidden' }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 92, fontWeight: 600, letterSpacing: '0.18em', color: 'rgba(32,31,29,0.06)', transform: 'rotate(-22deg)', whiteSpace: 'nowrap' }}>
                PROVISIONAL
              </div>
            </div>
          )}
          <div style={{ textAlign: 'center', position: 'relative' }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, letterSpacing: '0.34em', fontWeight: 600 }}>DENHAM &amp; GREY</div>
            <div style={{ fontSize: 9.5, letterSpacing: '0.22em', color: '#6b6a67', marginTop: 5, textTransform: 'uppercase' }}>Internal Credit Rating · Microfinance Banks</div>
            <div style={{ width: 52, height: 1, background: '#201f1d', margin: '16px auto' }} />
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 30, fontWeight: 500, letterSpacing: '0.14em' }}>RATING CERTIFICATE</div>
            <div style={{ fontSize: 11, color: '#6b6a67', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>№ {cert.no} · issued {certDate}</div>
            <div style={{ fontSize: 13, fontStyle: 'italic', marginTop: 26 }}>This is to certify that</div>
            <div className="cert-name" style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 36, fontWeight: 600, lineHeight: 1.15, marginTop: 8 }}>{pName}</div>
            <div style={{ fontSize: 12, color: '#6b6a67', marginTop: 6 }}>{pMeta}</div>
            <div style={{ fontSize: 13, fontStyle: 'italic', marginTop: 18, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
              has been assessed under the Denham &amp; Grey internal credit rating model for microfinance banks and is hereby assigned the rating
            </div>
            <div className="cert-rating" style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 100, fontWeight: 500, lineHeight: 1, marginTop: 12 }}>{finalRating}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5b4fa8', marginTop: 12, fontWeight: 600 }}>{igLabel}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#201f1d', marginTop: 7, fontWeight: 600 }}>Outlook — {overlay.outlook}</div>
            <div style={{ fontSize: 12, color: '#6b6a67', marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
              Adjusted model score {fmt(compute.adj)} / 100 · model rating {modelRating} · analyst notching {notchDisp}
            </div>
          </div>
          <div className="cert-factors" style={{ maxWidth: 430, margin: '26px auto 0', position: 'relative', fontVariantNumeric: 'tabular-nums' }}>
            {compute.factors.map((f) => {
              const s = compute.scores[f.key];
              return (
                <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #dcdbd8', padding: '6px 2px', fontSize: 12 }}>
                  <span>{f.title}</span><span style={{ fontWeight: 600 }}>{s == null ? '—' : fmt(s)}</span>
                </div>
              );
            })}
          </div>
          <div className="cert-legal" style={{ fontSize: 11, color: '#6b6a67', lineHeight: 1.7, textAlign: 'justify', margin: '24px auto 0', maxWidth: 540, position: 'relative' }}>
            Assigned under model ICR-MFB v1.0 on the basis of {certBasis}. Sub-factors are scored 0–100 against defined performance bands;
            factors without inputs are excluded and weights renormalised. The rating carries a {overlay.outlook.toLowerCase()} outlook{outlookClause}.
            This rating is an internal credit opinion of Denham &amp; Grey, not a public credit rating, and remains valid until {validUntil} unless
            superseded by a subsequent rating action.
          </div>
          <div className="cert-sign" style={{ display: 'flex', alignItems: 'flex-end', gap: 30, marginTop: 38, position: 'relative' }}>
            <div style={{ flex: 1, borderTop: '1px solid #201f1d', paddingTop: 6, fontSize: 11, color: '#6b6a67', lineHeight: 1.6 }}>
              <span style={{ color: '#201f1d', fontWeight: 600 }}>{pAnalyst}</span><br />Analyst, Credit Analysis
            </div>
            <svg className="cert-seal" width="118" height="118" viewBox="0 0 132 132" style={{ flex: 'none' }}>
              <circle cx="66" cy="66" r="63" fill="none" stroke="#201f1d" strokeWidth="2" />
              <circle cx="66" cy="66" r="57" fill="none" stroke="#7e71c9" strokeWidth="1" />
              <circle cx="66" cy="66" r="40" fill="none" stroke="#201f1d" strokeWidth="1" />
              <defs><path id="dgSealArc" d="M 66 66 m -48,0 a 48,48 0 1,1 96,0 a 48,48 0 1,1 -96,0" /></defs>
              <text fontSize="8.5" letterSpacing="2" fill="#201f1d" fontFamily="Lora,serif">
                <textPath href="#dgSealArc">DENHAM &amp; GREY · INTERNAL CREDIT RATING ·</textPath>
              </text>
              <text x="66" y="63" textAnchor="middle" fontFamily="'Cormorant Garamond',serif" fontSize="17" fontWeight="600" fill="#201f1d">ICR·MFB</text>
              <text x="66" y="81" textAnchor="middle" fontFamily="Lora,serif" fontSize="10" fill="#5b4fa8" letterSpacing="1.5">{certYear}</text>
            </svg>
            <div style={{ flex: 1, borderTop: '1px solid #201f1d', paddingTop: 6, fontSize: 11, color: '#6b6a67', textAlign: 'right', lineHeight: 1.6 }}>
              &nbsp;<br />Senior credit officer, Risk Approval
            </div>
          </div>
          <div className="cert-foot" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: '#6b6a67', borderTop: '1px solid #dcdbd8', marginTop: 24, paddingTop: 8, position: 'relative' }}>
            <span>{cert.no}</span><span>Confidential — internal use only · verify against model run record</span>
          </div>
        </div>
      </div>
    </div>
  );
}
