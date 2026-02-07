import React from 'react';
import { FrameDefault, FrameOrnate, FrameSimple } from './svg';

const FRAME_MAP = {
  default: FrameDefault,
  ornate: FrameOrnate,
  simple: FrameSimple,
} as const;

interface DecoratedFrameProps {
  children: React.ReactNode;
  className?: string;
  variant?: keyof typeof FRAME_MAP;
  glow?: boolean;
}

export function DecoratedFrame({
  children,
  className = '',
  variant = 'default',
  glow = false,
}: DecoratedFrameProps) {
  const FrameSvg = FRAME_MAP[variant];

  return (
    <div className={`relative ${className}`}>
      <FrameSvg
        className={`absolute inset-0 w-full h-full text-gold pointer-events-none ${
          glow ? 'drop-shadow-[0_0_12px_rgba(201,168,76,0.4)]' : ''
        }`}
        preserveAspectRatio="none"
      />
      <div className="relative z-10 p-6">
        {children}
      </div>
    </div>
  );
}
