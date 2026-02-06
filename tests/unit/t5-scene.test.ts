import { describe, it, expect } from 'vitest';
import { SlotSystem } from '@core/scene/SlotSystem';
import { SceneManager } from '@core/scene/SceneManager';
import { CardManager } from '@core/card/CardManager';
import { PlayerState } from '@core/player/PlayerState';
import { CardType, SlotType, SceneStatus, SceneType } from '@core/types/enums';
import type { Card, Scene, Slot } from '@core/types';

const makeChar = (id: string, tags: string[] = []): Card => ({
  card_id: id, name: `Char ${id}`, type: CardType.Character,
  rarity: 'silver' as any, description: '', image: '',
  attributes: { physique: 5, charm: 5, wisdom: 5, combat: 5, social: 5, survival: 5, stealth: 5, magic: 5 },
  tags, equipment_slots: 3,
});

const makeEquip = (id: string): Card => ({
  card_id: id, name: `Equip ${id}`, type: CardType.Equipment,
  rarity: 'copper' as any, description: '', image: '',
  equipment_type: 'weapon' as any, attribute_bonus: { combat: 3 },
});

const makeScene = (id: string, overrides: Partial<Scene> = {}): Scene => ({
  scene_id: id,
  name: `Scene ${id}`,
  description: 'test',
  background_image: 'bg.png',
  type: SceneType.Event,
  duration: 3,
  slots: [{ type: SlotType.Character, required: true, locked: false }],
  settlement: {
    type: 'dice_check',
    check: { attribute: 'combat' as any, calc_mode: 'max' as any, target: 5 },
    results: {
      success: { narrative: 'ok', effects: { gold: 10 } },
      partial_success: { narrative: 'ok', effects: {} },
      failure: { narrative: 'fail', effects: {} },
      critical_failure: { narrative: 'bad', effects: {} },
    },
  },
  ...overrides,
} as Scene);

describe('T5.1: SlotSystem', () => {
  it('should initialize and place cards in valid slots', () => {
    const mgr = new CardManager();
    mgr.addCard(makeChar('c1'));
    const slotSys = new SlotSystem(mgr);
    slotSys.initializeSlots([
      { type: SlotType.Character, required: true, locked: false },
      { type: SlotType.Item, required: false, locked: false },
    ]);
    expect(slotSys.placeCard(0, 'c1')).toBe(true);
    expect(slotSys.getInvestedCardIds()).toContain('c1');
  });

  it('should reject wrong card type for slot', () => {
    const mgr = new CardManager();
    mgr.addCard(makeEquip('e1'));
    const slotSys = new SlotSystem(mgr);
    slotSys.initializeSlots([{ type: SlotType.Character, required: true, locked: false }]);
    expect(slotSys.placeCard(0, 'e1')).toBe(false);
  });

  it('should check required slots', () => {
    const mgr = new CardManager();
    mgr.addCard(makeChar('c1'));
    const slotSys = new SlotSystem(mgr);
    slotSys.initializeSlots([
      { type: SlotType.Character, required: true, locked: false },
      { type: SlotType.Item, required: false, locked: false },
    ]);
    expect(slotSys.areRequiredSlotsFilled()).toBe(false);
    slotSys.placeCard(0, 'c1');
    expect(slotSys.areRequiredSlotsFilled()).toBe(true);
  });

  it('should not place cards in locked slots', () => {
    const mgr = new CardManager();
    mgr.addCard(makeChar('c1'));
    const slotSys = new SlotSystem(mgr);
    slotSys.initializeSlots([{ type: SlotType.Character, required: true, locked: true }]);
    expect(slotSys.placeCard(0, 'c1')).toBe(false);
  });

  it('should lock and unlock all cards', () => {
    const mgr = new CardManager();
    mgr.addCard(makeChar('c1'));
    const slotSys = new SlotSystem(mgr);
    slotSys.initializeSlots([{ type: SlotType.Character, required: true, locked: false }]);
    slotSys.placeCard(0, 'c1');
    slotSys.lockAllCards();
    expect(slotSys.getSlotState(0)!.locked).toBe(true);
    expect(slotSys.removeCard(0)).toBeNull();
    slotSys.unlockAllCards();
    expect(slotSys.removeCard(0)).toBe('c1');
  });
});

