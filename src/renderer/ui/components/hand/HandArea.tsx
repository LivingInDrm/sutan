import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CardComponent } from '../card/CardComponent';
import { CardDetailPanel } from '../card/CardDetailPanel';
import { DividerLine, DecorDiamond } from '../common/svg';
import type { Card } from '../../../core/types';
import { CardType } from '../../../core/types/enums';
import bronzeTexture from '../../../assets/textures/bronze-256.webp';

interface HandGroup {
  key: string;
  label: string;
  roman: string;
  icon: React.ReactNode;
  types: CardType[];
}

function TabIcon({ type }: { type: string }) {
  const paths: Record<string, React.ReactNode> = {
    character: (
      <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
      </svg>
    ),
    equipment: (
      <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 3.5L20.5 9.5L9.5 20.5L3.5 14.5z" />
        <path d="M12 6l6 6" />
        <path d="M3.5 14.5L1 17l3 3 2.5-2.5" />
      </svg>
    ),
    items: (
      <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16v16H4z" />
        <path d="M4 4l4 4h8l4-4" />
        <path d="M4 20l4-4h8l4 4" />
        <line x1="12" y1="8" x2="12" y2="16" />
      </svg>
    ),
    others: (
      <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l2.9 8.9H24l-7.4 5.4 2.9 8.9L12 19.8l-7.4 5.4 2.9-8.9L0 10.9h9.1z" />
      </svg>
    ),
  };
  return <>{paths[type] || paths.others}</>;
}

const HAND_GROUPS: HandGroup[] = [
  {
    key: 'character',
    label: '人物',
    roman: 'I',
    icon: <TabIcon type="character" />,
    types: [CardType.Character],
  },
  {
    key: 'equipment',
    label: '装备',
    roman: 'II',
    icon: <TabIcon type="equipment" />,
    types: [CardType.Equipment],
  },
  {
    key: 'items',
    label: '物品',
    roman: 'III',
    icon: <TabIcon type="items" />,
    types: [CardType.Intel, CardType.Consumable, CardType.Book, CardType.Gem],
  },
  {
    key: 'others',
    label: '其他',
    roman: 'IV',
    icon: <TabIcon type="others" />,
    types: [CardType.Thought, CardType.Sultan],
  },
];

function groupCards(cards: Card[]): Record<string, Card[]> {
  const grouped: Record<string, Card[]> = {};
  for (const g of HAND_GROUPS) {
    grouped[g.key] = [];
  }
  for (const card of cards) {
    const group = HAND_GROUPS.find(g => g.types.includes(card.type));
    if (group) {
      grouped[group.key].push(card);
    } else {
      grouped['others'].push(card);
    }
  }
  return grouped;
}

interface CategoryTabsProps {
  groups: HandGroup[];
  counts: Record<string, number>;
  activeKey: string;
  onSelect: (key: string) => void;
}

