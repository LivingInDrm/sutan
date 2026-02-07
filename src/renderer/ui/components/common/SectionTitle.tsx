import React from 'react';
import { DividerLine } from './svg';

interface SectionTitleProps {
  children: React.ReactNode;
  theme?: 'dark' | 'light';
}

export function SectionTitle({ children, theme = 'dark' }: SectionTitleProps) {
  const isLight = theme === 'light';
  return (
    <div className="flex items-center gap-2 mt-1">
      <span className={`text-sm font-bold font-[family-name:var(--font-display)] whitespace-nowrap ${isLight ? 'text-gold-dim' : 'text-gold text-glow-gold'}`}>
        {children}
      </span>
      <DividerLine
        className={`flex-1 h-[3px] pointer-events-none ${isLight ? 'text-gold-dim/40' : 'text-gold-dim/50'}`}
        preserveAspectRatio="none"
      />
    </div>
  );
}
