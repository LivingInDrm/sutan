import { useState, useEffect, useRef, useCallback } from 'react';
import type { SampleImage, GenerationProgress } from '../types';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface WorkshopVariant {
  index: number;
  description: string;
}

export interface WorkshopConfig {
  /** 生成按钮主文字，如 "生成立绘" | "生成物品图片" */
  generateButtonText: string;
  /** 生成按钮副文字，如 "水墨风格" */
  generateButtonSubtext?: string;
  /** Regenerate 面板标题 */
  regeneratePanelTitle: string;
  /** Regenerate 面板副标题说明 */
  regeneratePanelSubtitle: string;
  /** Regenerate bio 输入框 placeholder */
  regeneratePlaceholder: string;
  /** Description textarea placeholder */
  descriptionPlaceholder?: string;
}

interface WorkshopTabProps {
  /** 实体名称（角色名 / 物品名），用于重置触发和传给图库 */
  entityName: string;
  /** variant 列表（由父组件提供；角色从 character.variants 传入，物品从 API 加载后传入） */
  variants: WorkshopVariant[];
  /** UI 文本配置 */
  config: WorkshopConfig;
  /** 根据当前 description 拼出完整 prompt 的函数 */
  assemblePrompt: (description: string) => string;

  // ── API 回调 ──────────────────────────────────────────────────────────────
  /** 保存某个 variant 的 description（自动保存触发） */
  onSaveDescription: (variantIndex: number, description: string) => Promise<void>;
  /** 重新 AI 生成所有 variants，返回新的 description 数组 */
  onRegenerateVariants: (bio: string) => Promise<string[]>;
  /** 生成图片（支持多 variant 循环调用） */
  onGenerateImages: (
    variantIndex: number,
    description: string,
    count: number,
    onProgress: (progress: GenerationProgress) => void,
  ) => Promise<void>;
  /** 加载样本图片 */
  onLoadSamples: () => Promise<SampleImage[]>;
  /** 当 variants 全部重新生成后，通知父组件更新（父组件可调用 onUpdate 刷新列表） */
  onVariantsRegenerated?: (descriptions: string[]) => void;

