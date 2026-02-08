import type {
  Scene, SceneState, Stage, Settlement, NarrativeNode,
  StagePlayback, StageResult, Effects,
} from '../types';
import { CheckResult } from '../types/enums';
import { eventBus } from '../../lib/events';

export class SceneRunner {
  private scene: Scene;
  private sceneState: SceneState;
  private stagesMap: Map<string, Stage>;
  private currentStageId: string | null = null;
  private _isComplete: boolean = false;
  private stageHistory: StageResult[] = [];

  constructor(scene: Scene, sceneState: SceneState) {
    this.scene = scene;
    this.sceneState = sceneState;
    this.stagesMap = new Map(scene.stages.map(s => [s.stage_id, s]));
  }

  get sceneId(): string {
    return this.scene.scene_id;
  }

  get isComplete(): boolean {
    return this._isComplete;
  }

  get allStageResults(): StageResult[] {
    return [...this.stageHistory];
  }

  start(): StagePlayback | null {
    const entryStageId = this.sceneState.current_stage || this.scene.entry_stage;
    return this.enterStage(entryStageId);
  }

  advanceAfterSettlement(result: CheckResult): StagePlayback | null {
    const stage = this.getCurrentStage();
    if (!stage) {
      this._isComplete = true;
      return null;
    }

    if (stage.is_final || !stage.branches || stage.branches.length === 0) {
      this._isComplete = true;
      return null;
    }

    const branch = stage.branches.find(b => b.condition === result)
      || stage.branches.find(b => b.condition === 'default');

    if (!branch) {
      this._isComplete = true;
      return null;
    }

    eventBus.emit('stage:complete', { sceneId: this.scene.scene_id, stageId: stage.stage_id });
    return this.enterStage(branch.next_stage);
  }

  advanceByChoice(nextStageId: string): StagePlayback | null {
    const stage = this.getCurrentStage();
    if (stage) {
      eventBus.emit('stage:complete', { sceneId: this.scene.scene_id, stageId: stage.stage_id });
    }
    return this.enterStage(nextStageId);
  }

  advanceAfterNarrativeOnly(): StagePlayback | null {
    const stage = this.getCurrentStage();
    if (!stage) {
      this._isComplete = true;
      return null;
    }

    if (stage.is_final) {
      this._isComplete = true;
      return null;
    }

    if (stage.branches && stage.branches.length > 0) {
      const defaultBranch = stage.branches.find(b => b.condition === 'default');
      if (defaultBranch) {
        eventBus.emit('stage:complete', { sceneId: this.scene.scene_id, stageId: stage.stage_id });
        return this.enterStage(defaultBranch.next_stage);
      }
    }

    this._isComplete = true;
    return null;
  }

  hasSettlement(): boolean {
    const stage = this.getCurrentStage();
    return !!stage?.settlement;
  }

  getSettlementConfig(): Settlement | undefined {
    return this.getCurrentStage()?.settlement;
  }

  getCurrentStageId(): string | null {
    return this.currentStageId;
  }

  recordStageNarrative(narrativePlayed: NarrativeNode[]): void {
    if (!this.currentStageId) return;
    const existing = this.stageHistory.find(r => r.stage_id === this.currentStageId);
    if (!existing) {
      this.stageHistory.push({
        stage_id: this.currentStageId,
        narrative_played: narrativePlayed,
      });
    }
  }

  recordStageSettlement(
    type: Settlement['type'],
    resultKey?: CheckResult,
    effectsApplied?: Effects,
    diceCheckState?: import('../types').DiceCheckState,
  ): void {
    if (!this.currentStageId) return;
    const existing = this.stageHistory.find(r => r.stage_id === this.currentStageId);
    if (existing) {
      existing.settlement_result = {
        type,
        result_key: resultKey,
        effects_applied: effectsApplied || {},
        dice_check_state: diceCheckState,
      };
    }
  }

  private enterStage(stageId: string): StagePlayback | null {
    const stage = this.stagesMap.get(stageId);
    if (!stage) {
      this._isComplete = true;
      return null;
    }

    this.currentStageId = stageId;
    this.sceneState.current_stage = stageId;

    eventBus.emit('stage:start', { sceneId: this.scene.scene_id, stageId });

    return {
      stageId: stage.stage_id,
      narrative: stage.narrative,
      hasSettlement: !!stage.settlement,
      settlementConfig: stage.settlement,
    };
  }

  private getCurrentStage(): Stage | undefined {
    if (!this.currentStageId) return undefined;
    return this.stagesMap.get(this.currentStageId);
  }
}
