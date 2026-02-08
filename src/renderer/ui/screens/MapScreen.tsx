import React, { useState, useCallback } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useUIStore } from '../../stores/uiStore';
import { CardComponent } from '../components/card/CardComponent';
import { CardDetailPanel } from '../components/card/CardDetailPanel';
import type { Card } from '../../core/types';

export function MapScreen() {
  const game = useGameStore(s => s.game);
  const currentDay = useGameStore(s => s.currentDay);
  const executionCountdown = useGameStore(s => s.executionCountdown);
  const beginSettlement = useGameStore(s => s.beginSettlement);
  const syncState = useGameStore(s => s.syncState);
  const handCardIds = useGameStore(s => s.handCardIds);
  const setScreen = useUIStore(s => s.setScreen);
  const selectScene = useUIStore(s => s.selectScene);

  const [detailCard, setDetailCard] = useState<Card | null>(null);
  const [detailPos, setDetailPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const handleCloseDetail = useCallback(() => setDetailCard(null), []);

  const allCards: Card[] = game
    ? handCardIds.map(id => game.cardManager.getCard(id)?.data).filter(Boolean) as Card[]
    : [];

  const availableScenes = game ? game.sceneManager.getAvailableScenes() : [];
  const participatedScenes = game ? game.sceneManager.getParticipatedScenes() : [];

  const handleNextDay = () => {
    beginSettlement();
    setScreen('settlement');
  };

  const handleSceneClick = (sceneId: string) => {
    selectScene(sceneId);
    setScreen('scene');
  };

  return (
    <div className="h-full flex">
      {/* Left: Map area */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-amber-400 mb-2">World Map</h2>

          {/* Time compass */}
          <div className="flex items-center gap-4 mb-4 p-3 bg-gray-900/60 rounded-lg border border-gray-800">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-300">{currentDay}</div>
              <div className="text-xs text-gray-500">DAY</div>
            </div>
            <div className="w-px h-10 bg-gray-700" />
            <div className="text-center">
              <div className={`text-2xl font-bold ${executionCountdown <= 3 ? 'text-red-400 animate-pulse' : 'text-amber-300'}`}>
                {executionCountdown}
              </div>
              <div className="text-xs text-gray-500">EXEC</div>
            </div>
            <div className="flex-1" />
            <button
              onClick={handleNextDay}
              className="px-6 py-2 bg-amber-900/40 border border-amber-600/40 rounded-lg
                         text-amber-200 hover:bg-amber-800/50 transition-all font-bold"
            >
              Next Day
            </button>
          </div>
        </div>

        {/* Scene nodes */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {availableScenes.map(id => {
            const scene = game?.sceneManager.getScene(id);
            if (!scene) return null;
            return (
              <button
                key={id}
                onClick={() => handleSceneClick(id)}
                className="p-3 bg-gray-900/60 border border-amber-800/30 rounded-lg text-left
                           hover:bg-amber-900/20 hover:border-amber-600/40 transition-all"
              >
                <div className="text-sm font-bold text-amber-200">{scene.name}</div>
                <div className="text-xs text-gray-400">{scene.description}</div>
                <div className="text-xs text-amber-600 mt-1">
                  {scene.type} | {game?.sceneManager.getSceneState(id)?.remaining_turns} turns
                </div>
              </button>
            );
          })}

          {participatedScenes.map(id => {
            const scene = game?.sceneManager.getScene(id);
            const state = game?.sceneManager.getSceneState(id);
            if (!scene || !state) return null;
            return (
              <div
                key={id}
                className="p-3 bg-green-950/30 border border-green-800/30 rounded-lg"
              >
                <div className="text-sm font-bold text-green-300">{scene.name}</div>
                <div className="text-xs text-gray-400">Participated - {state.remaining_turns} turns left</div>
              </div>
            );
          })}

          {availableScenes.length === 0 && participatedScenes.length === 0 && (
            <div className="col-span-2 text-center text-gray-600 py-8">
              No active scenes. Click "Next Day" to advance.
            </div>
          )}
        </div>
      </div>

      {/* Right: Hand cards */}
      <div className="w-72 bg-gray-900/40 border-l border-gray-800 p-4 overflow-auto">
        <h3 className="text-sm font-bold text-amber-400 mb-3">Hand ({allCards.length})</h3>
        <div className="flex flex-col gap-2">
          {allCards.map(card => (
            <CardComponent
              key={card.card_id}
              card={card}
              compact
              onClick={(e) => {
                setDetailCard(card);
                setDetailPos({ x: e.clientX, y: e.clientY });
              }}
            />
          ))}
        </div>
      </div>

      {detailCard && (
        <CardDetailPanel card={detailCard} position={detailPos} onClose={handleCloseDetail} />
      )}
    </div>
  );
}
