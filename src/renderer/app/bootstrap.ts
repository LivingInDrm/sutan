import type { Card, MapConfig, Scene } from '../core/types';
import type { GameContentProvider } from '../core/types/repositories';
import { dataLoader } from '../data/loader';

class StaticGameContentProvider implements GameContentProvider {
  private readonly cards: Card[];
  private readonly scenes: Scene[];
  private readonly maps: MapConfig[];
  private readonly mapsById: Map<string, MapConfig>;

  constructor(cards: Card[], scenes: Scene[], maps: MapConfig[]) {
    this.cards = cards;
    this.scenes = scenes;
    this.maps = maps;
    this.mapsById = new Map(maps.map(map => [map.map_id, map]));
  }

  getCards(): Card[] {
    return this.cards;
  }

  getScenes(): Scene[] {
    return this.scenes;
  }

  getMaps(): MapConfig[] {
    return this.maps;
  }

  getMap(mapId: string): MapConfig | undefined {
    return this.mapsById.get(mapId);
  }

  getFirstMap(): MapConfig | undefined {
    return this.maps[0];
  }
}

const cards = dataLoader.loadCardsFromDirectory();
const scenes = dataLoader.loadScenesFromDirectory();
const maps = Array.from(dataLoader.loadMapsFromDirectory().values());

export const gameContentProvider: GameContentProvider = new StaticGameContentProvider(cards, scenes, maps);