import React from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useGameStore } from '../../stores/gameStore';
import { CardType } from '../../core/types/enums';
import type { Card } from '../../core/types';

const INITIAL_CARDS: Card[] = [
  {
    card_id: 'card_protagonist',
    name: '阿尔图',
    type: CardType.Character,
    rarity: 'silver' as any,
    description: '你自己，一个卷入苏丹游戏的可悲之人。',
    image: 'card01.png',
    attributes: { physique: 9, charm: 5, wisdom: 3, combat: 8, social: 4, survival: 3, stealth: 2, magic: 2 },
    special_attributes: { support: 2, reroll: 1 },
    tags: ['male', 'clan', 'protagonist'],
    equipment_slots: 3,
  },
  {
    card_id: 'card_sultan_01',
    name: '苏丹之印',
    type: CardType.Sultan,
    rarity: 'gold' as any,
    description: '苏丹的权力象征。在处刑日来临时持有此卡将被处决。',
    image: 'sultan.png',
    tags: ['sultan', 'dangerous'],
  },
];

export function TitleScreen() {
  const setScreen = useUIStore(s => s.setScreen);
  const startNewGame = useGameStore(s => s.startNewGame);

  const handleStart = (difficulty: string) => {
    startNewGame(difficulty, INITIAL_CARDS, []);
    setScreen('map');
  };

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-950 via-gray-900 to-amber-950/20">
      <div className="text-center mb-16">
        <h1 className="text-7xl font-bold text-amber-400 tracking-widest mb-4"
            style={{ fontFamily: 'serif', textShadow: '0 0 40px rgba(217,119,6,0.3)' }}>
          SULTAN
        </h1>
        <p className="text-amber-200/60 text-lg tracking-wide">苏丹的游戏</p>
      </div>

      <div className="flex flex-col gap-3 w-64">
        {[
          { key: 'easy', label: '简单', desc: '21天 / 50金币' },
          { key: 'normal', label: '普通', desc: '14天 / 30金币' },
          { key: 'hard', label: '困难', desc: '7天 / 15金币' },
          { key: 'nightmare', label: '噩梦', desc: '5天 / 10金币' },
        ].map(({ key, label, desc }) => (
          <button
            key={key}
            onClick={() => handleStart(key)}
            className="px-6 py-3 bg-gray-800/60 border border-amber-900/40 rounded-lg
                       text-amber-100 hover:bg-amber-900/30 hover:border-amber-500/40
                       transition-all duration-200 text-left"
          >
            <div className="font-bold">{label}</div>
            <div className="text-xs text-gray-400">{desc}</div>
          </button>
        ))}
      </div>

      <p className="text-gray-600 text-xs mt-12">v0.1.0 - 苏丹游戏开发版</p>
    </div>
  );
}
