import { create } from 'zustand';
import { GameManager } from '../core/game/GameManager';
import { SceneRunner } from '../core/scene/SceneRunner';
import { createGameFacade } from '../app/gameFacade';
import type {
  Card, Scene, SaveData, SettlementResult, StagePlayback,
  Effects,
} from '../core/types';
import { GamePhase, GameEndReason } from '../core/types/enums';
import type { StageSettlementResult } from '../core/settlement/SettlementExecutor';
import type { DiceRollResult } from '../core/types';

const getGameSelectorValue = <T>(game: GameManager | null, selector: (game: GameManager) => T, fallback: T): T => (
  game ? selector(game) : fallback
);

export interface SettlementPlaybackState {
  isPlaying: boolean;
  pendingSceneIds: string[];
  currentRunner: SceneRunner | null;
  currentStagePlayback: StagePlayback | null;
  narrativeIndex: number;
  currentStageSettlementResult: StageSettlementResult | null;
  completedResults: SettlementResult[];
}

export interface GameStoreState {
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

export type GameStore = GameStoreState & GameStoreActions;

export const initialSettlement: SettlementPlaybackState = {
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

export const useGameStore = create<GameStore>()((set, get) => {
  const facade = createGameFacade(
    (partial) => set(partial as Partial<GameStore>),
    get,
  );

  return ({
  ...initialState,

  startNewGame: facade.startNewGame,

  nextDay: () => {
    const { game } = get();
    if (!game) return [];
    const results = game.nextDay();
    set({ lastSettlementResults: results });
    get().refreshDerivedState();
    return results;
  },

  beginSettlement: facade.beginSettlement,

  advanceNarrative: facade.advanceNarrative,

  handleNarrativeChoice: facade.handleNarrativeChoice,

  executeCurrentSettlement: facade.executeCurrentSettlement,

  executeCurrentSettlementWithDice: facade.executeCurrentSettlementWithDice,

  getCurrentDiceCheckPreview: () => {
    const { settlement, game } = get();
    const runner = settlement.currentRunner;
    const playback = settlement.currentStagePlayback;
    if (!runner || !playback || !game) return null;

    return game.settlementExecutor.getDiceInteractionPreview(runner.sceneId, playback.stageId);
  },

  rerollCurrentSettlementDice: facade.rerollCurrentSettlementDice,

  advanceAfterSettlement: facade.advanceAfterSettlement,
  finishCurrentScene: facade.finishCurrentScene,
  finishAllSettlement: facade.finishAllSettlement,

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

  load: facade.load,
  importSave: facade.importSave,

  reset: () => {
    set({ ...initialState, settlement: { ...initialSettlement } });
  },
  });
});

