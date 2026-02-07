import React, { useEffect, useRef } from 'react';
import type { Card } from '../../../core/types';
import { CardType } from '../../../core/types/enums';
import { CARD_TYPE_LABELS, EQUIPMENT_TYPE_LABELS } from '../../constants/labels';
import { FrameOrnate } from '../common/svg';
import { AttrBadge } from '../common/AttrBadge';
import { SectionTitle } from '../common/SectionTitle';
import ricePaperTexture from '../../../assets/textures/rice-paper-1024.webp';

const RARITY_COLORS: Record<string, { border: string; glow: string; badge: string; badgeText: string }> = {
  gold: { border: 'text-yellow-400', glow: 'drop-shadow-[0_0_12px_rgba(234,179,8,0.4)]', badge: 'bg-yellow-500/90', badgeText: 'text-yellow-950' },
  silver: { border: 'text-gray-300', glow: 'drop-shadow-[0_0_12px_rgba(209,213,219,0.3)]', badge: 'bg-gray-300/90', badgeText: 'text-gray-900' },
  copper: { border: 'text-amber-600', glow: 'drop-shadow-[0_0_12px_rgba(217,119,6,0.3)]', badge: 'bg-amber-600/90', badgeText: 'text-amber-950' },
  stone: { border: 'text-stone-500', glow: 'drop-shadow-[0_0_8px_rgba(120,113,108,0.2)]', badge: 'bg-stone-500/90', badgeText: 'text-stone-900' },
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

  const rarity = RARITY_COLORS[card.rarity] || RARITY_COLORS.stone;
  const isCharacter = card.type === CardType.Character;
  const isEquipment = card.type === CardType.Equipment;
  const isWide = isCharacter;

  return (
    <div
      ref={panelRef}
      style={{ left: position.x + 8, top: position.y }}
      className={`fixed z-50 ${isWide ? 'w-[720px]' : 'w-[380px]'}`}
    >
      <div className="relative">
        <FrameOrnate
          className={`absolute inset-0 w-full h-full ${rarity.border} ${rarity.glow} pointer-events-none`}
          preserveAspectRatio="none"
        />

        <div
          className="relative z-10 rounded-lg overflow-hidden shadow-2xl"
          style={{ backgroundImage: `url(${ricePaperTexture})`, backgroundSize: 'cover' }}
        >
          <div>
            <button
              onClick={onClose}
              className="absolute top-3 right-4 z-20 w-7 h-7 flex items-center justify-center text-leather hover:text-crimson transition-colors rounded-full border border-leather/30 hover:border-crimson/50 bg-parchment/60"
            >
              <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M2 2l8 8M10 2l-8 8" />
              </svg>
            </button>

            {isCharacter ? renderCharacterLayout(card, rarity) : renderGenericLayout(card, rarity, isEquipment)}
          </div>
        </div>
      </div>
    </div>
  );
}

