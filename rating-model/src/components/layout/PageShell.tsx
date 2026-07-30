import type { ReactNode } from 'react';
import { NavBar } from './NavBar';

type NavVariant = 'landing' | 'signin' | 'model' | 'engine' | 'admin';

const TOP_BAR_GRADIENT =
  'linear-gradient(90deg, oklch(66% 0.12 290), oklch(72% 0.11 185), oklch(76% 0.11 85), oklch(71% 0.13 150), oklch(70% 0.10 235), oklch(69% 0.13 350))';

export function PageShell({ variant, onNewAssessment, children }: {
  variant: NavVariant;
  onNewAssessment?: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <div style={{ height: 2, background: TOP_BAR_GRADIENT, opacity: 0.85 }} />
      <NavBar variant={variant} onNewAssessment={onNewAssessment} />
      {children}
    </>
  );
}
