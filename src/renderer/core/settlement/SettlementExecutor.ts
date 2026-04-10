import type {
  Card, Scene, Settlement, SettlementResult, DiceCheckState,
  DiceCheckSettlement, TradeSettlement, ChoiceSettlement, PlayerChoiceSettlement,
  Stage, Effects, DiceRollResult,
} from '../types';
import { CheckResult, SpecialAttribute } from '../types/enums';
import { DiceChecker } from './DiceChecker';
import { EffectApplier, type CardDataResolver } from './EffectApplier';
import { calcPowerModifier } from './calcPowerModifier';
import { CardManager } from '../card/CardManager';
import { PlayerState } from '../player/PlayerState';
import { SceneManager } from '../scene/SceneManager';
import { EquipmentSystem } from '../card/EquipmentSystem';
import { RandomManager } from '../../lib/random';
import { CardInstance } from '../card/CardInstance';
import { SceneRunner } from '../scene/SceneRunner';
import { eventBus } from '../../lib/events';
import { DIFFICULTIES } from '../types';

export interface StageSettlementResult {
  type: Settlement['type'];
  result_key?: CheckResult;
  effects_applied: Effects;
  narrative: string;
  dice_check_state?: DiceCheckState;
  next_stage?: string;
}

export class SettlementExecutor {
  private diceChecker: DiceChecker;
  private effectApplier: EffectApplier;
  private cardManager: CardManager;
  private playerState: PlayerState;
  private sceneManager: SceneManager;
  private equipmentSystem: EquipmentSystem;
  private difficultyKey: string = 'normal';

  constructor(
    rng: RandomManager,
    playerState: PlayerState,
    cardManager: CardManager,
    sceneManager: SceneManager,
    equipmentSystem: EquipmentSystem,
    difficultyKey: string = 'normal'
  ) {
    this.diceChecker = new DiceChecker(rng);
    this.effectApplier = new EffectApplier(playerState, cardManager);
    this.cardManager = cardManager;
    this.playerState = playerState;
    this.sceneManager = sceneManager;
    this.equipmentSystem = equipmentSystem;
    this.difficultyKey = difficultyKey;
  }

  setCardDataResolver(resolver: CardDataResolver): void {
    this.effectApplier.setCardDataResolver(resolver);
  }

  setOwnershipListeners(listeners: {
    onCardAdded?: (card: Card) => void;
    onCardRemoved?: (cardId: string) => void;
    onLockedCardsChanged?: (cardIds: string[], action: 'lock' | 'unlock') => void;
  }): void {
    this.effectApplier.setOwnershipListeners(listeners);
  }

