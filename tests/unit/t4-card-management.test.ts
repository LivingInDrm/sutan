import { describe, it, expect } from 'vitest';
import { CardManager } from '@core/card/CardManager';
import { EquipmentSystem } from '@core/card/EquipmentSystem';
import { CardType, SpecialAttribute } from '@core/types/enums';
import type { Card } from '@core/types';

const makeChar = (id: string, tags: string[] = [], slots = 3): Card => ({
  card_id: id, name: `Char ${id}`, type: CardType.Character,
  rarity: 'silver' as any, description: '', image: '',
  attributes: { physique: 5, charm: 5, wisdom: 5, combat: 5, social: 5, survival: 5, stealth: 5, magic: 5 },
  special_attributes: { reroll: 1 },
  tags, equipment_slots: slots,
});

const makeEquip = (id: string, bonus: Record<string, number> = {}): Card => ({
  card_id: id, name: `Equip ${id}`, type: CardType.Equipment,
  rarity: 'copper' as any, description: '', image: '',
  equipment_type: 'weapon' as any,
  attribute_bonus: bonus,
  special_bonus: { reroll: 1 },
});

describe('T4.1: CardManager', () => {
  it('should add and get cards', () => {
    const mgr = new CardManager();
    const card = mgr.addCard(makeChar('c1'));
    expect(card).not.toBeNull();
    expect(mgr.getCard('c1')).toBeDefined();
    expect(mgr.hasCard('c1')).toBe(true);
    expect(mgr.handSize).toBe(1);
  });

  it('should remove non-protagonist cards', () => {
    const mgr = new CardManager();
    mgr.addCard(makeChar('c1'));
    expect(mgr.removeCard('c1')).toBe(true);
    expect(mgr.hasCard('c1')).toBe(false);
  });

  it('should not remove protagonist cards', () => {
    const mgr = new CardManager();
    mgr.addCard(makeChar('c1', ['protagonist']));
    expect(mgr.removeCard('c1')).toBe(false);
    expect(mgr.hasCard('c1')).toBe(true);
  });

  it('should enforce hand size limit (512)', () => {
    const mgr = new CardManager();
    for (let i = 0; i < 512; i++) {
      mgr.addCard(makeChar(`c${i}`));
    }
    expect(mgr.isFull).toBe(true);
    expect(mgr.addCard(makeChar('overflow'))).toBeNull();
  });

  it('should get cards by type', () => {
    const mgr = new CardManager();
    mgr.addCard(makeChar('c1'));
    mgr.addCard(makeEquip('e1'));
    expect(mgr.getCardsByType(CardType.Character)).toHaveLength(1);
    expect(mgr.getCardsByType(CardType.Equipment)).toHaveLength(1);
  });

  it('should get cards by tag', () => {
    const mgr = new CardManager();
    mgr.addCard(makeChar('c1', ['noble', 'male']));
    mgr.addCard(makeChar('c2', ['female']));
    expect(mgr.getCardsByTag('noble')).toHaveLength(1);
  });

  it('should get sultan cards', () => {
    const mgr = new CardManager();
    mgr.addCard({ card_id: 's1', name: 'Sultan', type: CardType.Sultan, rarity: 'gold' as any, description: '', image: '' });
    expect(mgr.getSultanCards()).toHaveLength(1);
  });
});

describe('T4.2: EquipmentSystem', () => {
  it('should equip items to characters', () => {
    const mgr = new CardManager();
    const sys = new EquipmentSystem(mgr);
    mgr.addCard(makeChar('c1', [], 3));
    mgr.addCard(makeEquip('e1', { combat: 5 }));
    
    expect(sys.equip('c1', 'e1')).toBe(true);
    expect(sys.getEquippedCards('c1')).toHaveLength(1);
  });

  it('should enforce slot limits', () => {
    const mgr = new CardManager();
    const sys = new EquipmentSystem(mgr);
    mgr.addCard(makeChar('c1', [], 1));
    mgr.addCard(makeEquip('e1'));
    mgr.addCard(makeEquip('e2'));
    
    expect(sys.equip('c1', 'e1')).toBe(true);
    expect(sys.equip('c1', 'e2')).toBe(false);
  });

  it('should calculate attribute bonus', () => {
    const mgr = new CardManager();
    const sys = new EquipmentSystem(mgr);
    mgr.addCard(makeChar('c1', [], 3));
    mgr.addCard(makeEquip('e1', { combat: 5 }));
    mgr.addCard(makeEquip('e2', { combat: 3 }));
    sys.equip('c1', 'e1');
    sys.equip('c1', 'e2');
    
    expect(sys.getAttributeBonus('c1', 'combat')).toBe(8);
    expect(sys.getTotalAttributeValue('c1', 'combat')).toBe(13);
  });

  it('should calculate special bonus', () => {
    const mgr = new CardManager();
    const sys = new EquipmentSystem(mgr);
    mgr.addCard(makeChar('c1', [], 3));
    mgr.addCard(makeEquip('e1'));
    sys.equip('c1', 'e1');
    
    expect(sys.getSpecialBonus('c1', SpecialAttribute.Reroll)).toBe(1);
  });

  it('should unequip items', () => {
    const mgr = new CardManager();
    const sys = new EquipmentSystem(mgr);
    mgr.addCard(makeChar('c1', [], 3));
    mgr.addCard(makeEquip('e1'));
    sys.equip('c1', 'e1');
    
    expect(sys.unequip('c1', 'e1')).toBe(true);
    expect(sys.getEquippedCards('c1')).toHaveLength(0);
  });

  it('should not equip non-equipment to character', () => {
    const mgr = new CardManager();
    const sys = new EquipmentSystem(mgr);
    mgr.addCard(makeChar('c1', [], 3));
    mgr.addCard(makeChar('c2'));
    expect(sys.equip('c1', 'c2')).toBe(false);
  });
});

describe('T4.3: Card Tag System', () => {
  it('should add and remove tags via CardManager', () => {
    const mgr = new CardManager();
    mgr.addCard(makeChar('c1', ['noble']));
    const card = mgr.getCard('c1')!;
    
    card.addTag('warrior');
    expect(card.hasTag('warrior')).toBe(true);
    
    card.removeTag('noble');
    expect(card.hasTag('noble')).toBe(false);
  });

  it('should query cards by tag', () => {
    const mgr = new CardManager();
    mgr.addCard(makeChar('c1', ['noble', 'male']));
    mgr.addCard(makeChar('c2', ['noble', 'female']));
    mgr.addCard(makeChar('c3', ['commoner']));
    
    expect(mgr.getCardsByTag('noble')).toHaveLength(2);
    expect(mgr.getCardsByTag('commoner')).toHaveLength(1);
    expect(mgr.getCardsByTag('unknown')).toHaveLength(0);
  });
});