function CategoryTabs({ groups, counts, activeKey, onSelect }: CategoryTabsProps) {
  return (
    <div className="flex flex-col h-full shrink-0 relative z-10">
      {groups.map((g, idx) => {
        const isActive = activeKey === g.key;
        const count = counts[g.key] || 0;
        return (
          <button
            key={g.key}
            onClick={() => onSelect(g.key)}
            className={`
              relative flex flex-col items-center justify-center
              w-16 flex-1 transition-all duration-300 ease-out
              ${idx > 0 ? 'border-t border-gold-dim/10' : ''}
            `}
          >
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-300"
              style={{
                backgroundImage: `url(${bronzeTexture})`,
                backgroundSize: '128px',
                opacity: isActive ? 0.35 : 0.12,
              }}
            />

            <div className={`
              absolute inset-0 transition-all duration-300 pointer-events-none
              ${isActive
                ? 'bg-gradient-to-r from-leather-light/90 via-leather-light/70 to-leather/50 shadow-[inset_0_0_24px_rgba(201,168,76,0.12)]'
                : 'bg-leather/80 hover:bg-leather-light/40'
              }
            `} />

            {isActive && (
              <motion.div
                layoutId="hand-tab-glow"
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at 50% 50%, rgba(201,168,76,0.08) 0%, transparent 70%)',
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}

            <div className="relative flex flex-col items-center gap-1 py-1">
              <div className={`
                w-4 h-4 transition-all duration-300
                ${isActive ? 'text-gold-bright drop-shadow-[0_0_4px_rgba(240,208,96,0.4)]' : 'text-parchment/25'}
              `}>
                {g.icon}
              </div>

              <span className={`
                text-base font-bold font-[family-name:var(--font-display)] leading-none tabular-nums
                transition-all duration-300
                ${isActive ? 'text-gold text-glow-gold scale-110' : 'text-parchment/30'}
              `}>
                {count}
              </span>

              <span className={`
                text-[8px] tracking-[0.2em] font-bold leading-none
                transition-all duration-300
                ${isActive ? 'text-gold-dim/80' : 'text-parchment/15'}
              `}>
                {g.roman}
              </span>
            </div>

            {isActive && (
              <motion.div
                layoutId="hand-tab-edge"
                className="absolute right-0 inset-y-0 w-[2px]"
                style={{
                  background: 'linear-gradient(to bottom, transparent, rgba(201,168,76,0.6), transparent)',
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

const CARD_WIDTH = 112;
const CARD_MIN_GAP = 4;
const HOVER_EXPAND = 28;

interface CardStripProps {
  cards: Card[];
  groupKey: string;
  onCardClick?: (card: Card, e: React.MouseEvent) => void;
  onCardDoubleClick?: (card: Card, e: React.MouseEvent) => void;
  selectedCardId?: string | null;
}

function CardStrip({ cards, groupKey, onCardClick, onCardDoubleClick, selectedCardId }: CardStripProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const positions = useMemo(() => {
    const n = cards.length;
    if (n === 0) return [];

    const padding = 20;
    const available = containerWidth - padding * 2;
    if (available <= 0) return cards.map(() => 0);

    const totalFull = n * CARD_WIDTH + (n - 1) * CARD_MIN_GAP;

    if (totalFull <= available || n <= 1) {
      const startX = padding + (available - totalFull) / 2;
      return cards.map((_, i) => startX + i * (CARD_WIDTH + CARD_MIN_GAP));
    }

    const step = Math.max(24, (available - CARD_WIDTH) / (n - 1));
    const totalWidth = CARD_WIDTH + step * (n - 1);
    const startX = padding + (available - totalWidth) / 2;

    if (hoveredIndex === null) {
      return cards.map((_, i) => startX + i * step);
    }

    const basePositions = cards.map((_, i) => startX + i * step);
    return basePositions.map((pos, i) => {
      if (i === hoveredIndex) return pos;
      const dist = i - hoveredIndex;
      if (Math.abs(dist) <= 2) {
        const push = dist > 0 ? HOVER_EXPAND * (1 - Math.abs(dist) * 0.3) : -HOVER_EXPAND * (1 - Math.abs(dist) * 0.3);
        return pos + push;
      }
      return pos;
    });
  }, [cards, containerWidth, hoveredIndex]);

  if (cards.length === 0) {
    return (
      <div ref={containerRef} className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 opacity-[0.12]">
          <DecorDiamond
            className="w-8 h-8 text-gold-dim"
            preserveAspectRatio="xMidYMid meet"
          />
          <span className="text-xs text-parchment font-[family-name:var(--font-display)] tracking-[0.3em]">
            空
          </span>
        </div>
      </div>
    );
  }

  const isOverflowing = cards.length * CARD_WIDTH + (cards.length - 1) * CARD_MIN_GAP > containerWidth - 40;

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden">
      {isOverflowing && (
        <>
          <div
            className="absolute left-0 top-0 bottom-0 w-12 z-20 pointer-events-none"
            style={{
              background: 'linear-gradient(to right, var(--color-leather) 0%, var(--color-leather) 20%, transparent 100%)',
            }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-12 z-20 pointer-events-none"
            style={{
              background: 'linear-gradient(to left, var(--color-leather) 0%, var(--color-leather) 20%, transparent 100%)',
            }}
          />
        </>
      )}

      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-dim/15 to-transparent pointer-events-none" />

      <div className="absolute inset-0 flex items-center">
        <AnimatePresence mode="popLayout">
          {cards.map((card, i) => {
            const isHovered = hoveredIndex === i;
            const x = positions[i] ?? 0;

            return (
              <motion.div
                key={card.card_id}
                layout
                initial={{ opacity: 0, y: 30, scale: 0.85 }}
                animate={{
                  opacity: 1,
                  x,
                  y: isHovered ? -16 : 0,
                  scale: isHovered ? 1.1 : 1,
                }}
                exit={{ opacity: 0, y: 30, scale: 0.85 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 28,
                  mass: 0.8,
                  opacity: { duration: 0.15 },
                  layout: { type: 'spring', stiffness: 400, damping: 30 },
                }}
                className="absolute origin-bottom"
                style={{
                  zIndex: isHovered ? 50 : i,
                  filter: isHovered ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))' : 'none',
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <CardComponent
                  card={card}
                  compact
                  selected={selectedCardId === card.card_id}
                  onClick={(e) => onCardClick?.(card, e)}
                  onDoubleClick={(e) => onCardDoubleClick?.(card, e)}
                />
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0.5 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-20 h-1.5 rounded-full pointer-events-none"
                    style={{
                      background: 'radial-gradient(ellipse, rgba(201,168,76,0.35) 0%, transparent 70%)',
                    }}
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

export interface HandAreaProps {
  cards: Card[];
  onCardClick?: (card: Card, e: React.MouseEvent) => void;
  onCardDoubleClick?: (card: Card, e: React.MouseEvent) => void;
  selectedCardId?: string | null;
  className?: string;
}

export function HandArea({
  cards,
  onCardClick,
  onCardDoubleClick,
  selectedCardId,
  className = '',
}: HandAreaProps) {
  const [activeGroup, setActiveGroup] = useState<string>('character');
  const [detailCard, setDetailCard] = useState<Card | null>(null);
  const [detailPos, setDetailPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const grouped = useMemo(() => groupCards(cards), [cards]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const g of HAND_GROUPS) {
      c[g.key] = grouped[g.key]?.length || 0;
    }
    return c;
  }, [grouped]);

  const activeCards = grouped[activeGroup] || [];
  const activeLabel = HAND_GROUPS.find(g => g.key === activeGroup)?.label || '';

  const handleCardClick = useCallback((card: Card, e: React.MouseEvent) => {
    setDetailCard(card);
    setDetailPos({ x: e.clientX, y: e.clientY });
    onCardClick?.(card, e);
  }, [onCardClick]);

  const handleCloseDetail = useCallback(() => setDetailCard(null), []);

  return (
    <div className={`relative flex h-52 overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-leather" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${bronzeTexture})`,
          backgroundSize: '256px',
          opacity: 0.03,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(201,168,76,0.04) 0%, transparent 3px, transparent 100%)',
        }}
      />

      <DividerLine
        className="absolute inset-x-0 top-0 h-2 text-gold-dim/25 pointer-events-none -translate-y-1/2"
        preserveAspectRatio="none"
      />

      <CategoryTabs
        groups={HAND_GROUPS}
        counts={counts}
        activeKey={activeGroup}
        onSelect={setActiveGroup}
      />

      <div className="absolute left-16 top-0 bottom-0 w-px bg-gradient-to-b from-gold-dim/25 via-gold-dim/10 to-gold-dim/25" />

      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="flex items-center gap-3 px-5 pt-2.5 pb-1 shrink-0">
          <motion.span
            key={activeGroup}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="text-xs text-gold-dim/60 font-[family-name:var(--font-display)] tracking-[0.15em]"
          >
            {activeLabel}
          </motion.span>
          <div className="flex-1 h-px bg-gradient-to-r from-gold-dim/15 via-gold-dim/8 to-transparent" />
          <motion.span
            key={`${activeGroup}-count`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="text-[10px] text-parchment/20 tabular-nums font-bold"
          >
            {activeCards.length}
          </motion.span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeGroup}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 min-h-0"
          >
            <CardStrip
              cards={activeCards}
              groupKey={activeGroup}
              onCardClick={handleCardClick}
              onCardDoubleClick={onCardDoubleClick}
              selectedCardId={selectedCardId}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {detailCard && (
        <CardDetailPanel card={detailCard} position={detailPos} onClose={handleCloseDetail} />
      )}
    </div>
  );
}
