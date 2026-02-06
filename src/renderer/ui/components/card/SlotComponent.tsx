import React from 'react';
import type { Slot } from '../../../core/types';

interface SlotComponentProps {
  slot: Slot;
  cardName?: string;
  onDrop?: () => void;
  onClick?: () => void;
  index: number;
}

export function SlotComponent({ slot, cardName, onDrop, onClick, index }: SlotComponentProps) {
  const isFilled = !!cardName;
  const isRequired = slot.required;
  const isLocked = slot.locked;

  return (
    <div
      onClick={onClick}
      className={`
        w-32 h-20 rounded-lg border-2 border-dashed flex items-center justify-center
        transition-all duration-200 cursor-pointer
        ${isRequired && !isFilled ? 'border-red-500 bg-red-950/20' : ''}
        ${isFilled ? 'border-amber-500 bg-amber-950/30' : 'border-gray-600 bg-gray-900/30'}
        ${isLocked ? 'border-gray-700 bg-gray-900/50 cursor-not-allowed opacity-60' : 'hover:bg-gray-800/40'}
      `}
    >
      {isFilled ? (
        <span className="text-xs text-amber-300 font-medium">{cardName}</span>
      ) : (
        <div className="text-center">
          <div className="text-xs text-gray-500">{slot.type}</div>
          {isRequired && <div className="text-[10px] text-red-400">REQUIRED</div>}
          {isLocked && <div className="text-[10px] text-gray-600">LOCKED</div>}
        </div>
      )}
    </div>
  );
}
