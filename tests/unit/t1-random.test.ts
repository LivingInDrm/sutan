import { describe, it, expect } from 'vitest';
import { RandomManager } from '@lib/random';

describe('T1.4: RandomManager', () => {
  it('should produce consistent output with same seed', () => {
    const rng1 = new RandomManager('test-seed');
    const rng2 = new RandomManager('test-seed');
    const results1 = Array.from({ length: 10 }, () => rng1.next());
    const results2 = Array.from({ length: 10 }, () => rng2.next());
    expect(results1).toEqual(results2);
  });

  it('should produce different output with different seeds', () => {
    const rng1 = new RandomManager('seed-a');
    const rng2 = new RandomManager('seed-b');
    const result1 = rng1.next();
    const result2 = rng2.next();
    expect(result1).not.toBe(result2);
  });

  it('should generate D10 rolls in 1-10 range', () => {
    const rng = new RandomManager('dice-test');
    for (let i = 0; i < 100; i++) {
      const roll = rng.rollD10();
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(10);
    }
  });

  it('should generate integers in range', () => {
    const rng = new RandomManager('range-test');
    for (let i = 0; i < 100; i++) {
      const val = rng.nextInt(5, 15);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThanOrEqual(15);
    }
  });

  it('should serialize and restore seed', () => {
    const rng = new RandomManager('serialize-test');
    const seed = rng.getState();
    expect(seed).toBe('serialize-test');
    const rng2 = new RandomManager(seed);
    expect(rng.next()).toBe(rng2.next());
  });

  it('should reset with new seed', () => {
    const rng = new RandomManager('original');
    rng.next();
    rng.setSeed('new-seed');
    const rng2 = new RandomManager('new-seed');
    expect(rng.next()).toBe(rng2.next());
  });
});
