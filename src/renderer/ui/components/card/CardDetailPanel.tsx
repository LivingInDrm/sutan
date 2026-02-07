import React, { useEffect, useRef } from 'react';
import type { Card } from '../../../core/types';
import { CardType } from '../../../core/types/enums';
import { FrameOrnate, DividerLine, DecorDiamond } from '../common/svg';

const RARITY_COLORS: Record<string, { border: string; glow: string; badge: string; badgeText: string }> = {
  gold: { border: 'text-yellow-400', glow: 'drop-shadow-[0_0_12px_rgba(234,179,8,0.4)]', badge: 'bg-yellow-500/90', badgeText: 'text-yellow-950' },
  silver: { border: 'text-gray-300', glow: 'drop-shadow-[0_0_12px_rgba(209,213,219,0.3)]', badge: 'bg-gray-300/90', badgeText: 'text-gray-900' },
  copper: { border: 'text-amber-600', glow: 'drop-shadow-[0_0_12px_rgba(217,119,6,0.3)]', badge: 'bg-amber-600/90', badgeText: 'text-amber-950' },
  stone: { border: 'text-stone-500', glow: 'drop-shadow-[0_0_8px_rgba(120,113,108,0.2)]', badge: 'bg-stone-500/90', badgeText: 'text-stone-900' },
};

const ATTR_LABELS: Record<string, string> = {
  physique: '体魄',
  charm: '魅力',
  wisdom: '智慧',
  combat: '战斗',
  social: '社交',
  survival: '生存',
  stealth: '隐匿',
  magic: '魔力',
};

const ATTR_ICONS: Record<string, string> = {
  physique: '💪',
  charm: '✨',
  wisdom: '🧠',
  combat: '⚔️',
  social: '🗣️',
  survival: '🛡️',
  stealth: '👁️',
  magic: '🔮',
};

const SPECIAL_ATTR_LABELS: Record<string, string> = {
  support: '支持',
  reroll: '重投',
};

const SPECIAL_ATTR_ICONS: Record<string, string> = {
  support: '🤝',
  reroll: '🎲',
};

const EQUIPMENT_TYPE_LABELS: Record<string, string> = {
  weapon: '武器',
  armor: '护甲',
  accessory: '饰品',
  mount: '坐骑',
};

const CARD_TYPE_LABELS: Record<string, string> = {
  character: '角色',
  equipment: '装备',
  sultan: '苏丹',
  intel: '情报',
  consumable: '消耗品',
  book: '典籍',
  gem: '宝石',
  thought: '思绪',
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="text-sm font-bold text-gold font-[family-name:var(--font-display)] text-glow-gold whitespace-nowrap">
        {children}
      </span>
      <DividerLine
        className="flex-1 h-[3px] text-gold-dim/50 pointer-events-none"
        preserveAspectRatio="none"
      />
    </div>
  );
}

