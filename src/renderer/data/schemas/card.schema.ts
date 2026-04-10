import { z } from 'zod/v4';
import {
  Attribute,
  CardType,
  EquipmentType,
  Rarity,
  SpecialAttribute,
} from '../../core/types/enums';

const RarityEnum = z.enum([
  Rarity.Common,
  Rarity.Rare,
  Rarity.Epic,
  Rarity.Legendary,
  Rarity.Gold,
  Rarity.Silver,
  Rarity.Copper,
  Rarity.Stone,
  Rarity.Divine,
]);

const CardTypeEnum = z.enum([
  CardType.Character,
  CardType.Equipment,
  CardType.Intel,
  CardType.Consumable,
  CardType.Book,
  CardType.Thought,
  CardType.Gem,
  CardType.Sultan,
]);

const EquipmentTypeEnum = z.enum([
  EquipmentType.Weapon,
  EquipmentType.Armor,
  EquipmentType.Accessory,
  EquipmentType.Mount,
]);

export const AttributesSchema = z.object({
  physique: z.number().int().min(1).max(50),
  charm: z.number().int().min(1).max(50),
  wisdom: z.number().int().min(1).max(50),
  combat: z.number().int().min(1).max(50),
  social: z.number().int().min(1).max(50),
  survival: z.number().int().min(1).max(50),
  stealth: z.number().int().min(1).max(50),
  magic: z.number().int().min(1).max(50),
});

export const SpecialAttributesSchema = z.object({
  support: z.number().int().min(-10).max(10).optional(),
  reroll: z.number().int().min(0).max(10).optional(),
}) satisfies z.ZodType<Partial<Record<SpecialAttribute, number>>>;

export const AttributeBonusSchema = z.object({
  physique: z.number().int().optional(),
  charm: z.number().int().optional(),
  wisdom: z.number().int().optional(),
  combat: z.number().int().optional(),
  social: z.number().int().optional(),
  survival: z.number().int().optional(),
  stealth: z.number().int().optional(),
  magic: z.number().int().optional(),
});

export const SpecialBonusSchema = z.object({
  support: z.number().int().optional(),
  reroll: z.number().int().optional(),
}) satisfies z.ZodType<Partial<Record<SpecialAttribute, number>>>;

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
  meta: z.unknown().optional(),
});

export const CardCollectionSchema = z.union([
  z.array(CardSchema),
  z.object({
    cards: z.array(CardSchema),
  }),
]);

export function parseCard(raw: unknown) {
  return CardSchema.parse(raw);
}

export function parseCardCollection(raw: unknown) {
  const parsed = CardCollectionSchema.parse(raw);
  return Array.isArray(parsed) ? parsed : parsed.cards;
}