import React from 'react';
import { DividerLine } from './svg';

interface SectionTitleProps {
  children: React.ReactNode;
}

export function SectionTitle({ children }: SectionTitleProps) {
  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="text-sm font-bold text-gold font-[family-name:var(--font-display)] text-glow-gold whitespace-nowrap">
        {children}
      </span>
      <DividerLine
        className="flex-1 h-[3px] text-gold-dim/50 pointer-events-none"
        preserveAspectRatio="none"
      />
    </div>
  );
}
