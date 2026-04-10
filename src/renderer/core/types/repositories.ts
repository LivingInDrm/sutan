import type { Card, MapConfig, Scene } from './index';

export interface GameContentProvider {
  getCards(): Card[];
  getScenes(): Scene[];
  getMaps(): MapConfig[];
  getMap(mapId: string): MapConfig | undefined;
  getFirstMap(): MapConfig | undefined;
}