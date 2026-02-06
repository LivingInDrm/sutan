import type {
  Scene, SettlementResult, Effects,
  DiceCheckSettlement, TradeSettlement, ChoiceSettlement,
} from '../types';
import { CheckResult, SceneStatus } from '../types/enums';
import { DiceChecker } from './DiceChecker';
import { EffectApplier } from './EffectApplier';
import { calcCheckPool } from './calcCheckPool';
import { CardManager } from '../card/CardManager';
import { PlayerState } from '../player/PlayerState';
import { SceneManager } from '../scene/SceneManager';
import { EquipmentSystem } from '../card/EquipmentSystem';
import { RandomManager } from '../../lib/random';
import { CardInstance } from '../card/CardInstance';
import { eventBus } from '../../lib/events';

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

  settleScene(sceneId: string, options?: {
    rerollIndices?: number[];
    goldenDiceUsed?: number;
    choiceIndex?: number;
  }): SettlementResult | null {
    const scene = this.sceneManager.getScene(sceneId);
    const sceneState = this.sceneManager.getSceneState(sceneId);
    if (!scene || !sceneState) return null;

    const investedCardIds = sceneState.invested_cards;
    let result: SettlementResult;

    switch (scene.settlement.type) {
      case 'dice_check':
        result = this.settleDiceCheck(scene, investedCardIds, options);
        break;
      case 'trade':
        result = this.settleTrade(scene, investedCardIds);
        break;
      case 'choice':
        result = this.settleChoice(scene, investedCardIds, options?.choiceIndex ?? 0);
        break;
      default:
        return null;
    }

    this.sceneManager.completeScene(sceneId);
    eventBus.emit('scene:settle', { sceneId, result });
    return result;
  }

  applyAbsencePenalty(sceneId: string): SettlementResult | null {
    const scene = this.sceneManager.getScene(sceneId);
    if (!scene || !scene.absence_penalty) return null;

    const effects = scene.absence_penalty.effects;
    this.effectApplier.apply(effects);
    this.sceneManager.completeScene(sceneId);

    return {
      scene_id: sceneId,
      settlement_type: scene.settlement.type,
      effects_applied: effects,
      narrative: scene.absence_penalty.narrative,
    };
  }

  private settleDiceCheck(
    scene: Scene,
    investedCardIds: string[],
    options?: { rerollIndices?: number[]; goldenDiceUsed?: number }
  ): SettlementResult {
    const settlement = scene.settlement as DiceCheckSettlement;
    const cards = investedCardIds
      .map(id => this.cardManager.getCard(id))
      .filter((c): c is CardInstance => c !== undefined && c.isCharacter);

    let poolSize = calcCheckPool(cards, settlement.check.attribute, settlement.check.calc_mode);

    for (const card of cards) {
      poolSize += this.equipmentSystem.getAttributeBonus(card.id, settlement.check.attribute);
    }

    poolSize = Math.min(poolSize, 20);

    const diceState = this.diceChecker.performFullCheck(
      poolSize,
      settlement.check,
      options?.rerollIndices,
      options?.goldenDiceUsed ?? 0
    );

    if (options?.goldenDiceUsed) {
      this.playerState.useGoldenDice(options.goldenDiceUsed);
    }

    const resultBranch = settlement.results[diceState.result];
    this.effectApplier.apply(resultBranch.effects, investedCardIds);

    return {
      scene_id: scene.scene_id,
      settlement_type: 'dice_check',
      result_key: diceState.result,
      effects_applied: resultBranch.effects,
      narrative: resultBranch.narrative,
      dice_check_state: diceState,
    };
  }

  private settleTrade(scene: Scene, investedCardIds: string[]): SettlementResult {
    return {
      scene_id: scene.scene_id,
      settlement_type: 'trade',
      effects_applied: {},
      narrative: `${scene.name} 交易完成`,
    };
  }

  private settleChoice(
    scene: Scene,
    investedCardIds: string[],
    choiceIndex: number
  ): SettlementResult {
    const settlement = scene.settlement as ChoiceSettlement;
    const option = settlement.options[choiceIndex] || settlement.options[0];
    this.effectApplier.apply(option.effects, investedCardIds);

    return {
      scene_id: scene.scene_id,
      settlement_type: 'choice',
      effects_applied: option.effects,
      narrative: option.label,
    };
  }
}
