import type { ReactNode, SVGProps } from "react";

function Icon({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const DdqIcon = () => (
  <Icon>
    <path d="M16 28H9a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9l6 6v4" />
    <path d="M18 4v5a1 1 0 0 0 1 1h5" />
    <path d="M11 13h7" />
    <path d="M11 17h4" />
    <path d="M11 21h3" />
    <circle cx="21.5" cy="21.5" r="5" fill="currentColor" fillOpacity="0.18" />
    <path d="M25.2 25.2L29 29" />
    <path d="M19.4 21.6l1.5 1.5 2.9-3.1" />
  </Icon>
);

export const AmlIcon = () => (
  <Icon>
    <path d="M16 3.5l10 3.8v7.6c0 6.3-4.2 11.4-10 13.6-5.8-2.2-10-7.3-10-13.6V7.3L16 3.5z" fill="currentColor" fillOpacity="0.12" />
    <rect x="11.5" y="14.5" width="9" height="7.5" rx="1.5" fill="currentColor" fillOpacity="0.22" />
    <path d="M13.5 14.5V12a2.5 2.5 0 0 1 5 0v2.5" />
    <path d="M16 17.3v1.9" />
  </Icon>
);

export const RatingIcon = () => (
  <Icon>
    <path d="M16 23L4 23A12 12 0 0 1 23.71 13.81Z" fill="currentColor" fillOpacity="0.18" stroke="none" />
    <path d="M4 23a12 12 0 0 1 24 0" />
    <path d="M7.5 14.5l1.8 1.8" />
    <path d="M16 11v2.5" />
    <path d="M24.5 14.5l-1.8 1.8" />
    <path d="M16 23l5.8-6.9" />
    <circle cx="16" cy="23" r="1.8" fill="currentColor" />
    <path d="M9 28h14" />
  </Icon>
);

export const EsgIcon = () => (
  <Icon>
    <path d="M7 25C7 13.5 14.5 6 26 6c0 11.5-7.5 19-19 19z" fill="currentColor" fillOpacity="0.18" />
    <path d="M7 25L19 13" />
    <path d="M11 21h5.5" />
    <path d="M14.5 17.5V12" />
    <path d="M3 28h10" />
  </Icon>
);

export const MonitorIcon = () => (
  <Icon>
    <path d="M16 16V4a12 12 0 0 1 10.39 6z" fill="currentColor" fillOpacity="0.22" stroke="none" />
    <circle cx="16" cy="16" r="12" />
    <circle cx="16" cy="16" r="7" strokeOpacity="0.55" />
    <path d="M16 4v24M4 16h24" strokeOpacity="0.3" />
    <path d="M16 16l10.4-6" />
    <circle cx="20.6" cy="8.6" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="11" cy="21" r="1.1" fill="currentColor" fillOpacity="0.6" stroke="none" />
  </Icon>
);

export const AcademyIcon = () => (
  <Icon>
    <path d="M2.5 12L16 6l12.5 6L16 18z" fill="currentColor" fillOpacity="0.18" />
    <path d="M8 14.6V20c0 2.2 3.6 4 8 4s8-1.8 8-4v-5.8" />
    <path d="M28.5 12v6" />
    <path d="M28.5 18c2 .3 2.6 2.2 2.2 4.2-2-.3-2.6-2.2-2.2-4.2z" fill="currentColor" fillOpacity="0.35" />
  </Icon>
);

export const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 17L17 7" />
    <path d="M8 7h9v9" />
  </svg>
);
