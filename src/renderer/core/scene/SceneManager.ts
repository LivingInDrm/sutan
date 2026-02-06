import type { Scene, SceneState, UnlockConditions } from '../types';
import { SceneStatus } from '../types/enums';
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

  registerScene(scene: Scene): void {
    this.scenes.set(scene.scene_id, scene);
  }

  registerScenes(scenes: Scene[]): void {
    scenes.forEach(s => this.registerScene(s));
  }

  activateScene(sceneId: string): boolean {
    const scene = this.scenes.get(sceneId);
    if (!scene) return false;

    if (!this.checkUnlockConditions(scene)) {
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
    const state = this.sceneStates.get(sceneId);
    if (!state || state.status !== SceneStatus.Available) return false;

    state.invested_cards = [...cardIds];
    state.status = SceneStatus.Participated;
    eventBus.emit('scene:participate', { sceneId, cardIds });
    return true;
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
      if (state.status === SceneStatus.Participated || state.status === SceneStatus.Available) {
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
      state.status = SceneStatus.Completed;
    }
  }

  removeCompletedScenes(): void {
    for (const [id, state] of this.sceneStates) {
      if (state.status === SceneStatus.Completed) {
        this.sceneStates.delete(id);
      }
    }
  }

  getExpiredUnparticipatedScenes(): string[] {
    const result: string[] = [];
    for (const [id, state] of this.sceneStates) {
      if (state.status === SceneStatus.Settling && state.invested_cards.length === 0) {
        result.push(id);
      }
    }
    return result;
  }

  private checkUnlockConditions(scene: Scene): boolean {
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
    return true;
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
  }

  getAllRegisteredSceneIds(): string[] {
    return Array.from(this.scenes.keys());
  }
}
