import { useState, useEffect, useCallback } from 'react';
import type { UIAsset, UIAssetProfile } from '../types';
import { api } from '../api';
import WorkshopTab from './WorkshopTab';
import type { WorkshopConfig, WorkshopVariant } from './WorkshopTab';
import Gallery from './Gallery';

interface UIAssetDetailProps {
  asset: UIAsset;
  onUpdate: () => void | Promise<void>;
}

type DetailTab = 'workshop' | 'profile' | 'deploy';

const CATEGORY_LABELS: Record<string, { cn: string; en: string; color: string }> = {
  background: { cn: '背景图', en: 'BACKGROUND', color: '#4a9eff' },
  frame:       { cn: '边框',   en: 'FRAME',      color: '#a89cf7' },
  panel:       { cn: '面板',   en: 'PANEL',      color: '#b07ad0' },
  button:      { cn: '按钮',   en: 'BUTTON',     color: '#00c896' },
  'card-border': { cn: '卡牌边框', en: 'CARD BORDER', color: '#f5c842' },
  icon:        { cn: '图标',   en: 'ICON',       color: '#c87040' },
};

const DIMENSIONS_PRESETS = ['1024x1024', '1536x1024', '1024x1536'];

const WORKSHOP_CONFIG: WorkshopConfig = {
  generateButtonText: '生成 UI 素材',
  generateButtonSubtext: '水墨风格',
  regeneratePanelTitle: 'AI 重新生成 VARIANT DESCRIPTIONS',
  regeneratePanelSubtitle: '输入素材补充描述，AI 将重新生成所有 variant descriptions 并覆盖现有内容',
  regeneratePlaceholder: '素材描述（可选，如：古风金色边框、青花瓷纹样...）',
  descriptionPlaceholder: '输入 UI 素材的视觉描述（英文）...',
};

// UI_STYLE_BASE (mirrors backend, for ASSEMBLED PROMPT preview)
const UI_STYLE_BASE =
  '水墨风格，武侠题材，中国传统水墨画质感。' +
  '主色调：淡墨灰(#3a3a3a)为主线条色，暖白宣纸(#f5f0e8)为底色，朱砂红(#c14443)为点缀色。' +
  '线条规范：细墨线勾勒，线条均匀流畅，装饰从简不繁复，留白为主。' +
  '质感统一：轻度宣纸纹理，淡墨渲染，不要浓重泼墨效果，笔触温润色调淡雅。' +
  'NO text, NO labels, NO watermarks, NO signatures, NO characters, NO human figures.';

const CATEGORY_PROMPT_HINTS: Record<string, string> = {
  background: '[场景背景图] 全幅构图，横向宽屏比例，层次丰富，意境深远，适合作为游戏界面背景',
  frame:      '[边框装饰] 边缘精美墨线装饰，四角精美纹样，中心区域透明，适合叠加在内容上方',
  panel:      '[完整面板] 四周精美墨线边缘装饰，中间填充宣纸卷轴质感底色，不要镂空，面板外透明',
  button:     '[按钮] 强调质感与可交互感，形态完整，边缘清晰，适合游戏UI按钮使用',
  'card-border': '[卡牌边框] 古风简约纹样，四角点缀装饰，适合作为角色/物品卡牌的外框装饰',
  icon:       '[图标] 单一主体，造型简洁明确，适合在界面中快速识别',
};

/** Build preview of assembled prompt from description and category. */
function buildUIPromptPreview(description: string, category: string): string {
  if (!description) return '（请先选择或编辑一个 variant description）';
  const hint = CATEGORY_PROMPT_HINTS[category] || '';
  return (
    `[UI Asset] ${hint}\n\n` +
    `Style: ${UI_STYLE_BASE}\n\n` +
    `Subject: ${description}`
  );
}

