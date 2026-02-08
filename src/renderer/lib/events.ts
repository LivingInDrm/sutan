import mitt from 'mitt';
import type { SettlementResult, GameState, StageResult } from '@core/types';
import type { CheckResult, GameEndReason, GamePhase } from '@core/types/enums';

export type GameEvents = {
  'day:dawn': { day: number };
  'day:action': { day: number };
  'day:settlement': { day: number };
  'day:end': { day: number };
  'scene:unlock': { sceneId: string };
  'scene:participate': { sceneId: string; cardIds: string[] };
  'scene:settle': { sceneId: string; result: SettlementResult };
  'stage:start': { sceneId: string; stageId: string };
  'stage:settle': { sceneId: string; stageId: string; result: CheckResult };
  'stage:complete': { sceneId: string; stageId: string };
  'narrative:advance': { sceneId: string; stageId: string; nodeIndex: number };
  'narrative:choice': { sceneId: string; stageId: string; choiceLabel: string };
  'card:add': { cardId: string };
  'card:remove': { cardId: string };
  'card:equip': { characterId: string; equipmentId: string };
  'card:unequip': { characterId: string; equipmentId: string };
  'player:gold_change': { amount: number; newTotal: number };
  'player:reputation_change': { amount: number; newTotal: number };
  'dice:roll': { dice: number[] };
  'dice:reroll': { indices: number[]; newDice: number[] };
  'dice:golden': { count: number };
  'game:start': { difficulty: string };
  'game:end': { reason: GameEndReason };
  'game:save': { saveId: string };
  'game:load': { saveId: string };
  'think:use': { cardId: string };
  'phase:change': { phase: GamePhase };
};

export const eventBus = mitt<GameEvents>();
