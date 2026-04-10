import { z } from 'zod/v4';
import { CardSchema, SceneSchema, MapSchema, RuntimeLocationSchema, RuntimeMapSchema } from './schemas';
import type { Card, Scene, MapConfig, LocationConfig } from '../core/types';

// Static imports for the split runtime map files (Phase-5)
import locationsJson from './configs/maps/locations.json';
import mapsJson from './configs/maps/maps.json';

type SchemaType = typeof CardSchema | typeof SceneSchema | typeof MapSchema;

const sceneModules = import.meta.glob<{ default: unknown }>(
  './configs/scenes/*.json',
  { eager: true }
);

const cardModules = import.meta.glob<{ default: unknown }>(
  './configs/cards/*.json',
  { eager: true }
);

function normalizeLegacyDiceCheckScene(input: unknown): unknown {
  if (!input || typeof input !== 'object') {
    return input;
  }

  const scene = structuredClone(input as Record<string, unknown>);
  const stages = Array.isArray(scene.stages) ? scene.stages : [];

  scene.stages = stages.map((stage) => {
    if (!stage || typeof stage !== 'object') {
      return stage;
    }

    const nextStage = { ...(stage as Record<string, unknown>) };
    const settlement = nextStage.settlement;
    if (!settlement || typeof settlement !== 'object') {
      return nextStage;
    }

    const nextSettlement = { ...(settlement as Record<string, unknown>) };
    if (nextSettlement.type !== 'dice_check') {
      nextStage.settlement = nextSettlement;
      return nextStage;
    }

    const check = (nextSettlement.check && typeof nextSettlement.check === 'object')
      ? { ...(nextSettlement.check as Record<string, unknown>) }
      : {};

    if (!Array.isArray(check.slots)) {
      const slotDefs = Array.isArray(scene.slots) ? scene.slots : [];
      check.slots = slotDefs
        .map((slot, index) => ({ slot, index }))
        .filter(({ slot }) => Boolean(slot) && typeof slot === 'object' && (slot as Record<string, unknown>).type === 'character')
        .map(({ index }) => index);
    }
    if (typeof check.opponent_value !== 'number') {
      check.opponent_value = 9;
    }
    if (typeof check.dc !== 'number') {
      check.dc = typeof check.target === 'number' ? check.target : 10;
    }

    delete check.calc_mode;
    delete check.target;

    nextSettlement.check = check;
    nextStage.settlement = nextSettlement;
    return nextStage;
  });

  return scene;
}

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
        const validated = SceneSchema.parse(normalizeLegacyDiceCheckScene(data));
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
   * Load all maps from split runtime files (locations.json + maps.json).
   * Joins the two files to produce assembled MapConfig objects with full
   * location data including map-specific positions.
   * Returns a Map keyed by map_id.
   */
  loadMapsFromDirectory(): Map<string, MapConfig> {
    if (this.cache.has('maps_dir')) {
      return this.cache.get('maps_dir') as Map<string, MapConfig>;
    }

    // Validate and index locations by location_id
    const rawLocations = Array.isArray(locationsJson) ? locationsJson : [];
    const locById = new Map<string, z.infer<typeof RuntimeLocationSchema>>();
    for (let i = 0; i < rawLocations.length; i++) {
      try {
        const loc = RuntimeLocationSchema.parse(rawLocations[i]);
        locById.set(loc.location_id, loc);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(
            `Location validation error in locations.json[${i}]: ${error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
          );
        }
        throw error;
      }
    }

    // Validate maps and join with locations
    const rawMaps = Array.isArray(mapsJson) ? mapsJson : [];
    const mapsById = new Map<string, MapConfig>();
    for (let i = 0; i < rawMaps.length; i++) {
      try {
        const runtimeMap = RuntimeMapSchema.parse(rawMaps[i]);

        // Join: for each location_ref, find location data and merge with position
        const locations: LocationConfig[] = runtimeMap.location_refs.map(ref => {
          const locData = locById.get(ref.location_id);
          if (!locData) {
            throw new Error(
              `Location '${ref.location_id}' referenced in maps.json map '${runtimeMap.map_id}' not found in locations.json`
            );
          }
          return {
            location_id: locData.location_id,
            name: locData.name,
            icon_image: locData.icon_image,
            backdrop_image: locData.backdrop_image,
            position: ref.position,
            scene_ids: locData.scene_ids,
            unlock_conditions: locData.unlock_conditions ?? {},
          };
        });

        const mapConfig: MapConfig = {
          map_id: runtimeMap.map_id,
          name: runtimeMap.name,
          description: runtimeMap.description,
          background_image: runtimeMap.background_image,
          locations,
        };

        mapsById.set(mapConfig.map_id, mapConfig);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(
            `Map validation error in maps.json[${i}]: ${error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
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
          const raw = key === 'scenes' ? normalizeLegacyDiceCheckScene(data[i]) : data[i];
          const validated = schema.parse(raw);
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
