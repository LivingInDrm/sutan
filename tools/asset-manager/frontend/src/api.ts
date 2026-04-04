import type { Character, Templates, SampleImage, GenerateRequest, GenerationProgress, GenerateDescriptionRequest, CreateCharacterRequest, CharacterProfile, DeployPreview } from './types';

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

  async getHistory(): Promise<any[]> {
    const response = await fetch('/api/history');
    if (!response.ok) throw new Error('Failed to fetch history');
    return response.json();
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