describe('T5.2: SceneManager', () => {
  it('should activate available scenes', () => {
    const player = new PlayerState(30, 50);
    const cardMgr = new CardManager();
    const sceneMgr = new SceneManager(player, cardMgr);
    sceneMgr.registerScene(makeScene('s1'));
    expect(sceneMgr.activateScene('s1')).toBe(true);
    expect(sceneMgr.getAvailableScenes()).toContain('s1');
  });

  it('should lock scenes with unmet conditions', () => {
    const player = new PlayerState(30, 10);
    const cardMgr = new CardManager();
    const sceneMgr = new SceneManager(player, cardMgr);
    sceneMgr.registerScene(makeScene('s1', { unlock_conditions: { reputation_min: 40 } }));
    expect(sceneMgr.activateScene('s1')).toBe(false);
    expect(sceneMgr.getSceneState('s1')!.status).toBe(SceneStatus.Locked);
  });

  it('should check tag unlock conditions', () => {
    const player = new PlayerState(30, 50);
    const cardMgr = new CardManager();
    cardMgr.addCard(makeChar('c1', ['noble']));
    const sceneMgr = new SceneManager(player, cardMgr);
    sceneMgr.registerScene(makeScene('s1', { unlock_conditions: { required_tags: ['noble'] } }));
    expect(sceneMgr.activateScene('s1')).toBe(true);
  });

  it('should handle scene status flow: available -> participated -> settling -> completed', () => {
    const player = new PlayerState();
    const cardMgr = new CardManager();
    const sceneMgr = new SceneManager(player, cardMgr);
    sceneMgr.registerScene(makeScene('s1', { duration: 2 }));
    sceneMgr.activateScene('s1');
    expect(sceneMgr.getSceneState('s1')!.status).toBe(SceneStatus.Available);

    sceneMgr.participateScene('s1', ['c1']);
    expect(sceneMgr.getSceneState('s1')!.status).toBe(SceneStatus.Participated);

    sceneMgr.decrementRemainingTurns();
    expect(sceneMgr.getSceneState('s1')!.remaining_turns).toBe(1);

    const settled = sceneMgr.decrementRemainingTurns();
    expect(settled).toContain('s1');
    expect(sceneMgr.getSceneState('s1')!.status).toBe(SceneStatus.Settling);

    sceneMgr.completeScene('s1');
    expect(sceneMgr.getSceneState('s1')!.status).toBe(SceneStatus.Completed);
  });
});

describe('T5.3: Scene Participation', () => {
  it('should lock invested cards', () => {
    const player = new PlayerState();
    const cardMgr = new CardManager();
    cardMgr.addCard(makeChar('c1'));
    const sceneMgr = new SceneManager(player, cardMgr);
    sceneMgr.registerScene(makeScene('s1'));
    sceneMgr.activateScene('s1');
    sceneMgr.participateScene('s1', ['c1']);
    
    const state = sceneMgr.getSceneState('s1')!;
    expect(state.invested_cards).toContain('c1');
    expect(state.status).toBe(SceneStatus.Participated);
  });

  it('should not participate in non-available scene', () => {
    const player = new PlayerState();
    const cardMgr = new CardManager();
    const sceneMgr = new SceneManager(player, cardMgr);
    sceneMgr.registerScene(makeScene('s1', { unlock_conditions: { reputation_min: 100 } }));
    sceneMgr.activateScene('s1');
    expect(sceneMgr.participateScene('s1', ['c1'])).toBe(false);
  });
});
