import React from 'react';
import type { Slot, Card } from '../../../core/types';
import { CardComponent } from './CardComponent';

const SLOT_TYPE_LABELS: Record<string, string> = {
  character: '人物',
  item: '物品',
  sultan: '苏丹',
};

interface SlotComponentProps {
  slot: Slot;
  card?: Card;
  onDrop?: () => void;
  onClick?: () => void;
  index: number;
}

export function SlotComponent({ slot, card, onDrop, onClick, index }: SlotComponentProps) {
  const isFilled = !!card;
  const isRequired = slot.required;
  const isLocked = slot.locked;

  if (isFilled) {
    return (
      <div
        className="relative group cursor-pointer"
        onClick={isLocked ? undefined : onClick}
      >
        <CardComponent card={card} compact />

        {/* Gold ring to indicate it's placed in a slot */}
        <div className="absolute inset-0 rounded ring-2 ring-gold/50 pointer-events-none" />

        {/* Cancel overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/55 transition-colors rounded flex items-end justify-center pb-2 pointer-events-none">
          <span className="text-[9px] text-white/80 opacity-0 group-hover:opacity-100 transition-opacity tracking-wider">
            点击取消
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={isLocked ? undefined : onClick}
      className={`
        relative w-28 h-48 rounded-lg flex flex-col items-center justify-center
        border-2 transition-all duration-200 select-none
        backdrop-blur-sm
        ${isLocked
          ? 'border-parchment/15 bg-black/30 cursor-not-allowed opacity-50'
          : isRequired
          ? 'border-crimson/60 bg-black/35 cursor-pointer hover:bg-black/50 border-dashed'
          : 'border-parchment/30 bg-black/30 cursor-pointer hover:bg-black/45 border-dashed'
        }
      `}
    >
      <div className="text-center px-2">
        <div className="text-[11px] text-parchment/50 font-[family-name:var(--font-display)] mb-1">
          {SLOT_TYPE_LABELS[slot.type] || slot.type}
        </div>
        {isRequired && (
          <div className="text-[9px] text-crimson/70 tracking-wider">必填</div>
        )}
        {isLocked && (
          <div className="text-[9px] text-parchment/30 tracking-wider">已锁定</div>
        )}
      </div>

      {/* Empty slot inner border */}
      <div className={`
        absolute inset-3 rounded border
        ${isRequired ? 'border-crimson/20' : 'border-parchment/10'}
        pointer-events-none
      `} />
    </div>
  );
}
