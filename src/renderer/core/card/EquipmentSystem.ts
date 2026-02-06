import { CardInstance } from './CardInstance';
import { CardManager } from './CardManager';
import type { Attribute, AttributeBonus, SpecialBonus } from '../types';
import { CardType, SpecialAttribute } from '../types/enums';
import { eventBus } from '../../lib/events';

export class EquipmentSystem {
  private equipped: Map<string, string[]> = new Map();
  private cardManager: CardManager;

  constructor(cardManager: CardManager) {
    this.cardManager = cardManager;
  }

  equip(characterId: string, equipmentId: string): boolean {
    const character = this.cardManager.getCard(characterId);
    const equipment = this.cardManager.getCard(equipmentId);
    if (!character || !equipment) return false;
    if (!character.isCharacter) return false;
    if (!equipment.isEquipment) return false;

    const current = this.equipped.get(characterId) || [];
    if (current.length >= character.equipmentSlots) return false;
    if (current.includes(equipmentId)) return false;

    current.push(equipmentId);
    this.equipped.set(characterId, current);
    eventBus.emit('card:equip', { characterId, equipmentId });
    return true;
  }

  unequip(characterId: string, equipmentId: string): boolean {
    const current = this.equipped.get(characterId);
    if (!current) return false;
    const idx = current.indexOf(equipmentId);
    if (idx === -1) return false;
    current.splice(idx, 1);
    if (current.length === 0) {
      this.equipped.delete(characterId);
    }
    eventBus.emit('card:unequip', { characterId, equipmentId });
    return true;
  }

  getEquippedCards(characterId: string): CardInstance[] {
    const ids = this.equipped.get(characterId) || [];
    return ids
      .map(id => this.cardManager.getCard(id))
      .filter((c): c is CardInstance => c !== undefined);
  }

  getAttributeBonus(characterId: string, attr: string): number {
    const equips = this.getEquippedCards(characterId);
    return equips.reduce((sum, eq) => {
      const bonus = eq.attributeBonus;
      return sum + (bonus[attr as keyof typeof bonus] || 0);
    }, 0);
  }

  getSpecialBonus(characterId: string, attr: SpecialAttribute): number {
    const equips = this.getEquippedCards(characterId);
    return equips.reduce((sum, eq) => {
      const bonus = eq.data.special_bonus;
      return sum + (bonus?.[attr] || 0);
    }, 0);
  }

  getTotalAttributeValue(characterId: string, attr: string): number {
    const character = this.cardManager.getCard(characterId);
    if (!character || !character.attributes) return 0;
    const base = character.attributes[attr as keyof typeof character.attributes] || 0;
    return base + this.getAttributeBonus(characterId, attr);
  }

  isEquipped(equipmentId: string): boolean {
    for (const [, equips] of this.equipped) {
      if (equips.includes(equipmentId)) return true;
    }
    return false;
  }

  getEquipmentMap(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const [charId, eqIds] of this.equipped) {
      result[charId] = [...eqIds];
    }
    return result;
  }

  loadEquipmentMap(map: Record<string, string[]>): void {
    this.equipped.clear();
    for (const [charId, eqIds] of Object.entries(map)) {
      this.equipped.set(charId, [...eqIds]);
    }
  }
}
