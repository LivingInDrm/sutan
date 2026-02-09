import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Card } from '../../../core/types';
import { CardType, Rarity } from '../../../core/types/enums';
import { CARD_TYPE_LABELS, EQUIPMENT_TYPE_LABELS } from '../../constants/labels';
import { AttrBadge } from '../common/AttrBadge';
import { SectionTitle } from '../common/SectionTitle';
import { DecorStar } from '../common/svg';
import ricePaperTexture from '../../../assets/textures/rice-paper-1024.webp';

interface CardDetailPanelProps {
  card: Card;
  position: { x: number; y: number };
  onClose: () => void;
}

const RARITY_ACCENT: Record<string, { border: string; glow: string; badge: string; text: string }> = {
  [Rarity.Gold]: {
    border: 'border-yellow-500/60',
    glow: '0 0 24px rgba(234,179,8,0.25), 0 0 48px rgba(234,179,8,0.10)',
    badge: 'bg-gradient-to-r from-yellow-600 to-amber-500 text-yellow-50',
    text: 'text-yellow-700',
  },
  [Rarity.Silver]: {
    border: 'border-gray-400/50',
    glow: '0 0 20px rgba(156,163,175,0.20), 0 0 40px rgba(156,163,175,0.08)',
    badge: 'bg-gradient-to-r from-gray-400 to-slate-300 text-gray-800',
    text: 'text-gray-500',
  },
  [Rarity.Copper]: {
    border: 'border-amber-600/50',
    glow: '0 0 16px rgba(180,83,9,0.18), 0 0 32px rgba(180,83,9,0.06)',
    badge: 'bg-gradient-to-r from-amber-700 to-orange-600 text-amber-50',
    text: 'text-amber-700',
  },
  [Rarity.Stone]: {
    border: 'border-stone-400/40',
    glow: '0 0 12px rgba(120,113,108,0.12)',
    badge: 'bg-gradient-to-r from-stone-500 to-stone-400 text-stone-50',
    text: 'text-stone-500',
  },
};

const RARITY_LABELS: Record<string, string> = {
  [Rarity.Gold]: '金',
  [Rarity.Silver]: '银',
  [Rarity.Copper]: '铜',
  [Rarity.Stone]: '石',
};

