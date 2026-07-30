import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from '../../components/layout/PageShell';
import { GateScreen } from '../../components/layout/GateScreen';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useProfiles } from '../../hooks/useProfiles';
import { useAssessments } from '../../hooks/useAssessments';
import { useAuditLog, useLogAudit } from '../../hooks/useAuditLog';
import { useCreateUserMutation, useResetPasswordMutation, useSetStatusMutation } from '../../hooks/useAdminActions';
import type { Profile, UserStatus } from '../../types/domain';

function fmt(ts: number | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_LABEL: Record<UserStatus, { label: string; fg: string }> = {
  active: { label: 'Active', fg: 'var(--color-accent-300)' },
  suspended: { label: 'Suspended', fg: 'oklch(76% 0.11 85)' },
  inactive: { label: 'Deactivated', fg: 'var(--color-neutral-500)' },
};

export function AdminPage() {
  const user = useCurrentUser();
  const isAdmin = user.status === 'ready' && user.profile.role === 'admin';

  const { data: profiles = [] } = useProfiles(isAdmin);
  const { data: assessments = [] } = useAssessments(isAdmin ? user.userId : undefined);
  const { data: auditLog = [] } = useAuditLog(isAdmin);
  const logAudit = useLogAudit();

  const createUser = useCreateUserMutation();
  const setStatus = useSetStatusMutation();
  const resetPassword = useResetPasswordMutation();

  const [form, setForm] = useState<{ name: string; email: string; role: 'analyst' | 'admin' }>({ name: '', email: '', role: 'analyst' });
  const [createErr, setCreateErr] = useState('');
  const [createdCred, setCreatedCred] = useState<{ name: string; email: string; pass: string } | null>(null);

  const [resetId, setResetId] = useState<string | null>(null);
  const [resetErr, setResetErr] = useState('');
  const [resetCred, setResetCred] = useState<{ pass: string } | null>(null);
  const [userMsg, setUserMsg] = useState('');

  if (user.status === 'loading') {
    return <PageShell variant="admin"><main style={{ maxWidth: 1120, margin: '0 auto', padding: '22px 24px 44px' }} /></PageShell>;
  }
  if (user.status === 'signed-out') {
    return (
      <PageShell variant="admin">
        <main style={{ maxWidth: 1120, margin: '0 auto', padding: '22px 24px 44px' }}>
          <GateScreen title="Sign in to continue" message="The console is available to administrator accounts only." buttons={[{ label: 'Sign in', to: '/signin', primary: true }, { label: 'Home', to: '/' }]} />
        </main>
      </PageShell>
    );
  }
  if (!isAdmin) {
    return (
      <PageShell variant="admin">
        <main style={{ maxWidth: 1120, margin: '0 auto', padding: '22px 24px 44px' }}>
          <GateScreen title="Administrators only" message="You are signed in as an analyst. Your assessments are on the model page; the console is reserved for administrators." buttons={[{ label: 'Open the model', to: '/model', primary: true }, { label: 'Home', to: '/' }]} />
        </main>
      </PageShell>
    );
  }

  const me = { id: user.userId, name: user.profile.full_name || user.profile.username || user.email };
  const nSusp = profiles.filter((u) => u.status === 'suspended').length;
  const sortedAssess = [...assessments].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  function onCreate() {
    if (createUser.isPending) return;
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    if (!name || !email) { setCreateErr('Full name and email are required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setCreateErr('Enter a valid email address.'); return; }
    setCreateErr('');
    createUser.mutate({ name, email, role: form.role }, {
      onError: (e) => setCreateErr(e.message),
      onSuccess: (res) => {
        logAudit.mutate({ actorId: me.id, actorName: me.name, action: 'created user', detail: `${name} (${res.username}) · ${form.role === 'admin' ? 'administrator' : 'analyst'}` });
        setForm({ name: '', email: '', role: 'analyst' });
        setCreatedCred({ name, email: res.email, pass: res.temporary_password });
      },
    });
  }

  function onSetStatus(target: Profile, status: UserStatus, verb: string) {
    setStatus.mutate({ userId: target.id, status }, {
      onSuccess: () => {
        logAudit.mutate({ actorId: me.id, actorName: me.name, action: status === 'active' ? 'activated user' : status === 'suspended' ? 'suspended user' : 'deactivated user', detail: `${target.full_name} (${target.username})` });
        setResetId(null); setResetCred(null); setUserMsg(`${target.full_name} — ${verb}.`);
      },
    });
  }

  function onResetSave() {
    if (!resetId || resetPassword.isPending) return;
    setResetErr('');
    resetPassword.mutate({ userId: resetId }, {
      onError: (e) => setResetErr(e.message),
      onSuccess: (res) => {
        const target = profiles.find((p) => p.id === resetId);
        logAudit.mutate({ actorId: me.id, actorName: me.name, action: 'reset password', detail: `${target?.full_name} (${target?.username})` });
        setResetCred({ pass: res.temporary_password });
      },
    });
  }

  const resetTarget = profiles.find((u) => u.id === resetId) || null;

  return (
    <PageShell variant="admin">
      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '22px 24px 44px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 32, margin: 0, fontWeight: 500 }}>Console</h1>
            <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>Users, assessments and the audit trail.</div>
          </div>
          <div className="text-muted" style={{ fontSize: 11.5, paddingBottom: 6 }}>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 20 }}>
          <div className="card" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--color-neutral-400)' }}>Active accounts</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 32, marginTop: 4 }}>
              {profiles.filter((u) => u.status === 'active').length}{' '}
              <span className="text-muted" style={{ fontFamily: 'var(--font-body)', fontSize: 11.5 }}>of {profiles.length}{nSusp ? ` · ${nSusp} suspended` : ''}</span>
            </div>
          </div>
          <div className="card" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--color-neutral-400)' }}>Assessments</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 32, marginTop: 4 }}>{sortedAssess.length}</div>
          </div>
          <div className="card" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--color-neutral-400)' }}>Certificates issued</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 32, marginTop: 4 }}>{sortedAssess.filter((a) => a.certNo).length}</div>
          </div>
          <div className="card" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--color-neutral-400)' }}>Audit entries</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 32, marginTop: 4 }}>{auditLog.length}</div>
          </div>
        </div>

        <section style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 12, marginTop: 12, alignItems: 'start' }}>
          <div className="card" style={{ padding: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 20, margin: 0, fontWeight: 500 }}>Manage users</h2>
            <div className="text-muted" style={{ fontSize: 11.5, marginTop: 3 }}>Reset a forgotten password, suspend an account while a matter is investigated, or deactivate it. Suspended and deactivated accounts keep their saved ratings but cannot sign in.</div>
            <table className="table" style={{ width: '100%', marginTop: 12, fontSize: 12 }}>
              <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Created</th><th>Status</th><th style={{ textAlign: 'right' }}>Manage</th></tr></thead>
              <tbody>
                {profiles.map((u) => {
                  const stt = STATUS_LABEL[u.status] || STATUS_LABEL.active;
                  const self = u.id === me.id;
                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 500 }}>
                        {u.full_name} <span className="text-muted" style={{ fontSize: 10.5 }}>{self ? '— you' : ''}</span>
                        {u.must_change_password && <div style={{ fontSize: 10.5, color: 'var(--color-accent-300)', fontWeight: 400, marginTop: 2 }}>Temporary password · set by an administrator</div>}
                      </td>
                      <td className="text-muted">{u.username}</td>
                      <td>{u.role === 'admin' ? 'Administrator' : 'Analyst'}</td>
                      <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>{fmt(+new Date(u.created_at))}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', color: stt.fg }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: stt.fg, boxShadow: `0 0 8px ${stt.fg}`, flex: 'none' }} />
                          {stt.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button style={{ padding: '4px 10px', fontSize: 11, cursor: 'pointer', borderRadius: 'var(--radius-md)', background: 'transparent', border: '1px solid var(--color-accent)', color: 'var(--color-accent-200)' }}
                            onClick={() => { setResetId(u.id); setResetCred(null); setResetErr(''); setUserMsg(''); }}>Reset password</button>
                          {!self && (
                            <>
                              {u.status === 'active'
                                ? <button style={{ padding: '4px 10px', fontSize: 11, cursor: 'pointer', borderRadius: 'var(--radius-md)', background: 'transparent', border: '1px solid var(--color-divider)', color: 'var(--color-neutral-300)' }} onClick={() => onSetStatus(u, 'suspended', 'suspended')}>Suspend</button>
                                : <button style={{ padding: '4px 10px', fontSize: 11, cursor: 'pointer', borderRadius: 'var(--radius-md)', background: 'transparent', border: '1px solid var(--color-accent)', color: 'var(--color-accent-200)' }} onClick={() => onSetStatus(u, 'active', 'reactivated')}>Activate</button>}
                              {u.status !== 'inactive' && (
                                <button style={{ padding: '4px 10px', fontSize: 11, cursor: 'pointer', borderRadius: 'var(--radius-md)', background: 'transparent', border: '1px solid var(--color-divider)', color: 'var(--color-neutral-300)' }} onClick={() => onSetStatus(u, 'inactive', 'deactivated')}>Deactivate</button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {resetTarget && (
              <div style={{ marginTop: 14, border: '1px solid var(--color-accent)', borderRadius: 'var(--radius-md)', background: 'rgba(145,132,217,0.08)', padding: '14px 16px' }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Reset password — {resetTarget.full_name} · {resetTarget.username}</div>
                <div className="text-muted" style={{ fontSize: 11.5, marginTop: 3 }}>Set a temporary password and share it privately. The account is flagged until the analyst signs in with it.</div>
                {resetCred && (
                  <div style={{ marginTop: 10, fontSize: 12.5, fontFamily: 'ui-monospace,monospace', background: 'rgba(0,0,0,0.18)', borderRadius: 'var(--radius-md)', padding: '8px 10px' }}>
                    Temporary password: {resetCred.pass}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
                  <span style={{ flex: 1 }} />
                  <button className="btn btn-ghost" onClick={() => { setResetId(null); setResetCred(null); setResetErr(''); }}>{resetCred ? 'Done' : 'Cancel'}</button>
                  {!resetCred && <button className="btn btn-primary" onClick={onResetSave} disabled={resetPassword.isPending}>Generate &amp; set password</button>}
                </div>
                {resetErr && <div style={{ fontSize: 11.5, color: 'var(--color-accent-300)', marginTop: 9 }}>{resetErr}</div>}
              </div>
            )}
            {userMsg && !resetTarget && <div style={{ fontSize: 11.5, color: 'var(--color-accent-300)', marginTop: 12 }}>{userMsg}</div>}
          </div>

          <div className="card" style={{ padding: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 20, margin: 0, fontWeight: 500 }}>Create an account</h2>
            <div className="text-muted" style={{ fontSize: 11.5, marginTop: 3 }}>Share the credentials privately — the analyst signs in with them.</div>
            <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
              <div className="field">
                <label>Full name</label>
                <input className="input" value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setCreateErr(''); }} placeholder="e.g. Adaeze Okafor" />
              </div>
              <div className="field">
                <label>Email</label>
                <input className="input" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setCreateErr(''); }} placeholder="e.g. a.okafor@yourcompany.com" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--color-neutral-300)', fontWeight: 500, marginBottom: 5 }}>Role</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['analyst', 'admin'] as const).map((r) => {
                    const active = form.role === r;
                    return (
                      <button key={r} type="button" onClick={() => setForm({ ...form, role: r })} aria-pressed={active}
                        style={{ flex: 1, padding: '7px 4px', fontSize: 12, cursor: 'pointer', borderRadius: 'var(--radius-md)', background: active ? 'rgba(145,132,217,0.14)' : 'transparent', border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-divider)'}`, color: active ? 'var(--color-accent-200)' : 'var(--color-neutral-300)' }}>
                        {r === 'admin' ? 'Administrator' : 'Analyst'}
                      </button>
                    );
                  })}
                </div>
              </div>
              {createErr && <div style={{ fontSize: 11.5, color: 'var(--color-accent-300)' }}>{createErr}</div>}
              {createdCred && (
                <div style={{ border: '1px solid var(--color-accent)', borderRadius: 'var(--radius-md)', background: 'rgba(145,132,217,0.08)', padding: '12px 14px', fontSize: 12.5 }}>
                  <div style={{ fontWeight: 500 }}>Account created for {createdCred.name}.</div>
                  <div className="text-muted" style={{ marginTop: 4 }}>Share the credentials privately — the analyst signs in with them. The account is flagged until the analyst signs in with it.</div>
                  <div style={{ marginTop: 8, display: 'grid', gap: 3, fontFamily: 'ui-monospace,monospace', background: 'rgba(0,0,0,0.18)', borderRadius: 'var(--radius-md)', padding: '8px 10px' }}>
                    <div>Email: {createdCred.email}</div>
                    <div>Temporary password: {createdCred.pass}</div>
                  </div>
                </div>
              )}
              <button className="btn btn-primary" onClick={onCreate} disabled={createUser.isPending}>Create account</button>
            </div>
          </div>
        </section>

        <section className="card" style={{ padding: 'var(--space-6)', marginTop: 12 }}>
          <h2 style={{ fontSize: 20, margin: 0, fontWeight: 500 }}>All assessments</h2>
          <div className="text-muted" style={{ fontSize: 11.5, marginTop: 3 }}>Every rating carried out, newest first — open any to review it in the model.</div>
          {sortedAssess.length > 0 ? (
            <table className="table" style={{ width: '100%', marginTop: 12, fontSize: 12 }}>
              <thead><tr><th>Institution</th><th>Analyst</th><th>Inputs</th><th>Score</th><th>Rating</th><th>Certificate</th><th>Last updated</th><th /></tr></thead>
              <tbody>
                {sortedAssess.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 500 }}>{a.name || 'Untitled assessment'}</td>
                    <td className="text-muted">{a.ownerName || '—'}</td>
                    <td>{a.filled != null ? `${a.filled} / ${a.total || 41}` : '—'}</td>
                    <td>{a.score != null ? a.score.toFixed(1) : '—'}</td>
                    <td style={{ fontWeight: 600, color: a.rating ? 'var(--color-accent-300)' : 'var(--color-neutral-500)' }}>{a.rating || '—'}</td>
                    <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>{a.certNo || '—'}</td>
                    <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>{fmt(a.updatedAt || a.createdAt)}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}><Link to={`/model?a=${a.id}`} style={{ fontSize: 12 }}>Review →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-muted" style={{ fontSize: 12, marginTop: 12 }}>No assessments yet.</div>
          )}
        </section>

        <section className="card" style={{ padding: 'var(--space-6)', marginTop: 12 }}>
          <h2 style={{ fontSize: 20, margin: 0, fontWeight: 500 }}>Audit trail</h2>
          <div className="text-muted" style={{ fontSize: 11.5, marginTop: 3 }}>Sign-ins, account changes and assessment activity, newest first.</div>
          <div style={{ display: 'grid', gridTemplateColumns: '130px 160px 170px 1fr', gap: 12, padding: '10px 0 7px', borderBottom: '1px solid var(--color-neutral-700)', fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-neutral-400)' }}>
            <span>When</span><span>Who</span><span>Action</span><span>Detail</span>
          </div>
          {auditLog.slice(0, 150).map((e, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '130px 160px 170px 1fr', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--color-neutral-800)', fontSize: 12, alignItems: 'baseline' }}>
              <span className="text-muted" style={{ whiteSpace: 'nowrap' }}>{fmt(e.ts)}</span>
              <span style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.userName}</span>
              <span style={{ color: /failed|deactivated/.test(e.action) ? 'oklch(69% 0.13 350)' : /created|issued|started|reactivated/.test(e.action) ? 'var(--color-accent-300)' : 'var(--color-neutral-200)' }}>{e.action}</span>
              <span className="text-muted" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.detail}</span>
            </div>
          ))}
          <div className="text-muted" style={{ fontSize: 10.5, marginTop: 10 }}>Showing {Math.min(150, auditLog.length)} of {auditLog.length} entries.</div>
        </section>
      </main>
      <footer style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 18, borderTop: '1px solid var(--color-neutral-800)', fontSize: 11, color: 'var(--color-neutral-500)' }}>
          <span>Denham &amp; Grey — Financial Institutions</span>
          <span style={{ flex: 1 }} />
          <span>Internal use · ICR-MFB v1.0</span>
        </div>
      </footer>
    </PageShell>
  );
}
