import { GameManager } from '../core/game/GameManager';
import { gameContentProvider } from './bootstrap';
import type {
  Card, Effects, SaveData, Scene, SettlementResult, StagePlayback,
} from '../core/types';
import type { StageSettlementResult } from '../core/settlement/SettlementExecutor';
import type { DiceRollResult } from '../core/types';
import type { GameStore, SettlementPlaybackState } from '../stores/gameStore';

type SetState = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;
type GetState = () => GameStore;

const initialSettlement = (): SettlementPlaybackState => ({
  isPlaying: false,
  pendingSceneIds: [],
  currentRunner: null,
  currentStagePlayback: null,
  narrativeIndex: 0,
  currentStageSettlementResult: null,
  completedResults: [],
});

const buildSceneResult = (
  settlement: SettlementPlaybackState,
): SettlementResult => {
  const runner = settlement.currentRunner;
  if (!runner) {
    throw new Error('No current scene runner');
  }

  return {
    scene_id: runner.sceneId,
    settlement_type: settlement.currentStageSettlementResult?.type || 'dice_check',
    result_key: settlement.currentStageSettlementResult?.result_key,
    effects_applied: settlement.currentStageSettlementResult?.effects_applied || {},
    narrative: settlement.currentStageSettlementResult?.narrative || '',
    dice_check_state: settlement.currentStageSettlementResult?.dice_check_state,
    all_stage_results: runner.allStageResults,
  };
};

const updateStagePlayback = (
  settlement: SettlementPlaybackState,
  currentStagePlayback: StagePlayback | null,
): SettlementPlaybackState => ({
  ...settlement,
  currentStagePlayback,
  narrativeIndex: 0,
  currentStageSettlementResult: null,
});

const withRefresh = (set: SetState, get: GetState, partial: Partial<GameStore>) => {
  set(partial);
  get().refreshDerivedState();
};

const recordSettlementResult = (
  result: StageSettlementResult | null,
  get: GetState,
  playback: StagePlayback,
) => {
  const { game, settlement } = get();
  const runner = settlement.currentRunner;
  if (!result || !game || !runner) return;

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
};

