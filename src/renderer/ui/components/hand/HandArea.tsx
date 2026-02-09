import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CardComponent } from '../card/CardComponent';
import { CardDetailPanel } from '../card/CardDetailPanel';
import type { Card } from '../../../core/types';
import { CardType } from '../../../core/types/enums';
import bronzeTexture from '../../../assets/textures/bronze-256.webp';

interface HandGroup {
  key: string;
  label: string;
  roman: string;
  icon: string;
  types: CardType[];
}

const HAND_GROUPS: HandGroup[] = [
  {
    key: 'character',
    label: '人物',
    roman: 'I',
    icon: '👤',
    types: [CardType.Character],
  },
  {
    key: 'equipment',
    label: '装备',
    roman: 'II',
    icon: '⚔',
    types: [CardType.Equipment],
  },
  {
    key: 'items',
    label: '物品',
    roman: 'III',
    icon: '📜',
    types: [CardType.Intel, CardType.Consumable, CardType.Book, CardType.Gem],
  },
  {
    key: 'others',
    label: '其他',
    roman: 'IV',
    icon: '✦',
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
    <div className="flex flex-col h-full shrink-0">
      {groups.map((g) => {
        const isActive = activeKey === g.key;
        const count = counts[g.key] || 0;
        return (
          <button
            key={g.key}
            onClick={() => onSelect(g.key)}
            className={`
              relative flex flex-col items-center justify-center gap-0.5
              w-14 flex-1 border-r-2 transition-all duration-200
              ${isActive
                ? 'border-r-gold bg-leather-light/80 shadow-[inset_0_0_20px_rgba(201,168,76,0.15)]'
                : 'border-r-transparent bg-leather/60 hover:bg-leather-light/40'
              }
            `}
          >
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{ backgroundImage: `url(${bronzeTexture})`, backgroundSize: 'cover' }}
            />

            <span className={`
              relative text-[10px] font-bold tracking-wider
              ${isActive ? 'text-gold-bright' : 'text-gold-dim/60'}
            `}>
              {g.icon}
            </span>

            <span className={`
              relative text-lg font-bold font-[family-name:var(--font-display)] leading-none
              ${isActive ? 'text-gold text-glow-gold' : 'text-parchment/40'}
            `}>
              {count}
            </span>

            <span className={`
              relative text-[9px] tracking-widest font-bold
              ${isActive ? 'text-gold-dim' : 'text-parchment/20'}
            `}>
              {g.roman}
            </span>

            {isActive && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-gold-bright rounded-l"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
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

interface CardStripProps {
  cards: Card[];
  onCardClick?: (card: Card, e: React.MouseEvent) => void;
  onCardDoubleClick?: (card: Card, e: React.MouseEvent) => void;
  selectedCardId?: string | null;
}

function CardStrip({ cards, onCardClick, onCardDoubleClick, selectedCardId }: CardStripProps) {
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

  const { positions, totalNeeded } = useMemo(() => {
    const n = cards.length;
    if (n === 0) return { positions: [], totalNeeded: 0 };

    const total = n * CARD_WIDTH + (n - 1) * CARD_MIN_GAP;
    const available = containerWidth - 32;

    if (total <= available || n <= 1) {
      const startX = (available - total) / 2;
      return {
        positions: cards.map((_, i) => startX + i * (CARD_WIDTH + CARD_MIN_GAP)),
        totalNeeded: total,
      };
    }

    const step = (available - CARD_WIDTH) / (n - 1);
    return {
      positions: cards.map((_, i) => i * step),
      totalNeeded: total,
    };
  }, [cards, containerWidth]);

  const needsFade = totalNeeded > containerWidth - 32;

  if (cards.length === 0) {
    return (
      <div ref={containerRef} className="flex-1 flex items-center justify-center">
        <span className="text-parchment/15 text-sm font-[family-name:var(--font-display)] tracking-widest">
          - 空 -
        </span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden">
      {needsFade && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-leather to-transparent z-20 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-leather to-transparent z-20 pointer-events-none" />
        </>
      )}

      <div className="absolute inset-0 flex items-center px-4">
        <AnimatePresence mode="popLayout">
          {cards.map((card, i) => {
            const isHovered = hoveredIndex === i;
            const x = positions[i] ?? 0;

            return (
              <motion.div
                key={card.card_id}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{
                  opacity: 1,
                  x,
                  y: isHovered ? -12 : 0,
                  scale: isHovered ? 1.08 : 1,
                }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                  opacity: { duration: 0.2 },
                }}
                className="absolute"
                style={{ zIndex: isHovered ? 50 : i }}
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
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full bg-gold/30 blur-sm" />
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

  const handleCardClick = useCallback((card: Card, e: React.MouseEvent) => {
    setDetailCard(card);
    setDetailPos({ x: e.clientX, y: e.clientY });
    onCardClick?.(card, e);
  }, [onCardClick]);

  const handleCloseDetail = useCallback(() => setDetailCard(null), []);

  return (
    <div className={`relative flex h-52 bg-leather border-t border-gold-dim/20 ${className}`}>
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: `url(${bronzeTexture})`, backgroundSize: '256px' }}
      />

      <CategoryTabs
        groups={HAND_GROUPS}
        counts={counts}
        activeKey={activeGroup}
        onSelect={setActiveGroup}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2 px-4 pt-2 pb-1">
          <span className="text-[10px] text-parchment/30 tracking-widest uppercase font-bold">
            {HAND_GROUPS.find(g => g.key === activeGroup)?.label}
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-gold-dim/20 to-transparent" />
          <span className="text-[10px] text-parchment/20 tabular-nums">
            {activeCards.length}
          </span>
        </div>

        <CardStrip
          cards={activeCards}
          onCardClick={handleCardClick}
          onCardDoubleClick={onCardDoubleClick}
          selectedCardId={selectedCardId}
        />
      </div>

      {detailCard && (
        <CardDetailPanel card={detailCard} position={detailPos} onClose={handleCloseDetail} />
      )}
    </div>
  );
}