function AttrBadge({ icon, label, value }: { icon: string; label: string; value: number }) {
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
      <span className="text-sm text-gold-bright font-bold ml-auto tabular-nums">{value}</span>
    </div>
  );
}

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
      className={`fixed z-50 ${isWide ? 'w-[600px]' : 'w-[380px]'}`}
    >
      <div className="relative">
        <FrameOrnate
          className={`absolute inset-0 w-full h-full ${rarity.border} ${rarity.glow} pointer-events-none`}
          preserveAspectRatio="none"
        />

        <div className="relative z-10 bg-leather-texture rounded-lg overflow-hidden">
          <div className="bg-ink/80 backdrop-blur-sm">
            <button
              onClick={onClose}
              className="absolute top-3 right-4 z-20 w-7 h-7 flex items-center justify-center text-gold-dim hover:text-gold transition-colors rounded-full border border-gold-dim/30 hover:border-gold/50 bg-ink/60"
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
      <div className="flex-[3] p-5 pr-4 flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${rarity.badge} ${rarity.badgeText}`}>
            {card.rarity.toUpperCase()}
          </span>
        </div>

        <p className="text-xs text-parchment/60 leading-relaxed mb-3">
          {card.description}
        </p>

        {card.attributes && (
          <>
            <SectionTitle>属性</SectionTitle>
            <div className="grid grid-cols-4 gap-x-3 gap-y-0.5 mt-1.5">
              {Object.entries(card.attributes).map(([attr, val]) => (
                <AttrBadge
                  key={attr}
                  icon={ATTR_ICONS[attr] || '?'}
                  label={ATTR_LABELS[attr] || attr}
                  value={val}
                />
              ))}
            </div>
          </>
        )}

        {card.special_attributes && Object.keys(card.special_attributes).length > 0 && (
          <div className="grid grid-cols-4 gap-x-3 gap-y-0.5 mt-0.5">
            {Object.entries(card.special_attributes).map(([attr, val]) => (
              <AttrBadge
                key={attr}
                icon={SPECIAL_ATTR_ICONS[attr] || '?'}
                label={SPECIAL_ATTR_LABELS[attr] || attr}
                value={val as number}
              />
            ))}
          </div>
        )}

        {card.tags && card.tags.length > 0 && (
          <div className="mt-auto pt-3">
            <SectionTitle>标签</SectionTitle>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {card.tags.map(tag => (
                <span
                  key={tag}
                  className="text-[11px] px-2 py-0.5 bg-ink-light/80 rounded text-parchment/60 border border-gold-dim/15"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-px bg-gold-dim/20 self-stretch my-4" />

      <div className="flex-[2] p-5 pl-4 flex flex-col items-center">
        <h2 className="text-lg font-bold text-gold font-[family-name:var(--font-display)] text-glow-gold text-center">
          {card.name}
        </h2>
        <span className="text-[11px] text-parchment/50 mt-0.5">
          {CARD_TYPE_LABELS[card.type]}
        </span>

        <div className="flex-1 flex items-center justify-center my-3">
          <div className="w-32 h-44 rounded border border-gold-dim/30 bg-ink-light/40 flex items-center justify-center overflow-hidden">
            {card.image ? (
              <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl opacity-30">🃏</span>
            )}
          </div>
        </div>

        {card.equipment_slots !== undefined && card.equipment_slots > 0 && (
          <div className="flex items-center gap-1.5 text-xs mt-auto">
            <span className="text-parchment/50">装备栏</span>
            <div className="flex gap-1">
              {Array.from({ length: card.equipment_slots }).map((_, i) => (
                <div
                  key={i}
                  className="w-5 h-5 rounded border border-gold-dim/40 bg-ink-light/50 flex items-center justify-center"
                >
                  <span className="text-gold-dim/40 text-[8px]">+</span>
                </div>
              ))}
            </div>
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
            <span className="text-[11px] text-parchment/40">
              {CARD_TYPE_LABELS[card.type] || card.type}
            </span>
          </div>
          <h2 className="text-base font-bold text-gold font-[family-name:var(--font-display)] text-glow-gold">
            {card.name}
          </h2>
        </div>

        {isEquipment && card.equipment_type && (
          <span className="text-[11px] px-2 py-1 rounded bg-ink-light/60 border border-gold-dim/20 text-parchment/60">
            {EQUIPMENT_TYPE_LABELS[card.equipment_type] || card.equipment_type}
          </span>
        )}
      </div>

      <p className="text-xs text-parchment/60 leading-relaxed">{card.description}</p>

      {isEquipment && card.attribute_bonus && Object.keys(card.attribute_bonus).length > 0 && (
        <>
          <SectionTitle>属性加成</SectionTitle>
          <div className="grid grid-cols-4 gap-x-3 gap-y-0.5 mt-1">
            {Object.entries(card.attribute_bonus).map(([attr, val]) => (
              <div key={attr} className="flex items-center gap-1.5 py-0.5">
                <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
                  <DecorDiamond
                    className="absolute inset-0 w-full h-full text-gold-dim/60 pointer-events-none"
                    preserveAspectRatio="none"
                  />
                  <span className="relative text-[10px] z-10">{ATTR_ICONS[attr] || '?'}</span>
                </div>
                <span className="text-xs text-parchment/70 whitespace-nowrap">{ATTR_LABELS[attr] || attr}</span>
                <span className="text-sm text-green-400 font-bold ml-auto tabular-nums">+{val}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {isEquipment && card.special_bonus && Object.keys(card.special_bonus).length > 0 && (
        <>
          <SectionTitle>特殊加成</SectionTitle>
          <div className="grid grid-cols-4 gap-x-3 gap-y-0.5 mt-1">
            {Object.entries(card.special_bonus).map(([attr, val]) => (
              <div key={attr} className="flex items-center gap-1.5 py-0.5">
                <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
                  <DecorDiamond
                    className="absolute inset-0 w-full h-full text-gold-dim/60 pointer-events-none"
                    preserveAspectRatio="none"
                  />
                  <span className="relative text-[10px] z-10">{SPECIAL_ATTR_ICONS[attr] || '?'}</span>
                </div>
                <span className="text-xs text-parchment/70 whitespace-nowrap">{SPECIAL_ATTR_LABELS[attr] || attr}</span>
                <span className="text-sm text-green-400 font-bold ml-auto tabular-nums">+{val}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {isEquipment && card.gem_slots !== undefined && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-parchment/50">宝石槽</span>
          <div className="flex gap-1">
            {Array.from({ length: card.gem_slots }).map((_, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-full border border-gold-dim/40 bg-ink-light/50 flex items-center justify-center"
              >
                <span className="text-gold-dim/40 text-[8px]">◇</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isEquipment && card.attribute_bonus && Object.keys(card.attribute_bonus).length > 0 && (
        <>
          <SectionTitle>属性加成</SectionTitle>
          <div className="grid grid-cols-4 gap-x-3 gap-y-0.5 mt-1">
            {Object.entries(card.attribute_bonus).map(([attr, val]) => (
              <div key={attr} className="flex items-center gap-1.5 py-0.5">
                <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
                  <DecorDiamond
                    className="absolute inset-0 w-full h-full text-gold-dim/60 pointer-events-none"
                    preserveAspectRatio="none"
                  />
                  <span className="relative text-[10px] z-10">{ATTR_ICONS[attr] || '?'}</span>
                </div>
                <span className="text-xs text-parchment/70 whitespace-nowrap">{ATTR_LABELS[attr] || attr}</span>
                <span className="text-sm text-green-400 font-bold ml-auto tabular-nums">+{val}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {card.tags && card.tags.length > 0 && (
        <>
          <SectionTitle>标签</SectionTitle>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {card.tags.map(tag => (
              <span
                key={tag}
                className="text-[11px] px-2 py-0.5 bg-ink-light/80 rounded text-parchment/60 border border-gold-dim/15"
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
