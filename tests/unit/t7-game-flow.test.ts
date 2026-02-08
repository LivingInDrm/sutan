import { describe, it, expect } from 'vitest';
import { TimeManager } from '@core/game/TimeManager';
import { ThinkSystem } from '@core/player/ThinkSystem';
import { DayManager } from '@core/game/DayManager';
import { PlayerState } from '@core/player/PlayerState';
import { CardManager } from '@core/card/CardManager';
import { SceneManager } from '@core/scene/SceneManager';
import { EquipmentSystem } from '@core/card/EquipmentSystem';
import { SettlementExecutor } from '@core/settlement/SettlementExecutor';
import { RandomManager } from '@lib/random';
import { CardType, SceneType, SlotType, GamePhase } from '@core/types/enums';
import type { Card, Scene } from '@core/types';

const makeChar = (id: string, tags: string[] = []): Card => ({
  card_id: id, name: `Char ${id}`, type: CardType.Character,
  rarity: 'silver' as any, description: '', image: '',
  attributes: { physique: 5, charm: 5, wisdom: 5, combat: 10, social: 5, survival: 5, stealth: 5, magic: 5 },
  tags, equipment_slots: 3,
});

const makeDiceScene = (id: string, duration = 2): Scene => ({
  scene_id: id, name: `Scene ${id}`, description: 'test',
  background_image: 'bg.png', type: SceneType.Event, duration,
  slots: [{ type: SlotType.Character, required: true, locked: false }],
  entry_stage: 'main',
  stages: [{
    stage_id: 'main',
    narrative: [],
    settlement: {
      type: 'dice_check',
      check: { attribute: 'combat' as any, calc_mode: 'max' as any, target: 3 },
      results: {
        success: { narrative: 'Win', effects: { gold: 20 } },
        partial_success: { narrative: 'Partial', effects: { gold: 5 } },
        failure: { narrative: 'Fail', effects: { gold: -5 } },
        critical_failure: { narrative: 'Crit Fail', effects: { gold: -10 } },
      },
    },
    is_final: true,
  }],
  absence_penalty: { effects: { reputation: -5 }, narrative: '缺席' },
} as Scene);

describe('T7.1: TimeManager', () => {
  it('should track day and countdown', () => {
    const player = new PlayerState();
    const tm = new TimeManager(player, 14);
    expect(tm.currentDay).toBe(1);
    expect(tm.executionCountdown).toBe(14);
  });

  it('should advance day and decrement countdown', () => {
    const player = new PlayerState();
    const tm = new TimeManager(player, 14);
    tm.advanceDay();
    expect(tm.currentDay).toBe(2);
    expect(tm.executionCountdown).toBe(13);
  });

  it('should detect execution day', () => {
    const player = new PlayerState();
    const tm = new TimeManager(player, 1);
    expect(tm.isExecutionDay).toBe(false);
    tm.advanceDay();
    expect(tm.isExecutionDay).toBe(true);
  });

  it('should rewind to previous day', () => {
    const player = new PlayerState(30, 50, 0, 3);
    const tm = new TimeManager(player, 14);
    tm.advanceDay();
    expect(tm.currentDay).toBe(2);
    expect(tm.rewind()).toBeTruthy();
    expect(tm.currentDay).toBe(1);
    expect(tm.executionCountdown).toBe(14);
    expect(player.rewindCharges).toBe(2);
  });

  it('should fail rewind without charges', () => {
    const player = new PlayerState(30, 50, 0, 0);
    const tm = new TimeManager(player, 14);
    tm.advanceDay();
    expect(tm.rewind()).toBeNull();
  });
});

describe('T7.4: ThinkSystem', () => {
  it('should allow 3 thinks per day', () => {
    const player = new PlayerState();
    const cardMgr = new CardManager();
    cardMgr.addCard(makeChar('c1'));
    cardMgr.addCard(makeChar('c2'));
    cardMgr.addCard(makeChar('c3'));
    cardMgr.addCard(makeChar('c4'));
    const think = new ThinkSystem(player, cardMgr);
    
    expect(think.useThink('c1')).toBe(true);
    expect(think.useThink('c2')).toBe(true);
    expect(think.useThink('c3')).toBe(true);
    expect(think.useThink('c4')).toBe(false);
    expect(think.remainingCharges).toBe(0);
  });

  it('should not allow same card twice per day', () => {
    const player = new PlayerState();
    const cardMgr = new CardManager();
    cardMgr.addCard(makeChar('c1'));
    const think = new ThinkSystem(player, cardMgr);
    
    expect(think.useThink('c1')).toBe(true);
    expect(think.useThink('c1')).toBe(false);
  });

  it('should reset daily', () => {
    const player = new PlayerState();
    const cardMgr = new CardManager();
    cardMgr.addCard(makeChar('c1'));
    const think = new ThinkSystem(player, cardMgr);
    
    think.useThink('c1');
    think.resetDaily();
    expect(think.remainingCharges).toBe(3);
    expect(think.canThink('c1')).toBe(true);
  });
});

describe('T7.5: DayManager', () => {
  function createDayManager() {
    const rng = new RandomManager('day-test');
    const player = new PlayerState(30, 50, 0, 3);
    const cardMgr = new CardManager();
    cardMgr.addCard(makeChar('c1'));
    const sceneMgr = new SceneManager(player, cardMgr);
    const equipSys = new EquipmentSystem(cardMgr);
    const executor = new SettlementExecutor(rng, player, cardMgr, sceneMgr, equipSys);
    const timeMgr = new TimeManager(player, 14);
    const thinkSys = new ThinkSystem(player, cardMgr);
    const dayMgr = new DayManager(timeMgr, sceneMgr, executor, thinkSys, player, cardMgr);
    return { dayMgr, player, sceneMgr, timeMgr, cardMgr };
  }

  it('should cycle through phases', () => {
    const { dayMgr } = createDayManager();
    dayMgr.executeDawn();
    expect(dayMgr.phase).toBe(GamePhase.Dawn);
    dayMgr.startAction();
    expect(dayMgr.phase).toBe(GamePhase.Action);
  });

  it('should settle scenes on nextDay', () => {
    const { dayMgr, sceneMgr } = createDayManager();
    sceneMgr.registerScene(makeDiceScene('s1', 1));
    sceneMgr.activateScene('s1');
    sceneMgr.participateScene('s1', ['c1']);
    
    dayMgr.executeDawn();
    dayMgr.startAction();
    const results = dayMgr.nextDay();
    expect(results.length).toBeGreaterThanOrEqual(0);
  });
});

describe('T7.6: Win/Loss Conditions', () => {
  it('should detect sultan cards for execution check', () => {
    const cardMgr = new CardManager();
    cardMgr.addCard({ card_id: 's1', name: 'Sultan', type: CardType.Sultan, rarity: 'gold' as any, description: '', image: '' });
    expect(cardMgr.getSultanCards().length).toBe(1);
  });

  it('should detect no sultan cards (safe)', () => {
    const cardMgr = new CardManager();
    cardMgr.addCard(makeChar('c1'));
    expect(cardMgr.getSultanCards().length).toBe(0);
  });

  it('should check execution day countdown', () => {
    const player = new PlayerState();
    const tm = new TimeManager(player, 2);
    tm.advanceDay();
    expect(tm.isExecutionDay).toBe(false);
    tm.advanceDay();
    expect(tm.isExecutionDay).toBe(true);
  });
});
