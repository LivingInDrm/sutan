import { describe, it, expect } from 'vitest';
import { calcCheckPool } from '@core/settlement/calcCheckPool';
import { CardInstance } from '@core/card/CardInstance';
import { CalcMode, Attribute, CardType } from '@core/types/enums';
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

describe('T3.1: Check Pool Calculation', () => {
  const cards = [
    makeCard({ combat: 10, social: 3 }),
    makeCard({ combat: 6, social: 8 }),
    makeCard({ combat: 4, social: 5 }),
  ];

  it('max mode: takes highest value', () => {
    expect(calcCheckPool(cards, Attribute.Combat, CalcMode.Max)).toBe(10);
    expect(calcCheckPool(cards, Attribute.Social, CalcMode.Max)).toBe(8);
  });

  it('sum mode: adds all values', () => {
    expect(calcCheckPool(cards, Attribute.Combat, CalcMode.Sum)).toBe(20);
    expect(calcCheckPool(cards, Attribute.Social, CalcMode.Sum)).toBe(16);
  });

  it('min mode: takes lowest value', () => {
    expect(calcCheckPool(cards, Attribute.Combat, CalcMode.Min)).toBe(4);
  });

  it('avg mode: floor average', () => {
    expect(calcCheckPool(cards, Attribute.Combat, CalcMode.Avg)).toBe(Math.floor(20 / 3));
  });

  it('first mode: takes first card', () => {
    expect(calcCheckPool(cards, Attribute.Combat, CalcMode.First)).toBe(10);
  });

  it('specific mode: takes specified index', () => {
    expect(calcCheckPool(cards, Attribute.Combat, CalcMode.Specific, 1)).toBe(6);
    expect(calcCheckPool(cards, Attribute.Combat, CalcMode.Specific, 2)).toBe(4);
  });

  it('should cap at 20', () => {
    const bigCards = [makeCard({ combat: 25 })];
    expect(calcCheckPool(bigCards, Attribute.Combat, CalcMode.Max)).toBe(20);
  });

  it('should return 0 for empty cards', () => {
    expect(calcCheckPool([], Attribute.Combat, CalcMode.Max)).toBe(0);
  });
});
