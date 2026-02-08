import { GamePhase, GAME_CONSTANTS } from '../types/enums';
import { TimeManager } from './TimeManager';
import { SceneManager } from '../scene/SceneManager';
import { SettlementExecutor } from '../settlement/SettlementExecutor';
import { ThinkSystem } from '../player/ThinkSystem';
import { PlayerState } from '../player/PlayerState';
import { CardManager } from '../card/CardManager';
import type { SettlementResult } from '../types';
import { eventBus } from '../../lib/events';

export interface SettlementPhaseResult {
  absencePenaltyResults: SettlementResult[];
  pendingSceneIds: string[];
}

export class DayManager {
  private _phase: GamePhase = GamePhase.Dawn;
  private timeManager: TimeManager;
  private sceneManager: SceneManager;
  private settlementExecutor: SettlementExecutor;
  private thinkSystem: ThinkSystem;
  private playerState: PlayerState;
  private cardManager: CardManager;
  private _preSettlementSnapshot: Record<string, unknown> | null = null;

  constructor(
    timeManager: TimeManager,
    sceneManager: SceneManager,
    settlementExecutor: SettlementExecutor,
    thinkSystem: ThinkSystem,
    playerState: PlayerState,
    cardManager: CardManager
  ) {
    this.timeManager = timeManager;
    this.sceneManager = sceneManager;
    this.settlementExecutor = settlementExecutor;
    this.thinkSystem = thinkSystem;
    this.playerState = playerState;
    this.cardManager = cardManager;
  }

  get phase(): GamePhase { return this._phase; }
  get currentDay(): number { return this.timeManager.currentDay; }

  executeDawn(): void {
    this._phase = GamePhase.Dawn;
    this.thinkSystem.resetDaily();
    this.refreshScenes();
    eventBus.emit('day:dawn', { day: this.timeManager.currentDay });
    eventBus.emit('phase:change', { phase: GamePhase.Dawn });
  }

  private refreshScenes(): void {
    const allRegistered = this.sceneManager.getAllRegisteredSceneIds();
    for (const sceneId of allRegistered) {
      const state = this.sceneManager.getSceneState(sceneId);
      if (!state) {
        this.sceneManager.activateScene(sceneId);
      }
    }
  }

  startAction(): void {
    this._phase = GamePhase.Action;
    eventBus.emit('day:action', { day: this.timeManager.currentDay });
    eventBus.emit('phase:change', { phase: GamePhase.Action });
  }

  beginSettlement(): SettlementPhaseResult {
    this._phase = GamePhase.Settlement;
    eventBus.emit('day:settlement', { day: this.timeManager.currentDay });
    eventBus.emit('phase:change', { phase: GamePhase.Settlement });

    this._preSettlementSnapshot = {
      sceneStatesSnapshot: this.sceneManager.getSceneStatesMap() as unknown as Record<string, unknown>,
      handCardIds: this.cardManager.getCardIds(),
      thinkUsedToday: this.thinkSystem.usedToday,
    };

    const settledSceneIds = this.sceneManager.decrementRemainingTurns();
    const absencePenaltyResults: SettlementResult[] = [];

    const unparticipated = this.sceneManager.getExpiredUnparticipatedScenes();
    for (const sceneId of unparticipated) {
      const result = this.settlementExecutor.applyAbsencePenalty(sceneId);
      if (result) absencePenaltyResults.push(result);
      else this.sceneManager.completeScene(sceneId);
    }

    const pendingSceneIds = settledSceneIds.filter(id => !unparticipated.includes(id));

    return { absencePenaltyResults, pendingSceneIds };
  }

  finishSettlement(): void {
    this.sceneManager.removeCompletedScenes();
    eventBus.emit('day:end', { day: this.timeManager.currentDay });
    if (this._preSettlementSnapshot) {
      this.timeManager.advanceDay(this._preSettlementSnapshot);
      this._preSettlementSnapshot = null;
    }
  }

  endDay(): void {
    this.finishSettlement();
    this.executeDawn();
    this.startAction();
  }

  executeSettlement(): SettlementResult[] {
    const { absencePenaltyResults, pendingSceneIds } = this.beginSettlement();
    const results: SettlementResult[] = [...absencePenaltyResults];

    for (const sceneId of pendingSceneIds) {
      const result = this.settlementExecutor.settleScene(sceneId);
      if (result) results.push(result);
    }

    this.finishSettlement();
    return results;
  }

  nextDay(): SettlementResult[] {
    const results = this.executeSettlement();
    this.executeDawn();
    this.startAction();
    return results;
  }
}
