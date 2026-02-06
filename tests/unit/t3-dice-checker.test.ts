import { describe, it, expect } from 'vitest';
import { DiceChecker } from '@core/settlement/DiceChecker';
import { RandomManager } from '@lib/random';
import { CheckResult, DICE_CONFIG } from '@core/types/enums';

describe('T3.2: DiceChecker - Rolling', () => {
  it('should roll correct number of dice', () => {
    const checker = new DiceChecker(new RandomManager('test-seed'));
    const result = checker.rollDice(5);
    expect(result.dice).toHaveLength(5);
    result.dice.forEach(d => {
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(10);
    });
  });

  it('should cap at MAX_POOL', () => {
    const checker = new DiceChecker(new RandomManager('test-seed'));
    const result = checker.rollDice(25);
    expect(result.dice).toHaveLength(DICE_CONFIG.MAX_POOL);
  });

  it('should count successes correctly (>=7)', () => {
    const checker = new DiceChecker(new RandomManager('success-seed'));
    const result = checker.rollDice(10);
    const manualCount = result.all_dice.filter(d => d >= 7).length;
    expect(result.successes).toBe(manualCount);
  });

  it('should handle exploding dice (10s)', () => {
    const rng = new RandomManager('explode-test');
    const checker = new DiceChecker(rng);
    const result = checker.rollDice(20);
    const tensInInitial = result.dice.filter(d => d === 10).length;
    if (tensInInitial > 0) {
      expect(result.exploded_dice.length).toBeGreaterThan(0);
    }
    expect(result.all_dice.length).toBe(result.dice.length + result.exploded_dice.length);
  });

  it('should limit explosions to MAX_EXPLODE', () => {
    const checker = new DiceChecker(new RandomManager('limit-test'));
    const result = checker.rollDice(20);
    expect(result.exploded_dice.length).toBeLessThanOrEqual(DICE_CONFIG.MAX_EXPLODE);
  });
});

describe('T3.3: DiceChecker - Reroll', () => {
  it('should reroll selected failed dice', () => {
    const checker = new DiceChecker(new RandomManager('reroll-seed'));
    const initial = checker.rollDice(5);
    const failedIndices = initial.all_dice
      .map((d, i) => d < 7 ? i : -1)
      .filter(i => i >= 0)
      .slice(0, 2);
    
    if (failedIndices.length > 0) {
      const rerolled = checker.reroll(initial, failedIndices);
      expect(rerolled.all_dice.length).toBe(initial.all_dice.length);
    }
  });

  it('should not reroll successful dice', () => {
    const checker = new DiceChecker(new RandomManager('no-reroll-success'));
    const initial = checker.rollDice(10);
    const successIndices = initial.all_dice
      .map((d, i) => d >= 7 ? i : -1)
      .filter(i => i >= 0);
    
    if (successIndices.length > 0) {
      const rerolled = checker.reroll(initial, successIndices);
      for (const idx of successIndices) {
        expect(rerolled.all_dice[idx]).toBe(initial.all_dice[idx]);
      }
    }
  });
});

describe('T3.4: DiceChecker - Golden Dice', () => {
  it('should add successes from golden dice', () => {
    const checker = new DiceChecker(new RandomManager('gold-test'));
    const result = checker.applyGoldenDice(3, 2);
    expect(result).toBe(5);
  });

  it('should work with 0 golden dice', () => {
    const checker = new DiceChecker(new RandomManager('gold-zero'));
    expect(checker.applyGoldenDice(3, 0)).toBe(3);
  });
});

describe('T3.5: DiceChecker - Result Determination', () => {
  const checker = new DiceChecker(new RandomManager('result-test'));

  it('success: count >= target', () => {
    expect(checker.determineResult(8, 8)).toBe(CheckResult.Success);
    expect(checker.determineResult(10, 8)).toBe(CheckResult.Success);
  });

  it('partial_success: target-2 <= count < target', () => {
    expect(checker.determineResult(6, 8)).toBe(CheckResult.PartialSuccess);
    expect(checker.determineResult(7, 8)).toBe(CheckResult.PartialSuccess);
  });

  it('failure: 1 <= count < target-2', () => {
    expect(checker.determineResult(5, 8)).toBe(CheckResult.Failure);
    expect(checker.determineResult(1, 8)).toBe(CheckResult.Failure);
  });

  it('critical_failure: count == 0', () => {
    expect(checker.determineResult(0, 8)).toBe(CheckResult.CriticalFailure);
    expect(checker.determineResult(0, 1)).toBe(CheckResult.CriticalFailure);
  });

  it('no partial_success when target <= 2', () => {
    expect(checker.determineResult(1, 2)).toBe(CheckResult.Failure);
    expect(checker.determineResult(2, 2)).toBe(CheckResult.Success);
    expect(checker.determineResult(1, 1)).toBe(CheckResult.Success);
  });

  it('full check flow', () => {
    const fullChecker = new DiceChecker(new RandomManager('full-flow'));
    const state = fullChecker.performFullCheck(10, {
      attribute: 'combat' as any,
      calc_mode: 'max' as any,
      target: 3,
    });
    expect(state.pool_size).toBe(10);
    expect(state.initial_roll.dice).toHaveLength(10);
    expect([CheckResult.Success, CheckResult.PartialSuccess, CheckResult.Failure, CheckResult.CriticalFailure])
      .toContain(state.result);
  });
});
