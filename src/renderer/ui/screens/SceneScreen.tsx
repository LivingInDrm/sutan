import React, { useState, useCallback } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useUIStore } from '../../stores/uiStore';
import { SlotComponent } from '../components/card/SlotComponent';
import { HandArea } from '../components/hand/HandArea';
import { Button } from '../components/common/Button';
import { DividerLine } from '../components/common/svg';
import type { Card, Slot } from '../../core/types';
import { SlotType, CardType } from '../../core/types/enums';
import bronzeTexture from '../../assets/textures/bronze-512.webp';
import ricePaperTexture from '../../assets/textures/rice-paper-1024.webp';

// Eagerly import all scene background images
const sceneImages = import.meta.glob<{ default: string }>(
  '../../assets/scenes/*.{png,jpg,webp}',
  { eager: true }
);

function getSceneImageUrl(filename: string): string | null {
  if (!filename) return null;
  // If it's an absolute path (starts with /), use it directly as a public URL
  if (filename.startsWith('/')) return filename;
  const key = Object.keys(sceneImages).find(k => k.endsWith('/' + filename));
  return key ? sceneImages[key].default : null;
}

const SCENE_TYPE_LABELS: Record<string, string> = {
  event: '事件',
  shop: '商铺',
  challenge: '挑战',
};

