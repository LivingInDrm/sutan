import { GamePhase } from '../types/enums';
import { TimeManager } from './TimeManager';
import { SceneManager } from '../scene/SceneManager';
import { SettlementExecutor } from '../settlement/SettlementExecutor';
import { ThinkSystem } from '../player/ThinkSystem';
import { PlayerState } from '../player/PlayerState';
import { CardManager } from '../card/CardManager';
import type { SettlementResult } from '../types';
import { eventBus } from '../../lib/events';

export class DayManager {
  private _phase: GamePhase = GamePhase.Dawn;
  private timeManager: TimeManager;
  private sceneManager: SceneManager;
  private settlementExecutor: SettlementExecutor;
  private thinkSystem: ThinkSystem;
  private playerState: PlayerState;
  private cardManager: CardManager;

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
    eventBus.emit('day:dawn', { day: this.timeManager.currentDay });
    eventBus.emit('phase:change', { phase: GamePhase.Dawn });
  }

  startAction(): void {
    this._phase = GamePhase.Action;
    eventBus.emit('day:action', { day: this.timeManager.currentDay });
    eventBus.emit('phase:change', { phase: GamePhase.Action });
  }

  executeSettlement(): SettlementResult[] {
    this._phase = GamePhase.Settlement;
    eventBus.emit('day:settlement', { day: this.timeManager.currentDay });
    eventBus.emit('phase:change', { phase: GamePhase.Settlement });

    this.timeManager.advanceDay();
    const settledSceneIds = this.sceneManager.decrementRemainingTurns();
    const results: SettlementResult[] = [];

    const unparticipated = this.sceneManager.getExpiredUnparticipatedScenes();
    for (const sceneId of unparticipated) {
      const result = this.settlementExecutor.applyAbsencePenalty(sceneId);
      if (result) results.push(result);
      else this.sceneManager.completeScene(sceneId);
    }

    const participated = settledSceneIds.filter(id => !unparticipated.includes(id));
    for (const sceneId of participated) {
      const result = this.settlementExecutor.settleScene(sceneId);
      if (result) results.push(result);
    }

    this.sceneManager.removeCompletedScenes();

    eventBus.emit('day:end', { day: this.timeManager.currentDay - 1 });
    return results;
  }

  nextDay(): SettlementResult[] {
    const results = this.executeSettlement();
    this.executeDawn();
    this.startAction();
    return results;
  }
}
