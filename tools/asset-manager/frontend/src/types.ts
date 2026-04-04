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
