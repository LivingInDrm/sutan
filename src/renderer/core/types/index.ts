import {
  Rarity, Attribute, SpecialAttribute, CardType, EquipmentType,
  SceneType, SceneStatus, CheckResult, CalcMode, SlotType,
  ReputationLevel, GamePhase, GameEndReason, NarrativeNodeType,
} from './enums';

export type Attributes = Record<Attribute, number>;
export type SpecialAttributes = Partial<Record<SpecialAttribute, number>>;
export type AttributeBonus = Partial<Record<Attribute, number>>;
export type SpecialBonus = Partial<Record<SpecialAttribute, number>>;

export interface Card {
  card_id: string;
  name: string;
  type: CardType;
  rarity: Rarity;
  description: string;
  image: string;
  attributes?: Attributes;
  special_attributes?: SpecialAttributes;
  tags?: string[];
  equipment_slots?: number;
  equipment_type?: EquipmentType;
  attribute_bonus?: AttributeBonus;
  special_bonus?: SpecialBonus;
  gem_slots?: number;
}

export interface Slot {
  type: SlotType;
  required: boolean;
  locked: boolean;
  card_id?: string;
}

export interface Effects {
  gold?: number;
  reputation?: number;
  cards_add?: string[];
  cards_remove?: string[];
  tags_add?: Record<string, string[]>;
  tags_remove?: Record<string, string[]>;
  unlock_scenes?: string[];
  consume_invested?: boolean;
}

export interface SettlementResultBranch {
  narrative: string;
  effects: Effects;
}

export interface DiceCheckConfig {
  attribute: Attribute;
  calc_mode: CalcMode;
  target: number;
}

export interface ChoiceOption {
  label: string;
  effects: Effects;
}

export interface DiceCheckSettlement {
  type: 'dice_check';
  narrative?: string;
  check: DiceCheckConfig;
  results: Record<CheckResult, SettlementResultBranch>;
}

export interface TradeSettlement {
  type: 'trade';
  shop_inventory: string[];
  allow_sell: boolean;
  refresh_cycle?: number;
}

export interface ChoiceSettlement {
  type: 'choice';
  narrative?: string;
  options: ChoiceOption[];
}

export type Settlement = DiceCheckSettlement | TradeSettlement | ChoiceSettlement;

export interface DialogueNode {
  type: 'dialogue';
  speaker?: string;
  text: string;
  portrait?: string;
}

export interface NarrationNode {
  type: 'narration';
  text: string;
}

export interface EffectNode {
  type: 'effect';
  effects: Effects;
  text?: string;
}

export interface NarrativeChoiceOption {
  label: string;
  next_stage?: string;
  effects?: Effects;
}

export interface ChoiceNode {
  type: 'choice';
  text: string;
  options: NarrativeChoiceOption[];
}

export type NarrativeNode = DialogueNode | NarrationNode | EffectNode | ChoiceNode;

export interface StageBranch {
  condition: CheckResult | 'default';
  next_stage: string;
}

export interface Stage {
  stage_id: string;
  narrative: NarrativeNode[];
  settlement?: Settlement;
  branches?: StageBranch[];
  is_final?: boolean;
}

export interface StagePlayback {
  stageId: string;
  narrative: NarrativeNode[];
  hasSettlement: boolean;
  settlementConfig?: Settlement;
}

export interface UnlockConditions {
  reputation_min?: number;
  required_tags?: string[];
}

export interface AbsencePenalty {
  effects: Effects;
  narrative: string;
}

export interface Scene {
  scene_id: string;
  name: string;
  description: string;
  background_image: string;
  type: SceneType;
  duration: number;
  slots: Slot[];
  stages: Stage[];
  entry_stage: string;
  unlock_conditions?: UnlockConditions;
  absence_penalty?: AbsencePenalty | null;
}

export interface SceneState {
  remaining_turns: number;
  invested_cards: string[];
  status: SceneStatus;
  current_stage?: string;
  stage_results?: Record<string, CheckResult>;
}

export interface GameState {
  current_day: number;
  execution_countdown: number;
  gold: number;
  reputation: number;
  rewind_charges: number;
  golden_dice: number;
  think_charges: number;
  phase: GamePhase;
  seed: string;
}

export interface CardsState {
  hand: string[];
  equipped: Record<string, string[]>;
  locked_in_scenes: Record<string, string[]>;
  think_used_today: string[];
}

export interface ScenesState {
  active: string[];
  completed: string[];
  scene_states: Record<string, SceneState>;
}

export interface SaveData {
  save_id: string;
  timestamp: string;
  game_state: GameState;
  cards: CardsState;
  scenes: ScenesState;
  achievements_unlocked: string[];
  npc_relations: Record<string, number>;
}

export interface DiceRollResult {
  dice: number[];
  exploded_dice: number[];
  all_dice: number[];
  successes: number;
  reroll_available: number;
}

export interface DiceCheckState {
  config: DiceCheckConfig;
  pool_size: number;
  initial_roll: DiceRollResult;
  after_reroll?: DiceRollResult;
  golden_dice_used: number;
  final_successes: number;
  result: CheckResult;
}

export interface SettlementResult {
  scene_id: string;
  settlement_type: Settlement['type'];
  result_key?: CheckResult;
  effects_applied: Effects;
  narrative: string;
  dice_check_state?: DiceCheckState;
  stage_id?: string;
  all_stage_results?: StageResult[];
}

export interface StageResult {
  stage_id: string;
  narrative_played: NarrativeNode[];
  settlement_result?: {
    type: Settlement['type'];
    result_key?: CheckResult;
    effects_applied: Effects;
    dice_check_state?: DiceCheckState;
  };
}

export interface Difficulty {
  execution_days: number;
  initial_gold: number;
  initial_cards: number;
  enemy_multiplier: number;
}

export const DIFFICULTIES: Record<string, Difficulty> = {
  easy: { execution_days: 21, initial_gold: 50, initial_cards: 5, enemy_multiplier: 0.8 },
  normal: { execution_days: 14, initial_gold: 30, initial_cards: 3, enemy_multiplier: 1.0 },
  hard: { execution_days: 7, initial_gold: 15, initial_cards: 2, enemy_multiplier: 1.2 },
  nightmare: { execution_days: 5, initial_gold: 10, initial_cards: 1, enemy_multiplier: 1.5 },
};

export type { Rarity, Attribute, SpecialAttribute, CardType, EquipmentType,
  SceneType, SceneStatus, CheckResult, CalcMode, SlotType,
  ReputationLevel, GamePhase, GameEndReason, NarrativeNodeType } from './enums';
