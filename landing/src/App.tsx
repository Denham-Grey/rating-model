import type { CSSProperties } from "react";
import { SystemCard } from "./components/SystemCard";
import { LIFECYCLE, SYSTEM_CONTENT } from "./content";

export default function App() {
  return (
    <div className="page">
      <header className="topbar">
        <a className="brand" href="./" aria-label="D+G Terminal home">
          <span className="brand__text">
            <span className="brand__name">
              D<span className="brand__plus">+</span>G <em>Terminal</em>
            </span>
            <span className="brand__sub">DENHAM &amp; GREY</span>
          </span>
        </a>
      </header>

      <main>
        <section className="welcome" aria-labelledby="welcome-h">
          <div className="welcome__cols">
            <div className="welcome__lead">
              <p className="eyebrow">WELCOME TO THE D+G TERMINAL</p>
              <h1 id="welcome-h">
                One Terminal. <em>Total Clarity.</em>
              </h1>
              <p className="tagline">Rigour engineered into every decision, we built the systems to prove it.</p>
            </div>
            <div className="welcome__body">
              <p>
                Six proprietary systems, designed by Denham and Grey for one purpose: to lend to financial
                institutions with discipline, and to leave them stronger than we found them.
              </p>
              <p>
                Diligence, financial-crime screening, credit and sustainability ratings, live portfolio surveillance
                and capacity building, connected end to end, so every judgement we make is informed, evidenced and
                accountable.
              </p>
            </div>
          </div>
          <ol className="lifecycle" aria-label="The lending lifecycle">
            {LIFECYCLE.map(({ label, color }) => (
              <li key={label} style={{ "--c": color } as CSSProperties}>
                {label}
              </li>
            ))}
          </ol>
        </section>

        <section className="systems" aria-labelledby="sys-h">
          <div className="systems__head">
            <h2 id="sys-h">SIX QUESTIONS. SIX SYSTEMS. ONE TERMINAL.</h2>
          </div>
          <div className="grid">
            {SYSTEM_CONTENT.map((system) => (
              <SystemCard key={system.id} {...system} />
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>© 2026 DENHAM AND GREY · D+G TERMINAL</span>
        <span>PROPRIETARY &amp; CONFIDENTIAL</span>
      </footer>
    </div>
  );
}
