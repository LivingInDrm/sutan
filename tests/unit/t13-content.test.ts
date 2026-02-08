import { describe, it, expect } from 'vitest';
import { CardSchema, SceneSchema } from '@data/schemas';
import cardsData from '@data/configs/cards/base_cards.json';
import scene001 from '@data/configs/scenes/scene_001.json';
import scene002 from '@data/configs/scenes/scene_002.json';
import scene003 from '@data/configs/scenes/scene_003.json';
import scene004 from '@data/configs/scenes/scene_004.json';
import sceneShop001 from '@data/configs/scenes/scene_shop_001.json';

const scenesData = [scene001, scene002, scene003, scene004, sceneShop001];

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

  it('should have at least one of each settlement type in stages', () => {
    const types = new Set<string>();
    for (const scene of scenesData) {
      for (const stage of (scene as any).stages) {
        if (stage.settlement?.type) {
          types.add(stage.settlement.type);
        }
      }
    }
    expect(types.has('dice_check')).toBe(true);
    expect(types.has('trade')).toBe(true);
  });
});
