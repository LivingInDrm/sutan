import React from 'react';
import { motion } from 'framer-motion';

interface DiceComponentProps {
  value: number;
  isSuccess: boolean;
  isExploded?: boolean;
  isRerolled?: boolean;
  delay?: number;
}

export function DiceComponent({ value, isSuccess, isExploded, isRerolled, delay = 0 }: DiceComponentProps) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', delay, duration: 0.5 }}
      className={`
        w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg
        border-2 shadow-lg
        ${isSuccess
          ? 'bg-green-900/60 border-green-400 text-green-300'
          : 'bg-red-900/40 border-red-500/50 text-red-400'
        }
        ${isExploded ? 'ring-2 ring-yellow-400 animate-pulse' : ''}
        ${isRerolled ? 'ring-2 ring-blue-400' : ''}
      `}
    >
      {value}
    </motion.div>
  );
}

interface DiceResultProps {
  dice: number[];
  explodedStartIndex: number;
  successThreshold?: number;
  rerolledIndices?: number[];
}

export function DiceResult({ dice, explodedStartIndex, successThreshold = 7, rerolledIndices = [] }: DiceResultProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {dice.map((value, idx) => (
        <DiceComponent
          key={idx}
          value={value}
          isSuccess={value >= successThreshold}
          isExploded={idx >= explodedStartIndex}
          isRerolled={rerolledIndices.includes(idx)}
          delay={idx * 0.08}
        />
      ))}
    </div>
  );
}
