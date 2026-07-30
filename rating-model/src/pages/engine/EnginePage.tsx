import { useEffect, useRef, useState } from 'react';
import { PageShell } from '../../components/layout/PageShell';
import { GateScreen } from '../../components/layout/GateScreen';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useOwnEngineConfig, usePublishedEngineConfig, useSaveEngineDraft, useApproveEngineConfig } from '../../hooks/useEngineConfig';
import { categories as engineCategories, defaultConfig, hueFor } from '../../engine/dgEngine';
import type { EngineConfigDraft, EngineConfigPublished } from '../../types/domain';

interface DraftBand { t: string; s: number; }
interface DraftSub { key: string; label: string; quant: boolean; bands: DraftBand[]; }
interface DraftFactor { key: string; title: string; stage: 2 | 3; weight: number; subs: DraftSub[]; }

function genKey(prefix: string): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function clone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}
function fmtDate(ts: number | null): string {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function EnginePage() {
  const user = useCurrentUser();
  const userId = user.status === 'ready' ? user.userId : undefined;
  const { data: ownConfig } = useOwnEngineConfig(userId);
  const { data: publishedConfig } = usePublishedEngineConfig();
  const saveDraft = useSaveEngineDraft(userId);
  const approveConfig = useApproveEngineConfig(userId);

  const [draft, setDraft] = useState<DraftFactor[] | null>(null);
  const [toast, setToast] = useState('');
  const initedRef = useRef(false);

  useEffect(() => {
    if (initedRef.current) return;
    if (user.status !== 'ready') return;
    if (ownConfig === undefined) return;
    const effective = (publishedConfig?.factors as unknown as DraftFactor[] | undefined) ?? (defaultConfig().factors as unknown as DraftFactor[]);
    const existing = ownConfig?.draft?.factors as unknown as DraftFactor[] | undefined;
    const initial = existing && existing.length ? existing : clone(effective);
    setDraft(initial);
    saveDraft.mutate({ factors: initial } as EngineConfigDraft);
    initedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.status, ownConfig, publishedConfig]);

  function effFactors(): DraftFactor[] {
    return (publishedConfig?.factors as unknown as DraftFactor[] | undefined) ?? (defaultConfig().factors as unknown as DraftFactor[]);
  }
  function isDirty(): boolean {
    if (!draft) return false;
    return JSON.stringify(draft) !== JSON.stringify(effFactors());
  }
  function commit(factors: DraftFactor[], toastMsg?: string) {
    setDraft(factors);
    saveDraft.mutate({ factors } as EngineConfigDraft);
    if (toastMsg !== undefined) setToast(toastMsg);
  }
  function up(mut: (fs: DraftFactor[]) => void): DraftFactor[] {
    const fs = clone(draft || []);
    mut(fs);
    return fs;
  }

  function addFactor() {
    commit(up((fs) => {
      fs.push({ key: genKey('fac_'), title: 'New factor', stage: 2, weight: 0, subs: [{ key: genKey('sub_'), label: 'New sub-factor', quant: false, bands: [{ t: 'Strong', s: 100 }, { t: 'Adequate', s: 50 }, { t: 'Weak', s: 0 }] }] });
    }), 'Factor added to the draft — set its weight and approve to apply.');
  }
  function delFactor(fi: number) {
    if (!draft) return;
    if (draft.length <= 1) { setToast('The model needs at least one factor.'); return; }
    const nm = draft[fi].title || 'this factor';
    if (!window.confirm(`Delete "${nm}" and all its sub-factors from the draft? Approve afterwards to apply.`)) return;
    commit(up((fs) => { fs.splice(fi, 1); }), 'Factor removed from the draft.');
  }
  function addSub(fi: number) {
    commit(up((fs) => {
      fs[fi].subs.push({ key: genKey('sub_'), label: 'New sub-factor', quant: false, bands: [{ t: 'Strong', s: 100 }, { t: 'Adequate', s: 50 }, { t: 'Weak', s: 0 }] });
    }), 'Sub-factor added.');
  }
  function delSub(fi: number, si: number) {
    if (!draft) return;
    if (draft[fi].subs.length <= 1) { setToast('A factor needs at least one sub-factor.'); return; }
    if (!window.confirm('Delete this sub-factor from the draft? Approve afterwards to apply.')) return;
    commit(up((fs) => { fs[fi].subs.splice(si, 1); }), 'Sub-factor removed.');
  }
  function addBand(fi: number, si: number) {
    commit(up((fs) => { fs[fi].subs[si].bands.push({ t: 'New band', s: 0 }); }));
  }
  function delBand(fi: number, si: number, bi: number) {
    if (!draft) return;
    if (draft[fi].subs[si].bands.length <= 1) { setToast('A sub-factor needs at least one band.'); return; }
    if (!window.confirm('Delete this band? Analyst selections that pointed at a later band in this sub-factor may shift. Approve afterwards to apply.')) return;
    commit(up((fs) => { fs[fi].subs[si].bands.splice(bi, 1); }), 'Band removed.');
  }
  function loadCategory(key: string) {
    const cat = engineCategories(publishedConfig ? { factors: publishedConfig.factors } : null).find((c) => c.key === key);
    if (!cat) return;
    if (!cat.config) { setToast(`The ${cat.label} scoring system isn't defined yet. Microfinance Banks is the current standard — once a category's factors and scores are configured here, it can be loaded instantly.`); return; }
    commit(clone(cat.config.factors as unknown as DraftFactor[]), `Loaded the ${cat.label} model into the draft — review and approve to apply.`);
  }
  function resetAll() {
    if (!window.confirm('Reset the entire draft — factors, sub-factors, bands, wording, scores and weights — to the model defaults?')) return;
    commit(clone(defaultConfig().factors as unknown as DraftFactor[]), 'Draft reset to the model defaults — approve to apply.');
  }
  function discard() {
    commit(clone(effFactors()), 'Amendments discarded — the draft now matches what is live.');
  }
  function approve() {
    if (!draft || user.status !== 'ready') return;
    for (const f of draft) {
      if (!f.title.trim()) { setToast('Every factor needs a name.'); return; }
      if (!f.subs.length) { setToast(`"${f.title || 'A factor'}" needs at least one sub-factor.`); return; }
      for (const s of f.subs) {
        if (!s.label.trim()) { setToast(`Every sub-factor needs a name (in "${f.title}").`); return; }
        if (!s.bands.length) { setToast(`"${s.label}" needs at least one band.`); return; }
        for (const b of s.bands) if (!b.t.trim()) { setToast(`Every band needs wording (in "${s.label}").`); return; }
      }
    }
    if (!isDirty()) { setToast('No amendments to approve — the draft already matches what is live.'); return; }
    if (!window.confirm('Approve and apply this model now? It takes effect immediately for every assessment, which will recompute against the new structure, scores and weights.')) return;

    const weights: Record<string, number> = {};
    draft.forEach((f) => { weights[f.key] = f.weight; });
    const nextVersion = (publishedConfig?.version || 0) + 1;
    const published: EngineConfigPublished = {
      factors: draft as unknown as EngineConfigPublished['factors'],
      weights, version: nextVersion,
      approvedBy: user.profile.full_name || user.profile.username || user.email,
      approvedById: user.userId, approvedAt: Date.now(),
    };
    approveConfig.mutate(published, {
      onSuccess: () => setToast(`Approved — version ${nextVersion} is now live across every assessment.`),
    });
  }

  const isAdmin = user.status === 'ready' && user.profile.role === 'admin';

  if (user.status !== 'ready' || !isAdmin) {
    if (user.status === 'loading') {
      return (
        <PageShell variant="engine">
          <main style={{ maxWidth: 1080, margin: '0 auto', padding: '22px 24px 60px' }} />
        </PageShell>
      );
    }
    const title = user.status === 'signed-out' ? 'Sign in to continue' : 'Administrators only';
    const message = user.status === 'signed-out'
      ? 'The rating engine is available to administrator accounts only. Sign in to continue.'
      : 'The rating engine is where the model itself is configured — it is reserved for administrator accounts. Your analyst work is on the model page.';
    return (
      <PageShell variant="engine">
        <main style={{ maxWidth: 1080, margin: '0 auto', padding: '22px 24px 60px' }}>
          <GateScreen title={title} message={message} buttons={user.status === 'signed-out' ? [{ label: 'Sign in', to: '/signin', primary: true }, { label: 'Open the model', to: '/model' }] : undefined} />
        </main>
      </PageShell>
    );
  }

  if (!draft) {
    return (
      <PageShell variant="engine">
        <main style={{ maxWidth: 1080, margin: '0 auto', padding: '22px 24px 60px' }} />
      </PageShell>
    );
  }

  const dirty = isDirty();
  const sum = draft.reduce((a, f) => a + (Number(f.weight) || 0), 0);
  const subTotal = draft.reduce((a, f) => a + f.subs.length, 0);
  const meta = publishedConfig ? { version: publishedConfig.version, by: publishedConfig.approvedBy, at: publishedConfig.approvedAt, isDefault: false } : { version: 0, by: '', at: null, isDefault: true };
  const categoryBtns = engineCategories(publishedConfig ? { factors: publishedConfig.factors } : null).map((c) => ({
    label: c.label, soon: !c.config, key: c.key,
    bd: c.config ? 'var(--color-divider)' : 'var(--color-neutral-800)',
    fg: c.config ? 'var(--color-neutral-200)' : 'var(--color-neutral-500)',
  }));

  function seg(active: boolean) {
    return { bg: active ? 'rgba(145,132,217,0.14)' : 'transparent', bd: active ? 'var(--color-accent)' : 'var(--color-divider)', fg: active ? 'var(--color-accent-200)' : 'var(--color-neutral-300)' };
  }

  return (
    <PageShell variant="engine">
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '22px 24px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10.5, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-neutral-400)' }}>
              <span style={{ width: 26, height: 2, background: 'var(--color-accent)', boxShadow: '0 0 10px rgba(145,132,217,0.5)' }} />
              Administrator only · model configuration
            </div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 38, margin: '10px 0 0' }}>The rating engine</h1>
            <p className="text-muted" style={{ fontSize: 13, lineHeight: 1.7, margin: '8px 0 0', maxWidth: '78ch' }}>
              The full model lives here — every main factor, sub-factor and band, its wording, its score and each pillar's weight.
              Add, rename or remove any of them in the draft, then approve. The moment it is approved the new model takes effect
              across all assessments, and each rating recomputes against it.
            </p>
          </div>
          <div style={{ textAlign: 'right', flex: 'none' }}>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--color-neutral-400)' }}>In effect now</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 24, marginTop: 2, color: 'var(--color-accent-200)' }}>{meta.isDefault ? 'Model defaults' : 'Version ' + meta.version}</div>
            <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>{meta.isDefault ? 'No amendments approved yet' : `approved by ${meta.by || '—'}${meta.at ? ' · ' + fmtDate(meta.at) : ''}`}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 18px', marginTop: 18, position: 'sticky', top: 10, zIndex: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: dirty ? 'var(--color-accent)' : 'var(--color-neutral-600)', boxShadow: dirty ? '0 0 9px rgba(145,132,217,0.6)' : 'none', flex: 'none' }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{dirty ? 'Unapproved amendments in the draft' : 'Draft matches what is live'}</div>
                <div className="text-muted" style={{ fontSize: 11 }}>{dirty ? 'These changes are saved as a draft but are not yet affecting any assessment.' : 'Nothing to approve right now.'}</div>
              </div>
            </div>
            <span style={{ flex: 1 }} />
            <button className="btn btn-ghost" onClick={resetAll}>Reset to defaults</button>
            {dirty && <button className="btn btn-ghost" onClick={discard}>Discard changes</button>}
            <button className="btn btn-primary" onClick={approve} style={{ opacity: dirty ? 1 : 0.5 }}>Approve &amp; apply</button>
          </div>
          {toast && <div style={{ fontSize: 11.5, color: 'var(--color-accent-300)', marginTop: 10, borderTop: '1px solid var(--color-neutral-800)', paddingTop: 9 }}>{toast}</div>}
        </div>

        <div className="card" style={{ padding: 'var(--space-6)', marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ maxWidth: '64ch' }}>
              <h2 style={{ fontSize: 18, margin: 0, fontWeight: 500 }}>Pillar weights &amp; institution category</h2>
              <div className="text-muted" style={{ fontSize: 11.5, marginTop: 3 }}>
                Each factor's weight is set in its card below. Scores are renormalised across the pillars that carry inputs, so weights are
                relative — they need not total exactly 100. Microfinance Banks is the active standard; other categories load their own model here once configured.
              </div>
            </div>
            <div style={{ textAlign: 'right', flex: 'none' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-neutral-400)' }}>Draft total</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 26, color: sum === 100 ? 'var(--color-accent-200)' : 'oklch(76% 0.11 85)' }}>{sum}%</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="text-muted" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Institution category</span>
            {categoryBtns.map((c) => (
              <button key={c.key} type="button" onClick={() => loadCategory(c.key)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 12px', fontSize: 12, cursor: 'pointer', borderRadius: 'var(--radius-md)', background: 'transparent', border: `1px solid ${c.bd}`, color: c.fg }}>
                {c.label}
                {c.soon && <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', border: '1px solid var(--color-neutral-700)', borderRadius: 999, padding: '1px 6px', color: 'var(--color-neutral-500)' }}>soon</span>}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 12px' }}>
          <h2 style={{ fontSize: 20, margin: 0, fontWeight: 500 }}>The model</h2>
          <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,var(--color-neutral-700),transparent)' }} />
          <span className="text-muted" style={{ fontSize: 11.5 }}>{draft.length} factors · {subTotal} sub-factors</span>
          <button className="btn btn-primary" onClick={addFactor} style={{ flex: 'none', padding: '6px 12px', fontSize: 12 }}>+ Add factor</button>
        </div>

        {draft.map((f, fi) => {
          const hue = hueFor(f.key, fi);
          const fin = seg(Number(f.stage) !== 3);
          const mg = seg(Number(f.stage) === 3);
          const canDel = draft.length > 1;
          return (
            <div key={f.key} className="card" style={{ padding: 'var(--space-6)', marginBottom: 12, borderLeft: `2px solid ${hue}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ width: 16, height: 2, background: hue, boxShadow: `0 0 8px ${hue}`, flex: 'none' }} />
                <input className="input" value={f.title} onChange={(e) => commit(up((fs) => { fs[fi].title = e.target.value; }))} placeholder="Factor name" style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 500, flex: 1, minWidth: 180, padding: '5px 10px' }} />
                <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
                  <button type="button" onClick={() => commit(up((fs) => { fs[fi].stage = 2; }))} aria-pressed={Number(f.stage) !== 3} style={{ padding: '6px 10px', fontSize: 11, cursor: 'pointer', borderRadius: 'var(--radius-md)', background: fin.bg, border: `1px solid ${fin.bd}`, color: fin.fg }}>Financials step</button>
                  <button type="button" onClick={() => commit(up((fs) => { fs[fi].stage = 3; }))} aria-pressed={Number(f.stage) === 3} style={{ padding: '6px 10px', fontSize: 11, cursor: 'pointer', borderRadius: 'var(--radius-md)', background: mg.bg, border: `1px solid ${mg.bd}`, color: mg.fg }}>Mgmt step</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 'none' }}>
                  <input className="input wt" type="number" min={0} max={100} value={f.weight} onChange={(e) => commit(up((fs) => { fs[fi].weight = Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0))); }))} />
                  <span className="text-muted" style={{ fontSize: 12.5 }}>% weight</span>
                </div>
                <button className="btn btn-ghost" onClick={() => delFactor(fi)} style={{ padding: '6px 10px', fontSize: 11, color: canDel ? 'var(--color-neutral-400)' : 'var(--color-neutral-700)', flex: 'none' }}>Delete factor</button>
              </div>

              {f.subs.map((s, si) => {
                const q = seg(!!s.quant);
                return (
                  <div key={s.key} style={{ marginTop: 14, borderTop: '1px solid var(--color-neutral-800)', paddingTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <input className="input" value={s.label} onChange={(e) => commit(up((fs) => { fs[fi].subs[si].label = e.target.value; }))} placeholder="Sub-factor name" style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic', fontSize: 15, flex: 1, minWidth: 180, padding: '5px 10px' }} />
                      <button type="button" onClick={() => commit(up((fs) => { fs[fi].subs[si].quant = !fs[fi].subs[si].quant; }))} aria-pressed={!!s.quant} title="Quantitative sub-factors group together under a Quantitative heading" style={{ padding: '5px 11px', fontSize: 11, cursor: 'pointer', borderRadius: 'var(--radius-md)', background: q.bg, border: `1px solid ${q.bd}`, color: q.fg, flex: 'none' }}>
                        {s.quant ? 'Quantitative' : 'Qualitative'}
                      </button>
                      <button className="btn btn-ghost" onClick={() => delSub(fi, si)} style={{ padding: '5px 10px', fontSize: 11, color: 'var(--color-neutral-400)', flex: 'none' }}>Delete</button>
                    </div>
                    <div style={{ display: 'grid', gap: 5, marginTop: 9 }}>
                      {s.bands.map((b, bi) => (
                        <div key={bi} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 66px 28px', gap: 9, alignItems: 'center' }}>
                          <span className="text-muted" style={{ fontSize: 10.5 }}>Band {bi + 1}</span>
                          <input className="input" value={b.t} onChange={(e) => commit(up((fs) => { fs[fi].subs[si].bands[bi].t = e.target.value; }))} placeholder="Band wording — what this level means" style={{ fontSize: 11.5, padding: '5px 9px' }} />
                          <input className="input score" type="number" min={0} max={100} value={b.s} onChange={(e) => commit(up((fs) => { fs[fi].subs[si].bands[bi].s = Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0))); }))} />
                          <button type="button" onClick={() => delBand(fi, si, bi)} title="Delete band" style={{ width: 26, height: 26, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-divider)', background: 'transparent', color: 'var(--color-neutral-400)', cursor: 'pointer', fontSize: 15, lineHeight: 1, flex: 'none' }}>×</button>
                        </div>
                      ))}
                    </div>
                    <button className="btn btn-ghost" onClick={() => addBand(fi, si)} style={{ padding: '5px 11px', fontSize: 11, marginTop: 8 }}>+ Add band</button>
                  </div>
                );
              })}
              <button className="btn btn-secondary" onClick={() => addSub(fi)} style={{ marginTop: 14 }}>+ Add sub-factor</button>
            </div>
          );
        })}
        <button className="btn btn-primary" onClick={addFactor} style={{ marginTop: 4 }}>+ Add a main factor</button>
      </main>
      <footer style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 18, borderTop: '1px solid var(--color-neutral-800)', fontSize: 11, color: 'var(--color-neutral-500)' }}>
          <span>Denham &amp; Grey — Financial Institutions</span>
          <span style={{ flex: 1 }} />
          <span>Internal use · ICR-MFB v1.0</span>
        </div>
      </footer>
    </PageShell>
  );
}
