import { describe, it, expect } from 'vitest';
import { PlayerState } from '@core/player/PlayerState';
import { ReputationLevel, GAME_CONSTANTS } from '@core/types/enums';

describe('T2.2: PlayerState', () => {
  it('should have correct initial values', () => {
    const player = new PlayerState();
    expect(player.gold).toBe(30);
    expect(player.reputation).toBe(50);
    expect(player.goldenDice).toBe(0);
    expect(player.rewindCharges).toBe(3);
    expect(player.thinkCharges).toBe(3);
  });

  it('should change gold', () => {
    const player = new PlayerState();
    player.changeGold(20);
    expect(player.gold).toBe(50);
    player.changeGold(-30);
    expect(player.gold).toBe(20);
  });

  it('should clamp reputation to 0-100', () => {
    const player = new PlayerState(30, 95);
    player.changeReputation(10);
    expect(player.reputation).toBe(100);
    
    const player2 = new PlayerState(30, 5);
    player2.changeReputation(-10);
    expect(player2.reputation).toBe(0);
  });

  it('should return correct reputation level', () => {
    expect(new PlayerState(30, 10).reputationLevel).toBe(ReputationLevel.Humble);
    expect(new PlayerState(30, 30).reputationLevel).toBe(ReputationLevel.Common);
    expect(new PlayerState(30, 50).reputationLevel).toBe(ReputationLevel.Respected);
    expect(new PlayerState(30, 70).reputationLevel).toBe(ReputationLevel.Prominent);
    expect(new PlayerState(30, 90).reputationLevel).toBe(ReputationLevel.Legendary);
  });

  it('should manage golden dice', () => {
    const player = new PlayerState(30, 50, 2);
    expect(player.useGoldenDice(1)).toBe(true);
    expect(player.goldenDice).toBe(1);
    expect(player.useGoldenDice(2)).toBe(false);
    expect(player.goldenDice).toBe(1);
    player.addGoldenDice(3);
    expect(player.goldenDice).toBe(4);
  });

  it('should manage rewind charges', () => {
    const player = new PlayerState();
    expect(player.useRewindCharge()).toBe(true);
    expect(player.rewindCharges).toBe(2);
    player.useRewindCharge();
    player.useRewindCharge();
    expect(player.useRewindCharge()).toBe(false);
  });

  it('should manage think charges', () => {
    const player = new PlayerState();
    expect(player.useThinkCharge()).toBe(true);
    expect(player.thinkCharges).toBe(2);
    player.useThinkCharge();
    player.useThinkCharge();
    expect(player.useThinkCharge()).toBe(false);
    player.resetThinkCharges();
    expect(player.thinkCharges).toBe(3);
  });

  it('should serialize and deserialize', () => {
    const player = new PlayerState(100, 75, 5, 2, 1);
    const data = player.serialize();
    const restored = PlayerState.deserialize(data);
    expect(restored.gold).toBe(100);
    expect(restored.reputation).toBe(75);
    expect(restored.goldenDice).toBe(5);
    expect(restored.rewindCharges).toBe(2);
    expect(restored.thinkCharges).toBe(1);
  });
});
