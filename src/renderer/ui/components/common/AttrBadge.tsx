import React from 'react';
import { getAttrLabel, getAttrIcon } from '../../constants/labels';
import { DecorDiamond } from './svg';

interface AttrBadgeProps {
  attr: string;
  value: number;
  variant?: 'default' | 'bonus';
  compact?: boolean;
  theme?: 'dark' | 'light';
}

export function AttrBadge({ attr, value, variant = 'default', compact = false, theme = 'dark' }: AttrBadgeProps) {
  const label = getAttrLabel(attr);
  const icon = getAttrIcon(attr);
  const isBonus = variant === 'bonus';
  const isLight = theme === 'light';

  if (compact) {
    return (
      <div className="text-center">
        <div className={`text-[10px] font-medium ${isLight ? 'text-leather/50' : 'text-parchment/50'}`}>{label}</div>
        <div className={`text-xs font-bold ${isBonus ? 'text-green-700' : isLight ? 'text-leather' : 'text-gold-bright'}`}>
          {isBonus ? `+${value}` : value}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 py-0.5">
      <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
        <DecorDiamond
          className={`absolute inset-0 w-full h-full pointer-events-none ${isLight ? 'text-gold-dim/80' : 'text-gold-dim/60'}`}
          preserveAspectRatio="none"
        />
        <span className="relative text-[18px] z-10 leading-none">{icon}</span>
      </div>
      <span className={`text-xs whitespace-nowrap ${isLight ? 'text-leather/60' : 'text-parchment/70'}`}>{label}</span>
      <span className={`text-sm font-bold ml-auto tabular-nums ${isBonus ? (isLight ? 'text-green-700' : 'text-green-400') : isLight ? 'text-leather' : 'text-gold-bright'}`}>
        {isBonus ? `+${value}` : value}
      </span>
    </div>
  );
}
