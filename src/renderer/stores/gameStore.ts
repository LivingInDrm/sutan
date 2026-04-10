import { create } from 'zustand';
import { GameManager } from '../core/game/GameManager';
import { SceneRunner } from '../core/scene/SceneRunner';
import { gameContentProvider } from '../app/bootstrap';
import type {
  Card, Scene, SaveData, SettlementResult, StagePlayback,
  NarrativeNode, Effects,
} from '../core/types';
import { GamePhase, GameEndReason, CheckResult } from '../core/types/enums';
import type { StageSettlementResult } from '../core/settlement/SettlementExecutor';
import type { DiceRollResult } from '../core/types';

const getGameSelectorValue = <T>(game: GameManager | null, selector: (game: GameManager) => T, fallback: T): T => (
  game ? selector(game) : fallback
);

interface SettlementPlaybackState {
  isPlaying: boolean;
  pendingSceneIds: string[];
  currentRunner: SceneRunner | null;
  currentStagePlayback: StagePlayback | null;
  narrativeIndex: number;
  currentStageSettlementResult: StageSettlementResult | null;
  completedResults: SettlementResult[];
}

interface GameStoreState {
  game: GameManager | null;
  lastSettlementResults: SettlementResult[];
  settlement: SettlementPlaybackState;
  readonly currentDay: number;
  readonly gold: number;
  readonly reputation: number;
  readonly goldenDice: number;
  readonly rewindCharges: number;
  readonly thinkCharges: number;
  readonly executionCountdown: number;
  readonly phase: GamePhase;
  readonly isGameOver: boolean;
  readonly endReason: GameEndReason | null;
  readonly handCardIds: string[];
}

interface GameStoreActions {
  startNewGame: (difficulty: string, cards: Card[], scenes: Scene[], seed?: string) => void;
  nextDay: () => SettlementResult[];
  refreshDerivedState: () => void;
  save: () => SaveData | null;
  exportSave: () => string | null;
  load: (save: SaveData, allCards: Card[], allScenes: Scene[]) => void;
  importSave: (saveJson: string, allCards?: Card[], allScenes?: Scene[]) => void;
  reset: () => void;
  beginSettlement: () => void;
  advanceNarrative: () => void;
  handleNarrativeChoice: (nextStageId: string, effects?: Effects) => void;
  executeCurrentSettlement: (options?: {
    goldenDiceUsed?: number;
    choiceIndex?: number;
    externalRoll?: DiceRollResult;
  }) => void;
  executeCurrentSettlementWithDice: (
    dice: number[],
    options?: { goldenDiceUsed?: number }
  ) => void;
  rerollCurrentSettlementDice: (
    baseDice: number[],
    options?: { goldenDiceUsed?: number }
  ) => StageSettlementResult | null;
  getCurrentDiceCheckPreview: () => { modifier: number; dc: number; goldenDice: number; rerollAvailable: number } | null;
  advanceAfterSettlement: () => void;
  finishCurrentScene: () => void;
  finishAllSettlement: () => void;
}

type GameStore = GameStoreState & GameStoreActions;

const initialSettlement: SettlementPlaybackState = {
  isPlaying: false,
  pendingSceneIds: [],
  currentRunner: null,
  currentStagePlayback: null,
  narrativeIndex: 0,
  currentStageSettlementResult: null,
  completedResults: [],
};

const initialState: GameStoreState = {
  game: null,
  lastSettlementResults: [],
  settlement: { ...initialSettlement },
  currentDay: 1,
  gold: 0,
  reputation: 50,
  goldenDice: 0,
  rewindCharges: 3,
  thinkCharges: 3,
  executionCountdown: 14,
  phase: GamePhase.Dawn,
  isGameOver: false,
  endReason: null,
  handCardIds: [],
};

