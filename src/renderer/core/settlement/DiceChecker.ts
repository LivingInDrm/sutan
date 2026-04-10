import { RandomManager } from '../../lib/random';
import { DICE_CONFIG, CheckResult } from '../types/enums';
import type { DiceRollResult, DiceCheckState, DiceCheckConfig } from '../types';
import type { CardInstance } from '../card/CardInstance';

export class DiceChecker {
  private rng: RandomManager;

  constructor(rng: RandomManager) {
    this.rng = rng;
  }

  rollDice(): DiceRollResult {
    const dice: [number, number, number] = [
      this.rng.rollD6(),
      this.rng.rollD6(),
      this.rng.rollD6(),
    ];

    return {
      dice,
      sum: dice[0] + dice[1] + dice[2],
    };
  }

  rollDiceWithValues(dice: number[]): DiceRollResult {
    const normalizedDice = [dice[0] ?? 1, dice[1] ?? 1, dice[2] ?? 1] as [number, number, number];

    return {
      dice: normalizedDice,
      sum: normalizedDice[0] + normalizedDice[1] + normalizedDice[2],
    };
  }

  calculateModifier(playerPower: number, opponentPower: number, goldenDice: number): number {
    if (playerPower <= 0 || opponentPower <= 0) {
      return goldenDice;
    }

    const base = Math.round(
      DICE_CONFIG.MODIFIER_K * (Math.log(playerPower / opponentPower) / Math.log(3))
    );

    return base + goldenDice;
  }

  calculatePlayerPower(cards: CardInstance[], attribute: DiceCheckConfig['attribute'], slots: number[]): number {
    return slots.reduce((total, slotIndex) => {
      const card = cards[slotIndex];
      if (!card) {
        return total;
      }
      return total + Math.pow(3, card.getAttributeValue(attribute));
    }, 0);
  }

  determineResult(total: number, dc: number, dice?: [number, number, number]): CheckResult {
    if (dice && dice.every((value) => value === 1)) {
      return CheckResult.CriticalFailure;
    }
    if (total <= dc - 5) {
      return CheckResult.CriticalFailure;
    }
    if (total < dc) {
      return CheckResult.Failure;
    }
    if (total < dc + 3) {
      return CheckResult.PartialSuccess;
    }
    return CheckResult.Success;
  }

  buildCheckState(
    config: DiceCheckConfig,
    roll: DiceRollResult,
    modifier: number,
    dcWithOffset: number
  ): DiceCheckState {
    const total = roll.sum + modifier;

    return {
      config,
      dice: roll.dice,
      modifier,
      total,
      dc_with_offset: dcWithOffset,
      result: this.determineResult(total, dcWithOffset, roll.dice),
    };
  }
}
