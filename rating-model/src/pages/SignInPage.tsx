import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { useAuth } from '../context/AuthContext';
import { useCurrentUser } from '../hooks/useCurrentUser';

export function SignInPage() {
  const { signIn, signOut } = useAuth();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [justSignedIn, setJustSignedIn] = useState(false);

  function goForRole(role: string) {
    navigate(role === 'admin' ? '/admin' : '/model');
  }

  // App.tsx's must_change_password gate intercepts before any route renders
  // if this account still needs to set a password; once the profile query
  // resolves normally, redirect by role — but only right after a submit,
  // not on every render of "already signed in" (that has its own Continue
  // button so the user chooses when to leave this page).
  useEffect(() => {
    if (justSignedIn && user.status === 'ready') {
      goForRole(user.profile.role);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justSignedIn, user.status]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setErr('');
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) { setErr(error); return; }
    setJustSignedIn(true);
  }

  return (
    <PageShell variant="signin">
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'radial-gradient(720px 340px at 14% -60px, rgba(145,132,217,0.13), transparent 70%), radial-gradient(560px 300px at 94% 6%, rgba(145,132,217,0.06), transparent 70%), var(--color-bg))', fontVariantNumeric: 'tabular-nums' }}>
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px 80px' }}>
          <div style={{ width: 400, maxWidth: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10.5, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-neutral-400)' }}>
              <span style={{ width: 26, height: 2, background: 'var(--color-accent)', boxShadow: '0 0 10px rgba(145,132,217,0.5)' }} />
              Analyst access
            </div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 42, margin: '12px 0 0' }}>Sign in</h1>
            <p className="text-muted" style={{ fontSize: 13, lineHeight: 1.7, margin: '10px 0 20px' }}>
              Each rating is saved to the analyst who carries it out. Administrators see every assessment and the audit trail.
            </p>

            {user.status === 'ready' ? (
              <div className="card" style={{ padding: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--color-neutral-400)' }}>Already signed in</div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, marginTop: 6 }}>
                  {user.profile.full_name || user.profile.username}{' '}
                  <span className="text-muted" style={{ fontFamily: 'var(--font-body)', fontSize: 12 }}>
                    · {user.profile.role === 'admin' ? 'Administrator' : 'Analyst'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button className="btn btn-primary" onClick={() => goForRole(user.profile.role)}>Continue</button>
                  <button className="btn btn-ghost" onClick={() => void signOut()}>Sign in as someone else</button>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit}>
                <div className="card" style={{ padding: 22, display: 'grid', gap: 14 }}>
                  <div className="field">
                    <label>Email</label>
                    <input className="input" value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }} placeholder="e.g. a.okafor@yourcompany.com" autoComplete="username" />
                  </div>
                  <div className="field">
                    <label>Password</label>
                    <input className="input" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setErr(''); }} autoComplete="current-password" />
                  </div>
                  {err && <div style={{ fontSize: 11.5, color: 'var(--color-accent-300)' }}>{err}</div>}
                  <button className="btn btn-primary" type="submit" disabled={submitting}>Sign in</button>
                </div>
              </form>
            )}

            <div style={{ fontSize: 11, color: 'var(--color-neutral-500)', marginTop: 14, lineHeight: 1.7 }}>
              Accounts are created by an administrator in the console.
            </div>
          </div>
        </main>
      </div>
    </PageShell>
  );
}
