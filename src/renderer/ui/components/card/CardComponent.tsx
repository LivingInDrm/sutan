import React, { useCallback, useRef } from 'react';
import type { Card } from '../../../core/types';
import { Rarity } from '../../../core/types/enums';
import { ATTR_LABELS, CARD_TYPE_LABELS } from '../../constants/labels';
import ricePaperTexture from '../../../assets/textures/rice-paper-256.webp';

const RARITY_STYLES: Record<string, string> = {
  legendary: 'border-gold-300/50 bg-gold-600/10 shadow-rarity-gold',
  epic: 'border-gold-500/40 bg-gold-600/10 shadow-rarity-copper',
  rare: 'border-parchment-400/40 bg-parchment-500/10 shadow-rarity-silver',
  common: 'border-leather-600/30 bg-leather-800/20 shadow-rarity-stone',
  gold: 'border-gold-300/50 bg-gold-600/10 shadow-rarity-gold',
  silver: 'border-parchment-400/40 bg-parchment-500/10 shadow-rarity-silver',
  copper: 'border-gold-500/40 bg-gold-600/10 shadow-rarity-copper',
  stone: 'border-leather-600/30 bg-leather-800/20 shadow-rarity-stone',
};

const RARITY_BADGE: Record<string, string> = {
  legendary: 'bg-gradient-to-b from-gold-300 to-gold-400 text-leather-900',
  epic: 'bg-gradient-to-b from-gold-400 to-gold-500 text-parchment-50',
  rare: 'bg-gradient-to-b from-parchment-300 to-parchment-400 text-leather-900',
  common: 'bg-gradient-to-b from-leather-600 to-leather-700 text-parchment-200',
  gold: 'bg-gradient-to-b from-gold-300 to-gold-400 text-leather-900',
  silver: 'bg-gradient-to-b from-parchment-300 to-parchment-400 text-leather-900',
  copper: 'bg-gradient-to-b from-gold-400 to-gold-500 text-parchment-50',
  stone: 'bg-gradient-to-b from-leather-600 to-leather-700 text-parchment-200',
};

const COMPACT_RARITY: Record<string, {
  border: string;
  glow: string;
  accent: string;
  badge: string;
  label: string;
}> = {
  legendary: {
    border: 'border-gold-300/50',
    glow: 'var(--shadow-rarity-gold)',
    accent: 'from-gold-300 to-gold-400',
    badge: 'bg-gradient-to-b from-gold-300 to-gold-400 text-leather-900',
    label: '传',
  },
  epic: {
    border: 'border-gold-500/40',
    glow: 'var(--shadow-rarity-copper)',
    accent: 'from-gold-400 to-gold-500',
    badge: 'bg-gradient-to-b from-gold-400 to-gold-500 text-parchment-50',
    label: '史',
  },
  rare: {
    border: 'border-parchment-400/40',
    glow: 'var(--shadow-rarity-silver)',
    accent: 'from-parchment-300 to-parchment-400',
    badge: 'bg-gradient-to-b from-parchment-300 to-parchment-400 text-leather-900',
    label: '稀',
  },
  common: {
    border: 'border-leather-600/30',
    glow: 'var(--shadow-rarity-stone)',
    accent: 'from-leather-600 to-leather-700',
    badge: 'bg-gradient-to-b from-leather-600 to-leather-700 text-parchment-200',
    label: '凡',
  },
  gold: {
    border: 'border-gold-300/50',
    glow: 'var(--shadow-rarity-gold)',
    accent: 'from-gold-300 to-gold-400',
    badge: 'bg-gradient-to-b from-gold-300 to-gold-400 text-leather-900',
    label: '金',
  },
  silver: {
    border: 'border-parchment-400/40',
    glow: 'var(--shadow-rarity-silver)',
    accent: 'from-parchment-300 to-parchment-400',
    badge: 'bg-gradient-to-b from-parchment-300 to-parchment-400 text-leather-900',
    label: '银',
  },
  copper: {
    border: 'border-gold-500/40',
    glow: 'var(--shadow-rarity-copper)',
    accent: 'from-gold-400 to-gold-500',
    badge: 'bg-gradient-to-b from-gold-400 to-gold-500 text-parchment-50',
    label: '铜',
  },
  stone: {
    border: 'border-leather-600/30',
    glow: 'var(--shadow-rarity-stone)',
    accent: 'from-leather-600 to-leather-700',
    badge: 'bg-gradient-to-b from-leather-600 to-leather-700 text-parchment-200',
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
                <span className="text-3xl opacity-20 font-(family-name:--font-display) text-leather">
                  {CARD_TYPE_LABELS[card.type]?.charAt(0) || '?'}
                </span>
              </div>
            )}
          </div>

          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/50 via-black/25 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

          <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${r.accent}`} />

          <div className="absolute top-0 inset-x-0 p-1.5">
            <span className="text-[12px] font-bold text-white font-(family-name:--font-display) leading-tight line-clamp-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
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
          <span className="text-xs text-parchment/50">{CARD_TYPE_LABELS[card.type] || card.type}</span>
        </div>
        <h3 className="text-sm font-bold text-amber-100 mb-1">{card.name}</h3>
        <p className="text-xs text-parchment/50 line-clamp-2 mb-2">{card.description}</p>
        
        {card.attributes && (
          <div className="grid grid-cols-4 gap-1 text-[10px]">
            {Object.entries(card.attributes).map(([attr, val]) => (
              <div key={attr} className="text-center">
                <div className="text-parchment/40">{ATTR_LABELS[attr] || attr.slice(0, 3).toUpperCase()}</div>
                <div className="text-amber-300 font-bold">{val}</div>
              </div>
            ))}
          </div>
        )}

        {card.tags && card.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {card.tags.map(tag => (
              <span key={tag} className="text-[9px] px-1 py-0.5 bg-ink/60 rounded text-parchment/40">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
