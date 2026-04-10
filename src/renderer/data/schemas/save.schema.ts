import { z } from 'zod/v4';
import {
  GamePhase,
  CheckResult,
} from '../../core/types/enums';
import { SceneStatusEnum } from './scene.schema';

const GamePhaseEnum = z.enum([
  GamePhase.Dawn,
  GamePhase.Action,
  GamePhase.Settlement,
]);

const CheckResultEnum = z.enum([
  CheckResult.Success,
  CheckResult.PartialSuccess,
  CheckResult.Failure,
  CheckResult.CriticalFailure,
]);

const SaveGameStateSchema = z.object({
  current_day: z.number().int().min(1),
  execution_countdown: z.number().int().min(0),
  gold: z.number().int(),
  reputation: z.number().int(),
  rewind_charges: z.number().int().min(0),
  golden_dice: z.number().int().min(0),
  think_charges: z.number().int().min(0),
  phase: GamePhaseEnum,
  seed: z.string().min(1),
});

const CardsStateSchema = z.object({
  hand: z.array(z.string()),
  equipped: z.record(z.string(), z.array(z.string())),
  locked_in_scenes: z.record(z.string(), z.array(z.string())),
  think_used_today: z.array(z.string()),
});

const SceneStateSchema = z.object({
  remaining_turns: z.number().int().min(0),
  invested_cards: z.array(z.string()),
  status: SceneStatusEnum,
  current_stage: z.string().optional(),
  stage_results: z.record(z.string(), CheckResultEnum).optional(),
});

const ScenesStateSchema = z.object({
  active: z.array(z.string()),
  completed: z.array(z.string()),
  scene_states: z.record(z.string(), SceneStateSchema),
});

export const SaveDataSchema = z.object({
  save_id: z.string().min(1),
  timestamp: z.string().min(1),
  game_state: SaveGameStateSchema,
  cards: CardsStateSchema,
  scenes: ScenesStateSchema,
  achievements_unlocked: z.array(z.string()),
  npc_relations: z.record(z.string(), z.number().int()),
  runtime_state: z.unknown().optional(),
});

export function parseSaveData(raw: unknown) {
  return SaveDataSchema.parse(raw);
}