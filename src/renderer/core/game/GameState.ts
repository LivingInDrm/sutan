import type { Card } from '../types';

export interface GameStatePlayerResources {
  gold: number;
  reputation: number;
  golden_dice: number;
  rewind_charges: number;
  think_charges: number;
}

export interface GameState {
  owned_card_ids: string[];
  card_snapshots: Record<string, Card>;
  owned_equipment_ids: string[];
  equipment_snapshots: Record<string, Card>;
  locked_card_ids: string[];
  player: GameStatePlayerResources;
  current_day: number;
  current_scene: string | null;
  unlocked_locations: string[];
  event_history: string[];
}