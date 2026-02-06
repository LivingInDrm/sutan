import { z } from 'zod/v4';
import {
  Rarity, Attribute, CardType, EquipmentType, SceneType,
  SceneStatus, CheckResult, CalcMode, SlotType,
} from '../../core/types/enums';

const RarityEnum = z.enum([Rarity.Gold, Rarity.Silver, Rarity.Copper, Rarity.Stone]);
const CardTypeEnum = z.enum([
  CardType.Character, CardType.Equipment, CardType.Intel,
  CardType.Consumable, CardType.Book, CardType.Thought,
  CardType.Gem, CardType.Sultan,
]);
const EquipmentTypeEnum = z.enum([
  EquipmentType.Weapon, EquipmentType.Armor,
  EquipmentType.Accessory, EquipmentType.Mount,
]);
const AttributeEnum = z.enum([
  Attribute.Physique, Attribute.Charm, Attribute.Wisdom, Attribute.Combat,
  Attribute.Social, Attribute.Survival, Attribute.Stealth, Attribute.Magic,
]);
const SceneTypeEnum = z.enum([SceneType.Event, SceneType.Shop, SceneType.Challenge]);
const SceneStatusEnum = z.enum([
  SceneStatus.Available, SceneStatus.Participated,
  SceneStatus.Settling, SceneStatus.Completed, SceneStatus.Locked,
]);
const CheckResultEnum = z.enum([
  CheckResult.Success, CheckResult.PartialSuccess,
  CheckResult.Failure, CheckResult.CriticalFailure,
]);
const CalcModeEnum = z.enum([
  CalcMode.Max, CalcMode.Sum, CalcMode.Min,
  CalcMode.Avg, CalcMode.First, CalcMode.Specific,
]);
const SlotTypeEnum = z.enum([
  SlotType.Character, SlotType.Item, SlotType.Sultan, SlotType.Gold,
]);

const AttributesSchema = z.object({
  physique: z.number().int().min(1).max(50),
  charm: z.number().int().min(1).max(50),
  wisdom: z.number().int().min(1).max(50),
  combat: z.number().int().min(1).max(50),
  social: z.number().int().min(1).max(50),
  survival: z.number().int().min(1).max(50),
  stealth: z.number().int().min(1).max(50),
  magic: z.number().int().min(1).max(50),
});

const SpecialAttributesSchema = z.object({
  support: z.number().int().min(-10).max(10).optional(),
  reroll: z.number().int().min(0).max(10).optional(),
});

const AttributeBonusSchema = z.object({
  physique: z.number().int().optional(),
  charm: z.number().int().optional(),
  wisdom: z.number().int().optional(),
  combat: z.number().int().optional(),
  social: z.number().int().optional(),
  survival: z.number().int().optional(),
  stealth: z.number().int().optional(),
  magic: z.number().int().optional(),
});
const SpecialBonusSchema = z.object({
  support: z.number().int().optional(),
  reroll: z.number().int().optional(),
});

export const CardSchema = z.object({
  card_id: z.string().min(1),
  name: z.string().min(1),
  type: CardTypeEnum,
  rarity: RarityEnum,
  description: z.string(),
  image: z.string(),
  attributes: AttributesSchema.optional(),
  special_attributes: SpecialAttributesSchema.optional(),
  tags: z.array(z.string()).optional(),
  equipment_slots: z.number().int().min(0).optional(),
  equipment_type: EquipmentTypeEnum.optional(),
  attribute_bonus: AttributeBonusSchema.optional(),
  special_bonus: SpecialBonusSchema.optional(),
  gem_slots: z.number().int().min(0).optional(),
});

const EffectsSchema = z.object({
  gold: z.number().int().optional(),
  reputation: z.number().int().optional(),
  cards_add: z.array(z.string()).optional(),
  cards_remove: z.array(z.string()).optional(),
  tags_add: z.record(z.string(), z.array(z.string())).optional(),
  tags_remove: z.record(z.string(), z.array(z.string())).optional(),
  unlock_scenes: z.array(z.string()).optional(),
  consume_invested: z.boolean().optional(),
});

const SettlementResultBranchSchema = z.object({
  narrative: z.string(),
  effects: EffectsSchema,
});

const SlotSchema = z.object({
  type: SlotTypeEnum,
  required: z.boolean(),
  locked: z.boolean(),
});

const DiceCheckConfigSchema = z.object({
  attribute: AttributeEnum,
  calc_mode: CalcModeEnum,
  target: z.number().int().min(1),
});

const ChoiceOptionSchema = z.object({
  label: z.string().min(1),
  effects: EffectsSchema,
});

const DiceCheckSettlementSchema = z.object({
  type: z.literal('dice_check'),
  narrative: z.string().optional(),
  check: DiceCheckConfigSchema,
  results: z.object({
    success: SettlementResultBranchSchema,
    partial_success: SettlementResultBranchSchema,
    failure: SettlementResultBranchSchema,
    critical_failure: SettlementResultBranchSchema,
  }),
});

const TradeSettlementSchema = z.object({
  type: z.literal('trade'),
  shop_inventory: z.array(z.string()),
  allow_sell: z.boolean(),
  refresh_cycle: z.number().int().optional(),
});

const ChoiceSettlementSchema = z.object({
  type: z.literal('choice'),
  narrative: z.string().optional(),
  options: z.array(ChoiceOptionSchema).min(1),
});

const SettlementSchema = z.discriminatedUnion('type', [
  DiceCheckSettlementSchema,
  TradeSettlementSchema,
  ChoiceSettlementSchema,
]);

const UnlockConditionsSchema = z.object({
  reputation_min: z.number().int().optional(),
  required_tags: z.array(z.string()).optional(),
});

const AbsencePenaltySchema = z.object({
  effects: EffectsSchema,
  narrative: z.string(),
});

export const SceneSchema = z.object({
  scene_id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  background_image: z.string(),
  type: SceneTypeEnum,
  duration: z.number().int().min(1),
  slots: z.array(SlotSchema),
  settlement: SettlementSchema,
  unlock_conditions: UnlockConditionsSchema.optional(),
  absence_penalty: AbsencePenaltySchema.nullable().optional(),
});

const GameStateSchema = z.object({
  current_day: z.number().int().min(1),
  execution_countdown: z.number().int(),
  gold: z.number().int(),
  reputation: z.number().int().min(0).max(100),
  rewind_charges: z.number().int().min(0),
  golden_dice: z.number().int().min(0),
  think_charges: z.number().int().min(0),
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
});

const ScenesStateSchema = z.object({
  active: z.array(z.string()),
  completed: z.array(z.string()),
  scene_states: z.record(z.string(), SceneStateSchema),
});

export const SaveDataSchema = z.object({
  save_id: z.string().min(1),
  timestamp: z.string(),
  game_state: GameStateSchema,
  cards: CardsStateSchema,
  scenes: ScenesStateSchema,
  achievements_unlocked: z.array(z.string()),
  npc_relations: z.record(z.string(), z.number()),
});

export {
  EffectsSchema,
  SlotSchema,
  DiceCheckConfigSchema,
  AttributesSchema,
  SpecialAttributesSchema,
};
