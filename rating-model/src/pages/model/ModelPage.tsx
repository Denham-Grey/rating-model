import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageShell } from '../../components/layout/PageShell';
import { GateScreen } from '../../components/layout/GateScreen';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { supabase } from '../../lib/supabaseClient';
import { useCreateAssessment, useUpdateAssessment } from '../../hooks/useAssessments';
import { useSetOpenPointer } from '../../hooks/useOpenPointer';
import { usePublishedEngineConfig } from '../../hooks/useEngineConfig';
import { useLogAudit } from '../../hooks/useAuditLog';
import { categories as engineCategories } from '../../engine/dgEngine';
import { compute, subScore } from '../../engine/compute';
import { RATINGS, MACROS } from '../../engine/ratings';
import { docKeyFor, DOC_LIMIT, readDocs, writeDocs } from './documentStorage';
import { CertificateView } from './CertificateView';
import type { AssessmentDoc, AssessmentState, Certificate, DocKind, InstitutionInfo, OverlayState } from '../../types/domain';
import { DOC_KINDS } from '../../types/domain';
import type { Json } from '../../types/supabase';
import type { RawCategoryConfig, ResolvedFactorConfig, ResolvedSubFactor } from '../../engine/engine.types';

function asAssessmentState(json: Json | null | undefined): AssessmentState {
  return (json ?? {}) as unknown as AssessmentState;
}

interface AssessmentRow {
  id: string;
  owner_id: string;
  state: Json;
  doc_key: string | null;
  created_at: string;
  updated_at: string;
}

const STEP_LABELS = ['Institution', 'Financials', 'Mgmt & sensitivity', 'Overlay', 'Rating'];
const NUMERALS = ['i.', 'ii.', 'iii.', 'iv.', 'v.'];
const TYPES = ['National Microfinance Bank', 'State Microfinance Bank', 'Unit Microfinance Bank'];