  // ── 图库渲染 ─────────────────────────────────────────────────────────────
  /** 渲染图库区域的函数（父组件控制显示和选图交互） */
  galleryRenderer: (props: { samples: SampleImage[]; onRefresh: () => void }) => React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WorkshopTab({
  entityName,
  variants,
  config,
  assemblePrompt,
  onSaveDescription,
  onRegenerateVariants,
  onGenerateImages,
  onLoadSamples,
  onVariantsRegenerated,
  galleryRenderer,
}: WorkshopTabProps) {
  // ── Workshop state ─────────────────────────────────────────────────────────
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
  const [promptExpanded, setPromptExpanded] = useState(false);

  // Regenerate panel
  const [showRegeneratePanel, setShowRegeneratePanel] = useState(false);
  const [regenerateBio, setRegenerateBio] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedDescription = useRef<string>('');
  const saveIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks whether user is actively editing the description textarea.
  // This prevents focus loss caused by parent re-renders updating the variants prop.
  const isEditingDescriptionRef = useRef(false);

  // Stable refs for callback props so handlers are not recreated on every render
  const onSaveDescriptionRef = useRef(onSaveDescription);
  const onLoadSamplesRef = useRef(onLoadSamples);
  const onGenerateImagesRef = useRef(onGenerateImages);
  const onRegenerateVariantsRef = useRef(onRegenerateVariants);
  const onVariantsRegeneratedRef = useRef(onVariantsRegenerated);
  useEffect(() => { onSaveDescriptionRef.current = onSaveDescription; });
  useEffect(() => { onLoadSamplesRef.current = onLoadSamples; });
  useEffect(() => { onGenerateImagesRef.current = onGenerateImages; });
  useEffect(() => { onRegenerateVariantsRef.current = onRegenerateVariants; });
  useEffect(() => { onVariantsRegeneratedRef.current = onVariantsRegenerated; });

  // ── Derived ────────────────────────────────────────────────────────────────
  const selectedVariant = variants[selectedVariantIndex];
  const assembledPrompt = assemblePrompt(editedDescription);

  // ── Reset on entity switch ─────────────────────────────────────────────────
  useEffect(() => {
    isEditingDescriptionRef.current = false;
    setShowRegeneratePanel(false);
    setRegenerateError(null);
    setRegenerateBio('');
    setSaveStatus('idle');
    setPromptExpanded(false);
    setSelectedVariantIndices(new Set([0]));
    setMultiVariantProgress(null);
    setSelectedVariantIndex(0);
    setGenerationProgress(null);
    setSamples([]);
  }, [entityName]);

  // ── Sync description from variants prop (with focus protection) ───────────
  useEffect(() => {
    // Don't reset textarea content while user is actively typing —
    // prevents focus loss caused by parent re-renders passing a new variants prop.
    if (isEditingDescriptionRef.current) return;
    if (selectedVariant) {
      setEditedDescription(selectedVariant.description);
      lastSavedDescription.current = selectedVariant.description;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVariant?.index, entityName]);

  // ── Load samples ───────────────────────────────────────────────────────────
  const loadSamples = useCallback(async () => {
    try {
      setLoadingSamples(true);
      const imgs = await onLoadSamplesRef.current();
      setSamples(imgs);
    } catch (err) {
      console.error('Failed to load samples:', err);
    } finally {
      setLoadingSamples(false);
    }
  }, []); // stable: uses ref

  useEffect(() => {
    loadSamples();
  }, [entityName, loadSamples]); // runs on mount and entity switch

  // ── Autosave (debounce 500ms) ─────────────────────────────────────────────
  // NOTE: intentionally does NOT call onVariantsRegenerated/onUpdate after save —
  // calling parent update triggers a re-render that passes new variants prop,
  // which can reset the textarea and steal focus while user is still typing.
  const handleAutoSave = useCallback(async (description: string, variantIndex: number) => {
    if (description === lastSavedDescription.current) return;
    try {
      setSaveStatus('saving');
      await onSaveDescriptionRef.current(variantIndex, description);
      lastSavedDescription.current = description;
      setSaveStatus('saved');
      if (saveIdleTimerRef.current) clearTimeout(saveIdleTimerRef.current);
      saveIdleTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Autosave failed:', err);
      setSaveStatus('idle');
    }
  }, []); // stable: uses refs

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

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      if (saveIdleTimerRef.current) clearTimeout(saveIdleTimerRef.current);
    };
  }, []);

  // ── Regenerate variants ────────────────────────────────────────────────────
  const handleRegenerateVariants = async () => {
    try {
      setIsRegenerating(true);
      setRegenerateError(null);
      const descriptions = await onRegenerateVariantsRef.current(regenerateBio);
      setShowRegeneratePanel(false);
      setRegenerateBio('');
      // Update currently viewed description if it changed
      if (descriptions[selectedVariantIndex] !== undefined) {
        setEditedDescription(descriptions[selectedVariantIndex]);
        lastSavedDescription.current = descriptions[selectedVariantIndex];
      }
      // Notify parent to refresh variant list (e.g., call onUpdate)
      onVariantsRegeneratedRef.current?.(descriptions);
    } catch (err) {
      setRegenerateError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setIsRegenerating(false);
    }
  };

  // ── Generate images (supports multi-variant) ───────────────────────────────
  const handleGenerate = async () => {
    const indicesToGenerate = Array.from(selectedVariantIndices).sort((a, b) => a - b);
    if (indicesToGenerate.length === 0) return;

    try {
      setIsGenerating(true);
      setGenerationProgress(null);
      setMultiVariantProgress(null);

      for (let i = 0; i < indicesToGenerate.length; i++) {
        const variantIdx = indicesToGenerate[i];
        const variantToGenerate = variants[variantIdx];
        // Use the live edited description for the currently selected variant,
        // and the saved description for others.
        const descriptionToUse =
          variantIdx === selectedVariantIndex
            ? editedDescription
            : (variantToGenerate?.description || '');

        if (indicesToGenerate.length > 1) {
          setMultiVariantProgress({ current: i + 1, total: indicesToGenerate.length });
        }

        await onGenerateImagesRef.current(variantIdx, descriptionToUse, generateCount, (progress) => {
          setGenerationProgress(progress);
          if (progress.type === 'done') {
            loadSamples();
          }
        });
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.workshopView}>
      {/* 1. VARIANT SELECTION */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionTitle}>VARIANT SELECTION</div>
          <div style={styles.variantHeaderRight}>
            <div style={styles.sectionMeta}>{variants.length} available</div>
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
          {variants.map((variant, index) => (
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
            <div style={styles.regeneratePanelTitle}>{config.regeneratePanelTitle}</div>
            <div style={styles.regeneratePanelSubtitle}>{config.regeneratePanelSubtitle}</div>
            <textarea
              style={styles.regenerateBioInput}
              value={regenerateBio}
              onChange={(e) => setRegenerateBio(e.target.value)}
              placeholder={config.regeneratePlaceholder}
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
                  <span>确认生成（覆盖全部）</span>
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
          placeholder={config.descriptionPlaceholder || '输入描述...'}
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
                  checked={selectedVariantIndices.size === variants.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedVariantIndices(new Set(variants.map((_, i) => i)));
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
              {variants.map((v, idx) => {
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
                      {v.description
                        ? v.description.slice(0, 30) + (v.description.length > 30 ? '...' : '')
                        : '(未设置)'}
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

          {/* Generate button */}
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
                <span>{config.generateButtonText}</span>
                <span style={styles.buttonLabel}>
                  {selectedVariantIndices.size > 1
                    ? `GENERATE × ${selectedVariantIndices.size}`
                    : config.generateButtonSubtext
                      ? `GENERATE · ${config.generateButtonSubtext}`
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
                ✓ 生成完成！{generationProgress.images?.length || 0} 张图片已创建。
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

      {/* 5. SAMPLE GALLERY */}
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
          galleryRenderer({ samples, onRefresh: loadSamples })
        )}
      </section>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  workshopView: {
    padding: '32px 40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  section: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    padding: '24px',
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
};
