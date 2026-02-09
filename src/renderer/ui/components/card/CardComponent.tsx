import React, { useCallback, useRef } from 'react';
import type { Card } from '../../../core/types';
import { Rarity } from '../../../core/types/enums';
import { ATTR_LABELS, CARD_TYPE_LABELS } from '../../constants/labels';
import ricePaperTexture from '../../../assets/textures/rice-paper-256.webp';

const RARITY_STYLES: Record<string, string> = {
  gold: 'border-yellow-400 bg-yellow-950/30 shadow-yellow-500/20',
  silver: 'border-gray-300 bg-gray-900/40 shadow-gray-400/20',
  copper: 'border-amber-600 bg-amber-950/30 shadow-amber-600/20',
  stone: 'border-stone-500 bg-stone-900/30 shadow-stone-500/20',
};

const RARITY_BADGE: Record<string, string> = {
  gold: 'bg-yellow-500 text-yellow-950',
  silver: 'bg-gray-300 text-gray-900',
  copper: 'bg-amber-600 text-amber-950',
  stone: 'bg-stone-500 text-stone-900',
};

const COMPACT_RARITY: Record<string, {
  border: string;
  glow: string;
  accent: string;
  badge: string;
  label: string;
}> = {
  gold: {
    border: 'border-yellow-500/50',
    glow: '0 0 12px rgba(234,179,8,0.20), 0 2px 8px rgba(0,0,0,0.3)',
    accent: 'from-yellow-600 to-amber-500',
    badge: 'bg-gradient-to-b from-yellow-500 to-amber-600 text-yellow-950',
    label: '金',
  },
  silver: {
    border: 'border-gray-300/40',
    glow: '0 0 10px rgba(156,163,175,0.15), 0 2px 8px rgba(0,0,0,0.3)',
    accent: 'from-gray-300 to-slate-400',
    badge: 'bg-gradient-to-b from-gray-300 to-slate-400 text-gray-800',
    label: '银',
  },
  copper: {
    border: 'border-amber-600/40',
    glow: '0 0 10px rgba(180,83,9,0.15), 0 2px 8px rgba(0,0,0,0.3)',
    accent: 'from-amber-600 to-orange-700',
    badge: 'bg-gradient-to-b from-amber-600 to-orange-700 text-amber-50',
    label: '铜',
  },
  stone: {
    border: 'border-stone-400/30',
    glow: '0 2px 8px rgba(0,0,0,0.3)',
    accent: 'from-stone-400 to-stone-500',
    badge: 'bg-gradient-to-b from-stone-400 to-stone-500 text-stone-800',
    label: '石',
  },
};

interface CardComponentProps {
  card: Card;
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  selected?: boolean;
  locked?: boolean;
  compact?: boolean;
}

const DOUBLE_CLICK_DELAY = 250;

export function CardComponent({ card, onClick, onDoubleClick, selected, locked, compact }: CardComponentProps) {
  const rarityStyle = RARITY_STYLES[card.rarity] || RARITY_STYLES.stone;
  const badgeStyle = RARITY_BADGE[card.rarity] || RARITY_BADGE.stone;
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickCount = useRef(0);

  const handleClick = useCallback((e: React.MouseEvent) => {
    clickCount.current += 1;
    if (clickCount.current === 1) {
      clickTimer.current = setTimeout(() => {
        if (clickCount.current === 1) {
          onClick?.(e);
        }
        clickCount.current = 0;
      }, DOUBLE_CLICK_DELAY);
    } else if (clickCount.current === 2) {
      if (clickTimer.current) clearTimeout(clickTimer.current);
      clickCount.current = 0;
      onDoubleClick?.(e);
    }
  }, [onClick, onDoubleClick]);

  if (compact) {
    const r = COMPACT_RARITY[card.rarity] || COMPACT_RARITY.stone;
    return (
      <div
        onClick={handleClick}
        className={`
          group w-28 h-48 shrink-0 rounded overflow-hidden cursor-pointer
          transition-all duration-200 ease-out border ${r.border}
          ${selected ? 'ring-2 ring-amber-400/80 scale-105' : ''}
          ${locked ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-[1.06] hover:-translate-y-0.5'}
        `}
        style={{ boxShadow: r.glow }}
      >
        <div className="relative w-full h-full">
          <div
            className="absolute inset-0"
            style={{ backgroundImage: `url(${ricePaperTexture})`, backgroundSize: 'cover' }}
          />

          <div className="absolute inset-0">
            {card.image ? (
              <img
                src={card.image}
                alt={card.name}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-3xl opacity-20 font-[family-name:var(--font-display)] text-leather">
                  {CARD_TYPE_LABELS[card.type]?.charAt(0) || '?'}
                </span>
              </div>
            )}
          </div>

          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/50 via-black/25 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

          <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${r.accent}`} />

          <div className="absolute top-0 inset-x-0 p-1.5">
            <span className="text-[12px] font-bold text-white font-[family-name:var(--font-display)] leading-tight line-clamp-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {card.name}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`
        w-48 rounded-lg border-2 cursor-pointer transition-all duration-200
        ${rarityStyle} ${selected ? 'ring-2 ring-amber-400 scale-105' : ''}
        ${locked ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
        shadow-lg overflow-hidden
      `}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs px-2 py-0.5 rounded ${badgeStyle} font-bold`}>
            {card.rarity.toUpperCase()}
          </span>
          <span className="text-xs text-gray-400">{CARD_TYPE_LABELS[card.type] || card.type}</span>
        </div>
        <h3 className="text-sm font-bold text-amber-100 mb-1">{card.name}</h3>
        <p className="text-xs text-gray-400 line-clamp-2 mb-2">{card.description}</p>
        
        {card.attributes && (
          <div className="grid grid-cols-4 gap-1 text-[10px]">
            {Object.entries(card.attributes).map(([attr, val]) => (
              <div key={attr} className="text-center">
                <div className="text-gray-500">{ATTR_LABELS[attr] || attr.slice(0, 3).toUpperCase()}</div>
                <div className="text-amber-300 font-bold">{val}</div>
              </div>
            ))}
          </div>
        )}

        {card.tags && card.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {card.tags.map(tag => (
              <span key={tag} className="text-[9px] px-1 py-0.5 bg-gray-800 rounded text-gray-400">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