function blankInst(analyst: string): InstitutionInfo {
  return { category: 'microfinance', name: '', type: TYPES[0], country: '', assets: '', analyst };
}
function blankOverlay(): OverlayState {
  return { macro: 'neutral', notch: 0, just: '', outlook: 'Stable', outlookJust: '' };
}
function blankState(analyst: string): AssessmentState {
  return { step: 0, maxVisited: 0, inst: blankInst(analyst), camels: {}, overlay: blankOverlay(), cert: null };
}
function fmt(n: number | null): string {
  return n == null ? '—' : (Math.round(n * 10) / 10).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

type Phase = 'boot' | 'ready' | 'out' | 'denied';

export function ModelPage() {
  const user = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const aParam = searchParams.get('a');

  const [phase, setPhase] = useState<Phase>('boot');
  const [aid, setAid] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [step, setStepState] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [inst, setInst] = useState<InstitutionInfo>(() => blankInst(''));
  const [camels, setCamels] = useState<Record<string, string>>({});
  const [overlay, setOverlay] = useState<OverlayState>(blankOverlay);
  const [cert, setCert] = useState<Certificate | null>(null);
  const [docs, setDocs] = useState<AssessmentDoc[]>([]);
  const [errors, setErrors] = useState<{ name?: boolean; just?: boolean; outlookJust?: boolean }>({});
  const [docErrMsg, setDocErrMsg] = useState('');
  const [printMode, setPrintMode] = useState<'cert'>('cert');

  const initedFor = useRef<string | null>(null);
  const justLoaded = useRef(false);
  const loggedUpdate = useRef(false);
  const docKeyRef = useRef<string | null>(null);

  const createAssessment = useCreateAssessment();
  const updateAssessment = useUpdateAssessment(aid ?? undefined);
  const setOpenPointer = useSetOpenPointer(user.status === 'ready' ? user.userId : undefined);
  const { data: publishedConfig } = usePublishedEngineConfig();
  const logAudit = useLogAudit();

  // ---- boot: resolve which assessment to show ----------------------------
  useEffect(() => {
    if (user.status === 'loading') { setPhase('boot'); return; }
    if (user.status === 'signed-out') { setPhase('out'); return; }

    const key = user.userId + ':' + (aParam || '');
    if (initedFor.current === key) return;
    initedFor.current = key;

    (async () => {
      const me = { id: user.userId, name: user.profile.full_name || user.profile.username || user.email, role: user.profile.role };

      if (aParam) {
        const data = await fetchOne(aParam);
        if (!data) { setPhase('denied'); return; }
        await loadRow(data);
        if (data.owner_id === me.id) setOpenPointer.mutate(data.id);
        logAudit.mutate({ actorId: me.id, actorName: me.name, action: 'opened assessment', detail: asAssessmentState(data.state).inst?.name || '', assessmentId: data.id });
        return;
      }

      // No ?a= param: resume the open pointer, else the most recent own
      // assessment, else start a new one.
      const { data: pointerRow } = await supabase.from('open_pointers').select('assessment_id').eq('user_id', me.id).maybeSingle();
      let row: AssessmentRow | null = null;
      if (pointerRow?.assessment_id) row = await fetchOne(pointerRow.assessment_id);
      if (!row || row.owner_id !== me.id) {
        const { data: own } = await supabase
          .from('assessments')
          .select('id, owner_id, state, doc_key, created_at, updated_at')
          .eq('owner_id', me.id)
          .order('updated_at', { ascending: false })
          .limit(1);
        row = (own && own[0] ? own[0] : null) as unknown as AssessmentRow | null;
      }
      if (!row) {
        const newState = blankState(me.name);
        const created = await createAssessment.mutateAsync({ ownerId: me.id, state: newState });
        setAid(created.id); setOwnerId(created.ownerId); setOwnerName(created.ownerName);
        docKeyRef.current = docKeyFor(created.id);
        justLoaded.current = true; loggedUpdate.current = false;
        setInst(newState.inst); setCamels({}); setOverlay(newState.overlay); setCert(null);
        setStepState(0); setMaxVisited(0); setDocs([]);
        setOpenPointer.mutate(created.id);
        logAudit.mutate({ actorId: me.id, actorName: me.name, action: 'started assessment', detail: '', assessmentId: created.id });
        setPhase('ready');
        return;
      }
      await loadRow(row);
      if (row.owner_id === me.id) setOpenPointer.mutate(row.id);
      logAudit.mutate({ actorId: me.id, actorName: me.name, action: 'opened assessment', detail: asAssessmentState(row.state).inst?.name || '', assessmentId: row.id });
    })();

    async function fetchOne(id: string): Promise<AssessmentRow | null> {
      const { data } = await supabase
        .from('assessments')
        .select('id, owner_id, state, doc_key, created_at, updated_at')
        .eq('id', id)
        .maybeSingle();
      return data as unknown as AssessmentRow | null;
    }

    // assessments.owner_id and profiles.id both reference auth.users(id)
    // independently — there's no direct FK PostgREST can embed across, so
    // the owner's display name is resolved with a separate lookup.
    async function fetchOwnerName(ownerId: string): Promise<string> {
      const { data } = await supabase.from('profiles').select('full_name, username').eq('id', ownerId).maybeSingle();
      return (data && (data.full_name || data.username)) || '';
    }

    async function loadRow(row: AssessmentRow) {
      const st = asAssessmentState(row.state);
      const dk = row.doc_key || docKeyFor(row.id);
      docKeyRef.current = dk;
      setAid(row.id);
      setOwnerId(row.owner_id);
      setOwnerName(await fetchOwnerName(row.owner_id));
      setInst(st.inst ?? blankInst(''));
      setCamels(st.camels || {});
      setOverlay({ ...blankOverlay(), ...(st.overlay || {}) });
      setCert(st.cert ?? null);
      setStepState(st.step ?? 0);
      setMaxVisited(st.maxVisited ?? 0);
      setDocs(readDocs(dk));
      justLoaded.current = true;
      loggedUpdate.current = false;
      setPhase('ready');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.status, user.status === 'ready' ? user.userId : null, aParam]);

  // ---- autosave on state change --------------------------------------------
  useEffect(() => {
    if (phase !== 'ready' || !aid || !ownerId) return;
    if (justLoaded.current) { justLoaded.current = false; return; }
    const state: AssessmentState = { step, maxVisited, inst, camels, overlay, cert };
    const c = computeNow();
    const withComputed: AssessmentState = {
      ...state,
      __computed: {
        name: inst.name.trim(), category: inst.category,
        filled: c.total - c.missing, total: c.total,
        score: c.adj == null ? null : Math.round(c.adj * 10) / 10,
        rating: c.fIdx == null ? null : RATINGS[c.fIdx],
        outlook: overlay.outlook, certNo: cert ? cert.no : null,
      },
    };
    updateAssessment.mutate({ state: withComputed, ownerId, docKey: docKeyRef.current });
    if (!loggedUpdate.current && user.status === 'ready') {
      loggedUpdate.current = true;
      logAudit.mutate({ actorId: user.userId, actorName: user.profile.full_name || user.profile.username || user.email, action: 'updated assessment', detail: inst.name.trim() || '—', assessmentId: aid });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, maxVisited, inst, camels, overlay, cert]);

  // ---- rating engine --------------------------------------------------------
  const activeCategoryConfig = useCallback((): RawCategoryConfig | null => {
    const cats = engineCategories(publishedConfig ? { factors: publishedConfig.factors } : null);
    const cat = cats.find((c) => c.key === inst.category) || cats[0];
    return cat?.config ?? null;
  }, [publishedConfig, inst.category]);

  function computeNow() {
    return compute(camels, overlay, activeCategoryConfig());
  }
  const c = computeNow();

  function setStep(n: number) {
    setStepState(n);
    setMaxVisited((m) => Math.max(m, n));
    setErrors({});
  }

  function onNext() {
    if (step === 0 && !inst.name.trim()) { setErrors({ name: true }); return; }
    if (step === 3 && overlay.notch !== 0 && !overlay.just.trim()) { setErrors({ just: true }); return; }
    if (step === 3 && overlay.outlook !== 'Stable' && !overlay.outlookJust.trim()) { setErrors({ outlookJust: true }); return; }
    setStep(step + 1);
  }

  function onDocPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    files.forEach((f) => {
      if (f.size > DOC_LIMIT) { setDocErrMsg(`"${f.name}" is over 4 MB — attach a smaller copy (storage lives in the browser).`); return; }
      const reader = new FileReader();
      reader.onload = () => {
        setDocs((prev) => {
          const next = [...prev, { name: f.name.replace(/\.[^.]+$/, ''), file: f.name, kind: DOC_KINDS[0], size: f.size, added: Date.now(), data: reader.result as string }];
          if (docKeyRef.current) writeDocs(docKeyRef.current, next);
          return next;
        });
        setDocErrMsg('');
      };
      reader.readAsDataURL(f);
    });
  }

  function updateDoc(i: number, patch: Partial<AssessmentDoc>) {
    setDocs((prev) => {
      const next = prev.map((x, j) => (j === i ? { ...x, ...patch } : x));
      if (docKeyRef.current) writeDocs(docKeyRef.current, next);
      return next;
    });
  }
  function removeDoc(i: number) {
    setDocs((prev) => {
      const next = prev.filter((_, j) => j !== i);
      if (docKeyRef.current) writeDocs(docKeyRef.current, next);
      return next;
    });
    setDocErrMsg('');
  }
  function viewDoc(d: AssessmentDoc) {
    try {
      const parts = d.data.split(',');
      const bin = atob(parts[1]);
      const arr = new Uint8Array(bin.length);
      for (let b = 0; b < bin.length; b++) arr[b] = bin.charCodeAt(b);
      const mime = (parts[0].match(/^data:([^;]+)/) || [])[1] || 'application/octet-stream';
      const url = URL.createObjectURL(new Blob([arr], { type: mime }));
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setDocErrMsg('Could not open this document.');
    }
  }

  function onIssue() {
    if (c.adj == null || user.status !== 'ready') return;
    const now = new Date();
    const no = 'DG-MFB-' + now.getFullYear() + '-' + String(1000 + Math.floor(Math.random() * 9000));
    logAudit.mutate({
      actorId: user.userId, actorName: user.profile.full_name || user.profile.username || user.email,
      action: 'issued certificate', detail: `${no} · ${inst.name.trim() || 'Unnamed'} · ${c.fIdx == null ? '—' : RATINGS[c.fIdx]}`, assessmentId: aid,
    });
    setCert({ no, issuedAt: now.getTime(), rating: c.fIdx == null ? '' : RATINGS[c.fIdx], score: c.adj ?? 0 });
    setTimeout(() => {
      const el = document.getElementById('dg-cert');
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 16, behavior: 'smooth' });
    }, 120);
  }

  function onNewAssessment() {
    if (user.status !== 'ready') return;
    if (!window.confirm('Start a new assessment? The current one stays saved to your account.')) return;
    (async () => {
      const me = { id: user.userId, name: user.profile.full_name || user.profile.username || user.email };
      const newState = blankState(me.name);
      const created = await createAssessment.mutateAsync({ ownerId: me.id, state: newState });
      logAudit.mutate({ actorId: me.id, actorName: me.name, action: 'started assessment', detail: '', assessmentId: created.id });
      setOpenPointer.mutate(created.id);
      if (searchParams.get('a')) { setSearchParams({}); return; }
      docKeyRef.current = docKeyFor(created.id);
      justLoaded.current = true; loggedUpdate.current = true;
      setAid(created.id); setOwnerId(created.ownerId); setOwnerName(created.ownerName);
      setInst(newState.inst); setCamels({}); setOverlay(newState.overlay); setCert(null);
      setStepState(0); setMaxVisited(0); setDocs([]); setPrintMode('cert');
    })();
  }

  // ---- gate screens -----------------------------------------------------
  if (phase !== 'ready') {
    const title = phase === 'denied' ? 'Not your assessment' : phase === 'boot' ? 'Loading…' : 'Sign in to continue';
    const message = phase === 'denied'
      ? 'This assessment belongs to another analyst — administrators can open any assessment from the console.'
      : phase === 'boot'
        ? 'Restoring your saved work.'
        : 'Ratings are carried out under an analyst account: each assessment is saved to the analyst who ran it, and every action is logged in the audit trail. Ask an administrator for credentials.';
    return (
      <PageShell variant="model">
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
          {phase !== 'boot' && <GateScreen title={title} message={message} buttons={[{ label: 'Sign in', to: '/signin', primary: true }, { label: 'Home', to: '/' }]} />}
          {phase === 'boot' && <GateScreen title={title} message={message} />}
        </div>
      </PageShell>
    );
  }

  const cats = engineCategories(publishedConfig ? { factors: publishedConfig.factors } : null);
  const selCat = cats.find((c2) => c2.key === inst.category) || cats[0];
  const todayLabel = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const ownerLine = ownerId === (user.status === 'ready' ? user.userId : null)
    ? 'Analyst account — ' + (ownerName || (user.status === 'ready' ? (user.profile.full_name || user.profile.username) : ''))
    : 'Owner — ' + ownerName + ' · admin view';

  function factorBlock(f: ResolvedFactorConfig) {
    const hue = f.hue;
    const hasQuant = f.subs.some((s) => s.quant);
    const renderSub = (s: ResolvedSubFactor) => {
      const sc = subScore(camels, s);
      return (
        <div key={s.key}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5, gap: 8 }}>
            <label style={{ fontSize: 10.5, lineHeight: 1.45, color: 'var(--color-neutral-300)', fontWeight: 500 }}>{s.label}</label>
          </div>
          <select
            className="input"
            value={camels[s.key] ?? ''}
            onChange={(e) => setCamels((p) => ({ ...p, [s.key]: e.target.value }))}
            style={{ fontSize: 11, padding: '5px 10px', borderLeft: sc == null ? undefined : `2px solid ${hue}` }}
          >
            <option value="">— Select performance —</option>
            {s.bands.map((b, i) => <option key={i} value={String(i)}>{b.t}</option>)}
          </select>
        </div>
      );
    };
    if (hasQuant) {
      const groups = [
        { name: 'Quantitative', hint: 'measured — actual figures from the financials', list: f.subs.filter((s) => s.quant) },
        { name: 'Qualitative', hint: 'judgement — assessed by the analyst', list: f.subs.filter((s) => !s.quant) },
      ].filter((g) => g.list.length);
      return (
        <div key={f.key} style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 14, height: 2, background: hue, boxShadow: `0 0 8px ${hue}`, flex: 'none' }} />
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-neutral-200)', fontFamily: 'var(--font-body)' }}>{f.title}</span>
          </div>
          {groups.map((g) => {
            const done = g.list.filter((s) => subScore(camels, s) != null).length;
            return (
              <div key={g.name}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic', fontSize: 16, color: 'var(--color-neutral-100)' }}>{g.name}</span>
                  <span className="text-muted" style={{ fontSize: 11 }}>{g.hint}</span>
                  <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,var(--color-neutral-700),transparent)' }} />
                  <span style={{ fontSize: 10.5, padding: '2px 9px', border: `1px solid ${done === g.list.length ? 'var(--color-accent-600)' : 'var(--color-neutral-700)'}`, borderRadius: 999, color: done === g.list.length ? 'var(--color-accent-300)' : 'var(--color-neutral-400)', fontVariantNumeric: 'tabular-nums', flex: 'none', whiteSpace: 'nowrap' }}>
                    {done} of {g.list.length} scored
                  </span>
                </div>
                <div className="grid-subfactor" style={{ marginTop: 8 }}>
                  {g.list.map(renderSub)}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    return (
      <div key={f.key} style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 14, height: 2, background: hue, boxShadow: `0 0 8px ${hue}`, flex: 'none' }} />
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-neutral-200)', fontFamily: 'var(--font-body)' }}>{f.title}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginTop: 8 }}>
          {f.subs.map(renderSub)}
        </div>
      </div>
    );
  }

  const factorBlocks2 = c.factors.filter((f) => f.stage === 2).map(factorBlock);
  const factorBlocks3 = c.factors.filter((f) => f.stage === 3).map(factorBlock);

  const finalRating = c.fIdx == null ? '—' : RATINGS[c.fIdx];
  const modelRating = c.idx == null ? '—' : RATINGS[c.idx];
  const igLabel = c.fIdx == null ? '' : (c.fIdx <= 9 ? 'Investment grade' : 'Sub-investment grade');
  const notchDisp = overlay.notch === 0 ? 'none' : (overlay.notch > 0 ? '+' : '') + overlay.notch + ' notch' + (Math.abs(overlay.notch) > 1 ? 'es' : '');
  const provLabel = c.missing > 0 ? `Provisional — ${c.total - c.missing} of ${c.total} inputs entered` : `Complete — all ${c.total} inputs entered`;

  return (
    <PageShell variant="model" onNewAssessment={onNewAssessment}>
      <div className={`screen-app pm-${printMode}`} style={{ minHeight: '100vh', background: 'radial-gradient(720px 340px at 14% -60px, rgba(145,132,217,0.13), transparent 70%), radial-gradient(560px 300px at 94% 6%, rgba(145,132,217,0.06), transparent 70%), var(--color-bg))', fontVariantNumeric: 'tabular-nums' }}>
        <header style={{ padding: '20px 24px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 32 }}>
            <div>
              <div className="text-muted" style={{ fontSize: 11.5 }}>Financial institutions · ICR-MFB v1.0 · internal use</div>
              <h1 style={{ fontSize: 32, margin: '6px 0 0', fontWeight: 500 }}>{inst.name.trim() || 'New assessment'}</h1>
            </div>
            <div className="text-muted" style={{ fontSize: 11.5, paddingBottom: 4, textAlign: 'right' }}>{ownerLine}<br />{todayLabel}</div>
          </div>
          <div className="step-tabs">
            {STEP_LABELS.map((label, i) => {
              const cur = i === step, done = i <= maxVisited;
              return (
                <div
                  key={label}
                  className="step-tab-item"
                  onClick={done && !cur ? () => setStep(i) : undefined}
                  style={{ cursor: done && !cur ? 'pointer' : 'default' }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, whiteSpace: 'nowrap' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic', fontSize: 16, color: cur ? 'var(--color-accent-300)' : done ? 'var(--color-neutral-300)' : 'var(--color-neutral-600)' }}>{NUMERALS[i]}</span>
                    <span style={{ fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, color: cur ? 'var(--color-accent-200)' : done ? 'var(--color-neutral-300)' : 'var(--color-neutral-500)' }}>{label}</span>
                  </div>
                  <div style={{ height: 2, marginTop: 7, background: cur ? 'var(--color-accent)' : done ? 'var(--color-neutral-500)' : 'var(--color-neutral-800)', boxShadow: cur ? '0 0 10px rgba(145,132,217,0.5)' : 'none' }} />
                </div>
              );
            })}
          </div>
        </header>
        <main className="grid-model-main" style={{ padding: '0 24px 20px' }}>
          <div>
            {step === 0 && (
              <section className="card" style={{ padding: 'var(--space-8)' }}>
                <h2 style={{ fontSize: 23, margin: '0 0 2px', fontWeight: 500 }}>The institution</h2>
                <div className="text-muted" style={{ fontSize: 12, marginBottom: 18 }}>Who is being rated. Fields marked · are required.</div>
                <div className="grid-inst-form">
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--color-neutral-300)', fontWeight: 500, marginBottom: 5 }}>Institution name ·</label>
                    <input className="input" value={inst.name} onChange={(e) => { setInst({ ...inst, name: e.target.value }); setErrors({}); }} placeholder="e.g. Crestfield Microfinance Bank Ltd" />
                    {errors.name && <div style={{ fontSize: 11.5, color: 'var(--color-accent-300)', marginTop: 5 }}>Enter the institution's name to continue.</div>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--color-neutral-300)', fontWeight: 500, marginBottom: 5 }}>Institution category</label>
                    <select className="input" value={inst.category} onChange={(e) => {
                      const key = e.target.value as InstitutionInfo['category'];
                      const cat = cats.find((c2) => c2.key === key);
                      const lic = cat?.licenses || [];
                      setInst({ ...inst, category: key, type: lic.includes(inst.type) ? inst.type : (lic[0] || '') });
                      setErrors({});
                    }}>
                      {cats.map((c2) => <option key={c2.key} value={c2.key}>{c2.config ? c2.label : c2.label + ' — soon'}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--color-neutral-300)', fontWeight: 500, marginBottom: 5 }}>Licence type</label>
                    <select className="input" value={inst.type} onChange={(e) => setInst({ ...inst, type: e.target.value })}>
                      {(selCat?.licenses || []).map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  {!selCat?.config && (
                    <div style={{ gridColumn: 'span 2', fontSize: 11.5, color: 'oklch(76% 0.11 85)', lineHeight: 1.6 }}>
                      No approved scoring version for {selCat?.label} yet — Microfinance Banks is the active standard, so this assessment is scored on it until a {selCat?.label} version is configured in the rating engine.
                    </div>
                  )}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--color-neutral-300)', fontWeight: 500, marginBottom: 5 }}>Location (state / country)</label>
                    <input className="input" value={inst.country} onChange={(e) => setInst({ ...inst, country: e.target.value })} placeholder="e.g. Lagos, Nigeria" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--color-neutral-300)', fontWeight: 500, marginBottom: 5 }}>Total assets, ₦m</label>
                    <input className="input" type="number" step="0.1" value={inst.assets} onChange={(e) => setInst({ ...inst, assets: e.target.value })} placeholder="e.g. 8,400" />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--color-neutral-300)', fontWeight: 500, marginBottom: 5 }}>Analyst</label>
                    <input className="input" value={inst.analyst} onChange={(e) => setInst({ ...inst, analyst: e.target.value })} placeholder="Your name — appears on the summary" />
                  </div>
                </div>
              </section>
            )}

            {step === 1 && (
              <section className="card" style={{ padding: 'var(--space-8)' }}>
                <h2 style={{ fontSize: 23, margin: '0 0 2px', fontWeight: 500 }}>Financial factors</h2>
                <div className="text-muted" style={{ fontSize: 12, marginBottom: 6 }}>Select the band that matches the institution's position — each band carries its score from the official benchmark table.</div>
                {factorBlocks2}
              </section>
            )}

            {step === 2 && (
              <>
                <section className="card" style={{ padding: 'var(--space-8)' }}>
                  <h2 style={{ fontSize: 23, margin: '0 0 2px', fontWeight: 500 }}>Management &amp; sensitivity</h2>
                  <div className="text-muted" style={{ fontSize: 12, marginBottom: 6 }}>Judgement factors, scored on the same performance bands.</div>
                  {factorBlocks3}
                </section>
                <section className="card" style={{ padding: 'var(--space-8)', marginTop: 12 }}>
                  <h2 style={{ fontSize: 23, margin: '0 0 2px', fontWeight: 500 }}>Supporting documents</h2>
                  <div className="text-muted" style={{ fontSize: 12, marginBottom: 14 }}>
                    Attach the documents the assessment relies on — audited accounts, returns, board papers — and name each so the reviewer can trace every score to its source.
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="file" multiple id="dg-doc-input" onChange={onDocPick} style={{ display: 'none' }} />
                    <button className="btn btn-secondary" onClick={() => document.getElementById('dg-doc-input')?.click()}>Attach documents…</button>
                    <span className="text-muted" style={{ fontSize: 11.5 }}>
                      {docs.length === 0 ? 'No documents yet' : `${docs.length} document${docs.length > 1 ? 's' : ''}`} · stored in this browser alongside the assessment
                    </span>
                  </div>
                  {docs.length > 0 && (
                    <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
                      {docs.map((d, i) => (
                        <div key={i} className="grid-doc-row" style={{ border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '9px 12px' }}>
                          <div style={{ minWidth: 0 }}>
                            <input className="input" value={d.name} onChange={(e) => updateDoc(i, { name: e.target.value })} placeholder="Document title — e.g. Audited FS FY2025" style={{ fontSize: 12.5, padding: '6px 10px' }} />
                            <div className="text-muted" style={{ fontSize: 10.5, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {d.file} · {d.size < 1024 * 1024 ? Math.max(1, Math.round(d.size / 1024)) + ' KB' : (d.size / 1024 / 1024).toFixed(1) + ' MB'} · added {new Date(d.added).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </div>
                          </div>
                          <div style={{ display: 'grid', gap: 6 }}>
                            <select className="input" value={d.kind} onChange={(e) => updateDoc(i, { kind: e.target.value as DocKind })} style={{ fontSize: 12, padding: '6px 10px' }}>
                              {DOC_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                            </select>
                            {d.kind === 'Other' && (
                              <input className="input" value={d.otherKind || ''} onChange={(e) => updateDoc(i, { otherKind: e.target.value })} placeholder="Specify document type…" style={{ fontSize: 12, padding: '6px 10px' }} />
                            )}
                          </div>
                          <button className="btn btn-ghost" onClick={() => viewDoc(d)} style={{ padding: '6px 12px' }}>View</button>
                          <button className="btn btn-ghost" onClick={() => removeDoc(i)} style={{ padding: '6px 12px', color: 'var(--color-neutral-400)' }}>Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {docErrMsg && <div style={{ fontSize: 11.5, color: 'var(--color-accent-300)', marginTop: 10 }}>{docErrMsg}</div>}
                </section>
              </>
            )}

            {step === 3 && (
              <section className="card" style={{ padding: 'var(--space-8)' }}>
                <h2 style={{ fontSize: 23, margin: '0 0 2px', fontWeight: 500 }}>Overlay &amp; override</h2>
                <div className="text-muted" style={{ fontSize: 12, marginBottom: 18 }}>Operating-environment adjustment to the score, then analyst notching of the final rating.</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Macro / sovereign environment</div>
                <div className="text-muted" style={{ fontSize: 11.5, margin: '3px 0 9px' }}>Applied to the composite score before rating mapping.</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {MACROS.map((m) => {
                    const active = overlay.macro === m.v;
                    return (
                      <button key={m.v} type="button" onClick={() => setOverlay({ ...overlay, macro: m.v })} aria-pressed={active}
                        style={{ flex: 1, padding: '8px 4px', fontSize: 12, cursor: 'pointer', borderRadius: 'var(--radius-md)', background: active ? 'rgba(145,132,217,0.14)' : 'transparent', border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-divider)'}`, color: active ? 'var(--color-accent-200)' : 'var(--color-neutral-300)' }}>
                        {m.label}
                      </button>
                    );
                  })}
                </div>
                <div style={{ marginTop: 22, fontSize: 14, fontWeight: 600 }}>Analyst notching</div>
                <div className="text-muted" style={{ fontSize: 11.5, margin: '3px 0 9px' }}>Moves the mapped rating by whole notches; anything other than 0 requires justification.</div>
                <div style={{ display: 'flex', gap: 8, maxWidth: 380 }}>
                  {[-2, -1, 0, 1, 2].map((n) => {
                    const active = overlay.notch === n;
                    return (
                      <button key={n} type="button" onClick={() => { setOverlay({ ...overlay, notch: n }); setErrors({}); }} aria-pressed={active}
                        style={{ flex: 1, padding: '8px 4px', fontSize: 12.5, cursor: 'pointer', borderRadius: 'var(--radius-md)', background: active ? 'rgba(145,132,217,0.14)' : 'transparent', border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-divider)'}`, color: active ? 'var(--color-accent-200)' : 'var(--color-neutral-300)' }}>
                        {n > 0 ? '+' + n : String(n)}
                      </button>
                    );
                  })}
                </div>
                <div style={{ marginTop: 18 }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--color-neutral-300)', fontWeight: 500, marginBottom: 5 }}>
                    Justification {overlay.notch !== 0 ? '· (required for notching)' : '(optional)'}
                  </label>
                  <textarea className="input" rows={3} value={overlay.just} onChange={(e) => { setOverlay({ ...overlay, just: e.target.value }); setErrors({}); }}
                    placeholder="Reason code and rationale — e.g. OV-03: deposit concentration understated by the band set" style={{ resize: 'vertical', minHeight: 76 }} />
                  {errors.just && <div style={{ fontSize: 11.5, color: 'var(--color-accent-300)', marginTop: 5 }}>Notching requires a written justification.</div>}
                </div>
                <div style={{ marginTop: 22, fontSize: 14, fontWeight: 600 }}>Rating outlook</div>
                <div className="text-muted" style={{ fontSize: 11.5, margin: '3px 0 9px' }}>Directional view of the rating over the next 12–24 months; a non-stable outlook requires justification.</div>
                <div style={{ display: 'flex', gap: 8, maxWidth: 480 }}>
                  {(['Positive', 'Stable', 'Negative', 'Developing'] as const).map((o) => {
                    const active = overlay.outlook === o;
                    return (
                      <button key={o} type="button" onClick={() => { setOverlay({ ...overlay, outlook: o }); setErrors({}); }} aria-pressed={active}
                        style={{ flex: 1, padding: '8px 4px', fontSize: 12, cursor: 'pointer', borderRadius: 'var(--radius-md)', background: active ? 'rgba(145,132,217,0.14)' : 'transparent', border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-divider)'}`, color: active ? 'var(--color-accent-200)' : 'var(--color-neutral-300)' }}>
                        {o}
                      </button>
                    );
                  })}
                </div>
                <div style={{ marginTop: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--color-neutral-300)', fontWeight: 500, marginBottom: 5 }}>
                    Outlook justification {overlay.outlook !== 'Stable' ? '· (required)' : '(optional)'}
                  </label>
                  <textarea className="input" rows={3} value={overlay.outlookJust} onChange={(e) => { setOverlay({ ...overlay, outlookJust: e.target.value }); setErrors({}); }}
                    placeholder="Drivers of the outlook — e.g. recapitalisation underway expected to lift CAR above 17% by FY2027" style={{ resize: 'vertical', minHeight: 76 }} />
                  {errors.outlookJust && <div style={{ fontSize: 11.5, color: 'var(--color-accent-300)', marginTop: 5 }}>A non-stable outlook requires a written justification.</div>}
                </div>
              </section>
            )}

            {step === 4 && (
              <section className="card" style={{ padding: 'var(--space-8)' }}>
                {c.adj != null ? (
                  <>
                    <div className="flex-rating-result">
                      <div style={{ flex: 'none', textAlign: 'left' }}>
                        <div className="text-muted" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500 }}>Final rating</div>
                        <div className="final-rating-display" style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 104, lineHeight: 1, marginTop: 4, color: 'var(--color-accent)', textShadow: '0 0 34px rgba(145,132,217,0.45)' }}>{finalRating}</div>
                        <div style={{ width: 26, height: 2, background: 'var(--color-accent)', boxShadow: '0 0 10px rgba(145,132,217,0.55)', margin: '12px 0 8px' }} />
                        <div style={{ fontSize: 12.5, color: 'var(--color-neutral-200)' }}>{igLabel} · {overlay.outlook} outlook</div>
                        <div className="text-muted" style={{ fontSize: 11.5, marginTop: 3 }}>{provLabel}</div>
                      </div>
                      <div style={{ flex: 1, borderLeft: '1px solid var(--color-divider)', paddingLeft: 28 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <span style={{ width: 14, height: 2, background: 'var(--color-accent)', flex: 'none' }} />
                          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-neutral-300)' }}>How it was reached</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px 16px', fontSize: 13, maxWidth: 430 }}>
                          <div className="text-muted">Weighted factor score</div><div style={{ fontWeight: 600, textAlign: 'right' }}>{fmt(c.base)}</div>
                          <div className="text-muted">Macro / sovereign overlay</div><div style={{ fontWeight: 600, textAlign: 'right' }}>{(c.macro.adj > 0 ? '+' : '') + c.macro.adj.toFixed(1)} ({c.macro.v})</div>
                          <div className="text-muted">Adjusted score</div><div style={{ fontWeight: 600, textAlign: 'right', color: 'var(--color-accent-300)' }}>{fmt(c.adj)}</div>
                          <div className="text-muted">Model rating</div><div style={{ fontWeight: 600, textAlign: 'right' }}>{modelRating}</div>
                          <div className="text-muted">Analyst notching</div><div style={{ fontWeight: 600, textAlign: 'right' }}>{notchDisp}</div>
                          <div className="text-muted">Outlook</div><div style={{ fontWeight: 600, textAlign: 'right' }}>{overlay.outlook}</div>
                        </div>
                        <div className="hr" style={{ margin: '14px 0' }} />
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {!cert && <button className="btn btn-primary" onClick={onIssue}>Issue rating certificate</button>}
                          <button className="btn btn-ghost" onClick={onNewAssessment}>New assessment</button>
                        </div>
                        {cert && (
                          <div style={{ fontSize: 11.5, color: 'var(--color-accent-300)', marginTop: 10 }}>
                            Certificate {cert.no} · issued {new Date(cert.issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} — rendered below.
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ marginTop: 26 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <span style={{ width: 14, height: 2, background: 'var(--color-accent)', flex: 'none' }} />
                        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-neutral-300)' }}>Factor breakdown</span>
                      </div>
                      {c.factors.map((f) => {
                        const s = c.scores[f.key];
                        const hue = f.hue;
                        return (
                          <div key={f.key} className="grid-factor-breakdown" style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 500 }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: s == null ? 'var(--color-neutral-700)' : hue, flex: 'none' }} />
                              <span>{f.title}</span>
                            </div>
                            <div style={{ height: 6, borderRadius: 3, background: 'var(--color-bg)', position: 'relative' }}>
                              <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 3, width: s == null ? '0%' : `${s}%`, background: s == null ? 'var(--color-neutral-700)' : hue }} />
                            </div>
                            <div style={{ fontSize: 12, textAlign: 'right' }}><span style={{ fontWeight: 600 }}>{s == null ? '—' : fmt(s)}</span></div>
                          </div>
                        );
                      })}
                      <div className="text-muted" style={{ fontSize: 10.5, marginTop: 12 }}>Sub-factors score 0–100 via performance bands; factors left blank are excluded from the rating.</div>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 30, fontWeight: 500 }}>No inputs yet</div>
                    <div className="text-muted" style={{ fontSize: 12.5, marginTop: 6 }}>Select at least one performance band — the rating computes as you choose.</div>
                  </div>
                )}
              </section>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {step > 0 && <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>Back</button>}
              <span style={{ flex: 1 }} />
              {step < 4 && <button className="btn btn-primary" onClick={onNext}>{step === 3 ? 'Compute rating' : 'Continue'}</button>}
            </div>
          </div>

          <aside className="card" style={{ padding: 'var(--space-6)', position: 'sticky', top: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 22, height: 2, flex: 'none', background: 'linear-gradient(90deg, oklch(66% 0.12 290), oklch(72% 0.11 185), oklch(76% 0.11 85), oklch(71% 0.13 150), oklch(70% 0.10 235), oklch(69% 0.13 350))' }} />
              <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-neutral-300)' }}>Assessment progress</span>
            </div>
            <div className="text-muted" style={{ fontSize: 11.5, lineHeight: 1.6, marginTop: 8 }}>Scores and weights are configured in the rating engine. The rating itself is calculated when you reach the final step.</div>
            <div className="hr" style={{ margin: 'var(--space-4) 0 var(--space-3)' }} />
            {c.factors.map((f) => {
              const s = c.scores[f.key];
              const hue = f.hue;
              const n = f.subs.length;
              const done = f.subs.filter((x) => subScore(camels, x) != null).length;
              const pct = n ? Math.round((done / n) * 100) : 0;
              return (
                <div key={f.key} style={{ padding: '6px 0', fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: done ? hue : `color-mix(in oklab, ${hue} 60%, transparent)`, flex: 'none' }} />
                      <span style={{ color: 'var(--color-neutral-300)', whiteSpace: 'nowrap', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.title.replace(' to market factors', '')}</span>
                    </span>
                    <span style={{ fontSize: 11, color: done ? hue : 'var(--color-neutral-500)', flex: 'none', fontVariantNumeric: 'tabular-nums' }}>{done} / {n}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: 'var(--color-bg)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: hue, transition: 'width 220ms ease' }} />
                  </div>
                  <span style={{ display: 'none' }}>{s}</span>
                </div>
              );
            })}
            <div className="hr" style={{ margin: 'var(--space-3) 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 12, padding: '2px 0' }}>
              <span style={{ color: 'var(--color-neutral-300)' }}>Documents attached</span>
              <span style={{ fontWeight: 600, color: docs.length ? 'var(--color-accent-300)' : 'var(--color-neutral-500)' }}>{docs.length}</span>
            </div>
            <div className="hr" style={{ margin: 'var(--space-3) 0' }} />
            <div className="text-muted" style={{ fontSize: 10.5, lineHeight: 1.6 }}>Auto-saved to the signed-in analyst's account on this device. Every assessment, certificate and sign-in is logged in the audit trail.</div>
          </aside>
        </main>
        <footer style={{ padding: '0 24px 16px' }}>
          <div className="hr" style={{ margin: '0 0 10px' }} />
          <div className="text-muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}>
            <span>Denham &amp; Grey — Internal Credit Rating · microfinance banks</span>
            <span>Confidential · Internal use only</span>
          </div>
        </footer>
      </div>
      {cert && (
        <CertificateView
          cert={cert}
          inst={inst}
          overlay={overlay}
          compute={c}
          ratings={RATINGS}
          onPrint={() => { setPrintMode('cert'); setTimeout(() => window.print(), 0); }}
          display={step === 4}
        />
      )}
    </PageShell>
  );
}
