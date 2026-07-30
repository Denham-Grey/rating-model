import { Link } from 'react-router-dom';

interface GateButton {
  label: string;
  to: string;
  primary?: boolean;
}

// The "locked" card pattern used identically across model/engine/admin for
// signed-out / wrong-role / IDOR-denied states — ported verbatim.
export function GateScreen({ title, message, buttons }: { title: string; message: string; buttons?: GateButton[] }) {
  return (
    <div style={{ maxWidth: 440, margin: '60px auto 0', padding: '0 24px 60px' }}>
      <div className="card" style={{ padding: 28 }}>
        <div style={{ width: 26, height: 2, background: 'var(--color-accent)', boxShadow: '0 0 10px rgba(145,132,217,0.5)' }} />
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 500, marginTop: 14 }}>{title}</div>
        <div className="text-muted" style={{ fontSize: 12.5, lineHeight: 1.7, marginTop: 8 }}>{message}</div>
        {buttons && buttons.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginTop: 20, alignItems: 'center' }}>
            {buttons.map((b) => (
              <Link key={b.to} className={`btn ${b.primary ? 'btn-primary' : 'btn-ghost'}`} to={b.to} style={{ textDecoration: 'none' }}>
                {b.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
