import { RandomManager } from '../../lib/random';
import { DICE_CONFIG, CheckResult } from '../types/enums';
import type { DiceRollResult, DiceCheckState, DiceCheckConfig } from '../types';

export class DiceChecker {
  private rng: RandomManager;

  constructor(rng: RandomManager) {
    this.rng = rng;
  }

  rollDice(poolSize: number): DiceRollResult {
    const diceCount = Math.min(poolSize, DICE_CONFIG.MAX_POOL);
    const dice: number[] = [];

    for (let i = 0; i < diceCount; i++) {
      dice.push(this.rng.rollD10());
    }

    const explodedDice: number[] = [];
    let explosionsToProcess = dice.filter(d => d === DICE_CONFIG.EXPLODE_ON).length;
    let totalExplosions = 0;

    while (explosionsToProcess > 0 && totalExplosions < DICE_CONFIG.MAX_EXPLODE) {
      const batch = Math.min(explosionsToProcess, DICE_CONFIG.MAX_EXPLODE - totalExplosions);
      let newExplosions = 0;
      for (let i = 0; i < batch; i++) {
        const roll = this.rng.rollD10();
        explodedDice.push(roll);
        totalExplosions++;
        if (roll === DICE_CONFIG.EXPLODE_ON) {
          newExplosions++;
        }
      }
      explosionsToProcess = newExplosions;
    }

    const allDice = [...dice, ...explodedDice];
    const successes = allDice.filter(d => d >= DICE_CONFIG.SUCCESS_THRESHOLD).length;

    return {
      dice,
      exploded_dice: explodedDice,
      all_dice: allDice,
      successes,
      reroll_available: 0,
    };
  }

  reroll(rollResult: DiceRollResult, indicesToReroll: number[]): DiceRollResult {
    const newAllDice = [...rollResult.all_dice];

    for (const idx of indicesToReroll) {
      if (idx >= 0 && idx < newAllDice.length) {
        if (newAllDice[idx] < DICE_CONFIG.SUCCESS_THRESHOLD) {
          newAllDice[idx] = this.rng.rollD10();
        }
      }
    }

    const successes = newAllDice.filter(d => d >= DICE_CONFIG.SUCCESS_THRESHOLD).length;

    return {
      dice: rollResult.dice,
      exploded_dice: rollResult.exploded_dice,
      all_dice: newAllDice,
      successes,
      reroll_available: 0,
    };
  }

  applyGoldenDice(successes: number, goldenDiceCount: number): number {
    return successes + goldenDiceCount;
  }

  determineResult(successCount: number, target: number): CheckResult {
    if (successCount >= target) {
      return CheckResult.Success;
    }
    if (successCount === 0) {
      return CheckResult.CriticalFailure;
    }
    if (target > 2 && successCount >= target - 2) {
      return CheckResult.PartialSuccess;
    }
    return CheckResult.Failure;
  }

  performFullCheck(
    poolSize: number,
    config: DiceCheckConfig,
    rerollIndices?: number[],
    goldenDiceUsed: number = 0
  ): DiceCheckState {
    const initialRoll = this.rollDice(poolSize);

    let afterReroll: DiceRollResult | undefined;
    if (rerollIndices && rerollIndices.length > 0) {
      afterReroll = this.reroll(initialRoll, rerollIndices);
    }

    const currentRoll = afterReroll || initialRoll;
    const finalSuccesses = this.applyGoldenDice(currentRoll.successes, goldenDiceUsed);
    const result = this.determineResult(finalSuccesses, config.target);

    return {
      config,
      pool_size: poolSize,
      initial_roll: initialRoll,
      after_reroll: afterReroll,
      golden_dice_used: goldenDiceUsed,
      final_successes: finalSuccesses,
      result,
    };
  }
}
