import { create } from 'zustand';
import { GameManager } from '../core/game/GameManager';
import { SceneRunner } from '../core/scene/SceneRunner';
import type {
  Card, Scene, SaveData, SettlementResult, StagePlayback,
  NarrativeNode, Effects,
} from '../core/types';
import { GamePhase, GameEndReason, CheckResult } from '../core/types/enums';
import type { StageSettlementResult } from '../core/settlement/SettlementExecutor';

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
  currentDay: number;
  gold: number;
  reputation: number;
  goldenDice: number;
  rewindCharges: number;
  thinkCharges: number;
  executionCountdown: number;
  phase: GamePhase;
  isGameOver: boolean;
  endReason: GameEndReason | null;
  handCardIds: string[];
  lastSettlementResults: SettlementResult[];
  settlement: SettlementPlaybackState;
}

interface GameStoreActions {
  startNewGame: (difficulty: string, cards: Card[], scenes: Scene[], seed?: string) => void;
  nextDay: () => SettlementResult[];
  syncState: () => void;
  save: () => SaveData | null;
  load: (save: SaveData, allCards: Card[], allScenes: Scene[]) => void;
  reset: () => void;
  beginSettlement: () => void;
  advanceNarrative: () => void;
  handleNarrativeChoice: (nextStageId: string, effects?: Effects) => void;
  executeCurrentSettlement: (options?: {
    rerollIndices?: number[];
    goldenDiceUsed?: number;
    choiceIndex?: number;
  }) => void;
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
  lastSettlementResults: [],
  settlement: { ...initialSettlement },
};

export const useGameStore = create<GameStore>()((set, get) => ({
  ...initialState,

  startNewGame: (difficulty, cards, scenes, seed) => {
    const game = new GameManager(difficulty, seed);
    game.startNewGame(cards, scenes);
    set({ game });
    get().syncState();
  },

  nextDay: () => {
    const { game } = get();
    if (!game) return [];
    const results = game.nextDay();
    set({ lastSettlementResults: results });
    get().syncState();
    return results;
  },

  beginSettlement: () => {
    const { game } = get();
    if (!game) return;

    const { absencePenaltyResults, pendingSceneIds } = game.dayManager.beginSettlement();

    if (pendingSceneIds.length === 0) {
      set({
        lastSettlementResults: absencePenaltyResults,
        settlement: {
          ...initialSettlement,
          completedResults: absencePenaltyResults,
        },
      });
      game.dayManager.endDay();
      game.checkGameEnd();
      get().syncState();
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
        completedResults: [...absencePenaltyResults],
      },
    });
    get().syncState();
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
          get().syncState();
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
      get().syncState();
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
        result.type, result.result_key, result.effects_applied, result.dice_check_state,
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
    get().syncState();
  },

  advanceAfterSettlement: () => {
    const { settlement } = get();
    const runner = settlement.currentRunner;
    const stageResult = settlement.currentStageSettlementResult;
    if (!runner) return;

    let nextPlayback = null;
    if (stageResult?.result_key) {
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
    get().syncState();
  },

  syncState: () => {
    const { game } = get();
    if (!game) return;
    set({
      currentDay: game.timeManager.currentDay,
      gold: game.playerState.gold,
      reputation: game.playerState.reputation,
      goldenDice: game.playerState.goldenDice,
      rewindCharges: game.playerState.rewindCharges,
      thinkCharges: game.playerState.thinkCharges,
      executionCountdown: game.timeManager.executionCountdown,
      phase: game.dayManager.phase,
      isGameOver: game.isGameOver,
      endReason: game.endReason,
      handCardIds: game.cardManager.getCardIds(),
    });
  },

  save: () => {
    const { game } = get();
    if (!game) return null;
    return game.serialize();
  },

  load: (save, allCards, allScenes) => {
    const game = new GameManager();
    game.loadSave(save, allCards, allScenes);
    set({ game });
    get().syncState();
  },

  reset: () => {
    set({ ...initialState, settlement: { ...initialSettlement } });
  },
}));
