import type { Scene, SceneState, UnlockConditions } from '../types';
import { SceneStatus, CheckResult } from '../types/enums';
import { PlayerState } from '../player/PlayerState';
import { CardManager } from '../card/CardManager';
import { eventBus } from '../../lib/events';

export class SceneManager {
  private scenes: Map<string, Scene> = new Map();
  private sceneStates: Map<string, SceneState> = new Map();
  private playerState: PlayerState;
  private cardManager: CardManager;

  constructor(playerState: PlayerState, cardManager: CardManager) {
    this.playerState = playerState;
    this.cardManager = cardManager;
  }

  refreshScene(sceneId: string, currentDay: number): void {
    const scene = this.scenes.get(sceneId);
    if (!scene) return;

    const state = this.sceneStates.get(sceneId);
    if (state && (
      state.status === SceneStatus.Participated ||
      state.status === SceneStatus.Settling ||
      state.status === SceneStatus.Completed
    )) {
      return;
    }

    if (this.isSceneExpiredByDayRange(scene, currentDay)) {
      this.sceneStates.delete(sceneId);
      return;
    }

    if (!this.checkUnlockConditions(scene, currentDay)) {
      this.sceneStates.set(sceneId, {
        remaining_turns: scene.duration,
        invested_cards: [],
        status: SceneStatus.Locked,
      });
      return;
    }

    const nextStatus = state?.status === SceneStatus.Available ? state.status : SceneStatus.Available;
    this.sceneStates.set(sceneId, {
      remaining_turns: scene.duration,
      invested_cards: [],
      status: nextStatus,
    });
    if (state?.status !== SceneStatus.Available) {
      eventBus.emit('scene:unlock', { sceneId });
    }
  }

  registerScene(scene: Scene): void {
    this.scenes.set(scene.scene_id, scene);
  }

  registerScenes(scenes: Scene[]): void {
    scenes.forEach(s => this.registerScene(s));
  }

  activateScene(sceneId: string, currentDay: number = 1): boolean {
    const scene = this.scenes.get(sceneId);
    if (!scene) return false;

    if (this.isSceneExpiredByDayRange(scene, currentDay)) {
      this.sceneStates.delete(sceneId);
      return false;
    }

    if (!this.checkUnlockConditions(scene, currentDay)) {
      this.sceneStates.set(sceneId, {
        remaining_turns: scene.duration,
        invested_cards: [],
        status: SceneStatus.Locked,
      });
      return false;
    }

    this.sceneStates.set(sceneId, {
      remaining_turns: scene.duration,
      invested_cards: [],
      status: SceneStatus.Available,
    });
    eventBus.emit('scene:unlock', { sceneId });
    return true;
  }

  participateScene(sceneId: string, cardIds: string[]): boolean {
    const scene = this.scenes.get(sceneId);
    const state = this.sceneStates.get(sceneId);
    if (!scene || !state || state.status !== SceneStatus.Available) return false;

    for (const cardId of cardIds) {
      if (this.isCardLocked(cardId)) return false;
    }

    state.invested_cards = [...cardIds];
    state.status = SceneStatus.Participated;
    state.current_stage = scene.entry_stage;
    state.remaining_turns = scene.duration;
    this.cardManager.lockCards(cardIds);
    eventBus.emit('scene:participate', { sceneId, cardIds });
    return true;
  }

  isCardLocked(cardId: string): boolean {
    return this.cardManager.isCardLocked(cardId);
  }

  getLockedCardIds(): Set<string> {
    return new Set(this.cardManager.getLockedCardIds());
  }

  getScene(sceneId: string): Scene | undefined {
    return this.scenes.get(sceneId);
  }

  getSceneState(sceneId: string): SceneState | undefined {
    return this.sceneStates.get(sceneId);
  }

  getAvailableScenes(): string[] {
    const result: string[] = [];
    for (const [id, state] of this.sceneStates) {
      if (state.status === SceneStatus.Available) {
        result.push(id);
      }
    }
    return result;
  }

