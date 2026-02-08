import type {
  Scene, Settlement, SettlementResult, DiceCheckState,
  DiceCheckSettlement, TradeSettlement, ChoiceSettlement,
  Stage, Effects,
} from '../types';
import { CheckResult, SpecialAttribute } from '../types/enums';
import { DiceChecker } from './DiceChecker';
import { EffectApplier, type CardDataResolver } from './EffectApplier';
import { calcCheckPool } from './calcCheckPool';
import { CardManager } from '../card/CardManager';
import { PlayerState } from '../player/PlayerState';
import { SceneManager } from '../scene/SceneManager';
import { EquipmentSystem } from '../card/EquipmentSystem';
import { RandomManager } from '../../lib/random';
import { CardInstance } from '../card/CardInstance';
import { SceneRunner } from '../scene/SceneRunner';
import { eventBus } from '../../lib/events';

export interface StageSettlementResult {
  type: Settlement['type'];
  result_key?: CheckResult;
  effects_applied: Effects;
  narrative: string;
  dice_check_state?: DiceCheckState;
}

export class SettlementExecutor {
  private diceChecker: DiceChecker;
  private effectApplier: EffectApplier;
  private cardManager: CardManager;
  private playerState: PlayerState;
  private sceneManager: SceneManager;
  private equipmentSystem: EquipmentSystem;

  constructor(
    rng: RandomManager,
    playerState: PlayerState,
    cardManager: CardManager,
    sceneManager: SceneManager,
    equipmentSystem: EquipmentSystem
  ) {
    this.diceChecker = new DiceChecker(rng);
    this.effectApplier = new EffectApplier(playerState, cardManager);
    this.cardManager = cardManager;
    this.playerState = playerState;
    this.sceneManager = sceneManager;
    this.equipmentSystem = equipmentSystem;
  }

  setCardDataResolver(resolver: CardDataResolver): void {
    this.effectApplier.setCardDataResolver(resolver);
  }

  executeStageSettlement(
    sceneId: string,
    stageId: string,
    options?: { rerollIndices?: number[]; goldenDiceUsed?: number; choiceIndex?: number }
  ): StageSettlementResult | null {
    const scene = this.sceneManager.getScene(sceneId);
    const sceneState = this.sceneManager.getSceneState(sceneId);
    if (!scene || !sceneState) return null;

    const stage = scene.stages.find(s => s.stage_id === stageId);
    if (!stage || !stage.settlement) return null;

    const investedCardIds = sceneState.invested_cards;
    const settlement = stage.settlement;

    switch (settlement.type) {
      case 'dice_check':
        return this.executeDiceCheck(scene, settlement, investedCardIds, options);
      case 'trade':
        return this.executeTrade(scene, settlement, investedCardIds);
      case 'choice':
        return this.executeChoice(scene, settlement, investedCardIds, options?.choiceIndex ?? 0);
      default:
        return null;
    }
  }

  applyEffects(effects: Effects, investedCardIds: string[] = []): void {
    this.effectApplier.apply(effects, investedCardIds);
  }

  settleScene(sceneId: string, options?: {
    rerollIndices?: number[];
    goldenDiceUsed?: number;
    choiceIndex?: number;
  }): SettlementResult | null {
    const scene = this.sceneManager.getScene(sceneId);
    const sceneState = this.sceneManager.getSceneState(sceneId);
    if (!scene || !sceneState) return null;

    const runner = new SceneRunner(scene, sceneState);
    let playback = runner.start();
    let lastResult: StageSettlementResult | null = null;

    while (playback && !runner.isComplete) {
      if (runner.hasSettlement()) {
        lastResult = this.executeStageSettlement(sceneId, playback.stageId, options);
        if (lastResult?.result_key) {
          runner.recordStageNarrative(playback.narrative);
          runner.recordStageSettlement(
            lastResult.type, lastResult.result_key,
            lastResult.effects_applied, lastResult.dice_check_state,
          );
          playback = runner.advanceAfterSettlement(lastResult.result_key);
        } else {
          runner.recordStageNarrative(playback.narrative);
          if (lastResult) {
            runner.recordStageSettlement(lastResult.type, undefined, lastResult.effects_applied);
          }
          playback = runner.advanceAfterNarrativeOnly();
        }
      } else {
        runner.recordStageNarrative(playback.narrative);
        playback = runner.advanceAfterNarrativeOnly();
      }
    }

    this.sceneManager.completeScene(sceneId);

    const result: SettlementResult = {
      scene_id: sceneId,
      settlement_type: lastResult?.type || 'dice_check',
      result_key: lastResult?.result_key,
      effects_applied: lastResult?.effects_applied || {},
      narrative: lastResult?.narrative || scene.name,
      dice_check_state: lastResult?.dice_check_state,
      all_stage_results: runner.allStageResults,
    };

    eventBus.emit('scene:settle', { sceneId, result });
    return result;
  }

