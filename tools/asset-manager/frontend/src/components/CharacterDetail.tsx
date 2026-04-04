import { useState, useEffect, useRef, useCallback } from 'react';
import type { Character, Templates, SampleImage, GenerationProgress, CharacterProfile, DeployPreview } from '../types';
import { api } from '../api';
import Gallery from './Gallery';

interface CharacterDetailProps {
  character: Character;
  templates: Templates | null;
  onUpdate: () => void | Promise<void>;
}

type DetailTab = 'workshop' | 'profile' | 'deploy';

const ATTR_LABELS: Record<string, string> = {
  physique: '体魄',
  charm: '魅力',
  wisdom: '智慧',
  combat: '武力',
  social: '社交',
  survival: '生存',
  stealth: '潜行',
  magic: '法术',
};

const RARITY_LABELS: Record<string, string> = {
  gold: '金 · GOLD',
  silver: '银 · SILVER',
  copper: '铜 · COPPER',
  stone: '石 · STONE',
};

const RARITY_COLORS: Record<string, string> = {
  gold: '#f5c842',
  silver: '#b0b8c8',
  copper: '#c87040',
  stone: '#808080',
};

const DEFAULT_PROFILE: CharacterProfile = {
  description: '',
  rarity: 'copper',
  attributes: {
    physique: 5, charm: 5, wisdom: 5, combat: 5,
    social: 5, survival: 5, stealth: 5, magic: 5,
  },
  special_attributes: { support: 0, reroll: 0 },
  tags: [],
  equipment_slots: 1,
};

