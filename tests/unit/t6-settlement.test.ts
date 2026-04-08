import { describe, it, expect } from 'vitest';
import { EffectApplier } from '@core/settlement/EffectApplier';
import { SettlementExecutor } from '@core/settlement/SettlementExecutor';
import { PlayerState } from '@core/player/PlayerState';
import { CardManager } from '@core/card/CardManager';
import { SceneManager } from '@core/scene/SceneManager';
import { EquipmentSystem } from '@core/card/EquipmentSystem';
import { RandomManager } from '@lib/random';
import { CardType, SceneType, SlotType, CheckResult } from '@core/types/enums';
import type { Card, Scene } from '@core/types';

const makeChar = (id: string, combat = 8, tags: string[] = []): Card => ({
  card_id: id, name: `Char ${id}`, type: CardType.Character,
  rarity: 'silver' as any, description: '', image: '',
  attributes: { physique: 5, charm: 5, wisdom: 5, combat, social: 5, survival: 5, stealth: 5, magic: 5 },
  tags, equipment_slots: 3,
});

const makeDiceScene = (id: string, target = 3): Scene => ({
  scene_id: id, name: `Scene ${id}`, description: 'test',
  background_image: 'bg.png', type: SceneType.Event, duration: 1,
  slots: [{ type: SlotType.Character, required: true, locked: false }],
  entry_stage: 'main',
  stages: [{
    stage_id: 'main',
    narrative: [],
    settlement: {
      type: 'dice_check',
      check: { attribute: 'combat' as any, calc_mode: 'max' as any, target },
      results: {
        success: { narrative: 'Win!', effects: { gold: 20, reputation: 5 } },
        partial_success: { narrative: 'Partial', effects: { gold: 10 } },
        failure: { narrative: 'Fail', effects: { gold: -10, reputation: -3 } },
        critical_failure: { narrative: 'Crit fail', effects: { reputation: -8 } },
      },
    },
    is_final: true,
  }],
  absence_penalty: { effects: { reputation: -5 }, narrative: '缺席' },
} as Scene);

const makeChoiceScene = (id: string): Scene => ({
  scene_id: id, name: `Choice ${id}`, description: 'test',
  background_image: 'bg.png', type: SceneType.Event, duration: 1,
  slots: [{ type: SlotType.Character, required: true, locked: false }],
  entry_stage: 'main',
  stages: [{
    stage_id: 'main',
    narrative: [],
    settlement: {
      type: 'choice',
      options: [
        { label: '战斗', effects: { reputation: 5, gold: -10 } },
        { label: '和平', effects: { reputation: -5, gold: 20 } },
      ],
    },
    is_final: true,
  }],
} as Scene);

const makePlayerChoiceScene = (id: string): Scene => ({
  scene_id: id, name: `Player Choice ${id}`, description: 'test',
  background_image: 'bg.png', type: SceneType.Event, duration: 1,
  slots: [{ type: SlotType.Character, required: true, locked: false }],
  entry_stage: 'opening',
  stages: [{
    stage_id: 'opening',
    narrative: [],
    settlement: {
      type: 'player_choice',
      narrative: '要怎么做？',
      choices: [
        { id: 'rescue', label: '救场', description: '花钱救场', effects: { gold: -10 }, next_stage: 'rescue' },
        { id: 'leave', label: '离开', effects: { reputation: -2 } },
      ],
    },
  }, {
    stage_id: 'rescue',
    narrative: [],
    is_final: true,
  }],
} as Scene);

const makeTradeScene = (id: string): Scene => ({
  scene_id: id, name: `Shop ${id}`, description: 'test',
  background_image: 'bg.png', type: SceneType.Shop, duration: 1,
  slots: [],
  entry_stage: 'main',
  stages: [{
    stage_id: 'main',
    narrative: [],
    settlement: {
      type: 'trade',
      shop_inventory: ['card_101'],
      allow_sell: true,
    },
    is_final: true,
  }],
} as Scene);

