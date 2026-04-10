import React from 'react';
import { ResourceBar } from '../components/common/ResourceBar';
import { HandArea } from '../components/hand/HandArea';
import { useGameStore } from '../../stores/gameStore';
import { useUIStore } from '../../stores/uiStore';
import type { Card } from '../../core/types';

export function GameLayout({ children }: { children: React.ReactNode }) {
  const game = useGameStore(s => s.game);
  const handCardIds = useGameStore(s => s.handCardIds());
  const currentScreen = useUIStore(s => s.currentScreen);

  const allCards: Card[] = game
    ? handCardIds.map(id => game.cardManager.getCard(id)?.data).filter(Boolean) as Card[]
    : [];

  const lockedCardIds = game ? Array.from(game.sceneManager.getLockedCardIds()) : [];
  const shouldRenderHandArea = currentScreen !== 'scene';

  return (
    <div className="h-screen w-screen flex flex-col bg-leather-900">
      <ResourceBar />
      <main className="flex-1 overflow-hidden relative flex flex-col min-h-0">
        <div className="flex-1 min-h-0 overflow-hidden relative">
          {children}
        </div>
        {shouldRenderHandArea && (
          <HandArea cards={allCards} lockedCardIds={lockedCardIds} />
        )}
      </main>
    </div>
  );
}
