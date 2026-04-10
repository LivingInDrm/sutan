import { describe, expect, it } from 'vitest';
import type { Card, Slot } from '../../src/renderer/core/types';
import { CardType, SlotType } from '../../src/renderer/core/types/enums';
import { isCardValidForSlot } from '../../src/renderer/core/scene/slotRules';

describe('slotRules', () => {
  const createCard = (type: CardType) => ({ type } as Card);
  const createSlot = (type: SlotType) => ({ type } as Slot);

  it('accepts characters only in character slots', () => {
    expect(isCardValidForSlot(createCard(CardType.Character), createSlot(SlotType.Character))).toBe(true);
    expect(isCardValidForSlot(createCard(CardType.Equipment), createSlot(SlotType.Character))).toBe(false);
  });

  it('accepts supported item card types in item slots', () => {
    expect(isCardValidForSlot(createCard(CardType.Equipment), createSlot(SlotType.Item))).toBe(true);
    expect(isCardValidForSlot(createCard(CardType.Intel), createSlot(SlotType.Item))).toBe(true);
    expect(isCardValidForSlot(createCard(CardType.Consumable), createSlot(SlotType.Item))).toBe(true);
    expect(isCardValidForSlot(createCard(CardType.Book), createSlot(SlotType.Item))).toBe(true);
    expect(isCardValidForSlot(createCard(CardType.Gem), createSlot(SlotType.Item))).toBe(true);
    expect(isCardValidForSlot(createCard(CardType.Character), createSlot(SlotType.Item))).toBe(false);
  });

  it('rejects gold slot placement', () => {
    expect(isCardValidForSlot(createCard(CardType.Sultan), createSlot(SlotType.Gold))).toBe(false);
  });
});