describe('T6.1: EffectApplier', () => {
  it('should apply gold and reputation changes', () => {
    const player = new PlayerState(30, 50);
    const cardMgr = new CardManager();
    const applier = new EffectApplier(player, cardMgr);
    applier.apply({ gold: 20, reputation: -5 });
    expect(player.gold).toBe(50);
    expect(player.reputation).toBe(45);
  });

  it('should resolve card_invested_N references', () => {
    const player = new PlayerState();
    const cardMgr = new CardManager();
    cardMgr.addCard(makeChar('c1'));
    cardMgr.addCard(makeChar('c2'));
    const applier = new EffectApplier(player, cardMgr);
    applier.apply({ cards_remove: ['card_invested_0'] }, ['c1', 'c2']);
    expect(cardMgr.hasCard('c1')).toBe(false);
    expect(cardMgr.hasCard('c2')).toBe(true);
  });

  it('should add and remove tags', () => {
    const player = new PlayerState();
    const cardMgr = new CardManager();
    cardMgr.addCard(makeChar('c1', 5, ['noble']));
    const applier = new EffectApplier(player, cardMgr);
    applier.apply({
      tags_add: { c1: ['warrior'] },
      tags_remove: { c1: ['noble'] },
    });
    const card = cardMgr.getCard('c1')!;
    expect(card.hasTag('warrior')).toBe(true);
    expect(card.hasTag('noble')).toBe(false);
  });

  it('should consume all invested cards', () => {
    const player = new PlayerState();
    const cardMgr = new CardManager();
    cardMgr.addCard(makeChar('c1'));
    cardMgr.addCard(makeChar('c2'));
    const applier = new EffectApplier(player, cardMgr);
    applier.apply({ consume_invested: true }, ['c1', 'c2']);
    expect(cardMgr.hasCard('c1')).toBe(false);
    expect(cardMgr.hasCard('c2')).toBe(false);
  });
});

describe('T6.2: Dice Check Settlement', () => {
  it('should execute full dice check settlement', () => {
    const rng = new RandomManager('settle-dice');
    const player = new PlayerState(30, 50, 2);
    const cardMgr = new CardManager();
    cardMgr.addCard(makeChar('c1', 10));
    const sceneMgr = new SceneManager(player, cardMgr);
    const equipSys = new EquipmentSystem(cardMgr);
    const executor = new SettlementExecutor(rng, player, cardMgr, sceneMgr, equipSys);

    sceneMgr.registerScene(makeDiceScene('s1', 3));
    sceneMgr.activateScene('s1');
    sceneMgr.participateScene('s1', ['c1']);

    const result = executor.settleScene('s1');
    expect(result).not.toBeNull();
    expect(result!.settlement_type).toBe('dice_check');
    expect(result!.dice_check_state).toBeDefined();
    expect([CheckResult.Success, CheckResult.PartialSuccess, CheckResult.Failure, CheckResult.CriticalFailure])
      .toContain(result!.result_key);
  });
});

describe('T6.3: Trade Settlement', () => {
  it('should settle trade scene', () => {
    const rng = new RandomManager('settle-trade');
    const player = new PlayerState();
    const cardMgr = new CardManager();
    const sceneMgr = new SceneManager(player, cardMgr);
    const equipSys = new EquipmentSystem(cardMgr);
    const executor = new SettlementExecutor(rng, player, cardMgr, sceneMgr, equipSys);

    sceneMgr.registerScene(makeTradeScene('shop1'));
    sceneMgr.activateScene('shop1');
    sceneMgr.participateScene('shop1', []);

    const result = executor.settleScene('shop1');
    expect(result).not.toBeNull();
    expect(result!.settlement_type).toBe('trade');
  });
});

describe('T6.4: Choice Settlement', () => {
  it('should apply effects of chosen option', () => {
    const rng = new RandomManager('settle-choice');
    const player = new PlayerState(30, 50);
    const cardMgr = new CardManager();
    cardMgr.addCard(makeChar('c1'));
    const sceneMgr = new SceneManager(player, cardMgr);
    const equipSys = new EquipmentSystem(cardMgr);
    const executor = new SettlementExecutor(rng, player, cardMgr, sceneMgr, equipSys);

    sceneMgr.registerScene(makeChoiceScene('ch1'));
    sceneMgr.activateScene('ch1');
    sceneMgr.participateScene('ch1', ['c1']);

    const result = executor.settleScene('ch1', { choiceIndex: 1 });
    expect(result).not.toBeNull();
    expect(result!.settlement_type).toBe('choice');
    expect(player.gold).toBe(50);
    expect(player.reputation).toBe(45);
  });
});

