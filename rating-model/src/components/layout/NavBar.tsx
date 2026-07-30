import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCurrentUser } from '../../hooks/useCurrentUser';

// Each page in the source app shows a slightly different link set — rather
// than guess a single universal rule, this mirrors each page's actual nav
// markup via an explicit variant, matching DG-Rating-Model.html exactly.
type NavVariant = 'landing' | 'signin' | 'model' | 'engine' | 'admin';

export function NavBar({ variant, onNewAssessment }: { variant: NavVariant; onNewAssessment?: () => void }) {
  const { signOut } = useAuth();
  const user = useCurrentUser();
  const isAdmin = user.status === 'ready' && user.profile.role === 'admin';
  const sessionLabel = user.status === 'ready'
    ? (user.profile.full_name || user.profile.username || user.email) + (isAdmin ? ' · admin' : '')
    : '';

  return (
    <nav className="nav" style={{ padding: '12px 24px' }}>
      <div className="nav-brand" style={{ display: 'flex', alignItems: 'baseline', gap: 9, fontSize: 17, fontWeight: 600, letterSpacing: '0.1em' }}>
        DENHAM<span style={{ color: 'oklch(78% 0.115 85)', fontWeight: 500, fontSize: 13.5 }}>+</span>GREY
        <span style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '0.2em', color: 'oklch(78% 0.115 85)', marginLeft: 8 }}>RATING MODEL</span>
      </div>
      <span style={{ flex: 1 }} />

      {variant === 'signin' && (
        <Link className="btn btn-ghost" to="/" style={{ textDecoration: 'none' }}>Home</Link>
      )}

      {variant === 'landing' && (
        <>
          <span className="text-muted" style={{ fontSize: 11.5, marginRight: 6 }}>{sessionLabel}</span>
          {isAdmin && (
            <>
              <Link className="btn btn-ghost" to="/engine" style={{ textDecoration: 'none' }}>Rating engine</Link>
              <Link className="btn btn-ghost" to="/admin" style={{ textDecoration: 'none' }}>Console</Link>
            </>
          )}
          <Link className="btn btn-ghost" to="/model" style={{ textDecoration: 'none' }}>Open the model</Link>
          {user.status === 'ready' && (
            <button className="btn btn-ghost" onClick={() => void signOut()}>Sign out</button>
          )}
          {user.status === 'signed-out' && (
            <Link className="btn btn-primary" to="/signin" style={{ textDecoration: 'none' }}>Sign in</Link>
          )}
        </>
      )}

      {variant === 'model' && (
        <>
          <span className="text-muted" style={{ fontSize: 11.5, marginRight: 6 }}>{sessionLabel}</span>
          {isAdmin && (
            <>
              <Link className="btn btn-ghost" to="/engine" style={{ textDecoration: 'none' }}>Rating engine</Link>
              <Link className="btn btn-ghost" to="/admin" style={{ textDecoration: 'none' }}>Console</Link>
            </>
          )}
          <Link className="btn btn-ghost" to="/" style={{ textDecoration: 'none' }}>Home</Link>
          {user.status === 'ready' && (
            <>
              {onNewAssessment && <button className="btn btn-ghost" onClick={onNewAssessment}>New assessment</button>}
              <button className="btn btn-ghost" onClick={() => void signOut()}>Sign out</button>
            </>
          )}
        </>
      )}

      {variant === 'engine' && (
        <>
          <span className="text-muted" style={{ fontSize: 11.5, marginRight: 6 }}>{sessionLabel}</span>
          {isAdmin && (
            <>
              <Link className="btn btn-ghost" to="/admin" style={{ textDecoration: 'none' }}>Console</Link>
              <Link className="btn btn-ghost" to="/model" style={{ textDecoration: 'none' }}>Open the model</Link>
            </>
          )}
          <Link className="btn btn-ghost" to="/" style={{ textDecoration: 'none' }}>Home</Link>
          {isAdmin && <button className="btn btn-ghost" onClick={() => void signOut()}>Sign out</button>}
        </>
      )}

      {variant === 'admin' && (
        <>
          <span className="text-muted" style={{ fontSize: 11.5, marginRight: 6 }}>{sessionLabel}</span>
          <Link className="btn btn-ghost" to="/engine" style={{ textDecoration: 'none' }}>Rating engine</Link>
          <Link className="btn btn-ghost" to="/model" style={{ textDecoration: 'none' }}>Open the model</Link>
          <Link className="btn btn-ghost" to="/" style={{ textDecoration: 'none' }}>Home</Link>
          {isAdmin && <button className="btn btn-ghost" onClick={() => void signOut()}>Sign out</button>}
        </>
      )}
    </nav>
  );
}