const SLOT_TYPE_LABELS: Record<string, string> = {
  character: '人物槽',
  item: '物品槽',
  sultan: '苏丹槽',
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
  const selectedLocationId = useUIStore(s => s.selectedLocationId);
  const setScreen = useUIStore(s => s.setScreen);

  const [selectedCards, setSelectedCards] = useState<Record<number, string>>({});

  const scene = selectedSceneId ? game?.sceneManager.getScene(selectedSceneId) : null;
  const lockedCardIds = game ? game.sceneManager.getLockedCardIds() : new Set<string>();

  const allCards: Card[] = game
    ? handCardIds.map(id => game.cardManager.getCard(id)?.data).filter(Boolean) as Card[]
    : [];

  // Cards already assigned to slots
  const assignedCardIds = Object.values(selectedCards);
  // Cards that should appear locked/dimmed in hand (assigned OR globally locked)
  const handLockedIds = [
    ...assignedCardIds,
    ...Array.from(lockedCardIds),
  ];

  const handleCardDoubleClick = useCallback((card: Card) => {
    if (!scene) return;
    if (assignedCardIds.includes(card.card_id) || lockedCardIds.has(card.card_id)) return;
    const emptySlot = scene.slots.findIndex(
      (slot, i) => !selectedCards[i] && !slot.locked && isCardValidForSlot(card, slot)
    );
    if (emptySlot >= 0) {
      setSelectedCards(prev => ({ ...prev, [emptySlot]: card.card_id }));
    }
  }, [scene, selectedCards, assignedCardIds, lockedCardIds]);

  const handleSlotClick = useCallback((idx: number) => {
    if (selectedCards[idx]) {
      setSelectedCards(prev => {
        const next = { ...prev };
        delete next[idx];
        return next;
      });
    }
  }, [selectedCards]);

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
    setScreen(selectedLocationId ? 'location' : 'map');
  };

  const requiredSlotsFilled = scene
    ? scene.slots.every((slot, idx) => !slot.required || selectedCards[idx])
    : false;

  if (!scene) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gold-dim">未选择场景</div>
        <button onClick={() => setScreen(selectedLocationId ? 'location' : 'map')} className="ml-4 text-gold hover:text-gold-bright">
          返回地图
        </button>
      </div>
    );
  }

  const bgImageUrl = getSceneImageUrl(scene.background_image);

  // Get entry stage for settlement info
  const entryStage = scene.stages.find(s => s.stage_id === scene.entry_stage);

  // Settlement info preview - fuzzy Chinese hint, no mechanics exposed
  const ATTRIBUTE_LABELS: Record<string, string> = {
    social: '社交',
    combat: '武力',
    wisdom: '智慧',
    charm: '魅力',
    stealth: '潜行',
    politics: '政治',
  };
  const settlement = entryStage?.settlement;
  const settlementPreview = settlement
    ? settlement.type === 'dice_check'
      ? (() => {
          const attr = (settlement as { check: { attribute: string; target: number } }).check.attribute;
          const label = ATTRIBUTE_LABELS[attr] ?? attr;
          return `关键属性：${label}`;
        })()
      : settlement.type === 'choice'
      ? '此场景需要做出抉择'
      : null
    : null;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── Main area: Left (background + slots) + Right (info panel) ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* ────────────── LEFT: Scene background + card slots ────────────── */}
        <div className="w-1/2 relative overflow-hidden shrink-0">
          {/* Background image */}
          {bgImageUrl ? (
            <img
              src={bgImageUrl}
              alt={scene.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${bronzeTexture})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          )}

          {/* Dark overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60 pointer-events-none" />
          <div className="absolute inset-0 bg-black/25 pointer-events-none" />

          {/* Back button */}
          <button
            onClick={() => setScreen(selectedLocationId ? 'location' : 'map')}
            className="absolute top-4 left-4 z-10 flex items-center gap-1.5
                       text-xs text-parchment/60 hover:text-parchment/90 transition-colors
                       bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded px-3 py-1.5"
          >
            <span>&#8592;</span>
            <span>返回地图</span>
          </button>

          {/* Instruction hint */}
          <div className="absolute top-4 right-4 z-10 text-[10px] text-parchment/40 text-right leading-relaxed">
            <div>双击手牌投入槽位</div>
            <div>点击槽位取消投入</div>
          </div>

          {/* Slots area - at bottom of background */}
          <div className="absolute bottom-0 inset-x-0 z-10 px-6 pb-5">
            {/* Slot label */}
            <div className="text-[10px] text-parchment/40 tracking-widest mb-3 text-center uppercase">
              卡牌槽位
            </div>
            <div className="flex items-end justify-center gap-4 flex-wrap">
              {scene.slots.map((slot, idx) => {
                const assignedCardId = selectedCards[idx];
                const assignedCard = assignedCardId
                  ? game?.cardManager.getCard(assignedCardId)
                  : null;
                return (
                  <SlotComponent
                    key={idx}
                    slot={slot}
                    card={assignedCard?.data}
                    index={idx}
                    onClick={() => handleSlotClick(idx)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* ────────────── RIGHT: Scene information panel ────────────── */}
        <div
          className="w-1/2 flex flex-col overflow-hidden relative"
          style={{
            backgroundImage: `url(${ricePaperTexture})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Paper overlay */}
          <div className="absolute inset-0 bg-leather/80 pointer-events-none" />

          <div className="relative z-10 flex flex-col h-full overflow-y-auto">
            {/* Header */}
            <div className="px-7 pt-7 pb-4 shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] text-gold-dim/60 tracking-widest uppercase">
                  {SCENE_TYPE_LABELS[scene.type] || scene.type}
                </span>
                <span className="text-gold-dim/30">·</span>
                <span className="text-[10px] text-gold-dim/50">{scene.duration} 回合</span>
              </div>

              <h2 className="text-2xl font-bold text-gold font-[family-name:var(--font-display)] tracking-wide mb-3">
                {scene.name}
              </h2>

              <DividerLine
                className="w-full h-1 text-gold-dim/25 pointer-events-none"
                preserveAspectRatio="none"
              />
            </div>

            {/* Description */}
            <div className="px-7 shrink-0">
              <p className="text-sm text-parchment/70 leading-relaxed">
                {scene.description}
              </p>
            </div>

            {/* Settlement preview */}
            {settlementPreview && (
              <div className="px-7 mt-5 shrink-0">
                <div className="text-[10px] text-gold-dim/50 tracking-wider mb-2">结算方式</div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-gold-dim/60" />
                  <span className="text-sm text-parchment/60">{settlementPreview}</span>
                </div>
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1 min-h-4" />

            {/* Assigned cards summary */}
            {assignedCardIds.length > 0 && (
              <div className="px-7 mb-4 shrink-0">
                <DividerLine
                  className="w-full h-1 text-gold-dim/20 pointer-events-none mb-4"
                  preserveAspectRatio="none"
                />
                <div className="text-[10px] text-gold-dim/50 tracking-wider mb-2">已投入</div>
                <div className="flex flex-col gap-1">
                  {scene.slots.map((slot, idx) => {
                    const cid = selectedCards[idx];
                    if (!cid) return null;
                    const c = game?.cardManager.getCard(cid);
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-parchment/40">{SLOT_TYPE_LABELS[slot.type] || slot.type}</span>
                        <span className="text-parchment/70">{c?.name ?? cid}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Confirm button */}
            <div className="px-7 pb-7 shrink-0">
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
              {!requiredSlotsFilled && (
                <p className="text-center text-[10px] text-crimson/60 mt-2">
                  请先填满所有必填槽位
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom: HandArea (reused from MapScreen) ── */}
      <HandArea
        cards={allCards}
        lockedCardIds={handLockedIds}
        onCardDoubleClick={(card) => handleCardDoubleClick(card)}
      />
    </div>
  );
}
