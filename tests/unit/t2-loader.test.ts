import { describe, it, expect } from 'vitest';
import { DataLoader } from '@data/loader';
import type { MapConfig } from '@core/types';

describe('T2.1: DataLoader', () => {
  it('should load valid cards', async () => {
    const loader = new DataLoader();
    const cards = await loader.loadCards([
      {
        card_id: 'card_001', name: 'Test', type: 'character', rarity: 'silver',
        description: 'desc', image: 'img.png',
        attributes: { physique: 5, charm: 5, wisdom: 5, combat: 5, social: 5, survival: 5, stealth: 5, magic: 5 },
        equipment_slots: 3,
      },
    ]);
    expect(cards).toHaveLength(1);
    expect((cards[0] as any).card_id).toBe('card_001');
  });

  it('should throw on invalid card data', async () => {
    const loader = new DataLoader();
    await expect(loader.loadCards([{ invalid: true }])).rejects.toThrow('Validation error');
  });

  it('should cache loaded data', async () => {
    const loader = new DataLoader();
    const cardData = [{
      card_id: 'card_001', name: 'Test', type: 'character', rarity: 'silver',
      description: 'desc', image: 'img.png',
      attributes: { physique: 5, charm: 5, wisdom: 5, combat: 5, social: 5, survival: 5, stealth: 5, magic: 5 },
      equipment_slots: 3,
    }];
    await loader.loadCards(cardData);
    expect(loader.isCached('cards')).toBe(true);
    const second = await loader.loadCards([]);
    expect(second).toHaveLength(1);
  });

  it('should clear cache', async () => {
    const loader = new DataLoader();
    await loader.loadCards([{
      card_id: 'card_001', name: 'Test', type: 'character', rarity: 'silver',
      description: 'desc', image: 'img.png',
      attributes: { physique: 5, charm: 5, wisdom: 5, combat: 5, social: 5, survival: 5, stealth: 5, magic: 5 },
      equipment_slots: 3,
    }]);
    loader.clearCache();
    expect(loader.isCached('cards')).toBe(false);
  });

  it('should load valid scenes', async () => {
    const loader = new DataLoader();
    const scenes = await loader.loadScenes([
      {
        scene_id: 'scene_001', name: 'Test', description: 'desc',
        background_image: 'bg.png', type: 'event', duration: 3,
        slots: [{ type: 'character', required: true, locked: false }],
        entry_stage: 'main',
        stages: [{
          stage_id: 'main',
          narrative: [],
          settlement: {
            type: 'dice_check',
            check: { attribute: 'social', slots: [0], opponent_value: 9, dc: 5 },
            results: {
              success: { narrative: 'ok', effects: { gold: 10 } },
              partial_success: { narrative: 'ok', effects: {} },
              failure: { narrative: 'fail', effects: {} },
              critical_failure: { narrative: 'bad', effects: {} },
            },
          },
          is_final: true,
        }],
      },
    ]);
    expect(scenes).toHaveLength(1);
  });

  it('should assemble maps from split runtime files', () => {
    const loader = new DataLoader();
    const firstMap = loader.getFirstMap() as MapConfig;

    expect(firstMap).toBeDefined();
    expect(firstMap.map_id).toBeTruthy();
    expect(firstMap.locations.length).toBeGreaterThan(0);
    expect(firstMap.locations[0].position).toHaveProperty('x');
    expect(firstMap.locations[0].unlock_conditions).toEqual(
      expect.any(Object),
    );
  });
});
