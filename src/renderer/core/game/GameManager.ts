import { PlayerState } from '../player/PlayerState';
import { CardManager } from '../card/CardManager';
import { EquipmentSystem } from '../card/EquipmentSystem';
import { SceneManager } from '../scene/SceneManager';
import { SettlementExecutor } from '../settlement/SettlementExecutor';
import { TimeManager } from './TimeManager';
import { DayManager } from './DayManager';
import { ThinkSystem } from '../player/ThinkSystem';
import { RandomManager } from '../../lib/random';
import { GameEndReason } from '../types/enums';
import type { Card, Scene, SaveData, SettlementResult } from '../types';
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
  private _allCardsMap: Map<string, Card> = new Map();

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
      this._allCardsMap.set(card.card_id, card);
      this.cardManager.addCard(card);
    }
    this.settlementExecutor.setCardDataResolver(
      (cardId: string) => this._allCardsMap.get(cardId)
    );
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

  rewindDay(): boolean {
    const snapshot = this.timeManager.rewind();
    if (!snapshot) return false;

    this.playerState.restore(snapshot.playerData);

    if (snapshot.handCardIds) {
      this.cardManager.clear();
      for (const cardId of snapshot.handCardIds) {
        const cardData = this._allCardsMap.get(cardId);
        if (cardData) this.cardManager.addCard(cardData);
      }
    }

    if (snapshot.sceneStatesSnapshot) {
      this.sceneManager.loadSceneStates(
        snapshot.sceneStatesSnapshot as Record<string, import('../types').SceneState>
      );
    }

    if (snapshot.thinkUsedToday) {
      this.thinkSystem.loadUsedToday(snapshot.thinkUsedToday);
    }

    this.dayManager.executeDawn();
    this.dayManager.startAction();
    return true;
  }

  checkGameEnd(): GameEndReason | null {
    if (this.timeManager.isExecutionDay) {
      const sultanCards = this.cardManager.getSultanCards();
      if (sultanCards.length > 0) {
        this._isGameOver = true;
        this._endReason = GameEndReason.ExecutionFailure;
        eventBus.emit('game:end', { reason: GameEndReason.ExecutionFailure });
        return GameEndReason.ExecutionFailure;
      } else {
        this._isGameOver = true;
        this._endReason = GameEndReason.SurvivalVictory;
        eventBus.emit('game:end', { reason: GameEndReason.SurvivalVictory });
        return GameEndReason.SurvivalVictory;
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
        locked_in_scenes: this.buildLockedInScenes(),
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
    this._allCardsMap.clear();
    for (const card of allCards) {
      this._allCardsMap.set(card.card_id, card);
    }
    this.settlementExecutor.setCardDataResolver(
      (cardId: string) => this._allCardsMap.get(cardId)
    );

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

  private buildLockedInScenes(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    const sceneStates = this.sceneManager.getSceneStatesMap();
    for (const [sceneId, state] of Object.entries(sceneStates)) {
      if (state.invested_cards.length > 0) {
        result[sceneId] = [...state.invested_cards];
      }
    }
    return result;
  }
}
