import type { Card, Attributes, AttributeBonus, SpecialAttributes } from '../types';
import { CardType, Attribute, SpecialAttribute } from '../types/enums';

export class CardInstance {
  readonly data: Card;
  private _tags: Set<string>;

  constructor(data: Card) {
    this.data = { ...data };
    this._tags = new Set(data.tags || []);
  }

  get id(): string { return this.data.card_id; }
  get name(): string { return this.data.name; }
  get type(): CardType { return this.data.type; }
  get rarity(): string { return this.data.rarity; }

  get attributes(): Attributes | undefined {
    return this.data.attributes;
  }

  get specialAttributes(): SpecialAttributes {
    return this.data.special_attributes || {};
  }

  get tags(): string[] {
    return Array.from(this._tags);
  }

  get equipmentSlots(): number {
    return this.data.equipment_slots || 0;
  }

  get attributeBonus(): AttributeBonus {
    return this.data.attribute_bonus || {};
  }

  get isCharacter(): boolean { return this.data.type === CardType.Character; }
  get isEquipment(): boolean { return this.data.type === CardType.Equipment; }
  get isSultan(): boolean { return this.data.type === CardType.Sultan; }
  get isConsumable(): boolean { return this.data.type === CardType.Consumable; }
  get isProtagonist(): boolean { return this._tags.has('protagonist'); }

  hasTag(tag: string): boolean {
    return this._tags.has(tag);
  }

  addTag(tag: string): void {
    this._tags.add(tag);
  }

  removeTag(tag: string): void {
    this._tags.delete(tag);
  }

  getAttributeValue(attr: Attribute): number {
    if (!this.data.attributes) return 0;
    return this.data.attributes[attr] || 0;
  }

  getSpecialAttributeValue(attr: SpecialAttribute): number {
    if (!this.data.special_attributes) return 0;
    return this.data.special_attributes[attr] || 0;
  }

  getAttributeSum(): number {
    if (!this.data.attributes) return 0;
    return Object.values(this.data.attributes).reduce((sum, val) => sum + val, 0);
  }
}