export default function UIAssetDetail({ asset, onUpdate }: UIAssetDetailProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('workshop');

  // Variants
  const [variants, setVariants] = useState<WorkshopVariant[]>([]);

  // Profile
  const [profile, setProfile] = useState<UIAssetProfile>({
    name: asset.name,
    category: asset.category,
    dimensions: asset.dimensions,
    description: asset.description,
  });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Deploy
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{ success: boolean; message: string } | null>(null);
  const [hasPendingImage, setHasPendingImage] = useState(asset.has_pending_image);
  const [publishStatus, setPublishStatus] = useState(asset.publish_status);

  // ─── Load variants ────────────────────────────────────────────────────────
  const loadVariants = useCallback(async () => {
    try {
      const data = await api.getUIAssetVariants(asset.asset_id);
      setVariants(data.map((v) => ({ index: v.index, description: v.description })));
    } catch {
      // Fallback: use variants from asset prop
      setVariants(
        (asset.variants || []).map((v) => ({ index: v.index, description: v.description })),
      );
    }
  }, [asset.asset_id]);

  // ─── Load profile ─────────────────────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    try {
      setLoadingProfile(true);
      const data = await api.getUIAssetProfile(asset.asset_id);
      setProfile(data);
    } catch (err) {
      console.error('Failed to load UI asset profile', err);
    } finally {
      setLoadingProfile(false);
    }
  }, [asset.asset_id]);

  // ─── Reset on asset switch ────────────────────────────────────────────────
  useEffect(() => {
    setVariants(
      (asset.variants || []).map((v) => ({ index: v.index, description: v.description })),
    );
    setProfileSaved(false);
    setProfileError(null);
    setDeployResult(null);
    setHasPendingImage(asset.has_pending_image);
    setPublishStatus(asset.publish_status);
  }, [asset.asset_id]);

  // ─── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    loadVariants();
  }, [asset.asset_id, loadVariants]);

  useEffect(() => {
    if (activeTab === 'profile') loadProfile();
  }, [activeTab, loadProfile]);

  // ─── Profile handlers ─────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    try {
      setIsSavingProfile(true);
      setProfileError(null);
      const updated = await api.updateUIAssetProfile(asset.asset_id, profile);
      setProfile(updated);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
      onUpdate();
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ─── Deploy handler ───────────────────────────────────────────────────────
  const handleDeploy = async () => {
    try {
      setIsDeploying(true);
      setDeployResult(null);
      await api.deployUIAsset(asset.asset_id);
      setDeployResult({ success: true, message: '部署成功！UI 素材已写入游戏目录。' });
      setPublishStatus('published');
      setHasPendingImage(false);
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

  const catInfo = CATEGORY_LABELS[asset.category] ?? { cn: asset.category, en: asset.category.toUpperCase(), color: '#888' };

  const assembleUIPrompt = (description: string) =>
    buildUIPromptPreview(description, asset.category);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.assetIdLabel}>{asset.asset_id}</div>
          <h2 style={styles.title}>{asset.name}</h2>
          <div style={styles.subtitle}>
            <span style={{ color: catInfo.color }}>{catInfo.cn}</span>
            <span style={styles.subtitleDim}> · </span>
            <span style={styles.subtitleDim}>{asset.dimensions}</span>
            {publishStatus === 'published' && (
              <span style={styles.publishedBadge}>已发布</span>
            )}
            {hasPendingImage && (
              <span style={styles.pendingBadge}>待部署图片</span>
            )}
          </div>
        </div>

        <div style={styles.tabs}>
          {([
            ['workshop', '素材工坊', 'WORKSHOP'],
            ['profile', '素材属性', 'PROFILE'],
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

      {/* Content */}
      <div style={styles.content}>
        {/* ─── WORKSHOP TAB ────────────────────────────────────────────── */}
        {activeTab === 'workshop' && (
          <WorkshopTab
            entityName={asset.asset_id}
            variants={variants}
            config={WORKSHOP_CONFIG}
            assemblePrompt={assembleUIPrompt}
            onSaveDescription={async (variantIndex, description) => {
              await api.updateUIAssetVariant(asset.asset_id, variantIndex, description);
            }}
            onRegenerateVariants={async (bio) => {
              return api.regenerateUIAssetVariants(asset.asset_id, bio);
            }}
            onGenerateImages={async (_variantIndex, description, count, onProgress) => {
              await api.generateUIAssetImages(
                { asset_type: 'ui', name: asset.asset_id, description, count },
                onProgress,
              );
            }}
            onLoadSamples={() => api.getUIAssetSamples(asset.asset_id)}
            onVariantsRegenerated={(descriptions) => {
              setVariants((prev) =>
                prev.map((v, i) => ({
                  ...v,
                  description: descriptions[i] ?? v.description,
                })),
              );
              onUpdate();
            }}
            galleryRenderer={({ samples, onRefresh }) => (
              <Gallery
                images={samples}
                characterName={asset.asset_id}
                onSelect={onRefresh}
                onSelectImage={async (img) => {
                  await api.selectUIAssetImage(asset.asset_id, img.abs_path);
                  setHasPendingImage(true);
                  onRefresh();
                  onUpdate();
                }}
                selectLabel="UI 素材"
              />
            )}
          />
        )}

        {/* ─── PROFILE TAB ─────────────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div style={styles.profileView}>
            {loadingProfile ? (
              <div style={styles.loadingState}>
                <div className="spinner"></div>
                <div style={styles.loadingText}>LOADING PROFILE...</div>
              </div>
            ) : (
              <>
                <div style={styles.profileActionsBar}>
                  <button
                    style={{
                      ...styles.saveProfileBtn,
                      ...(profileSaved ? styles.saveProfileBtnSuccess : {}),
                    }}
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? (
                      <><div className="spinner"></div><span>保存中...</span></>
                    ) : profileSaved ? (
                      <span>✓ 已保存</span>
                    ) : (
                      <span>保存属性</span>
                    )}
                  </button>
                </div>

                {profileError && (
                  <div style={styles.profileError}>⚠ {profileError}</div>
                )}

                {/* Name */}
                <section style={styles.profileSection}>
                  <div style={styles.sectionHeader}>
                    <div style={styles.sectionTitle}>名称 NAME</div>
                  </div>
                  <input
                    style={styles.profileInput}
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                    placeholder="素材名称"
                  />
                </section>

                {/* Category */}
                <section style={styles.profileSection}>
                  <div style={styles.sectionHeader}>
                    <div style={styles.sectionTitle}>类型 CATEGORY</div>
                  </div>
                  <div style={styles.categoryGrid}>
                    {Object.entries(CATEGORY_LABELS).map(([cat, info]) => (
                      <button
                        key={cat}
                        style={{
                          ...styles.categoryBtn,
                          borderColor: profile.category === cat ? info.color : 'var(--border-primary)',
                          color: profile.category === cat ? info.color : 'var(--text-tertiary)',
                          background: profile.category === cat ? 'var(--bg-elevated)' : 'var(--bg-tertiary)',
                        }}
                        onClick={() => setProfile((p) => ({ ...p, category: cat as UIAsset['category'] }))}
                      >
                        {info.cn}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Dimensions */}
                <section style={styles.profileSection}>
                  <div style={styles.sectionHeader}>
                    <div style={styles.sectionTitle}>尺寸 DIMENSIONS</div>
                  </div>
                  <div style={styles.dimensionsGrid}>
                    {DIMENSIONS_PRESETS.map((dim) => (
                      <button
                        key={dim}
                        style={{
                          ...styles.dimBtn,
                          borderColor: profile.dimensions === dim ? 'var(--border-accent)' : 'var(--border-primary)',
                          color: profile.dimensions === dim ? 'var(--text-accent)' : 'var(--text-tertiary)',
                          background: profile.dimensions === dim ? 'var(--bg-elevated)' : 'var(--bg-tertiary)',
                        }}
                        onClick={() => setProfile((p) => ({ ...p, dimensions: dim }))}
                      >
                        {dim}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Description */}
                <section style={styles.profileSection}>
                  <div style={styles.sectionHeader}>
                    <div style={styles.sectionTitle}>设计描述 DESCRIPTION</div>
                    <div style={styles.sectionMeta}>生成素材时参考此描述</div>
                  </div>
                  <textarea
                    style={{ ...styles.textarea, minHeight: '80px' }}
                    value={profile.description}
                    onChange={(e) => setProfile((p) => ({ ...p, description: e.target.value }))}
                    placeholder="素材用途和风格描述，如：主界面顶部装饰框，金色流云纹样..."
                  />
                </section>
              </>
            )}
          </div>
        )}

        {/* ─── DEPLOY TAB ──────────────────────────────────────────────── */}
        {activeTab === 'deploy' && (
          <div style={styles.deployView}>
            {/* Deploy Status */}
            <section style={styles.deployStatusSection}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>DEPLOY STATUS</div>
              </div>
              <div style={styles.deployStatusGrid}>
                <div style={styles.deployStatusItem}>
                  <div style={styles.deployStatusLabel}>发布状态</div>
                  <div style={{
                    ...styles.deployStatusValue,
                    color: publishStatus === 'published' ? 'var(--success)' : 'var(--text-tertiary)',
                  }}>
                    {publishStatus === 'published' ? '✓ 已发布' : '○ 草稿'}
                  </div>
                </div>
                <div style={styles.deployStatusItem}>
                  <div style={styles.deployStatusLabel}>待部署图片</div>
                  <div style={{
                    ...styles.deployStatusValue,
                    color: hasPendingImage ? '#4a9eff' : 'var(--text-tertiary)',
                  }}>
                    {hasPendingImage ? '⇄ 有新图片' : '○ 无变化'}
                  </div>
                </div>
                <div style={styles.deployStatusItem}>
                  <div style={styles.deployStatusLabel}>类型</div>
                  <div style={{ ...styles.deployStatusValue, color: catInfo.color }}>
                    {catInfo.cn} · {catInfo.en}
                  </div>
                </div>
              </div>
            </section>

            {/* Deploy note */}
            <section style={styles.deployNoteSection}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>DEPLOY TARGET</div>
              </div>
              <div style={styles.deployNoteContent}>
                <div style={styles.deployNoteLine}>
                  <span style={styles.deployNoteLabel}>SRC</span>
                  <span style={styles.deployNoteValue}>src/renderer/assets/ui/generated/</span>
                </div>
                <div style={styles.deployNoteLine}>
                  <span style={styles.deployNoteLabel}>PUBLIC</span>
                  <span style={styles.deployNoteValue}>public/ui-assets/</span>
                </div>
                <div style={styles.deployNoteHint}>
                  部署时将从 samples 目录复制选定图片到游戏资源目录。
                  请先在「素材工坊」生成并选定图片，再点击部署。
                </div>
              </div>
            </section>

            {!hasPendingImage && (
              <div style={styles.deployWarning}>
                ⚠ 尚未选定待部署图片。请先在「素材工坊」tab 生成图片后在图库中选定一张。
              </div>
            )}

            {deployResult && (
              <div style={{
                ...styles.deployResult,
                borderColor: deployResult.success ? 'var(--success)' : 'var(--error)',
                color: deployResult.success ? 'var(--success)' : 'var(--error)',
              }}>
                {deployResult.success ? '✓ ' : '⚠ '}{deployResult.message}
              </div>
            )}

            <section style={styles.section}>
              <div style={styles.deployBtnRow}>
                <button
                  style={{
                    ...styles.deployBtn,
                    opacity: hasPendingImage ? 1 : 0.5,
                  }}
                  onClick={handleDeploy}
                  disabled={isDeploying || !hasPendingImage}
                >
                  {isDeploying ? (
                    <><div className="spinner"></div><span>部署中...</span></>
                  ) : (
                    <>
                      <span>{publishStatus === 'published' ? '更新部署' : '一键部署到游戏'}</span>
                      <span style={styles.buttonLabel}>DEPLOY TO GAME</span>
                    </>
                  )}
                </button>
              </div>
            </section>
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
    padding: '28px 40px',
    borderBottom: '1px solid var(--border-primary)',
    background: 'var(--bg-secondary)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '24px',
  },
  assetIdLabel: {
    fontSize: '9px',
    fontWeight: '700',
    letterSpacing: '0.1em',
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
    marginBottom: '4px',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '28px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '6px',
  },
  subtitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    flexWrap: 'wrap',
  },
  subtitleDim: {
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
  },
  publishedBadge: {
    fontSize: '9px',
    fontWeight: '700',
    color: '#00c896',
    letterSpacing: '0.05em',
    padding: '2px 6px',
    border: '1px solid #00c896',
    marginLeft: '4px',
  },
  pendingBadge: {
    fontSize: '9px',
    fontWeight: '700',
    color: '#4a9eff',
    letterSpacing: '0.05em',
    padding: '2px 6px',
    border: '1px solid #4a9eff',
    marginLeft: '4px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    flexShrink: 0,
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
  // Profile tab
  profileView: {
    padding: '32px 40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  profileActionsBar: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '4px 0',
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
    padding: '10px 14px',
    background: 'rgba(255,80,80,0.08)',
    border: '1px solid var(--error)',
    color: 'var(--error)',
    fontSize: '13px',
  },
  profileSection: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    padding: '20px 24px',
  },
  profileInput: {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontFamily: 'var(--font-display)',
    boxSizing: 'border-box',
  },
  categoryGrid: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  categoryBtn: {
    padding: '8px 16px',
    border: '1px solid',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.12s ease',
  },
  dimensionsGrid: {
    display: 'flex',
    gap: '10px',
  },
  dimBtn: {
    padding: '8px 16px',
    border: '1px solid',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
    transition: 'all 0.12s ease',
  },
  textarea: {
    width: '100%',
    marginBottom: '0',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    lineHeight: '1.6',
    boxSizing: 'border-box',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-primary)',
    padding: '10px 12px',
    resize: 'vertical' as const,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.1em',
    color: 'var(--text-accent)',
  },
  sectionMeta: {
    fontSize: '10px',
    color: 'var(--text-tertiary)',
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
  // Deploy tab
  deployView: {
    padding: '32px 40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  deployStatusSection: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    padding: '20px 24px',
  },
  deployNoteSection: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    padding: '20px 24px',
  },
  deployStatusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
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
  deployNoteContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  deployNoteLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
  },
  deployNoteLabel: {
    width: '56px',
    fontSize: '9px',
    fontWeight: '700',
    letterSpacing: '0.08em',
    color: 'var(--text-tertiary)',
    flexShrink: 0,
  },
  deployNoteValue: {
    color: 'var(--text-secondary)',
  },
  deployNoteHint: {
    marginTop: '4px',
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    lineHeight: '1.6',
    paddingTop: '12px',
    borderTop: '1px solid var(--border-subtle)',
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
  section: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    padding: '24px',
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
  buttonLabel: {
    fontSize: '9px',
    opacity: 0.6,
    letterSpacing: '0.05em',
  },
};
