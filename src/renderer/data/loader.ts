import { z } from 'zod/v4';
import { CardSchema, SceneSchema } from './schemas';
import type { Card, Scene } from '../core/types';

type SchemaType = typeof CardSchema | typeof SceneSchema;

class DataLoader {
  private cache: Map<string, unknown[]> = new Map();

  async loadCards(data: unknown[]): Promise<Card[]> {
    return this.loadAndValidate('cards', data, CardSchema) as Promise<Card[]>;
  }

  async loadScenes(data: unknown[]): Promise<Scene[]> {
    return this.loadAndValidate('scenes', data, SceneSchema) as Promise<Scene[]>;
  }

  private async loadAndValidate(
    key: string,
    data: unknown[],
    schema: SchemaType
  ): Promise<unknown[]> {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const results: unknown[] = [];
    for (let i = 0; i < data.length; i++) {
      try {
        const validated = schema.parse(data[i]);
        results.push(validated);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(
            `Validation error at item ${i}: ${error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
          );
        }
        throw error;
      }
    }

    this.cache.set(key, results);
    return results;
  }

  clearCache(): void {
    this.cache.clear();
  }

  clearCacheFor(key: string): void {
    this.cache.delete(key);
  }

  isCached(key: string): boolean {
    return this.cache.has(key);
  }
}

export const dataLoader = new DataLoader();
export { DataLoader };