  applyAbsencePenalty(sceneId: string): SettlementResult | null {
    const scene = this.sceneManager.getScene(sceneId);
    if (!scene || !scene.absence_penalty) return null;

    const effects = scene.absence_penalty.effects;
    this.effectApplier.apply(effects);
    this.sceneManager.completeScene(sceneId);

    const entryStage = scene.stages.find(s => s.stage_id === scene.entry_stage);
    return {
      scene_id: sceneId,
      settlement_type: entryStage?.settlement?.type || 'dice_check',
      effects_applied: effects,
      narrative: scene.absence_penalty.narrative,
    };
  }

  private executeDiceCheck(
    scene: Scene,
    settlement: DiceCheckSettlement,
    investedCardIds: string[],
    options?: { rerollIndices?: number[]; goldenDiceUsed?: number }
  ): StageSettlementResult {
    const cards = investedCardIds
      .map(id => this.cardManager.getCard(id))
      .filter((c): c is CardInstance => c !== undefined && c.isCharacter);

    let poolSize = calcCheckPool(cards, settlement.check.attribute, settlement.check.calc_mode);

    for (const card of cards) {
      poolSize += this.equipmentSystem.getAttributeBonus(card.id, settlement.check.attribute);
    }

    poolSize = Math.min(poolSize, 20);

    let totalReroll = 0;
    for (const card of cards) {
      totalReroll += card.getSpecialAttributeValue(SpecialAttribute.Reroll);
      totalReroll += this.equipmentSystem.getSpecialBonus(card.id, SpecialAttribute.Reroll);
    }

    const itemCards = investedCardIds
      .map(id => this.cardManager.getCard(id))
      .filter((c): c is CardInstance => c !== undefined && !c.isCharacter);
    for (const item of itemCards) {
      const bonus = item.data.attribute_bonus;
      if (bonus) {
        poolSize += bonus[settlement.check.attribute as keyof typeof bonus] || 0;
      }
    }
    poolSize = Math.min(poolSize, 20);

    const diceState = this.diceChecker.performFullCheck(
      poolSize,
      settlement.check,
      totalReroll,
      options?.rerollIndices,
      options?.goldenDiceUsed ?? 0
    );

    if (options?.goldenDiceUsed) {
      this.playerState.useGoldenDice(options.goldenDiceUsed);
    }

    const resultBranch = settlement.results[diceState.result];
    this.effectApplier.apply(resultBranch.effects, investedCardIds);

    eventBus.emit('stage:settle', {
      sceneId: scene.scene_id,
      stageId: '',
      result: diceState.result,
    });

    return {
      type: 'dice_check',
      result_key: diceState.result,
      effects_applied: resultBranch.effects,
      narrative: resultBranch.narrative,
      dice_check_state: diceState,
    };
  }

  private executeTrade(
    scene: Scene,
    _settlement: TradeSettlement,
    _investedCardIds: string[]
  ): StageSettlementResult {
    return {
      type: 'trade',
      effects_applied: {},
      narrative: `${scene.name} 交易完成`,
    };
  }

  private executeChoice(
    scene: Scene,
    settlement: ChoiceSettlement,
    investedCardIds: string[],
    choiceIndex: number
  ): StageSettlementResult {
    const option = settlement.options[choiceIndex] || settlement.options[0];
    this.effectApplier.apply(option.effects, investedCardIds);

    return {
      type: 'choice',
      effects_applied: option.effects,
      narrative: option.label,
    };
  }
}
