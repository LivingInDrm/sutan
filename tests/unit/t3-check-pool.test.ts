import { describe, it, expect } from 'vitest';
import { calcPowerModifier } from '@core/settlement/calcPowerModifier';
import { CardInstance } from '@core/card/CardInstance';
import { Attribute, CardType } from '@core/types/enums';
import type { Card } from '@core/types';

const makeCard = (attrs: Partial<Record<string, number>>): CardInstance => {
  return new CardInstance({
    card_id: `card_${Math.random()}`,
    name: 'Test',
    type: CardType.Character,
    rarity: 'silver',
    description: '',
    image: '',
    attributes: {
      physique: attrs.physique ?? 1,
      charm: attrs.charm ?? 1,
      wisdom: attrs.wisdom ?? 1,
      combat: attrs.combat ?? 1,
      social: attrs.social ?? 1,
      survival: attrs.survival ?? 1,
      stealth: attrs.stealth ?? 1,
      magic: attrs.magic ?? 1,
    },
    equipment_slots: 1,
  } as Card);
};

describe('T3.1: Power Modifier Calculation', () => {
  it('should calculate expected modifier examples', () => {
    const cards = [makeCard({ combat: 10 }), makeCard({ combat: 1 })];
    expect(calcPowerModifier(cards, Attribute.Combat, [0], 9, 0)).toBe(3);
    expect(calcPowerModifier(cards, Attribute.Combat, [0], 11, 0)).toBe(-3);
    expect(calcPowerModifier(cards, Attribute.Combat, [0], 10, 1)).toBe(1);
  });

  it('should match 10 vs 3×9 => 0 example', () => {
    const cards = [makeCard({ combat: 10 })];
    const playerPower = Math.pow(3, 10);
    const opponentPower = 3 * Math.pow(3, 9);
    const modifier = Math.round(3 * Math.log(playerPower / opponentPower) / Math.log(3));
    expect(modifier).toBe(0);
  });
});
