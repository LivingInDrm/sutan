import React from 'react';
import { motion } from 'framer-motion';

interface AncientDiceProps {
  value: number;
  isSuccess: boolean;
  isExploded?: boolean;
  isRerolled?: boolean;
  delay?: number;
}

interface AncientDiceResultProps {
  dice: number[];
  explodedStartIndex: number;
  successThreshold?: number;
  rerolledIndices?: number[];
}
const PIP_LAYOUTS: Record<number, Array<{ top: string; left: string }>> = {
  1: [{ top: '50%', left: '50%' }],
  2: [
    { top: '27%', left: '28%' },
    { top: '73%', left: '72%' },
  ],
  3: [
    { top: '27%', left: '28%' },
    { top: '50%', left: '50%' },
    { top: '73%', left: '72%' },
  ],
  4: [
    { top: '28%', left: '28%' },
    { top: '28%', left: '72%' },
    { top: '72%', left: '28%' },
    { top: '72%', left: '72%' },
  ],
  5: [
    { top: '28%', left: '28%' },
    { top: '28%', left: '72%' },
    { top: '50%', left: '50%' },
    { top: '72%', left: '28%' },
    { top: '72%', left: '72%' },
  ],
  6: [
    { top: '24%', left: '28%' },
    { top: '24%', left: '72%' },
    { top: '50%', left: '28%' },
    { top: '50%', left: '72%' },
    { top: '76%', left: '28%' },
    { top: '76%', left: '72%' },
  ],
};

function getPipColor(value: number) {
  return value === 1 || value === 4 ? '#c0392b' : '#1a1a1a';
}

function getDiceStyle(isSuccess: boolean, isExploded?: boolean, isRerolled?: boolean) {
  if (isExploded) {
    return {
      filter: 'brightness(1.06) saturate(1.08)',
      boxShadow:
        '0 14px 30px rgba(68, 19, 14, 0.34), 0 0 0 1px rgba(154, 31, 23, 0.75), 0 0 18px rgba(192, 57, 43, 0.6), 0 0 32px rgba(255, 219, 132, 0.34)',
    };
  }

  if (isSuccess) {
    return {
      filter: 'brightness(1)',
      boxShadow:
        '0 12px 24px rgba(44, 31, 18, 0.26), 0 0 0 1px rgba(210, 168, 80, 0.8), 0 0 16px rgba(225, 192, 105, 0.45)',
    };
  }

  return {
    filter: 'brightness(0.9)',
    boxShadow: isRerolled
      ? '0 10px 22px rgba(28, 34, 41, 0.3), 0 0 0 1px rgba(137, 234, 245, 0.55), 0 0 14px rgba(105, 234, 255, 0.3)'
      : '0 10px 22px rgba(28, 20, 12, 0.24)',
  };
}

function renderPips(value: number) {
  const pips = PIP_LAYOUTS[Math.min(6, Math.max(1, value))] ?? PIP_LAYOUTS[1];
  const pipColor = getPipColor(value);

  return pips.map((pip, index) => (
    <span
      key={`${value}-${index}`}
      className="absolute h-[10px] w-[10px] rounded-full"
      style={{
        top: pip.top,
        left: pip.left,
        transform: 'translate(-50%, -50%)',
        background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.28) 0%, ${pipColor} 38%, ${pipColor} 62%, rgba(0,0,0,0.85) 100%)`,
        boxShadow: 'inset 0 1.5px 2px rgba(255,255,255,0.18), inset 0 -2px 3px rgba(0,0,0,0.42), 0 0 1px rgba(0,0,0,0.5)',
      }}
    />
  ));
}

export function AncientDice({
  value,
  isSuccess,
  isExploded,
  isRerolled,
  delay = 0,
}: AncientDiceProps) {
  const initialRotate = React.useMemo(() => Math.random() * 60 - 30, []);
  const diceStyle = getDiceStyle(isSuccess, isExploded, isRerolled);

  return (
    <motion.div
      initial={{ y: -60, rotate: initialRotate, opacity: 0, scale: 0.82 }}
      animate={
        isExploded
          ? {
              y: 0,
              rotate: 0,
              opacity: 1,
              scale: [1, 1.03, 1],
              boxShadow: [
                diceStyle.boxShadow,
                '0 14px 30px rgba(68, 19, 14, 0.34), 0 0 0 1px rgba(154, 31, 23, 0.85), 0 0 24px rgba(192, 57, 43, 0.78), 0 0 40px rgba(255, 219, 132, 0.45)',
                diceStyle.boxShadow,
              ],
            }
          : isRerolled
            ? {
                y: 0,
                rotate: 0,
                opacity: 1,
                scale: 1,
                filter: [
                  'drop-shadow(0 0 0 rgba(105, 234, 255, 0))',
                  'drop-shadow(0 0 10px rgba(105, 234, 255, 0.7))',
                  'drop-shadow(0 0 0 rgba(105, 234, 255, 0))',
                ],
              }
            : { y: 0, rotate: 0, opacity: 1, scale: 1 }
      }
      transition={{
        y: { type: 'spring', stiffness: 280, damping: 16, bounce: 0.45, delay },
        rotate: { type: 'spring', stiffness: 220, damping: 20, delay },
        opacity: { duration: 0.2, delay },
        scale: isExploded
          ? { times: [0, 0.65, 1], duration: 0.6, delay, ease: 'easeOut' }
          : { type: 'spring', stiffness: 240, damping: 17, bounce: 0.4, delay },
        boxShadow: isExploded ? { duration: 0.6, times: [0, 0.5, 1], delay } : undefined,
        filter: isRerolled ? { duration: 0.45, delay: delay + 0.08, ease: 'easeOut' } : undefined,
      }}
      className="relative flex h-16 w-16 items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/dice-face.png)',
        backgroundSize: '100% 100%',
        filter: diceStyle.filter,
        boxShadow: diceStyle.boxShadow,
      }}
    >
      <span className="absolute inset-[7px] rounded-[14px] bg-[radial-gradient(circle_at_30%_26%,rgba(255,255,255,0.22),transparent_38%),radial-gradient(circle_at_70%_75%,rgba(92,58,31,0.16),transparent_40%)]" />
      {renderPips(value)}
      {isRerolled && !isExploded ? (
        <span
          className="pointer-events-none absolute inset-[4px] rounded-[16px]"
          style={{
            boxShadow: '0 0 0 1px rgba(137, 234, 245, 0.5), inset 0 0 12px rgba(105, 234, 255, 0.18)',
          }}
        />
      ) : null}
    </motion.div>
  );
}

export function AncientDiceResult({
  dice,
  explodedStartIndex,
  successThreshold = 4,
  rerolledIndices = [],
}: AncientDiceResultProps) {
  const successCount = dice.filter((value) => value >= successThreshold).length;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-center text-sm tracking-[0.16em] text-stone-300/90">
        掷出 {successCount} 枚成功
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {dice.map((value, idx) => (
          <AncientDice
            key={`${value}-${idx}`}
            value={value}
            isSuccess={value >= successThreshold}
            isExploded={idx >= explodedStartIndex}
            isRerolled={rerolledIndices.includes(idx)}
            delay={idx * 0.1}
          />
        ))}
      </div>
    </div>
  );
}