import React from 'react';
import { useGameStore } from '../../../stores/gameStore';

export function ResourceBar() {
  const gold = useGameStore(s => s.gold);
  const reputation = useGameStore(s => s.reputation);
  const executionCountdown = useGameStore(s => s.executionCountdown);
  const goldenDice = useGameStore(s => s.goldenDice);
  const thinkCharges = useGameStore(s => s.thinkCharges);
  const currentDay = useGameStore(s => s.currentDay);

  return (
    <header className="h-12 bg-ink/90 border-b border-gold-dim/40 flex items-center px-4 gap-6 shrink-0">
      <span className="text-amber-400 font-bold text-sm">
        Day {currentDay}
      </span>
      <div className="flex items-center gap-1">
        <span className="text-yellow-500 text-xs">GOLD</span>
        <span className="text-yellow-300 font-mono font-bold">{gold}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-cerulean-300 text-xs">REP</span>
        <span className="text-cerulean-300 font-bold">{reputation}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-red-400 text-xs">EXEC</span>
        <span className="text-red-300 font-mono font-bold">{executionCountdown}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-amber-500 text-xs">DICE</span>
        <span className="text-amber-300 font-mono font-bold">{goldenDice}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-purple-400 text-xs">THINK</span>
        <span className="text-purple-300 font-mono font-bold">{thinkCharges}</span>
      </div>
    </header>
  );
}
