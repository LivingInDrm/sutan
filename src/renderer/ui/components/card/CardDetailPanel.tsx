import React, { useEffect, useRef } from 'react';
import type { Card } from '../../../core/types';
import { CardType } from '../../../core/types/enums';

const RARITY_STYLES: Record<string, string> = {
  gold: 'border-yellow-400 bg-yellow-950/60',
  silver: 'border-gray-300 bg-gray-900/80',
  copper: 'border-amber-600 bg-amber-950/60',
  stone: 'border-stone-500 bg-stone-900/60',
};

const RARITY_BADGE: Record<string, string> = {
  gold: 'bg-yellow-500 text-yellow-950',
  silver: 'bg-gray-300 text-gray-900',
  copper: 'bg-amber-600 text-amber-950',
  stone: 'bg-stone-500 text-stone-900',
};

const ATTR_LABELS: Record<string, string> = {
  physique: 'PHY',
  charm: 'CHM',
  wisdom: 'WIS',
  combat: 'CMB',
  social: 'SOC',
  survival: 'SUR',
  stealth: 'STL',
  magic: 'MAG',
};

const SPECIAL_ATTR_LABELS: Record<string, string> = {
  support: 'Support',
  reroll: 'Reroll',
};

const EQUIPMENT_TYPE_LABELS: Record<string, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  accessory: 'Accessory',
  mount: 'Mount',
};

const CARD_TYPE_LABELS: Record<string, string> = {
  character: 'Character',
  equipment: 'Equipment',
  sultan: 'Sultan',
  intel: 'Intel',
  consumable: 'Consumable',
  book: 'Book',
  gem: 'Gem',
  thought: 'Thought',
};

interface CardDetailPanelProps {
  card: Card;
  position: { x: number; y: number };
  onClose: () => void;
}

export function CardDetailPanel({ card, position, onClose }: CardDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [onClose]);

  useEffect(() => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (rect.right > vw) {
      panelRef.current.style.left = `${position.x - rect.width - 8}px`;
    }
    if (rect.bottom > vh) {
      panelRef.current.style.top = `${Math.max(8, vh - rect.height - 8)}px`;
    }
  }, [position]);

  const rarityStyle = RARITY_STYLES[card.rarity] || RARITY_STYLES.stone;
  const badgeStyle = RARITY_BADGE[card.rarity] || RARITY_BADGE.stone;

  return (
    <div
      ref={panelRef}
      style={{ left: position.x + 8, top: position.y }}
      className={`
        fixed z-50 w-64 rounded-lg border-2 shadow-2xl backdrop-blur-sm
        ${rarityStyle} text-gray-200
      `}
    >
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className={`text-xs px-2 py-0.5 rounded font-bold ${badgeStyle}`}>
            {card.rarity.toUpperCase()}
          </span>
          <span className="text-xs text-gray-400">
            {CARD_TYPE_LABELS[card.type] || card.type}
          </span>
        </div>
        <h3 className="text-base font-bold text-amber-100">{card.name}</h3>
        <p className="text-xs text-gray-400 leading-relaxed">{card.description}</p>

        <div className="border-t border-gray-700/50" />

        {/* Character attributes */}
        {card.type === CardType.Character && card.attributes && (
          <>
            <div className="grid grid-cols-4 gap-x-2 gap-y-1.5">
              {Object.entries(card.attributes).map(([attr, val]) => (
                <div key={attr} className="text-center">
                  <div className="text-[10px] text-gray-500 font-medium">
                    {ATTR_LABELS[attr] || attr.slice(0, 3).toUpperCase()}
                  </div>
                  <div className="text-sm text-amber-300 font-bold">{val}</div>
                </div>
              ))}
            </div>
            {card.special_attributes && Object.keys(card.special_attributes).length > 0 && (
              <div className="flex gap-3">
                {Object.entries(card.special_attributes).map(([attr, val]) => (
                  <div key={attr} className="text-xs">
                    <span className="text-gray-500">{SPECIAL_ATTR_LABELS[attr] || attr}:</span>{' '}
                    <span className={`font-bold ${(val as number) > 0 ? 'text-green-400' : (val as number) < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {(val as number) > 0 ? '+' : ''}{val as number}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {card.equipment_slots !== undefined && card.equipment_slots > 0 && (
              <div className="text-xs">
                <span className="text-gray-500">Equipment Slots:</span>{' '}
                <span className="text-amber-300 font-bold">{card.equipment_slots}</span>
              </div>
            )}
          </>
        )}

        {/* Equipment details */}
        {card.type === CardType.Equipment && (
          <>
            {card.equipment_type && (
              <div className="text-xs">
                <span className="text-gray-500">Type:</span>{' '}
                <span className="text-amber-200 font-medium">
                  {EQUIPMENT_TYPE_LABELS[card.equipment_type] || card.equipment_type}
                </span>
              </div>
            )}
            {card.attribute_bonus && Object.keys(card.attribute_bonus).length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-gray-500 font-medium">ATTRIBUTE BONUS</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(card.attribute_bonus).map(([attr, val]) => (
                    <span key={attr} className="text-xs">
                      <span className="text-gray-400">{ATTR_LABELS[attr] || attr}</span>{' '}
                      <span className="text-green-400 font-bold">+{val}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {card.special_bonus && Object.keys(card.special_bonus).length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-gray-500 font-medium">SPECIAL BONUS</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(card.special_bonus).map(([attr, val]) => (
                    <span key={attr} className="text-xs">
                      <span className="text-gray-400">{SPECIAL_ATTR_LABELS[attr] || attr}</span>{' '}
                      <span className="text-green-400 font-bold">+{val}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {card.gem_slots !== undefined && (
              <div className="text-xs">
                <span className="text-gray-500">Gem Slots:</span>{' '}
                <span className="text-amber-300 font-bold">{card.gem_slots}</span>
              </div>
            )}
          </>
        )}

        {/* Other card types with attribute_bonus */}
        {card.type !== CardType.Character && card.type !== CardType.Equipment && card.attribute_bonus && Object.keys(card.attribute_bonus).length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] text-gray-500 font-medium">ATTRIBUTE BONUS</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(card.attribute_bonus).map(([attr, val]) => (
                <span key={attr} className="text-xs">
                  <span className="text-gray-400">{ATTR_LABELS[attr] || attr}</span>{' '}
                  <span className="text-green-400 font-bold">+{val}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {card.tags && card.tags.length > 0 && (
          <>
            <div className="border-t border-gray-700/50" />
            <div className="flex flex-wrap gap-1">
              {card.tags.map(tag => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-800/80 rounded text-gray-400">
                  {tag}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
