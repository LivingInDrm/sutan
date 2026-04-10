import { describe, it, expect } from 'vitest';
import { DiceChecker } from '@core/settlement/DiceChecker';
import { RandomManager } from '@lib/random';
import { CheckResult, DICE_CONFIG } from '@core/types/enums';

describe('T3.2: DiceChecker', () => {
  it('should always roll 3d6', () => {
    const checker = new DiceChecker(new RandomManager('test-seed'));
    const result = checker.rollDice();
    expect(result.dice).toHaveLength(3);
    result.dice.forEach(d => {
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(DICE_CONFIG.SIDES);
    });
    expect(result.sum).toBe(result.dice.reduce((sum, value) => sum + value, 0));
  });

  it('should calculate modifier from power ratio', () => {
    const checker = new DiceChecker(new RandomManager('modifier-seed'));
    expect(checker.calculateModifier(Math.pow(3, 10), Math.pow(3, 9), 0)).toBe(3);
    expect(checker.calculateModifier(Math.pow(3, 10), 3 * Math.pow(3, 9), 0)).toBe(0);
  });

  it('should classify results with new thresholds', () => {
    const checker = new DiceChecker(new RandomManager('result-test'));
    expect(checker.determineResult(15, 10, [1, 1, 1])).toBe(CheckResult.CriticalFailure);
    expect(checker.determineResult(5, 10, [2, 2, 1])).toBe(CheckResult.CriticalFailure);
    expect(checker.determineResult(9, 10, [3, 3, 3])).toBe(CheckResult.Failure);
    expect(checker.determineResult(11, 10, [4, 4, 3])).toBe(CheckResult.PartialSuccess);
    expect(checker.determineResult(13, 10, [5, 4, 4])).toBe(CheckResult.Success);
  });

  it('should build full check state', () => {
    const checker = new DiceChecker(new RandomManager('full-flow'));
    const state = checker.buildCheckState(
      { attribute: 'combat' as any, slots: [0], opponent_value: 9, dc: 10 },
      checker.rollDiceWithValues([3, 4, 5]),
      2,
      11,
    );
    expect(state.dice).toEqual([3, 4, 5]);
    expect(state.total).toBe(14);
    expect(state.dc_with_offset).toBe(11);
    expect(state.result).toBe(CheckResult.Success);
  });
});
