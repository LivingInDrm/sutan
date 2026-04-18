import type { Character, Templates, SampleImage, GenerateRequest, GenerationProgress, GenerateDescriptionRequest, CreateCharacterRequest, CharacterProfile, DeployPreview, Item, ItemProfile, ItemDeployPreview, CreateItemRequest, ItemPromptConfig, ScenesResponse, Scene, SceneGenerateRequest, SceneImageType, SceneGeneratePromptsResponse, UIAsset, UIAssetProfile, CreateUIAssetRequest, FreeGenRequest } from './types';

export const api = {
  async getCharacters(): Promise<Character[]> {
    const response = await fetch('/api/characters');
    if (!response.ok) throw new Error('Failed to fetch characters');
    return response.json();
  },

  async getTemplates(): Promise<Templates> {
    const response = await fetch('/api/templates');
    if (!response.ok) throw new Error('Failed to fetch templates');
    return response.json();
  },

  async updateTemplates(templates: Templates): Promise<void> {
    const response = await fetch('/api/templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(templates),
    });
    if (!response.ok) throw new Error('Failed to update templates');
  },

  async getSamples(characterName: string): Promise<SampleImage[]> {
    const response = await fetch(`/api/samples/${encodeURIComponent(characterName)}`);
    if (!response.ok) throw new Error('Failed to fetch samples');
    return response.json();
  },

  async updateCharacter(figureId: string, data: { variant_index: number; description: string }): Promise<void> {
    const response = await fetch(`/api/characters/${encodeURIComponent(figureId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update character');
  },

  async selectPortrait(characterName: string, portraitPath: string): Promise<void> {
    const response = await fetch(`/api/characters/${encodeURIComponent(characterName)}/select-portrait`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portrait_path: portraitPath }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to select portrait');
    }
  },

  async generateDescriptions(request: GenerateDescriptionRequest): Promise<string[]> {
    const response = await fetch('/api/generate-description', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to generate descriptions');
    }
    const data = await response.json();
    return data.descriptions as string[];
  },

  async createCharacter(request: CreateCharacterRequest): Promise<Character> {
    const response = await fetch('/api/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to create character');
    }
    const data = await response.json();
    return data.character as Character;
  },

  async getCharacterProfile(characterName: string): Promise<CharacterProfile> {
    const response = await fetch(`/api/characters/${encodeURIComponent(characterName)}/profile`);
    if (!response.ok) throw new Error('Failed to fetch character profile');
    return response.json();
  },

  async updateCharacterProfile(characterName: string, profile: Partial<CharacterProfile>): Promise<CharacterProfile> {
    const response = await fetch(`/api/characters/${encodeURIComponent(characterName)}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to update character profile');
    }
    const data = await response.json();
    return data.profile as CharacterProfile;
  },

  async generateCharacterProfile(characterName: string): Promise<CharacterProfile> {
    const response = await fetch(`/api/characters/${encodeURIComponent(characterName)}/generate-profile`, {
      method: 'POST',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to generate character profile');
    }
    const data = await response.json();
    return data.profile as CharacterProfile;
  },

  async getDeployPreview(characterName: string): Promise<DeployPreview> {
    const response = await fetch(`/api/characters/${encodeURIComponent(characterName)}/deploy-preview`);
    if (!response.ok) throw new Error('Failed to fetch deploy preview');
    return response.json();
  },

  async deployCharacter(characterName: string): Promise<any> {
    const response = await fetch(`/api/characters/${encodeURIComponent(characterName)}/deploy`, {
      method: 'POST',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to deploy character');
    }
    return response.json();
  },

  async archiveCharacter(characterName: string): Promise<void> {
    const response = await fetch(`/api/characters/${encodeURIComponent(characterName)}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to archive character');
    }
  },

  async archiveItem(itemName: string): Promise<void> {
    const response = await fetch(`/api/items/${encodeURIComponent(itemName)}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to archive item');
    }
  },

  async regenerateVariants(characterName: string, bio: string): Promise<string[]> {
    const response = await fetch(`/api/characters/${encodeURIComponent(characterName)}/regenerate-variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bio }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to regenerate variants');
    }
    const data = await response.json();
    return data.descriptions as string[];
  },

  async generate(
    request: GenerateRequest,
    onProgress: (progress: GenerationProgress) => void
  ): Promise<void> {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Failed to start generation');
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const emitEvent = (line: string) => {
      if (!line.startsWith('data: ')) {
        return;
      }
      try {
        const data = JSON.parse(line.slice(6)) as GenerationProgress & { message?: string };
        if (data.type === 'error' && !data.error && data.message) {
          data.error = data.message;
        }
        onProgress(data);
      } catch (e) {
        console.error('Failed to parse SSE data:', e);
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        const trailing = buffer.trim();
        if (trailing) {
          emitEvent(trailing);
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        emitEvent(line);
      }
    }
  },

  // ─────────────────────────────────────────────
  // Item API
  // ─────────────────────────────────────────────
  async getItems(): Promise<Item[]> {
    const response = await fetch('/api/items');
    if (!response.ok) throw new Error('Failed to fetch items');
    return response.json();
  },

  async createItem(request: CreateItemRequest & { rarity?: string }): Promise<Item> {
    const payload = {
      ...request,
      rarity: request.rarity ?? 'common',
    };
    const response = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to create item');
    }
    const data = await response.json();
    return data.item as Item;
  },

  async getItemVariants(itemName: string): Promise<{ index: number; description: string; output: string }[]> {
    const response = await fetch(`/api/items/${encodeURIComponent(itemName)}/variants`);
    if (!response.ok) throw new Error('Failed to fetch item variants');
    return response.json();
  },

  async updateItemVariant(itemName: string, variantIndex: number, description: string): Promise<void> {
    const response = await fetch(`/api/items/${encodeURIComponent(itemName)}/variants/${variantIndex}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variant_index: variantIndex, description }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to update item variant');
    }
  },

  async regenerateItemVariants(itemName: string, bio: string): Promise<string[]> {
    const response = await fetch(`/api/items/${encodeURIComponent(itemName)}/regenerate-variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bio }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to regenerate item variants');
    }
    const data = await response.json();
    return data.descriptions as string[];
  },

  async getItemProfile(itemName: string): Promise<ItemProfile> {
    const response = await fetch(`/api/items/${encodeURIComponent(itemName)}/profile`);
    if (!response.ok) throw new Error('Failed to fetch item profile');
    return response.json();
  },

  async updateItemProfile(itemName: string, profile: Partial<ItemProfile>): Promise<ItemProfile> {
    const response = await fetch(`/api/items/${encodeURIComponent(itemName)}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to update item profile');
    }
    const data = await response.json();
    return data.profile as ItemProfile;
  },

  async generateItemProfile(itemName: string): Promise<ItemProfile> {
    const response = await fetch(`/api/items/${encodeURIComponent(itemName)}/generate-profile`, {
      method: 'POST',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to generate item profile');
    }
    const data = await response.json();
    return data.profile as ItemProfile;
  },

  async getItemSamples(itemName: string): Promise<SampleImage[]> {
    const response = await fetch(`/api/item-samples/${encodeURIComponent(itemName)}`);
    if (!response.ok) throw new Error('Failed to fetch item samples');
    return response.json();
  },

  async selectItemImage(itemName: string, imagePath: string): Promise<void> {
    const response = await fetch(`/api/items/${encodeURIComponent(itemName)}/select-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_path: imagePath }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to select item image');
    }
  },

  async getItemDeployPreview(itemName: string): Promise<ItemDeployPreview> {
    const response = await fetch(`/api/items/${encodeURIComponent(itemName)}/deploy-preview`);
    if (!response.ok) throw new Error('Failed to fetch item deploy preview');
    return response.json();
  },

  async deployItem(itemName: string): Promise<any> {
    const response = await fetch(`/api/items/${encodeURIComponent(itemName)}/deploy`, {
      method: 'POST',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to deploy item');
    }
    return response.json();
  },

  async generateItemImages(
    request: GenerateRequest,
    onProgress: (progress: GenerationProgress) => void
  ): Promise<void> {
    const response = await fetch('/api/item-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Failed to start item image generation');
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            onProgress(data);
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        }
      }
    }
  },

  async getItemPromptConfig(): Promise<ItemPromptConfig> {
    const response = await fetch('/api/item-prompt-config');
    if (!response.ok) throw new Error('Failed to fetch item prompt config');
    return response.json();
  },

  async updateItemPromptConfig(config: ItemPromptConfig): Promise<ItemPromptConfig> {
    const response = await fetch('/api/item-prompt-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to update item prompt config');
    }
    const data = await response.json();
    return data.config as ItemPromptConfig;
  },

  async resetItemPromptConfig(): Promise<ItemPromptConfig> {
    const response = await fetch('/api/item-prompt-config/reset', {
      method: 'POST',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to reset item prompt config');
    }
    const data = await response.json();
    return data.config as ItemPromptConfig;
  },

  // ─────────────────────────────────────────────
  // Scene API
  // ─────────────────────────────────────────────
  async getScenes(): Promise<ScenesResponse> {
    const response = await fetch('/api/scenes');
    if (!response.ok) throw new Error('Failed to fetch scenes');
    return response.json();
  },

  async getScene(sceneId: string): Promise<Scene> {
    const response = await fetch(`/api/scenes/${encodeURIComponent(sceneId)}`);
    if (!response.ok) throw new Error('Failed to fetch scene');
    return response.json();
  },

  async updateScene(sceneId: string, data: {
    description?: string;
    icon_prompt?: string;
    name?: string;
    backdrop_prompt?: string;
    position?: { x: number; y: number };
    scene_ids?: string[];
    unlock_conditions?: Record<string, unknown>;
  }): Promise<{ scene: Scene }> {
    const response = await fetch(`/api/scenes/${encodeURIComponent(sceneId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to update scene');
    }
    return response.json();
  },

  async getSceneSamples(sceneId: string, imageType?: SceneImageType): Promise<SampleImage[]> {
    const url = imageType
      ? `/api/scene-samples/${encodeURIComponent(sceneId)}?image_type=${imageType}`
      : `/api/scene-samples/${encodeURIComponent(sceneId)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch scene samples');
    return response.json();
  },

  async selectSceneIcon(sceneId: string, imagePath: string): Promise<void> {
    const response = await fetch(`/api/scenes/${encodeURIComponent(sceneId)}/select-icon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_path: imagePath }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to select scene icon');
    }
  },

  async deploySceneIcon(sceneId: string, imageType: 'icon' | 'backdrop' = 'icon'): Promise<any> {
    const url = imageType === 'backdrop'
      ? `/api/scenes/${encodeURIComponent(sceneId)}/deploy?image_type=backdrop`
      : `/api/scenes/${encodeURIComponent(sceneId)}/deploy`;
    const response = await fetch(url, {
      method: 'POST',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to deploy scene icon');
    }
    return response.json();
  },

  async generateSceneIcon(
    request: SceneGenerateRequest,
    onProgress: (progress: GenerationProgress) => void
  ): Promise<void> {
    const response = await fetch('/api/scene-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Failed to start scene icon generation');
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            onProgress(data);
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        }
      }
    }
  },

  async generateScenePrompts(sceneId: string, imageType: SceneImageType): Promise<SceneGeneratePromptsResponse> {
    const response = await fetch('/api/scene-generate-prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location_id: sceneId, image_type: imageType }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to generate scene prompts');
    }
    return response.json();
  },

  async selectSceneBackdrop(sceneId: string, imagePath: string): Promise<void> {
    const response = await fetch(`/api/scenes/${encodeURIComponent(sceneId)}/select-backdrop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_path: imagePath }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to select scene backdrop');
    }
  },

  async updateSceneIconVariant(sceneId: string, variantIndex: number, description: string): Promise<void> {
    const response = await fetch(`/api/scenes/${encodeURIComponent(sceneId)}/icon-variants/${variantIndex}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to update scene icon variant');
    }
  },

  async updateSceneBackdropVariant(sceneId: string, variantIndex: number, description: string): Promise<void> {
    const response = await fetch(`/api/scenes/${encodeURIComponent(sceneId)}/backdrop-variants/${variantIndex}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to update scene backdrop variant');
    }
  },

  async regenerateSceneIconVariants(sceneId: string, bio: string): Promise<string[]> {
    const response = await fetch(`/api/scenes/${encodeURIComponent(sceneId)}/regenerate-icon-variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bio }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to regenerate scene icon variants');
    }
    const data = await response.json();
    return data.descriptions as string[];
  },

  async regenerateSceneBackdropVariants(sceneId: string, bio: string): Promise<string[]> {
    const response = await fetch(`/api/scenes/${encodeURIComponent(sceneId)}/regenerate-backdrop-variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bio }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to regenerate scene backdrop variants');
    }
    const data = await response.json();
    return data.descriptions as string[];
  },

  // ─────────────────────────────────────────────
  // UI Asset API
  // ─────────────────────────────────────────────
  async getUIAssets(): Promise<UIAsset[]> {
    const response = await fetch('/api/ui-assets');
    if (!response.ok) throw new Error('Failed to fetch UI assets');
    return response.json();
  },

  async createUIAsset(request: CreateUIAssetRequest): Promise<UIAsset> {
    const response = await fetch('/api/ui-assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to create UI asset');
    }
    const data = await response.json();
    return data.asset as UIAsset;
  },

  async getUIAssetProfile(assetId: string): Promise<UIAssetProfile> {
    const response = await fetch(`/api/ui-assets/${encodeURIComponent(assetId)}/profile`);
    if (!response.ok) throw new Error('Failed to fetch UI asset profile');
    return response.json();
  },

  async updateUIAssetProfile(assetId: string, profile: Partial<UIAssetProfile>): Promise<UIAssetProfile> {
    const response = await fetch(`/api/ui-assets/${encodeURIComponent(assetId)}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to update UI asset profile');
    }
    const data = await response.json();
    return data.profile as UIAssetProfile;
  },

  async updateUIAssetVariant(assetId: string, variantIndex: number, description: string): Promise<void> {
    const response = await fetch(`/api/ui-assets/${encodeURIComponent(assetId)}/variants/${variantIndex}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variant_index: variantIndex, description }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to update UI asset variant');
    }
  },

  async regenerateUIAssetVariants(assetId: string, description: string): Promise<string[]> {
    const response = await fetch(`/api/ui-assets/${encodeURIComponent(assetId)}/regenerate-variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to regenerate UI asset variants');
    }
    const data = await response.json();
    return data.descriptions as string[];
  },

  async getUIAssetSamples(assetId: string): Promise<SampleImage[]> {
    const response = await fetch(`/api/ui-asset-samples/${encodeURIComponent(assetId)}`);
    if (!response.ok) throw new Error('Failed to fetch UI asset samples');
    return response.json();
  },

  async getUIAssetVariants(assetId: string): Promise<{ index: number; description: string; output: string }[]> {
    const response = await fetch(`/api/ui-assets/${encodeURIComponent(assetId)}/variants`);
    if (!response.ok) throw new Error('Failed to fetch UI asset variants');
    return response.json();
  },

  async selectUIAssetImage(assetId: string, imagePath: string): Promise<void> {
    const response = await fetch(`/api/ui-assets/${encodeURIComponent(assetId)}/select-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_path: imagePath }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to select UI asset image');
    }
  },

  async deployUIAsset(assetId: string): Promise<any> {
    const response = await fetch(`/api/ui-assets/${encodeURIComponent(assetId)}/deploy`, {
      method: 'POST',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to deploy UI asset');
    }
    return response.json();
  },

  async generateUIAssetImages(
    request: GenerateRequest,
    onProgress: (progress: GenerationProgress) => void
  ): Promise<void> {
    const response = await fetch('/api/ui-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Failed to start UI asset image generation');
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            onProgress(data);
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        }
      }
    }
  },

  async getFreeGenSamples(): Promise<SampleImage[]> {
    const response = await fetch('/api/free-gen-samples');
    if (!response.ok) throw new Error('Failed to fetch free gen samples');
    return response.json();
  },

  async generateFreeGenImages(
    request: FreeGenRequest,
    onProgress: (progress: GenerationProgress) => void
  ): Promise<void> {
    const response = await fetch('/api/free-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || 'Failed to start free generation');
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            onProgress(data);
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        }
      }
    }
  },
};
