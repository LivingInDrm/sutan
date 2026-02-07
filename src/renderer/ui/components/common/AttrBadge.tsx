import React from 'react';
import { getAttrLabel, getAttrIcon } from '../../constants/labels';
import { DecorDiamond } from './svg';

interface AttrBadgeProps {
  attr: string;
  value: number;
  variant?: 'default' | 'bonus';
  compact?: boolean;
}

export function AttrBadge({ attr, value, variant = 'default', compact = false }: AttrBadgeProps) {
  const label = getAttrLabel(attr);
  const icon = getAttrIcon(attr);
  const isBonus = variant === 'bonus';

  if (compact) {
    return (
      <div className="text-center">
        <div className="text-[10px] text-parchment/50 font-medium">{label}</div>
        <div className={`text-xs font-bold ${isBonus ? 'text-green-400' : 'text-gold-bright'}`}>
          {isBonus ? `+${value}` : value}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 py-0.5">
      <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
        <DecorDiamond
          className="absolute inset-0 w-full h-full text-gold-dim/60 pointer-events-none"
          preserveAspectRatio="none"
        />
        <span className="relative text-[10px] z-10">{icon}</span>
      </div>
      <span className="text-xs text-parchment/70 whitespace-nowrap">{label}</span>
      <span className={`text-sm font-bold ml-auto tabular-nums ${isBonus ? 'text-green-400' : 'text-gold-bright'}`}>
        {isBonus ? `+${value}` : value}
      </span>
    </div>
  );
}
