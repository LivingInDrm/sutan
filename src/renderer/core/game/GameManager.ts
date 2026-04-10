import { PlayerState } from '../player/PlayerState';
import { CardManager } from '../card/CardManager';
import { EquipmentSystem } from '../card/EquipmentSystem';
import { SceneManager } from '../scene/SceneManager';
import { SceneRunner } from '../scene/SceneRunner';
import { SettlementExecutor } from '../settlement/SettlementExecutor';
import { TimeManager } from './TimeManager';
import { DayManager } from './DayManager';
import { ThinkSystem } from '../player/ThinkSystem';
import { RandomManager } from '../../lib/random';
import { GameEndReason } from '../types/enums';
import type { Card, Scene, SaveData, SettlementResult } from '../types';
import { DIFFICULTIES } from '../types';
import { eventBus } from '../../lib/events';
import type { GameState } from './GameState';
import initialSaveJson from '../../data/configs/initial_save.json';
import type { GameContentProvider } from '../types/repositories';

const emptyContentProvider: GameContentProvider = {
  getCards: () => [],
  getScenes: () => [],
  getMaps: () => [],
  getMap: () => undefined,
  getFirstMap: () => undefined,
};

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
  readonly contentProvider: GameContentProvider;

  private _isGameOver: boolean = false;
  private _endReason: GameEndReason | null = null;
  private _difficulty: string;
  private _allCardsMap: Map<string, Card> = new Map();
  private _runtimeState: GameState;

  constructor(contentProviderOrDifficulty: GameContentProvider | string = 'normal', difficultyOrSeed?: string, seed?: string) {
    const contentProvider = typeof contentProviderOrDifficulty === 'string'
      ? emptyContentProvider
      : contentProviderOrDifficulty;
    const difficulty = typeof contentProviderOrDifficulty === 'string'
      ? contentProviderOrDifficulty
      : difficultyOrSeed ?? 'normal';
    const resolvedSeed = typeof contentProviderOrDifficulty === 'string' ? difficultyOrSeed : seed;

    this.contentProvider = contentProvider;
    this._difficulty = difficulty;
    const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;

    this.rng = new RandomManager(resolvedSeed);
    this.playerState = new PlayerState(diff.initial_gold);
    this.cardManager = new CardManager();
    this.equipmentSystem = new EquipmentSystem(this.cardManager);
    this.sceneManager = new SceneManager(this.playerState, this.cardManager);
    this.settlementExecutor = new SettlementExecutor(
      this.rng, this.playerState, this.cardManager, this.sceneManager, this.equipmentSystem, difficulty
    );
    this.timeManager = new TimeManager(this.playerState, diff.execution_days);
    this.thinkSystem = new ThinkSystem(this.playerState, this.cardManager);
    this.dayManager = new DayManager(
      this.timeManager, this.sceneManager, this.settlementExecutor,
      this.thinkSystem, this.playerState, this.cardManager
    );
    this._runtimeState = {
      owned_card_ids: [],
      card_snapshots: {},
      owned_equipment_ids: [],
      equipment_snapshots: {},
      locked_card_ids: [],
      player: this.playerState.serialize(),
      current_day: this.timeManager.currentDay,
      current_scene: null,
      unlocked_locations: [],
      event_history: [],
    };
    this.settlementExecutor.setOwnershipListeners({
      onCardAdded: (card) => this.trackOwnedCard(card),
      onCardRemoved: (cardId) => this.untrackOwnedCard(cardId),
      onLockedCardsChanged: () => this.syncRuntimeState(),
    });
  }

  get isGameOver(): boolean { return this._isGameOver; }
  get endReason(): GameEndReason | null { return this._endReason; }
  get difficulty(): string { return this._difficulty; }
  get currentDay(): number { return this.timeManager.currentDay; }
  get gold(): number { return this.playerState.gold; }
  get reputation(): number { return this.playerState.reputation; }
  get goldenDice(): number { return this.playerState.goldenDice; }
  get rewindCharges(): number { return this.playerState.rewindCharges; }
  get thinkCharges(): number { return this.playerState.thinkCharges; }
  get executionCountdown(): number { return this.timeManager.executionCountdown; }
  get phase() { return this.dayManager.phase; }
  get handCardIds(): string[] { return this.cardManager.getCardIds(); }
  get runtimeState(): GameState {
    this.syncRuntimeState();
    return {
      ...this._runtimeState,
      owned_card_ids: [...this._runtimeState.owned_card_ids],
      owned_equipment_ids: [...this._runtimeState.owned_equipment_ids],
      locked_card_ids: [...this._runtimeState.locked_card_ids],
      unlocked_locations: [...this._runtimeState.unlocked_locations],
      event_history: [...this._runtimeState.event_history],
      card_snapshots: { ...this._runtimeState.card_snapshots },
      equipment_snapshots: { ...this._runtimeState.equipment_snapshots },
      player: { ...this._runtimeState.player },
    };
  }

  startNewGame(allCards: Card[] = [], initialScenes: Scene[] = []): void {
    this._allCardsMap.clear();
    this.cardManager.clear();
    for (const card of allCards) {
      this._allCardsMap.set(card.card_id, card);
    }

    const initialSave = this.createInitialSaveState();
    this.loadSave(initialSave, allCards, initialScenes);
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

  createSceneRunner(sceneId: string): SceneRunner | null {
    const scene = this.sceneManager.getScene(sceneId);
    const sceneState = this.sceneManager.getSceneState(sceneId);
    if (!scene || !sceneState) return null;
    return new SceneRunner(scene, sceneState);
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
    this.syncRuntimeState();
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
    this.syncRuntimeState();
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
      runtime_state: this.runtimeState,
    };
  }

  exportSave(): string {
    return JSON.stringify(this.serialize(), null, 2);
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
    const runtimeState = save.runtime_state;
    const runtimeCards = runtimeState?.card_snapshots ?? {};
    const runtimeEquipment = runtimeState?.equipment_snapshots ?? {};

    for (const cardId of save.cards.hand) {
      const cardData = runtimeCards[cardId] || runtimeEquipment[cardId] || allCards.find(c => c.card_id === cardId);
      if (cardData) this.cardManager.addCard(cardData);
    }

    this.equipmentSystem.loadEquipmentMap(save.cards.equipped);

    this.sceneManager.registerScenes(allScenes);
    this.sceneManager.loadSceneStates(save.scenes.scene_states);

    this.timeManager.loadState(save.game_state.current_day, save.game_state.execution_countdown);
    this.rng.setSeed(save.game_state.seed);
    this.thinkSystem.loadUsedToday(save.cards.think_used_today);
    this.playerState.restore({
      gold: runtimeState?.player.gold ?? save.game_state.gold,
      reputation: runtimeState?.player.reputation ?? save.game_state.reputation,
      golden_dice: runtimeState?.player.golden_dice ?? save.game_state.golden_dice,
      rewind_charges: runtimeState?.player.rewind_charges ?? save.game_state.rewind_charges,
      think_charges: runtimeState?.player.think_charges ?? save.game_state.think_charges,
    });

    this._isGameOver = false;
    this._endReason = null;
    this._runtimeState = runtimeState ?? {
      owned_card_ids: save.cards.hand.filter(cardId => (this._allCardsMap.get(cardId)?.type ?? runtimeCards[cardId]?.type) === 'character'),
      card_snapshots: runtimeCards,
      owned_equipment_ids: save.cards.hand.filter(cardId => (this._allCardsMap.get(cardId)?.type ?? runtimeEquipment[cardId]?.type) === 'equipment'),
      equipment_snapshots: runtimeEquipment,
      locked_card_ids: save.cards.locked_in_scenes ? Object.values(save.cards.locked_in_scenes).flat() : [],
      player: this.playerState.serialize(),
      current_day: save.game_state.current_day,
      current_scene: null,
      unlocked_locations: this.computeUnlockedLocations(),
      event_history: [],
    };
    this.syncRuntimeState();
  }

  importSave(saveJson: string, allCards?: Card[], allScenes?: Scene[]): void {
    const parsed = JSON.parse(saveJson) as SaveData;
    this.loadSave(
      parsed,
      allCards ?? this.contentProvider.getCards(),
      allScenes ?? this.contentProvider.getScenes(),
    );
  }

  private createInitialSaveState(): SaveData {
    const diff = DIFFICULTIES[this._difficulty] || DIFFICULTIES.normal;
    const save = JSON.parse(JSON.stringify(initialSaveJson)) as SaveData;
    save.game_state.execution_countdown = diff.execution_days;
    save.game_state.gold = diff.initial_gold;
    save.game_state.seed = this.rng.seed;
    if (save.runtime_state) {
      save.runtime_state.player.gold = diff.initial_gold;
    }
    return save;
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

  private trackOwnedCard(card: Card): void {
    if (card.type === 'equipment') {
      if (!this._runtimeState.owned_equipment_ids.includes(card.card_id)) {
        this._runtimeState.owned_equipment_ids.push(card.card_id);
      }
      this._runtimeState.equipment_snapshots[card.card_id] = { ...card };
      return;
    }
    if (!this._runtimeState.owned_card_ids.includes(card.card_id)) {
      this._runtimeState.owned_card_ids.push(card.card_id);
    }
    this._runtimeState.card_snapshots[card.card_id] = { ...card };
  }

  private untrackOwnedCard(cardId: string): void {
    if (this._runtimeState.owned_card_ids.includes(cardId)) {
      this._runtimeState.owned_card_ids = this._runtimeState.owned_card_ids.filter(id => id !== cardId);
      delete this._runtimeState.card_snapshots[cardId];
    }
    if (this._runtimeState.owned_equipment_ids.includes(cardId)) {
      this._runtimeState.owned_equipment_ids = this._runtimeState.owned_equipment_ids.filter(id => id !== cardId);
      delete this._runtimeState.equipment_snapshots[cardId];
    }
  }

  private syncRuntimeState(): void {
    for (const card of this.cardManager.getAllCards()) {
      this.trackOwnedCard(card.toCardData());
    }
    this._runtimeState.player = this.playerState.serialize();
    this._runtimeState.current_day = this.timeManager.currentDay;
    this._runtimeState.locked_card_ids = this.cardManager.getLockedCardIds();
    this._runtimeState.unlocked_locations = this.computeUnlockedLocations();
  }

  private computeUnlockedLocations(): string[] {
    const maps = this.contentProvider.getMaps();
    const unlocked = new Set<string>();
    for (const map of maps) {
      for (const location of map.locations) {
        const hasUnlockedScene = location.scene_ids.some(sceneId => {
          const state = this.sceneManager.getSceneState(sceneId);
          return state && state.status !== 'locked';
        });
        if (hasUnlockedScene) {
          unlocked.add(location.location_id);
        }
      }
    }
    return Array.from(unlocked);
  }
}
