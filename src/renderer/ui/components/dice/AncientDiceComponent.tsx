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

const CHINESE_NUMERALS: Record<number, string> = {
  1: '一',
  2: '二',
  3: '三',
  4: '四',
  5: '五',
  6: '六',
  7: '七',
  8: '八',
  9: '九',
  10: '十',
};

function toChineseNumeral(value: number) {
  return CHINESE_NUMERALS[value] ?? String(value);
}

function getBackgroundImage(isSuccess: boolean, isExploded?: boolean) {
  if (isExploded) {
    return '/dice-exploded.png';
  }

  return isSuccess ? '/dice-success.png' : '/dice-fail.png';
}

function getTextColor(isSuccess: boolean, isExploded?: boolean) {
  if (isExploded) {
    return '#f4d58d';
  }

  return isSuccess ? '#3f3122' : '#d7d2c8';
}

function getTextShadow(isSuccess: boolean, isExploded?: boolean) {
  if (isExploded) {
    return '0 1px 2px rgba(72, 23, 10, 0.9), 0 0 10px rgba(244, 213, 141, 0.55)';
  }

  return isSuccess
    ? '0 1px 2px rgba(248, 238, 205, 0.5), 0 0 8px rgba(74, 52, 24, 0.18)'
    : '0 1px 2px rgba(20, 20, 20, 0.75), 0 0 8px rgba(255, 255, 255, 0.15)';
}

function getBoxShadow(isSuccess: boolean, isExploded?: boolean, isRerolled?: boolean) {
  if (isExploded) {
    return '0 10px 24px rgba(118, 32, 20, 0.35), 0 0 18px rgba(246, 202, 109, 0.35)';
  }

  if (isRerolled) {
    return '0 8px 20px rgba(36, 77, 87, 0.28), 0 0 16px rgba(101, 204, 214, 0.35)';
  }

  return isSuccess
    ? '0 8px 20px rgba(78, 89, 73, 0.22)'
    : '0 8px 20px rgba(31, 28, 28, 0.28)';
}

export function AncientDice({
  value,
  isSuccess,
  isExploded,
  isRerolled,
  delay = 0,
}: AncientDiceProps) {
  const initialRotate = React.useMemo(() => Math.random() * 60 - 30, []);

  return (
    <motion.div
      initial={{ y: -60, rotate: initialRotate, opacity: 0, scale: 0.5 }}
      animate={
        isExploded
          ? {
              y: 0,
              rotate: 0,
              opacity: 1,
              scale: [1, 1.15, 1],
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
        y: { type: 'spring', stiffness: 260, damping: 18, delay },
        rotate: { type: 'spring', stiffness: 220, damping: 20, delay },
        opacity: { duration: 0.2, delay },
        scale: isExploded
          ? { times: [0, 0.7, 1], duration: 0.55, delay, ease: 'easeOut' }
          : { type: 'spring', stiffness: 240, damping: 18, delay },
        filter: isRerolled ? { duration: 0.45, delay: delay + 0.08, ease: 'easeOut' } : undefined,
      }}
      className="relative flex h-14 w-14 items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url(${getBackgroundImage(isSuccess, isExploded)})`,
        backgroundSize: '100% 100%',
        boxShadow: getBoxShadow(isSuccess, isExploded, isRerolled),
      }}
    >
      <span
        className="select-none text-[1.7rem] leading-none"
        style={{
          fontFamily: '"LXGW WenKai", "霞鹜文楷", serif',
          color: getTextColor(isSuccess, isExploded),
          textShadow: getTextShadow(isSuccess, isExploded),
        }}
      >
        {toChineseNumeral(value)}
      </span>
      {isRerolled && !isExploded ? (
        <span
          className="pointer-events-none absolute inset-[3px] rounded-[14px]"
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
  successThreshold = 7,
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