export const useGameStore = create<GameStore>()((set, get) => ({
  ...initialState,

  startNewGame: (difficulty, cards, scenes, seed) => {
    const game = new GameManager(gameContentProvider, difficulty, seed);
    game.startNewGame(cards, scenes);
    set({ game });
    get().refreshDerivedState();
  },

  nextDay: () => {
    const { game } = get();
    if (!game) return [];
    const results = game.nextDay();
    set({ lastSettlementResults: results });
    get().refreshDerivedState();
    return results;
  },

  beginSettlement: () => {
    const { game } = get();
    if (!game) return;

    const { pendingSceneIds } = game.dayManager.beginSettlement();

    if (pendingSceneIds.length === 0) {
      set({
        lastSettlementResults: [],
        settlement: {
          ...initialSettlement,
          completedResults: [],
        },
      });
      game.dayManager.endDay();
      game.checkGameEnd();
      get().refreshDerivedState();
      return;
    }

    const firstSceneId = pendingSceneIds[0];
    const runner = game.createSceneRunner(firstSceneId);
    const playback = runner?.start() ?? null;

    set({
      settlement: {
        isPlaying: true,
        pendingSceneIds: pendingSceneIds.slice(1),
        currentRunner: runner,
        currentStagePlayback: playback,
        narrativeIndex: 0,
        currentStageSettlementResult: null,
        completedResults: [],
      },
    });
    get().refreshDerivedState();
  },

  advanceNarrative: () => {
    const { settlement } = get();
    if (!settlement.currentStagePlayback) return;

    const nextIndex = settlement.narrativeIndex + 1;
    const narrative = settlement.currentStagePlayback.narrative;

    if (nextIndex < narrative.length) {
      const node = narrative[nextIndex];
      if (node.type === 'effect') {
        const { game } = get();
        if (game) {
          const runner = settlement.currentRunner;
          const sceneState = runner ? game.sceneManager.getSceneState(runner.sceneId) : null;
          const investedCards = sceneState?.invested_cards || [];
          game.settlementExecutor.applyEffects(node.effects, investedCards);
          get().refreshDerivedState();
        }
      }
      set({
        settlement: { ...settlement, narrativeIndex: nextIndex },
      });
    } else {
      if (settlement.currentStagePlayback.hasSettlement) {
        set({
          settlement: {
            ...settlement,
            narrativeIndex: nextIndex,
          },
        });
      } else {
        const runner = settlement.currentRunner;
        if (runner) {
          runner.recordStageNarrative(narrative);
          const nextPlayback = runner.advanceAfterNarrativeOnly();
          if (nextPlayback) {
            set({
              settlement: {
                ...settlement,
                currentStagePlayback: nextPlayback,
                narrativeIndex: 0,
                currentStageSettlementResult: null,
              },
            });
          } else {
            get().finishCurrentScene();
          }
        }
      }
    }
  },

  handleNarrativeChoice: (nextStageId, effects) => {
    const { settlement, game } = get();
    const runner = settlement.currentRunner;
    if (!runner || !game) return;

    if (effects) {
      const sceneState = game.sceneManager.getSceneState(runner.sceneId);
      const investedCards = sceneState?.invested_cards || [];
      game.settlementExecutor.applyEffects(effects, investedCards);
      get().refreshDerivedState();
    }

    if (settlement.currentStagePlayback) {
      runner.recordStageNarrative(settlement.currentStagePlayback.narrative);
    }

    const nextPlayback = runner.advanceByChoice(nextStageId);
    if (nextPlayback) {
      set({
        settlement: {
          ...settlement,
          currentStagePlayback: nextPlayback,
          narrativeIndex: 0,
          currentStageSettlementResult: null,
        },
      });
    } else {
      get().finishCurrentScene();
    }
  },

  executeCurrentSettlement: (options) => {
    const { settlement, game } = get();
    const runner = settlement.currentRunner;
    const playback = settlement.currentStagePlayback;
    if (!runner || !playback || !game) return;

    const result = game.settlementExecutor.executeStageSettlement(
      runner.sceneId,
      playback.stageId,
      options,
    );

    if (result) {
      runner.recordStageNarrative(playback.narrative);
      runner.recordStageSettlement(
        result.type,
        result.result_key,
        result.effects_applied,
        result.dice_check_state,
        result.next_stage,
      );

      if (result.result_key) {
        game.sceneManager.recordStageResult(runner.sceneId, playback.stageId, result.result_key);
      }
    }

    set({
      settlement: {
        ...settlement,
        currentStageSettlementResult: result,
      },
    });
    get().refreshDerivedState();
  },

  executeCurrentSettlementWithDice: (dice, options) => {
    const { settlement, game } = get();
    const runner = settlement.currentRunner;
    const playback = settlement.currentStagePlayback;
    if (!runner || !playback || !game) return;

    const result = game.settlementExecutor.executeDiceCheckWithValues(
      runner.sceneId,
      playback.stageId,
      dice,
      options,
    );

    if (result) {
      runner.recordStageNarrative(playback.narrative);
      runner.recordStageSettlement(
        result.type,
        result.result_key,
        result.effects_applied,
        result.dice_check_state,
        result.next_stage,
      );

      if (result.result_key) {
        game.sceneManager.recordStageResult(runner.sceneId, playback.stageId, result.result_key);
      }
    }

    set({
      settlement: {
        ...settlement,
        currentStageSettlementResult: result,
      },
    });
    get().refreshDerivedState();
  },

  getCurrentDiceCheckPreview: () => {
    const { settlement, game } = get();
    const runner = settlement.currentRunner;
    const playback = settlement.currentStagePlayback;
    if (!runner || !playback || !game) return null;

    return game.settlementExecutor.getDiceInteractionPreview(runner.sceneId, playback.stageId);
  },

  rerollCurrentSettlementDice: (baseDice, options) => {
    const { settlement, game } = get();
    const runner = settlement.currentRunner;
    const playback = settlement.currentStagePlayback;
    if (!runner || !playback || !game) return null;

    return game.settlementExecutor.rerollDiceCheck(
      runner.sceneId,
      playback.stageId,
      baseDice,
      options,
    );
  },

  advanceAfterSettlement: () => {
    const { settlement } = get();
    const runner = settlement.currentRunner;
    const stageResult = settlement.currentStageSettlementResult;
    if (!runner) return;

    let nextPlayback = null;
    if (stageResult?.next_stage) {
      nextPlayback = runner.advanceByChoice(stageResult.next_stage);
    } else if (stageResult?.result_key) {
      nextPlayback = runner.advanceAfterSettlement(stageResult.result_key);
    } else {
      nextPlayback = runner.advanceAfterNarrativeOnly();
    }

    if (nextPlayback) {
      set({
        settlement: {
          ...settlement,
          currentStagePlayback: nextPlayback,
          narrativeIndex: 0,
          currentStageSettlementResult: null,
        },
      });
    } else {
      get().finishCurrentScene();
    }
  },

  finishCurrentScene: () => {
    const { settlement, game } = get();
    const runner = settlement.currentRunner;
    if (!runner || !game) return;

    game.sceneManager.completeScene(runner.sceneId);

    const sceneResult: SettlementResult = {
      scene_id: runner.sceneId,
      settlement_type: settlement.currentStageSettlementResult?.type || 'dice_check',
      result_key: settlement.currentStageSettlementResult?.result_key,
      effects_applied: settlement.currentStageSettlementResult?.effects_applied || {},
      narrative: settlement.currentStageSettlementResult?.narrative || '',
      dice_check_state: settlement.currentStageSettlementResult?.dice_check_state,
      all_stage_results: runner.allStageResults,
    };

    const newCompleted = [...settlement.completedResults, sceneResult];

    if (settlement.pendingSceneIds.length > 0) {
      const nextSceneId = settlement.pendingSceneIds[0];
      const nextRunner = game.createSceneRunner(nextSceneId);
      const nextPlayback = nextRunner?.start() ?? null;

      set({
        settlement: {
          isPlaying: true,
          pendingSceneIds: settlement.pendingSceneIds.slice(1),
          currentRunner: nextRunner,
          currentStagePlayback: nextPlayback,
          narrativeIndex: 0,
          currentStageSettlementResult: null,
          completedResults: newCompleted,
        },
      });
    } else {
      set({
        settlement: {
          ...initialSettlement,
          completedResults: newCompleted,
        },
        lastSettlementResults: newCompleted,
      });
      get().finishAllSettlement();
    }
  },

  finishAllSettlement: () => {
    const { game, settlement } = get();
    if (!game) return;

    game.dayManager.endDay();
    game.checkGameEnd();

    set({
      lastSettlementResults: settlement.completedResults,
      settlement: { ...initialSettlement },
    });
    get().refreshDerivedState();
  },

  refreshDerivedState: () => {
    const { game } = get();
    set({
      currentDay: getGameSelectorValue(game, currentGame => currentGame.currentDay, 1),
      gold: getGameSelectorValue(game, currentGame => currentGame.gold, 0),
      reputation: getGameSelectorValue(game, currentGame => currentGame.reputation, 50),
      goldenDice: getGameSelectorValue(game, currentGame => currentGame.goldenDice, 0),
      rewindCharges: getGameSelectorValue(game, currentGame => currentGame.rewindCharges, 3),
      thinkCharges: getGameSelectorValue(game, currentGame => currentGame.thinkCharges, 3),
      executionCountdown: getGameSelectorValue(game, currentGame => currentGame.executionCountdown, 14),
      phase: getGameSelectorValue(game, currentGame => currentGame.phase, GamePhase.Dawn),
      isGameOver: getGameSelectorValue(game, currentGame => currentGame.isGameOver, false),
      endReason: getGameSelectorValue(game, currentGame => currentGame.endReason, null),
      handCardIds: getGameSelectorValue(game, currentGame => currentGame.handCardIds, []),
    });
  },

  save: () => {
    const { game } = get();
    if (!game) return null;
    return game.serialize();
  },

  exportSave: () => {
    const { game } = get();
    if (!game) return null;
    return game.exportSave();
  },

  load: (save, allCards, allScenes) => {
    const game = new GameManager(gameContentProvider);
    game.loadSave(save, allCards, allScenes);
    set({ game });
    get().refreshDerivedState();
  },

  importSave: (saveJson, allCards, allScenes) => {
    const game = new GameManager(gameContentProvider);
    game.importSave(saveJson, allCards, allScenes);
    set({ game });
    get().refreshDerivedState();
  },

  reset: () => {
    set({ ...initialState, settlement: { ...initialSettlement } });
  },
}));

