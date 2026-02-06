import { describe, it, expect } from 'vitest';
import { CardInstance } from '@core/card/CardInstance';
import { Attribute, CardType, SpecialAttribute } from '@core/types/enums';
import type { Card } from '@core/types';

const makeCharacterCard = (overrides?: Partial<Card>): Card => ({
  card_id: 'card_001',
  name: '阿尔图',
  type: CardType.Character,
  rarity: 'silver' as any,
  description: '主角',
  image: 'card01.png',
  attributes: {
    physique: 9, charm: 5, wisdom: 3, combat: 8,
    social: 4, survival: 3, stealth: 2, magic: 2,
  },
  special_attributes: { support: 2, reroll: 1 },
  tags: ['male', 'clan', 'protagonist'],
  equipment_slots: 3,
  ...overrides,
});

describe('T2.3: CardInstance', () => {
  it('should access basic properties', () => {
    const card = new CardInstance(makeCharacterCard());
    expect(card.id).toBe('card_001');
    expect(card.name).toBe('阿尔图');
    expect(card.type).toBe(CardType.Character);
    expect(card.isCharacter).toBe(true);
    expect(card.isSultan).toBe(false);
    expect(card.isProtagonist).toBe(true);
  });

  it('should calculate attribute sum', () => {
    const card = new CardInstance(makeCharacterCard());
    expect(card.getAttributeSum()).toBe(9 + 5 + 3 + 8 + 4 + 3 + 2 + 2);
  });

  it('should get individual attribute', () => {
    const card = new CardInstance(makeCharacterCard());
    expect(card.getAttributeValue(Attribute.Combat)).toBe(8);
    expect(card.getAttributeValue(Attribute.Magic)).toBe(2);
  });

  it('should get special attribute', () => {
    const card = new CardInstance(makeCharacterCard());
    expect(card.getSpecialAttributeValue(SpecialAttribute.Reroll)).toBe(1);
    expect(card.getSpecialAttributeValue(SpecialAttribute.Support)).toBe(2);
  });

  it('should manage tags', () => {
    const card = new CardInstance(makeCharacterCard());
    expect(card.hasTag('male')).toBe(true);
    expect(card.hasTag('female')).toBe(false);
    
    card.addTag('noble');
    expect(card.hasTag('noble')).toBe(true);
    
    card.removeTag('clan');
    expect(card.hasTag('clan')).toBe(false);
    
    expect(card.tags).toContain('male');
    expect(card.tags).toContain('noble');
    expect(card.tags).not.toContain('clan');
  });

  it('should handle equipment card type', () => {
    const card = new CardInstance({
      card_id: 'equip_001', name: '长剑', type: CardType.Equipment,
      rarity: 'copper' as any, description: '武器', image: 'eq.png',
      equipment_type: 'weapon' as any,
      attribute_bonus: { combat: 5 },
    });
    expect(card.isEquipment).toBe(true);
    expect(card.attributeBonus.combat).toBe(5);
  });

  it('should handle cards without attributes', () => {
    const card = new CardInstance({
      card_id: 'item_001', name: '宝石', type: CardType.Gem,
      rarity: 'gold' as any, description: '宝石', image: 'gem.png',
    });
    expect(card.getAttributeSum()).toBe(0);
    expect(card.getAttributeValue(Attribute.Combat)).toBe(0);
    expect(card.equipmentSlots).toBe(0);
  });
});
