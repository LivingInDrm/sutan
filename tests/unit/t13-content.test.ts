import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { CardSchema, SceneSchema } from '@data/schemas';

function loadJsonArray<T>(relativeDir: string): T[] {
  const absoluteDir = path.resolve(process.cwd(), relativeDir);
  const fileNames = fs
    .readdirSync(absoluteDir)
    .filter(fileName => fileName.endsWith('.json'))
    .sort();

  return fileNames.flatMap(fileName => {
    const filePath = path.join(absoluteDir, fileName);
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T | T[];
    return Array.isArray(parsed) ? parsed : [parsed];
  });
}

const cardsData = loadJsonArray<any>('src/renderer/data/configs/cards');
const scenesData = loadJsonArray<any>('src/renderer/data/configs/scenes');

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
