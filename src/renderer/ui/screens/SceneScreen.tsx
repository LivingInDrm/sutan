import React, { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useUIStore } from '../../stores/uiStore';
import { CardComponent } from '../components/card/CardComponent';
import { SlotComponent } from '../components/card/SlotComponent';
import type { Card } from '../../core/types';

export function SceneScreen() {
  const game = useGameStore(s => s.game);
  const syncState = useGameStore(s => s.syncState);
  const handCardIds = useGameStore(s => s.handCardIds);
  const selectedSceneId = useUIStore(s => s.selectedSceneId);
  const setScreen = useUIStore(s => s.setScreen);

  const [selectedCards, setSelectedCards] = useState<Record<number, string>>({});

  const scene = selectedSceneId ? game?.sceneManager.getScene(selectedSceneId) : null;
  const sceneState = selectedSceneId ? game?.sceneManager.getSceneState(selectedSceneId) : null;

  const allCards: Card[] = game
    ? handCardIds.map(id => game.cardManager.getCard(id)?.data).filter(Boolean) as Card[]
    : [];

  const handleCardSelect = (slotIndex: number, cardId: string) => {
    setSelectedCards(prev => ({ ...prev, [slotIndex]: cardId }));
  };

  const handleConfirm = () => {
    if (!game || !selectedSceneId || !scene) return;
    const investedIds = Object.values(selectedCards);
    if (investedIds.length === 0) return;
    game.sceneManager.participateScene(selectedSceneId, investedIds);
    syncState();
    setScreen('map');
  };

  if (!scene) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500">No scene selected</div>
        <button onClick={() => setScreen('map')} className="ml-4 text-amber-400">Back to Map</button>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Left: Scene info + slots */}
      <div className="w-1/2 p-6 overflow-auto border-r border-gray-800">
        <button
          onClick={() => setScreen('map')}
          className="text-sm text-gray-400 hover:text-amber-300 mb-4"
        >
          &larr; Back to Map
        </button>
        <h2 className="text-xl font-bold text-amber-400 mb-2">{scene.name}</h2>
        <p className="text-sm text-gray-400 mb-4">{scene.description}</p>
        <div className="text-xs text-amber-600 mb-4">
          Type: {scene.type} | Duration: {scene.duration} turns
        </div>

        <h3 className="text-sm font-bold text-amber-300 mb-2">Card Slots</h3>
        <div className="flex flex-wrap gap-3 mb-6">
          {scene.slots.map((slot, idx) => (
            <SlotComponent
              key={idx}
              slot={slot}
              cardName={selectedCards[idx] ? game?.cardManager.getCard(selectedCards[idx])?.name : undefined}
              index={idx}
            />
          ))}
        </div>

        <button
          onClick={handleConfirm}
          disabled={Object.keys(selectedCards).length === 0}
          className="px-6 py-2 bg-amber-700/60 border border-amber-500/40 rounded-lg
                     text-amber-100 hover:bg-amber-600/60 transition-all font-bold
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Confirm Participation
        </button>
      </div>

      {/* Right: Available cards */}
      <div className="w-1/2 p-6 overflow-auto">
        <h3 className="text-sm font-bold text-amber-400 mb-3">Available Cards</h3>
        <div className="flex flex-wrap gap-2">
          {allCards.map(card => {
            const isUsed = Object.values(selectedCards).includes(card.card_id);
            return (
              <div
                key={card.card_id}
                onClick={() => {
                  if (!isUsed) {
                    const emptySlot = scene.slots.findIndex((_, i) => !selectedCards[i]);
                    if (emptySlot >= 0) {
                      handleCardSelect(emptySlot, card.card_id);
                    }
                  }
                }}
              >
                <CardComponent card={card} compact selected={isUsed} locked={isUsed} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