function renderCharacterLayout(
  card: Card,
  rarity: { badge: string; badgeText: string },
) {
  return (
    <div className="flex min-h-[280px]">
      <div className="flex-[7] p-5 pr-4 flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${rarity.badge} ${rarity.badgeText}`}>
            {card.rarity.toUpperCase()}
          </span>
        </div>

        <p className="text-xs text-leather/70 leading-relaxed mb-3">
          {card.description}
        </p>

        {card.attributes && (
          <>
            <SectionTitle theme="light">属性</SectionTitle>
            <div className="grid grid-cols-4 gap-x-8 gap-y-0.5 mt-1.5">
              {Object.entries(card.attributes).map(([attr, val]) => (
                <AttrBadge key={attr} attr={attr} value={val} theme="light" />
              ))}
            </div>
          </>
        )}

        {card.special_attributes && Object.keys(card.special_attributes).length > 0 && (
          <div className="grid grid-cols-4 gap-x-8 gap-y-0.5 mt-0.5">
            {Object.entries(card.special_attributes).map(([attr, val]) => (
              <AttrBadge key={attr} attr={attr} value={val as number} theme="light" />
            ))}
          </div>
        )}

        {card.tags && card.tags.length > 0 && (
          <div className="mt-auto pt-3">
            <SectionTitle theme="light">标签</SectionTitle>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {card.tags.map(tag => (
                <span
                  key={tag}
                  className="text-[11px] px-2 py-0.5 bg-leather/10 rounded text-leather/70 border border-leather/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-px bg-gold-dim/30 self-stretch my-4" />

      <div className="flex-[3] relative flex items-stretch overflow-hidden">
        {card.image ? (
          <img src={card.image} alt={card.name} className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl opacity-30">🃏</span>
          </div>
        )}

        <div className="absolute bottom-0 right-0 flex items-end gap-1 p-3">
          <span className="text-[11px] text-leather/50">{CARD_TYPE_LABELS[card.type]}</span>
          <h2 className="text-lg font-bold text-leather font-[family-name:var(--font-display)] writing-mode-vertical">
            {card.name}
          </h2>
        </div>

        {card.equipment_slots !== undefined && card.equipment_slots > 0 && (
          <div className="absolute bottom-3 left-3 flex gap-1">
            {Array.from({ length: card.equipment_slots }).map((_, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded border border-gold-dim/40 bg-parchment/60 flex items-center justify-center"
              >
                <span className="text-gold-dim text-[8px]">+</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function renderGenericLayout(
  card: Card,
  rarity: { badge: string; badgeText: string },
  isEquipment: boolean,
) {
  return (
    <div className="p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${rarity.badge} ${rarity.badgeText}`}>
              {card.rarity.toUpperCase()}
            </span>
            <span className="text-[11px] text-leather/40">
              {CARD_TYPE_LABELS[card.type] || card.type}
            </span>
          </div>
          <h2 className="text-base font-bold text-leather font-[family-name:var(--font-display)]">
            {card.name}
          </h2>
        </div>

        {isEquipment && card.equipment_type && (
          <span className="text-[11px] px-2 py-1 rounded bg-leather/10 border border-leather/20 text-leather/60">
            {EQUIPMENT_TYPE_LABELS[card.equipment_type] || card.equipment_type}
          </span>
        )}
      </div>

      <p className="text-xs text-leather/70 leading-relaxed">{card.description}</p>

      {isEquipment && card.attribute_bonus && Object.keys(card.attribute_bonus).length > 0 && (
        <>
          <SectionTitle theme="light">属性加成</SectionTitle>
          <div className="grid grid-cols-4 gap-x-3 gap-y-0.5 mt-1">
            {Object.entries(card.attribute_bonus).map(([attr, val]) => (
              <AttrBadge key={attr} attr={attr} value={val as number} variant="bonus" theme="light" />
            ))}
          </div>
        </>
      )}

      {isEquipment && card.special_bonus && Object.keys(card.special_bonus).length > 0 && (
        <>
          <SectionTitle theme="light">特殊加成</SectionTitle>
          <div className="grid grid-cols-4 gap-x-3 gap-y-0.5 mt-1">
            {Object.entries(card.special_bonus).map(([attr, val]) => (
              <AttrBadge key={attr} attr={attr} value={val as number} variant="bonus" theme="light" />
            ))}
          </div>
        </>
      )}

      {isEquipment && card.gem_slots !== undefined && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-leather/50">宝石槽</span>
          <div className="flex gap-1">
            {Array.from({ length: card.gem_slots }).map((_, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-full border border-gold-dim/40 bg-leather/10 flex items-center justify-center"
              >
                <span className="text-gold-dim text-[8px]">◇</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isEquipment && card.attribute_bonus && Object.keys(card.attribute_bonus).length > 0 && (
        <>
          <SectionTitle theme="light">属性加成</SectionTitle>
          <div className="grid grid-cols-4 gap-x-3 gap-y-0.5 mt-1">
            {Object.entries(card.attribute_bonus).map(([attr, val]) => (
              <AttrBadge key={attr} attr={attr} value={val as number} variant="bonus" theme="light" />
            ))}
          </div>
        </>
      )}

      {card.tags && card.tags.length > 0 && (
        <>
          <SectionTitle theme="light">标签</SectionTitle>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {card.tags.map(tag => (
              <span
                key={tag}
                className="text-[11px] px-2 py-0.5 bg-leather/10 rounded text-leather/70 border border-leather/20"
              >
                {tag}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
