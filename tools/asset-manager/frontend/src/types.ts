export interface CharacterVariant {
  index: number;
  description: string;
  output: string;
}

// ─────────────────────────────────────────────
// Phase 2: Workspace card meta — stored in scripts/data/cards/*.json
// This is the asset-manager workspace layer. It is separate from the runtime
// card files in src/renderer/data/configs/cards/ which the game loads.
// NOTE (Phase 1): "workspace" ≠ "runtime scene"; do not conflate.
// ─────────────────────────────────────────────
export interface WorkspaceCardMeta {
  /** 'draft' | 'ready' | 'published' */
  publish_status: string;
  /** Path to the currently-selected candidate image (surfaces as selected_portrait / selected_image in API responses) */
  selected_asset: string;
  asset_candidates: string[];
  workshop_variants: unknown[];
  updated_at: string;
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
  asset_type: 'portrait' | 'item' | 'scene' | 'ui';
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

export interface FreeGenRequest {
  prompt: string;
  size: '1024x1024' | '1536x1024' | '1024x1536';
  background: 'transparent' | 'opaque' | 'auto';
  quality: 'high' | 'medium' | 'low';
  count: 1 | 2 | 4;
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
  /**
   * Path to the selected candidate portrait.
   * Backed by WorkspaceCardMeta.selected_asset in scripts/data/cards/characters.json.
   * Cleared by backend after a successful deploy.
   */
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
  type: string;
  equipment_type: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  description: string;
  lore: string;
  attribute_bonus: Record<string, number>;
  special_bonus: Record<string, number>;
  gem_slots: number;
  tags: string[];
  /**
   * Path to the selected candidate image.
   * Backed by WorkspaceCardMeta.selected_asset in scripts/data/cards/equipment.json.
   * Cleared by backend after a successful deploy.
   */
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
  rarity: ItemPromptRarity;
}

export type ItemPromptRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface ItemPromptConfig {
  variant_system_prompt: string;
  style_template: string;
  rarity_palettes: Record<ItemPromptRarity, string>;
}

// ─────────────────────────────────────────────
// Scene types
// ─────────────────────────────────────────────

export type SceneImageType = 'icon' | 'backdrop';

export interface SceneVariant {
  index: number;
  description: string;
}

/**
 * Location as returned by the Asset Manager API.
 */
export interface Scene {
  map_id: string;
  type: string;
  description: string;
  icon_prompt: string;
  icon_image: string;
  backdrop_prompt?: string;
  backdrop_image?: string;
  selected_icon?: string;
  selected_backdrop?: string;
  location_id: string;
  name: string;
  current_icon: string;
  has_pending_icon: boolean;
  has_pending_backdrop?: boolean;
  icon_variants?: SceneVariant[];
  backdrop_variants?: SceneVariant[];
  position?: { x: number; y: number };
  scene_ids?: string[];
  unlock_conditions?: Record<string, unknown>;
}

export interface SceneTerrain {
  prompt: string;
  icon_image: string;
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
  location_id: string;
  icon_prompt: string;
  count: number;
  image_type?: SceneImageType;
}

export interface SceneGeneratePromptsRequest {
  location_id: string;
  image_type: SceneImageType;
}

export interface SceneGeneratePromptsResponse {
  prompts: string[];
  location_id: string;
  image_type: SceneImageType;
}

export interface SelectBackdropRequest {
  image_path: string;
}

// ─────────────────────────────────────────────
// UI Asset types
// ─────────────────────────────────────────────

export type UIAssetCategory = 'background' | 'frame' | 'panel' | 'button' | 'card-border' | 'icon';

export interface UIAssetVariant {
  index: number;
  description: string;
  output: string;
}

export interface UIAsset {
  asset_id: string;
  id: string;
  name: string;
  category: UIAssetCategory;
  dimensions: string;
  description: string;
  current_image: string;
  has_pending_image: boolean;
  publish_status: string;
  variants: UIAssetVariant[];
}

export interface UIAssetProfile {
  name: string;
  category: UIAssetCategory;
  dimensions: string;
  description: string;
}

export interface CreateUIAssetRequest {
  name: string;
  category: UIAssetCategory;
  dimensions: string;
  description: string;
}