describe('T6.4.1: Player Choice Settlement', () => {
  it('should apply selected effects and carry next stage', () => {
    const rng = new RandomManager('settle-player-choice');
    const player = new PlayerState(30, 50);
    const cardMgr = new CardManager();
    cardMgr.addCard(makeChar('c1'));
    const sceneMgr = new SceneManager(player, cardMgr);
    const equipSys = new EquipmentSystem(cardMgr);
    const executor = new SettlementExecutor(rng, player, cardMgr, sceneMgr, equipSys);

    sceneMgr.registerScene(makePlayerChoiceScene('pc1'));
    sceneMgr.activateScene('pc1');
    sceneMgr.participateScene('pc1', ['c1']);

    const result = executor.executeStageSettlement('pc1', 'opening', { choiceIndex: 0 });
    expect(result).not.toBeNull();
    expect(result!.type).toBe('player_choice');
    expect(result!.effects_applied.gold).toBe(-10);
    expect(result!.next_stage).toBe('rescue');
    expect(player.gold).toBe(20);
  });
});

describe('T6.5: SettlementExecutor dispatch', () => {
  it('should dispatch to correct settlement type', () => {
    const rng = new RandomManager('dispatch-test');
    const player = new PlayerState();
    const cardMgr = new CardManager();
    cardMgr.addCard(makeChar('c1', 10));
    const sceneMgr = new SceneManager(player, cardMgr);
    const equipSys = new EquipmentSystem(cardMgr);
    const executor = new SettlementExecutor(rng, player, cardMgr, sceneMgr, equipSys);

    sceneMgr.registerScene(makeDiceScene('d1'));
    sceneMgr.registerScene(makeChoiceScene('c1_scene'));
    sceneMgr.registerScene(makePlayerChoiceScene('pc1_scene'));
    sceneMgr.registerScene(makeTradeScene('t1'));

    sceneMgr.activateScene('d1');
    sceneMgr.participateScene('d1', ['c1']);
    const r1 = executor.settleScene('d1');
    expect(r1!.settlement_type).toBe('dice_check');

    sceneMgr.activateScene('c1_scene');
    sceneMgr.participateScene('c1_scene', ['c1']);
    const r2 = executor.settleScene('c1_scene', { choiceIndex: 0 });
    expect(r2!.settlement_type).toBe('choice');

    sceneMgr.activateScene('pc1_scene');
    sceneMgr.participateScene('pc1_scene', ['c1']);
    const rPlayer = executor.settleScene('pc1_scene', { choiceIndex: 0 });
    expect(rPlayer!.settlement_type).toBe('player_choice');

    sceneMgr.activateScene('t1');
    sceneMgr.participateScene('t1', []);
    const r3 = executor.settleScene('t1');
    expect(r3!.settlement_type).toBe('trade');
  });
});

describe('T6.6: Absence Penalty', () => {
  it('should apply absence penalty', () => {
    const rng = new RandomManager('absence-test');
    const player = new PlayerState(30, 50);
    const cardMgr = new CardManager();
    const sceneMgr = new SceneManager(player, cardMgr);
    const equipSys = new EquipmentSystem(cardMgr);
    const executor = new SettlementExecutor(rng, player, cardMgr, sceneMgr, equipSys);

    sceneMgr.registerScene(makeDiceScene('s1'));
    sceneMgr.activateScene('s1');

    const result = executor.applyAbsencePenalty('s1');
    expect(result).not.toBeNull();
    expect(player.reputation).toBe(45);
    expect(result!.narrative).toBe('缺席');
  });

  it('should return null if no absence penalty', () => {
    const rng = new RandomManager('no-absence');
    const player = new PlayerState();
    const cardMgr = new CardManager();
    const sceneMgr = new SceneManager(player, cardMgr);
    const equipSys = new EquipmentSystem(cardMgr);
    const executor = new SettlementExecutor(rng, player, cardMgr, sceneMgr, equipSys);

    const sceneNoAbsence = makeTradeScene('t1');
    sceneMgr.registerScene(sceneNoAbsence);
    sceneMgr.activateScene('t1');

    const result = executor.applyAbsencePenalty('t1');
    expect(result).toBeNull();
  });
});
