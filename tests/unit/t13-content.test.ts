import { describe, it, expect } from 'vitest';
import { CardSchema, SceneSchema } from '@data/schemas';
import cardsData from '@data/configs/cards/base_cards.json';
import scenesData from '@data/configs/scenes/base_scenes.json';

describe('T13.1: Card Config Validation', () => {
  it('should validate all base cards', () => {
    for (const card of cardsData) {
      expect(() => CardSchema.parse(card)).not.toThrow();
    }
  });

  it('should have at least one protagonist', () => {
    const protag = cardsData.filter((c: any) => c.tags?.includes('protagonist'));
    expect(protag.length).toBeGreaterThanOrEqual(1);
  });

  it('should have unique card IDs', () => {
    const ids = cardsData.map((c: any) => c.card_id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('T13.2: Scene Config Validation', () => {
  it('should validate all base scenes', () => {
    for (const scene of scenesData) {
      expect(() => SceneSchema.parse(scene)).not.toThrow();
    }
  });

  it('should have unique scene IDs', () => {
    const ids = scenesData.map((s: any) => s.scene_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have at least one of each settlement type', () => {
    const types = scenesData.map((s: any) => s.settlement.type);
    expect(types).toContain('dice_check');
    expect(types).toContain('trade');
    expect(types).toContain('choice');
  });
});
