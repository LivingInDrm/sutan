import { z } from 'zod/v4';
import { CardSchema, SceneSchema, MapSchema } from './schemas';
import type { Card, Scene, MapConfig } from '../core/types';

type SchemaType = typeof CardSchema | typeof SceneSchema | typeof MapSchema;

const sceneModules = import.meta.glob<{ default: unknown }>(
  './configs/scenes/*.json',
  { eager: true }
);

const cardModules = import.meta.glob<{ default: unknown }>(
  './configs/cards/*.json',
  { eager: true }
);

const mapModules = import.meta.glob<{ default: unknown }>(
  './configs/maps/*.json',
  { eager: true }
);

class DataLoader {
  private cache: Map<string, unknown> = new Map();

  async loadCards(data: unknown[]): Promise<Card[]> {
    return this.loadAndValidate('cards', data, CardSchema) as Promise<Card[]>;
  }

  async loadScenes(data: unknown[]): Promise<Scene[]> {
    return this.loadAndValidate('scenes', data, SceneSchema) as Promise<Scene[]>;
  }

  /**
   * Dynamically load all scenes from the scenes directory.
   * Each file is a single scene JSON object.
   */
  loadScenesFromDirectory(): Scene[] {
    if (this.cache.has('scenes_dir')) {
      return this.cache.get('scenes_dir') as Scene[];
    }

    const scenes: Scene[] = [];
    for (const [path, mod] of Object.entries(sceneModules)) {
      try {
        const data = (mod as { default: unknown }).default ?? mod;
        const validated = SceneSchema.parse(data);
        scenes.push(validated as Scene);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(
            `Scene validation error in ${path}: ${error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
          );
        }
        throw error;
      }
    }

    this.cache.set('scenes_dir', scenes);
    return scenes;
  }

  /**
   * Dynamically load all cards from the cards directory.
   * Each file may be a top-level JSON array of card objects,
   * or a single object with a "cards" key containing the array.
   * All cards across all files are merged into one flat list.
   */
  loadCardsFromDirectory(): Card[] {
    if (this.cache.has('cards_dir')) {
      return this.cache.get('cards_dir') as Card[];
    }

    const cards: Card[] = [];
    for (const [path, mod] of Object.entries(cardModules)) {
      try {
        const raw = (mod as { default: unknown }).default ?? mod;
        // Support top-level array [ {...}, ... ] and wrapped { cards: [...] }
        const items: unknown[] = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as Record<string, unknown>)?.cards)
          ? ((raw as Record<string, unknown>).cards as unknown[])
          : [];

        for (let i = 0; i < items.length; i++) {
          try {
            const validated = CardSchema.parse(items[i]);
            cards.push(validated as Card);
          } catch (error) {
            if (error instanceof z.ZodError) {
              throw new Error(
                `Card validation error in ${path}[${i}]: ${error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
              );
            }
            throw error;
          }
        }
      } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error(`Failed to load cards from ${path}`);
      }
    }

    this.cache.set('cards_dir', cards);
    return cards;
  }

  /**
   * Dynamically load all maps from the maps directory.
   * Each file is a single map JSON object.
   * Returns a Map keyed by map_id.
   */
  loadMapsFromDirectory(): Map<string, MapConfig> {
    if (this.cache.has('maps_dir')) {
      return this.cache.get('maps_dir') as Map<string, MapConfig>;
    }

    const mapsById = new Map<string, MapConfig>();
    for (const [path, mod] of Object.entries(mapModules)) {
      try {
        const data = (mod as { default: unknown }).default ?? mod;
        const validated = MapSchema.parse(data);
        mapsById.set(validated.map_id, validated as MapConfig);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(
            `Map validation error in ${path}: ${error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
          );
        }
        throw error;
      }
    }

    this.cache.set('maps_dir', mapsById);
    return mapsById;
  }

  /**
   * Get a single map by its map_id.
   */
  getMap(mapId: string): MapConfig | undefined {
    return this.loadMapsFromDirectory().get(mapId);
  }

  /**
   * Get the first available map (convenience method for single-map games).
   */
  getFirstMap(): MapConfig | undefined {
    return this.loadMapsFromDirectory().values().next().value;
  }

  private async loadAndValidate(
    key: string,
    data: unknown[],
    schema: SchemaType
  ): Promise<unknown[]> {
    if (this.cache.has(key)) {
      return this.cache.get(key) as unknown[];
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