  executeStageSettlement(
    sceneId: string,
    stageId: string,
    options?: { goldenDiceUsed?: number; choiceIndex?: number; externalRoll?: DiceRollResult }
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
      case 'player_choice':
        return this.executePlayerChoice(scene, settlement, investedCardIds, options?.choiceIndex ?? 0);
      default:
        return null;
    }
  }

  applyEffects(effects: Effects, investedCardIds: string[] = []): void {
    this.effectApplier.apply(effects, investedCardIds);
  }

  getDiceInteractionPreview(
    sceneId: string,
    stageId: string
  ): { modifier: number; dc: number; goldenDice: number; rerollAvailable: number } | null {
    const scene = this.sceneManager.getScene(sceneId);
    const sceneState = this.sceneManager.getSceneState(sceneId);
    if (!scene || !sceneState) return null;

    const stage = scene.stages.find(s => s.stage_id === stageId);
    if (!stage || !stage.settlement || stage.settlement.type !== 'dice_check') return null;

    const settlement = stage.settlement;
    const investedCardIds = sceneState.invested_cards;
    const cards = investedCardIds
      .map(id => this.cardManager.getCard(id))
      .filter((c): c is CardInstance => c !== undefined && c.isCharacter);
    const modifier = calcPowerModifier(
      cards,
      settlement.check.attribute,
      settlement.check.slots,
      settlement.check.opponent_value,
      0
    );
    const difficultyOffset = (DIFFICULTIES[this.difficultyKey] ?? DIFFICULTIES.normal).dc_offset;
    const rerollAvailable = investedCardIds.reduce((total, cardId) => {
      const card = this.cardManager.getCard(cardId);
      if (!card || !card.isCharacter) {
        return total;
      }
      return total
        + card.getSpecialAttributeValue(SpecialAttribute.Reroll)
        + this.equipmentSystem.getSpecialBonus(cardId, SpecialAttribute.Reroll);
    }, 0);

    return {
      modifier,
      dc: settlement.check.dc + difficultyOffset,
      goldenDice: this.playerState.goldenDice,
      rerollAvailable,
    };
  }

  settleScene(sceneId: string, options?: {
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
            lastResult.effects_applied, lastResult.dice_check_state, lastResult.next_stage,
          );
          playback = runner.advanceAfterSettlement(lastResult.result_key);
        } else if (lastResult?.next_stage) {
          runner.recordStageNarrative(playback.narrative);
          runner.recordStageSettlement(
            lastResult.type,
            undefined,
            lastResult.effects_applied,
            undefined,
            lastResult.next_stage,
          );
          playback = runner.advanceByChoice(lastResult.next_stage);
        } else {
          runner.recordStageNarrative(playback.narrative);
          if (lastResult) {
            runner.recordStageSettlement(
              lastResult.type,
              undefined,
              lastResult.effects_applied,
              undefined,
              lastResult.next_stage,
            );
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
    options?: { goldenDiceUsed?: number; externalRoll?: DiceRollResult }
  ): StageSettlementResult {
    const cards = investedCardIds
      .map(id => this.cardManager.getCard(id))
      .filter((c): c is CardInstance => c !== undefined && c.isCharacter);
    const goldenDiceUsed = options?.goldenDiceUsed ?? 0;
    const modifier = calcPowerModifier(
      cards,
      settlement.check.attribute,
      settlement.check.slots,
      settlement.check.opponent_value,
      goldenDiceUsed
    );
    const difficultyOffset = (DIFFICULTIES[this.difficultyKey] ?? DIFFICULTIES.normal).dc_offset;
    const dcWithOffset = settlement.check.dc + difficultyOffset;
    const initialRoll = options?.externalRoll
      ? this.diceChecker.rollDiceWithValues(options.externalRoll.dice)
      : this.diceChecker.rollDice();
    const diceState = this.diceChecker.buildCheckState(
      settlement.check,
      initialRoll,
      modifier,
      dcWithOffset
    );

    if (goldenDiceUsed) {
      this.playerState.useGoldenDice(goldenDiceUsed);
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

  executeDiceCheckWithValues(
    sceneId: string,
    stageId: string,
    dice: number[],
    options?: { goldenDiceUsed?: number }
  ): StageSettlementResult | null {
    const scene = this.sceneManager.getScene(sceneId);
    const sceneState = this.sceneManager.getSceneState(sceneId);
    if (!scene || !sceneState) return null;

    const stage = scene.stages.find(s => s.stage_id === stageId);
    if (!stage || !stage.settlement || stage.settlement.type !== 'dice_check') return null;

    const settlement = stage.settlement;
    const investedCardIds = sceneState.invested_cards;
    const cards = investedCardIds
      .map(id => this.cardManager.getCard(id))
      .filter((c): c is CardInstance => c !== undefined && c.isCharacter);
    const goldenDiceUsed = options?.goldenDiceUsed ?? 0;
    const modifier = calcPowerModifier(
      cards,
      settlement.check.attribute,
      settlement.check.slots,
      settlement.check.opponent_value,
      goldenDiceUsed
    );
    const difficultyOffset = (DIFFICULTIES[this.difficultyKey] ?? DIFFICULTIES.normal).dc_offset;
    const dcWithOffset = settlement.check.dc + difficultyOffset;
    const diceState = this.diceChecker.buildCheckState(
      settlement.check,
      this.diceChecker.rollDiceWithValues(dice),
      modifier,
      dcWithOffset
    );

    if (goldenDiceUsed) {
      this.playerState.useGoldenDice(goldenDiceUsed);
    }

    const resultBranch = settlement.results[diceState.result];
    this.effectApplier.apply(resultBranch.effects, investedCardIds);

    eventBus.emit('stage:settle', {
      sceneId,
      stageId,
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

  getDiceCheckPreview(
    sceneId: string,
    stageId: string
  ): { modifier: number; dc: number } | null {
    const preview = this.getDiceInteractionPreview(sceneId, stageId);
    if (!preview) {
      return null;
    }
    return { modifier: preview.modifier, dc: preview.dc };
  }

  rerollDiceCheck(
    sceneId: string,
    stageId: string,
    baseDice: number[],
    options?: { goldenDiceUsed?: number }
  ): StageSettlementResult | null {
    const scene = this.sceneManager.getScene(sceneId);
    const sceneState = this.sceneManager.getSceneState(sceneId);
    if (!scene || !sceneState) return null;

    const stage = scene.stages.find(s => s.stage_id === stageId);
    if (!stage || !stage.settlement || stage.settlement.type !== 'dice_check') return null;

    const settlement = stage.settlement;
    const investedCardIds = sceneState.invested_cards;
    const cards = investedCardIds
      .map(id => this.cardManager.getCard(id))
      .filter((c): c is CardInstance => c !== undefined && c.isCharacter);
    const goldenDiceUsed = options?.goldenDiceUsed ?? 0;
    const modifier = calcPowerModifier(
      cards,
      settlement.check.attribute,
      settlement.check.slots,
      settlement.check.opponent_value,
      goldenDiceUsed
    );
    const difficultyOffset = (DIFFICULTIES[this.difficultyKey] ?? DIFFICULTIES.normal).dc_offset;
    const dcWithOffset = settlement.check.dc + difficultyOffset;
    const rerolled = this.diceChecker.reroll(baseDice);
    const diceState = this.diceChecker.buildCheckState(
      settlement.check,
      rerolled,
      modifier,
      dcWithOffset,
      [0, 1, 2]
    );

    const resultBranch = settlement.results[diceState.result];

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

  private executePlayerChoice(
    _scene: Scene,
    settlement: PlayerChoiceSettlement,
    investedCardIds: string[],
    choiceIndex: number
  ): StageSettlementResult {
    const option = settlement.choices[choiceIndex] || settlement.choices[0];
    this.effectApplier.apply(option.effects, investedCardIds);

    return {
      type: 'player_choice',
      effects_applied: option.effects,
      narrative: option.description || `你选择了「${option.label}」`,
      next_stage: option.next_stage,
    };
  }
}