export function CardDetailPanel({ card, position, onClose }: CardDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const accent = RARITY_ACCENT[card.rarity] || RARITY_ACCENT[Rarity.Stone];

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

  const isCharacter = card.type === CardType.Character;
  const isEquipment = card.type === CardType.Equipment;

  return (
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        style={{ left: position.x + 8, top: position.y }}
        className="fixed z-50 w-[720px]"
        initial={{ opacity: 0, scale: 0.96, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 4 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className={`relative rounded-lg overflow-hidden border ${accent.border}`}
          style={{
            backgroundImage: `url(${ricePaperTexture})`,
            backgroundSize: 'cover',
            boxShadow: `${accent.glow}, 0 25px 50px -12px rgba(0,0,0,0.25)`,
          }}
        >
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-gold-dim/60 to-transparent" />

          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-20 w-6 h-6 flex items-center justify-center text-leather/40 hover:text-crimson transition-colors"
          >
            <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>

          <div className="flex min-h-[280px]">
            <motion.div
              className="flex-[7] p-5 pr-4 flex flex-col"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.08 }}
            >
              <div className="flex items-center gap-2.5 mb-1">
                <h2 className="text-lg font-bold text-leather font-[family-name:var(--font-display)] leading-tight tracking-wide">
                  {card.name}
                </h2>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${accent.badge} leading-none`}>
                  {RARITY_LABELS[card.rarity]}
                </span>
                <span className="text-[11px] text-leather/40 font-medium">{CARD_TYPE_LABELS[card.type]}</span>
                {isEquipment && card.equipment_type && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-leather/8 border border-leather/15 text-leather/50">
                    {EQUIPMENT_TYPE_LABELS[card.equipment_type] || card.equipment_type}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 mb-3">
                <DecorStar className="w-2.5 h-2.5 text-gold-dim/50" preserveAspectRatio="xMidYMid meet" />
                <div className="flex-1 h-px bg-gradient-to-r from-gold-dim/30 to-transparent" />
              </div>

              <p className="text-xs text-leather/65 leading-[1.8] mb-3 tracking-wide">
                {card.description}
              </p>

              {isCharacter && card.attributes && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                >
                  <SectionTitle theme="light">属性</SectionTitle>
                  <div className="grid grid-cols-4 gap-x-8 gap-y-0.5 mt-1.5">
                    {Object.entries(card.attributes).map(([attr, val]) => (
                      <AttrBadge key={attr} attr={attr} value={val} theme="light" />
                    ))}
                  </div>
                </motion.div>
              )}

              {isCharacter && card.special_attributes && Object.keys(card.special_attributes).length > 0 && (
                <div className="grid grid-cols-4 gap-x-8 gap-y-0.5 mt-0.5">
                  {Object.entries(card.special_attributes).map(([attr, val]) => (
                    <AttrBadge key={attr} attr={attr} value={val as number} theme="light" />
                  ))}
                </div>
              )}

              {!isCharacter && card.attribute_bonus && Object.keys(card.attribute_bonus).length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                >
                  <SectionTitle theme="light">属性加成</SectionTitle>
                  <div className="grid grid-cols-4 gap-x-8 gap-y-0.5 mt-1.5">
                    {Object.entries(card.attribute_bonus).map(([attr, val]) => (
                      <AttrBadge key={attr} attr={attr} value={val as number} variant="bonus" theme="light" />
                    ))}
                  </div>
                </motion.div>
              )}

              {!isCharacter && card.special_bonus && Object.keys(card.special_bonus).length > 0 && (
                <>
                  <SectionTitle theme="light">特殊加成</SectionTitle>
                  <div className="grid grid-cols-4 gap-x-8 gap-y-0.5 mt-0.5">
                    {Object.entries(card.special_bonus).map(([attr, val]) => (
                      <AttrBadge key={attr} attr={attr} value={val as number} variant="bonus" theme="light" />
                    ))}
                  </div>
                </>
              )}

              {isEquipment && card.gem_slots !== undefined && card.gem_slots > 0 && (
                <div className="flex items-center gap-2.5 text-xs mt-3">
                  <span className="text-leather/45 text-[11px]">宝石槽</span>
                  <div className="flex gap-1.5">
                    {Array.from({ length: card.gem_slots }).map((_, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-full border border-gold-dim/30 bg-gradient-to-br from-leather/5 to-leather/15 flex items-center justify-center"
                      >
                        <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-gold-dim/60">
                          <path d="M5 1L8.5 5L5 9L1.5 5Z" fill="none" stroke="currentColor" strokeWidth="0.8" />
                        </svg>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {card.tags && card.tags.length > 0 && (
                <div className="mt-auto pt-3">
                  <SectionTitle theme="light">标签</SectionTitle>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {card.tags.map(tag => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 bg-leather/6 rounded text-leather/55 border border-leather/12 tracking-wider"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            <div className="flex-[3] relative flex items-stretch overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-8 z-10 bg-gradient-to-r from-parchment/80 to-transparent pointer-events-none" />

              {card.image ? (
                <motion.img
                  src={card.image}
                  alt={card.name}
                  className="w-full h-full object-cover object-top"
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-leather/5">
                  <div className="flex flex-col items-center gap-2 opacity-25">
                    <DecorStar className="w-8 h-8 text-leather" preserveAspectRatio="xMidYMid meet" />
                    <span className="text-[10px] text-leather tracking-widest">{CARD_TYPE_LABELS[card.type]}</span>
                  </div>
                </div>
              )}

              {isCharacter && card.equipment_slots !== undefined && card.equipment_slots > 0 && (
                <div className="absolute bottom-3 left-3 flex gap-1 z-10">
                  {Array.from({ length: card.equipment_slots }).map((_, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded border border-gold-dim/40 bg-parchment/70 backdrop-blur-sm flex items-center justify-center"
                    >
                      <span className="text-gold-dim text-[8px]">+</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-parchment/40 to-transparent pointer-events-none" />
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-gold-dim/40 to-transparent" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