export default function CharacterDetail({
  character,
  templates,
  onUpdate,
}: CharacterDetailProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('workshop');
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [editedDescription, setEditedDescription] = useState('');
  const [samples, setSamples] = useState<SampleImage[]>([]);
  const [generateCount, setGenerateCount] = useState(1);
  const [selectedVariantIndices, setSelectedVariantIndices] = useState<Set<number>>(new Set([0]));
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [multiVariantProgress, setMultiVariantProgress] = useState<{ current: number; total: number } | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [loadingSamples, setLoadingSamples] = useState(false);

  // Assembled prompt collapsed state
  const [promptExpanded, setPromptExpanded] = useState(false);

  // Regenerate variants panel state
  const [showRegeneratePanel, setShowRegeneratePanel] = useState(false);
  const [regenerateBio, setRegenerateBio] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  // Profile tab state
  const [profile, setProfile] = useState<CharacterProfile>(DEFAULT_PROFILE);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isAiProfileGenerating, setIsAiProfileGenerating] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Deploy tab state
  const [deployPreview, setDeployPreview] = useState<DeployPreview | null>(null);
  const [loadingDeployPreview, setLoadingDeployPreview] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{ success: boolean; message: string } | null>(null);

  // Autosave timer ref
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedDescription = useRef<string>('');
  const saveIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether user is currently editing the description textarea
  const isEditingDescriptionRef = useRef(false);

  const selectedVariant = character.variants[selectedVariantIndex];

  useEffect(() => {
    // Don't reset textarea content while user is actively typing —
    // this prevents focus loss caused by parent re-renders updating the character prop.
    if (isEditingDescriptionRef.current) return;
    if (selectedVariant) {
      setEditedDescription(selectedVariant.description);
      lastSavedDescription.current = selectedVariant.description;
    }
  }, [selectedVariant?.index, character.name]);

  useEffect(() => {
    // Reset state when switching character
    isEditingDescriptionRef.current = false; // clear editing guard on character switch
    setShowRegeneratePanel(false);
    setRegenerateError(null);
    setRegenerateBio('');
    setProfileSaved(false);
    setProfileError(null);
    setDeployResult(null);
    setDeployPreview(null);
    setSaveStatus('idle');
    setPromptExpanded(false);
    setSelectedVariantIndices(new Set([0]));
    setMultiVariantProgress(null);
    setSelectedVariantIndex(0);
  }, [character.name]);

  useEffect(() => {
    if (activeTab === 'workshop') {
      loadSamples();
    } else if (activeTab === 'profile') {
      loadProfile();
    } else if (activeTab === 'deploy') {
      loadDeployPreview();
    }
  }, [activeTab, character.name]);

  // Autosave: debounce 500ms
  // NOTE: intentionally does NOT call onUpdate() after save — calling onUpdate()
  // triggers a parent re-render that passes a new `character` prop, which can
  // reset the textarea and lose focus while the user is still typing.
  const handleAutoSave = useCallback(async (description: string, variantIndex: number) => {
    if (description === lastSavedDescription.current) return;
    try {
      setSaveStatus('saving');
      await api.updateCharacter(character.figure_id, {
        variant_index: variantIndex,
        description,
      });
      lastSavedDescription.current = description;
      setSaveStatus('saved');
      if (saveIdleTimerRef.current) clearTimeout(saveIdleTimerRef.current);
      saveIdleTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Autosave failed:', err);
      setSaveStatus('idle');
    }
  }, [character.figure_id]); // onUpdate removed — see note above

  useEffect(() => {
    if (editedDescription === lastSavedDescription.current) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleAutoSave(editedDescription, selectedVariantIndex);
    }, 500);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [editedDescription, selectedVariantIndex, handleAutoSave]);

  // Cleanup all pending timers on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      if (saveIdleTimerRef.current) clearTimeout(saveIdleTimerRef.current);
    };
  }, []);

  const loadSamples = async () => {
    try {
      setLoadingSamples(true);
      const imgs = await api.getSamples(character.name);
      setSamples(imgs);
    } catch (err) {
      console.error('Failed to load samples:', err);
    } finally {
      setLoadingSamples(false);
    }
  };

  const loadProfile = async () => {
    try {
      setLoadingProfile(true);
      const p = await api.getCharacterProfile(character.name);
      setProfile(p);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadDeployPreview = async () => {
    try {
      setLoadingDeployPreview(true);
      setDeployResult(null);
      const preview = await api.getDeployPreview(character.name);
      setDeployPreview(preview);
    } catch (err) {
      console.error('Failed to load deploy preview:', err);
    } finally {
      setLoadingDeployPreview(false);
    }
  };

  const handleRegenerateVariants = async () => {
    try {
      setIsRegenerating(true);
      setRegenerateError(null);
      const descriptions = await api.regenerateVariants(character.name, regenerateBio);
      // Refresh character data to get updated variants
      await onUpdate();
      setShowRegeneratePanel(false);
      setRegenerateBio('');
      // Update currently viewed description if it changed
      if (descriptions[selectedVariantIndex]) {
        setEditedDescription(descriptions[selectedVariantIndex]);
        lastSavedDescription.current = descriptions[selectedVariantIndex];
      }
    } catch (err) {
      setRegenerateError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleGenerate = async () => {
    const indicesToGenerate = Array.from(selectedVariantIndices).sort((a, b) => a - b);
    if (indicesToGenerate.length === 0) return;

    try {
      setIsGenerating(true);
      setGenerationProgress(null);
      setMultiVariantProgress(null);

      for (let i = 0; i < indicesToGenerate.length; i++) {
        const variantIdx = indicesToGenerate[i];
        const variantToGenerate = character.variants[variantIdx];
        const descriptionToUse = variantIdx === selectedVariantIndex
          ? editedDescription
          : (variantToGenerate?.description || '');

        if (indicesToGenerate.length > 1) {
          setMultiVariantProgress({ current: i + 1, total: indicesToGenerate.length });
        }

        await api.generate(
          {
            asset_type: 'portrait',
            name: character.name,
            description: descriptionToUse,
            count: generateCount,
          },
          (progress) => {
            setGenerationProgress(progress);
            if (progress.type === 'done') {
              loadSamples();
            }
          }
        );
      }
    } catch (err) {
      console.error('Generation failed:', err);
      setGenerationProgress({
        type: 'error',
        error: err instanceof Error ? err.message : 'Generation failed',
      });
    } finally {
      setIsGenerating(false);
      setMultiVariantProgress(null);
    }
  };

  // Profile handlers
  const handleAttrChange = (key: string, value: number) => {
    setProfile((p) => ({
      ...p,
      attributes: { ...p.attributes, [key]: value },
    }));
  };

  const handleSpecialAttrChange = (key: 'support' | 'reroll', value: number) => {
    setProfile((p) => ({
      ...p,
      special_attributes: { ...p.special_attributes, [key]: value },
    }));
  };

  const handleTagAdd = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !profile.tags.includes(tag)) {
      setProfile((p) => ({ ...p, tags: [...p.tags, tag] }));
    }
    setTagInput('');
  };

  const handleTagRemove = (tag: string) => {
    setProfile((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) }));
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      setProfileError(null);
      const updated = await api.updateCharacterProfile(character.name, profile);
      setProfile(updated);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAiProfileGenerate = async () => {
    try {
      setIsAiProfileGenerating(true);
      setProfileError(null);
      const generated = await api.generateCharacterProfile(character.name);
      setProfile(generated);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'AI 生成失败');
    } finally {
      setIsAiProfileGenerating(false);
    }
  };

  const handleDeploy = async () => {
    try {
      setIsDeploying(true);
      setDeployResult(null);
      const result = await api.deployCharacter(character.name);
      setDeployResult({
        success: true,
        message: `部署成功！角色已${result.action === 'updated' ? '更新' : '新增'}到游戏数据。${result.portrait_copied ? ` 立绘已从「${result.portrait_source_filename}」复制。` : ' 立绘保持不变。'}`,
      });
      await loadDeployPreview();
      onUpdate();
    } catch (err) {
      setDeployResult({
        success: false,
        message: err instanceof Error ? err.message : '部署失败',
      });
    } finally {
      setIsDeploying(false);
    }
  };

  // Build assembled prompt preview from templates
  const assembledPrompt = templates
    ? (templates.portrait_template || '')
        .replace('{style}', templates.style_base || '')
        .replace('{no_text}', templates.no_text_constraint || '')
        .replace('{name}', character.name)
        .replace('{description}', editedDescription)
        .replace('{negative}', templates.style_negative || '')
    : editedDescription;

  const rarityColor = RARITY_COLORS[profile.rarity] || '#808080';
  const attrTotal = Object.values(profile.attributes).reduce((a, b) => a + b, 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{character.name}</h2>
          <div style={styles.subtitle}>ID: {character.figure_id}</div>
        </div>

        <div style={styles.tabs}>
          {([
            ['workshop', '角色工坊', 'WORKSHOP'],
            ['profile', '角色属性', 'PROFILE'],
            ['deploy', '部署', 'DEPLOY'],
          ] as [DetailTab, string, string][]).map(([key, label, sublabel]) => (
            <button
              key={key}
              style={{
                ...styles.tab,
                ...(activeTab === key ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab(key)}
            >
              <span>{label}</span>
              <span style={styles.tabLabel}>{sublabel}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={styles.content}>
        {activeTab === 'workshop' && (
          <div style={styles.workshopView}>
            {/* 1. VARIANT SELECTION */}
            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>VARIANT SELECTION</div>
                <div style={styles.variantHeaderRight}>
                  <div style={styles.sectionMeta}>{character.variants.length} available</div>
                  <button
                    style={styles.regenerateBtn}
                    onClick={() => {
                      setShowRegeneratePanel(!showRegeneratePanel);
                      setRegenerateError(null);
                    }}
                  >
                    <span>✦ 重新生成</span>
                    <span style={styles.buttonLabel}>REGENERATE</span>
                  </button>
                </div>
              </div>
              <div style={styles.variantGrid}>
                {character.variants.map((variant, index) => (
                  <button
                    key={index}
                    style={{
                      ...styles.variantCard,
                      ...(selectedVariantIndex === index ? styles.variantCardActive : {}),
                    }}
                    onClick={() => setSelectedVariantIndex(index)}
                  >
                    <div style={styles.variantIndex}>#{variant.index}</div>
                    <div style={styles.variantDesc}>
                      {variant.description || '(未设置)'}
                    </div>
                  </button>
                ))}
              </div>

              {/* Regenerate Variants Panel */}
              {showRegeneratePanel && (
                <div style={styles.regeneratePanel}>
                  <div style={styles.regeneratePanelTitle}>AI 重新生成 4 条 VARIANT</div>
                  <div style={styles.regeneratePanelSubtitle}>
                    输入角色简介，AI 将重新生成 4 条 variant description 并覆盖现有内容
                  </div>
                  <textarea
                    style={styles.regenerateBioInput}
                    value={regenerateBio}
                    onChange={(e) => setRegenerateBio(e.target.value)}
                    placeholder="角色简介（可选，如：北凉世子，武功绝顶，外表纨绔内心坚毅...）"
                    rows={3}
                  />
                  {regenerateError && <div style={styles.regenerateError}>⚠ {regenerateError}</div>}
                  <div style={styles.regenerateActions}>
                    <button
                      style={styles.regenerateConfirmBtn}
                      onClick={handleRegenerateVariants}
                      disabled={isRegenerating}
                    >
                      {isRegenerating ? (
                        <>
                          <div className="spinner"></div>
                          <span>AI 生成中...</span>
                        </>
                      ) : (
                        <span>确认生成（覆盖全部4条）</span>
                      )}
                    </button>
                    <button
                      style={styles.regenerateCancelBtn}
                      onClick={() => {
                        setShowRegeneratePanel(false);
                        setRegenerateError(null);
                      }}
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* 2. DESCRIPTION EDITOR */}
            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>DESCRIPTION EDITOR</div>
                <div style={styles.descEditorMeta}>
                  <span style={styles.sectionMeta}>Variant #{selectedVariant?.index}</span>
                  {saveStatus === 'saving' && (
                    <span style={styles.autoSaveIndicator}>保存中...</span>
                  )}
                  {saveStatus === 'saved' && (
                    <span style={{ ...styles.autoSaveIndicator, color: 'var(--success)' }}>✓ 已保存</span>
                  )}
                </div>
              </div>
              <textarea
                style={styles.textarea}
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                onFocus={() => { isEditingDescriptionRef.current = true; }}
                onBlur={() => { isEditingDescriptionRef.current = false; }}
                placeholder="输入角色描述..."
              />
            </section>

            {/* 3. ASSEMBLED PROMPT (collapsible) */}
            <section style={styles.section}>
              <div
                style={styles.sectionHeaderClickable}
                onClick={() => setPromptExpanded(!promptExpanded)}
              >
                <div style={styles.sectionTitle}>ASSEMBLED PROMPT</div>
                <div style={styles.promptToggleRight}>
                  <span style={styles.sectionMeta}>Final output</span>
                  <span style={styles.expandToggle}>{promptExpanded ? '▲ 收起' : '▼ 展开'}</span>
                </div>
              </div>
              {promptExpanded && (
                <div style={styles.promptPreview}>
                  <pre style={styles.promptText}>{assembledPrompt}</pre>
                </div>
              )}
            </section>

            {/* 4. GENERATION CONTROLS */}
            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>GENERATION CONTROLS</div>
              </div>
              <div style={styles.generatePanel}>
                {/* Variant multi-select checkboxes */}
                <div style={styles.variantSelector}>
                  <div style={styles.variantCheckboxHeader}>
                    <div style={styles.countLabel}>VARIANT</div>
                    <label style={styles.selectAllLabel}>
                      <input
                        type="checkbox"
                        style={styles.checkbox}
                        checked={selectedVariantIndices.size === character.variants.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedVariantIndices(new Set(character.variants.map((_, i) => i)));
                          } else {
                            setSelectedVariantIndices(new Set([0]));
                          }
                        }}
                        disabled={isGenerating}
                      />
                      <span style={styles.selectAllText}>全选</span>
                    </label>
                  </div>
                  <div style={styles.variantCheckboxList}>
                    {character.variants.map((v, idx) => {
                      const checked = selectedVariantIndices.has(idx);
                      return (
                        <label
                          key={idx}
                          style={{
                            ...styles.variantCheckboxRow,
                            ...(checked ? styles.variantCheckboxRowActive : {}),
                            ...(isGenerating ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
                          }}
                        >
                          <input
                            type="checkbox"
                            style={styles.checkbox}
                            checked={checked}
                            disabled={isGenerating}
                            onChange={(e) => {
                              const next = new Set(selectedVariantIndices);
                              if (e.target.checked) {
                                next.add(idx);
                              } else {
                                next.delete(idx);
                              }
                              setSelectedVariantIndices(next);
                            }}
                          />
                          <span style={styles.variantCheckboxIndex}>#{v.index}</span>
                          <span style={styles.variantCheckboxDesc}>
                            {v.description ? v.description.slice(0, 30) + (v.description.length > 30 ? '...' : '') : '(未设置)'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Count selector */}
                <div style={styles.countSelector}>
                  <div style={styles.countLabel}>COUNT</div>
                  <div style={styles.countButtons}>
                    {[1, 2, 4].map((count) => (
                      <button
                        key={count}
                        style={{
                          ...styles.countButton,
                          ...(generateCount === count ? styles.countButtonActive : {}),
                        }}
                        onClick={() => setGenerateCount(count)}
                        disabled={isGenerating}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  style={{
                    ...styles.generateButton,
                    ...(selectedVariantIndices.size === 0 ? { opacity: 0.4, cursor: 'not-allowed' } : {}),
                  }}
                  onClick={handleGenerate}
                  disabled={isGenerating || selectedVariantIndices.size === 0}
                >
                  {isGenerating ? (
                    <>
                      <div className="spinner"></div>
                      <span>
                        {multiVariantProgress
                          ? `正在生成 ${multiVariantProgress.current}/${multiVariantProgress.total}...`
                          : 'GENERATING...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>生成</span>
                      <span style={styles.buttonLabel}>
                        {selectedVariantIndices.size > 1
                          ? `GENERATE × ${selectedVariantIndices.size}`
                          : 'GENERATE'}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Progress Display */}
              {generationProgress && (
                <div style={styles.progressPanel}>
                  {generationProgress.type === 'progress' && (
                    <>
                      <div style={styles.progressBar}>
                        <div
                          style={{
                            ...styles.progressFill,
                            width: `${((generationProgress.current || 0) / (generationProgress.total || 1)) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <div style={styles.progressText}>
                        {generationProgress.message || 'Processing...'}
                        {generationProgress.current && generationProgress.total && (
                          <span style={styles.progressCount}>
                            {' '}
                            [{generationProgress.current}/{generationProgress.total}]
                          </span>
                        )}
                      </div>
                    </>
                  )}
                  {generationProgress.type === 'done' && (
                    <div style={styles.progressSuccess}>
                      ✓ Generation complete! {generationProgress.images?.length || 0} images created.
                    </div>
                  )}
                  {generationProgress.type === 'error' && (
                    <div style={styles.progressError}>
                      ⚠ {generationProgress.error || 'Generation failed'}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* 5. Gallery */}
            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>SAMPLE GALLERY</div>
                <button style={styles.refreshGalleryBtn} onClick={loadSamples} disabled={loadingSamples}>
                  {loadingSamples ? '...' : '刷新'}
                </button>
              </div>
              {loadingSamples ? (
                <div style={styles.loadingState}>
                  <div className="spinner"></div>
                  <div style={styles.loadingText}>LOADING SAMPLES...</div>
                </div>
              ) : (
                <Gallery
                  images={samples}
                  characterName={character.name}
                  onSelect={loadSamples}
                />
              )}
            </section>
          </div>
        )}

        {activeTab === 'profile' && (
          <div style={styles.profileView}>
            {loadingProfile ? (
              <div style={styles.loadingState}>
                <div className="spinner"></div>
                <div style={styles.loadingText}>LOADING PROFILE...</div>
              </div>
            ) : (
              <>
                {/* Profile Actions Bar */}
                <div style={styles.profileActionsBar}>
                  <div style={styles.profileAttrTotal}>
                    属性总和: <span style={{ color: rarityColor, fontWeight: 700 }}>{attrTotal}</span>
                  </div>
                  <div style={styles.profileActionsRight}>
                    <button
                      style={styles.aiProfileBtn}
                      onClick={handleAiProfileGenerate}
                      disabled={isAiProfileGenerating}
                    >
                      {isAiProfileGenerating ? (
                        <><div className="spinner"></div><span>AI 生成中...</span></>
                      ) : (
                        <span>✦ AI 重新生成</span>
                      )}
                    </button>
                    <button
                      style={{
                        ...styles.saveProfileBtn,
                        ...(profileSaved ? styles.saveProfileBtnSuccess : {}),
                      }}
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                    >
                      {savingProfile ? (
                        <><div className="spinner"></div><span>保存中...</span></>
                      ) : profileSaved ? (
                        <span>✓ 已保存</span>
                      ) : (
                        <span>保存属性</span>
                      )}
                    </button>
                  </div>
                </div>

                {profileError && (
                  <div style={styles.profileError}>⚠ {profileError}</div>
                )}

                {/* Rarity */}
                <section style={styles.profileSection}>
                  <div style={styles.sectionHeader}>
                    <div style={styles.sectionTitle}>稀有度 RARITY</div>
                    <div style={{ ...styles.rarityBadge, color: rarityColor, borderColor: rarityColor }}>
                      {RARITY_LABELS[profile.rarity] || profile.rarity}
                    </div>
                  </div>
                  <div style={styles.rarityGrid}>
                    {(['gold', 'silver', 'copper', 'stone'] as const).map((r) => (
                      <button
                        key={r}
                        style={{
                          ...styles.rarityBtn,
                          borderColor: profile.rarity === r ? RARITY_COLORS[r] : 'var(--border-primary)',
                          color: profile.rarity === r ? RARITY_COLORS[r] : 'var(--text-tertiary)',
                          background: profile.rarity === r ? 'var(--bg-elevated)' : 'var(--bg-tertiary)',
                        }}
                        onClick={() => setProfile((p) => ({ ...p, rarity: r }))}
                      >
                        {RARITY_LABELS[r]}
                      </button>
                    ))}
                  </div>
                  <div style={styles.rarityHint}>
                    gold: 36-60 &nbsp;|&nbsp; silver: 21-35 &nbsp;|&nbsp; copper: 11-20 &nbsp;|&nbsp; stone: 5-10
                  </div>
                </section>

                {/* 8 Attributes */}
                <section style={styles.profileSection}>
                  <div style={styles.sectionHeader}>
                    <div style={styles.sectionTitle}>属性 ATTRIBUTES</div>
                    <div style={styles.sectionMeta}>总和 {attrTotal}</div>
                  </div>
                  <div style={styles.attrGrid}>
                    {Object.entries(ATTR_LABELS).map(([key, label]) => {
                      const val = profile.attributes[key as keyof typeof profile.attributes] ?? 5;
                      return (
                        <div key={key} style={styles.attrRow}>
                          <div style={styles.attrLabel}>
                            <span style={styles.attrLabelCn}>{label}</span>
                            <span style={styles.attrLabelEn}>{key.toUpperCase()}</span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={10}
                            value={val}
                            onChange={(e) => handleAttrChange(key, Number(e.target.value))}
                            style={styles.attrSlider}
                          />
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={val}
                            onChange={(e) => handleAttrChange(key, Math.min(10, Math.max(1, Number(e.target.value))))}
                            style={styles.attrInput}
                          />
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Special Attributes */}
                <section style={styles.profileSection}>
                  <div style={styles.sectionHeader}>
                    <div style={styles.sectionTitle}>特殊属性 SPECIAL</div>
                  </div>
                  <div style={styles.specialAttrGrid}>
                    <div style={styles.attrRow}>
                      <div style={styles.attrLabel}>
                        <span style={styles.attrLabelCn}>支援</span>
                        <span style={styles.attrLabelEn}>SUPPORT</span>
                      </div>
                      <input
                        type="number"
                        min={-3}
                        max={5}
                        value={profile.special_attributes.support}
                        onChange={(e) => handleSpecialAttrChange('support', Number(e.target.value))}
                        style={styles.attrInput}
                      />
                    </div>
                    <div style={styles.attrRow}>
                      <div style={styles.attrLabel}>
                        <span style={styles.attrLabelCn}>重骰</span>
                        <span style={styles.attrLabelEn}>REROLL</span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={5}
                        value={profile.special_attributes.reroll}
                        onChange={(e) => handleSpecialAttrChange('reroll', Number(e.target.value))}
                        style={styles.attrInput}
                      />
                    </div>
                    <div style={styles.attrRow}>
                      <div style={styles.attrLabel}>
                        <span style={styles.attrLabelCn}>装备槽</span>
                        <span style={styles.attrLabelEn}>EQ SLOTS</span>
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={4}
                        value={profile.equipment_slots}
                        onChange={(e) => setProfile((p) => ({ ...p, equipment_slots: Math.min(4, Math.max(1, Number(e.target.value))) }))}
                        style={styles.attrInput}
                      />
                    </div>
                  </div>
                </section>

                {/* Tags */}
                <section style={styles.profileSection}>
                  <div style={styles.sectionHeader}>
                    <div style={styles.sectionTitle}>标签 TAGS</div>
                  </div>
                  <div style={styles.tagList}>
                    {profile.tags.map((tag) => (
                      <span key={tag} style={styles.tag}>
                        {tag}
                        <button style={styles.tagRemove} onClick={() => handleTagRemove(tag)}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={styles.tagInputRow}>
                    <input
                      style={styles.tagInput}
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleTagAdd()}
                      placeholder="输入标签后回车添加 (如: male, warrior...)"
                    />
                    <button style={styles.tagAddBtn} onClick={handleTagAdd}>添加</button>
                  </div>
                  <div style={styles.tagHint}>
                    常用: male female warrior swordsman merchant scholar rogue wanderer exile clan protagonist antagonist mentor ally
                  </div>
                </section>

                {/* Bio / Description */}
                <section style={styles.profileSection}>
                  <div style={styles.sectionHeader}>
                    <div style={styles.sectionTitle}>人物小传 BIOGRAPHY</div>
                    <div style={styles.sectionMeta}>游戏内展示文字 50-100字</div>
                  </div>
                  <textarea
                    style={{ ...styles.textarea, minHeight: '100px' }}
                    value={profile.description}
                    onChange={(e) => setProfile((p) => ({ ...p, description: e.target.value }))}
                    placeholder="角色的游戏内背景故事简介..."
                  />
                </section>
              </>
            )}
          </div>
        )}

        {activeTab === 'deploy' && (
          <div style={styles.deployView}>
            {loadingDeployPreview ? (
              <div style={styles.loadingState}>
                <div className="spinner"></div>
                <div style={styles.loadingText}>LOADING DEPLOY STATUS...</div>
              </div>
            ) : (
              <>
                {/* Status Banner */}
                {deployPreview && (
                  <section style={styles.deployStatusSection}>
                    <div style={styles.sectionHeader}>
                      <div style={styles.sectionTitle}>DEPLOY STATUS</div>
                    </div>
                    <div style={styles.deployStatusGrid}>
                      <div style={styles.deployStatusItem}>
                        <div style={styles.deployStatusLabel}>游戏状态</div>
                        <div style={{
                          ...styles.deployStatusValue,
                          color: deployPreview.is_deployed ? 'var(--success)' : 'var(--text-tertiary)',
                        }}>
                          {deployPreview.is_deployed ? '✓ 已部署' : '○ 未部署'}
                        </div>
                      </div>
                      <div style={styles.deployStatusItem}>
                        <div style={styles.deployStatusLabel}>角色属性</div>
                        <div style={{
                          ...styles.deployStatusValue,
                          color: deployPreview.has_profile ? 'var(--success)' : 'var(--error)',
                        }}>
                          {deployPreview.has_profile ? '✓ 已配置' : '✗ 未配置'}
                        </div>
                      </div>
                      <div style={styles.deployStatusItem}>
                        <div style={styles.deployStatusLabel}>立绘素材</div>
                        <div style={{
                          ...styles.deployStatusValue,
                          color: deployPreview.has_portrait ? 'var(--success)' : 'var(--text-tertiary)',
                        }}>
                          {deployPreview.has_portrait ? '✓ 有素材' : '○ 无素材'}
                        </div>
                      </div>
                      <div style={styles.deployStatusItem}>
                        <div style={styles.deployStatusLabel}>立绘文件</div>
                        <div style={styles.deployStatusValue}>
                          {deployPreview.game_file || '(自动分配)'}
                        </div>
                      </div>
                    </div>

                    {/* Portrait change info */}
                    <div style={styles.portraitChangeRow}>
                      {deployPreview.portrait_change?.has_change ? (
                        <div style={styles.portraitChangeAlert}>
                          <span style={styles.portraitChangeIcon}>⇄</span>
                          <span>
                            立绘将从{' '}
                            <strong>{deployPreview.portrait_change.current_game_file || '(当前)'}</strong>
                            {' '}更换为{' '}
                            <strong style={{ color: '#4a9eff' }}>
                              {deployPreview.portrait_change.selected_portrait_filename}
                            </strong>
                          </span>
                        </div>
                      ) : (
                        <div style={styles.portraitChangeNeutral}>
                          <span>○ 立绘保持不变（无选定的新立绘）</span>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Preview JSON */}
                {deployPreview?.preview_card && (
                  <section style={styles.section}>
                    <div style={styles.sectionHeader}>
                      <div style={styles.sectionTitle}>PREVIEW · 将写入 base_cards.json</div>
                    </div>
                    <div style={styles.promptPreview}>
                      <pre style={styles.promptText}>
                        {JSON.stringify(deployPreview.preview_card, null, 2)}
                      </pre>
                    </div>
                  </section>
                )}

                {!deployPreview?.has_profile && (
                  <div style={styles.deployWarning}>
                    ⚠ 角色尚未配置属性，请先前往「角色属性」tab 配置或 AI 生成属性。
                  </div>
                )}

                {/* Deploy Result */}
                {deployResult && (
                  <div style={{
                    ...styles.deployResult,
                    borderColor: deployResult.success ? 'var(--success)' : 'var(--error)',
                    color: deployResult.success ? 'var(--success)' : 'var(--error)',
                  }}>
                    {deployResult.success ? '✓ ' : '⚠ '}{deployResult.message}
                  </div>
                )}

                {/* Deploy Button */}
                <section style={styles.section}>
                  <div style={styles.deployBtnRow}>
                    <button
                      style={{
                        ...styles.deployBtn,
                        opacity: deployPreview?.has_profile ? 1 : 0.5,
                      }}
                      onClick={handleDeploy}
                      disabled={isDeploying || !deployPreview?.has_profile}
                    >
                      {isDeploying ? (
                        <><div className="spinner"></div><span>部署中...</span></>
                      ) : (
                        <>
                          <span>一键部署到游戏</span>
                          <span style={styles.buttonLabel}>DEPLOY TO GAME</span>
                        </>
                      )}
                    </button>
                    <button
                      style={styles.refreshBtn}
                      onClick={loadDeployPreview}
                      disabled={loadingDeployPreview}
                    >
                      刷新状态
                    </button>
                  </div>
                </section>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-primary)',
  },
  header: {
    padding: '32px 40px',
    borderBottom: '1px solid var(--border-primary)',
    background: 'var(--bg-secondary)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '32px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '11px',
    fontWeight: '400',
    color: 'var(--text-tertiary)',
    letterSpacing: '0.05em',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  tab: {
    padding: '10px 20px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-secondary)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '2px',
    cursor: 'pointer',
  },
  tabActive: {
    background: 'var(--bg-elevated)',
    borderColor: 'var(--border-accent)',
    color: 'var(--text-accent)',
  },
  tabLabel: {
    fontSize: '9px',
    fontWeight: '400',
    letterSpacing: '0.05em',
    opacity: 0.6,
  },
  content: {
    flex: '1',
    overflow: 'auto',
  },
  workshopView: {
    padding: '32px 40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  profileView: {
    padding: '32px 40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  deployView: {
    padding: '32px 40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  section: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    padding: '24px',
  },
  profileSection: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    padding: '20px 24px',
  },
  deployStatusSection: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    padding: '20px 24px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  sectionHeaderClickable: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--border-subtle)',
    cursor: 'pointer',
    userSelect: 'none',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.1em',
    color: 'var(--text-accent)',
  },
  sectionMeta: {
    fontSize: '10px',
    fontWeight: '400',
    color: 'var(--text-tertiary)',
  },
  variantHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  regenerateBtn: {
    padding: '6px 14px',
    background: 'var(--bg-tertiary)',
    border: '1px solid #7c6af5',
    color: '#a89cf7',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.15s ease',
  },
  variantGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
  },
  variantCard: {
    padding: '16px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    textAlign: 'left',
    transition: 'all 0.15s ease',
    cursor: 'pointer',
  },
  variantCardActive: {
    background: 'var(--bg-elevated)',
    borderColor: 'var(--border-accent)',
    boxShadow: 'inset 0 0 0 1px var(--border-accent)',
  },
  variantIndex: {
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '0.05em',
    color: 'var(--text-accent)',
    marginBottom: '8px',
  },
  variantDesc: {
    fontSize: '12px',
    fontWeight: '400',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  // Regenerate panel
  regeneratePanel: {
    marginTop: '20px',
    padding: '20px',
    background: 'var(--bg-primary)',
    border: '1px solid #7c6af5',
    borderLeft: '3px solid #7c6af5',
  },
  regeneratePanelTitle: {
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.1em',
    color: '#a89cf7',
    marginBottom: '6px',
  },
  regeneratePanelSubtitle: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    marginBottom: '14px',
  },
  regenerateBioInput: {
    width: '100%',
    marginBottom: '12px',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    lineHeight: '1.6',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-primary)',
    padding: '10px 12px',
    resize: 'vertical' as const,
    boxSizing: 'border-box',
  },
  regenerateError: {
    fontSize: '12px',
    color: 'var(--error)',
    marginBottom: '10px',
  },
  regenerateActions: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  regenerateConfirmBtn: {
    padding: '10px 20px',
    background: '#4a3fa0',
    border: '1px solid #7c6af5',
    color: '#e0d9ff',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
  },
  regenerateCancelBtn: {
    padding: '10px 16px',
    background: 'transparent',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-tertiary)',
    fontSize: '12px',
    cursor: 'pointer',
  },
  // Description editor
  descEditorMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  autoSaveIndicator: {
    fontSize: '10px',
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.03em',
  },
  textarea: {
    width: '100%',
    minHeight: '120px',
    marginBottom: '0',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    lineHeight: '1.6',
    boxSizing: 'border-box',
  },
  // Assembled prompt
  promptToggleRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  expandToggle: {
    fontSize: '10px',
    fontWeight: '500',
    color: 'var(--text-accent)',
    letterSpacing: '0.05em',
  },
  promptPreview: {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-subtle)',
    padding: '16px',
    maxHeight: '200px',
    overflow: 'auto',
    marginTop: '12px',
  },
  promptText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    lineHeight: '1.6',
    color: 'var(--text-secondary)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  // Generation controls
  generatePanel: {
    display: 'flex',
    gap: '24px',
    alignItems: 'flex-start',
  },
  variantSelector: {
    flex: '1',
    minWidth: '220px',
  },
  variantCheckboxHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  selectAllLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
  },
  selectAllText: {
    fontSize: '10px',
    color: 'var(--text-tertiary)',
    letterSpacing: '0.03em',
  },
  variantCheckboxList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    maxHeight: '160px',
    overflowY: 'auto' as const,
  },
  variantCheckboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
  },
  variantCheckboxRowActive: {
    background: 'var(--bg-elevated)',
    borderColor: 'var(--border-accent)',
  },
  checkbox: {
    accentColor: 'var(--accent-cyan)',
    width: '14px',
    height: '14px',
    flexShrink: 0,
    cursor: 'pointer',
  },
  variantCheckboxIndex: {
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '0.05em',
    color: 'var(--text-accent)',
    flexShrink: 0,
    width: '24px',
  },
  variantCheckboxDesc: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    flex: '1',
  },
  countSelector: {
    flex: '0 0 auto',
  },
  countLabel: {
    fontSize: '10px',
    fontWeight: '600',
    letterSpacing: '0.05em',
    color: 'var(--text-tertiary)',
    marginBottom: '8px',
  },
  countButtons: {
    display: 'flex',
    gap: '8px',
  },
  countButton: {
    width: '48px',
    height: '48px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-secondary)',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  countButtonActive: {
    background: 'var(--bg-elevated)',
    borderColor: 'var(--border-accent)',
    color: 'var(--text-accent)',
  },
  generateButton: {
    flex: '0 0 auto',
    padding: '12px 32px',
    background: 'var(--accent-cyan)',
    border: '1px solid var(--accent-cyan)',
    color: 'var(--bg-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    fontWeight: '700',
    fontSize: '14px',
    height: '48px',
    cursor: 'pointer',
  },
  buttonLabel: {
    fontSize: '9px',
    opacity: 0.6,
    letterSpacing: '0.05em',
  },
  progressPanel: {
    marginTop: '24px',
    padding: '16px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
  },
  progressBar: {
    width: '100%',
    height: '4px',
    background: 'var(--bg-primary)',
    marginBottom: '12px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'var(--accent-cyan)',
    transition: 'width 0.3s ease',
    boxShadow: '0 0 8px var(--accent-cyan-glow)',
  },
  progressText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  progressCount: {
    color: 'var(--text-accent)',
    fontWeight: '600',
  },
  progressSuccess: {
    fontSize: '12px',
    color: 'var(--success)',
    fontWeight: '500',
  },
  progressError: {
    fontSize: '12px',
    color: 'var(--error)',
    fontWeight: '500',
  },
  // Gallery section
  refreshGalleryBtn: {
    padding: '4px 12px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-tertiary)',
    fontSize: '11px',
    cursor: 'pointer',
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '80px 40px',
  },
  loadingText: {
    fontSize: '11px',
    fontWeight: '500',
    letterSpacing: '0.1em',
    color: 'var(--text-tertiary)',
  },
  // ── Profile tab styles ──
  profileActionsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
  },
  profileAttrTotal: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  profileActionsRight: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  aiProfileBtn: {
    padding: '10px 20px',
    background: '#4a3fa0',
    border: '1px solid #7c6af5',
    color: '#e0d9ff',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
  },
  saveProfileBtn: {
    padding: '10px 20px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-accent)',
    color: 'var(--text-accent)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  saveProfileBtnSuccess: {
    borderColor: 'var(--success)',
    color: 'var(--success)',
  },
  profileError: {
    padding: '12px 16px',
    background: 'rgba(255,80,80,0.08)',
    border: '1px solid var(--error)',
    color: 'var(--error)',
    fontSize: '13px',
  },
  rarityBadge: {
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.05em',
    padding: '4px 10px',
    border: '1px solid',
  },
  rarityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px',
    marginBottom: '10px',
  },
  rarityBtn: {
    padding: '10px 12px',
    background: 'var(--bg-tertiary)',
    border: '1px solid',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    letterSpacing: '0.03em',
  },
  rarityHint: {
    fontSize: '10px',
    color: 'var(--text-tertiary)',
    letterSpacing: '0.03em',
  },
  attrGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  attrRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  attrLabel: {
    width: '80px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  attrLabelCn: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  attrLabelEn: {
    fontSize: '9px',
    letterSpacing: '0.08em',
    color: 'var(--text-tertiary)',
  },
  attrSlider: {
    flex: '1',
    accentColor: 'var(--accent-cyan)',
  },
  attrInput: {
    width: '56px',
    padding: '6px 8px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontWeight: '700',
    textAlign: 'center' as const,
    fontFamily: 'var(--font-mono)',
  },
  specialAttrGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  tagList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '12px',
    minHeight: '32px',
  },
  tag: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-accent)',
    color: 'var(--text-accent)',
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
  },
  tagRemove: {
    background: 'none',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '0',
    lineHeight: '1',
  },
  tagInputRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
  },
  tagInput: {
    flex: '1',
    padding: '8px 12px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontFamily: 'var(--font-mono)',
  },
  tagAddBtn: {
    padding: '8px 16px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-accent)',
    color: 'var(--text-accent)',
    fontSize: '13px',
    cursor: 'pointer',
  },
  tagHint: {
    fontSize: '10px',
    color: 'var(--text-tertiary)',
    lineHeight: '1.6',
    letterSpacing: '0.03em',
  },
  // ── Deploy tab styles ──
  deployStatusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
  },
  deployStatusItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  deployStatusLabel: {
    fontSize: '10px',
    fontWeight: '600',
    letterSpacing: '0.08em',
    color: 'var(--text-tertiary)',
  },
  deployStatusValue: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
  },
  deployWarning: {
    padding: '14px 18px',
    background: 'rgba(255, 180, 0, 0.08)',
    border: '1px solid rgba(255, 180, 0, 0.4)',
    color: '#f5c842',
    fontSize: '13px',
    lineHeight: '1.5',
  },
  deployResult: {
    padding: '14px 18px',
    background: 'var(--bg-secondary)',
    border: '1px solid',
    fontSize: '13px',
    fontWeight: '500',
    lineHeight: '1.5',
  },
  deployBtnRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  deployBtn: {
    flex: '1',
    padding: '16px 32px',
    background: 'var(--accent-cyan)',
    border: '1px solid var(--accent-cyan)',
    color: 'var(--bg-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
  },
  refreshBtn: {
    padding: '16px 20px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    cursor: 'pointer',
  },
  portraitChangeRow: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid var(--border-subtle)',
  },
  portraitChangeAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    background: 'rgba(74, 158, 255, 0.08)',
    border: '1px solid rgba(74, 158, 255, 0.35)',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    lineHeight: '1.5',
  },
  portraitChangeIcon: {
    fontSize: '18px',
    color: '#4a9eff',
    flexShrink: 0,
  },
  portraitChangeNeutral: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-tertiary)',
    fontSize: '12px',
  },
};
