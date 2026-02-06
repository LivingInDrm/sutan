import { describe, it, expect } from 'vitest';
import { CardSchema, SceneSchema, SaveDataSchema, EffectsSchema } from '@data/schemas';

describe('T1.3: Zod Schema Validation', () => {
  describe('CardSchema', () => {
    it('should validate a valid character card', () => {
      const card = {
        card_id: 'card_001',
        name: '阿尔图',
        type: 'character',
        rarity: 'silver',
        description: '主角',
        image: 'card01.png',
        attributes: {
          physique: 9, charm: 5, wisdom: 3, combat: 8,
          social: 4, survival: 3, stealth: 2, magic: 2,
        },
        special_attributes: { support: 2, reroll: 1 },
        tags: ['male', 'clan', 'protagonist'],
        equipment_slots: 3,
      };
      expect(() => CardSchema.parse(card)).not.toThrow();
    });

    it('should validate a valid equipment card', () => {
      const card = {
        card_id: 'equip_001',
        name: '长剑',
        type: 'equipment',
        rarity: 'copper',
        description: '一把长剑',
        image: 'equip01.png',
        equipment_type: 'weapon',
        attribute_bonus: { combat: 5 },
        special_bonus: { reroll: 1 },
        gem_slots: 2,
      };
      expect(() => CardSchema.parse(card)).not.toThrow();
    });

    it('should reject card with missing required fields', () => {
      const card = { card_id: 'card_001' };
      expect(() => CardSchema.parse(card)).toThrow();
    });

    it('should reject card with invalid rarity', () => {
      const card = {
        card_id: 'card_001',
        name: 'Test',
        type: 'character',
        rarity: 'diamond',
        description: 'test',
        image: 'test.png',
      };
      expect(() => CardSchema.parse(card)).toThrow();
    });

    it('should reject card with attributes out of range', () => {
      const card = {
        card_id: 'card_001',
        name: 'Test',
        type: 'character',
        rarity: 'silver',
        description: 'test',
        image: 'test.png',
        attributes: {
          physique: 0, charm: 5, wisdom: 3, combat: 8,
          social: 4, survival: 3, stealth: 2, magic: 2,
        },
      };
      expect(() => CardSchema.parse(card)).toThrow();
    });
  });

  describe('SceneSchema', () => {
    it('should validate a valid dice_check scene', () => {
      const scene = {
        scene_id: 'scene_001',
        name: '权力的游戏',
        description: '宫廷博弈',
        background_image: 'scene01.png',
        type: 'event',
        duration: 3,
        slots: [
          { type: 'character', required: true, locked: false },
          { type: 'item', required: false, locked: false },
        ],
        settlement: {
          type: 'dice_check',
          check: { attribute: 'social', calc_mode: 'max', target: 8 },
          results: {
            success: { narrative: '成功', effects: { gold: 20, reputation: 5 } },
            partial_success: { narrative: '险胜', effects: { gold: 10 } },
            failure: { narrative: '失败', effects: { gold: -10 } },
            critical_failure: { narrative: '大失败', effects: { reputation: -8 } },
          },
        },
        unlock_conditions: { reputation_min: 40 },
      };
      expect(() => SceneSchema.parse(scene)).not.toThrow();
    });

    it('should validate a valid trade scene', () => {
      const scene = {
        scene_id: 'scene_shop_001',
        name: '商店',
        description: '装备商人',
        background_image: 'shop.png',
        type: 'shop',
        duration: 1,
        slots: [],
        settlement: {
          type: 'trade',
          shop_inventory: ['card_101', 'card_102'],
          allow_sell: true,
        },
        absence_penalty: null,
      };
      expect(() => SceneSchema.parse(scene)).not.toThrow();
    });

    it('should validate a choice scene', () => {
      const scene = {
        scene_id: 'scene_002',
        name: '选择',
        description: '分支',
        background_image: 'scene02.png',
        type: 'event',
        duration: 2,
        slots: [{ type: 'character', required: true, locked: false }],
        settlement: {
          type: 'choice',
          options: [
            { label: '战斗', effects: { reputation: 5, gold: -10 } },
            { label: '和平', effects: { reputation: -5, gold: 20 } },
          ],
        },
      };
      expect(() => SceneSchema.parse(scene)).not.toThrow();
    });

    it('should reject scene with invalid type', () => {
      const scene = {
        scene_id: 'scene_001',
        name: 'Test',
        description: 'test',
        background_image: 'test.png',
        type: 'invalid',
        duration: 1,
        slots: [],
        settlement: { type: 'trade', shop_inventory: [], allow_sell: false },
      };
      expect(() => SceneSchema.parse(scene)).toThrow();
    });
  });

  describe('EffectsSchema', () => {
    it('should validate full effects', () => {
      const effects = {
        gold: 20,
        reputation: -5,
        cards_add: ['card_001'],
        cards_remove: ['card_invested_0'],
        tags_add: { card_001: ['noble'] },
        unlock_scenes: ['scene_002'],
        consume_invested: true,
      };
      expect(() => EffectsSchema.parse(effects)).not.toThrow();
    });

    it('should validate empty effects', () => {
      expect(() => EffectsSchema.parse({})).not.toThrow();
    });
  });
});