  getParticipatedScenes(): string[] {
    const result: string[] = [];
    for (const [id, state] of this.sceneStates) {
      if (state.status === SceneStatus.Participated) {
        result.push(id);
      }
    }
    return result;
  }

  decrementRemainingTurns(): string[] {
    const settled: string[] = [];
    for (const [id, state] of this.sceneStates) {
      if (state.status === SceneStatus.Participated) {
        state.remaining_turns -= 1;
        if (state.remaining_turns <= 0) {
          state.status = SceneStatus.Settling;
          settled.push(id);
        }
      }
    }
    return settled;
  }

  completeScene(sceneId: string): void {
    const state = this.sceneStates.get(sceneId);
    if (state) {
      this.cardManager.unlockCards(state.invested_cards);
      state.status = SceneStatus.Completed;
    }
  }

  removeCompletedScenes(): void {
    for (const [, state] of this.sceneStates) {
      if (state.status === SceneStatus.Completed) {
        state.invested_cards = [];
      }
    }
  }

  private checkUnlockConditions(scene: Scene, currentDay: number): boolean {
    if (!scene.unlock_conditions) return true;
    const conditions = scene.unlock_conditions;
    if (conditions.reputation_min !== undefined) {
      if (this.playerState.reputation < conditions.reputation_min) return false;
    }
    if (conditions.required_tags && conditions.required_tags.length > 0) {
      const allCards = this.cardManager.getAllCards();
      for (const tag of conditions.required_tags) {
        if (!allCards.some(c => c.hasTag(tag))) return false;
      }
    }
    if (conditions.required_cards && conditions.required_cards.length > 0) {
      for (const cardId of conditions.required_cards) {
        if (!this.cardManager.hasCard(cardId)) return false;
      }
    }
    if (conditions.required_items && conditions.required_items.length > 0) {
      for (const itemId of conditions.required_items) {
        const card = this.cardManager.getCard(itemId);
        if (!card || !card.isEquipment) return false;
      }
    }
    if (conditions.day_range) {
      const [minDay, maxDay] = conditions.day_range;
      if (currentDay < minDay || currentDay > maxDay) return false;
    }
    return true;
  }

  private isSceneExpiredByDayRange(scene: Scene, currentDay: number): boolean {
    const dayRange = scene.unlock_conditions?.day_range;
    return Boolean(dayRange && currentDay > dayRange[1]);
  }

  updateCurrentStage(sceneId: string, stageId: string): void {
    const state = this.sceneStates.get(sceneId);
    if (state) {
      state.current_stage = stageId;
    }
  }

  recordStageResult(sceneId: string, stageId: string, result: CheckResult): void {
    const state = this.sceneStates.get(sceneId);
    if (state) {
      if (!state.stage_results) {
        state.stage_results = {};
      }
      state.stage_results[stageId] = result;
    }
  }

  getActiveSceneIds(): string[] {
    const result: string[] = [];
    for (const [id, state] of this.sceneStates) {
      if (state.status !== SceneStatus.Completed) {
        result.push(id);
      }
    }
    return result;
  }

  getSceneStatesMap(): Record<string, SceneState> {
    const result: Record<string, SceneState> = {};
    for (const [id, state] of this.sceneStates) {
      result[id] = { ...state };
    }
    return result;
  }

  loadSceneStates(states: Record<string, SceneState>): void {
    this.sceneStates.clear();
    for (const [id, state] of Object.entries(states)) {
      this.sceneStates.set(id, { ...state });
    }
    this.syncLockedCardsFromStates();
  }

  getAllRegisteredSceneIds(): string[] {
    return Array.from(this.scenes.keys());
  }

  private syncLockedCardsFromStates(): void {
    const lockedCardIds: string[] = [];
    for (const [, state] of this.sceneStates) {
      if (state.status === SceneStatus.Participated || state.status === SceneStatus.Settling) {
        lockedCardIds.push(...state.invested_cards);
      }
    }
    this.cardManager.setLockedCards(lockedCardIds);
  }
}
