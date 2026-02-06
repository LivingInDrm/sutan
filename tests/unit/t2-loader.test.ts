import { describe, it, expect } from 'vitest';
import { DataLoader } from '@data/loader';

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
        settlement: {
          type: 'dice_check',
          check: { attribute: 'social', calc_mode: 'max', target: 5 },
          results: {
            success: { narrative: 'ok', effects: { gold: 10 } },
            partial_success: { narrative: 'ok', effects: {} },
            failure: { narrative: 'fail', effects: {} },
            critical_failure: { narrative: 'bad', effects: {} },
          },
        },
      },
    ]);
    expect(scenes).toHaveLength(1);
  });
});
