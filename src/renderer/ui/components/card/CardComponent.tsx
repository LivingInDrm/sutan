import React, { useCallback, useRef } from 'react';
import type { Card } from '../../../core/types';
import { Rarity } from '../../../core/types/enums';
import { ATTR_LABELS, CARD_TYPE_LABELS } from '../../constants/labels';

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
    return (
      <div
        onClick={handleClick}
        className={`
          w-20 h-28 rounded border-2 cursor-pointer transition-all duration-200
          ${rarityStyle} ${selected ? 'ring-2 ring-amber-400 scale-105' : ''}
          ${locked ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
          shadow-lg flex flex-col items-center justify-center p-1
        `}
      >
        <span className={`text-[10px] px-1 rounded ${badgeStyle} font-bold`}>
          {card.rarity.charAt(0).toUpperCase()}
        </span>
        <span className="text-[10px] text-center mt-1 line-clamp-2">{card.name}</span>
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
