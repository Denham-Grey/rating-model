import type { CSSProperties, MouseEvent } from "react";
import { OPEN_IN_NEW_TAB, SYSTEMS, type SystemStatus } from "../config";
import type { SystemContent } from "../content";
import { ArrowIcon } from "./Icons";

const LABELS: Record<SystemStatus, string> = {
  live: "LIVE",
  maintenance: "MAINTENANCE",
  offline: "OFFLINE",
};

export function SystemCard({ id, rgb, title, question, description, Icon }: SystemContent) {
  const cfg = SYSTEMS[id];
  const url = (cfg?.url ?? "").trim();
  const status: SystemStatus = cfg && cfg.status in LABELS ? cfg.status : "live";
  const enabled = /^https?:\/\//i.test(url);

  const linkProps = enabled
    ? { href: url, ...(OPEN_IN_NEW_TAB ? { target: "_blank", rel: "noopener" } : {}) }
    : {
        href: "#",
        "aria-disabled": true as const,
        onClick: (e: MouseEvent<HTMLAnchorElement>) => e.preventDefault(),
      };

  return (
    <a className="card" data-system={id} style={{ "--rgb": rgb } as CSSProperties} {...linkProps}>
      <div className="card__top">
        <span className="card__icon">
          <Icon />
        </span>
        <span className="card__meta">
          <span className={`status status--${status}`}>{LABELS[status]}</span>
        </span>
      </div>
      <div>
        <h3 className="card__title">{title}</h3>
        <p className="card__q">{question}</p>
        <p className="card__desc">{description}</p>
      </div>
      <div className="card__foot">
        <span className="card__cta">
          Launch <ArrowIcon />
        </span>
      </div>
    </a>
  );
}
