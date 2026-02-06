import { describe, it, expect } from 'vitest';
import {
  Rarity, Attribute, SpecialAttribute, CardType, EquipmentType,
  SceneType, SceneStatus, CheckResult, CalcMode, SlotType,
  ReputationLevel, GamePhase, GameEndReason,
  DICE_CONFIG, GAME_CONSTANTS, REPUTATION_RANGES, RARITY_ATTRIBUTE_RANGES,
} from '@core/types/enums';

describe('T1.1: Enums', () => {
  it('should have 4 rarities with unique keys', () => {
    const vals = Object.values(Rarity);
    expect(vals).toHaveLength(4);
    expect(new Set(vals).size).toBe(4);
  });

  it('should have 8 base attributes with unique keys', () => {
    const vals = Object.values(Attribute);
    expect(vals).toHaveLength(8);
    expect(new Set(vals).size).toBe(8);
  });

  it('should have 2 special attributes', () => {
    const vals = Object.values(SpecialAttribute);
    expect(vals).toHaveLength(2);
  });

  it('should have 8 card types with unique keys', () => {
    const vals = Object.values(CardType);
    expect(vals).toHaveLength(8);
    expect(new Set(vals).size).toBe(8);
  });

  it('should have 4 equipment types', () => {
    expect(Object.values(EquipmentType)).toHaveLength(4);
  });

  it('should have 3 scene types', () => {
    expect(Object.values(SceneType)).toHaveLength(3);
  });

  it('should have 5 scene statuses', () => {
    expect(Object.values(SceneStatus)).toHaveLength(5);
  });

  it('should have 4 check results', () => {
    expect(Object.values(CheckResult)).toHaveLength(4);
  });

  it('should have 6 calc modes', () => {
    expect(Object.values(CalcMode)).toHaveLength(6);
  });

  it('should have 4 slot types', () => {
    expect(Object.values(SlotType)).toHaveLength(4);
  });

  it('should have 5 reputation levels', () => {
    expect(Object.values(ReputationLevel)).toHaveLength(5);
  });

  it('should have correct dice config constants', () => {
    expect(DICE_CONFIG.SIDES).toBe(10);
    expect(DICE_CONFIG.SUCCESS_THRESHOLD).toBe(7);
    expect(DICE_CONFIG.EXPLODE_ON).toBe(10);
    expect(DICE_CONFIG.MAX_POOL).toBe(20);
    expect(DICE_CONFIG.MAX_EXPLODE).toBe(20);
  });

  it('should have correct game constants', () => {
    expect(GAME_CONSTANTS.MAX_HAND_SIZE).toBe(512);
    expect(GAME_CONSTANTS.THINK_CHARGES_PER_DAY).toBe(3);
    expect(GAME_CONSTANTS.INITIAL_REPUTATION).toBe(50);
  });

  it('should have reputation ranges covering 0-100', () => {
    expect(REPUTATION_RANGES[ReputationLevel.Humble]).toEqual([0, 19]);
    expect(REPUTATION_RANGES[ReputationLevel.Common]).toEqual([20, 39]);
    expect(REPUTATION_RANGES[ReputationLevel.Respected]).toEqual([40, 59]);
    expect(REPUTATION_RANGES[ReputationLevel.Prominent]).toEqual([60, 79]);
    expect(REPUTATION_RANGES[ReputationLevel.Legendary]).toEqual([80, 100]);
  });

  it('should have rarity attribute ranges', () => {
    expect(RARITY_ATTRIBUTE_RANGES[Rarity.Gold]).toEqual([36, 60]);
    expect(RARITY_ATTRIBUTE_RANGES[Rarity.Stone]).toEqual([5, 10]);
  });
});
