import { create } from 'zustand';
import { GameManager } from '../core/game/GameManager';
import type { Card, Scene, SaveData, SettlementResult } from '../core/types';
import { GamePhase, GameEndReason } from '../core/types/enums';

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
}

interface GameStoreActions {
  startNewGame: (difficulty: string, cards: Card[], scenes: Scene[], seed?: string) => void;
  nextDay: () => SettlementResult[];
  syncState: () => void;
  save: () => SaveData | null;
  load: (save: SaveData, allCards: Card[], allScenes: Scene[]) => void;
  reset: () => void;
}

type GameStore = GameStoreState & GameStoreActions;

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
    set({ ...initialState });
  },
}));
