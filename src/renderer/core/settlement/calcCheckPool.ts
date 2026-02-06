import type { CardInstance } from '../card/CardInstance';
import { CalcMode, Attribute, DICE_CONFIG } from '../types/enums';

export function calcCheckPool(
  cards: CardInstance[],
  attribute: Attribute,
  calcMode: CalcMode,
  specificSlotIndex?: number
): number {
  if (cards.length === 0) return 0;

  const values = cards.map(c => c.getAttributeValue(attribute));

  let baseValue: number;
  switch (calcMode) {
    case CalcMode.Max:
      baseValue = Math.max(...values);
      break;
    case CalcMode.Sum:
      baseValue = values.reduce((a, b) => a + b, 0);
      break;
    case CalcMode.Min:
      baseValue = Math.min(...values);
      break;
    case CalcMode.Avg:
      baseValue = Math.floor(values.reduce((a, b) => a + b, 0) / values.length);
      break;
    case CalcMode.First:
      baseValue = values[0];
      break;
    case CalcMode.Specific:
      if (specificSlotIndex !== undefined && specificSlotIndex < values.length) {
        baseValue = values[specificSlotIndex];
      } else {
        baseValue = values[0];
      }
      break;
    default:
      baseValue = values[0];
  }

  return Math.min(baseValue, DICE_CONFIG.MAX_POOL);
}
