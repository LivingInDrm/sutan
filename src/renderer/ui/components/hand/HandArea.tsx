import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CardComponent } from '../card/CardComponent';
import { CardDetailPanel } from '../card/CardDetailPanel';
import { DecorDiamond } from '../common/svg';
import type { Card } from '../../../core/types';
import { CardType } from '../../../core/types/enums';
import inkWashTexture from '../../../assets/textures/ink-wash-256.webp';
import ricePaperTexture from '../../../assets/textures/rice-paper-256.webp';

interface HandGroup {
  key: string;
  label: string;
  types: CardType[];
}

const HAND_GROUPS: HandGroup[] = [
  { key: 'character', label: '人物', types: [CardType.Character] },
  { key: 'equipment', label: '装备', types: [CardType.Equipment] },
  { key: 'items', label: '物品', types: [CardType.Intel, CardType.Consumable, CardType.Book, CardType.Gem] },
  { key: 'others', label: '其他', types: [CardType.Thought, CardType.Sultan] },
];

function groupCards(cards: Card[]): Record<string, Card[]> {
  const grouped: Record<string, Card[]> = {};
  for (const g of HAND_GROUPS) grouped[g.key] = [];
  for (const card of cards) {
    const group = HAND_GROUPS.find(g => g.types.includes(card.type));
    (group ? grouped[group.key] : grouped['others']).push(card);
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
              relative flex items-center justify-center
              w-12 flex-1 transition-all duration-300 ease-out
              ${idx > 0 ? 'border-t border-parchment/[0.06]' : ''}
            `}
          >
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-300"
              style={{
                backgroundImage: `url(${ricePaperTexture})`,
                backgroundSize: '128px',
                opacity: isActive ? 0.08 : 0.03,
              }}
            />

            <div className={`
              absolute inset-0 transition-all duration-300 pointer-events-none
              ${isActive
                ? 'bg-parchment/[0.06]'
                : 'bg-transparent hover:bg-parchment/[0.03]'
              }
            `} />

            <div className="relative flex flex-col items-center gap-0.5">
              <span className={`
                writing-mode-vertical text-sm font-[family-name:var(--font-display)] leading-none
                transition-all duration-300 select-none
                ${isActive ? 'text-parchment/80' : 'text-parchment/25 hover:text-parchment/35'}
              `}>
                {g.label}
              </span>

              <span className={`
                text-[9px] tabular-nums leading-none mt-0.5
                transition-all duration-300
                ${isActive ? 'text-parchment/35' : 'text-parchment/12'}
              `}>
                {count}
              </span>
            </div>

            {isActive && (
              <motion.div
                layoutId="hand-tab-ink"
                className="absolute right-0 inset-y-2 w-[1.5px] rounded-full"
                style={{
                  background: 'linear-gradient(to bottom, transparent, rgba(212,197,169,0.4), transparent)',
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
const CARD_HEIGHT = 192;
const CARD_MIN_GAP = 4;
const HOVER_EXPAND = 24;

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

  const positions = useMemo(() => {
    const n = cards.length;
    if (n === 0) return [];

    const padding = 20;
    const available = containerWidth - padding * 2;
    if (available <= 0) return cards.map(() => padding);

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
        const factor = 1 - Math.abs(dist) * 0.35;
        return pos + (dist > 0 ? HOVER_EXPAND * factor : -HOVER_EXPAND * factor);
      }
      return pos;
    });
  }, [cards, containerWidth, hoveredIndex]);

  if (cards.length === 0) {
    return (
      <div ref={containerRef} className="h-full w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 opacity-[0.08]">
          <DecorDiamond
            className="w-6 h-6 text-parchment"
            preserveAspectRatio="xMidYMid meet"
          />
          <span className="text-[10px] text-parchment font-[family-name:var(--font-display)] tracking-[0.4em]">
            空
          </span>
        </div>
      </div>
    );
  }

  const isOverflowing = cards.length * CARD_WIDTH + (cards.length - 1) * CARD_MIN_GAP > containerWidth - 40;

  return (
    <div ref={containerRef} className="h-full w-full relative overflow-hidden">
      {isOverflowing && (
        <>
          <div
            className="absolute left-0 top-0 bottom-0 w-10 z-20 pointer-events-none"
            style={{ background: 'linear-gradient(to right, rgba(26,15,10,1) 0%, transparent 100%)' }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-10 z-20 pointer-events-none"
            style={{ background: 'linear-gradient(to left, rgba(26,15,10,1) 0%, transparent 100%)' }}
          />
        </>
      )}

      <div
        className="absolute inset-0 flex items-center"
        style={{ paddingTop: `${Math.max(0, (CARD_HEIGHT - containerRef.current?.clientHeight! + 16) * 0.5)}px` }}
      >
        <AnimatePresence mode="popLayout">
          {cards.map((card, i) => {
            const isHovered = hoveredIndex === i;
            const x = positions[i] ?? 0;

            return (
              <motion.div
                key={card.card_id}
                initial={{ opacity: 0, y: 24 }}
                animate={{
                  opacity: 1,
                  x,
                  y: isHovered ? -14 : 0,
                  scale: isHovered ? 1.06 : 1,
                }}
                exit={{ opacity: 0, y: 24 }}
                transition={{
                  type: 'spring',
                  stiffness: 350,
                  damping: 26,
                  mass: 0.8,
                  opacity: { duration: 0.15 },
                }}
                className="absolute origin-bottom"
                style={{
                  zIndex: isHovered ? 50 : i,
                  filter: isHovered
                    ? 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))'
                    : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
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
    for (const g of HAND_GROUPS) c[g.key] = grouped[g.key]?.length || 0;
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
    <div className={`relative flex h-52 overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-leather" />

      <div
        className="absolute inset-0 pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url(${inkWashTexture})`,
          backgroundSize: '256px',
          opacity: 0.06,
        }}
      />

      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background: 'linear-gradient(to right, transparent 5%, rgba(212,197,169,0.12) 30%, rgba(212,197,169,0.18) 50%, rgba(212,197,169,0.12) 70%, transparent 95%)',
        }}
      />

      <CategoryTabs
        groups={HAND_GROUPS}
        counts={counts}
        activeKey={activeGroup}
        onSelect={setActiveGroup}
      />

      <div
        className="absolute left-12 top-2 bottom-2 w-px pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent, rgba(212,197,169,0.1), transparent)',
        }}
      />

      <div className="flex-1 flex flex-col min-w-0 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeGroup}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="flex-1 min-h-0"
          >
            <CardStrip
              cards={activeCards}
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