export const createGameFacade = (set: SetState, get: GetState) => ({
  startNewGame(difficulty: string, cards: Card[], scenes: Scene[], seed?: string) {
    const game = new GameManager(gameContentProvider, difficulty, seed);
    game.startNewGame(cards, scenes);
    withRefresh(set, get, { game });
  },

  load(save: SaveData, allCards: Card[], allScenes: Scene[]) {
    const game = new GameManager(gameContentProvider);
    game.loadSave(save, allCards, allScenes);
    withRefresh(set, get, { game });
  },

  importSave(saveJson: string, allCards?: Card[], allScenes?: Scene[]) {
    const game = new GameManager(gameContentProvider);
    game.importSave(saveJson, allCards, allScenes);
    withRefresh(set, get, { game });
  },

  beginSettlement() {
    const { game } = get();
    if (!game) return;

    const { pendingSceneIds } = game.dayManager.beginSettlement();
    if (pendingSceneIds.length === 0) {
      game.dayManager.endDay();
      game.checkGameEnd();
      withRefresh(set, get, {
        lastSettlementResults: [],
        settlement: { ...initialSettlement(), completedResults: [] },
      });
      return;
    }

    const firstSceneId = pendingSceneIds[0];
    const runner = game.createSceneRunner(firstSceneId);
    const playback = runner?.start() ?? null;

    withRefresh(set, get, {
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
  },

  advanceNarrative() {
    const { settlement, game } = get();
    const playback = settlement.currentStagePlayback;
    if (!playback) return;

    const nextIndex = settlement.narrativeIndex + 1;
    if (nextIndex < playback.narrative.length) {
      const node = playback.narrative[nextIndex];
      if (node.type === 'effect' && game) {
        const runner = settlement.currentRunner;
        const sceneState = runner ? game.sceneManager.getSceneState(runner.sceneId) : null;
        game.settlementExecutor.applyEffects(node.effects, sceneState?.invested_cards || []);
        get().refreshDerivedState();
      }
      set({ settlement: { ...settlement, narrativeIndex: nextIndex } });
      return;
    }

    if (playback.hasSettlement) {
      set({ settlement: { ...settlement, narrativeIndex: nextIndex } });
      return;
    }

    const runner = settlement.currentRunner;
    if (!runner) return;

    runner.recordStageNarrative(playback.narrative);
    const nextPlayback = runner.advanceAfterNarrativeOnly();
    if (nextPlayback) {
      set({ settlement: updateStagePlayback(settlement, nextPlayback) });
      return;
    }

    this.finishCurrentScene();
  },

  handleNarrativeChoice(nextStageId: string, effects?: Effects) {
    const { settlement, game } = get();
    const runner = settlement.currentRunner;
    if (!runner || !game) return;

    if (effects) {
      const sceneState = game.sceneManager.getSceneState(runner.sceneId);
      game.settlementExecutor.applyEffects(effects, sceneState?.invested_cards || []);
      get().refreshDerivedState();
    }

    if (settlement.currentStagePlayback) {
      runner.recordStageNarrative(settlement.currentStagePlayback.narrative);
    }

    const nextPlayback = runner.advanceByChoice(nextStageId);
    if (nextPlayback) {
      set({ settlement: updateStagePlayback(settlement, nextPlayback) });
      return;
    }

    this.finishCurrentScene();
  },

  executeCurrentSettlement(options?: {
    goldenDiceUsed?: number;
    choiceIndex?: number;
    externalRoll?: DiceRollResult;
  }) {
    const { settlement, game } = get();
    const runner = settlement.currentRunner;
    const playback = settlement.currentStagePlayback;
    if (!runner || !playback || !game) return;

    const result = game.settlementExecutor.executeStageSettlement(
      runner.sceneId,
      playback.stageId,
      options,
    );

    recordSettlementResult(result, get, playback);
    withRefresh(set, get, {
      settlement: { ...settlement, currentStageSettlementResult: result },
    });
  },

  executeCurrentSettlementWithDice(dice: number[], options?: { goldenDiceUsed?: number }) {
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

    recordSettlementResult(result, get, playback);
    withRefresh(set, get, {
      settlement: { ...settlement, currentStageSettlementResult: result },
    });
  },

  rerollCurrentSettlementDice(baseDice: number[], options?: { goldenDiceUsed?: number }) {
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

  getCurrentDiceCheckPreview() {
    const { settlement, game } = get();
    const runner = settlement.currentRunner;
    const playback = settlement.currentStagePlayback;
    if (!runner || !playback || !game) return null;

    return game.settlementExecutor.getDiceInteractionPreview(runner.sceneId, playback.stageId);
  },

  advanceAfterSettlement() {
    const { settlement } = get();
    const runner = settlement.currentRunner;
    const stageResult = settlement.currentStageSettlementResult;
    if (!runner) return;

    const nextPlayback = stageResult?.next_stage
      ? runner.advanceByChoice(stageResult.next_stage)
      : stageResult?.result_key
        ? runner.advanceAfterSettlement(stageResult.result_key)
        : runner.advanceAfterNarrativeOnly();

    if (nextPlayback) {
      set({ settlement: updateStagePlayback(settlement, nextPlayback) });
      return;
    }

    this.finishCurrentScene();
  },

  finishCurrentScene() {
    const { settlement, game } = get();
    const runner = settlement.currentRunner;
    if (!runner || !game) return;

    game.sceneManager.completeScene(runner.sceneId);
    const newCompleted = [...settlement.completedResults, buildSceneResult(settlement)];

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
      return;
    }

    set({
      settlement: { ...initialSettlement(), completedResults: newCompleted },
      lastSettlementResults: newCompleted,
    });
    this.finishAllSettlement();
  },

  finishAllSettlement() {
    const { game, settlement } = get();
    if (!game) return;

    game.dayManager.endDay();
    game.checkGameEnd();
    withRefresh(set, get, {
      lastSettlementResults: settlement.completedResults,
      settlement: initialSettlement(),
    });
  },
});