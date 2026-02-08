import React, { useState, useCallback } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useUIStore } from '../../stores/uiStore';
import { CardComponent } from '../components/card/CardComponent';
import { CardDetailPanel } from '../components/card/CardDetailPanel';
import { SlotComponent } from '../components/card/SlotComponent';
import { BookLayout } from '../layouts/BookLayout';
import { Button } from '../components/common/Button';
import { DividerLine } from '../components/common/svg';
import type { Card, Slot } from '../../core/types';
import { SlotType, CardType } from '../../core/types/enums';

const SCENE_TYPE_LABELS: Record<string, string> = {
  event: '事件',
  shop: '商铺',
  challenge: '挑战',
};

function isCardValidForSlot(card: Card, slot: Slot): boolean {
  switch (slot.type) {
    case SlotType.Character:
      return card.type === CardType.Character;
    case SlotType.Item:
      return card.type === CardType.Equipment || card.type === CardType.Intel ||
             card.type === CardType.Consumable || card.type === CardType.Book ||
             card.type === CardType.Gem;
    case SlotType.Sultan:
      return card.type === CardType.Sultan;
    default:
      return false;
  }
}

export function SceneScreen() {
  const game = useGameStore(s => s.game);
  const syncState = useGameStore(s => s.syncState);
  const handCardIds = useGameStore(s => s.handCardIds);
  const selectedSceneId = useUIStore(s => s.selectedSceneId);
  const setScreen = useUIStore(s => s.setScreen);

  const [selectedCards, setSelectedCards] = useState<Record<number, string>>({});
  const [detailCard, setDetailCard] = useState<Card | null>(null);
  const [detailPos, setDetailPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const scene = selectedSceneId ? game?.sceneManager.getScene(selectedSceneId) : null;

  const lockedCardIds = game ? game.sceneManager.getLockedCardIds() : new Set<string>();

  const allCards: Card[] = game
    ? handCardIds.map(id => game.cardManager.getCard(id)?.data).filter(Boolean) as Card[]
    : [];

  const handleCardSelect = (slotIndex: number, cardId: string) => {
    setSelectedCards(prev => ({ ...prev, [slotIndex]: cardId }));
  };

  const handleCloseDetail = useCallback(() => {
    setDetailCard(null);
  }, []);

  const handleConfirm = () => {
    if (!game || !selectedSceneId || !scene) return;
    const requiredFilled = scene.slots.every(
      (slot, idx) => !slot.required || selectedCards[idx]
    );
    if (!requiredFilled) return;
    const investedIds = Object.values(selectedCards);
    if (investedIds.length === 0) return;
    game.sceneManager.participateScene(selectedSceneId, investedIds);
    syncState();
    setScreen('map');
  };

  const requiredSlotsFilled = scene
    ? scene.slots.every((slot, idx) => !slot.required || selectedCards[idx])
    : false;

  if (!scene) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gold-dim">未选择场景</div>
        <button onClick={() => setScreen('map')} className="ml-4 text-gold hover:text-gold-bright">
          返回地图
        </button>
      </div>
    );
  }

  const leftContent = (
    <>
      <button
        onClick={() => setScreen('map')}
        className="text-xs text-gold-dim/60 hover:text-gold transition-colors mb-3"
      >
        &larr; 返回地图
      </button>

      <div className="text-xs text-gold-dim/70 mb-1 tracking-wider">场景信息</div>
      <div className="text-base font-bold text-gold mb-2 font-[family-name:var(--font-display)]">
        {scene.name}
      </div>
      <p className="text-xs text-gold-dim/60 mb-3 leading-relaxed">{scene.description}</p>
      <div className="text-xs text-gold-dim/50 mb-4">
        {SCENE_TYPE_LABELS[scene.type] || scene.type} | {scene.duration} 回合
      </div>

      <DividerLine className="w-full h-1 text-gold-dim/30 pointer-events-none mb-4" preserveAspectRatio="none" />

      <div className="text-xs text-gold-dim/60 mb-2">卡牌槽位</div>
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

      <div className="flex-1" />

      <Button
        variant="primary"
        size="lg"
        glow
        onClick={handleConfirm}
        disabled={!requiredSlotsFilled}
        className="w-full"
      >
        确认参与
      </Button>
    </>
  );

  const rightContent = (
    <div className="p-6">
      <div className="text-xs text-leather/50 mb-3">可用手牌 ({allCards.length})</div>
      <div className="flex flex-wrap gap-2">
        {allCards.map(card => {
          const isUsed = Object.values(selectedCards).includes(card.card_id);
          const isLocked = lockedCardIds.has(card.card_id);
          return (
            <CardComponent
              key={card.card_id}
              card={card}
              compact
              selected={isUsed}
              locked={isUsed || isLocked}
              onClick={(e) => {
                setDetailCard(card);
                setDetailPos({ x: e.clientX, y: e.clientY });
              }}
              onDoubleClick={() => {
                if (!isUsed && !isLocked) {
                  const emptySlot = scene.slots.findIndex(
                    (slot, i) => !selectedCards[i] && !slot.locked && isCardValidForSlot(card, slot)
                  );
                  if (emptySlot >= 0) {
                    handleCardSelect(emptySlot, card.card_id);
                  }
                }
              }}
            />
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <BookLayout
        leftContent={leftContent}
        rightContent={rightContent}
        rightTitle={scene.name}
      />
      {detailCard && (
        <CardDetailPanel card={detailCard} position={detailPos} onClose={handleCloseDetail} />
      )}
    </>
  );
}
