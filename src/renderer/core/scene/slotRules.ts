import type { Card, Slot } from '../types';
import { CardType, SlotType } from '../types/enums';

export function isCardValidForSlot(card: Pick<Card, 'type'>, slot: Pick<Slot, 'type'>): boolean {
  switch (slot.type) {
    case SlotType.Character:
      return card.type === CardType.Character;
    case SlotType.Item:
      return (
        card.type === CardType.Equipment ||
        card.type === CardType.Intel ||
        card.type === CardType.Consumable ||
        card.type === CardType.Book ||
        card.type === CardType.Gem
      );
    case SlotType.Sultan:
      return card.type === CardType.Sultan;
    case SlotType.Gold:
    default:
      return false;
  }
}