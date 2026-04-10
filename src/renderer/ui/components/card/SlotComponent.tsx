import React from 'react';
import type { Slot, Card } from '../../../core/types';
import { CardComponent } from './CardComponent';
import ricePaperTexture from '../../../assets/textures/rice-paper-256.webp';
import bronzeTexture from '../../../assets/textures/bronze-512.webp';

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
  const slotLabel = SLOT_TYPE_LABELS[slot.type] || slot.type;

  if (isFilled) {
    return (
      <div
        className="relative group cursor-pointer"
        onClick={isLocked ? undefined : onClick}
      >
        <CardComponent card={card} compact />

        <div className="absolute -inset-[7px] rounded-[14px] pointer-events-none">
          <div className="absolute inset-0 rounded-[14px] border border-gold-300/55 shadow-[0_0_18px_rgba(201,168,76,0.18)]" />
          <div className="absolute inset-[4px] rounded-[11px] border border-gold-500/35" />
          <div
            className="absolute inset-[2px] rounded-[12px] opacity-[0.16] mix-blend-screen"
            style={{
              backgroundImage: `url(${bronzeTexture})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="absolute inset-x-[20%] top-[2px] h-[2px] rounded-full bg-gradient-to-r from-transparent via-gold-100/70 to-transparent" />
        </div>

        <div className="absolute -top-6 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="min-w-[74px] rounded-[3px] border border-gold-500/35 bg-leather-950/82 px-3 py-1 text-center shadow-[0_6px_14px_rgba(0,0,0,0.28)]">
            <div className="text-[9px] tracking-[0.18em] text-gold-300/78 font-(family-name:--font-ui)">
              已落牌印
            </div>
          </div>
        </div>

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/52 transition-colors rounded flex items-end justify-center pb-2 pointer-events-none">
          <span className="text-[9px] text-parchment-50/88 opacity-0 group-hover:opacity-100 transition-opacity tracking-[0.18em] font-(family-name:--font-ui)">
            起印收牌
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={isLocked ? undefined : onClick}
      className={`
        group relative w-28 h-48 overflow-hidden rounded-[3px] flex flex-col items-center justify-center
        transition-all duration-200 select-none
        ${isLocked
          ? 'cursor-not-allowed opacity-55'
          : 'cursor-pointer hover:-translate-y-1 hover:scale-[1.01]'
        }
      `}
    >
      <div
        className={`
          absolute inset-0
          ${isLocked
            ? 'bg-[linear-gradient(180deg,rgba(20,12,8,0.94),rgba(14,9,6,0.96))]'
            : isRequired
            ? 'bg-[linear-gradient(180deg,rgba(53,31,18,0.96),rgba(34,19,11,0.97))]'
            : 'bg-[linear-gradient(180deg,rgba(45,28,18,0.96),rgba(28,17,10,0.97))]'
          }
        `}
      />

      <div
        className="absolute inset-0 opacity-[0.18] mix-blend-screen"
        style={{
          backgroundImage: `url(${bronzeTexture})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <div
        className="absolute inset-[6px] opacity-[0.15] mix-blend-screen"
        style={{
          backgroundImage: `url(${ricePaperTexture})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <div className="absolute inset-[10px] border border-black/18 pointer-events-none" />
      <div className="absolute inset-x-[11px] top-[16px] h-[1px] bg-gradient-to-r from-transparent via-parchment-100/24 to-transparent pointer-events-none" />
      <div className="absolute inset-x-[13px] bottom-[14px] h-[1px] bg-gradient-to-r from-transparent via-gold-500/26 to-transparent pointer-events-none" />

      <div
        className={`
          absolute inset-0 rounded-[3px] border-[2px]
          ${isLocked
            ? 'border-parchment-500/14'
            : isRequired
            ? 'border-gold-500/78 group-hover:border-gold-100'
            : 'border-gold-500/54 group-hover:border-gold-100/88'
          }
        `}
      />
      <div
        className={`
          absolute inset-[5px] rounded-[1px] border
          ${isLocked
            ? 'border-parchment-400/8'
            : isRequired
            ? 'border-crimson-500/34 group-hover:border-gold-300/58'
            : 'border-gold-300/30 group-hover:border-gold-300/50'
          }
        `}
      />

      {!isLocked && (
        <div className="absolute inset-0 rounded-[3px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-[0_0_0_1px_rgba(240,208,96,0.28),0_0_18px_rgba(240,208,96,0.22),inset_0_0_22px_rgba(240,208,96,0.08)]" />
      )}

      <div className="absolute top-3 left-1/2 -translate-x-1/2">
        <div
          className={`
            px-3 py-[3px] rounded-[2px] border text-[9px] tracking-[0.22em] font-(family-name:--font-ui)
            ${isLocked
              ? 'border-parchment-500/18 text-parchment-500/40 bg-black/18'
              : isRequired
              ? 'border-crimson-500/46 text-crimson-300/90 bg-[linear-gradient(180deg,rgba(73,11,11,0.38),rgba(35,8,8,0.26))]'
              : 'border-gold-500/30 text-gold-300/78 bg-leather-950/34'
            }
          `}
        >
          {isLocked ? '封印' : isRequired ? '朱批必呈' : '可奉'}
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center px-3 text-center">
        <div className="mb-2 text-[10px] tracking-[0.3em] text-gold-500/58 font-(family-name:--font-ui)">
          印位
        </div>
        <div className="text-[14px] leading-[1.2] text-parchment-100/88 font-(family-name:--font-display)">
          {slotLabel}
        </div>
        <div className="mt-2 text-[10px] leading-[1.5] text-parchment-400/62 font-(family-name:--font-body)">
          {isLocked
            ? '此印位暂封'
            : isRequired
            ? '须呈此牌方可启局'
            : '可择一牌奉入'}
        </div>
      </div>

      <div className="absolute inset-[19px] pointer-events-none flex items-center justify-center">
        <div
          className={`
            w-[58px] h-[88px] rounded-[3px]
            ${isLocked
              ? 'border border-parchment-500/10 bg-black/12'
              : isRequired
              ? 'border border-crimson-500/28 bg-[radial-gradient(circle,rgba(139,26,26,0.18),rgba(0,0,0,0))]'
              : 'border border-gold-500/22 bg-[radial-gradient(circle,rgba(201,168,76,0.12),rgba(0,0,0,0))]'
            }
          `}
        />
      </div>

      {!isLocked && (
        <>
          <span className="absolute left-[6px] top-[6px] h-[5px] w-[5px] rounded-full bg-gold-400/78 shadow-[0_0_0_1px_rgba(61,36,24,0.55)] pointer-events-none" />
          <span className="absolute right-[6px] top-[6px] h-[5px] w-[5px] rounded-full bg-gold-400/78 shadow-[0_0_0_1px_rgba(61,36,24,0.55)] pointer-events-none" />
          <span className="absolute left-[6px] bottom-[6px] h-[5px] w-[5px] rounded-full bg-gold-500/68 shadow-[0_0_0_1px_rgba(61,36,24,0.55)] pointer-events-none" />
          <span className="absolute right-[6px] bottom-[6px] h-[5px] w-[5px] rounded-full bg-gold-500/68 shadow-[0_0_0_1px_rgba(61,36,24,0.55)] pointer-events-none" />
        </>
      )}
    </div>
  );
}
