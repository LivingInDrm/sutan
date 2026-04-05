export interface CharacterVariant {
  index: number;
  description: string;
  output: string;
}

export interface Character {
  name: string;
  id: string;
  figure_id: string;
  current_portrait: string;
  has_pending_portrait?: boolean;
  variants: CharacterVariant[];
}

export interface SampleImage {
  filename: string;
  url: string;
  path: string;
  abs_path: string;
  is_current_in_game: boolean;
  is_selected: boolean;
}

export interface Templates {
  style_base: string;
  no_text_constraint: string;
  style_negative: string;
  portrait_template: string;
  item_template: string;
  scene_template: string;
  scene_icon_style: string;
  scene_backdrop_style: string;
}

export interface GenerateRequest {
  asset_type: 'portrait' | 'item' | 'scene';
  name: string;
  description: string;
  count: number;
}

export interface GenerationProgress {
  type: 'progress' | 'done' | 'error';
  message?: string;
  current?: number;
  total?: number;
  images?: SampleImage[];
  error?: string;
}

export interface GenerateDescriptionRequest {
  name: string;
  bio: string;
  variant_index?: number;
}

export interface CreateCharacterRequest {
  name: string;
  bio: string;
}

export interface CharacterAttributes {
  physique: number;
  charm: number;
  wisdom: number;
  combat: number;
  social: number;
  survival: number;
  stealth: number;
  magic: number;
}

export interface CharacterProfile {
  description: string;
  rarity: 'gold' | 'silver' | 'copper' | 'stone';
  attributes: CharacterAttributes;
  special_attributes: { support: number; reroll: number };
  tags: string[];
  equipment_slots: number;
  selected_portrait?: string;
}

export interface PortraitChange {
  has_change: boolean;
  current_game_file: string | null;
  selected_portrait_filename: string | null;
}

export interface DeployPreview {
  character_name: string;
  is_deployed: boolean;
  has_profile: boolean;
  has_portrait: boolean;
  game_file: string | null;
  preview_card: Record<string, unknown> | null;
  portrait_change: PortraitChange | null;
}

// ─────────────────────────────────────────────
// Item types
// ─────────────────────────────────────────────

export interface ItemVariant {
  index: number;
  description: string;
  output: string;
}

export interface Item {
  name: string;
  id: string;
  equipment_type: string;
  rarity: string;
  current_image: string;
  has_pending_image: boolean;
  variants: ItemVariant[];
}

export interface ItemProfile {
  card_type: string;
  equipment_type: string;
  rarity: 'gold' | 'silver' | 'copper' | 'stone' | 'divine';
  description: string;
  lore: string;
  attribute_bonus: Record<string, number>;
  special_bonus: Record<string, number>;
  gem_slots: number;
  tags: string[];
  selected_image?: string;
}

export interface ItemDeployPreview {
  item_name: string;
  is_deployed: boolean;
  has_profile: boolean;
  has_image: boolean;
  preview_card: Record<string, unknown> | null;
  image_change: {
    has_change: boolean;
    selected_image_filename: string | null;
  };
}

export interface CreateItemRequest {
  name: string;
  bio: string;
  equipment_type: string;
}

// ─────────────────────────────────────────────
// Scene types
// ─────────────────────────────────────────────

export type SceneImageType = 'icon' | 'backdrop';

export interface SceneVariant {
  index: number;
  description: string;
}

export interface Scene {
  id: string;
  name: string;
  map_id: string;
  type: string;
  description: string;
  prompt: string;
  icon_path: string;
  current_icon: string;
  has_pending_icon: boolean;
  has_pending_backdrop?: boolean;
  selected_icon?: string;
  // Backdrop fields
  backdrop_prompt?: string;
  backdrop_path?: string;
  selected_backdrop?: string;
  // Workshop variants
  icon_variants?: SceneVariant[];
  backdrop_variants?: SceneVariant[];
  // Location runtime fields (align with game map config)
  position?: { x: number; y: number };
  scene_ids?: string[];
  unlock_conditions?: Record<string, unknown>;
}

export interface SceneTerrain {
  prompt: string;
  icon_path: string;
  current_icon: string;
}

export interface SceneMap {
  id: string;
  name: string;
  terrain: SceneTerrain;
  scenes: Scene[];
}

export interface ScenesResponse {
  maps: Record<string, SceneMap>;
}

export interface SceneGenerateRequest {
  scene_id: string;
  prompt: string;
  count: number;
  image_type?: SceneImageType;
}

export interface SceneGeneratePromptsRequest {
  scene_id: string;
  image_type: SceneImageType;
}

export interface SceneGeneratePromptsResponse {
  prompts: string[];
  scene_id: string;
  image_type: SceneImageType;
}

export interface SelectBackdropRequest {
  image_path: string;
}
