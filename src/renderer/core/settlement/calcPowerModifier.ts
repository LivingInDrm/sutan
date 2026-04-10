import type { Attribute } from '../types';
import { DICE_CONFIG } from '../types/enums';
import type { CardInstance } from '../card/CardInstance';

export function calcPowerModifier(
  cards: CardInstance[],
  attribute: Attribute,
  slots: number[],
  opponentValue: number,
  goldenDice: number
): number {
  const resolvedSlots = Array.isArray(slots) && slots.length > 0
    ? slots
    : cards.map((_, index) => index);

  const playerPower = resolvedSlots.reduce((total, slotIndex) => {
    const card = cards[slotIndex];
    if (!card) {
      return total;
    }
    return total + Math.pow(3, card.getAttributeValue(attribute));
  }, 0);

  const opponentPower = Math.pow(3, opponentValue);

  if (playerPower <= 0 || opponentPower <= 0) {
    return goldenDice;
  }

  const base = Math.round(
    DICE_CONFIG.MODIFIER_K * (Math.log(playerPower / opponentPower) / Math.log(3))
  );

  return base + goldenDice;
}