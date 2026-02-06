import { PlayerState } from '../player/PlayerState';
import { CardManager } from '../card/CardManager';
import { EquipmentSystem } from '../card/EquipmentSystem';
import { SceneManager } from '../scene/SceneManager';
import { SettlementExecutor } from '../settlement/SettlementExecutor';
import { TimeManager } from './TimeManager';
import { DayManager } from './DayManager';
import { ThinkSystem } from '../player/ThinkSystem';
import { RandomManager } from '../../lib/random';
import { GameEndReason, CardType } from '../types/enums';
import type { Card, Scene, SaveData, SettlementResult, Difficulty } from '../types';
import { DIFFICULTIES } from '../types';
import { eventBus } from '../../lib/events';

export class GameManager {
  readonly playerState: PlayerState;
  readonly cardManager: CardManager;
  readonly equipmentSystem: EquipmentSystem;
  readonly sceneManager: SceneManager;
  readonly settlementExecutor: SettlementExecutor;
  readonly timeManager: TimeManager;
  readonly dayManager: DayManager;
  readonly thinkSystem: ThinkSystem;
  readonly rng: RandomManager;

  private _isGameOver: boolean = false;
  private _endReason: GameEndReason | null = null;
  private _difficulty: string;

  constructor(difficulty: string = 'normal', seed?: string) {
    this._difficulty = difficulty;
    const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;

    this.rng = new RandomManager(seed);
    this.playerState = new PlayerState(diff.initial_gold);
    this.cardManager = new CardManager();
    this.equipmentSystem = new EquipmentSystem(this.cardManager);
    this.sceneManager = new SceneManager(this.playerState, this.cardManager);
    this.settlementExecutor = new SettlementExecutor(
      this.rng, this.playerState, this.cardManager, this.sceneManager, this.equipmentSystem
    );
    this.timeManager = new TimeManager(this.playerState, diff.execution_days);
    this.thinkSystem = new ThinkSystem(this.playerState, this.cardManager);
    this.dayManager = new DayManager(
      this.timeManager, this.sceneManager, this.settlementExecutor,
      this.thinkSystem, this.playerState, this.cardManager
    );
  }

  get isGameOver(): boolean { return this._isGameOver; }
  get endReason(): GameEndReason | null { return this._endReason; }
  get difficulty(): string { return this._difficulty; }

  startNewGame(initialCards: Card[] = [], initialScenes: Scene[] = []): void {
    for (const card of initialCards) {
      this.cardManager.addCard(card);
    }
    this.sceneManager.registerScenes(initialScenes);
    for (const scene of initialScenes) {
      this.sceneManager.activateScene(scene.scene_id);
    }
    this.dayManager.executeDawn();
    this.dayManager.startAction();
    eventBus.emit('game:start', { difficulty: this._difficulty });
  }

  nextDay(): SettlementResult[] {
    if (this._isGameOver) return [];
    const results = this.dayManager.nextDay();
    this.checkGameEnd();
    return results;
  }

  checkGameEnd(): GameEndReason | null {
    if (this.timeManager.isExecutionDay) {
      const sultanCards = this.cardManager.getSultanCards();
      if (sultanCards.length > 0) {
        this._isGameOver = true;
        this._endReason = GameEndReason.ExecutionFailure;
        eventBus.emit('game:end', { reason: GameEndReason.ExecutionFailure });
        return GameEndReason.ExecutionFailure;
      }
    }
    return null;
  }

  serialize(): SaveData {
    return {
      save_id: `save_${Date.now()}`,
      timestamp: new Date().toISOString(),
      game_state: {
        ...this.timeManager.serialize(),
        gold: this.playerState.gold,
        reputation: this.playerState.reputation,
        rewind_charges: this.playerState.rewindCharges,
        golden_dice: this.playerState.goldenDice,
        think_charges: this.playerState.thinkCharges,
        phase: this.dayManager.phase,
        seed: this.rng.seed,
      },
      cards: {
        hand: this.cardManager.getCardIds(),
        equipped: this.equipmentSystem.getEquipmentMap(),
        locked_in_scenes: {},
        think_used_today: this.thinkSystem.usedToday,
      },
      scenes: {
        active: this.sceneManager.getActiveSceneIds(),
        completed: [],
        scene_states: this.sceneManager.getSceneStatesMap(),
      },
      achievements_unlocked: [],
      npc_relations: {},
    };
  }

  loadSave(save: SaveData, allCards: Card[], allScenes: Scene[]): void {
    this.cardManager.clear();
    for (const cardId of save.cards.hand) {
      const cardData = allCards.find(c => c.card_id === cardId);
      if (cardData) this.cardManager.addCard(cardData);
    }

    this.equipmentSystem.loadEquipmentMap(save.cards.equipped);

    this.sceneManager.registerScenes(allScenes);
    this.sceneManager.loadSceneStates(save.scenes.scene_states);

    this.timeManager.loadState(save.game_state.current_day, save.game_state.execution_countdown);
    this.rng.setSeed(save.game_state.seed);
    this.thinkSystem.loadUsedToday(save.cards.think_used_today);

    this._isGameOver = false;
    this._endReason = null;
  }
}
