import React from 'react';
import { BtnPrimary, DividerLine } from './svg';

const VARIANT_STYLES = {
  dark: 'bg-ink/90 backdrop-blur-sm text-parchment-light',
  parchment: 'bg-parchment-texture text-ink',
  glass: 'bg-leather/60 backdrop-blur-md text-parchment-light',
} as const;

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  variant?: keyof typeof VARIANT_STYLES;
  title?: string;
  padded?: boolean;
  bordered?: boolean;
}

export function Panel({
  children,
  className = '',
  variant = 'dark',
  title,
  padded = true,
  bordered = true,
}: PanelProps) {
  return (
    <div
      className={`
        rounded-lg overflow-hidden
        ${VARIANT_STYLES[variant]}
        ${bordered ? 'border border-gold-dim/30' : ''}
        ${className}
      `}
    >
      {title && (
        <div className="relative flex items-center justify-center py-2 px-4">
          <BtnPrimary
            className="absolute inset-0 w-full h-full text-gold-dim/60 pointer-events-none"
            preserveAspectRatio="none"
          />
          <span className="relative z-10 text-sm font-bold text-gold font-[family-name:var(--font-display)] text-glow-gold">
            {title}
          </span>
        </div>
      )}
      {title && (
        <DividerLine
          className="w-full h-1 text-gold-dim/40 pointer-events-none"
          preserveAspectRatio="none"
        />
      )}
      <div className={padded ? 'p-4' : ''}>
        {children}
      </div>
    </div>
  );
}
