import { useState } from 'react';
import { useChangePassword } from '../../hooks/useChangePassword';

// Not part of the original bundled app (which had no real backend auth) —
// this is the same forced-password-change flow built for the Supabase
// integration, kept consistent with that earlier design.
export function ForcePasswordChangeScreen({ userId }: { userId: string }) {
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [err, setErr] = useState('');
  const changePassword = useChangePassword(userId);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 8) { setErr('Password needs at least 8 characters.'); return; }
    if (newPw !== newPw2) { setErr('Passwords do not match.'); return; }
    setErr('');
    changePassword.mutate(newPw, {
      onError: (e) => setErr(e.message),
    });
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <div style={{ width: 400, maxWidth: '100%', padding: '0 24px' }}>
        <form onSubmit={onSubmit}>
          <div className="card" style={{ padding: 22, display: 'grid', gap: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--color-accent-300)' }}>New account</div>
            <div className="text-muted" style={{ fontSize: 12.5, lineHeight: 1.6 }}>Set a new password before continuing.</div>
            <div className="field">
              <label>New password</label>
              <input className="input" type="password" autoComplete="new-password" value={newPw} onChange={(e) => { setNewPw(e.target.value); setErr(''); }} />
            </div>
            <div className="field">
              <label>Confirm new password</label>
              <input className="input" type="password" autoComplete="new-password" value={newPw2} onChange={(e) => { setNewPw2(e.target.value); setErr(''); }} />
            </div>
            {err && <div style={{ fontSize: 11.5, color: 'var(--color-accent-300)' }}>{err}</div>}
            <button className="btn btn-primary" type="submit" disabled={changePassword.isPending}>
              Set password &amp; continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
